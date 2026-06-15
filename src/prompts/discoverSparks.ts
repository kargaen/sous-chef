// Prompt + parser for Discover "Fresh Sparks" (epic D.5). A spark is a brief
// idea seed — a short title and a one-line hook — NOT a full recipe. The user
// taps a spark to seed the recipe creator, which does the heavy generation.

export interface SparkContext {
  monthLabel: string;
  region: string | null;
  inSeasonProduce: string[];
  pantryHighlights: string[];
  cuisinePreferences: string[];
  skillLevel: string | null;
  /** Titles already shown — the LLM should avoid repeating these on a refresh. */
  avoidTitles?: string[];
}

export interface GeneratedSpark {
  title: string;
  hook: string;
}

export const SPARKS_SYSTEM_PROMPT = `
You are Sous Chef, a warm and playful kitchen companion suggesting cooking ideas.
Produce a short list of recipe SPARKS — each a brief, enticing idea, NOT a full recipe.
Lean on what is in season and on the cook's tastes. Keep it inviting, never preachy.

Rules:
- Return ONLY a JSON array, no prose, no markdown fences.
- 3 to 4 items.
- Each item: { "title": string, "hook": string }.
- "title": 2-5 words, Title Case, appetising (e.g. "Charred Asparagus Tartine").
- "hook": ONE short sentence (max ~14 words) that makes the cook want it.
- Do not repeat any title listed under avoidTitles.
`.trim();

export const buildSparksUserMessage = (context: SparkContext): string =>
  JSON.stringify({
    month: context.monthLabel,
    region: context.region,
    inSeasonProduce: context.inSeasonProduce,
    pantryHighlights: context.pantryHighlights,
    cuisinePreferences: context.cuisinePreferences,
    skillLevel: context.skillLevel,
    avoidTitles: context.avoidTitles ?? [],
  });

const MAX_SPARKS = 4;

// Tolerant parse: strip any accidental markdown fence, grab the first JSON
// array, keep only well-formed { title, hook } entries, cap the count.
export const parseSparks = (content: string): GeneratedSpark[] => {
  const cleaned = content.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const sparks: GeneratedSpark[] = [];
  for (const entry of parsed) {
    if (typeof entry !== "object" || entry === null) continue;
    const record = entry as Record<string, unknown>;
    const title = typeof record.title === "string" ? record.title.trim() : "";
    const hook = typeof record.hook === "string" ? record.hook.trim() : "";
    if (title.length === 0 || hook.length === 0) continue;
    sparks.push({ title, hook });
    if (sparks.length >= MAX_SPARKS) break;
  }
  return sparks;
};
