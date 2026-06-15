import { recipeApi } from "../api/recipeApi";
import { RecipeSchema } from "../schemas/RecipeSchema";
import type { Recipe } from "../types";
import { StorageService } from "@/services/StorageService";

const normalizeCategoryId = (
  categoryId: string | null | undefined,
): string | null => {
  return categoryId && categoryId.trim().length > 0 ? categoryId : null;
};

export class RecipeRepository {
  private parseRecipeRow(row: { data: string }): Recipe {
    return RecipeSchema.parse(JSON.parse(row.data));
  }

  private persistRecipe(recipe: Recipe): void {
    const validatedRecipe = RecipeSchema.parse(recipe);

    StorageService.dbRun(
      "INSERT OR REPLACE INTO recipes (id, data) VALUES (?, ?)",
      [validatedRecipe.id, JSON.stringify(validatedRecipe)],
    );
  }

  async search(query: string): Promise<Recipe[]> {
    return recipeApi.search(query);
  }

  async fetchById(id: string): Promise<Recipe | null> {
    const local = StorageService.dbQueryFirst<{ data: string }>(
      "SELECT data FROM recipes WHERE id = ?",
      [id],
    );
    if (local) return this.parseRecipeRow(local);
    return recipeApi.fetchById(id);
  }

  async save(recipe: Recipe): Promise<void> {
    this.persistRecipe(recipe);
  }

  // Variants (parentId set) are hidden from listings; they only surface
  // inside their parent recipe via getVariants.
  async getSaved(): Promise<Recipe[]> {
    const rows = StorageService.dbQuery<{ data: string }>(
      "SELECT data FROM recipes",
    );
    return rows
      .map((row) => this.parseRecipeRow(row))
      .filter((recipe) => !recipe.parentId);
  }

  // Promote a variant to a standalone recipe: clearing parentId breaks the
  // link to the original and makes it visible in listings.
  async promoteVariant(id: string): Promise<Recipe | null> {
    const local = StorageService.dbQueryFirst<{ data: string }>(
      "SELECT data FROM recipes WHERE id = ?",
      [id],
    );
    if (!local) return null;

    const promoted: Recipe = {
      ...this.parseRecipeRow(local),
      parentId: null,
      lastUpdatedDate: new Date().toISOString(),
    };
    this.persistRecipe(promoted);
    return promoted;
  }

  async getVariants(parentId: string): Promise<Recipe[]> {
    const rows = StorageService.dbQuery<{ data: string }>(
      "SELECT data FROM recipes",
    );
    return rows
      .map((row) => this.parseRecipeRow(row))
      .filter((recipe) => recipe.parentId === parentId);
  }

  async delete(id: string): Promise<void> {
    StorageService.dbRun("DELETE FROM recipes WHERE id = ?", [id]);
  }

  async reassignCookbookRecipes(
    fromCookbookId: string,
    toCookbookId: string | null,
  ): Promise<void> {
    const rows = StorageService.dbQuery<{ data: string }>(
      "SELECT data FROM recipes",
    );

    rows
      .map((row) => this.parseRecipeRow(row))
      .filter(
        (recipe) => normalizeCategoryId(recipe.categoryId) === fromCookbookId,
      )
      .forEach((recipe) => {
        this.persistRecipe({
          ...recipe,
          categoryId: toCookbookId,
        });
      });
  }
}
