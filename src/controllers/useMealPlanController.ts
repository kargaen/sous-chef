import { useEffect, useState } from "react";

import { CookLogRepository } from "../models/repositories/CookLogRepository";
import { MealPlanRepository } from "../models/repositories/MealPlanRepository";
import { RecipeRepository } from "../models/repositories/RecipeRepository";
import { ShoppingListRepository } from "../models/repositories/ShoppingListRepository";
import type {
  AdaptationIntent,
  MealSlot,
  MealSlotType,
  PlanPreset,
  Recipe,
  SlotInput,
  SuggestionSlot,
  WeekPlan,
} from "../models/types";
import { buildAdaptationPrompt, buildMealPlanningPrompt, buildSystemPrompt } from "../prompts";
import {
  PLAN_DRAFT_SYSTEM_PROMPT,
  buildPlanDraftUserMessage,
  parsePlanDraft,
} from "../prompts/mealPlanDraft";
import { AdaptationResponseSchema } from "../models/schemas";
import { AdaptationService } from "../services/AdaptationService";
import { HabitService } from "../services/HabitService";
import { InspirationService } from "../services/InspirationService";
import { LLMService } from "../services/LLMService";
import { RecipeImportService } from "../services/RecipeImportService";
import { SeasonalService } from "../services/SeasonalService";
import { useChefProfileStore } from "../store/chefProfileStore";
import { useMealPlanStore } from "../store/mealPlanStore";
import { useSettingsStore } from "../store/settingsStore";
import {
  matchIngredient,
  normalizeIngredientName,
} from "../utils/ingredientMatcher";
import { addDays, eachPlanDay, formatDayLabel, planStart, todayKey } from "../utils/planDateUtils";

import { PantryRepository } from "../models/repositories/PantryRepository";
import { PlanPresetRepository } from "../models/repositories/PlanPresetRepository";
import { createLogger } from "../utils/logger";

const log = createLogger("useMealPlanController");

