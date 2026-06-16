import { useEffect, useState } from "react";

import { MealPlanRepository } from "../models/repositories/MealPlanRepository";
import { RecipeRepository } from "../models/repositories/RecipeRepository";
import { ShoppingListRepository } from "../models/repositories/ShoppingListRepository";
import type {
  AdaptationIntent,
  MealSlot,
  MealSlotType,
  Recipe,
  SlotInput,
  SuggestionSlot,
  WeekPlan,
} from "../models/types";
import { buildMealPlanningPrompt, buildSystemPrompt } from "../prompts";
import { HabitService } from "../services/HabitService";
import { InspirationService } from "../services/InspirationService";
import { LLMService } from "../services/LLMService";
import { SeasonalService } from "../services/SeasonalService";
import { useChefProfileStore } from "../store/chefProfileStore";
import { useMealPlanStore } from "../store/mealPlanStore";
import { useSettingsStore } from "../store/settingsStore";
import {
  matchIngredient,
  normalizeIngredientName,
} from "../utils/ingredientMatcher";
import { addDays, formatDayLabel, planStart, todayKey } from "../utils/planDateUtils";

const mealPlanRepo = new MealPlanRepository();
const recipeRepo = new RecipeRepository();
const shoppingRepo = new ShoppingListRepository();

// Patterns that signal a servings quantity in free text.
const SERVINGS_PATTERNS = [
  /\bfor\s+(\d+)\b/i,
  /\bserves?\s+(\d+)\b/i,
  /\b(\d+)\s+people\b/i,
  /\bscale(?:\s+to)?\s+(\d+)\b/i,
  /\b(\d+)\s+servings?\b/i,
];

// Keywords that signal a qualitative adaptation intent.
const ADAPTATION_KEYWORDS = [
  "mild",
  "non-spicy",
  "spicy",
  "vegan",
  "vegetarian",
  "dairy-free",
  "gluten-free",
  "for kids",
  "nut-free",
  "low-carb",
  "keto",
  "pescatarian",
  "no meat",
  "no fish",
];

const extractServings = (text: string): number | undefined => {
  for (const pattern of SERVINGS_PATTERNS) {
    const m = text.match(pattern);
    if (m) return parseInt(m[1], 10);
  }
  return undefined;
};

const extractAdaptationIntents = (text: string): string[] => {
  const lower = text.toLowerCase();
  return ADAPTATION_KEYWORDS.filter((kw) => lower.includes(kw));
};

