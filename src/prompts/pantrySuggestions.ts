// Prompt + tolerant parser for the pantry → recipe suggestion flow (P5).
// The LLM receives a ranked list of pantry items and returns 3-4 cheap
// recipe titles + one-liners. No full recipe is generated here — the user
// picks one and triggers generation separately.

export interface PantrySuggestionItem {
  name: string;
  zone: string;
  daysUntilExpiry: number | null;
}

export interface PantrySuggestionContext {
  items: PantrySuggestionItem[];
  cuisinePreferences: string[];
  skillLevel: string | null;
  month: number;
}

export interface PantrySuggestion {
  title: string;
  description: string;    // one sentence, e.g. "A hearty weeknight pasta…"
  primaryItemName: string; // which pantry item this suggestion is built around
}

export const PANTRY_SUGGESTION_SYSTEM_PROMPT = `You are a practical home-cooking assistant.
Your job is to suggest recipes that use ingredients the cook already has,
prioritising items that are expiring soon.
Be concise, practical, and realistic about home cooking effort.
Always respond with valid JSON only — no markdown, no commentary.`;

export const buildPantrySuggestionsPrompt = (
  ctx: PantrySuggestionContext,
): string => {
  const itemLines = ctx.items
    .slice(0, 12)
    .map((i) => {
      const expiry =
        i.daysUntilExpiry !== null
          ? i.daysUntilExpiry <= 0
            ? " (expired)"
            : ` (expires in ${i.daysUntilExpiry}d)`
          : "";
      return `- ${i.name} [${i.zone}]${expiry}`;
    })
    .join("\n");

  return JSON.stringify({
    task: "Suggest 3 to 4 recipes that use the pantry items below. Prioritise items expiring soonest.",
    pantryItems: itemLines,
    month: ctx.month,
    cuisinePreferences: ctx.cuisinePreferences,
    skillLevel: ctx.skillLevel ?? "home cook",
    responseFormat: {
      suggestions: [
        {
          title: "Recipe name",
          description: "One sentence describing the dish and why it fits",
          primaryItemName: "Exact pantry item name this is built around",
        },
      ],
    },
  });
};

export const buildPantrySwapPrompt = (
  itemName: string,
  exclude: string[],
  ctx: Pick<PantrySuggestionContext, "cuisinePreferences" | "skillLevel" | "month">,
): string =>
  JSON.stringify({
    task: `Suggest one recipe built around "${itemName}" that is different from the excluded titles.`,
    exclude,
    month: ctx.month,
    cuisinePreferences: ctx.cuisinePreferences,
    skillLevel: ctx.skillLevel ?? "home cook",
    responseFormat: {
      title: "Recipe name",
      description: "One sentence",
      primaryItemName: itemName,
    },
  });

// Tolerant parser — extracts the suggestions array from anywhere in the
// LLM response even when wrapped in markdown fences or extra prose.
export const parsePantrySuggestions = (content: string): PantrySuggestion[] => {
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start === -1 || end <= start) return [];

  try {
    const obj = JSON.parse(content.slice(start, end + 1)) as Record<string, unknown>;

    // Multi-suggestion response
    if (Array.isArray(obj.suggestions)) {
      return (obj.suggestions as unknown[]).flatMap((s) => {
        if (
          typeof s === "object" &&
          s !== null &&
          typeof (s as Record<string, unknown>).title === "string" &&
          typeof (s as Record<string, unknown>).description === "string"
        ) {
          const item = s as Record<string, unknown>;
          return [
            {
              title: String(item.title),
              description: String(item.description),
              primaryItemName: String(item.primaryItemName ?? ""),
            },
          ];
        }
        return [];
      });
    }

    // Single-suggestion swap response
    if (typeof obj.title === "string" && typeof obj.description === "string") {
      return [
        {
          title: String(obj.title),
          description: String(obj.description),
          primaryItemName: String(obj.primaryItemName ?? ""),
        },
      ];
    }
  } catch {
    // fall through
  }

  return [];
};
