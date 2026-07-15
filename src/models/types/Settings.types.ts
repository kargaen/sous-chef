export type SustainabilityNudgeLevel =
  | "off"
  | "subtle"
  | "default"
  | "prominent";

export type AssistantOutputLanguage = string;

export type PantryNudgeFrequency = "daily" | "weekly" | "monthly" | "rarely";

export interface AppSettings {
  geminiApiKey: string;
  keepScreenOn: boolean;
  sustainabilityNudges: SustainabilityNudgeLevel;
  learnFromChats: boolean;
  assistantOutputLanguage?: AssistantOutputLanguage;
  skipSafetyLayer1: boolean;
  weekStartDay?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  defaultPlanLength?: number;
  pantryNudgeFrequency?: PantryNudgeFrequency;
  geminiModel?: string;
  onboardingCompleted?: boolean;
}
