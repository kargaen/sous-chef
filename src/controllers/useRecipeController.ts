import { useState } from "react";
import { CookLogRepository } from "../models/repositories/CookLogRepository";
import type { RecipeCookStats } from "../models/repositories/CookLogRepository";
import { createLogger } from "../utils/logger";

const log = createLogger("useRecipeController");
import { RecipeRepository } from "../models/repositories/RecipeRepository";
import type { Recipe } from "../models/types";
import {
  type RecipeBuilderInput,
  buildRecipeFromInput,
  createRecipeId,
  parseIngredientLine,
  parseRecipeDraftFromLLM,
  parseStepLine,
} from "../utils/recipeBuilder";
import {
  buildRatingDimensionsPrompt,
  buildRecipeImportPrompt,
  buildSystemPrompt,
} from "../prompts";
import { RatingDimensionsService } from "../services/RatingDimensionsService";
import { ClipboardService } from "../services/ClipboardService";
import { HabitService } from "../services/HabitService";
import { LLMService } from "../services/LLMService";
import { RecipeImportService } from "../services/RecipeImportService";
import { useChefProfileStore } from "../store/chefProfileStore";
import { useSousChefCompanionStore } from "../store/sousChefCompanionStore";

const repo = new RecipeRepository();
const cookLogRepo = new CookLogRepository();

interface ImportRecipeSourceInput {
  sourceMode: "url" | "idea" | "paste";
  source: string;
}

// Manual edits from the Edit Recipe form — no LLM, just the fields the user
// can change by hand. Photo is handled separately by the photo controller.
interface RecipeEditsInput {
  title: string;
  description: string;
  servings: number;
  prepMinutes: number;
  cookMinutes: number;
  estimatedCost?: number;
  ingredientsText: string;
  stepsText: string;
  chefsNotes: string;
}


