import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { Cookbook, Recipe } from "../models/types";

interface CookbookState {
  cookbooks: Cookbook[];
  uncategorizedRecipes: Recipe[];
  setCookbooks: (cookbooks: Cookbook[]) => void;
  setUncategorizedRecipes: (recipes: Recipe[]) => void;
  clear: () => void;
}

export const useCookbookStore = create<CookbookState>()(
  persist(
    (set) => ({
      cookbooks: [],
      uncategorizedRecipes: [],

      setCookbooks: (cookbooks) => set({ cookbooks }),
      setUncategorizedRecipes: (recipes) =>
        set({ uncategorizedRecipes: recipes }),
      clear: () => set({ cookbooks: [], uncategorizedRecipes: [] }),
    }),
    {
      name: "cookbook-store",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
