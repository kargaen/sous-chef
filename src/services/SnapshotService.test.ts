import type {
  AppSettings,
  BudgetPeriod,
  ChefProfile,
  Cookbook,
  CookLogEntry,
  CookNote,
  PantryItem,
  PlanPreset,
  Rating,
  RatingCategory,
  Recipe,
  SpendEntry,
  WeekPlan,
} from "../models/types";
import { SnapshotService } from "./SnapshotService";

jest.mock("../models/repositories/BudgetRepository", () => {
  const mockBudgetRepository = {
    listAll: jest.fn(),
    getEntriesForPeriod: jest.fn(),
  };
  return {
    BudgetRepository: jest.fn(() => mockBudgetRepository),
    mockBudgetRepository,
  };
});

jest.mock("../models/repositories/ChefProfileRepository", () => {
  const mockChefProfileRepository = { get: jest.fn() };
  return {
    ChefProfileRepository: jest.fn(() => mockChefProfileRepository),
    mockChefProfileRepository,
  };
});

jest.mock("../models/repositories/CookLogRepository", () => {
  const mockCookLogRepository = {
    getCookLogs: jest.fn(),
    getRatingsForCookLog: jest.fn(),
    getCookNotes: jest.fn(),
    getRatingCategories: jest.fn(),
  };
  return {
    CookLogRepository: jest.fn(() => mockCookLogRepository),
    mockCookLogRepository,
  };
});

jest.mock("../models/repositories/CookbookRepository", () => {
  const mockCookbookRepository = { getAll: jest.fn() };
  return {
    CookbookRepository: jest.fn(() => mockCookbookRepository),
    mockCookbookRepository,
  };
});

jest.mock("../models/repositories/DismissalRepository", () => {
  const mockDismissalRepository = { getRecentSignals: jest.fn() };
  return {
    DismissalRepository: jest.fn(() => mockDismissalRepository),
    mockDismissalRepository,
  };
});

jest.mock("../models/repositories/MealPlanRepository", () => {
  const mockMealPlanRepository = { listAll: jest.fn() };
  return {
    MealPlanRepository: jest.fn(() => mockMealPlanRepository),
    mockMealPlanRepository,
  };
});

jest.mock("../models/repositories/PantryRepository", () => {
  const mockPantryRepository = { getAll: jest.fn() };
  return {
    PantryRepository: jest.fn(() => mockPantryRepository),
    mockPantryRepository,
  };
});

jest.mock("../models/repositories/PlanPresetRepository", () => {
  const mockPlanPresetRepository = { listAll: jest.fn() };
  return {
    PlanPresetRepository: jest.fn(() => mockPlanPresetRepository),
    mockPlanPresetRepository,
  };
});

jest.mock("../models/repositories/RecipeRepository", () => {
  const mockRecipeRepository = { getSaved: jest.fn(), getVariants: jest.fn() };
  return {
    RecipeRepository: jest.fn(() => mockRecipeRepository),
    mockRecipeRepository,
  };
});

jest.mock("../models/repositories/SettingsRepository", () => {
  const mockSettingsRepository = { get: jest.fn() };
  return {
    SettingsRepository: jest.fn(() => mockSettingsRepository),
    mockSettingsRepository,
  };
});

const { mockBudgetRepository } = jest.requireMock(
  "../models/repositories/BudgetRepository",
);
const { mockChefProfileRepository } = jest.requireMock(
  "../models/repositories/ChefProfileRepository",
);
const { mockCookLogRepository } = jest.requireMock(
  "../models/repositories/CookLogRepository",
);
const { mockCookbookRepository } = jest.requireMock(
  "../models/repositories/CookbookRepository",
);
const { mockDismissalRepository } = jest.requireMock(
  "../models/repositories/DismissalRepository",
);
const { mockMealPlanRepository } = jest.requireMock(
  "../models/repositories/MealPlanRepository",
);
const { mockPantryRepository } = jest.requireMock(
  "../models/repositories/PantryRepository",
);
const { mockPlanPresetRepository } = jest.requireMock(
  "../models/repositories/PlanPresetRepository",
);
const { mockRecipeRepository } = jest.requireMock(
  "../models/repositories/RecipeRepository",
);
const { mockSettingsRepository } = jest.requireMock(
  "../models/repositories/SettingsRepository",
);

const savedRecipe: Recipe = {
  id: "recipe-1",
  title: "Rustic Lemon Pasta",
  description: "Bright pasta with herbs and lemon.",
  parentId: null,
  servings: 2,
  prepMinutes: 10,
  cookMinutes: 20,
  ingredients: [],
  steps: [],
  tags: [],
  createdDate: "2026-06-08T00:00:00.000Z",
  lastUpdatedDate: "2026-06-08T00:00:00.000Z",
};

const variantRecipe: Recipe = { ...savedRecipe, id: "recipe-1-variant", parentId: "recipe-1" };

const cookLog: CookLogEntry = {
  id: "cooklog-1",
  recipeId: "recipe-1",
  cookedAt: "2026-06-09T00:00:00.000Z",
  overallScore: 5,
};

const rating: Rating = {
  id: "rating-1",
  cookLogId: "cooklog-1",
  categoryId: "cat-1",
  score: 5,
};

const cookNote: CookNote = {
  id: "note-1",
  recipeId: "recipe-1",
  body: "Turned out great.",
  createdAt: "2026-06-09T00:00:00.000Z",
};