export const useRecipeController = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Recipe[]>([]);
  const [activeRecipe, setActiveRecipe] = useState<Recipe | null>(null);
  const profile = useChefProfileStore((s) => s.profile);
  const showCompanion = useSousChefCompanionStore((state) => state.showCompanion);
  const showExhaustedCompanion = useSousChefCompanionStore(
    (state) => state.showExhausted,
  );

  const search = async (query: string): Promise<void> => {
    log.debug("Searching recipes", { query });
    setLoading(true);
    setError(null);
    try {
      const recipes = await repo.search(query);
      // Filter out recipes containing disliked ingredients or excluded dietary tags
      const filtered = recipes.filter((recipe) => {
        if (!profile) return true;
        const hasDisliked = recipe.ingredients.some((i) =>
          profile.preferences.dislikedIngredients.includes(
            i.name.toLowerCase(),
          ),
        );
        const hasExcludedTag = recipe.tags.some((t) =>
          profile.preferences.dietary.includes(t),
        );
        return !hasDisliked && !hasExcludedTag;
      });
      log.debug("Search results", { query, found: filtered.length });
      setResults(filtered);
    } catch (error) {
      log.error("Recipe search failed", error);
      setError("Could not search recipes.");
    } finally {
      setLoading(false);
    }
  };

  const fetchById = async (id: string): Promise<void> => {
    log.debug("Fetching recipe by id", { id });
    setLoading(true);
    setError(null);
    try {
      const recipe = await repo.fetchById(id);
      if (recipe) {
        log.debug("Recipe fetched", { id, title: recipe.title });
      } else {
        log.warn("Recipe not found", { id });
      }
      setActiveRecipe(recipe);
    } catch (error) {
      log.error("Could not load recipe", error);
      setError("Could not load recipe.");
    } finally {
      setLoading(false);
    }
  };

  // Generate this recipe's dish-specific rating dimensions in the background.
  // Idempotent: skips if dimensions already exist, so edits never regenerate.
  // Failures fall back to fixed dimensions only.
  const generateDimensionsIfMissing = async (recipe: Recipe): Promise<void> => {
    try {
      if (!profile) return;
      if (cookLogRepo.getRatingCategories(recipe.id).length > 0) return;

      const response = await LLMService.send({
        system: buildSystemPrompt(profile),
        messages: [
          { role: "user", content: buildRatingDimensionsPrompt(recipe) },
        ],
      });

      const labels = RatingDimensionsService.parseGenerated(response.content);
      if (labels.length === 0) return;

      cookLogRepo.saveRatingCategories(
        recipe.id,
        labels.map((label) => ({ label })),
      );
    } catch {
      // Background task — never surface errors into the save flow.
    }
  };

  const saveRecipe = async (recipe: Recipe): Promise<Recipe | null> => {
    log.info("Saving recipe", { id: recipe.id, title: recipe.title });
    setLoading(true);
    setError(null);
    try {
      await repo.save(recipe);
      HabitService.record("recipe_saved");
      // Fire-and-forget: the recipe is saved immediately; dimensions arrive
      // a moment later without blocking the save.
      void generateDimensionsIfMissing(recipe);
      return recipe;
    } catch (error) {
      log.error("Could not save recipe", error);
      setError("Could not save recipe.");
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Apply manual edits to an existing recipe. Preserves id, dates, parent,
  // tags, season, photo, etc. via spread; only the hand-edited fields change.
  // Deliberately LLM-free — the Edit form is the calm, manual counterpart to
  // the AI adapt flow.
  const saveRecipeEdits = async (
    original: Recipe,
    edits: RecipeEditsInput,
  ): Promise<Recipe | null> => {
    const ingredientLines = edits.ingredientsText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    const stepLines = edits.stepsText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (!edits.title.trim()) {
      setError("Give the recipe a title before saving.");
      return null;
    }
    if (ingredientLines.length === 0) {
      setError("Add at least one ingredient before saving.");
      return null;
    }
    if (stepLines.length === 0) {
      setError("Add at least one step before saving.");
      return null;
    }

    log.info("Saving recipe edits", { id: original.id, title: edits.title });
    setLoading(true);
    setError(null);
    try {
      // Re-read the latest copy first so a photo change made meanwhile (the
      // photo controller persists immediately) isn't clobbered by this save.
      const latest = (await repo.fetchById(original.id)) ?? original;
      const updated: Recipe = {
        ...latest,
        title: edits.title.trim(),
        description: edits.description.trim() || original.description,
        servings: edits.servings,
        prepMinutes: edits.prepMinutes,
        cookMinutes: edits.cookMinutes,
        estimatedCost: edits.estimatedCost,
        ingredients: ingredientLines.map(parseIngredientLine),
        steps: stepLines.map(parseStepLine),
        chefsNotes: edits.chefsNotes.trim() || undefined,
        lastUpdatedDate: new Date().toISOString(),
      };
      await repo.save(updated);
      setActiveRecipe(updated);
      HabitService.record("recipe_saved");
      log.info("Recipe edits saved", { id: updated.id });
      return updated;
    } catch (error) {
      log.error("Could not save recipe edits", error);
      setError("Could not save your changes.");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const saveDraftRecipe = async (
    draft: RecipeBuilderInput,
  ): Promise<Recipe | null> => {
    try {
      return await saveRecipe(buildRecipeFromInput(draft));
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Could not save recipe.",
      );
      return null;
    }
  };

  const markCooked = (recipe: Recipe): void => {
    HabitService.record("recipe_cooked");
    // Persist the cook itself (no rating — the reflection flow adds those).
    try {
      cookLogRepo.recordCook({ recipeId: recipe.id });
    } catch {
      // A failed cook-log write must not break the cooking flow.
    }
  };

  const getSaved = async (): Promise<Recipe[]> => {
    try {
      return await repo.getSaved();
    } catch {
      return [];
    }
  };

  const getVariants = async (parentId: string): Promise<Recipe[]> => {
    try {
      return await repo.getVariants(parentId);
    } catch {
      return [];
    }
  };

  const promoteVariant = async (id: string): Promise<Recipe | null> => {
    try {
      return await repo.promoteVariant(id);
    } catch {
      return null;
    }
  };

  // Synchronous: stats are derived from local cook-log rows.
  const getRecipeStats = (recipeId: string): RecipeCookStats => {
    try {
      return cookLogRepo.getStats(recipeId);
    } catch {
      return {
        timesCooked: 0,
        lastCookedDate: null,
        averageRating: null,
        latestCookNote: null,
      };
    }
  };

  const getClipboardRecipeSourceSuggestion = async () => {
    return ClipboardService.getRecipeSourceSuggestion();
  };

  const refineDraft = async (
    current: RecipeBuilderInput,
    request: string,
  ): Promise<RecipeBuilderInput | null> => {
    if (!profile) return null;

    try {
      const response = await LLMService.send({
        system: buildSystemPrompt(profile),
        messages: [
          {
            role: "user",
            content: `You are refining a recipe draft. Return ONLY a JSON object in this exact format with no extra text:
{"title":"...","ingredients":["...","..."],"steps":["...","..."],"notes":"..."}

Current draft:
Title: ${current.title}
Ingredients:
${current.ingredientsText}
Steps:
${current.stepsText}
Notes: ${current.notes}

Refinement request: ${request}

Apply the requested change and return the full updated recipe.`,
          },
        ],
      });

      return parseRecipeDraftFromLLM(response.content);
    } catch {
      setError("Could not refine the draft right now.");
      return null;
    }
  };

  const importRecipeSource = async ({
    sourceMode,
    source,
  }: ImportRecipeSourceInput): Promise<RecipeBuilderInput | null> => {
    log.info("Importing recipe", { sourceMode, sourceLength: source.length });
    const trimmedSource = source.trim();

    if (!trimmedSource) {
      setError("Add a recipe source before importing.");
      return null;
    }

    if (!profile) {
      setError(null);
      showCompanion(
        "happy",
        "Before we begin, I'd love to know a little about your tastes and kitchen habits. Pop over to your chef profile and tell me about yourself.",
        {
          label: "Open chef profile",
          route: "/settings?focus=chef_profile",
        },
      );
      return null;
    }

    setError(null);

    // For a URL we fetch the page on-device and extract readable text first,
    // then hand it to the LLM as source text (the "paste" path). A fetch failure
    // gets its own friendly message so the cook knows to try pasting instead.
    let sourceText = trimmedSource;
    if (sourceMode === "url") {
      try {
        sourceText = await RecipeImportService.fetchReadableRecipeText(
          trimmedSource,
        );
      } catch (error) {
        log.error("URL fetch failed during recipe import", error);
        showCompanion(
          "happy",
          "I couldn't read that page — some sites block apps or hide the recipe behind a login. Try pasting the recipe text into the Paste tab instead.",
        );
        setError("Could not read that page.");
        return null;
      }
    }

    const promptMode = sourceMode === "idea" ? "idea" : "paste";

    try {
      const response = await LLMService.send({
        system: buildSystemPrompt(profile),
        messages: [
          {
            role: "user",
            content: buildRecipeImportPrompt({
              sourceMode: promptMode,
              source: sourceText,
            }),
          },
        ],
      });

      const draft = parseRecipeDraftFromLLM(response.content);
      log.info("Recipe import parsed", { title: draft.title });
      return draft;
    } catch (error) {
      log.error("Recipe import LLM call failed", error);
      showCompanion(
        "exhausted",
        "Sous Chef is a little exhausted and couldn't shape that recipe right now. Give me a moment and try again.",
        {
          label: "Open assistant setup",
          route: "/settings?focus=assistant",
        },
      );
      setError(
        "Sous Chef could not import that recipe right now.",
      );
      return null;
    }
  };

  return {
    search,
    fetchById,
    saveRecipe,
    saveRecipeEdits,
    saveDraftRecipe,
    markCooked,
    getSaved,
    getVariants,
    promoteVariant,
    getRecipeStats,
    getClipboardRecipeSourceSuggestion,
    importRecipeSource,
    refineDraft,
    results,
    activeRecipe,
    loading,
    error,
  };
};