const newSlotId = (): string =>
  `slot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

export const useMealPlanController = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedRecipes, setSavedRecipes] = useState<Recipe[]>([]);

  const {
    activePlan,
    setActivePlan,
    shoppingList,
    setShoppingList,
    draftSlots,
    setDraftSlots,
    pendingActions,
    setPendingActions,
  } = useMealPlanStore();
  const profile = useChefProfileStore((s) => s.profile);
  const appSettings = useSettingsStore((s) => s.settings);

  const weekStartDay: 0 | 1 | 2 | 3 | 4 | 5 | 6 =
    appSettings?.weekStartDay ?? 1;
  const defaultPlanLength = appSettings?.defaultPlanLength ?? 7;

  // Load saved recipes once for typeahead and parseSlotInput matching.
  useEffect(() => {
    recipeRepo.getSaved().then(setSavedRecipes).catch(() => {});
  }, []);

  // ─── Internal helpers ────────────────────────────────────────────────────

  const persistPlan = async (plan: WeekPlan): Promise<void> => {
    await mealPlanRepo.save(plan);
    setActivePlan(plan);
  };

  // Try to match a title string to a saved recipe. Returns the recipe on a
  // confident match (score ≥ 0.82), null otherwise.
  const matchRecipe = (title: string): Recipe | null => {
    const candidates = savedRecipes.map((r) => ({ id: r.id, name: r.title }));
    const match = matchIngredient(title, candidates, { minimumScore: 0.82 });
    if (!match?.candidate.id) return null;
    return savedRecipes.find((r) => r.id === match.candidate.id) ?? null;
  };

  // ─── P1.4 Core slot operations ───────────────────────────────────────────

  const createPlan = async (
    startDate?: string,
    dayCount?: number,
  ): Promise<WeekPlan> => {
    const weekStartDate = startDate ?? planStart(weekStartDay);
    const resolvedDayCount = dayCount ?? defaultPlanLength;
    const plan: WeekPlan = {
      id: `plan-${Date.now()}`,
      weekStartDate,
      dayCount: resolvedDayCount,
      slots: [],
    };
    await persistPlan(plan);
    return plan;
  };

  const loadPlanForWeek = async (weekStartDate: string): Promise<void> => {
    setLoading(true);
    try {
      const plan = await mealPlanRepo.getByWeek(weekStartDate);
      if (plan) setActivePlan(plan);
    } catch {
      setError("Could not load meal plan.");
    } finally {
      setLoading(false);
    }
  };

  const removeSlot = async (slotId: string): Promise<void> => {
    if (!activePlan) return;
    await persistPlan({
      ...activePlan,
      slots: activePlan.slots.filter((s) => s.id !== slotId),
    });
  };

  // Tier-0 scaling: sets target servings; shopping list derivation applies the
  // multiplier. No LLM involved.
  const setSlotServings = async (
    slotId: string,
    servings: number,
  ): Promise<void> => {
    if (!activePlan) return;
    await persistPlan({
      ...activePlan,
      slots: activePlan.slots.map((s) =>
        s.id === slotId ? { ...s, servings } : s,
      ),
    });
  };

  // ─── P2.1 Recipe typeahead ───────────────────────────────────────────────

  // Fuzzy-filters saved recipes by title for the typeahead dropdown.
  const searchRecipes = (query: string): Recipe[] => {
    if (!query.trim()) return [];
    const q = normalizeIngredientName(query);
    return savedRecipes
      .filter((r) => {
        const title = normalizeIngredientName(r.title);
        return title.includes(q) || q.includes(title.slice(0, 3));
      })
      .slice(0, 6);
  };

  // ─── Core parse (single receiver for both input paths) ───────────────────

  // Parses a SlotInput into resolved slot fields + adaptation intents.
  // Called at save time only — never in-flight during typing.
  const parseSlotInput = (
    input: SlotInput,
  ): {
    recipeId?: string;
    note?: string;
    servings?: number;
    adaptationIntents: string[];
  } => {
    let titleCandidate: string;
    let contextText: string;

    if ("rawText" in input) {
      titleCandidate = input.rawText.trim();
      contextText = input.rawText;
    } else {
      titleCandidate = input.chipTitle.trim();
      contextText = input.note.trim();
    }

    const matched = matchRecipe(titleCandidate);
    const recipeId = matched?.id;

    // For rawText path: strip the matched recipe title prefix to get the note.
    let noteText = contextText;
    if (recipeId && "rawText" in input && matched) {
      const titleLower = matched.title.toLowerCase();
      const rawLower = input.rawText.toLowerCase();
      if (rawLower.startsWith(titleLower)) {
        noteText = input.rawText.slice(matched.title.length).trim();
      }
    }

    const servings = extractServings(contextText);
    const adaptationIntents = extractAdaptationIntents(contextText);

    // No recipe match → whole input is the note.
    const note = recipeId
      ? (noteText || undefined)
      : (titleCandidate || undefined);

    return { recipeId, note, servings, adaptationIntents };
  };

  // Parses, creates the persisted MealSlot, and queues any qualitative
  // adaptation intents for the user to confirm later.
  const submitSlotInput = async (
    date: string,
    type: MealSlotType,
    input: SlotInput,
  ): Promise<void> => {
    if (!activePlan) return;

    const parsed = parseSlotInput(input);
    if (!parsed.recipeId && !parsed.note) return;

    const slotId = newSlotId();
    const newSlot: MealSlot = {
      id: slotId,
      date,
      type,
      recipeId: parsed.recipeId ?? null,
      note: parsed.note,
      servings: parsed.servings,
    };

    await persistPlan({
      ...activePlan,
      slots: [...activePlan.slots, newSlot],
    });

    if (parsed.adaptationIntents.length > 0) {
      const newActions: AdaptationIntent[] = parsed.adaptationIntents.map(
        (desc) => ({ slotId, kind: "qualitative" as const, description: desc }),
      );
      setPendingActions([...pendingActions, ...newActions]);
    }
  };

  // ─── P2.3 Suggestion chips ───────────────────────────────────────────────

  const addSuggestionSlot = (
    date: string,
    type: MealSlotType,
    suggestionText: string,
  ): void => {
    const next: SuggestionSlot = {
      id: `suggestion-${Date.now()}`,
      date,
      type,
      suggestionText,
    };
    setDraftSlots([...draftSlots, next]);
  };

  const removeSuggestionSlot = (id: string): void => {
    setDraftSlots(draftSlots.filter((s) => s.id !== id));
  };

  const acceptSuggestion = async (
    suggestion: SuggestionSlot,
  ): Promise<void> => {
    const combinedText = [suggestion.suggestionText, suggestion.note]
      .filter(Boolean)
      .join(" ");
    removeSuggestionSlot(suggestion.id);
    await submitSlotInput(suggestion.date, suggestion.type, {
      rawText: combinedText,
    });
  };

  // P2.3: generates one contextual meal idea for a slot.
  // Reuses the spark generation pipeline; returns the first suggestion title
  // or empty string on failure. The caller adds it to draftSlots as a
  // suggestion chip — nothing is persisted here.
  const suggestForSlot = async (
    date: string,
    type: MealSlotType,
  ): Promise<string> => {
    try {
      const dayLabel = formatDayLabel(date);
      const results = await InspirationService.generateMore({
        mode: "freeText",
        intent: `${type} idea for ${dayLabel}`,
        produce: [],
      });
      return results[0]?.title ?? "";
    } catch {
      return "";
    }
  };

  // ─── P8 Plan shifting & lifecycle ────────────────────────────────────────

  const bumpSlot = async (slotId: string, toDate: string): Promise<void> => {
    if (!activePlan) return;
    await persistPlan({
      ...activePlan,
      slots: activePlan.slots.map((s) =>
        s.id === slotId ? { ...s, date: toDate } : s,
      ),
    });
  };

  const shiftPlan = async (byDays: number): Promise<void> => {
    if (!activePlan) return;
    const today = todayKey();
    await persistPlan({
      ...activePlan,
      slots: activePlan.slots.map((s) =>
        s.date >= today ? { ...s, date: addDays(s.date, byDays) } : s,
      ),
    });
  };

  const extendPlan = async (days: number): Promise<void> => {
    if (!activePlan) return;
    await persistPlan({
      ...activePlan,
      dayCount: activePlan.dayCount + days,
    });
  };

  // ─── Shopping list ────────────────────────────────────────────────────────

  // Derive (or re-derive) the shopping list for the given plan, optionally
  // scoped to specific dates. Replaces the current shoppingList in the store.
  const deriveShoppingList = async (
    weekStartDate: string,
    dates?: string[],
  ): Promise<void> => {
    try {
      const list = await shoppingRepo.deriveForDates(weekStartDate, dates);
      setShoppingList(list);
      HabitService.record("shopping_list_viewed");
    } catch {
      setError("Could not derive shopping list.");
    }
  };

  // Toggle a single item's checked state in the store (no persistence — the
  // list regenerates on scope change or plan edit, which resets checks).
  const toggleShoppingItem = (itemId: string): void => {
    const next = shoppingList.map((group) => ({
      ...group,
      items: group.items.map((item) =>
        item.id === itemId ? { ...item, checked: !item.checked } : item,
      ),
    }));
    setShoppingList(next);
  };

  // ─── Legacy ───────────────────────────────────────────────────────────────

  const savePlan = async (plan: WeekPlan): Promise<void> => {
    try {
      await persistPlan(plan);
    } catch {
      setError("Could not save meal plan.");
    }
  };

  const generatePlan = async (
    pantryItems: { name: string; quantity: number; unit: string }[],
    expiringItems: { name: string; expiryDate?: string }[],
    budgetPeriod: { limitAmount: number; currency: string } | null,
    preferences: {
      servingsPerMeal: number;
      maxCookMinutesPerDay: number;
      excludeTags: string[];
    },
  ): Promise<string> => {
    if (!profile) throw new Error("No chef profile loaded.");
    setLoading(true);
    try {
      const prompt = buildMealPlanningPrompt({
        pantryItems,
        expiringItems,
        budgetPeriod,
        month: SeasonalService.getCurrentMonth(),
        region: profile.region,
        ...preferences,
      });

      const response = await LLMService.send({
        system: buildSystemPrompt(profile),
        messages: [{ role: "user", content: prompt }],
      });

      HabitService.record("meal_plan_created");
      return response.content;
    } catch {
      setError("Could not generate meal plan.");
      return "";
    } finally {
      setLoading(false);
    }
  };

  return {
    activePlan,
    shoppingList,
    draftSlots,
    pendingActions,
    savedRecipes,
    weekStartDay,
    defaultPlanLength,
    loading,
    error,
    createPlan,
    loadPlanForWeek,
    savePlan,
    removeSlot,
    searchRecipes,
    parseSlotInput,
    submitSlotInput,
    addSuggestionSlot,
    removeSuggestionSlot,
    acceptSuggestion,
    suggestForSlot,
    setSlotServings,
    bumpSlot,
    shiftPlan,
    extendPlan,
    deriveShoppingList,
    toggleShoppingItem,
    generatePlan,
  };
};
