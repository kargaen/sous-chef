import { RecipeSchema } from "../schemas/RecipeSchema";
import type { Recipe } from "../types";
import client from "./client";

export const recipeApi = {
  search: async (query: string): Promise<Recipe[]> => {
    const response = await client.get("/recipes", { params: { q: query } });
    return RecipeSchema.array().parse(response.data);
  },

  fetchById: async (id: string): Promise<Recipe> => {
    const response = await client.get(`/recipes/${id}`);
    return RecipeSchema.parse(response.data);
  },

  save: async (recipe: Recipe): Promise<void> => {
    await client.post("/recipes", RecipeSchema.parse(recipe));
  },
};
