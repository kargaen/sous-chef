import type { BudgetPeriod, SpendEntry } from "./Budget.types";
import type { ChefProfile } from "./Chef.types";
import type { Cookbook } from "./Cookbook.types";
import type { WeekPlan, PlanPreset } from "./MealPlan.types";
import type { PantryItem } from "./Pantry.types";
import type { CookLogEntry, CookNote, Rating, RatingCategory, Recipe } from "./Recipe.types";
import type { AppSettings } from "./Settings.types";

// A "not for me" dismissal signal (see DismissalRepository) — kept here in
// full, rather than the title-only shape the repository currently exposes,
// since a restore needs the original timestamp too.
export interface SnapshotDismissalSignal {
  title: string;
  at: string;
}

// Durable backup contract for Supabase recovery (see ARCHITECTURE.md's
// "Upcoming Remote Durability Layer"). Regenerable caches — seasonal/pricing
// caches, inspirations, habits, waste log — and the geminiApiKey secret are
// deliberately excluded; they either rebuild themselves or must never leave
// the device.
export interface AppSnapshot {
  schemaVersion: number;
  exportedAt: string;

  recipes: Recipe[];
  cookbooks: Cookbook[];
  pantryItems: PantryItem[];
  mealPlans: WeekPlan[];
  planPresets: PlanPreset[];

  budgetPeriods: BudgetPeriod[];
  spendEntries: SpendEntry[];

  cookLogs: CookLogEntry[];
  ratings: Rating[];
  cookNotes: CookNote[];
  ratingCategories: RatingCategory[];

  chefProfile: ChefProfile | null;
  settings: Omit<AppSettings, "geminiApiKey"> | null;
  dismissalSignals: SnapshotDismissalSignal[];
}
