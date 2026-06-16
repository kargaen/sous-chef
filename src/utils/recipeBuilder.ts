import type { Ingredient, Recipe, Step } from "../models/types";

export interface RecipeBuilderInput {
  categoryId?: string | null;
  title: string;
  ingredientsText: string;
  stepsText: string;
  notes?: string;
  servings?: number;
  prepMinutes?: number;
  cookMinutes?: number;
  estimatedCost?: number;
}

export const createRecipeId = (): string =>
  `recipe-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export const parseIngredientLine = (line: string, index: number): Ingredient => {
  const trimmed = line.trim();
  const match = trimmed.match(/^(\d+(?:[.,]\d+)?)\s*([^\s]+)\s+(.+)$/);
  if (!match) {
    return { id: `ingredient-${index + 1}`, name: trimmed, quantity: 1, unit: "item" };
  }
  return {
    id: `ingredient-${index + 1}`,
    name: match[3].trim(),
    quantity: Number(match[1].replace(",", ".")),
    unit: match[2].trim(),
  };
};

export const parseStepLine = (line: string, index: number): Step => {
  const trimmed = line.trim();
  return {
    order: index + 1,
    instruction: trimmed.replace(/^\d+[\).\s-]+/, "").trim() || trimmed,
  };
};

const stripJsonFences = (value: string): string =>
  value.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

const toOptionalNumber = (value: unknown): number | undefined => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

// Parses the LLM response for a recipe import/generation call.
// Throws when the response is structurally unusable (no title, ingredients, or steps).
export const parseRecipeDraftFromLLM = (content: string): RecipeBuilderInput => {
  const parsed = JSON.parse(stripJsonFences(content)) as {
    title?: unknown;
    ingredients?: unknown;
    steps?: unknown;
    notes?: unknown;
    servings?: unknown;
    prepMinutes?: unknown;
    cookMinutes?: unknown;
    estimatedCost?: unknown;
  };

  const title = typeof parsed.title === "string" ? parsed.title.trim() : "";
  const ingredients = Array.isArray(parsed.ingredients)
    ? parsed.ingredients
        .filter((v): v is string => typeof v === "string")
        .map((v) => v.trim())
        .filter(Boolean)
    : [];
  const steps = Array.isArray(parsed.steps)
    ? parsed.steps
        .filter((v): v is string => typeof v === "string")
        .map((v) => v.trim())
        .filter(Boolean)
    : [];
  const notes = typeof parsed.notes === "string" ? parsed.notes.trim() : "";

  if (!title || ingredients.length === 0 || steps.length === 0) {
    throw new Error("Recipe draft was incomplete.");
  }

  return {
    title,
    ingredientsText: ingredients.join("\n"),
    stepsText: steps.join("\n"),
    notes,
    servings: toOptionalNumber(parsed.servings),
    prepMinutes: toOptionalNumber(parsed.prepMinutes),
    cookMinutes: toOptionalNumber(parsed.cookMinutes),
    estimatedCost: toOptionalNumber(parsed.estimatedCost),
  };
};

export const buildRecipeFromInput = (draft: RecipeBuilderInput): Recipe => {
  const title = draft.title.trim();
  const ingredients = draft.ingredientsText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const steps = draft.stepsText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (!title) throw new Error("Give the recipe a title before saving.");
  if (ingredients.length === 0) throw new Error("Add at least one ingredient before saving.");
  if (steps.length === 0) throw new Error("Add at least one step before saving.");

  const now = new Date().toISOString();
  const notes = draft.notes?.trim();

  return {
    id: createRecipeId(),
    title,
    description: notes || `${title} recipe`,
    categoryId: draft.categoryId ?? null,
    parentId: null,
    servings: draft.servings && draft.servings > 0 ? Math.round(draft.servings) : 1,
    prepMinutes: Math.round(draft.prepMinutes ?? 0),
    cookMinutes: Math.round(draft.cookMinutes ?? 0),
    estimatedCost: draft.estimatedCost,
    ingredients: ingredients.map(parseIngredientLine),
    steps: steps.map(parseStepLine),
    chefsNotes: notes || undefined,
    tags: [],
    createdDate: now,
    lastUpdatedDate: now,
  };
};
