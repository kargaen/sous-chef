import { useEffect, useRef, useState } from "react";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";

import { CookLogRepository } from "@/models/repositories/CookLogRepository";
import { RecipeRepository } from "@/models/repositories/RecipeRepository";
import { SettingsRepository } from "@/models/repositories/SettingsRepository";
import type { Recipe, SuggestionContext } from "@/models/types";
import { useCookSessionStore } from "@/store/cookSessionStore";
import { useSettingsStore } from "@/store/settingsStore";
import { useRegisterAssistantContext } from "./useRegisterAssistantContext";
import { createLogger } from "@/utils/logger";

const log = createLogger("useCookingSessionController");

const recipeRepo = new RecipeRepository();
const settingsRepo = new SettingsRepository();
const cookLogRepo = new CookLogRepository();

export const useCookingSessionController = (recipeId: string) => {
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeIdRef = useRef(recipeId);

  const session = useCookSessionStore((s) => s.session);
  const checkedIngredientIds = useCookSessionStore((s) => s.checkedIngredientIds);
  const checkedStepOrders = useCookSessionStore((s) => s.checkedStepOrders);
  const startSession = useCookSessionStore((s) => s.startSession);
  const toggleIngredient = useCookSessionStore((s) => s.toggleIngredient);
  const toggleStep = useCookSessionStore((s) => s.toggleStep);

  const settingsData = useSettingsStore((s) => s.settings);
  const updateSettingsInStore = useSettingsStore((s) => s.updateSettings);
  const setSettingsInStore = useSettingsStore((s) => s.setSettings);
  const keepScreenOn = settingsData?.keepScreenOn ?? false;

  useEffect(() => {
    activeIdRef.current = recipeId;
    setLoading(true);
    setError(null);

    log.info("Starting cooking session", { recipeId });
    void recipeRepo
      .fetchById(recipeId)
      .then((fetched) => {
        if (activeIdRef.current === recipeId) {
          if (fetched) {
            log.debug("Recipe loaded for cooking", { title: fetched.title });
          } else {
            log.warn("Recipe not found for cooking session", { recipeId });
          }
          setRecipe(fetched);
        }
      })
      .catch((error: unknown) => {
        log.error("Could not load recipe for cooking session", error);
        if (activeIdRef.current === recipeId) setError("Could not load recipe.");
      })
      .finally(() => setLoading(false));
  }, [recipeId]);

  useEffect(() => {
    if (recipe && (!session || session.recipeId !== recipeId)) {
      startSession(recipeId);
    }
  }, [recipe, recipeId, session, startSession]);

  useEffect(() => {
    if (!keepScreenOn) return;
    void activateKeepAwakeAsync();
    return () => {
      void deactivateKeepAwake();
    };
  }, [keepScreenOn]);

  const assistantContext: SuggestionContext | null = recipe
    ? {
        recipeId: recipe.id,
        recipeTitle: recipe.title,
        scope: { kind: "recipe", recipeId: recipe.id, label: recipe.title },
        nudgeBody: `The user is on the Start Cooking screen for "${recipe.title}", with all ingredients and steps visible. They can check off ingredients and steps as they go.`,
        promptSuggestions: [
          {
            id: "cooking-step-help",
            label: "Explain a step",
            prompt: "Can you explain one of the steps in more detail?",
            kind: "general",
            scopeKinds: ["recipe"],
          },
          {
            id: "cooking-sub",
            label: "Substitute ingredient",
            prompt: "I'm missing an ingredient — what can I use instead?",
            kind: "adaptation",
            scopeKinds: ["recipe"],
          },
          {
            id: "cooking-timing",
            label: "Timing advice",
            prompt: "How do I time everything so it all comes together at once?",
            kind: "general",
            scopeKinds: ["recipe"],
          },
        ],
      }
    : null;

  useRegisterAssistantContext(assistantContext);

  const toggleKeepScreenOn = () => {
    const next = !keepScreenOn;
    updateSettingsInStore({ keepScreenOn: next });
    void (async () => {
      try {
        const current = settingsData ?? (await settingsRepo.get());
        const saved = await settingsRepo.save({ ...current, keepScreenOn: next });
        setSettingsInStore(saved);
      } catch {
        updateSettingsInStore({ keepScreenOn: !next });
      }
    })();
  };

  // Record the cook without going through the rating screen (the cook still
  // counts; the rating is simply skipped).
  const finishWithoutRating = (): void => {
    log.info("Cook finished without rating", { recipeId });
    cookLogRepo.recordCook({ recipeId });
  };

  return {
    recipe,
    loading,
    error,
    checkedIngredientIds,
    checkedStepOrders,
    toggleIngredient,
    toggleStep,
    keepScreenOn,
    toggleKeepScreenOn,
    finishWithoutRating,
  };
};
