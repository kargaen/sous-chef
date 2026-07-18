import { buildAdaptationPrompt } from "./recipeAdaptation";

describe("buildAdaptationPrompt", () => {
  const recipe = {
    id: "recipe-1",
    title: "Rustic Lemon Pasta",
    description: "Bright pasta with herbs and lemon.",
    categoryId: null,
    parentId: null,
    servings: 2,
    prepMinutes: 10,
    cookMinutes: 20,
    ingredients: [
      {
        id: "ingredient-1",
        name: "spaghetti",
        quantity: 200,
        unit: "g",
      },
      {
        id: "ingredient-2",
        name: "lemon",
        quantity: 1,
        unit: "item",
        notes: "zested and juiced",
      },
    ],
    steps: [
      {
        order: 1,
        instruction: "Boil the pasta until al dente.",
      },
      {
        order: 2,
        instruction: "Toss with lemon and herbs.",
      },
    ],
    tags: ["pasta"],
    createdDate: "2026-06-08T00:00:00.000Z",
    lastUpdatedDate: "2026-06-08T00:00:00.000Z",
  };

  it("asks for structured JSON output and includes the recipe context", () => {
    const prompt = buildAdaptationPrompt({
      recipe,
      reason: "Make it healthier without losing character.",
      outputLanguage: "Swedish",
    });

    expect(prompt).toContain("Return valid JSON only.");
    expect(prompt).toContain("Write all user-facing text fields in Swedish, even if the cook or the source material uses another language.");
    expect(prompt).toContain('Recipe title: "Rustic Lemon Pasta"');
    expect(prompt).toContain("Reason for adaptation: Make it healthier without losing character.");
    expect(prompt).toContain("- [ingredient-1] 200 g spaghetti");
    expect(prompt).toContain("- [ingredient-2] 1 item lemon (zested and juiced)");
    expect(prompt).toContain('- [step-1] 1. Boil the pasta until al dente.');
    expect(prompt).toContain('"changeType": "replace"');
    expect(prompt).toContain('"adaptedIngredients"?: AdaptationIngredientSnapshot[]');
  });

  it("implies the cook's language when no output language is provided", () => {
    const prompt = buildAdaptationPrompt({
      recipe,
      reason: "Make it cheaper.",
    });

    expect(prompt).toContain(
      "Write all user-facing text fields in the same language the cook used in their request.",
    );
  });
});
