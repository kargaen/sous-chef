import type {
  AdaptationIngredientSnapshot,
  AdaptationResponse,
  AdaptationStepSnapshot,
  Ingredient,
  Recipe,
  Step,
} from "../models/types";

// Snapshots carry quantity as text ("2", "1/2", "1.5"); the recipe schema
// requires a positive number. Unparseable amounts fall back to 1 with the
// original text preserved in notes.
const parseQuantity = (value?: string): number | null => {
  if (!value) return null;

  const trimmed = value.trim().replace(",", ".");
  const fraction = /^(\d+)\s*\/\s*(\d+)$/.exec(trimmed);
  if (fraction) {
    const denominator = Number(fraction[2]);
    if (denominator > 0) return Number(fraction[1]) / denominator;
  }

  const parsed = Number.parseFloat(trimmed);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const snapshotToIngredient = (
  snapshot: AdaptationIngredientSnapshot,
  index: number,
): Ingredient => {
  const quantity = parseQuantity(snapshot.quantity);

  return {
    id: snapshot.ingredientId ?? `ing_${Date.now()}_${index}`,
    name: snapshot.name,
    quantity: quantity ?? 1,
    unit: snapshot.unit ?? "",
    notes:
      quantity === null && snapshot.displayText
        ? snapshot.displayText
        : snapshot.notes,
  };
};

const applyIngredientChanges = (
  recipe: Recipe,
  response: AdaptationResponse,
): Ingredient[] => {
  const result: Ingredient[] = [];

  const changeForIngredient = (id: string, name: string) =>
    response.ingredientChanges.find((change) => {
      if (change.changeType === "add") return false;
      return (
        change.before.ingredientId === id ||
        change.before.name.toLowerCase() === name.toLowerCase()
      );
    });

  recipe.ingredients.forEach((ingredient, index) => {
    const change = changeForIngredient(ingredient.id, ingredient.name);

    if (!change) {
      result.push(ingredient);
      return;
    }

    if (change.changeType === "replace") {
      result.push(snapshotToIngredient(change.after, index));
    }
    // "remove": drop the ingredient
  });

  response.ingredientChanges
    .filter((change) => change.changeType === "add")
    .forEach((change, index) => {
      result.push(
        snapshotToIngredient(change.after, recipe.ingredients.length + index),
      );
    });

  return result;
};

const applyStepChanges = (
  recipe: Recipe,
  response: AdaptationResponse,
): Step[] => {
  const instructions: string[] = [];

  const changeForStep = (order: number) =>
    response.stepChanges.find((change) => {
      if (change.changeType === "add") return false;
      return (
        change.before.order === order ||
        change.before.stepId === `step-${order}`
      );
    });

  recipe.steps.forEach((step) => {
    const change = changeForStep(step.order);

    if (!change) {
      instructions.push(step.instruction);
      return;
    }

    if (change.changeType === "replace") {
      instructions.push(change.after.instruction);
    }
    // "remove": drop the step
  });

  response.stepChanges
    .filter((change) => change.changeType === "add")
    .forEach((change) => {
      const snapshot: AdaptationStepSnapshot = change.after;
      const insertAt =
        typeof snapshot.order === "number" && snapshot.order > 0
          ? Math.min(snapshot.order - 1, instructions.length)
          : instructions.length;
      instructions.splice(insertAt, 0, snapshot.instruction);
    });

  return instructions.map((instruction, index) => ({
    order: index + 1,
    instruction,
  }));
};

export const AdaptationService = {
  /**
   * Build a variant recipe from a parent recipe and an accepted adaptation.
   * The variant keeps unchanged content, applies replacements and additions,
   * drops removals, and links back to the parent via parentId.
   *
   * Variants always attach to the ROOT recipe: adapting a variant produces
   * a sibling variant of the original, never a nested chain.
   */
  buildVariantRecipe: (
    parent: Recipe,
    response: AdaptationResponse,
  ): Recipe => {
    const now = new Date().toISOString();

    return {
      ...parent,
      id: `recipe_${Date.now()}`,
      parentId: parent.parentId ?? parent.id,
      title: response.variantTitle ?? parent.title,
      description: response.summary,
      ingredients: applyIngredientChanges(parent, response),
      steps: applyStepChanges(parent, response),
      chefsNotes: response.considerations.length
        ? response.considerations.join("\n")
        : parent.chefsNotes,
      createdDate: now,
      lastUpdatedDate: now,
    };
  },
};
