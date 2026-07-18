import { act } from "react-test-renderer";

import { renderHook } from "@/test-utils/renderHook";
import { useRecipeController } from "./useRecipeController";

let mockCurrentProfile: ReturnType<typeof makeProfile> | null = null;


jest.mock("../models/repositories/CookLogRepository", () => {
  const mockCookLogRepository = {
    getRatingCategories: jest.fn(),
    getRecipeStats: jest.fn(),
    saveRatingCategories: jest.fn(),
  };

  return {
    CookLogRepository: jest.fn(() => mockCookLogRepository),
    mockCookLogRepository,
  };
});

jest.mock("../models/repositories/RecipeRepository", () => {
  const mockRecipeRepository = {
    fetchById: jest.fn(),
    getSaved: jest.fn(),
    save: jest.fn(),
    search: jest.fn(),
  };

  return {
    RecipeRepository: jest.fn(() => mockRecipeRepository),
    mockRecipeRepository,
  };
});

jest.mock("../services/ClipboardService", () => {
  const ClipboardService = {
    getRecipeSourceSuggestion: jest.fn(),
  };

  return {
    ClipboardService,
  };
});

jest.mock("../services/HabitService", () => {
  const HabitService = {
    record: jest.fn(),
  };

  return {
    HabitService,
  };
});

jest.mock("../services/LLMService", () => {
  const LLMService = {
    send: jest.fn(),
  };

  return {
    LLMService,
  };
});

jest.mock("../store/chefProfileStore", () => ({
  useChefProfileStore: (
    selector: (state: { profile: ReturnType<typeof makeProfile> | null }) => unknown,
  ) =>
    selector({
      profile: mockCurrentProfile,
    }),
}));

jest.mock("../store/sousChefCompanionStore", () => {
  const mockSousChefCompanionStore = {
    showCompanion: jest.fn(),
    showExhausted: jest.fn(),
  };

  return {
    mockSousChefCompanionStore,
    useSousChefCompanionStore: (
      selector: (state: typeof mockSousChefCompanionStore) => unknown,
    ) => selector(mockSousChefCompanionStore),
  };
});

const { mockCookLogRepository } = jest.requireMock(
  "../models/repositories/CookLogRepository",
);
const { mockRecipeRepository } = jest.requireMock(
  "../models/repositories/RecipeRepository",
);
const { ClipboardService } = jest.requireMock("../services/ClipboardService");
const { HabitService } = jest.requireMock("../services/HabitService");
const { LLMService } = jest.requireMock("../services/LLMService");
const { mockSousChefCompanionStore } = jest.requireMock(
  "../store/sousChefCompanionStore",
);

const makeProfile = () => ({
  id: "chef-1",
  name: "Mira",
  skillLevel: "home cook" as const,
  preferences: {
    cuisinePreferences: ["Italian"],
    dietary: ["vegetarian"],
    dislikedIngredients: ["anchovy"],
  },
  region: "Paris",
  currency: "EUR",
  createdAt: "2026-05-08T10:00:00.000Z",
});

