import { act } from "react-test-renderer";

import type { Recipe, WeekPlan } from "@/models/types";
import { renderHook } from "@/test-utils/renderHook";
import { useMealPlanController } from "./useMealPlanController";

jest.mock("../models/repositories/RecipeRepository", () => {
  const mockRecipeRepository = {
    fetchById: jest.fn(),
    getSaved: jest.fn(),
    save: jest.fn(),
  };

  return {
    RecipeRepository: jest.fn(() => mockRecipeRepository),
    mockRecipeRepository,
  };
});

jest.mock("../models/repositories/MealPlanRepository", () => {
  const mockMealPlanRepository = {
    getByWeek: jest.fn(),
    save: jest.fn(),
  };

  return {
    MealPlanRepository: jest.fn(() => mockMealPlanRepository),
    mockMealPlanRepository,
  };
});

jest.mock("../models/repositories/ShoppingListRepository", () => ({
  ShoppingListRepository: jest.fn(() => ({
    deriveForDates: jest.fn(),
    deriveForWeek: jest.fn(),
  })),
}));

jest.mock("../models/repositories/PantryRepository", () => ({
  PantryRepository: jest.fn(() => ({ getAll: jest.fn() })),
}));

jest.mock("../models/repositories/PlanPresetRepository", () => ({
  PlanPresetRepository: jest.fn(() => ({
    delete: jest.fn(),
    listAll: jest.fn().mockResolvedValue([]),
    save: jest.fn(),
  })),
}));

jest.mock("../models/repositories/CookLogRepository", () => {
  const mockCookLogRepository = {
    getCookLogs: jest.fn(),
    recordCook: jest.fn(),
  };

  return {
    CookLogRepository: jest.fn(() => mockCookLogRepository),
    mockCookLogRepository,
  };
});

jest.mock("../services/HabitService", () => ({
  HabitService: { record: jest.fn() },
}));

jest.mock("../services/InspirationService", () => ({
  InspirationService: { generateMore: jest.fn() },
}));

jest.mock("../services/LLMService", () => ({
  LLMService: { send: jest.fn() },
}));

jest.mock("../services/SeasonalService", () => ({
  SeasonalService: { getCurrentMonth: jest.fn() },
}));

jest.mock("../services/RecipeImportService", () => ({
  RecipeImportService: { generateRecipeFromIdea: jest.fn() },
}));

const mockMatchIngredient = jest.fn();
jest.mock("../utils/ingredientMatcher", () => ({
  matchIngredient: (...args: unknown[]) => mockMatchIngredient(...args),
  normalizeIngredientName: (value: string) => value.toLowerCase(),
}));

const mockMealPlanState = {
  activePlan: null as WeekPlan | null,
  shoppingList: [],
  draftSlots: [],
  pendingActions: [],
  setActivePlan: jest.fn(),
  setShoppingList: jest.fn(),
  setDraftSlots: jest.fn(),
  setPendingActions: jest.fn(),
};

jest.mock("../store/mealPlanStore", () => ({
  useMealPlanStore: () => mockMealPlanState,
}));

const mockProfile = {
  id: "chef-1",
  name: "Mira",
  skillLevel: "home cook" as const,
  preferences: {
    cuisinePreferences: ["Italian"],
    dietary: [],
    dislikedIngredients: [],
  },
  region: "Paris",
  currency: "EUR",
  createdAt: "2026-07-19T00:00:00.000Z",
};

jest.mock("../store/chefProfileStore", () => ({
  useChefProfileStore: (selector: (state: { profile: typeof mockProfile }) => unknown) =>
    selector({ profile: mockProfile }),
}));

jest.mock("../store/settingsStore", () => ({
  useSettingsStore: (selector: (state: { settings: null }) => unknown) =>
    selector({ settings: null }),
}));

const { mockRecipeRepository } = jest.requireMock(
  "../models/repositories/RecipeRepository",
);
const { mockMealPlanRepository } = jest.requireMock(
  "../models/repositories/MealPlanRepository",
);
const { RecipeImportService } = jest.requireMock(
  "../services/RecipeImportService",
);
const { LLMService } = jest.requireMock("../services/LLMService");
const { mockCookLogRepository } = jest.requireMock(
  "../models/repositories/CookLogRepository",
);

