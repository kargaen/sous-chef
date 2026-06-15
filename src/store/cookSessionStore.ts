import { create } from "zustand";

import type { CookSession } from "../models/types";

interface CookSessionState {
  session: CookSession | null;
  checkedIngredientIds: string[];
  checkedStepOrders: number[];
  startSession: (recipeId: string) => void;
  endSession: () => void;
  toggleIngredient: (id: string) => void;
  toggleStep: (order: number) => void;
}

export const useCookSessionStore = create<CookSessionState>()((set) => ({
  session: null,
  checkedIngredientIds: [],
  checkedStepOrders: [],

  startSession: (recipeId) =>
    set({
      session: {
        recipeId,
        currentStepIndex: 0,
        startedAt: new Date().toISOString(),
      },
      checkedIngredientIds: [],
      checkedStepOrders: [],
    }),

  endSession: () =>
    set({ session: null, checkedIngredientIds: [], checkedStepOrders: [] }),

  toggleIngredient: (id) =>
    set((state) => ({
      checkedIngredientIds: state.checkedIngredientIds.includes(id)
        ? state.checkedIngredientIds.filter((x) => x !== id)
        : [...state.checkedIngredientIds, id],
    })),

  toggleStep: (order) =>
    set((state) => ({
      checkedStepOrders: state.checkedStepOrders.includes(order)
        ? state.checkedStepOrders.filter((x) => x !== order)
        : [...state.checkedStepOrders, order],
    })),
}));
