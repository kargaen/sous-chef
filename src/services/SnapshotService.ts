import { BudgetRepository } from "../models/repositories/BudgetRepository";
import { ChefProfileRepository } from "../models/repositories/ChefProfileRepository";
import { CookLogRepository } from "../models/repositories/CookLogRepository";
import { CookbookRepository } from "../models/repositories/CookbookRepository";
import { DismissalRepository } from "../models/repositories/DismissalRepository";
import { MealPlanRepository } from "../models/repositories/MealPlanRepository";
import { PantryRepository } from "../models/repositories/PantryRepository";
import { PlanPresetRepository } from "../models/repositories/PlanPresetRepository";
import { RecipeRepository } from "../models/repositories/RecipeRepository";
import { SettingsRepository } from "../models/repositories/SettingsRepository";
import type {
  AppSettings,
  AppSnapshot,
  CookLogEntry,
  CookNote,
  Rating,
  RatingCategory,
} from "../models/types";

const SNAPSHOT_SCHEMA_VERSION = 1;

const budgetRepository = new BudgetRepository();
const chefProfileRepository = new ChefProfileRepository();
const cookLogRepository = new CookLogRepository();
const cookbookRepository = new CookbookRepository();
const dismissalRepository = new DismissalRepository();
const mealPlanRepository = new MealPlanRepository();
const pantryRepository = new PantryRepository();
const planPresetRepository = new PlanPresetRepository();
const recipeRepository = new RecipeRepository();
const settingsRepository = new SettingsRepository();

// Explicit allowlist rather than a destructuring omit — a new AppSettings
// field defaults to excluded here until someone deliberately adds it, so a
// future secret can't leak into a snapshot by accident.
const redactSettings = (settings: AppSettings): Omit<AppSettings, "geminiApiKey"> => ({
  keepScreenOn: settings.keepScreenOn,
  sustainabilityNudges: settings.sustainabilityNudges,
  learnFromChats: settings.learnFromChats,
  assistantOutputLanguage: settings.assistantOutputLanguage,
  skipSafetyLayer1: settings.skipSafetyLayer1,
  weekStartDay: settings.weekStartDay,
  defaultPlanLength: settings.defaultPlanLength,
  pantryNudgeFrequency: settings.pantryNudgeFrequency,
});

// CookLogRepository's reads are per-recipe (no exportAll), so cook history is
// gathered by iterating every saved recipe's id.
const collectCookHistory = (recipeIds: string[]) => {
  const cookLogs: CookLogEntry[] = [];
  const ratings: Rating[] = [];
  const cookNotes: CookNote[] = [];
  const ratingCategories: RatingCategory[] = [];

  for (const recipeId of recipeIds) {
    const recipeCookLogs = cookLogRepository.getCookLogs(recipeId);
    cookLogs.push(...recipeCookLogs);

    recipeCookLogs.forEach((cookLog) => {
      ratings.push(...cookLogRepository.getRatingsForCookLog(cookLog.id));
    });

    cookNotes.push(...cookLogRepository.getCookNotes(recipeId));
    ratingCategories.push(...cookLogRepository.getRatingCategories(recipeId));
  }

  return { cookLogs, ratings, cookNotes, ratingCategories };
};

export const SnapshotService = {
  // Build-only for now (Phase 1.2) — no network calls. BackupService will
  // hand the result to SupabaseService.uploadSnapshot.
  async build(): Promise<AppSnapshot> {
    const savedRecipes = await recipeRepository.getSaved();
    const variantRecipes = (
      await Promise.all(
        savedRecipes.map((recipe) => recipeRepository.getVariants(recipe.id)),
      )
    ).flat();

    const budgetPeriods = await budgetRepository.listAll();
    const spendEntries = (
      await Promise.all(
        budgetPeriods.map((period) =>
          budgetRepository.getEntriesForPeriod(period.id),
        ),
      )
    ).flat();

    const { cookLogs, ratings, cookNotes, ratingCategories } =
      collectCookHistory(savedRecipes.map((recipe) => recipe.id));

    const [
      cookbooks,
      pantryItems,
      mealPlans,
      planPresets,
      chefProfile,
      settings,
      dismissalSignals,
    ] = await Promise.all([
      cookbookRepository.getAll(),
      pantryRepository.getAll(),
      mealPlanRepository.listAll(),
      planPresetRepository.listAll(),
      chefProfileRepository.get(),
      settingsRepository.get(),
      dismissalRepository.getRecentSignals(),
    ]);

    return {
      schemaVersion: SNAPSHOT_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),

      recipes: [...savedRecipes, ...variantRecipes],
      cookbooks,
      pantryItems,
      mealPlans,
      planPresets,

      budgetPeriods,
      spendEntries,

      cookLogs,
      ratings,
      cookNotes,
      ratingCategories,

      chefProfile,
      settings: redactSettings(settings),
      dismissalSignals,
    };
  },
};
