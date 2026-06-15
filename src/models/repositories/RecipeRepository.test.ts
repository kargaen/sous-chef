import { RecipeRepository } from "./RecipeRepository";

jest.mock("@/services/StorageService", () => {
  const StorageService = {
    dbQuery: jest.fn(),
    dbQueryFirst: jest.fn(),
    dbRun: jest.fn(),
  };

  return {
    StorageService,
  };
});

jest.mock("../api/recipeApi", () => {
  const recipeApi = {
    fetchById: jest.fn(),
    search: jest.fn(),
  };

  return {
    recipeApi,
  };
});

const { StorageService } = jest.requireMock("@/services/StorageService");
const { recipeApi } = jest.requireMock("../api/recipeApi");

const makeRecipe = (overrides = {}) => ({
  id: "recipe-1",
  title: "Tomato Pasta",
  description: "Comforting and quick",
  categoryId: "cookbook-1",
  parentId: null,
  servings: 4,
  prepMinutes: 10,
  cookMinutes: 20,
  ingredients: [
    {
      id: "ingredient-1",
      name: "Tomatoes",
      quantity: 4,
      unit: "item",
      notes: "Very ripe",
    },
  ],
  steps: [
    {
      order: 1,
      instruction: "Slice the tomatoes.",
      durationMinutes: 5,
    },
    {
      order: 2,
      instruction: "Simmer with olive oil.",
    },
  ],
  chefsNotes: "Finish with basil.",
  tags: ["vegetarian"],
  createdDate: "2026-05-08T10:00:00.000Z",
  lastUpdatedDate: "2026-05-08T10:00:00.000Z",
  ...overrides,
});

describe("RecipeRepository", () => {
  beforeEach(() => {
    StorageService.dbQuery.mockReset();
    StorageService.dbQueryFirst.mockReset();
    StorageService.dbRun.mockReset();
    recipeApi.fetchById.mockReset();
    recipeApi.search.mockReset();
  });

  it("saves a recipe with nested ingredients and steps intact", async () => {
    const repo = new RecipeRepository();
    const recipe = makeRecipe();

    await repo.save(recipe);

    expect(StorageService.dbRun).toHaveBeenCalledWith(
      "INSERT OR REPLACE INTO recipes (id, data) VALUES (?, ?)",
      [recipe.id, JSON.stringify(recipe)],
    );
  });

  it("returns saved recipes with nested fields preserved", async () => {
    const repo = new RecipeRepository();
    const recipe = makeRecipe();
    StorageService.dbQuery.mockReturnValue([{ data: JSON.stringify(recipe) }]);

    const result = await repo.getSaved();

    expect(result).toEqual([recipe]);
    expect(result[0].ingredients[0]).toEqual(recipe.ingredients[0]);
    expect(result[0].steps[1]).toEqual(recipe.steps[1]);
  });

  it("reads a local recipe before falling back to the remote api", async () => {
    const repo = new RecipeRepository();
    const recipe = makeRecipe();
    StorageService.dbQueryFirst.mockReturnValue({ data: JSON.stringify(recipe) });

    const result = await repo.fetchById(recipe.id);

    expect(result).toEqual(recipe);
    expect(recipeApi.fetchById).not.toHaveBeenCalled();
  });

  it("fetches a remote recipe when the local shelf does not have it", async () => {
    const repo = new RecipeRepository();
    const recipe = makeRecipe({
      id: "remote-recipe",
      categoryId: null,
    });
    StorageService.dbQueryFirst.mockReturnValue(null);
    recipeApi.fetchById.mockResolvedValue(recipe);

    const result = await repo.fetchById(recipe.id);

    expect(recipeApi.fetchById).toHaveBeenCalledWith("remote-recipe");
    expect(result).toEqual(recipe);
  });

  it("deletes a recipe by id", async () => {
    const repo = new RecipeRepository();

    await repo.delete("recipe-1");

    expect(StorageService.dbRun).toHaveBeenCalledWith(
      "DELETE FROM recipes WHERE id = ?",
      ["recipe-1"],
    );
  });

  it("reassigns recipes from a deleted cookbook to a new category", async () => {
    const repo = new RecipeRepository();
    const movedRecipe = makeRecipe({
      id: "moved-recipe",
      categoryId: "cookbook-a",
    });
    const untouchedRecipe = makeRecipe({
      id: "untouched-recipe",
      categoryId: "cookbook-b",
    });
    StorageService.dbQuery.mockReturnValue(
      [movedRecipe, untouchedRecipe].map((recipe) => ({
        data: JSON.stringify(recipe),
      })),
    );

    await repo.reassignCookbookRecipes("cookbook-a", null);

    expect(StorageService.dbRun).toHaveBeenCalledTimes(1);
    expect(StorageService.dbRun).toHaveBeenCalledWith(
      "INSERT OR REPLACE INTO recipes (id, data) VALUES (?, ?)",
      [
        "moved-recipe",
        JSON.stringify({
          ...movedRecipe,
          categoryId: null,
        }),
      ],
    );
  });
});
