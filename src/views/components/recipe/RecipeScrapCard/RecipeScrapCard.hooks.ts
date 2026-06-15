import { useMemo } from "react";
import type { DimensionValue } from "react-native";

import { deriveRecipeUsage } from "@/utils";

interface RecipeScrapCardRecipeInput {
  id: string;
  title: string;
  description: string;
  prepMinutes: number;
  cookMinutes: number;
  tags: string[];
  season?: string;
  estimatedCost?: number;
}

interface UseRecipeScrapCardInput {
  recipe: RecipeScrapCardRecipeInput;
  index: number;
  timesCooked?: number;
  lastCookedDate?: string | null;
}

export type RecipeStain = {
  top?: DimensionValue;
  left?: DimensionValue;
  width: number;
  height: number;
  opacity: number;
  backgroundColor: string;
  rotate: string;
  translateX: number;
  translateY: number;
  scaleX: number;
  scaleY: number;
  skewX: string;
  skewY: string;
  borderTopLeftRadius: number;
  borderTopRightRadius: number;
  borderBottomLeftRadius: number;
  borderBottomRightRadius: number;
};

const hasRecipeTag = (tags: string[], tag: string): boolean => {
  return tags.some((recipeTag) => recipeTag.toLowerCase() === tag);
};

const formatRecipeTime = (
  prepMinutes: number,
  cookMinutes: number,
): string => {
  const totalMinutes = prepMinutes + cookMinutes;

  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (minutes === 0) {
    return `${hours} hr`;
  }

  return `${hours} hr ${minutes} min`;
};

const formatRecipeCost = (estimatedCost?: number): string | null => {
  if (estimatedCost === undefined) {
    return null;
  }

  return `~$${estimatedCost}`;
};

const getRecipeSeed = (recipeId: string, salt: number): number => {
  return recipeId.split("").reduce((total, character, currentIndex) => {
    return total + character.charCodeAt(0) * (currentIndex + 1 + salt);
  }, salt * 97);
};

const createSeededRandom = (seed: number) => {
  let state = (seed ^ 0x9e3779b9) >>> 0;

  if (state === 0) {
    state = 1;
  }

  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;

    return state / 4294967296;
  };
};

const toHex = (value: number): string => {
  return value.toString(16).padStart(2, "0");
};

const buildStainColor = (seed: number): string => {
  const profiles = [
    { r: [140, 170], g: [40, 60], b: [40, 60] },
    { r: [90, 120], g: [60, 80], b: [40, 50] },
    { r: [190, 220], g: [160, 190], b: [50, 80] },
    { r: [170, 190], g: [140, 160], b: [20, 40] },
  ];

  const profile = profiles[seed % profiles.length];

  const getVal = (range: number[], shift: number) =>
    range[0] + ((seed >> shift) % (range[1] - range[0]));

  const red = getVal(profile.r, 0);
  const green = getVal(profile.g, 2);
  const blue = getVal(profile.b, 4);

  return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
};

