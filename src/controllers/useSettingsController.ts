import { useState } from "react";
import { SettingsRepository } from "../models/repositories";
import type { AppSettings } from "../models/types";
import { useSettingsStore } from "../store/settingsStore";

const repo = new SettingsRepository();

export const useSettingsController = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { settings, hasLoaded, setSettings, updateSettings, clearSettings } =
    useSettingsStore();

  const loadSettings = async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const loadedSettings = await repo.get();
      setSettings(loadedSettings);
    } catch {
      setError("Could not load settings.");
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (input: AppSettings): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const savedSettings = await repo.save(input);
      setSettings(savedSettings);
    } catch {
      setError("Could not save settings.");
    } finally {
      setLoading(false);
    }
  };

  const updateField = async (partial: Partial<AppSettings>): Promise<void> => {
    setError(null);

    try {
      const currentSettings = settings ?? (await repo.get());
      const updatedSettings = { ...currentSettings, ...partial };
      const savedSettings = await repo.save(updatedSettings);

      updateSettings(partial);
      setSettings(savedSettings);
    } catch {
      setError("Could not update settings.");
    }
  };

  const resetSettings = async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const resetSettingsValue = await repo.reset();
      setSettings(resetSettingsValue);
    } catch {
      setError("Could not reset settings.");
    } finally {
      setLoading(false);
    }
  };

  const clearRuntimeSettings = (): void => {
    clearSettings();
  };

  return {
    settings,
    hasLoaded,
    loadSettings,
    saveSettings,
    updateField,
    resetSettings,
    clearRuntimeSettings,
    loading,
    error,
  };
};
