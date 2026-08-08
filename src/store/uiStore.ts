import { create } from "zustand";

type Theme = "light" | "dark" | "system";
type ActiveSheet =
  | "addPantryItem"
  | "adaptRecipe"
  | "substitution"
  | "budgetEntry"
  | null;

interface UIState {
  theme: Theme;
  activeSheet: ActiveSheet;
  activeTab: string;
  debugModeEnabled: boolean;
  setTheme: (theme: Theme) => void;
  openSheet: (sheet: ActiveSheet) => void;
  closeSheet: () => void;
  setActiveTab: (tab: string) => void;
  enableDebugMode: () => void;
}

export const useUIStore = create<UIState>()((set) => ({
  theme: "system",
  activeSheet: null,
  activeTab: "index",
  debugModeEnabled: false,

  setTheme: (theme) => set({ theme }),
  openSheet: (sheet) => set({ activeSheet: sheet }),
  closeSheet: () => set({ activeSheet: null }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  enableDebugMode: () => set({ debugModeEnabled: true }),
}));
