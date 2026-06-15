import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect, useLocalSearchParams } from "expo-router";

import { useRecipeController, useRegisterAssistantContext } from "@/controllers";
import type { RecipeCookStats } from "@/models/repositories";
import type { Recipe, SuggestionContext } from "@/models/types";

const formatCost = (value?: number): string => {
  if (typeof value !== "number") return "Cost pending";
  return `~$${value.toFixed(2)}`;
};

const formatDuration = (minutes?: number): string => {
  if (!minutes) return "Flexible";
  return `${minutes} min`;
};

export interface RecipePage {
  recipe: Recipe;
  isVariant: boolean;
  cookDurationLabel: string;
  estimatedCostLabel: string;
  prepDurationLabel: string;
  totalMinutes: number;
}

const buildPage = (recipe: Recipe, isVariant: boolean): RecipePage => ({
  recipe,
  isVariant,
  cookDurationLabel: formatDuration(recipe.cookMinutes),
  estimatedCostLabel: formatCost(recipe.estimatedCost),
  prepDurationLabel: formatDuration(recipe.prepMinutes),
  totalMinutes: recipe.prepMinutes + recipe.cookMinutes,
});

export const useRecipeScreenView = () => {
  const params = useLocalSearchParams<{ id?: string }>();
  const {
    fetchById,
    getVariants,
    promoteVariant,
    getRecipeStats,
    activeRecipe,
    loading,
    error,
  } = useRecipeController();
  const fetchByIdRef = useRef(fetchById);
  fetchByIdRef.current = fetchById;
  const getVariantsRef = useRef(getVariants);
  getVariantsRef.current = getVariants;
  const getRecipeStatsRef = useRef(getRecipeStats);
  getRecipeStatsRef.current = getRecipeStats;

  const [variants, setVariants] = useState<Recipe[]>([]);
  const [selectedPageIndex, setSelectedPageIndex] = useState(0);

  // Reset pager state when switching to a different recipe.
  useEffect(() => {
    setVariants([]);
    setSelectedPageIndex(0);
  }, [params.id]);

  // Refetch the recipe (and its variants) on focus so manual edits made on the
  // Edit screen are reflected when returning here.
  useFocusEffect(
    useCallback(() => {
      if (!params.id) return;
      void fetchByIdRef.current(params.id);
      void getVariantsRef.current(params.id).then(setVariants);
    }, [params.id]),
  );

  const mainRecipe =
    params.id && activeRecipe?.id === params.id ? activeRecipe : null;

  const pages: RecipePage[] = mainRecipe
    ? [
        buildPage(mainRecipe, false),
        ...variants.map((variant) => buildPage(variant, true)),
      ]
    : [];

  const activePage =
    pages[Math.min(selectedPageIndex, Math.max(pages.length - 1, 0))] ?? null;
  const recipe = activePage?.recipe ?? null;

  // Refresh cook stats whenever the screen regains focus (e.g. returning from
  // the reflection screen) or the active recipe/variant changes.
  const [stats, setStats] = useState<RecipeCookStats | null>(null);
  const activeRecipeId = recipe?.id ?? null;
  useFocusEffect(
    useCallback(() => {
      setStats(
        activeRecipeId ? getRecipeStatsRef.current(activeRecipeId) : null,
      );
    }, [activeRecipeId]),
  );

  const handlePromote = async (): Promise<void> => {
    if (!recipe || !activePage?.isVariant || !mainRecipe) return;

    const promoted = await promoteVariant(recipe.id);
    if (!promoted) return;

    setSelectedPageIndex(0);
    const refreshed = await getVariantsRef.current(mainRecipe.id);
    setVariants(refreshed);
  };

  const assistantContext: SuggestionContext | null = recipe
    ? {
        recipeId: recipe.id,
        recipeTitle: recipe.title,
        scope: { kind: "recipe", recipeId: recipe.id, label: recipe.title },
        promptSuggestions: [
          {
            id: "recipe-adapt",
            label: "Adapt this recipe",
            prompt: "Can you help me adapt this recipe to my preferences?",
            kind: "adaptation",
            scopeKinds: ["recipe"],
          },
          {
            id: "recipe-swap",
            label: "Swap an ingredient",
            prompt: "I need to swap an ingredient — what can I use instead?",
            kind: "adaptation",
            scopeKinds: ["recipe"],
          },
          {
            id: "recipe-tip",
            label: "Cooking tips",
            prompt: "Do you have any tips for making this recipe turn out better?",
            kind: "general",
            scopeKinds: ["recipe"],
          },
        ],
      }
    : null;

  useRegisterAssistantContext(assistantContext);

  if (loading && !recipe) {
    return {
      recipe: null,
      statusCopy: "Bringing the details onto the counter now.",
      statusTitle: "Loading recipe",
      statusType: "status" as const,
    };
  }

  if (error && !recipe) {
    return {
      recipe: null,
      statusCopy: error,
      statusTitle: "Unable to load recipe",
      statusType: "status" as const,
    };
  }

  if (!recipe || !activePage) {
    return {
      recipe: null,
      statusCopy: "This recipe is not available on your shelf yet.",
      statusTitle: "Recipe not found",
      statusType: "status" as const,
    };
  }

  const statsView = {
    cookedLabel:
      stats && stats.timesCooked > 0
        ? `${stats.timesCooked} ${stats.timesCooked === 1 ? "time" : "times"}`
        : "Not yet",
    averageLabel:
      stats && stats.averageRating != null
        ? `${stats.averageRating.toFixed(1)} / 5`
        : "Unrated",
    latestNote: stats?.latestCookNote ?? null,
  };

  return {
    activePage,
    handlePromote,
    pages,
    recipe,
    selectedPageIndex,
    selectPage: setSelectedPageIndex,
    stats: statsView,
    statusType: "ready" as const,
  };
};