describe("useRecipeController", () => {
  beforeEach(() => {
    mockCurrentProfile = makeProfile();
    mockRecipeRepository.fetchById.mockReset();
    mockRecipeRepository.getSaved.mockReset();
    mockRecipeRepository.save.mockReset();
    mockRecipeRepository.search.mockReset();
    mockCookLogRepository.getRatingCategories.mockReset();
    mockCookLogRepository.getRecipeStats.mockReset();
    mockCookLogRepository.saveRatingCategories.mockReset();
    mockCookLogRepository.getRatingCategories.mockReturnValue([]);
    ClipboardService.getRecipeSourceSuggestion.mockReset();
    HabitService.record.mockReset();
    LLMService.send.mockReset();
    mockSousChefCompanionStore.showCompanion.mockReset();
    mockSousChefCompanionStore.showExhausted.mockReset();
    jest.spyOn(Date, "now").mockReturnValue(1760000000000);
    jest.spyOn(Date.prototype, "toISOString").mockReturnValue(
      "2026-05-08T10:00:00.000Z",
    );
    jest.spyOn(Math, "random").mockReturnValue(0.123456789);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("builds and saves a recipe draft with parsed nested ingredients and steps", async () => {
    mockRecipeRepository.save.mockResolvedValue(undefined);
    const { result } = renderHook(() => useRecipeController());

    let savedRecipe;
    await act(async () => {
      savedRecipe = await result.current.saveDraftRecipe({
        categoryId: "cookbook-1",
        title: "  Tomato Soup  ",
        ingredientsText: "2 tbsp olive oil\n1 onion",
        stepsText: "1. Saute the onion\n2. Blend and serve",
        notes: "Add basil at the end",
      });
    });

    expect(mockRecipeRepository.save).toHaveBeenCalledWith({
      id: expect.stringMatching(/^recipe-1760000000000-/),
      title: "Tomato Soup",
      description: "Add basil at the end",
      categoryId: "cookbook-1",
      parentId: null,
      servings: 1,
      prepMinutes: 0,
      cookMinutes: 0,
      ingredients: [
        {
          id: "ingredient-1",
          name: "olive oil",
          quantity: 2,
          unit: "tbsp",
        },
        {
          id: "ingredient-2",
          name: "1 onion",
          quantity: 1,
          unit: "item",
        },
      ],
      steps: [
        {
          order: 1,
          instruction: "Saute the onion",
        },
        {
          order: 2,
          instruction: "Blend and serve",
        },
      ],
      chefsNotes: "Add basil at the end",
      tags: [],
      createdDate: "2026-05-08T10:00:00.000Z",
      lastUpdatedDate: "2026-05-08T10:00:00.000Z",
    });
    expect(HabitService.record).toHaveBeenCalledWith("recipe_saved");
    expect(savedRecipe).toEqual(
      expect.objectContaining({
        title: "Tomato Soup",
        categoryId: "cookbook-1",
      }),
    );
  });

  it("blocks invalid draft saves before hitting the repository", async () => {
    const { result } = renderHook(() => useRecipeController());

    let savedRecipe;
    await act(async () => {
      savedRecipe = await result.current.saveDraftRecipe({
        title: "Soup",
        ingredientsText: "",
        stepsText: "1. Stir",
      });
    });

    expect(savedRecipe).toBeNull();
    expect(mockRecipeRepository.save).not.toHaveBeenCalled();
    expect(result.current.error).toBe(
      "Add at least one ingredient before saving.",
    );
  });

  it("fetches a recipe into active state", async () => {
    const recipe = {
      id: "recipe-1",
      title: "Soup",
      description: "Warm and easy",
      categoryId: null,
      parentId: null,
      servings: 2,
      prepMinutes: 10,
      cookMinutes: 20,
      ingredients: [
        { id: "ingredient-1", name: "Water", quantity: 1, unit: "l" },
      ],
      steps: [{ order: 1, instruction: "Boil." }],
      tags: [],
      createdDate: "2026-05-08T10:00:00.000Z",
      lastUpdatedDate: "2026-05-08T10:00:00.000Z",
    };
    mockRecipeRepository.fetchById.mockResolvedValue(recipe);
    const { result } = renderHook(() => useRecipeController());

    await act(async () => {
      await result.current.fetchById("recipe-1");
    });

    expect(result.current.activeRecipe).toEqual(recipe);
    expect(result.current.error).toBeNull();
  });

  it("falls back to an empty saved list when the repository fails", async () => {
    mockRecipeRepository.getSaved.mockRejectedValue(new Error("db down"));
    const { result } = renderHook(() => useRecipeController());

    let recipes;
    await act(async () => {
      recipes = await result.current.getSaved();
    });

    expect(recipes).toEqual([]);
  });

  it("rejects empty import sources", async () => {
    const { result } = renderHook(() => useRecipeController());

    let importedDraft;
    await act(async () => {
      importedDraft = await result.current.importRecipeSource({
        sourceMode: "idea",
        source: "   ",
      });
    });

    expect(importedDraft).toBeNull();
    expect(LLMService.send).not.toHaveBeenCalled();
    expect(result.current.error).toBe("Add a recipe source before importing.");
  });

  it("routes url imports to the companion instead of the llm service", async () => {
    const { result } = renderHook(() => useRecipeController());

    let importedDraft;
    await act(async () => {
      importedDraft = await result.current.importRecipeSource({
        sourceMode: "url",
        source: "https://example.com/recipe",
      });
    });

    expect(importedDraft).toBeNull();
    expect(LLMService.send).not.toHaveBeenCalled();
    expect(mockSousChefCompanionStore.showCompanion).toHaveBeenCalledWith(
      "happy",
      expect.stringContaining("Try pasting the recipe text"),
    );
    expect(result.current.error).toBe("Could not read that page.");
  });

  it("routes idea imports to the chef profile companion when profile context is missing", async () => {
    mockCurrentProfile = null;
    const { result } = renderHook(() => useRecipeController());

    let importedDraft;
    await act(async () => {
      importedDraft = await result.current.importRecipeSource({
        sourceMode: "idea",
        source: "A cozy lentil stew",
      });
    });

    expect(importedDraft).toBeNull();
    expect(LLMService.send).not.toHaveBeenCalled();
    expect(mockSousChefCompanionStore.showCompanion).toHaveBeenCalledWith(
      "happy",
      expect.stringContaining("Before we begin"),
      {
        label: "Open chef profile",
        route: "/settings?focus=chef_profile",
      },
    );
  });

  it.each([
    ["idea", "A lemony pasta for spring"],
    ["paste", "Title: Lemon Pasta\nIngredients: pasta, lemon, butter"],
  ] as const)(
    "imports a %s source through the llm service",
    async (sourceMode, source) => {
      LLMService.send.mockResolvedValue({
        content: `\`\`\`json
{"title":"Imported Recipe","ingredients":["2 tbsp olive oil","1 lemon"],"steps":["Heat the oil","Add the lemon"],"notes":"Assumed pantry basics."}
\`\`\``,
      });
      const { result } = renderHook(() => useRecipeController());

      let importedDraft;
      await act(async () => {
        importedDraft = await result.current.importRecipeSource({
          sourceMode,
          source,
        });
      });

      expect(LLMService.send).toHaveBeenCalledWith(
        {
          system: expect.stringContaining("Name: Mira"),
          messages: [
            {
              role: "user",
              content: expect.stringContaining(source),
            },
          ],
        },
        "user",
        expect.objectContaining({
          onQueued: expect.any(Function),
          onRateLimited: expect.any(Function),
        }),
      );
      expect(importedDraft).toEqual({
        title: "Imported Recipe",
        ingredientsText: "2 tbsp olive oil\n1 lemon",
        stepsText: "Heat the oil\nAdd the lemon",
        notes: "Assumed pantry basics.",
      });
    },
  );

  it("surfaces exhausted companion messaging when the llm import fails", async () => {
    LLMService.send.mockRejectedValue(new Error("offline"));
    const { result } = renderHook(() => useRecipeController());

    let importedDraft;
    await act(async () => {
      importedDraft = await result.current.importRecipeSource({
        sourceMode: "idea",
        source: "Weeknight gnocchi",
      });
    });

    expect(importedDraft).toBeNull();
    expect(mockSousChefCompanionStore.showCompanion).toHaveBeenCalledWith(
      "exhausted",
      expect.stringContaining("little exhausted"),
      {
        label: "Open assistant setup",
        route: "/settings?focus=assistant",
      },
    );
    expect(result.current.error).toBe(
      "Sous Chef could not import that recipe right now.",
    );
  });
});
