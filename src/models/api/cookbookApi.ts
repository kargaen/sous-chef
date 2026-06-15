import type { Cookbook } from "../types/Cookbook.types";
import client from "./client";

export const cookbookApi = {
  fetchAll: async (): Promise<Cookbook[]> => {
    const response = await client.get("/cookbooks");
    return response.data;
  },

  fetchById: async (id: string): Promise<Cookbook> => {
    const response = await client.get(`/cookbooks/${id}`);
    return response.data;
  },
};
