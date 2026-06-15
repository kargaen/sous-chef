import { cookbookApi } from "../api/cookbookApi";
import { CookbookInputSchema, CookbookSchema } from "../schemas/CookbookSchema";
import type { Cookbook, CookbookInput, Recipe } from "../types";
import { RecipeRepository } from "./RecipeRepository";
import { StorageService } from "@/services/StorageService";

export class CookbookRepository {
  private readonly recipeRepository = new RecipeRepository();

  private parseCookbookRow(row: { data: string }): Cookbook {
    return CookbookSchema.parse(JSON.parse(row.data));
  }

  private buildCookbook(id: string, cookbook: CookbookInput): Cookbook {
    const validatedInput = CookbookInputSchema.parse(cookbook);

    return CookbookSchema.parse({
      id,
      ...validatedInput,
    });
  }

  private persistCookbook(cookbook: Cookbook): void {
    StorageService.dbRun(
      "INSERT OR REPLACE INTO cookbooks (id, parent_id, data) VALUES (?, ?, ?)",
      [
        cookbook.id,
        cookbook.parentId ?? null,
        JSON.stringify(cookbook),
      ],
    );
  }

  async getAll(): Promise<Cookbook[]> {
    const rows = StorageService.dbQuery<{ data: string }>(
      "SELECT data FROM cookbooks ORDER BY COALESCE(parent_id, ''), id ASC",
    );

    return rows.map((row) => this.parseCookbookRow(row));
  }

  async getCookbooks(parentId: string | null = null): Promise<Cookbook[]> {
    const rows =
      parentId === null
        ? StorageService.dbQuery<{ data: string }>(
            "SELECT data FROM cookbooks WHERE parent_id IS NULL ORDER BY id ASC",
          )
        : StorageService.dbQuery<{ data: string }>(
            "SELECT data FROM cookbooks WHERE parent_id = ? ORDER BY id ASC",
            [parentId],
          );
    return rows.map((row) => this.parseCookbookRow(row));
  }

  async getById(id: string): Promise<Cookbook | null> {
    const local = StorageService.dbQueryFirst<{ data: string }>(
      "SELECT data FROM cookbooks WHERE id = ?",
      [id],
    );

    if (local) {
      return this.parseCookbookRow(local);
    }

    try {
      return CookbookSchema.parse(await cookbookApi.fetchById(id));
    } catch {
      return null;
    }
  }

  async create(id: string, cookbook: CookbookInput): Promise<Cookbook> {
    const createdCookbook = this.buildCookbook(id, cookbook);
    this.persistCookbook(createdCookbook);
    return createdCookbook;
  }

  async read(id: string): Promise<Cookbook | null> {
    return this.getById(id);
  }

  async update(id: string, cookbook: CookbookInput): Promise<Cookbook> {
    const existingCookbook = StorageService.dbQueryFirst<{ id: string }>(
      "SELECT id FROM cookbooks WHERE id = ?",
      [id],
    );

    if (!existingCookbook) {
      throw new Error(`Cookbook not found: ${id}`);
    }

    const updatedCookbook = this.buildCookbook(id, cookbook);
    this.persistCookbook(updatedCookbook);

    return updatedCookbook;
  }

  async save(id: string, cookbook: CookbookInput): Promise<Cookbook> {
    const existingCookbook = StorageService.dbQueryFirst<{ id: string }>(
      "SELECT id FROM cookbooks WHERE id = ?",
      [id],
    );

    if (existingCookbook) {
      return this.update(id, cookbook);
    }

    return this.create(id, cookbook);
  }

  async delete(id: string): Promise<void> {
    const cookbooks = await this.getAll();
    const deletedCookbook =
      cookbooks.find((cookbook) => cookbook.id === id) ?? null;

    if (!deletedCookbook) {
      return;
    }

    const destinationCookbookId = deletedCookbook.parentId ?? null;

    cookbooks
      .filter((cookbook) => cookbook.parentId === id)
      .forEach((cookbook) => {
        this.persistCookbook({
          ...cookbook,
          parentId: destinationCookbookId,
        });
      });

    await this.recipeRepository.reassignCookbookRecipes(id, destinationCookbookId);

    if (destinationCookbookId) {
      const destinationCookbook =
        cookbooks.find((cookbook) => cookbook.id === destinationCookbookId) ?? null;

      if (destinationCookbook) {
        const nextRecipeIds = Array.from(
          new Set([...destinationCookbook.recipeIds, ...deletedCookbook.recipeIds]),
        );

        this.persistCookbook({
          ...destinationCookbook,
          recipeIds: nextRecipeIds,
        });
      }
    }

    StorageService.dbRun("DELETE FROM cookbooks WHERE id = ?", [id]);
  }

  async remove(id: string): Promise<void> {
    await this.delete(id);
  }

  async fetchRemoteAll(): Promise<Cookbook[]> {
    const remoteCookbooks = await cookbookApi.fetchAll();
    return remoteCookbooks.map((cookbook) => CookbookSchema.parse(cookbook));
  }

  async getUncategorizedRecipes(): Promise<Recipe[]> {
    // This stays local to the cookbook boundary for now.
    // Uncategorized-recipe retrieval should move in once the recipe model/repository
    // exposes category ownership explicitly instead of being inferred here.
    return [];
  }
}
