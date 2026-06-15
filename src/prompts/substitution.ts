import type { Ingredient, PantryItem, Recipe } from "../models/types";

interface SubstitutionContext {
  missingIngredient: Ingredient;
  recipe: Recipe;
  availablePantryItems: Pick<PantryItem, "name" | "quantity" | "unit">[];
}

export const buildSubstitutionPrompt = (ctx: SubstitutionContext): string =>
  `
The cook is making "${ctx.recipe.title}" but is missing: ${ctx.missingIngredient.quantity} ${ctx.missingIngredient.unit} ${ctx.missingIngredient.name}.

How the ingredient is used in the recipe:
${
  ctx.recipe.steps
    .filter((s) =>
      s.instruction
        .toLowerCase()
        .includes(ctx.missingIngredient.name.toLowerCase()),
    )
    .map((s) => `- ${s.instruction}`)
    .join("\n") || "- No specific steps mention this ingredient directly."
}

What the cook has available:
${ctx.availablePantryItems.map((i) => `- ${i.name} (${i.quantity} ${i.unit})`).join("\n")}

Suggest the best substitute from what they have available, or a commonly stocked alternative if nothing fits.
Be specific about quantities and any adjustments needed.
Keep it brief and practical — one or two sentences at most.
`.trim();
