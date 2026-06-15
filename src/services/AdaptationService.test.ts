import type { AdaptationResponse, Recipe } from "../models/types";
import { AdaptationService } from "./AdaptationService";

const baseRecipe: Recipe = {
  id: "recipe-root",
  title: "Rustic Lemon Pasta",
  description: "Bright pasta with herbs and lemon.",
  categoryId: null,
  parentId: null,
  servings: 2,
  prepMinutes: 10,
  cookMinutes: 20,
  ingredients: [
    { id: "ing-1", name: "spaghetti", quantity: 200, unit: "g" },
    {
      id: "ing-2",
      name: "lemon",
      quantity: 1,
      unit: "item",
      notes: "zested and juiced",
    },
  ],
  steps: [
    { order: 1, instruction: "Boil the pasta until al dente." },
    { order: 2, instruction: "Toss with lemon and herbs." },
  ],
  tags: ["pasta"],
  createdDate: "2026-06-08T00:00:00.000Z",
  lastUpdatedDate: "2026-06-08T00:00:00.000Z",
};

const emptyChanges = {
  rationale: "Tweaks to suit the cook.",
  considerations: [],
  ingredientChanges: [],
  stepChanges: [],
};

describe("AdaptationService.buildVariantRecipe", () => {
  it("links a direct adaptation to the root recipe", () => {
    const response: AdaptationResponse = {
      ...emptyChanges,
      variantTitle: "Lemon Pasta, lighter",
      summary: "A lighter take.",
    };

    const variant = AdaptationService.buildVariantRecipe(baseRecipe, response);

    expect(variant.parentId).toBe("recipe-root");
  });

  it("flattens a variant-of-a-variant into a sibling of the root", () => {
    const existingVariant: Recipe = {
      ...baseRecipe,
      id: "recipe-variant-a",
      parentId: "recipe-root",
    };
    const response: AdaptationResponse = {
      ...emptyChanges,
      variantTitle: "Even lighter",
      summary: "Adapting the variant further.",
    };

    const variant = AdaptationService.buildVariantRecipe(
      existingVariant,
      response,
    );

    // Attaches to the root, not to the variant it was adapted from.
    expect(variant.parentId).toBe("recipe-root");
  });

  it("uses the variantTitle when provided", () => {
    const response: AdaptationResponse = {
      ...emptyChanges,
      variantTitle: "Nourishing kale and quinoa version",
      summary: "Heartier and greener.",
    };

    const variant = AdaptationService.buildVariantRecipe(baseRecipe, response);

    expect(variant.title).toBe("Nourishing kale and quinoa version");
  });

  it("falls back to the parent title when no variantTitle is given", () => {
    const response: AdaptationResponse = {
      ...emptyChanges,
      summary: "Minor tweak.",
    };

    const variant = AdaptationService.buildVariantRecipe(baseRecipe, response);

    expect(variant.title).toBe("Rustic Lemon Pasta");
  });

  it("applies ingredient replace, add, and remove changes", () => {
    const response: AdaptationResponse = {
      ...emptyChanges,
      summary: "Swaps and additions.",
      ingredientChanges: [
        {
          id: "c1",
          changeType: "replace",
          targetType: "ingredient",
          before: { ingredientId: "ing-1", displayText: "200 g spaghetti", name: "spaghetti" },
          after: {
            displayText: "200 g whole wheat spaghetti",
            name: "whole wheat spaghetti",
            quantity: "200",
            unit: "g",
          },
        },
        {
          id: "c2",
          changeType: "remove",
          targetType: "ingredient",
          before: { ingredientId: "ing-2", displayText: "1 item lemon", name: "lemon" },
        },
        {
          id: "c3",
          changeType: "add",
          targetType: "ingredient",
          after: {
            displayText: "50 g kale",
            name: "kale",
            quantity: "50",
            unit: "g",
          },
        },
      ],
    };

    const variant = AdaptationService.buildVariantRecipe(baseRecipe, response);

    const names = variant.ingredients.map((i) => i.name);
    expect(names).toEqual(["whole wheat spaghetti", "kale"]);
  });

  it("applies step replace and add changes and renumbers sequentially", () => {
    const response: AdaptationResponse = {
      ...emptyChanges,
      summary: "Reworked steps.",
      stepChanges: [
        {
          id: "s1",
          changeType: "replace",
          targetType: "step",
          before: { stepId: "step-1", order: 1, instruction: "Boil the pasta until al dente." },
          after: { instruction: "Boil the pasta for 9 minutes." },
        },
        {
          id: "s2",
          changeType: "add",
          targetType: "step",
          after: { order: 3, instruction: "Plate and finish with olive oil." },
        },
      ],
    };

    const variant = AdaptationService.buildVariantRecipe(baseRecipe, response);

    expect(variant.steps).toEqual([
      { order: 1, instruction: "Boil the pasta for 9 minutes." },
      { order: 2, instruction: "Toss with lemon and herbs." },
      { order: 3, instruction: "Plate and finish with olive oil." },
    ]);
  });

  it("keeps the original quantity text in notes when it cannot be parsed", () => {
    const response: AdaptationResponse = {
      ...emptyChanges,
      summary: "Vague amount.",
      ingredientChanges: [
        {
          id: "c1",
          changeType: "replace",
          targetType: "ingredient",
          before: { ingredientId: "ing-2", displayText: "1 item lemon", name: "lemon" },
          after: {
            displayText: "a generous squeeze of lemon",
            name: "lemon",
            quantity: "a squeeze",
          },
        },
      ],
    };

    const variant = AdaptationService.buildVariantRecipe(baseRecipe, response);
    const lemon = variant.ingredients.find((i) => i.name === "lemon");

    expect(lemon?.quantity).toBe(1);
    expect(lemon?.notes).toBe("a generous squeeze of lemon");
  });
});