const mealPlanRepo = new MealPlanRepository();
const recipeRepo = new RecipeRepository();
const shoppingRepo = new ShoppingListRepository();
const pantryRepo = new PantryRepository();
const presetRepo = new PlanPresetRepository();
const cookLogRepo = new CookLogRepository();

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
  const [convertingSlotId, setConvertingSlotId] = useState<string | null>(null);
  const [pendingSlotVariant, setPendingSlotVariant] = useState<{
    slotId: string;
    recipe: Recipe;
  } | null>(null);
  const [savedRecipes, setSavedRecipes] = useState<Recipe[]>([]);
  const [presets, setPresets] = useState<PlanPreset[]>([]);

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
    presetRepo.listAll().then(setPresets).catch(() => {});
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
    log.info("Loading plan for week", { weekStartDate });
    setLoading(true);
    try {
      const plan = await mealPlanRepo.getByWeek(weekStartDate);
      if (plan) {
        setActivePlan(plan);
        log.debug("Plan loaded", { planId: plan.id, slots: plan.slots.length });
      } else {
        log.debug("No plan found for week", { weekStartDate });
      }
    } catch (error) {
      log.error("Could not load meal plan", error);
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

  const isSlotCooked = (slot: MealSlot): boolean => {
    if (!slot.recipeId) return false;

    return cookLogRepo.getCookLogs(slot.recipeId).some((cook) => {
      if (cook.recipeId !== slot.recipeId) return false;
      const cookedAt = new Date(cook.cookedAt);
      if (Number.isNaN(cookedAt.getTime())) return false;

      const localDate = [
        cookedAt.getFullYear(),
        String(cookedAt.getMonth() + 1).padStart(2, "0"),
        String(cookedAt.getDate()).padStart(2, "0"),
      ].join("-");
      return localDate === slot.date;
    });
  };

  // ─── P3.2 Tier-1 qualitative adaptation ─────────────────────────────────

  // Runs a one-shot LLM adaptation for a queued AdaptationIntent on a slot:
  // fetches the recipe → calls LLM → builds variant → saves → updates slot →
  // removes the fulfilled intent from pendingActions. Silent no-op if the
  // slot has no recipeId or the LLM response cannot be parsed.
  const applyPendingAdaptation = async (
    slotId: string,
    description: string,
  ): Promise<void> => {
    if (!activePlan || !profile) return;
    const slot = activePlan.slots.find((s) => s.id === slotId);
    if (!slot?.recipeId) return;

    log.info("Applying slot adaptation", { slotId, description: description.slice(0, 60) });
    setLoading(true);
    try {
      const recipe = await recipeRepo.fetchById(slot.recipeId);
      if (!recipe) {
        log.warn("Recipe not found for adaptation", { recipeId: slot.recipeId });
        return;
      }

      const response = await LLMService.send({
        system: buildSystemPrompt(profile),
        messages: [
          {
            role: "user",
            content: buildAdaptationPrompt({ recipe, reason: description }),
          },
        ],
      });

      const start = response.content.indexOf("{");
      const end = response.content.lastIndexOf("}");
      if (start === -1 || end <= start) return;

      let parsed: unknown;
      try {
        parsed = JSON.parse(response.content.slice(start, end + 1));
      } catch {
        return;
      }

      const validated = AdaptationResponseSchema.safeParse(parsed);
      if (!validated.success) {
        log.warn("Adaptation response failed schema validation", {
          issues: validated.error.issues.length,
        });
        return;
      }

      const variant = AdaptationService.buildVariantRecipe(recipe, validated.data);
      await recipeRepo.save(variant);
      log.info("Adaptation variant saved", { variantId: variant.id, slotId });

      await persistPlan({
        ...activePlan,
        slots: activePlan.slots.map((s) =>
          s.id === slotId ? { ...s, recipeId: variant.id } : s,
        ),
      });

      setPendingActions(
        pendingActions.filter(
          (a) => !(a.slotId === slotId && a.description === description),
        ),
      );
    } catch (error) {
      log.error("Could not apply adaptation", error);
      setError("Could not apply adaptation.");
    } finally {
      setLoading(false);
    }
  };

  const requestSlotVariant = async (slotId: string): Promise<void> => {
    if (!activePlan || !profile) return;
    const slot = activePlan.slots.find((candidate) => candidate.id === slotId);
    if (!slot?.recipeId || !slot.note) return;

    setPendingSlotVariant(null);
    setLoading(true);
    try {
      const parent = await recipeRepo.fetchById(slot.recipeId);
      if (!parent) return;

      const response = await LLMService.send({
        system: buildSystemPrompt(profile),
        messages: [
          {
            role: "user",
            content: buildAdaptationPrompt({ recipe: parent, reason: slot.note }),
          },
        ],
      });
      const start = response.content.indexOf("{");
      const end = response.content.lastIndexOf("}");
      if (start === -1 || end <= start) return;

      let parsed: unknown;
      try {
        parsed = JSON.parse(response.content.slice(start, end + 1));
      } catch {
        return;
      }

      const validated = AdaptationResponseSchema.safeParse(parsed);
      if (!validated.success) return;

      setPendingSlotVariant({
        slotId,
        recipe: AdaptationService.buildVariantRecipe(parent, validated.data),
      });
    } catch (variantError) {
      log.error("Could not prepare planned recipe variant", variantError);
      setError("Could not prepare the variant.");
    } finally {
      setLoading(false);
    }
  };

  const acceptSlotVariant = async (): Promise<void> => {
    if (!activePlan || !pendingSlotVariant) return;
    const proposal = pendingSlotVariant;

    try {
      await recipeRepo.save(proposal.recipe);
      await persistPlan({
        ...activePlan,
        slots: activePlan.slots.map((slot) =>
          slot.id === proposal.slotId
            ? {
                ...slot,
                recipeId: proposal.recipe.id,
                note: undefined,
              }
            : slot,
        ),
      });
      setPendingSlotVariant(null);
    } catch (variantError) {
      log.error("Could not save planned recipe variant", variantError);
      setError("Could not save the variant.");
    }
  };

  const cancelSlotVariant = (): void => {
    setPendingSlotVariant(null);
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
    text?: string;
    recipeId?: string;
    note?: string;
    servings?: number;
    adaptationIntents: string[];
  } => {
    let contextText: string;
    let recipeId: string | undefined;
    let note: string | undefined;
    let text: string | undefined;

    if ("rawText" in input) {
      const titleCandidate = input.rawText.trim();
      contextText = input.rawText;
      const matched = matchRecipe(titleCandidate);

      if (matched) {
        recipeId = matched.id;
        const titleLower = matched.title.toLowerCase();
        const rawLower = input.rawText.toLowerCase();
        const noteText = rawLower.startsWith(titleLower)
          ? input.rawText.slice(matched.title.length).trim()
          : "";
        note = noteText || undefined;
      } else {
        text = titleCandidate || undefined;
      }
    } else {
      recipeId = input.recipeId;
      contextText = input.note.trim();
      note = contextText || undefined;
    }

    const servings = extractServings(contextText);
    const adaptationIntents = extractAdaptationIntents(contextText);

    return { text, recipeId, note, servings, adaptationIntents };
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
    if (!parsed.recipeId && !parsed.text) {
      log.warn("submitSlotInput: nothing to persist after parsing", { date, type });
      return;
    }
    log.debug("Submitting slot", {
      date,
      type,
      recipeId: parsed.recipeId,
      adaptations: parsed.adaptationIntents.length,
    });

    const slotId = newSlotId();
    const newSlot: MealSlot = {
      id: slotId,
      date,
      type,
      text: parsed.text,
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

  const createRecipeForSlot = async (slotId: string): Promise<void> => {
    if (!activePlan || !profile) return;
    const slot = activePlan.slots.find((candidate) => candidate.id === slotId);
    if (!slot?.text || slot.recipeId) return;

    setConvertingSlotId(slotId);
    try {
      const generated = await RecipeImportService.generateRecipeFromIdea(
        slot.text,
        profile,
      );
      if (!generated) return;

      await recipeRepo.save(generated);
      await persistPlan({
        ...activePlan,
        slots: activePlan.slots.map((candidate) =>
          candidate.id === slotId
            ? {
                ...candidate,
                text: undefined,
                recipeId: generated.id,
              }
            : candidate,
        ),
      });
    } catch (conversionError) {
      log.error("Could not create recipe for planned text", conversionError);
      setError("Could not create recipe right now.");
    } finally {
      setConvertingSlotId(null);
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

  const dismissAllSuggestions = (): void => {
    setDraftSlots([]);
  };

  const acceptAllSuggestions = async (): Promise<void> => {
    const slots = [...draftSlots];
    setDraftSlots([]);
    for (const s of slots) {
      const combined = [s.suggestionText, s.note].filter(Boolean).join(" ");
      await submitSlotInput(s.date, s.type, { rawText: combined });
    }
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
    log.debug("Deriving shopping list", { weekStartDate, dates });
    try {
      const list = await shoppingRepo.deriveForDates(weekStartDate, dates);
      // Preserve checked ticks for items that still appear after re-derive.
      const checkedIds = new Set(
        shoppingList.flatMap((g) => g.items).filter((i) => i.checked).map((i) => i.id),
      );
      const merged = checkedIds.size === 0
        ? list
        : list.map((group) => ({
            ...group,
            items: group.items.map((item) =>
              checkedIds.has(item.id) ? { ...item, checked: true } : item,
            ),
          }));
      log.info("Shopping list derived", { groups: merged.length });
      setShoppingList(merged);
      HabitService.record("shopping_list_viewed");
    } catch (error) {
      log.error("Could not derive shopping list", error);
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

  // ─── P6 Plan presets ─────────────────────────────────────────────────────

  const savePreset = async (name: string, instructions: string): Promise<void> => {
    const preset: PlanPreset = {
      id: `preset-${Date.now()}`,
      name: name.trim(),
      instructions: instructions.trim(),
      createdAt: new Date().toISOString(),
    };
    const saved = await presetRepo.save(preset);
    setPresets((prev) => {
      const without = prev.filter((p) => p.id !== saved.id);
      return [...without, saved];
    });
  };

  const deletePreset = async (id: string): Promise<void> => {
    await presetRepo.delete(id);
    setPresets((prev) => prev.filter((p) => p.id !== id));
  };

  // ─── P5 AI plan draft ────────────────────────────────────────────────────

  // Generate a draft plan from a free-text request. Every LLM result lands as
  // a SuggestionSlot in draftSlots (transient). Nothing is persisted here —
  // the user accepts/dismisses each suggestion individually.
  const generateFromRequest = async (
    request: string,
    usePantry = false,
  ): Promise<void> => {
    if (!activePlan || !request.trim()) return;
    log.info("Generating plan draft from request", {
      request: request.slice(0, 80),
      usePantry,
    });
    setLoading(true);
    try {
      const today = todayKey();
      const filledDates = new Set(activePlan.slots.map((slot) => slot.date));
      const availableDays = eachPlanDay(activePlan.weekStartDate, activePlan.dayCount)
        .filter((d) => d >= today)
        .filter((date) => !filledDates.has(date))
        .map((date) => ({
          date,
          label: new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
            weekday: "long",
          }),
        }));
      const filledSlots = activePlan.slots.map((slot) => ({
        date: slot.date,
        type: slot.type,
        text:
          slot.text ??
          savedRecipes.find((recipe) => recipe.id === slot.recipeId)?.title ??
          slot.note ??
          "Planned meal",
      }));

      let pantryHighlights: string[] | undefined;
      if (usePantry) {
        const pantryItems = await pantryRepo.getAll();
        pantryHighlights = pantryItems
          .slice(0, 12)
          .map((p) => `${p.name}${p.quantity ? ` (${p.quantity} ${p.unit})` : ""}`);
      }

      const message = buildPlanDraftUserMessage({
        request: request.trim(),
        availableDays,
        filledSlots,
        month: new Date().getMonth() + 1,
        region: profile?.region ?? null,
        cuisinePreferences: profile?.preferences.cuisinePreferences ?? [],
        skillLevel: profile?.skillLevel ?? null,
        pantryHighlights,
      });
      const eligibleDates = (
        JSON.parse(message) as { availableDays: Array<{ date: string }> }
      ).availableDays.map((day) => day.date);

      const response = await LLMService.send({
        system: PLAN_DRAFT_SYSTEM_PROMPT,
        messages: [{ role: "user", content: message }],
      });

      const drafted = parsePlanDraft(response.content, eligibleDates);

      const newSuggestions: SuggestionSlot[] = drafted.map((slot) => ({
        id: `suggestion-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        date: slot.date,
        type: slot.type,
        suggestionText: slot.title,
        note: slot.note,
      }));

      log.info("Plan draft generated", { suggestions: newSuggestions.length });
      // Replace any existing draft slots (re-generating replaces the previous draft).
      setDraftSlots(newSuggestions);
      HabitService.record("meal_plan_created");
    } catch (error) {
      log.error("Could not draft meal plan", error);
      setError("Could not draft meal plan. Please try again.");
    } finally {
      setLoading(false);
    }
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
        budgetPeriod: budgetPeriod
          ? {
              id: "draft-budget-period",
              startDate: "",
              endDate: "",
              ...budgetPeriod,
            }
          : null,
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
    presets,
    weekStartDay,
    defaultPlanLength,
    loading,
    error,
    convertingSlotId,
    pendingSlotVariant,
    createPlan,
    loadPlanForWeek,
    savePlan,
    removeSlot,
    searchRecipes,
    parseSlotInput,
    submitSlotInput,
    createRecipeForSlot,
    requestSlotVariant,
    acceptSlotVariant,
    cancelSlotVariant,
    addSuggestionSlot,
    removeSuggestionSlot,
    acceptSuggestion,
    acceptAllSuggestions,
    dismissAllSuggestions,
    suggestForSlot,
    setSlotServings,
    bumpSlot,
    shiftPlan,
    extendPlan,
    deriveShoppingList,
    toggleShoppingItem,
    generateFromRequest,
    isSlotCooked,
    applyPendingAdaptation,
    savePreset,
    deletePreset,
    generatePlan,
  };
};