const recipe = (id: string, title: string): Recipe => ({
  id,
  title,
  description: "",
  servings: 2,
  prepMinutes: 0,
  cookMinutes: 0,
  ingredients: [],
  steps: [],
  tags: [],
  createdDate: "2026-07-18",
  lastUpdatedDate: "2026-07-18",
});

describe("useMealPlanController selected recipe input", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMealPlanState.activePlan = null;
    mockRecipeRepository.getSaved.mockResolvedValue([
      recipe("recipe-tortillas", "Tortillas"),
      recipe("recipe-spicy", "Spicy Tortillas"),
    ]);
  });

  it("preserves an explicit recipe id without fuzzy title matching", async () => {
    const { result } = renderHook(() => useMealPlanController());

    await act(async () => {
      await Promise.resolve();
    });

    expect(
      result.current.parseSlotInput({
        recipeId: "recipe-spicy",
        note: "Make it mild",
      }),
    ).toEqual({
      recipeId: "recipe-spicy",
      note: "Make it mild",
      servings: undefined,
      adaptationIntents: ["mild"],
    });
    expect(mockMatchIngredient).not.toHaveBeenCalled();
  });

  it("keeps unmatched raw input as standalone text", async () => {
    mockMatchIngredient.mockReturnValue(null);
    const { result } = renderHook(() => useMealPlanController());

    await act(async () => {
      await Promise.resolve();
    });

    expect(
      result.current.parseSlotInput({ rawText: "Dinner at Mum's" }),
    ).toEqual({
      text: "Dinner at Mum's",
      recipeId: undefined,
      note: undefined,
      servings: undefined,
      adaptationIntents: [],
    });
  });
});

