import { CookbookRepository } from "./CookbookRepository";

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

jest.mock("../api/cookbookApi", () => {
  const cookbookApi = {
    fetchAll: jest.fn(),
    fetchById: jest.fn(),
  };

  return {
    cookbookApi,
  };
});

jest.mock("./RecipeRepository", () => {
  const mockRecipeRepository = {
    reassignCookbookRecipes: jest.fn(),
  };

  return {
    RecipeRepository: jest.fn(() => mockRecipeRepository),
    mockRecipeRepository,
  };
});

const { StorageService } = jest.requireMock("@/services/StorageService");
const { cookbookApi } = jest.requireMock("../api/cookbookApi");
const { mockRecipeRepository } = jest.requireMock("./RecipeRepository");

const makeCookbook = (overrides = {}) => ({
  id: "cookbook-1",
  title: "Weeknight Dinners",
  description: "Fast favorites",
  parentId: null,
  recipeIds: ["recipe-1"],
  ...overrides,
});

describe("CookbookRepository", () => {
  beforeEach(() => {
    StorageService.dbQuery.mockReset();
    StorageService.dbQueryFirst.mockReset();
    StorageService.dbRun.mockReset();
    cookbookApi.fetchAll.mockReset();
    cookbookApi.fetchById.mockReset();
    mockRecipeRepository.reassignCookbookRecipes.mockReset();
  });

  it("creates and persists a trimmed cookbook payload", async () => {
    const repo = new CookbookRepository();

    const created = await repo.create("cookbook-1", {
      title: "  Weeknight Dinners  ",
      description: "  Fast favorites  ",
      parentId: null,
      recipeIds: ["recipe-1"],
    });

    expect(created).toEqual(
      makeCookbook({
        title: "Weeknight Dinners",
        description: "Fast favorites",
      }),
    );
    expect(StorageService.dbRun).toHaveBeenCalledWith(
      "INSERT OR REPLACE INTO cookbooks (id, parent_id, data) VALUES (?, ?, ?)",
      ["cookbook-1", null, JSON.stringify(created)],
    );
  });

  it("reads a local cookbook before falling back to the remote api", async () => {
    const repo = new CookbookRepository();
    const cookbook = makeCookbook();
    StorageService.dbQueryFirst.mockReturnValue({
      data: JSON.stringify(cookbook),
    });

    const result = await repo.getById(cookbook.id);

    expect(result).toEqual(cookbook);
    expect(cookbookApi.fetchById).not.toHaveBeenCalled();
  });

  it("reparents nested cookbooks and merges recipe ids into the parent on delete", async () => {
    const repo = new CookbookRepository();
    const parent = makeCookbook({
      id: "parent",
      title: "Parent",
      recipeIds: ["parent-recipe"],
    });
    const target = makeCookbook({
      id: "target",
      title: "Target",
      parentId: "parent",
      recipeIds: ["target-recipe"],
    });
    const child = makeCookbook({
      id: "child",
      title: "Child",
      parentId: "target",
      recipeIds: [],
    });

    StorageService.dbQuery.mockReturnValue(
      [parent, target, child].map((cookbook) => ({
        data: JSON.stringify(cookbook),
      })),
    );

    await repo.delete("target");

    expect(mockRecipeRepository.reassignCookbookRecipes).toHaveBeenCalledWith(
      "target",
      "parent",
    );
    expect(StorageService.dbRun).toHaveBeenNthCalledWith(
      1,
      "INSERT OR REPLACE INTO cookbooks (id, parent_id, data) VALUES (?, ?, ?)",
      [
        "child",
        "parent",
        JSON.stringify({
          ...child,
          parentId: "parent",
        }),
      ],
    );
    expect(StorageService.dbRun).toHaveBeenNthCalledWith(
      2,
      "INSERT OR REPLACE INTO cookbooks (id, parent_id, data) VALUES (?, ?, ?)",
      [
        "parent",
        null,
        JSON.stringify({
          ...parent,
          recipeIds: ["parent-recipe", "target-recipe"],
        }),
      ],
    );
    expect(StorageService.dbRun).toHaveBeenNthCalledWith(
      3,
      "DELETE FROM cookbooks WHERE id = ?",
      ["target"],
    );
  });

  it("reassigns root cookbook children and recipes to the top level on delete", async () => {
    const repo = new CookbookRepository();
    const root = makeCookbook({
      id: "root",
      title: "Root",
      parentId: null,
      recipeIds: ["root-recipe"],
    });
    const child = makeCookbook({
      id: "child",
      title: "Child",
      parentId: "root",
      recipeIds: [],
    });

    StorageService.dbQuery.mockReturnValue(
      [root, child].map((cookbook) => ({
        data: JSON.stringify(cookbook),
      })),
    );

    await repo.delete("root");

    expect(mockRecipeRepository.reassignCookbookRecipes).toHaveBeenCalledWith(
      "root",
      null,
    );
    expect(StorageService.dbRun).toHaveBeenNthCalledWith(
      1,
      "INSERT OR REPLACE INTO cookbooks (id, parent_id, data) VALUES (?, ?, ?)",
      [
        "child",
        null,
        JSON.stringify({
          ...child,
          parentId: null,
        }),
      ],
    );
    expect(StorageService.dbRun).toHaveBeenNthCalledWith(
      2,
      "DELETE FROM cookbooks WHERE id = ?",
      ["root"],
    );
  });

  it("parses remote cookbook collections", async () => {
    const repo = new CookbookRepository();
    const remoteCookbooks = [
      makeCookbook({
        id: "remote-1",
        recipeIds: [],
      }),
    ];
    cookbookApi.fetchAll.mockResolvedValue(remoteCookbooks);

    const result = await repo.fetchRemoteAll();

    expect(result).toEqual(remoteCookbooks);
  });
});
