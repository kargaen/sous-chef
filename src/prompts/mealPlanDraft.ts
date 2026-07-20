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
  availableDays?: PlanDraftDay[];
  filledSlots?: Array<{
    date: string;
    type: MealSlotType;
    text: string;
  }>;
  days?: PlanDraftDay[];
  month: number;
  region: string | null;
  cuisinePreferences: string[];
  skillLevel: string | null;
  pantryHighlights?: string[];
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

The cook will send you a JSON context describing their request, available days to fill,
and existing filled slots that must not receive suggestions.
Return ONLY a JSON array of meal suggestions — no prose, no markdown fences.

Each item in the array must have:
  "date":  the YYYY-MM-DD date string (exactly as given in the availableDays list)
  "type":  one of "breakfast", "lunch", "dinner", or "snack"
  "title": a short, appetising meal name (2-6 words, Title Case)
  "note":  optional short note — scale, adaptation, or context (omit if none)

Rules:
- Follow the cook's request closely.
- Never suggest a meal for a date listed in filledSlots.
- Suggest at least one meal per day (dinner is the default type if unspecified).
- For explicit literals in the request ("leftovers", "eat out", "takeaway"), use them verbatim as the title.
- Avoid repeating the same protein or cuisine two days running.
- Respect any diet, allergy, or preference the cook mentions.
- Keep meals practical; vary by season and cook's region.
- If pantryHighlights are provided, prioritise using those ingredients in the week's meals.
- Return ONLY the JSON array.
`.trim();

const WEEKDAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

const selectRequestedDays = (ctx: PlanDraftContext): PlanDraftDay[] => {
  const availableDays = ctx.availableDays ?? ctx.days ?? [];
  const request = ctx.request.toLowerCase();
  const requestedWeekday = WEEKDAYS.find((weekday) =>
    new RegExp(`\\b${weekday}\\b`, "i").test(request),
  );
  if (!requestedWeekday) return availableDays;

  const firstMatch = [...availableDays]
    .filter((day) => day.label.toLowerCase() === requestedWeekday)
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  return firstMatch ? [firstMatch] : [];
};

export const buildPlanDraftUserMessage = (ctx: PlanDraftContext): string =>
  JSON.stringify({
    request: ctx.request,
    availableDays: selectRequestedDays(ctx),
    filledSlots: ctx.filledSlots ?? [],
    month: ctx.month,
    region: ctx.region,
    cuisinePreferences: ctx.cuisinePreferences,
    skillLevel: ctx.skillLevel,
    ...(ctx.pantryHighlights?.length
      ? { pantryHighlights: ctx.pantryHighlights }
      : {}),
  });

// Tolerant parser: ignores any items that don't have the required shape.
export const parsePlanDraft = (
  content: string,
  eligibleDates?: string[],
): DraftedSlot[] => {
  try {
    const raw: unknown = JSON.parse(content);
    if (!Array.isArray(raw)) return [];
    const eligible = eligibleDates ? new Set(eligibleDates) : null;
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
      if (eligible && !eligible.has(r.date as string)) return [];
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
