import { DEFAULT_SETTINGS } from "../defaults/default_settings";
import { AppSettingsSchema } from "../schemas/SettingsSchema";
import type { AppSettings } from "../types";
import { StorageService } from "@/services/StorageService";

const SETTINGS_STORAGE_KEY = "app_settings";

// A settings blob saved before the onboardingCompleted field existed belongs to
// a user who was already using the app — treat them as onboarded so the update
// that adds the first-run gate (EPIC-007) doesn't send them back through the
// wizard. A genuinely fresh install has no blob at all, so it still onboards.
const legacyBlobPredatesOnboarding = (raw: string): boolean => {
  try {
    const parsed: unknown = JSON.parse(raw);
    return isObjectRecord(parsed) && !("onboardingCompleted" in parsed);
  } catch {
    return false;
  }
};

const isObjectRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const cloneDefaultSettings = (): AppSettings => {
  return JSON.parse(JSON.stringify(DEFAULT_SETTINGS)) as AppSettings;
};

const mergeWithDefaultShape = (
  candidate: unknown,
  template: unknown,
): { value: unknown; wasUpgraded: boolean } | null => {
  if (Array.isArray(template)) {
    return Array.isArray(candidate)
      ? { value: candidate, wasUpgraded: false }
      : null;
  }

  if (isObjectRecord(template)) {
    if (!isObjectRecord(candidate)) {
      return null;
    }

    const mergedEntries = Object.entries(template).map(([key, value]) => {
      if (!(key in candidate)) {
        return {
          key,
          value,
          wasUpgraded: true,
        };
      }

      const mergedChild = mergeWithDefaultShape(candidate[key], value);

      if (!mergedChild) {
        return null;
      }

      return {
        key,
        value: mergedChild.value,
        wasUpgraded: mergedChild.wasUpgraded,
      };
    });

    if (mergedEntries.some((entry) => entry === null)) {
      return null;
    }

    const validEntries = mergedEntries as {
      key: string;
      value: unknown;
      wasUpgraded: boolean;
    }[];

    return {
      value: Object.fromEntries(
        validEntries.map((entry) => [entry.key, entry.value]),
      ),
      wasUpgraded: validEntries.some((entry) => entry.wasUpgraded),
    };
  }

  return typeof candidate === typeof template
    ? { value: candidate, wasUpgraded: false }
    : null;
};

const parseStoredSettings = (
  raw: string | null,
): { settings: AppSettings; wasUpgraded: boolean } | null => {
  if (raw === null) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    const mergedSettings = mergeWithDefaultShape(parsed, DEFAULT_SETTINGS);

    if (!mergedSettings) {
      return null;
    }

    const validatedSettings = AppSettingsSchema.safeParse(mergedSettings.value);

    if (!validatedSettings.success) {
      return null;
    }

    return {
      settings: validatedSettings.data,
      wasUpgraded: mergedSettings.wasUpgraded,
    };
  } catch {
    return null;
  }
};

export class SettingsRepository {
  async get(): Promise<AppSettings> {
    const raw = await StorageService.storageGetItem(SETTINGS_STORAGE_KEY);
    const storedSettings = parseStoredSettings(raw);

    if (storedSettings) {
      const needsOnboardingMigration =
        raw !== null &&
        !storedSettings.settings.onboardingCompleted &&
        legacyBlobPredatesOnboarding(raw);

      const settings = needsOnboardingMigration
        ? { ...storedSettings.settings, onboardingCompleted: true }
        : storedSettings.settings;

      if (storedSettings.wasUpgraded || needsOnboardingMigration) {
        await this.save(settings);
      }

      return settings;
    }

    return this.reset();
  }

  async save(settings: AppSettings): Promise<AppSettings> {
    const validatedSettings = AppSettingsSchema.safeParse(settings);

    if (!validatedSettings.success) {
      throw new Error("Settings object does not match the app settings schema.");
    }

    await StorageService.storageSetItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify(validatedSettings.data),
    );

    return validatedSettings.data;
  }

  async reset(): Promise<AppSettings> {
    const defaultSettings = cloneDefaultSettings();
    await StorageService.storageRemoveItem(SETTINGS_STORAGE_KEY);
    await StorageService.storageSetItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify(defaultSettings),
    );
    return defaultSettings;
  }
}
