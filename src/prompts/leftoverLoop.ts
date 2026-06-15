// Prompt + parser for the Discover "Leftover loop" (epic D.0c). Given what the
// cook recently made, suggest one friendly way to use up likely leftovers. The
// LLM only writes the copy; the deterministic trigger (a recent cook) lives in
// the service.

export interface LeftoverDish {
  title: string;
  keyIngredients: string[];
  cookedAgo: string;
}

export interface LeftoverContext {
  recentDishes: LeftoverDish[];
  pantryHighlights: string[];
}

export interface GeneratedLeftover {
  title: string;
  hook: string;
}

export const LEFTOVER_SYSTEM_PROMPT = `
You are Sous Chef, a warm kitchen companion helping the cook waste less food.
The cook recently made the dishes provided. Suggest ONE easy idea to use up
likely leftovers — an ingredient probably still in the fridge, repurposed into
something new and appealing. Be specific and friendly, never preachy.

Rules:
- Return ONLY a JSON object, no prose, no markdown fences.
- Shape: { "title": string, "hook": string }.
- "title": 2-5 words, Title Case (e.g. "Roast Chicken Tacos").
- "hook": ONE short sentence that names the leftover and the new idea.
`.trim();

export const buildLeftoverUserMessage = (context: LeftoverContext): string =>
  JSON.stringify({
    recentDishes: context.recentDishes,
    pantryHighlights: context.pantryHighlights,
  });

// Tolerant parse: strip fences, grab the first JSON object, require title+hook.
export const parseLeftover = (content: string): GeneratedLeftover | null => {
  const cleaned = content.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;

  const record = parsed as Record<string, unknown>;
  const title = typeof record.title === "string" ? record.title.trim() : "";
  const hook = typeof record.hook === "string" ? record.hook.trim() : "";
  if (title.length === 0 || hook.length === 0) return null;

  return { title, hook };
};
