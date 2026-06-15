import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { ListGroup, WeekPlan } from "../models/types";

interface MealPlanState {
  activePlan: WeekPlan | null;
  shoppingList: ListGroup[];
  setActivePlan: (plan: WeekPlan) => void;
  setShoppingList: (list: ListGroup[]) => void;
  clear: () => void;
}

export const useMealPlanStore = create<MealPlanState>()(
  persist(
    (set) => ({
      activePlan: null,
      shoppingList: [],

      setActivePlan: (plan) => set({ activePlan: plan }),

      setShoppingList: (list) => set({ shoppingList: list }),

      clear: () => set({ activePlan: null, shoppingList: [] }),
    }),
    {
      name: "meal-plan-store",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
