import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { BudgetPeriod, SpendEntry } from "../models/types";

interface BudgetState {
  activePeriod: BudgetPeriod | null;
  entries: SpendEntry[];
  totalSpent: number;
  setActivePeriod: (period: BudgetPeriod) => void;
  setEntries: (entries: SpendEntry[]) => void;
  addEntry: (entry: SpendEntry) => void;
  clear: () => void;
}

export const useBudgetStore = create<BudgetState>()(
  persist(
    (set) => ({
      activePeriod: null,
      entries: [],
      totalSpent: 0,

      setActivePeriod: (period) => set({ activePeriod: period }),

      setEntries: (entries) =>
        set({
          entries,
          totalSpent: entries.reduce((sum, e) => sum + e.amount, 0),
        }),

      addEntry: (entry) =>
        set((state) => ({
          entries: [...state.entries, entry],
          totalSpent: state.totalSpent + entry.amount,
        })),

      clear: () => set({ activePeriod: null, entries: [], totalSpent: 0 }),
    }),
    {
      name: "budget-store",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
