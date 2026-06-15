import client from "./client";

export interface PriceEstimate {
  ingredientName: string;
  estimatedPrice: number;
  currency: string;
  unit: string;
}

export interface UnitConversion {
  from: string;
  to: string;
  factor: number;
}

export const ingredientApi = {
  fetchPriceEstimate: async (
    ingredientName: string,
    region: string,
  ): Promise<PriceEstimate> => {
    const response = await client.get("/ingredients/price", {
      params: { name: ingredientName, region },
    });
    return response.data;
  },

  convertUnit: async (
    ingredientName: string,
    fromUnit: string,
    toUnit: string,
  ): Promise<UnitConversion> => {
    const response = await client.get("/ingredients/convert", {
      params: { name: ingredientName, from: fromUnit, to: toUnit },
    });
    return response.data;
  },
};
