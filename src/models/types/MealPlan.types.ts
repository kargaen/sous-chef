export type MealSlotType = "breakfast" | "lunch" | "dinner" | "snack";
export type MealSlotStatus = "planned" | "cooked" | "skipped";

export interface MealSlot {
  id: string;
  date: string;          // YYYY-MM-DD
  type: MealSlotType;
  text?: string;
  recipeId?: string | null;
  note?: string;
  servings?: number;
  status?: MealSlotStatus;
}
// Schema invariant: text is standalone; note is only complementary to recipeId.

// Transient UI state only — never reaches the repository.
// Suggestion chips live here until the user accepts or rejects them.
export interface SuggestionSlot {
  id: string;
  date: string;
  type: MealSlotType;
  suggestionText: string;
  note?: string;
}

// Queued after parseSlotInput — confirmed by the user before any LLM call.
export interface AdaptationIntent {
  slotId: string;
  kind: "scale" | "qualitative";
  servings?: number;
  description?: string;
}

// Unified slot submission contract — both input paths normalise to this shape.
export type SlotInput =
  | { rawText: string }
  | { recipeId: string; note: string };

export interface WeekPlan {
  id: string;
  weekStartDate: string;  // YYYY-MM-DD — used as the DB key
  dayCount: number;       // default 7; drives eachPlanDay
  slots: MealSlot[];
}

export interface PlanPreference {
  maxCookMinutesPerDay: number;
  servingsPerMeal: number;
  excludeTags: string[];
}

// A saved plan "theme" — reusable AI request instructions.
// Stored as a KV blob; never touches the plans table.
export interface PlanPreset {
  id: string;
  name: string;
  instructions: string;
  createdAt: string;  // ISO timestamp
}
