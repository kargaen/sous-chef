import { useState } from "react";
import { SettingsRepository } from "../models/repositories";
import type { AppSettings } from "../models/types";
import { useSettingsStore } from "../store/settingsStore";
import { createLogger } from "../utils/logger";

const log = createLogger("useSettingsController");

const repo = new SettingsRepository();

export const useSettingsController = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { settings, hasLoaded, setSettings, updateSettings, clearSettings } =
    useSettingsStore();

  const loadSettings = async (): Promise<void> => {
    log.debug("Loading settings");
    setLoading(true);
    setError(null);

    try {
      const loadedSettings = await repo.get();
      setSettings(loadedSettings);
      log.debug("Settings loaded");
    } catch (error) {
      log.error("Could not load settings", error);
      setError("Could not load settings.");
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (input: AppSettings): Promise<void> => {
    log.info("Saving settings");
    setLoading(true);
    setError(null);

    try {
      const savedSettings = await repo.save(input);
      setSettings(savedSettings);
      log.info("Settings saved");
    } catch (error) {
      log.error("Could not save settings", error);
      setError("Could not save settings.");
    } finally {
      setLoading(false);
    }
  };

  const updateField = async (partial: Partial<AppSettings>): Promise<void> => {
    log.debug("Updating settings field", { keys: Object.keys(partial) });
    setError(null);

    try {
      const currentSettings = settings ?? (await repo.get());
      const updatedSettings = { ...currentSettings, ...partial };
      const savedSettings = await repo.save(updatedSettings);

      updateSettings(partial);
      setSettings(savedSettings);
    } catch (error) {
      log.error("Could not update settings field", error);
      setError("Could not update settings.");
    }
  };

  const resetSettings = async (): Promise<void> => {
    log.info("Resetting settings to defaults");
    setLoading(true);
    setError(null);

    try {
      const resetSettingsValue = await repo.reset();
      setSettings(resetSettingsValue);
      log.info("Settings reset complete");
    } catch (error) {
      log.error("Could not reset settings", error);
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
