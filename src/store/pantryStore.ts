import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { PantryItem } from "../models/types";

interface PantryState {
  items: PantryItem[];
  setItems: (items: PantryItem[]) => void;
  upsertItem: (item: PantryItem) => void;
  removeItem: (id: string) => void;
  clear: () => void;
}

export const usePantryStore = create<PantryState>()(
  persist(
    (set) => ({
      items: [],

      setItems: (items) => set({ items }),

      upsertItem: (item) =>
        set((state) => ({
          items: state.items.some((i) => i.id === item.id)
            ? state.items.map((i) => (i.id === item.id ? item : i))
            : [...state.items, item],
        })),

      removeItem: (id) =>
        set((state) => ({ items: state.items.filter((i) => i.id !== id) })),

      clear: () => set({ items: [] }),
    }),
    {
      name: "pantry-store",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
