import { useCallback, useMemo, useRef, useState } from "react";

import { getSeasonalThemes } from "../models/data/discoverThemes";
import type { DiscoverTheme } from "../models/data/discoverThemes";
import { InspirationRepository } from "../models/repositories/InspirationRepository";
import { RecipeRepository } from "../models/repositories/RecipeRepository";
import { SeasonalRepository } from "../models/repositories/SeasonalRepository";
import type {
  Inspiration,
  NudgeCard,
  Recipe,
  SeasonalProduce,
} from "../models/types";
import type { GenerationMode } from "../prompts/generateMore";
import { InspirationService } from "../services/InspirationService";
import { NudgeService } from "../services/NudgeService";
import { SeasonalService } from "../services/SeasonalService";
import { useChefProfileStore } from "../store/chefProfileStore";
import { useConversationStore } from "../store/conversationStore";
import { getDailySeed } from "../utils/dailySeed";

const seasonalRepo = new SeasonalRepository();
const recipeRepo = new RecipeRepository();
const inspirationRepo = new InspirationRepository();

// Cap the session's generated cards so repeated "generate more" can't grow the
// feed without bound; oldest fall off the top (epic R.1).
const GENERATED_CARDS_LIMIT = 9;

export type DiscoverNudgeTone = "default" | "seasonal" | "waste" | "budget";

export interface DiscoverNudgeViewModel {
  id: string;
  title: string;
  body: string;
  tone?: DiscoverNudgeTone;
  actionLabel?: string;
}

// View models for the Discover-only lanes (sparks, themes, leftover).
export interface DiscoverSparkViewModel {
  id: string;
  title: string;
  hook: string;
  seedPrompt: string;
}

export interface DiscoverLeftoverViewModel {
  id: string;
  title: string;
  hook: string;
  seedPrompt: string;
}

export interface DiscoverThemeViewModel {
  id: string;
  emoji: string;
  title: string;
  hook: string;
  matchCount: number;
  seedPrompt: string;
}

type NudgeRecord = Record<string, unknown>;

const readString = (
  record: NudgeRecord,
  keys: string[],
  fallback: string,
): string => {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }

  return fallback;
};

const readTone = (record: NudgeRecord): DiscoverNudgeTone => {
  const value = record.tone;

  if (
    value === "seasonal" ||
    value === "waste" ||
    value === "budget" ||
    value === "default"
  ) {
    return value;
  }

  return "default";
};

const toNudgeViewModel = (
  nudge: NudgeCard,
  index: number,
): DiscoverNudgeViewModel => {
  const record = nudge as unknown as NudgeRecord;

  return {
    id: readString(record, ["id"], `nudge_${index}`),
    title: readString(record, ["title", "headline"], "A useful cooking idea"),
    body: readString(
      record,
      ["body", "message", "description", "content"],
      "There is a small cooking opportunity worth considering.",
    ),
    tone: readTone(record),
    actionLabel: readString(record, ["actionLabel", "ctaLabel"], "Open"),
  };
};

// Deterministic daily rotation (epic liveliness polish, D.1): the same stable
// spark set is re-ordered by the daily seed so the lane feels fresh day to day
// without spending a generation call.
const rotateBySeed = <T>(items: T[], seed: number): T[] => {
  if (items.length <= 1) return items;
  const offset = ((seed % items.length) + items.length) % items.length;
  return [...items.slice(offset), ...items.slice(0, offset)];
};

const toSparkViewModel = (item: Inspiration): DiscoverSparkViewModel => ({
  id: item.id,
  title: item.title,
  hook: item.hook,
  seedPrompt: item.payload.seedPrompt ?? `${item.title} — ${item.hook}`,
});

const toLeftoverViewModel = (
  item: Inspiration,
): DiscoverLeftoverViewModel => ({
  id: item.id,
  title: item.title,
  hook: item.hook,
  seedPrompt: item.payload.seedPrompt ?? `${item.title} — ${item.hook}`,
});

const recipeMatchesTheme = (recipe: Recipe, theme: DiscoverTheme): boolean => {
  const tags = recipe.tags.map((tag) => tag.toLowerCase());
  if (theme.matchTags.some((tag) => tags.includes(tag))) return true;

  if (theme.maxTotalMinutes != null) {
    const total = recipe.prepMinutes + recipe.cookMinutes;
    return total > 0 && total <= theme.maxTotalMinutes;
  }

  return false;
};

const toThemeViewModels = (
  themes: DiscoverTheme[],
  savedRecipes: Recipe[],
): DiscoverThemeViewModel[] =>
  themes.map((theme) => ({
    id: theme.id,
    emoji: theme.emoji,
    title: theme.title,
    hook: theme.hook,
    matchCount: savedRecipes.filter((recipe) =>
      recipeMatchesTheme(recipe, theme),
    ).length,
    seedPrompt: theme.seedPrompt,
  }));

