// Usage thresholds that drive the recipe-list visuals (stains for a staple,
// cobweb for a forgotten dish). Kept in one place so the cues stay consistent.

export const HEAVILY_USED_MIN_COOKS = 5;
export const FORGOTTEN_AFTER_DAYS = 60;

export interface RecipeUsageInput {
  timesCooked?: number;
  lastCookedDate?: string | null;
}

export interface RecipeUsage {
  isHeavilyUsed: boolean;
  isForgotten: boolean;
}

const daysSince = (iso: string, now: Date): number => {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 0;
  return (now.getTime() - then) / (1000 * 60 * 60 * 24);
};

export const deriveRecipeUsage = (
  input: RecipeUsageInput,
  now: Date = new Date(),
): RecipeUsage => {
  const timesCooked = input.timesCooked ?? 0;
  const isHeavilyUsed = timesCooked >= HEAVILY_USED_MIN_COOKS;
  // Only "forgotten" once it has actually been cooked and then neglected — a
  // brand-new, never-cooked recipe is untried, not forgotten.
  const isForgotten =
    !!input.lastCookedDate &&
    daysSince(input.lastCookedDate, now) >= FORGOTTEN_AFTER_DAYS;

  return { isHeavilyUsed, isForgotten };
};
