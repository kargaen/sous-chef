import { useEffect, useMemo, useRef, useState } from "react";

import { useRecipeController } from "@/controllers";
import type { Recipe, SeasonalProduce } from "@/models/types";
import {
  getDailySeed,
  seededPick,
  tokenizeIngredientName,
  type HomeCardSignal,
} from "@/utils";

export const COOK_OR_CREATE_CARD_ID = "cook-or-create";

export interface CookOrCreateCardViewModel {
  signal: HomeCardSignal;
  recipe: Recipe | null;
  /** True when the suggested recipe uses produce that is in season now. */
  isSeasonal: boolean;
  loading: boolean;
}

interface Suggestion {
  recipe: Recipe | null;
  isSeasonal: boolean;
}

// A recipe is "seasonal" if any of its ingredients shares a (normalized,
// alias-aware) word with produce that is in season this month — so "baby kale"
// matches in-season "kale". Deterministic and free, no LLM.
const isSeasonalRecipe = (
  recipe: Recipe,
  produceTokens: Set<string>,
): boolean => {
  if (produceTokens.size === 0) return false;
  return recipe.ingredients.some((ingredient) =>
    tokenizeIngredientName(ingredient.name).some((token) =>
      produceTokens.has(token),
    ),
  );
};

// Prefer a day-stable seasonal pick; fall back to any saved recipe.
const pickSuggestion = (
  recipes: Recipe[],
  produce: SeasonalProduce[],
  seed: number,
): Suggestion => {
  if (recipes.length === 0) return { recipe: null, isSeasonal: false };

  const produceTokens = new Set(
    produce.flatMap((item) => tokenizeIngredientName(item.name)),
  );

  const seasonal = recipes.filter((recipe) =>
    isSeasonalRecipe(recipe, produceTokens),
  );
  if (seasonal.length > 0) {
    return { recipe: seededPick(seasonal, seed), isSeasonal: true };
  }

  return { recipe: seededPick(recipes, seed), isSeasonal: false };
};

export const useCookOrCreateCard = (
  seasonalProduce: SeasonalProduce[] = [],
): CookOrCreateCardViewModel => {
  const { getSaved } = useRecipeController();
  const getSavedRef = useRef(getSaved);
  getSavedRef.current = getSaved;

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);

    void getSavedRef.current().then((loaded) => {
      if (!active) return;
      setRecipes(loaded);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  const seed = getDailySeed();
  const { recipe, isSeasonal } = useMemo(
    () => pickSuggestion(recipes, seasonalProduce, seed),
    [recipes, seasonalProduce, seed],
  );

  // Evergreen — always visible. A seasonal match bumps relevance above the
  // medium baseline so a timely suggestion can lead the briefing.
  const signal: HomeCardSignal = {
    id: COOK_OR_CREATE_CARD_ID,
    relevance: isSeasonal ? 0.6 : 0.5,
    visible: true,
  };

  return { signal, recipe, isSeasonal, loading };
};
