// Prompt + parser for LLM-generated Discover themes (epic D.6). The hardcoded
// seasonal set in `discoverThemes` is always present; this is a gap-filler tier
// that tops it up with a few fresh, season-aware themes. A theme is a framing
// for ideas — an emoji, a short title, a hook, and a seed prompt for the creator.

export interface ThemeGenerationContext {
  monthLabel: string;
  season: string;
  inSeasonProduce: string[];
  cuisinePreferences: string[];
  /** Titles already in the base set — don't duplicate these. */
  avoidTitles: string[];
}

export interface GeneratedTheme {
  emoji: string;
  title: string;
  hook: string;
  seedPrompt: string;
}

export const GENERATE_THEMES_SYSTEM_PROMPT = `
You are Sous Chef, a warm kitchen companion proposing cooking THEMES — framings a
cook can browse by, NOT full recipes. Complement the existing themes with fresh
angles that fit the season and the cook's tastes. Keep them inviting, never preachy.

Rules:
- Return ONLY a JSON array, no prose, no markdown fences.
- Exactly 3 items.
- Each item: { "emoji": string, "title": string, "hook": string, "seedPrompt": string }.
- "emoji": a single relevant emoji.
- "title": 2-4 words, Title Case (e.g. "Late-Summer Grazing").
- "hook": ONE short sentence (max ~12 words) that sets the mood.
- "seedPrompt": a short instruction handed to a recipe creator for this theme.
- Do not repeat any title listed under avoidTitles.
`.trim();

export const buildGenerateThemesUserMessage = (
  ctx: ThemeGenerationContext,
): string =>
  JSON.stringify({
    month: ctx.monthLabel,
    season: ctx.season,
    inSeasonProduce: ctx.inSeasonProduce,
    cuisinePreferences: ctx.cuisinePreferences,
    avoidTitles: ctx.avoidTitles,
  });

const MAX_THEMES = 3;

// Tolerant parse: strip any markdown fence, grab the first JSON array, keep only
// well-formed entries, cap the count.
export const parseGeneratedThemes = (content: string): GeneratedTheme[] => {
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

  const themes: GeneratedTheme[] = [];
  for (const entry of parsed) {
    if (typeof entry !== "object" || entry === null) continue;
    const record = entry as Record<string, unknown>;
    const title = typeof record.title === "string" ? record.title.trim() : "";
    const hook = typeof record.hook === "string" ? record.hook.trim() : "";
    const seedPrompt =
      typeof record.seedPrompt === "string" ? record.seedPrompt.trim() : "";
    const emoji =
      typeof record.emoji === "string" && record.emoji.trim().length > 0
        ? record.emoji.trim()
        : "✨";
    if (title.length === 0 || hook.length === 0 || seedPrompt.length === 0) {
      continue;
    }
    themes.push({ emoji, title, hook, seedPrompt });
    if (themes.length >= MAX_THEMES) break;
  }
  return themes;
};
