import { create } from "zustand";
import type { AppSettings } from "../models/types";

interface SettingsState {
  settings: AppSettings | null;
  hasLoaded: boolean;
  setSettings: (settings: AppSettings) => void;
  updateSettings: (partial: Partial<AppSettings>) => void;
  clearSettings: () => void;
}

export const useSettingsStore = create<SettingsState>()((set) => ({
  settings: null,
  hasLoaded: false,

  setSettings: (settings) => set({ settings, hasLoaded: true }),

  updateSettings: (partial) =>
    set((state) => ({
      settings: state.settings ? { ...state.settings, ...partial } : null,
      hasLoaded: state.hasLoaded,
    })),

  clearSettings: () => set({ settings: null, hasLoaded: false }),
}));
