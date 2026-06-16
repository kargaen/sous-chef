import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type {
  AdaptationIntent,
  ListGroup,
  SuggestionSlot,
  WeekPlan,
} from "../models/types";

interface MealPlanState {
  activePlan: WeekPlan | null;
  shoppingList: ListGroup[];
  // Transient — cleared on session end, not persisted.
  draftSlots: SuggestionSlot[];
  pendingActions: AdaptationIntent[];

  setActivePlan: (plan: WeekPlan) => void;
  setShoppingList: (list: ListGroup[]) => void;
  setDraftSlots: (slots: SuggestionSlot[]) => void;
  setPendingActions: (actions: AdaptationIntent[]) => void;
  clear: () => void;
}

export const useMealPlanStore = create<MealPlanState>()(
  persist(
    (set) => ({
      activePlan: null,
      shoppingList: [],
      draftSlots: [],
      pendingActions: [],

      setActivePlan: (plan) => set({ activePlan: plan }),
      setShoppingList: (list) => set({ shoppingList: list }),
      setDraftSlots: (slots) => set({ draftSlots: slots }),
      setPendingActions: (actions) => set({ pendingActions: actions }),
      clear: () =>
        set({
          activePlan: null,
          shoppingList: [],
          draftSlots: [],
          pendingActions: [],
        }),
    }),
    {
      name: "meal-plan-store",
      storage: createJSONStorage(() => AsyncStorage),
      // draftSlots and pendingActions are session-local — exclude from persistence.
      partialize: (state) => ({
        activePlan: state.activePlan,
        shoppingList: state.shoppingList,
      }),
    },
  ),
);
