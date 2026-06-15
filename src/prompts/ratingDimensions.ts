import type { Recipe } from "../models/types";

const formatIngredients = (recipe: Recipe): string =>
  recipe.ingredients
    .map((i) => `- ${i.quantity} ${i.unit} ${i.name}`.trim())
    .join("\n");

const formatSteps = (recipe: Recipe): string =>
  recipe.steps.map((s) => `${s.order}. ${s.instruction}`).join("\n");

export const buildRatingDimensionsPrompt = (recipe: Recipe): string =>
  `
You are setting up the rating dimensions for a recipe in a cooking app.

Return a JSON array of 2 to 3 short rating-dimension labels that capture what most determines whether THIS specific dish turns out well — the qualities a cook would judge after making it.

Rules:
- 2 to 3 items, never more.
- Each label is 1–3 words, Title Case (e.g. "Salmon Sear", "Potato Crisp", "Sauce Balance").
- Make them specific to this dish, not generic. Do NOT include "Taste" — it is always present separately.
- Return ONLY the JSON array. No prose, no markdown fences.

Recipe: "${recipe.title}"
Ingredients:
${formatIngredients(recipe)}
Steps:
${formatSteps(recipe)}
`.trim();