describe("useMealPlanController text-to-recipe lifecycle", () => {
  const textPlan: WeekPlan = {
    id: "plan-1",
    weekStartDate: "2026-07-19",
    dayCount: 7,
    slots: [
      {
        id: "slot-text",
        date: "2026-07-20",
        type: "dinner",
        text: "Pasta night",
        recipeId: null,
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockMealPlanState.activePlan = textPlan;
    mockRecipeRepository.getSaved.mockResolvedValue([]);
  });

  it("shows conversion in flight and atomically repoints the slot on success", async () => {
    const generated = recipe("recipe-generated", "Pasta Night");
    let resolveGeneration!: (value: Recipe) => void;
    RecipeImportService.generateRecipeFromIdea.mockReturnValue(
      new Promise<Recipe>((resolve) => {
        resolveGeneration = resolve;
      }),
    );
    const { result } = renderHook(() => useMealPlanController());
    let conversion!: Promise<void>;

    act(() => {
      conversion = result.current.createRecipeForSlot("slot-text");
    });

    expect(result.current.convertingSlotId).toBe("slot-text");
    expect(mockRecipeRepository.save).not.toHaveBeenCalled();
    expect(mockMealPlanRepository.save).not.toHaveBeenCalled();

    await act(async () => {
      resolveGeneration(generated);
      await conversion;
    });

    expect(RecipeImportService.generateRecipeFromIdea).toHaveBeenCalledWith(
      "Pasta night",
      mockProfile,
    );
    expect(mockRecipeRepository.save).toHaveBeenCalledWith(generated);
    expect(mockMealPlanRepository.save).toHaveBeenCalledWith({
      ...textPlan,
      slots: [
        {
          ...textPlan.slots[0],
          text: undefined,
          recipeId: "recipe-generated",
        },
      ],
    });
    expect(result.current.convertingSlotId).toBeNull();
  });

  it("leaves text unchanged when recipe creation fails", async () => {
    RecipeImportService.generateRecipeFromIdea.mockResolvedValue(null);
    const { result } = renderHook(() => useMealPlanController());

    await act(async () => {
      await result.current.createRecipeForSlot("slot-text");
    });

    expect(mockRecipeRepository.save).not.toHaveBeenCalled();
    expect(mockMealPlanRepository.save).not.toHaveBeenCalled();
    expect(mockMealPlanState.setActivePlan).not.toHaveBeenCalled();
    expect(result.current.convertingSlotId).toBeNull();
  });
});

describe("useMealPlanController linked-note variant confirmation", () => {
  const parent = recipe("recipe-curry", "Tom's Curry");
  const adaptationResponse = (variantTitle: string) => ({
    variantTitle,
    summary: `Prepared ${variantTitle}`,
    rationale: "Honor the planned-meal note",
    considerations: [],
    ingredientChanges: [],
    stepChanges: [],
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockRecipeRepository.getSaved.mockResolvedValue([parent]);
    mockRecipeRepository.fetchById.mockResolvedValue(parent);
  });

  it.each([
    ["for 10", "Tom's Curry for 10"],
    ["non spicy", "Tom's Curry — Mild"],
  ])(
    "does not repoint the slot for %s until the proposed variant is accepted",
    async (note, variantTitle) => {
      const linkedPlan: WeekPlan = {
        id: "plan-variant",
        weekStartDate: "2026-07-19",
        dayCount: 7,
        slots: [
          {
            id: "slot-curry",
            date: "2026-07-20",
            type: "dinner",
            recipeId: parent.id,
            note,
          },
        ],
      };
      mockMealPlanState.activePlan = linkedPlan;
      LLMService.send.mockResolvedValue({
        content: JSON.stringify(adaptationResponse(variantTitle)),
      });
      const { result } = renderHook(() => useMealPlanController());

      await act(async () => {
        await (result.current as any).requestSlotVariant("slot-curry");
      });

      expect(mockRecipeRepository.save).not.toHaveBeenCalled();
      expect(mockMealPlanRepository.save).not.toHaveBeenCalled();
      expect((result.current as any).pendingSlotVariant).toEqual(
        expect.objectContaining({
          slotId: "slot-curry",
          recipe: expect.objectContaining({
            parentId: parent.id,
            title: variantTitle,
          }),
        }),
      );

      const proposedRecipe = (result.current as any).pendingSlotVariant.recipe;
      await act(async () => {
        await (result.current as any).acceptSlotVariant();
      });

      expect(mockRecipeRepository.save).toHaveBeenCalledTimes(1);
      expect(mockRecipeRepository.save).toHaveBeenCalledWith(proposedRecipe);
      expect(mockMealPlanRepository.save).toHaveBeenCalledWith({
        ...linkedPlan,
        slots: [
          {
            ...linkedPlan.slots[0],
            recipeId: proposedRecipe.id,
            note: undefined,
          },
        ],
      });
      expect((result.current as any).pendingSlotVariant).toBeNull();
    },
  );

  it("cancels a proposed variant without saving or repointing", async () => {
    mockMealPlanState.activePlan = {
      id: "plan-cancel",
      weekStartDate: "2026-07-19",
      dayCount: 7,
      slots: [
        {
          id: "slot-curry",
          date: "2026-07-20",
          type: "dinner",
          recipeId: parent.id,
          note: "non spicy",
        },
      ],
    };
    LLMService.send.mockResolvedValue({
      content: JSON.stringify(adaptationResponse("Tom's Curry — Mild")),
    });
    const { result } = renderHook(() => useMealPlanController());

    await act(async () => {
      await (result.current as any).requestSlotVariant("slot-curry");
    });
    act(() => {
      (result.current as any).cancelSlotVariant();
    });

    expect((result.current as any).pendingSlotVariant).toBeNull();
    expect(mockRecipeRepository.save).not.toHaveBeenCalled();
    expect(mockMealPlanRepository.save).not.toHaveBeenCalled();
  });

  it("leaves the linked slot unchanged when the model response is malformed", async () => {
    mockMealPlanState.activePlan = {
      id: "plan-malformed",
      weekStartDate: "2026-07-19",
      dayCount: 7,
      slots: [
        {
          id: "slot-curry",
          date: "2026-07-20",
          type: "dinner",
          recipeId: parent.id,
          note: "for 10",
        },
      ],
    };
    LLMService.send.mockResolvedValue({ content: "not a variant" });
    const { result } = renderHook(() => useMealPlanController());

    await act(async () => {
      await (result.current as any).requestSlotVariant("slot-curry");
    });

    expect((result.current as any).pendingSlotVariant).toBeNull();
    expect(mockRecipeRepository.save).not.toHaveBeenCalled();
    expect(mockMealPlanRepository.save).not.toHaveBeenCalled();
  });
});

describe("useMealPlanController cooked-state derivation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMealPlanState.activePlan = null;
    mockRecipeRepository.getSaved.mockResolvedValue([]);
  });

  it("matches both recipe identity and the planned local calendar date", async () => {
    mockCookLogRepository.getCookLogs.mockReturnValue([
      {
        id: "cook-matching",
        recipeId: "recipe-curry",
        cookedAt: "2026-07-20T18:30:00.000Z",
      },
      {
        id: "cook-wrong-date",
        recipeId: "recipe-curry",
        cookedAt: "2026-07-21T18:30:00.000Z",
      },
      {
        id: "cook-wrong-recipe",
        recipeId: "recipe-soup",
        cookedAt: "2026-07-20T18:30:00.000Z",
      },
    ]);
    const { result } = renderHook(() => useMealPlanController());
    await act(async () => {
      await Promise.resolve();
    });
    const isSlotCooked = (result.current as any).isSlotCooked;

    expect(
      isSlotCooked({
        id: "slot-curry",
        date: "2026-07-20",
        type: "dinner",
        recipeId: "recipe-curry",
      }),
    ).toBe(true);
    expect(
      isSlotCooked({
        id: "slot-curry-next-day",
        date: "2026-07-22",
        type: "dinner",
        recipeId: "recipe-curry",
      }),
    ).toBe(false);
    expect(
      isSlotCooked({
        id: "slot-text",
        date: "2026-07-20",
        type: "dinner",
        text: "Dinner out",
      }),
    ).toBe(false);

    expect(mockMealPlanRepository.save).not.toHaveBeenCalled();
    expect(mockCookLogRepository.recordCook).not.toHaveBeenCalled();
  });
});

