import { ChefProfileRepository } from "../models/repositories/ChefProfileRepository";
import { CookLogRepository } from "../models/repositories/CookLogRepository";
import { DismissalRepository } from "../models/repositories/DismissalRepository";
import { InspirationRepository } from "../models/repositories/InspirationRepository";
import type { MintInspirationInput } from "../models/repositories/InspirationRepository";
import { PantryRepository } from "../models/repositories/PantryRepository";
import { RecipeRepository } from "../models/repositories/RecipeRepository";
import { SettingsRepository } from "../models/repositories/SettingsRepository";
import { monthToSeason } from "../models/data/discoverThemes";
import type { DiscoverTheme } from "../models/data/discoverThemes";
import type { Inspiration, SeasonalProduce } from "../models/types";
import {
  SPARKS_SYSTEM_PROMPT,
  buildSparksUserMessage,
  parseSparks,
  type GeneratedSpark,
  type SparkContext,
} from "../prompts/discoverSparks";
import {
  GENERATE_MORE_SYSTEM_PROMPT,
  buildGenerateMoreUserMessage,
  parseGeneratedCards,
  type GenerationContext,
  type GenerationMode,
} from "../prompts/generateMore";
import {
  GENERATE_THEMES_SYSTEM_PROMPT,
  buildGenerateThemesUserMessage,
  parseGeneratedThemes,
  type ThemeGenerationContext,
} from "../prompts/generateThemes";
import {
  LEFTOVER_SYSTEM_PROMPT,
  buildLeftoverUserMessage,
  parseLeftover,
  type LeftoverDish,
} from "../prompts/leftoverLoop";
import { getDailySeed } from "../utils/dailySeed";
import { LLMService } from "./LLMService";

const inspirationRepo = new InspirationRepository();
const chefProfileRepo = new ChefProfileRepository();
const pantryRepo = new PantryRepository();
const cookLogRepo = new CookLogRepository();
const recipeRepo = new RecipeRepository();
const settingsRepo = new SettingsRepository();
const dismissalRepo = new DismissalRepository();

const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_SPARKS = 3;
// Cap how many sparks the lane shows so generated cards folding back in (they
// share kind "spark") can't make the lane grow without bound (epic R.1).
const SPARK_LANE_LIMIT = 8;

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const slug = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "x";

const seedPromptFor = (title: string, hook: string): string =>
  `${title} — ${hook}`;

const normalizeTitle = (title: string): string => title.trim().toLowerCase();

