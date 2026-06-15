import { useEffect, useRef } from "react";
import { useLocalSearchParams } from "expo-router";

import { useAdaptationController, useRecipeController } from "@/controllers";

export const useRecipeAdaptScreenView = () => {
  const params = useLocalSearchParams<{ id?: string }>();
  const { fetchById, activeRecipe, loading, error } = useRecipeController();
  const fetchByIdRef = useRef(fetchById);
  fetchByIdRef.current = fetchById;

  useEffect(() => {
    if (!params.id) return;
    void fetchByIdRef.current(params.id);
  }, [params.id]);

  const recipe =
    params.id && activeRecipe?.id === params.id ? activeRecipe : null;

  const adaptation = useAdaptationController(recipe);

  const handleQuickAction = (prefill: string): void => {
    adaptation.onChangeDraft(prefill);
  };

  return {
    recipe,
    recipeLoading: loading && !recipe,
    recipeError: !recipe && !loading ? error ?? "Recipe not found." : null,
    adaptation,
    handleQuickAction,
  };
};
