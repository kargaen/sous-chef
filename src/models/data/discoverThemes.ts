import type { Season } from "../types";
import { seededIndex } from "@/utils";

// Hardcoded, deterministic theme set for the Discover "Themes" lane (epic D.6).
// These are always available and fit the time of year. LLM-generated themes are
// a separate gap-filler tier (handled in InspirationService), never part of
// this base set.

export interface DiscoverTheme {
  id: string;
  emoji: string;
  title: string;
  hook: string;
  /** Seasons this theme fits. Empty = evergreen (year-round). */
  seasons: Season[];
  /** Recipe tags that count as a match (compared lowercased). */
  matchTags: string[];
  /** Optional cap on total time (prep + cook) for a recipe to match. */
  maxTotalMinutes?: number;
  /** Seed prompt handed to the recipe creator when the theme is tapped. */
  seedPrompt: string;
}

export const DISCOVER_THEMES: DiscoverTheme[] = [
  {
    id: "weeknight-20",
    emoji: "⏱️",
    title: "Weeknight 20-Minute",
    hook: "Dinner on the table before the kettle's cold.",
    seasons: [],
    matchTags: ["quick", "weeknight", "fast", "easy"],
    maxTotalMinutes: 25,
    seedPrompt: "A fast 20-minute weeknight dinner",
  },
  {
    id: "pantry-raid",
    emoji: "🥫",
    title: "Pantry-Raid Dinner",
    hook: "A proper meal from what's already on the shelf.",
    seasons: [],
    matchTags: ["pantry", "easy", "store-cupboard"],
    seedPrompt: "A dinner built from common pantry staples",
  },
  {
    id: "big-batch",
    emoji: "🍲",
    title: "Big-Batch Meal Prep",
    hook: "Cook once, eat well all week.",
    seasons: [],
    matchTags: ["batch", "meal prep", "freezer"],
    seedPrompt: "A big-batch recipe that's great for meal prep",
  },
  {
    id: "bright-salads",
    emoji: "🥗",
    title: "Bright & Fresh",
    hook: "Crisp, light, and made for warm days.",
    seasons: ["spring", "summer"],
    matchTags: ["salad", "fresh", "light", "raw"],
    seedPrompt: "A bright, fresh salad for warm weather",
  },
  {
    id: "grill-char",
    emoji: "🔥",
    title: "Grill & Char",
    hook: "Smoke, flame, and a little bit of char.",
    seasons: ["summer"],
    matchTags: ["grill", "bbq", "barbecue", "charred"],
    seedPrompt: "Something cooked on the grill",
  },
  {
    id: "spring-greens",
    emoji: "🌱",
    title: "Spring Greens",
    hook: "The first tender greens, front and centre.",
    seasons: ["spring"],
    matchTags: ["greens", "vegetable", "asparagus", "peas"],
    seedPrompt: "A dish that celebrates spring greens",
  },
  {
    id: "one-pot-comfort",
    emoji: "🥘",
    title: "One-Pot Comfort",
    hook: "Everything in one pot, all the warmth.",
    seasons: ["autumn", "winter"],
    matchTags: ["one-pot", "stew", "braise", "comfort"],
    seedPrompt: "A cozy one-pot comfort dish",
  },
  {
    id: "root-veg",
    emoji: "🥕",
    title: "Use Up the Root Veg",
    hook: "Carrots, spuds, and the humble parsnip shine.",
    seasons: ["autumn", "winter"],
    matchTags: ["root", "vegetable", "roast"],
    seedPrompt: "A dish that uses up root vegetables",
  },
  {
    id: "soup-season",
    emoji: "🍜",
    title: "Soup Season",
    hook: "A bowl of something warming.",
    seasons: ["autumn", "winter"],
    matchTags: ["soup", "broth"],
    seedPrompt: "A warming soup",
  },
  {
    id: "cozy-bakes",
    emoji: "🧁",
    title: "Cozy Bakes",
    hook: "Turn the oven on and warm the kitchen.",
    seasons: ["autumn", "winter"],
    matchTags: ["bake", "baking", "dessert", "bread"],
    seedPrompt: "A cozy baked treat",
  },
];

// Northern-hemisphere month → season. Region-specific produce is already
// handled by the seasonal API; this is only for choosing theme framing.
export const monthToSeason = (month: number): Season => {
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 9 && month <= 11) return "autumn";
  return "winter";
};

// Pick a day-stable subset of themes: in-season themes first, then evergreen,
// rotated by the daily seed so the set varies each day without churning within
// a session.
export const getSeasonalThemes = (
  month: number,
  seed: number,
  count = 4,
): DiscoverTheme[] => {
  const season = monthToSeason(month);
  const seasonal = DISCOVER_THEMES.filter((theme) =>
    theme.seasons.includes(season),
  );
  const evergreen = DISCOVER_THEMES.filter((theme) => theme.seasons.length === 0);
  const ordered = [...seasonal, ...evergreen];

  if (ordered.length <= count) return ordered;

  const start = Math.max(0, seededIndex(ordered.length, seed));
  const rotated = [...ordered.slice(start), ...ordered.slice(0, start)];
  return rotated.slice(0, count);
};
