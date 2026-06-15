// Prompt + parser for Home card enrichment (epic LP.0c). A single batched,
// failure-silent garnish call over the cards ALREADY ranked and visible on the
// home screen. It adds one short Sous Chef "hint" per card — never decides order
// or visibility, never blocks the page. If it fails, cards simply show no hint.

export interface HomeEnrichmentCard {
  id: string;
  /** Human label for the card, e.g. "Use it up". */
  label: string;
  /** What the card currently shows, e.g. "Expiring soon: spinach, yoghurt". */
  detail: string;
}

export const HOME_ENRICHMENT_SYSTEM_PROMPT = `
You are Sous Chef, a warm kitchen companion. You are given the cards currently on
the cook's home screen. Add ONE short, friendly garnish per card — a quick tip,
thought, or encouragement tied to that card's content. Add a little warmth or
value; never just restate the card, never be preachy.

Rules:
- Return ONLY a JSON object mapping each card "id" to a hint string. No prose, no fences.
- Only include ids you were given; omit a card if you have nothing worth adding.
- Each hint: ONE sentence, max ~16 words, warm and useful.
`.trim();

export const buildHomeEnrichmentUserMessage = (
  cards: HomeEnrichmentCard[],
): string => JSON.stringify({ cards });

// Tolerant parse: strip any fence, grab the first JSON object, keep only string
// hints for ids we actually asked about.
export const parseHomeEnrichment = (
  content: string,
  ids: string[],
): Record<string, string> => {
  const cleaned = content.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return {};

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return {};
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return {};
  }

  const record = parsed as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const id of ids) {
    const value = record[id];
    if (typeof value === "string" && value.trim().length > 0) {
      out[id] = value.trim();
    }
  }
  return out;
};
