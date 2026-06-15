import type { SeasonalProduce } from "../types";
import client from "./client";

export const seasonalApi = {
  fetchByRegionAndMonth: async (
    regionCode: string,
    month: number,
  ): Promise<SeasonalProduce[]> => {
    const response = await client.get("/seasonal", {
      params: { region: regionCode, month },
    });
    return response.data;
  },
};
