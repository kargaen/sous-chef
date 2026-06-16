import type { AppSettings } from "../types/Settings.types";

export const DEFAULT_SETTINGS: AppSettings = {
  geminiApiKey: "",
  keepScreenOn: true,
  sustainabilityNudges: "default",
  learnFromChats: true,
  assistantOutputLanguage: "imply",
  skipSafetyLayer1: false,
  weekStartDay: 1,
  defaultPlanLength: 7,
};
