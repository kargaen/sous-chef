import type {
  AdaptationIngredientSnapshot,
  AdaptationResponse,
  AdaptationStepSnapshot,
  Recipe,
} from "@/models/types";

export type DiffRowKind = "unchanged" | "added" | "removed";

export interface DiffRow {
  id: string;
  kind: DiffRowKind;
  text: string;
}

const ingredientText = (s: AdaptationIngredientSnapshot): string =>
  s.displayText ||
  [s.quantity, s.unit, s.name].filter(Boolean).join(" ").trim();

const stepText = (s: AdaptationStepSnapshot): string => s.instruction;

export const buildIngredientDiffRows = (
  recipe: Recipe,
  response: AdaptationResponse,
): DiffRow[] => {
  const rows: DiffRow[] = [];

  const changeForIngredient = (id: string, name: string) =>
    response.ingredientChanges.find((change) => {
      if (change.changeType === "add") return false;
      return (
        change.before.ingredientId === id ||
        change.before.name.toLowerCase() === name.toLowerCase()
      );
    });

  recipe.ingredients.forEach((ingredient) => {
    const original = `${ingredient.quantity} ${ingredient.unit} ${ingredient.name}`.trim();
    const change = changeForIngredient(ingredient.id, ingredient.name);

    if (!change) {
      rows.push({ id: `ing-${ingredient.id}`, kind: "unchanged", text: original });
      return;
    }

    rows.push({ id: `ing-${ingredient.id}-removed`, kind: "removed", text: original });

    if (change.changeType === "replace") {
      rows.push({
        id: `ing-${ingredient.id}-added`,
        kind: "added",
        text: ingredientText(change.after),
      });
    }
  });

  response.ingredientChanges
    .filter((change) => change.changeType === "add")
    .forEach((change) => {
      rows.push({
        id: `ing-new-${change.id}`,
        kind: "added",
        text: ingredientText(change.after),
      });
    });

  return rows;
};

export const buildStepDiffRows = (
  recipe: Recipe,
  response: AdaptationResponse,
): DiffRow[] => {
  const rows: DiffRow[] = [];

  const changeForStep = (order: number) =>
    response.stepChanges.find((change) => {
      if (change.changeType === "add") return false;
      return (
        change.before.order === order ||
        change.before.stepId === `step-${order}`
      );
    });

  recipe.steps.forEach((step) => {
    const original = `${step.order}. ${step.instruction}`;
    const change = changeForStep(step.order);

    if (!change) {
      rows.push({ id: `step-${step.order}`, kind: "unchanged", text: original });
      return;
    }

    rows.push({ id: `step-${step.order}-removed`, kind: "removed", text: original });

    if (change.changeType === "replace") {
      rows.push({
        id: `step-${step.order}-added`,
        kind: "added",
        text: stepText(change.after),
      });
    }
  });

  response.stepChanges
    .filter((change) => change.changeType === "add")
    .forEach((change) => {
      rows.push({
        id: `step-new-${change.id}`,
        kind: "added",
        text: stepText(change.after),
      });
    });

  return rows;
};
