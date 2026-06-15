import { buildConversationPrompt } from "./conversation";

describe("buildConversationPrompt", () => {
  it("describes recipe context and ingredients when a recipe is in scope", () => {
    const prompt = buildConversationPrompt({
      userMessage: "How can I make this lighter?",
      suggestionContext: {
        recipeTitle: "Rustic Lemon Pasta",
        pantryItemNames: ["spaghetti", "lemon", "olive oil"],
        nudgeBody: "Try the lighter version.",
      },
    });

    expect(prompt).toContain(
      'The cook is asking about this recipe: "Rustic Lemon Pasta"',
    );
    expect(prompt).toContain(
      "Relevant ingredients and nearby context for this recipe: spaghetti, lemon, olive oil",
    );
    expect(prompt).toContain(
      'This conversation was started from a nudge: "Try the lighter version."',
    );
    expect(prompt.endsWith("How can I make this lighter?")).toBe(true);
  });

  it("keeps non-recipe context framed as pantry context", () => {
    const prompt = buildConversationPrompt({
      userMessage: "What can I cook?",
      suggestionContext: {
        pantryItemNames: ["beans", "rice"],
      },
    });

    expect(prompt).toContain("Relevant pantry items: beans, rice");
    expect(prompt).not.toContain("recipe:");
  });
});
