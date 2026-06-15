import type { Recipe } from "../models/types";

interface AdaptationContext {
  recipe: Recipe;
  reason: string;
  outputLanguage?: string;
}

const formatIngredientLine = (recipe: Recipe): string =>
  recipe.ingredients
    .map((ingredient) => {
      const amount = `${ingredient.quantity} ${ingredient.unit}`.trim();
      const note = ingredient.notes ? ` (${ingredient.notes})` : "";
      return `- [${ingredient.id}] ${amount} ${ingredient.name}${note}`.trim();
    })
    .join("\n");

const formatStepLine = (recipe: Recipe): string =>
  recipe.steps
    .map((step) => `- [step-${step.order}] ${step.order}. ${step.instruction}`)
    .join("\n");

export const buildAdaptationPrompt = (ctx: AdaptationContext): string => {
  const outputLanguageInstruction = ctx.outputLanguage?.trim()
    ? `Write all user-facing text fields in ${ctx.outputLanguage.trim()}, even if the cook or the source material uses another language.`
    : "Write all user-facing text fields in the same language the cook used in their request.";

  return `
You are adapting an existing recipe for a cook.

Return valid JSON only. Do not wrap the JSON in markdown fences. Do not add commentary before or after it.

${outputLanguageInstruction}
Keep all object keys, enum values, and structural field names exactly as requested below.

Recipe title: "${ctx.recipe.title}"
Reason for adaptation: ${ctx.reason}

Original ingredients:
${formatIngredientLine(ctx.recipe)}

Original steps:
${formatStepLine(ctx.recipe)}

Return JSON with this exact top-level shape:
{
  "variantTitle": string,
  "summary": string,
  "rationale": string,
  "considerations": string[],
  "ingredientChanges": AdaptationIngredientChange[],
  "stepChanges": AdaptationStepChange[],
  "adaptedIngredients"?: AdaptationIngredientSnapshot[],
  "adaptedSteps"?: AdaptationStepSnapshot[]
}

Use these structures:

AdaptationIngredientSnapshot:
{
  "ingredientId"?: string,
  "displayText": string,
  "name": string,
  "quantity"?: string,
  "unit"?: string,
  "notes"?: string
}

AdaptationStepSnapshot:
{
  "stepId"?: string,
  "order"?: number,
  "instruction": string
}

Ingredient change variants:
{
  "id": string,
  "changeType": "add",
  "targetType": "ingredient",
  "after": AdaptationIngredientSnapshot,
  "reason"?: string
}

{
  "id": string,
  "changeType": "remove",
  "targetType": "ingredient",
  "before": AdaptationIngredientSnapshot,
  "reason"?: string
}

{
  "id": string,
  "changeType": "replace",
  "targetType": "ingredient",
  "before": AdaptationIngredientSnapshot,
  "after": AdaptationIngredientSnapshot,
  "reason"?: string
}

Step change variants:
{
  "id": string,
  "changeType": "add",
  "targetType": "step",
  "after": AdaptationStepSnapshot,
  "reason"?: string
}

{
  "id": string,
  "changeType": "remove",
  "targetType": "step",
  "before": AdaptationStepSnapshot,
  "reason"?: string
}

{
  "id": string,
  "changeType": "replace",
  "targetType": "step",
  "before": AdaptationStepSnapshot,
  "after": AdaptationStepSnapshot,
  "reason"?: string
}

Rules:
- Prefer "replace" when an original ingredient or step has a clear adapted counterpart.
- Use "remove" only when something should truly disappear without replacement.
- Use "add" only for genuinely new ingredients or steps.
- Reuse the provided ingredient ids when you can map changes clearly.
- Use step ids like "step-1", "step-2", etc. when referring back to original steps.
- Keep the adaptation practical, specific, and trustworthy.
- "variantTitle" is a short, appetising name for this adapted version (e.g. "Nourishing kale and quinoa version"). It should describe what makes the variant different, not repeat the original title.
- "summary" should be short and scannable.
- "rationale" should explain the adaptation direction briefly.
- "considerations" should be concise and useful while cooking.
- Include "adaptedIngredients" and "adaptedSteps" when the recipe has meaningfully changed and a consolidated final version would help.
`.trim();
};
