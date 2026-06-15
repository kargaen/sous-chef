// Prompt + parser for the Home "generation zone" (epic G.1 / C.1). The cook asks
// for more ideas three ways — pick a theme, surprise me, or type a request — and
// we return a few fresh SPARKS (brief idea seeds), tuned to a deterministic
// context bundle: season, pantry, recent cooks, time of day/week/month, and the
// sustainability-nudge setting. Reuses the spark shape and tolerant parser.

import { parseSparks, type GeneratedSpark } from "./discoverSparks";

export type GenerationMode = "theme" | "random" | "freeText";

export interface GenerationContext {
  mode: GenerationMode;
  /** Theme title or the cook's free text; empty for "random". */
  intent: string;
  /** Meal framing from the clock, e.g. "dinner". */
  mealHint: string;
  /** Short temporal nudges (day of week / month). */
  temporalNotes: string[];
  monthLabel: string;
  inSeasonProduce: string[];
  pantryHighlights: string[];
  recentlyCooked: string[];
  cuisinePreferences: string[];
  skillLevel: string | null;
  /** Lean ideas toward savings / leftovers / waste reduction. */
  savingsBias: boolean;
  /** Titles already on screen — avoid repeating. */
  avoidTitles: string[];
}

export const GENERATE_MORE_SYSTEM_PROMPT = `
You are Sous Chef, a warm and playful kitchen companion suggesting cooking ideas.
Return a short list of recipe SPARKS — each a brief, enticing idea, NOT a full recipe.

Honor the cook's request:
- mode "theme": every idea should fit the given theme (the "intent").
- mode "freeText": follow the cook's written request (the "intent") closely.
- mode "random": surprise them with playful variety.

Weave in the context: prefer what is in season, use up the pantry highlights, fit
the meal time and the cook's tastes, and don't re-suggest something just cooked.
If savingsBias is true, lean toward budget-friendly, pantry-clearing,
leftover-using ideas. Never be preachy.

Rules:
- Return ONLY a JSON array, no prose, no markdown fences.
- Exactly 3 items.
- Each item: { "title": string, "hook": string }.
- "title": 2-5 words, Title Case, appetising.
- "hook": ONE short sentence (max ~14 words) that makes the cook want it.
- Do not repeat any title under avoidTitles.
`.trim();

export const buildGenerateMoreUserMessage = (ctx: GenerationContext): string =>
  JSON.stringify({
    mode: ctx.mode,
    intent: ctx.intent,
    mealTime: ctx.mealHint,
    temporalNotes: ctx.temporalNotes,
    month: ctx.monthLabel,
    inSeasonProduce: ctx.inSeasonProduce,
    pantryHighlights: ctx.pantryHighlights,
    recentlyCooked: ctx.recentlyCooked,
    cuisinePreferences: ctx.cuisinePreferences,
    skillLevel: ctx.skillLevel,
    savingsBias: ctx.savingsBias,
    avoidTitles: ctx.avoidTitles,
  });

// Generated cards share the spark shape, so reuse the tolerant spark parser.
export const parseGeneratedCards = (content: string): GeneratedSpark[] =>
  parseSparks(content);
