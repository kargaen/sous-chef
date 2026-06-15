import type { Recipe } from "../models/types";

export type AdaptationConservatism = "minimal" | "moderate" | "open";

export interface AdaptationPlanContext {
  recipe: Recipe;
  request: string;
  conservatism?: AdaptationConservatism;
  outputLanguage?: string;
}

const CONSERVATISM_INSTRUCTIONS: Record<AdaptationConservatism, string> = {
  minimal:
    "Be conservative: change only what the cook's request explicitly calls for. Preserve all other ingredients, quantities, and steps exactly as they are. When in doubt, leave it unchanged.",
  moderate:
    "Make targeted changes that serve the request. You may adjust related ingredients or steps when it makes the result more coherent, but avoid unnecessary rewrites.",
  open: "Adapt freely. If a broader reinterpretation would better serve the cook's intent, you may propose it — but explain why.",
};

const formatIngredients = (recipe: Recipe): string =>
  recipe.ingredients
    .map(
      (i) =>
        `- ${i.quantity} ${i.unit} ${i.name}${i.notes ? ` (${i.notes})` : ""}`,
    )
    .join("\n");

const formatSteps = (recipe: Recipe): string =>
  recipe.steps.map((s) => `${s.order}. ${s.instruction}`).join("\n");

export const buildAdaptationPlanPrompt = (
  ctx: AdaptationPlanContext,
): string => {
  const conservatism = ctx.conservatism ?? "minimal";
  const conservatismInstruction = CONSERVATISM_INSTRUCTIONS[conservatism];
  const languageInstruction = ctx.outputLanguage?.trim()
    ? `Write your response in ${ctx.outputLanguage.trim()}, even if the cook writes in another language.`
    : "Write your response in the same language the cook used in their request.";

  return `
You are a sous chef helping a cook plan a recipe adaptation before committing to it.

${languageInstruction}
${conservatismInstruction}

Do NOT apply the changes yet. Describe what you would change and why — briefly and clearly.
Use simple lists where helpful. Separate ingredient changes from step changes if both are affected.
Close with one sentence summarising the scope (e.g. "Light touch — two ingredient swaps, steps unchanged.").
Do not ask for permission or include phrases like "shall I proceed?" — the interface handles confirmation separately.

Recipe: "${ctx.recipe.title}"

Ingredients:
${formatIngredients(ctx.recipe)}

Steps:
${formatSteps(ctx.recipe)}

Cook's request: ${ctx.request}
`.trim();
};