export const useDiscoverController = () => {
  const [error, setError] = useState<string | null>(null);
  const [produce, setProduce] = useState<SeasonalProduce[]>([]);
  const [nudges, setNudges] = useState<NudgeCard[]>([]);

  // Inspiration lanes (sparks, themes, leftover).
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [sparks, setSparks] = useState<DiscoverSparkViewModel[]>([]);
  const [sparksRefreshing, setSparksRefreshing] = useState(false);
  const [themes, setThemes] = useState<DiscoverThemeViewModel[]>([]);
  const [leftover, setLeftover] = useState<DiscoverLeftoverViewModel | null>(
    null,
  );

  // Generation zone: cards the cook explicitly asked for, appended below the
  // lanes. Kept in a session list so the feed grows downward (append-only).
  const [generatedCards, setGeneratedCards] = useState<DiscoverSparkViewModel[]>(
    [],
  );
  const [generating, setGenerating] = useState(false);

  const produceRef = useRef<SeasonalProduce[]>([]);
  produceRef.current = produce;

  const setActiveNudges = useConversationStore(
    (state) => state.setActiveNudges,
  );
  const profile = useChefProfileStore((state) => state.profile);

  // The full Discover surface: produce + nudge + sparks + themes + leftover.
  // Each lane loads independently so one failure (or a slow LLM) never blocks
  // the others — the screen self-prunes empty lanes.
  const loadDiscover = useCallback(async (): Promise<void> => {
    setDiscoverLoading(true);
    setError(null);

    const month = SeasonalService.getCurrentMonth();
    const seed = getDailySeed();

    // Seasonal produce (drives the In Season lane and seeds spark context).
    let seasonalItems: SeasonalProduce[] = [];
    if (profile) {
      try {
        seasonalItems = await seasonalRepo.getByRegionAndMonth(
          profile.region,
          month,
        );
      } catch {
        seasonalItems = [];
      }
    }
    setProduce(seasonalItems);

    // Ambient nudge (kept in sync with the conversation store for the assistant).
    try {
      const nudge = await NudgeService.generateNudge();
      if (nudge) {
        setNudges([nudge]);
        setActiveNudges([nudge]);
      } else {
        setNudges([]);
      }
    } catch {
      setNudges([]);
    }

    // Themes — hardcoded seasonal base + an LLM gap-filler tier (D.6, cached),
    // with a live match count from saved recipes. The LLM tier is failure-silent
    // so the base set always renders even if generation fails.
    const baseThemes = getSeasonalThemes(month, seed);
    let savedRecipes: Recipe[] = [];
    try {
      savedRecipes = await recipeRepo.getSaved();
    } catch {
      savedRecipes = [];
    }
    let generatedThemes: DiscoverTheme[] = [];
    try {
      generatedThemes = await InspirationService.getGeneratedThemes(
        seasonalItems,
        baseThemes.map((theme) => theme.title),
      );
    } catch {
      generatedThemes = [];
    }
    setThemes(toThemeViewModels([...baseThemes, ...generatedThemes], savedRecipes));

    // Sparks — get-or-mint (LLM with deterministic fallback inside the service).
    try {
      const items = await InspirationService.getSparks(seasonalItems);
      setSparks(rotateBySeed(items, seed).map(toSparkViewModel));
    } catch {
      setSparks([]);
    }

    // Leftover loop — only present when there's a recent cook to build on.
    try {
      const item = await InspirationService.getLeftover();
      setLeftover(item ? toLeftoverViewModel(item) : null);
    } catch {
      setLeftover(null);
    }

    setDiscoverLoading(false);
  }, [profile, setActiveNudges]);

  // Explicit "show me more" — spends a call to add fresh sparks.
  const refreshSparks = useCallback(async (): Promise<void> => {
    setSparksRefreshing(true);
    try {
      const items = await InspirationService.refreshSparks(produceRef.current);
      setSparks(items.map(toSparkViewModel));
    } catch {
      // Keep the existing sparks on failure.
    } finally {
      setSparksRefreshing(false);
    }
  }, []);

  // Explicit "feed me more" — generates 3 cards and appends them below the
  // lanes. De-dupes against what's already shown so the list only grows.
  const generateMore = useCallback(
    async (mode: GenerationMode, intent: string): Promise<void> => {
      setGenerating(true);
      try {
        const items = await InspirationService.generateMore({
          mode,
          intent,
          produce: produceRef.current,
        });
        const vms = items.map(toSparkViewModel);
        setGeneratedCards((current) => {
          const seen = new Set(current.map((card) => card.id));
          const next = [...current, ...vms.filter((vm) => !seen.has(vm.id))];
          return next.slice(-GENERATED_CARDS_LIMIT);
        });
      } catch {
        // Keep what's already there on failure.
      } finally {
        setGenerating(false);
      }
    },
    [],
  );

  // Mark an inspiration as acted-upon so it disappears from every surface.
  const consume = useCallback((id: string): void => {
    inspirationRepo.markConsumed(id);
    setSparks((current) => current.filter((spark) => spark.id !== id));
    setGeneratedCards((current) => current.filter((card) => card.id !== id));
    setLeftover((current) => (current && current.id === id ? null : current));
  }, []);

  // Dismiss an irrelevant card (epic R.1): same removal as consume, but a
  // distinct intent ("not for me"). Settings-gated light learning (R.2) hooks
  // here — the title is handed to the service, which only remembers it when the
  // cook has `learnFromChats` on. Removal is unaffected by the learning path.
  const dismiss = useCallback(
    (id: string): void => {
      const title =
        sparks.find((spark) => spark.id === id)?.title ??
        generatedCards.find((card) => card.id === id)?.title ??
        (leftover?.id === id ? leftover.title : undefined);

      inspirationRepo.markConsumed(id);
      if (title) void InspirationService.recordDismissal(title);

      setSparks((current) => current.filter((spark) => spark.id !== id));
      setGeneratedCards((current) => current.filter((card) => card.id !== id));
      setLeftover((current) => (current && current.id === id ? null : current));
    },
    [sparks, generatedCards, leftover],
  );

  const nudgeItems = useMemo(() => nudges.map(toNudgeViewModel), [nudges]);

  return {
    loadDiscover,
    refreshSparks,
    generateMore,
    consume,
    dismiss,
    produce,
    nudges,
    nudgeItems,
    sparks,
    sparksRefreshing,
    themes,
    leftover,
    generatedCards,
    generating,
    discoverLoading,
    error,
  };
};
