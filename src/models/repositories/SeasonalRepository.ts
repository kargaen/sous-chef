import { seasonalApi } from "../api/seasonalApi";
import type { SeasonalProduce } from "../types";
import { StorageService } from "@/services/StorageService";

const CACHE_KEY_PREFIX = "seasonal_cache_";
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 1 week

export class SeasonalRepository {
  async getByRegionAndMonth(
    regionCode: string,
    month: number,
  ): Promise<SeasonalProduce[]> {
    const cacheKey = `${CACHE_KEY_PREFIX}${regionCode}_${month}`;
    const cached = await StorageService.storageGetItem(cacheKey);

    if (cached) {
      const { data, fetchedAt } = JSON.parse(cached);
      if (Date.now() - fetchedAt < CACHE_TTL_MS) return data;
    }

    const fresh = await seasonalApi.fetchByRegionAndMonth(regionCode, month);
    await StorageService.storageSetItem(
      cacheKey,
      JSON.stringify({ data: fresh, fetchedAt: Date.now() }),
    );
    return fresh;
  }
}
