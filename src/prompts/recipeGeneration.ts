import type { PantryItem } from "../models/types";

interface RecipeSuggestionContext {
  pantryItems: Pick<PantryItem, "name" | "quantity" | "unit">[];
  expiringItems: Pick<PantryItem, "name">[];
  month: number;
  region: string | null;
}

export const buildRecipeSuggestionPrompt = (
  ctx: RecipeSuggestionContext,
): string =>
  `
The cook has these items in their pantry:
${ctx.pantryItems.map((i) => `- ${i.name} (${i.quantity} ${i.unit})`).join("\n")}

${
  ctx.expiringItems.length > 0
    ? `These items need to be used soon: ${ctx.expiringItems.map((i) => i.name).join(", ")}.`
    : ""
}

Current month: ${ctx.month}
Region: ${ctx.region ?? "unknown"}

Suggest two or three recipe ideas that make good use of what they have.
Prioritise expiring items. Consider what is in season locally.
Be warm and specific — mention the actual ingredients by name.
Keep each suggestion to two or three sentences.
`.trim();