const ratingCategory: RatingCategory = {
  id: "cat-1",
  recipeId: "recipe-1",
  label: "Taste",
  displayOrder: 0,
};

const cookbook: Cookbook = {
  id: "cookbook-1",
  title: "Weeknight",
  parentId: null,
  recipeIds: ["recipe-1"],
};

const pantryItem: PantryItem = {
  id: "pantry-1",
  name: "Flour",
  quantity: 1,
  unit: "kg",
  storageZone: "cupboard",
  usedCount: 0,
};

const weekPlan: WeekPlan = {
  id: "plan-1",
  weekStartDate: "2026-06-08",
  dayCount: 7,
  slots: [],
};

const planPreset: PlanPreset = {
  id: "preset-1",
  name: "Budget week",
  instructions: "Keep it cheap.",
  createdAt: "2026-06-01T00:00:00.000Z",
};

const budgetPeriod: BudgetPeriod = {
  id: "period-1",
  startDate: "2026-06-01",
  endDate: "2026-06-30",
  limitAmount: 200,
  currency: "USD",
};

const spendEntry: SpendEntry = {
  id: "spend-1",
  periodId: "period-1",
  amount: 15,
  note: "Groceries",
  recordedAt: "2026-06-05T00:00:00.000Z",
};

const chefProfile: ChefProfile = {
  id: "chef-1",
  name: "Alex",
  skillLevel: "home cook",
  preferences: { dietary: [], dislikedIngredients: [], cuisinePreferences: [] },
  region: "Denmark",
  currency: "USD",
  createdAt: "2026-01-01T00:00:00.000Z",
};

const appSettings: AppSettings = {
  geminiApiKey: "secret-key-should-never-leave-device",
  keepScreenOn: true,
  sustainabilityNudges: "default",
  learnFromChats: false,
  skipSafetyLayer1: false,
};

describe("SnapshotService.build", () => {
  beforeEach(() => {
    mockRecipeRepository.getSaved.mockReset().mockResolvedValue([savedRecipe]);
    mockRecipeRepository.getVariants
      .mockReset()
      .mockResolvedValue([variantRecipe]);
    mockBudgetRepository.listAll.mockReset().mockResolvedValue([budgetPeriod]);
    mockBudgetRepository.getEntriesForPeriod
      .mockReset()
      .mockResolvedValue([spendEntry]);
    mockCookLogRepository.getCookLogs.mockReset().mockReturnValue([cookLog]);
    mockCookLogRepository.getRatingsForCookLog
      .mockReset()
      .mockReturnValue([rating]);
    mockCookLogRepository.getCookNotes.mockReset().mockReturnValue([cookNote]);
    mockCookLogRepository.getRatingCategories
      .mockReset()
      .mockReturnValue([ratingCategory]);
    mockCookbookRepository.getAll.mockReset().mockResolvedValue([cookbook]);
    mockPantryRepository.getAll.mockReset().mockResolvedValue([pantryItem]);
    mockMealPlanRepository.listAll.mockReset().mockResolvedValue([weekPlan]);
    mockPlanPresetRepository.listAll
      .mockReset()
      .mockResolvedValue([planPreset]);
    mockChefProfileRepository.get.mockReset().mockResolvedValue(chefProfile);
    mockSettingsRepository.get.mockReset().mockResolvedValue(appSettings);
    mockDismissalRepository.getRecentSignals
      .mockReset()
      .mockResolvedValue([{ title: "Soup idea", at: "2026-06-01T00:00:00.000Z" }]);
  });

  it("includes every in-scope domain", async () => {
    const snapshot = await SnapshotService.build();

    expect(snapshot.recipes).toEqual([savedRecipe, variantRecipe]);
    expect(snapshot.cookbooks).toEqual([cookbook]);
    expect(snapshot.pantryItems).toEqual([pantryItem]);
    expect(snapshot.mealPlans).toEqual([weekPlan]);
    expect(snapshot.planPresets).toEqual([planPreset]);
    expect(snapshot.budgetPeriods).toEqual([budgetPeriod]);
    expect(snapshot.spendEntries).toEqual([spendEntry]);
    expect(snapshot.cookLogs).toEqual([cookLog]);
    expect(snapshot.ratings).toEqual([rating]);
    expect(snapshot.cookNotes).toEqual([cookNote]);
    expect(snapshot.ratingCategories).toEqual([ratingCategory]);
    expect(snapshot.chefProfile).toEqual(chefProfile);
    expect(snapshot.dismissalSignals).toEqual([
      { title: "Soup idea", at: "2026-06-01T00:00:00.000Z" },
    ]);
    expect(snapshot.schemaVersion).toBe(1);
    expect(typeof snapshot.exportedAt).toBe("string");
  });

  it("never includes geminiApiKey", async () => {
    const snapshot = await SnapshotService.build();

    expect(snapshot.settings).not.toHaveProperty("geminiApiKey");
    expect(JSON.stringify(snapshot)).not.toContain("secret-key-should-never-leave-device");
  });

  it("gathers cook history per saved recipe, not per variant", async () => {
    await SnapshotService.build();

    expect(mockCookLogRepository.getCookLogs).toHaveBeenCalledWith("recipe-1");
    expect(mockCookLogRepository.getCookLogs).not.toHaveBeenCalledWith(
      "recipe-1-variant",
    );
    expect(mockCookLogRepository.getRatingsForCookLog).toHaveBeenCalledWith(
      "cooklog-1",
    );
  });
});
