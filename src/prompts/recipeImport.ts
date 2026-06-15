interface RecipeImportContext {
  sourceMode: "idea" | "paste";
  source: string;
}

export const buildRecipeImportPrompt = (ctx: RecipeImportContext): string =>
  `
Turn this ${ctx.sourceMode === "idea" ? "recipe idea" : "recipe source text"} into a clean recipe draft.

Return valid JSON only with this exact shape:
{
  "title": "string",
  "ingredients": ["string"],
  "steps": ["string"],
  "notes": "string",
  "servings": number,
  "prepMinutes": number,
  "cookMinutes": number,
  "estimatedCost": number
}

Rules:
- Do not wrap the JSON in markdown fences.
- Ingredients must be short line items, one per array entry.
- Steps must be plain instruction strings without numbering.
- Keep notes concise and useful.
- servings, prepMinutes, cookMinutes: whole numbers. If a value is not stated, estimate a sensible one from the recipe rather than leaving it out.
- estimatedCost: a rough total cost to make the dish, as a plain number with no currency symbol. Use 0 only if you truly cannot estimate.
- If the source is rough or incomplete, make reasonable cooking assumptions and mention them in notes.
- If the source already contains a recipe, preserve the original intent closely while cleaning it up.

Source:
${ctx.source}
`.trim();
