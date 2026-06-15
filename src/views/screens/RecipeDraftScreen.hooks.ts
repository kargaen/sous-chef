import { useRouter } from "expo-router";
import { useMemo, useState } from "react";

import { useRecipeController } from "@/controllers";
import { useRecipeDraftStore } from "@/store";
import { useSafeBack } from "@/views/hooks/useSafeBack";

export const useRecipeDraftScreenView = () => {
  const router = useRouter();
  const goBack = useSafeBack();
  const { saveDraftRecipe, refineDraft, error, loading } = useRecipeController();

  const draft = useRecipeDraftStore((s) => s.draft);
  const updateDraft = useRecipeDraftStore((s) => s.updateDraft);
  const clearDraft = useRecipeDraftStore((s) => s.clearDraft);

  const [refineRequest, setRefineRequest] = useState("");
  const [isRefining, setIsRefining] = useState(false);

  const title = draft?.title ?? "";
  const ingredients = draft?.ingredientsText ?? "";
  const steps = draft?.stepsText ?? "";
  const notes = draft?.notes ?? "";

  const canRefine = refineRequest.trim().length > 0 && !isRefining && !loading;
  const canSave =
    title.trim().length > 0 &&
    ingredients.trim().length > 0 &&
    steps.trim().length > 0;

  const handleRefine = async () => {
    if (!draft || !refineRequest.trim()) return;

    setIsRefining(true);
    try {
      const refined = await refineDraft(
        {
          title: draft.title,
          ingredientsText: draft.ingredientsText,
          stepsText: draft.stepsText,
          notes: draft.notes,
        },
        refineRequest.trim(),
      );

      if (refined) {
        updateDraft({
          title: refined.title,
          ingredientsText: refined.ingredientsText,
          stepsText: refined.stepsText,
          notes: refined.notes,
        });
        setRefineRequest("");
      }
    } finally {
      setIsRefining(false);
    }
  };

  const handleSave = async () => {
    if (!draft) return;

    const saved = await saveDraftRecipe({
      categoryId: draft.cookbookId,
      title: draft.title,
      ingredientsText: draft.ingredientsText,
      stepsText: draft.stepsText,
      notes: draft.notes,
      servings: draft.servings,
      prepMinutes: draft.prepMinutes,
      cookMinutes: draft.cookMinutes,
      estimatedCost: draft.estimatedCost,
    });

    if (saved) {
      clearDraft();
      router.replace({
        pathname: "/recipe/[id]",
        params: { id: saved.id },
      });
    }
  };

  const handleBack = goBack;

  return useMemo(
    () => ({
      title,
      ingredients,
      steps,
      notes,
      refineRequest,
      isRefining,
      isSaving: loading,
      canRefine,
      canSave,
      refineError: error,
      setTitle: (value: string) => updateDraft({ title: value }),
      setIngredients: (value: string) => updateDraft({ ingredientsText: value }),
      setSteps: (value: string) => updateDraft({ stepsText: value }),
      setNotes: (value: string) => updateDraft({ notes: value }),
      setRefineRequest,
      handleRefine,
      handleSave,
      handleBack,
    }),
    [
      title,
      ingredients,
      steps,
      notes,
      refineRequest,
      isRefining,
      loading,
      canRefine,
      canSave,
      error,
    ],
  );
};
