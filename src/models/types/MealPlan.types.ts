export type MealSlotType = "breakfast" | "lunch" | "dinner" | "snack";

export interface MealSlot {
  id: string;
  date: string;
  type: MealSlotType;
  recipeId: string;
  servings: number;
}

export interface WeekPlan {
  id: string;
  weekStartDate: string;
  slots: MealSlot[];
}

export interface PlanPreference {
  maxCookMinutesPerDay: number;
  servingsPerMeal: number;
  excludeTags: string[];
}
