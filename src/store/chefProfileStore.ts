import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { ChefProfile } from "../models/types";

interface ChefProfileState {
  profile: ChefProfile | null;
  onboardingComplete: boolean;
  setProfile: (profile: ChefProfile) => void;
  updateProfile: (partial: Partial<ChefProfile>) => void;
  setOnboardingComplete: (value: boolean) => void;
  clear: () => void;
}

export const useChefProfileStore = create<ChefProfileState>()(
  persist(
    (set) => ({
      profile: null,
      onboardingComplete: false,

      setProfile: (profile) => set({ profile }),

      updateProfile: (partial) =>
        set((state) => ({
          profile: state.profile ? { ...state.profile, ...partial } : null,
        })),

      setOnboardingComplete: (value) => set({ onboardingComplete: value }),

      clear: () => set({ profile: null, onboardingComplete: false }),
    }),
    {
      name: "chef-profile-store",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
