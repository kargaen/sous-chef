import { useEffect, useRef, useState } from "react";

import { CookLogRepository } from "@/models/repositories/CookLogRepository";
import { RecipeRepository } from "@/models/repositories/RecipeRepository";
import { RatingDimensionsService } from "@/services/RatingDimensionsService";
import type { RatingDimension } from "@/services/RatingDimensionsService";
import type { Recipe } from "@/models/types";

const recipeRepository = new RecipeRepository();
const cookLogRepository = new CookLogRepository();

export interface ReflectionViewModel {
  recipe: Recipe | null;
  recipeTitle: string | null;
  loading: boolean;
  dimensions: RatingDimension[];
  overallScore: number;
  setOverallScore: (score: number) => void;
  dimensionScores: Record<string, number>;
  setDimensionScore: (dimensionId: string, score: number) => void;
  note: string;
  setNote: (note: string) => void;
  saving: boolean;
  onSave: () => Promise<boolean>;
  onSkip: () => Promise<boolean>;
}

export function useReflectionController(recipeId: string): ReflectionViewModel {
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [recipeTitle, setRecipeTitle] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dimensions, setDimensions] = useState<RatingDimension[]>([]);
  const [overallScore, setOverallScore] = useState(0);
  const [dimensionScores, setDimensionScores] = useState<Record<string, number>>(
    {},
  );
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const activeIdRef = useRef(recipeId);
  activeIdRef.current = recipeId;

  useEffect(() => {
    let active = true;
    setLoading(true);

    void (async () => {
      const loadedRecipe = await recipeRepository.fetchById(recipeId);
      const categories = cookLogRepository.getRatingCategories(recipeId);
      if (!active) return;
      setRecipe(loadedRecipe);
      setRecipeTitle(loadedRecipe?.title ?? null);
      setDimensions(RatingDimensionsService.resolve(categories));
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [recipeId]);

  const setDimensionScore = (dimensionId: string, score: number): void => {
    setDimensionScores((prev) => ({ ...prev, [dimensionId]: score }));
  };

  const onSave = async (): Promise<boolean> => {
    setSaving(true);
    try {
      const ratings = dimensions
        .map((dimension) => ({
          categoryId: dimension.id,
          score: dimensionScores[dimension.id] ?? 0,
        }))
        .filter((rating) => rating.score > 0);

      cookLogRepository.recordCook({
        recipeId,
        overallScore: overallScore > 0 ? overallScore : undefined,
        ratings,
        note,
      });
      return true;
    } catch {
      return false;
    } finally {
      setSaving(false);
    }
  };

  const onSkip = async (): Promise<boolean> => {
    setSaving(true);
    try {
      // The cook still counts — record it with no rating.
      cookLogRepository.recordCook({ recipeId });
      return true;
    } catch {
      return false;
    } finally {
      setSaving(false);
    }
  };

  return {
    recipe,
    recipeTitle,
    loading,
    dimensions,
    overallScore,
    setOverallScore,
    dimensionScores,
    setDimensionScore,
    note,
    setNote,
    saving,
    onSave,
    onSkip,
  };
}
