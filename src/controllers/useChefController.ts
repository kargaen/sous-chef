import { useState } from "react";
import { ChefProfileRepository } from "../models/repositories/ChefProfileRepository";
import { ChefProfileSchema } from "../models/schemas/ChefProfileSchema";
import type { ChefProfile, SkillLevel } from "../models/types";
import { HabitService } from "../services/HabitService";
import { useChefProfileStore } from "../store/chefProfileStore";
import { createLogger } from "../utils/logger";

const log = createLogger("useChefController");

const repo = new ChefProfileRepository();
const DEFAULT_CURRENCY = "USD";

interface SaveChefProfileDraftInput {
  name: string;
  region: string;
  skillLevel: SkillLevel;
  preferences: {
    dietary: string[];
    dislikedIngredients: string[];
  };
}

export const useChefController = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { profile, setProfile, updateProfile, setOnboardingComplete } =
    useChefProfileStore();

  const loadProfile = async (): Promise<void> => {
    log.debug("Loading chef profile");
    setLoading(true);
    setError(null);

    try {
      const loadedProfile = await repo.get();
      if (loadedProfile) {
        log.info("Chef profile loaded", { name: loadedProfile.name, skillLevel: loadedProfile.skillLevel });
        setProfile(loadedProfile);
      } else {
        log.info("No chef profile found — first run or reset");
      }
    } catch (error) {
      log.error("Could not load chef profile", error);
      setError("Could not load profile.");
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async (input: ChefProfile): Promise<void> => {
    log.info("Saving chef profile", { name: input.name });
    setLoading(true);
    try {
      const validated = ChefProfileSchema.parse(input);
      await repo.save(validated);
      setProfile(validated);
      log.info("Chef profile saved", { id: validated.id });
    } catch (error) {
      log.error("Could not save chef profile", error);
      setError("Could not save profile.");
    } finally {
      setLoading(false);
    }
  };

  const saveProfileDraft = async (
    input: SaveChefProfileDraftInput,
  ): Promise<void> => {
    log.info("Saving chef profile draft", { name: input.name, skillLevel: input.skillLevel });
    setLoading(true);
    setError(null);

    try {
      const currentProfile = (await repo.get()) ?? profile;
      const nextProfile = ChefProfileSchema.parse({
        id: currentProfile?.id ?? `chef_${Date.now()}`,
        name: input.name.trim(),
        skillLevel: input.skillLevel,
        preferences: {
          dietary: input.preferences.dietary,
          dislikedIngredients: input.preferences.dislikedIngredients,
          cuisinePreferences:
            currentProfile?.preferences.cuisinePreferences ?? [],
        },
        region: input.region.trim(),
        currency: currentProfile?.currency ?? DEFAULT_CURRENCY,
        createdAt: currentProfile?.createdAt ?? new Date().toISOString(),
      });

      await repo.save(nextProfile);
      setProfile(nextProfile);
      log.info("Chef profile draft saved", { id: nextProfile.id });
    } catch (error) {
      log.error("Could not save chef profile draft", error);
      setError("Could not save profile.");
    } finally {
      setLoading(false);
    }
  };

  const updateField = async (partial: Partial<ChefProfile>): Promise<void> => {
    log.debug("Updating profile field", { keys: Object.keys(partial) });
    setError(null);

    try {
      const current = await repo.get();
      if (!current) return;
      const updated = { ...current, ...partial };
      await repo.save(updated);
      updateProfile(partial);
    } catch (error) {
      log.error("Could not update chef profile field", error);
      setError("Could not update profile.");
    }
  };

  const completeOnboarding = async (profile: ChefProfile): Promise<void> => {
    await saveProfile(profile);
    setOnboardingComplete(true);
    HabitService.record("pantry_item_added");
  };

  const clearProfile = async (): Promise<void> => {
    await repo.clear();
    useChefProfileStore.getState().clear();
  };

  return {
    profile,
    loadProfile,
    saveProfile,
    saveProfileDraft,
    updateField,
    completeOnboarding,
    clearProfile,
    loading,
    error,
  };
};