const getRecipeStains = (recipeId: string): RecipeStain[] => {
  const random = createSeededRandom(getRecipeSeed(recipeId, 11));
  const stainGroupCount = 1 + Math.floor(random() * 4);
  const results: RecipeStain[] = [];
  const recipeStainColor = buildStainColor(getRecipeSeed(recipeId, 19));

  for (let groupIndex = 0; groupIndex < stainGroupCount; groupIndex++) {
    const groupSeed = getRecipeSeed(recipeId, groupIndex + 23);
    const groupRandom = createSeededRandom(groupSeed);
    const anchorTop = `${Math.round(groupRandom() * 1000) / 10}%` as const;
    const anchorLeft = `${Math.round(groupRandom() * 1000) / 10}%` as const;
    const blobCount = 28 + Math.floor(groupRandom() * 6);
    const baseWidth = 70 + groupRandom() * 42;
    const baseHeight = 18 + groupRandom() * 30;
    const spreadX = 100 + groupRandom() * 26;
    const spreadY = 12 + groupRandom() * 24;
    const baseRotation = groupRandom() * 360;
    const arcSweep = 45 + groupRandom() * 120;
    const curveBend = (groupRandom() - 0.5) * 2.2;
    const groupDirection = groupRandom() > 0.5 ? 1 : -1;

    for (let blobIndex = 0; blobIndex < blobCount; blobIndex++) {
      const progress = blobCount === 1 ? 0.5 : blobIndex / (blobCount - 1);
      const tangent = progress * 2 - 1;
      const angle =
        ((baseRotation +
          tangent * arcSweep * groupDirection +
          (groupRandom() - 0.5) * 25) *
          Math.PI) /
        180;
      const radialDistance = 4 + groupRandom() * 18;
      const curveLift = (1 - tangent * tangent) * curveBend * spreadY;
      const offsetX =
        tangent * spreadX * 0.65 +
        Math.cos(angle) * radialDistance +
        (groupRandom() - 0.5) * 10;
      const offsetY =
        curveLift +
        Math.sin(angle) * radialDistance * 0.85 +
        (groupRandom() - 0.5) * 8;

      const sizeBias = blobIndex === 0 ? 1.35 : 0.72 + groupRandom() * 0.7;
      const width = baseWidth * sizeBias;
      const height =
        baseHeight * (blobIndex === 0 ? 1.2 : 0.78 + groupRandom() * 0.65);
      const radiusBase = Math.min(width, height);

      results.push({
        top: anchorTop,
        left: anchorLeft,
        width,
        height,
        opacity: groupRandom() * 0.017,
        backgroundColor: recipeStainColor,
        rotate: `${baseRotation + (groupRandom() - 0.5) * 90}deg`,
        translateX: offsetX - width / 2,
        translateY: offsetY - height / 2,
        scaleX: 0.85 + groupRandom() * 0.9,
        scaleY: 0.85 + groupRandom() * 0.85,
        skewX: `${(groupRandom() - 0.5) * 18}deg`,
        skewY: `${(groupRandom() - 0.5) * 14}deg`,
        borderTopLeftRadius: radiusBase * (0.45 + groupRandom() * 0.45),
        borderTopRightRadius: radiusBase * (0.45 + groupRandom() * 0.45),
        borderBottomLeftRadius: radiusBase * (0.45 + groupRandom() * 0.45),
        borderBottomRightRadius: radiusBase * (0.45 + groupRandom() * 0.45),
      });
    }
  }

  return results;
};

export const useRecipeScrapCardView = ({
  recipe,
  index,
  timesCooked,
  lastCookedDate,
}: UseRecipeScrapCardInput) => {
  return useMemo(() => {
    // Favorite stays a manual designation (gold border + star). Heavily-used
    // and forgotten now come from real cook stats, not tags.
    const isFavoriteRecipe = hasRecipeTag(recipe.tags, "favorite");
    const { isHeavilyUsed, isForgotten } = deriveRecipeUsage({
      timesCooked,
      lastCookedDate,
    });
    const isForgottenRecipe = isForgotten;
    const stains = isHeavilyUsed ? getRecipeStains(recipe.id) : [];
    const recipeMeta = [
      formatRecipeTime(recipe.prepMinutes, recipe.cookMinutes),
      recipe.season ? recipe.season.toUpperCase() : null,
      formatRecipeCost(recipe.estimatedCost),
    ].filter(Boolean) as string[];
    const footerText =
      recipe.tags
        .filter((tag) => tag !== "favorite" && tag !== "forgotten")
        .join(" \u2022 ")
        .toUpperCase() || "KITCHEN NOTE";

    return {
      cardRotation: `${index % 2 === 0 ? 1.5 : -1.5}deg`,
      footerText,
      isFavoriteRecipe,
      isForgottenRecipe,
      recipeMeta,
      stains,
    };
  }, [index, recipe, timesCooked, lastCookedDate]);
};
