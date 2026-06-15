import type { BudgetPeriod, PantryItem } from "../models/types";

interface MealPlanningContext {
  pantryItems: Pick<PantryItem, "name" | "quantity" | "unit">[];
  expiringItems: Pick<PantryItem, "name" | "expiryDate">[];
  budgetPeriod: BudgetPeriod | null;
  month: number;
  region: string | null;
  servingsPerMeal: number;
  maxCookMinutesPerDay: number;
  excludeTags: string[];
}

export const buildMealPlanningPrompt = (ctx: MealPlanningContext): string =>
  `
Generate a weekly meal plan for this cook.

Current pantry:
${ctx.pantryItems.map((i) => `- ${i.name} (${i.quantity} ${i.unit})`).join("\n")}

${
  ctx.expiringItems.length > 0
    ? `Use these soon: ${ctx.expiringItems.map((i) => `${i.name} (expires ${i.expiryDate})`).join(", ")}`
    : ""
}

${
  ctx.budgetPeriod
    ? `Weekly budget: ${ctx.budgetPeriod.limitAmount} ${ctx.budgetPeriod.currency}`
    : ""
}

Constraints:
- Servings per meal: ${ctx.servingsPerMeal}
- Max cook time per day: ${ctx.maxCookMinutesPerDay} minutes
${ctx.excludeTags.length > 0 ? `- Exclude: ${ctx.excludeTags.join(", ")}` : ""}

Month: ${ctx.month}
Region: ${ctx.region ?? "unknown"}

Suggest seven dinners and where relevant a lunch or breakfast idea.
Prioritise expiring ingredients. Consider what is in season and local produce.
Keep suggestions practical and varied — avoid repeating proteins or cuisines.
Be warm and specific, not a dry list.
`.trim();