describe("useMealPlanController draft targeting orchestration", () => {
  const targetedPlan: WeekPlan = {
    id: "plan-targeted",
    weekStartDate: "2026-07-20",
    dayCount: 14,
    slots: [
      {
        id: "slot-filled-saturday",
        date: "2026-07-25",
        type: "dinner",
        text: "Dinner with friends",
      },
    ],
  };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-07-20T12:00:00.000Z"));
    jest.clearAllMocks();
    mockMealPlanState.activePlan = targetedPlan;
    mockRecipeRepository.getSaved.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("passes filled context and accepts only the first unfilled requested weekday", async () => {
    LLMService.send.mockResolvedValue({
      content: JSON.stringify([
        {
          date: "2026-07-25",
          type: "dinner",
          title: "Overwrite Filled Saturday",
        },
        {
          date: "2026-08-01",
          type: "dinner",
          title: "Grilled Summer Vegetables",
        },
        {
          date: "2026-08-02",
          type: "dinner",
          title: "Unrequested Sunday Supper",
        },
      ]),
    });
    const { result } = renderHook(() => useMealPlanController());
    await act(async () => {
      await Promise.resolve();
      await result.current.generateFromRequest("What should we have on Saturday?");
    });

    const sentContext = JSON.parse(
      LLMService.send.mock.calls[0][0].messages[0].content,
    );
    expect(sentContext.filledSlots).toEqual([
      {
        date: "2026-07-25",
        type: "dinner",
        text: "Dinner with friends",
      },
    ]);
    expect(sentContext.availableDays).toEqual([
      expect.objectContaining({ date: "2026-08-01" }),
    ]);
    expect(mockMealPlanState.setDraftSlots).toHaveBeenCalledWith([
      expect.objectContaining({
        date: "2026-08-01",
        type: "dinner",
        suggestionText: "Grilled Summer Vegetables",
      }),
    ]);
    expect(mockMealPlanRepository.save).not.toHaveBeenCalled();
    expect(mockMealPlanState.setActivePlan).not.toHaveBeenCalled();
    expect(mockMealPlanState.activePlan).toBe(targetedPlan);
  });
});
