// Prompt + tolerant parser for the AI plan-draft flow (P5).
// The cook writes a free-text request describing their week; the LLM returns
// a list of meal suggestions per day. Every result lands as a SuggestionSlot
// (transient, unresolved) — nothing is auto-persisted. The user reviews,
// accepts, or dismisses each suggestion before the plan writes.

import type { MealSlotType } from "../models/types";

export interface PlanDraftDay {
  label: string;
  date: string;
}

export interface PlanDraftContext {
  request: string;
  days: PlanDraftDay[];
  month: number;
  region: string | null;
  cuisinePreferences: string[];
  skillLevel: string | null;
}

export interface DraftedSlot {
  date: string;
  type: MealSlotType;
  title: string;
  note?: string;
}

const VALID_TYPES = new Set<MealSlotType>([
  "breakfast",
  "lunch",
  "dinner",
  "snack",
]);

export const PLAN_DRAFT_SYSTEM_PROMPT = `
You are Sous Chef, a warm kitchen companion helping plan a week of meals.

The cook will send you a JSON context describing their request and the days to fill.
Return ONLY a JSON array of meal suggestions — no prose, no markdown fences.

Each item in the array must have:
  "date":  the YYYY-MM-DD date string (exactly as given in the days list)
  "type":  one of "breakfast", "lunch", "dinner", or "snack"
  "title": a short, appetising meal name (2-6 words, Title Case)
  "note":  optional short note — scale, adaptation, or context (omit if none)

Rules:
- Follow the cook's request closely.
- Suggest at least one meal per day (dinner is the default type if unspecified).
- For explicit literals in the request ("leftovers", "eat out", "takeaway"), use them verbatim as the title.
- Avoid repeating the same protein or cuisine two days running.
- Respect any diet, allergy, or preference the cook mentions.
- Keep meals practical; vary by season and cook's region.
- Return ONLY the JSON array.
`.trim();

export const buildPlanDraftUserMessage = (ctx: PlanDraftContext): string =>
  JSON.stringify({
    request: ctx.request,
    days: ctx.days,
    month: ctx.month,
    region: ctx.region,
    cuisinePreferences: ctx.cuisinePreferences,
    skillLevel: ctx.skillLevel,
  });

// Tolerant parser: ignores any items that don't have the required shape.
export const parsePlanDraft = (content: string): DraftedSlot[] => {
  try {
    const raw: unknown = JSON.parse(content);
    if (!Array.isArray(raw)) return [];
    return raw.flatMap((item): DraftedSlot[] => {
      if (
        typeof item !== "object" ||
        item === null ||
        typeof (item as Record<string, unknown>).date !== "string" ||
        typeof (item as Record<string, unknown>).type !== "string" ||
        typeof (item as Record<string, unknown>).title !== "string"
      ) {
        return [];
      }
      const r = item as Record<string, unknown>;
      const type = r.type as string;
      if (!VALID_TYPES.has(type as MealSlotType)) return [];
      return [
        {
          date: r.date as string,
          type: type as MealSlotType,
          title: (r.title as string).trim(),
          note:
            typeof r.note === "string" && r.note.trim()
              ? r.note.trim()
              : undefined,
        },
      ];
    });
  } catch {
    return [];
  }
};