const uniqueByTitle = (
  sparks: GeneratedSpark[],
  avoidTitles: string[] = [],
): GeneratedSpark[] => {
  const seen = new Set(avoidTitles.map(normalizeTitle));
  return sparks.filter((spark) => {
    const key = normalizeTitle(spark.title);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const sparkToMintInput = (
  spark: GeneratedSpark,
  seed: number,
  source: string,
): MintInspirationInput => ({
  kind: "spark",
  title: spark.title,
  hook: spark.hook,
  payload: { seedPrompt: seedPromptFor(spark.title, spark.hook) },
  source,
  dedupeKey: `spark:${seed}:${slug(spark.title)}`,
  relevance: 0.55,
});

const STATIC_FALLBACK_SPARKS: GeneratedSpark[] = [
  {
    title: "Clear-the-Fridge Stir-Fry",
    hook: "Whatever's lurking in the fridge, transformed in one hot pan.",
  },
  {
    title: "Cook Something New",
    hook: "Pick a cuisine you've never tried and start there.",
  },
  {
    title: "Summer Berry Crumble",
    hook: "A warm, comforting hug of sweet berries and buttery crisp topping.",
  },
  {
    title: "Pantry Pasta Night",
    hook: "Turn a box of pasta and a few cupboard finds into dinner.",
  },
  {
    title: "Breakfast-for-Dinner Eggs",
    hook: "Use eggs, toast, and odds and ends for a low-effort plate.",
  },
  {
    title: "Big Salad with Something Crispy",
    hook: "Build a crunchy, filling salad around whatever needs using first.",
  },
];

// Deterministic, no-LLM sparks so the lane is never empty (offline / LLM down).
const fallbackSparks = (
  produce: SeasonalProduce[],
  avoidTitles: string[] = [],
): GeneratedSpark[] => {
  const produceSparks = produce.slice(0, 3).map((item) => ({
    title: `Something with ${item.name}`,
    hook: `Make the most of in-season ${item.name.toLowerCase()} tonight.`,
  }));
  return uniqueByTitle([...produceSparks, ...STATIC_FALLBACK_SPARKS], avoidTitles);
};

const buildSparkContext = async (
  produce: SeasonalProduce[],
  avoidTitles: string[],
): Promise<SparkContext> => {
  const now = new Date();
  const [profile, expiring] = await Promise.all([
    chefProfileRepo.get(),
    pantryRepo.getExpiringSoon(7),
  ]);

  return {
    monthLabel: MONTH_NAMES[now.getMonth()],
    region: profile?.region ?? null,
    inSeasonProduce: produce.slice(0, 8).map((item) => item.name),
    pantryHighlights: expiring.slice(0, 6).map((item) => item.name),
    cuisinePreferences: profile?.preferences.cuisinePreferences ?? [],
    skillLevel: profile?.skillLevel ?? null,
    avoidTitles,
  };
};

const generateSparks = async (
  produce: SeasonalProduce[],
  avoidTitles: string[],
): Promise<GeneratedSpark[]> => {
  try {
    const context = await buildSparkContext(produce, avoidTitles);
    const response = await LLMService.send({
      system: SPARKS_SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildSparksUserMessage(context) }],
    }, "background");
    const sparks = parseSparks(response.content);
    return sparks.length > 0
      ? uniqueByTitle(sparks, avoidTitles)
      : fallbackSparks(produce, avoidTitles);
  } catch {
    return fallbackSparks(produce, avoidTitles);
  }
};

const cookedAgoLabel = (cookedAt: string): string => {
  const days = Math.floor((Date.now() - new Date(cookedAt).getTime()) / DAY_MS);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
};

const buildLeftoverDishes = async (
  recentCooks: { recipeId: string; cookedAt: string }[],
): Promise<LeftoverDish[]> => {
  const seen = new Set<string>();
  const dishes: LeftoverDish[] = [];

  for (const cook of recentCooks) {
    if (seen.has(cook.recipeId)) continue;
    seen.add(cook.recipeId);

    const recipe = await recipeRepo.fetchById(cook.recipeId);
    if (!recipe) continue;

    dishes.push({
      title: recipe.title,
      keyIngredients: recipe.ingredients.slice(0, 4).map((i) => i.name),
      cookedAgo: cookedAgoLabel(cook.cookedAt),
    });

    if (dishes.length >= 3) break;
  }

  return dishes;
};

// --- Generation zone (C.1 context bundle + G.1 generate-more) ---------------

const mealHintForHour = (hour: number): string => {
  if (hour < 11) return "breakfast";
  if (hour < 15) return "lunch";
  if (hour < 21) return "dinner";
  return "a late bite";
};

// Deterministic temporal nudges from the clock — day of week and day of month.
const buildTemporalNotes = (now: Date): string[] => {
  const notes: string[] = [];
  const day = now.getDay();

  if (day === 4) {
    notes.push(
      "It's Thursday — a nice Friday or Saturday dinner could be worth lining up.",
    );
  } else if (day === 5 || day === 6) {
    notes.push(
      "It's the weekend — there's room to cook something a little special.",
    );
  } else if (day === 0) {
    notes.push("Sunday — a good moment to think about the week ahead.");
  }

  if (now.getDate() >= 24) {
    notes.push(
      "It's late in the month — budget-friendly, pantry-clearing ideas are welcome.",
    );
  }

  return notes;
};

const buildRecentlyCooked = async (): Promise<string[]> => {
  const recent = cookLogRepo.getRecentCooks(4);
  const titles: string[] = [];
  const seen = new Set<string>();

  for (const cook of recent) {
    if (seen.has(cook.recipeId)) continue;
    seen.add(cook.recipeId);
    const recipe = await recipeRepo.fetchById(cook.recipeId);
    if (recipe) titles.push(recipe.title);
    if (titles.length >= 3) break;
  }

  return titles;
};

// Light "not for me" memory (epic R.2). Only consulted when the cook has left
// `learnFromChats` on; capped small so it can only ever be a gentle nudge away
// from recently-dismissed ideas, never a hard filter that empties the feed.
const DISMISSED_AVOID_LIMIT = 12;

const dismissedAvoidTitles = async (): Promise<string[]> => {
  try {
    const settings = await settingsRepo.get();
    if (!settings.learnFromChats) return [];
    return await dismissalRepo.getRecentTitles(DISMISSED_AVOID_LIMIT);
  } catch {
    return [];
  }
};

// The nudge setting decides how hard generated ideas lean toward savings.
const savingsBiasFromSettings = async (): Promise<boolean> => {
  try {
    const settings = await settingsRepo.get();
    return (
      settings.sustainabilityNudges === "default" ||
      settings.sustainabilityNudges === "prominent"
    );
  } catch {
    return false;
  }
};

const buildGenerationContext = async (
  mode: GenerationMode,
  intent: string,
  produce: SeasonalProduce[],
  avoidTitles: string[],
): Promise<GenerationContext> => {
  const now = new Date();
  const [profile, expiring, recentlyCooked, savingsBias] = await Promise.all([
    chefProfileRepo.get(),
    pantryRepo.getExpiringSoon(7),
    buildRecentlyCooked(),
    savingsBiasFromSettings(),
  ]);

  return {
    mode,
    intent,
    mealHint: mealHintForHour(now.getHours()),
    temporalNotes: buildTemporalNotes(now),
    monthLabel: MONTH_NAMES[now.getMonth()],
    inSeasonProduce: produce.slice(0, 8).map((item) => item.name),
    pantryHighlights: expiring.slice(0, 6).map((item) => item.name),
    recentlyCooked,
    cuisinePreferences: profile?.preferences.cuisinePreferences ?? [],
    skillLevel: profile?.skillLevel ?? null,
    savingsBias,
    avoidTitles,
  };
};

// LLM-generated themes (D.6) are cached in the inspiration store (kind "theme",
// 31-day TTL) so the gap-fill call happens at most once per cache window. The
// emoji rides along in the free-form payload context — no schema change.
const inspirationToTheme = (item: Inspiration): DiscoverTheme => ({
  id: item.id,
  emoji:
    typeof item.payload.context?.emoji === "string"
      ? (item.payload.context.emoji as string)
      : "✨",
  title: item.title,
  hook: item.hook,
  seasons: [],
  matchTags: [],
  seedPrompt: item.payload.seedPrompt ?? item.title,
});

const fallbackGeneratedCards = (
  mode: GenerationMode,
  intent: string,
  produce: SeasonalProduce[],
): GeneratedSpark[] => {
  if (mode === "freeText" && intent.trim().length > 0) {
    return [
      {
        title: "Your Idea, Tonight",
        hook: `Let's build something around "${intent.trim()}".`,
      },
      ...fallbackSparks(produce).slice(0, 2),
    ];
  }
  return fallbackSparks(produce).slice(0, 3);
};

export const InspirationService = {
  // Read-only selector (D.0b): the top live inspiration of any kind, or null.
  // Other surfaces (e.g. a thin landing page) can pull from the store without
  // triggering generation. Never mints — the dependency stays one-way.
  getInspirationOfTheDay: (): Inspiration | null => {
    const items = inspirationRepo.getActive({ limit: 1 });
    return items[0] ?? null;
  },

  // Get-or-mint sparks. Returns live sparks if the store already has enough;
  // otherwise generates (LLM, with deterministic fallback) and persists them.
  getSparks: async (produce: SeasonalProduce[] = []): Promise<Inspiration[]> => {
    const existing = inspirationRepo.getActive({
      kind: "spark",
      limit: SPARK_LANE_LIMIT,
    });
    if (existing.length >= MIN_SPARKS) return existing;

    const seed = getDailySeed();
    const generated = await generateSparks(produce, [
      ...existing.map((item) => item.title),
      ...(await dismissedAvoidTitles()),
    ]);
    generated.forEach((spark) =>
      inspirationRepo.mint(sparkToMintInput(spark, seed, "discover:sparks")),
    );

    return inspirationRepo.getActive({ kind: "spark", limit: SPARK_LANE_LIMIT });
  },

  // Explicit "show me more" — always spends a call and adds fresh sparks,
  // avoiding the titles already on screen.
  refreshSparks: async (
    produce: SeasonalProduce[] = [],
  ): Promise<Inspiration[]> => {
    const seed = getDailySeed();
    const existing = inspirationRepo.getActive({ kind: "spark" });
    const generated = await generateSparks(produce, [
      ...existing.map((item) => item.title),
      ...(await dismissedAvoidTitles()),
    ]);
    generated.forEach((spark) =>
      inspirationRepo.mint(sparkToMintInput(spark, seed, "discover:sparks:more")),
    );

    return inspirationRepo.getActive({ kind: "spark", limit: SPARK_LANE_LIMIT });
  },

  // Leftover loop (D.0c): turn a recent cook into a use-it-up suggestion.
  // Returns null when there's nothing recent to build on.
  getLeftover: async (): Promise<Inspiration | null> => {
    const existing = inspirationRepo.getActive({ kind: "leftover", limit: 1 });
    if (existing.length > 0) return existing[0];

    const recentCooks = cookLogRepo.getRecentCooks(2);
    if (recentCooks.length === 0) return null;

    const dishes = await buildLeftoverDishes(recentCooks);
    if (dishes.length === 0) return null;

    const seed = getDailySeed();
    const primary = dishes[0];

    let title = `Use Up the ${primary.title}`;
    let hook = `You made ${primary.title.toLowerCase()} ${primary.cookedAgo} — any left? Let's repurpose it.`;

    try {
      const expiring = await pantryRepo.getExpiringSoon(7);
      const response = await LLMService.send({
        system: LEFTOVER_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: buildLeftoverUserMessage({
              recentDishes: dishes,
              pantryHighlights: expiring.slice(0, 6).map((item) => item.name),
            }),
          },
        ],
      }, "background");
      const parsed = parseLeftover(response.content);
      if (parsed) {
        title = parsed.title;
        hook = parsed.hook;
      }
    } catch {
      // Keep the templated fallback above.
    }

    return inspirationRepo.mint({
      kind: "leftover",
      title,
      hook,
      payload: { seedPrompt: seedPromptFor(title, hook) },
      source: "discover:leftover-loop",
      dedupeKey: `leftover:${seed}:${slug(primary.title)}`,
      relevance: 0.7,
    });
  },

  // Light learning (epic R.2): remember a dismissed idea so future generation
  // can steer away from it. Gated on `learnFromChats` — when the cook has
  // learning off, we record nothing. Fire-and-forget from the controller.
  recordDismissal: async (title: string): Promise<void> => {
    try {
      const settings = await settingsRepo.get();
      if (!settings.learnFromChats) return;
      await dismissalRepo.record(title);
    } catch {
      // Learning is best-effort — never let it interrupt a dismissal.
    }
  },

  // LLM-generated themes (D.6): a gap-filler tier beyond the hardcoded seasonal
  // set. Get-or-mint against the inspiration store, so the call is spent at most
  // once per cache window. Returns only the generated themes; the caller merges
  // them with the always-present base set. Failure-silent — returns [] on error.
  getGeneratedThemes: async (
    produce: SeasonalProduce[] = [],
    avoidTitles: string[] = [],
  ): Promise<DiscoverTheme[]> => {
    const cached = inspirationRepo.getActive({ kind: "theme" });
    if (cached.length > 0) return cached.map(inspirationToTheme);

    let generated: ReturnType<typeof parseGeneratedThemes> = [];
    try {
      const now = new Date();
      const profile = await chefProfileRepo.get();
      const context: ThemeGenerationContext = {
        monthLabel: MONTH_NAMES[now.getMonth()],
        season: monthToSeason(now.getMonth() + 1),
        inSeasonProduce: produce.slice(0, 8).map((item) => item.name),
        cuisinePreferences: profile?.preferences.cuisinePreferences ?? [],
        avoidTitles,
      };
      const response = await LLMService.send({
        system: GENERATE_THEMES_SYSTEM_PROMPT,
        messages: [
          { role: "user", content: buildGenerateThemesUserMessage(context) },
        ],
      }, "background");
      generated = parseGeneratedThemes(response.content);
    } catch {
      return [];
    }

    if (generated.length === 0) return [];

    generated.forEach((theme) =>
      inspirationRepo.mint({
        kind: "theme",
        title: theme.title,
        hook: theme.hook,
        payload: { seedPrompt: theme.seedPrompt, context: { emoji: theme.emoji } },
        source: "discover:themes:llm",
        dedupeKey: `theme:${slug(theme.title)}`,
      }),
    );

    return inspirationRepo.getActive({ kind: "theme" }).map(inspirationToTheme);
  },

  // Generation zone (G.1): the cook explicitly asks for more — by theme, at
  // random, or via free text. Builds the context bundle, generates 3 fresh
  // sparks (LLM with deterministic fallback), mints them, and returns them.
  // Dedupe is by idea, so repeating the same request reuses rather than spams.
  generateMore: async ({
    mode,
    intent,
    produce = [],
  }: {
    mode: GenerationMode;
    intent: string;
    produce?: SeasonalProduce[];
  }): Promise<Inspiration[]> => {
    const avoidTitles = [
      ...inspirationRepo.getActive({ kind: "spark" }).map((item) => item.title),
      ...(await dismissedAvoidTitles()),
    ];

    let cards: GeneratedSpark[];
    try {
      const context = await buildGenerationContext(
        mode,
        intent,
        produce,
        avoidTitles,
      );
      const response = await LLMService.send({
        system: GENERATE_MORE_SYSTEM_PROMPT,
        messages: [
          { role: "user", content: buildGenerateMoreUserMessage(context) },
        ],
      });
      const parsed = parseGeneratedCards(response.content);
      cards =
        parsed.length > 0
          ? parsed
          : fallbackGeneratedCards(mode, intent, produce);
    } catch {
      cards = fallbackGeneratedCards(mode, intent, produce);
    }

    return cards.slice(0, 3).map((card) =>
      inspirationRepo.mint({
        kind: "spark",
        title: card.title,
        hook: card.hook,
        payload: { seedPrompt: seedPromptFor(card.title, card.hook) },
        source: `discover:generate:${mode}`,
        dedupeKey: `gen:${slug(card.title)}`,
        relevance: 0.5,
      }),
    );
  },
};
