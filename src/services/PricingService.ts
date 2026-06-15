import { ingredientApi } from "../models/api/ingredientApi";
import type { Recipe } from "../models/types";
import { StorageService } from "./StorageService";

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 1 week
const CACHE_KEY_PREFIX = "pricing_cache_";

export const PricingService = {
  estimateRecipeCost: async (
    recipe: Recipe,
    region: string,
    currency: string,
  ): Promise<{ total: number; currency: string; isCached: boolean }> => {
    const cacheKey = `${CACHE_KEY_PREFIX}${recipe.id}_${region}`;
    const cached = await StorageService.storageGetItem(cacheKey);

    if (cached) {
      const { data, fetchedAt } = JSON.parse(cached);
      if (Date.now() - fetchedAt < CACHE_TTL_MS) {
        return { ...data, isCached: true };
      }
    }

    let total = 0;

    for (const ingredient of recipe.ingredients) {
      try {
        const estimate = await ingredientApi.fetchPriceEstimate(
          ingredient.name,
          region,
        );
        total += estimate.estimatedPrice * ingredient.quantity;
        currency = estimate.currency;
      } catch {
        // If a single ingredient fails, skip it rather than failing the whole estimate
      }
    }

    const result = { total: Math.round(total * 100) / 100, currency };
    await StorageService.storageSetItem(
      cacheKey,
      JSON.stringify({ data: result, fetchedAt: Date.now() }),
    );

    return { ...result, isCached: false };
  },
};
