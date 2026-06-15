export type SustainabilityNudgeLevel =
  | "off"
  | "subtle"
  | "default"
  | "prominent";

export type AssistantOutputLanguage = string;

export interface AppSettings {
  geminiApiKey: string;
  keepScreenOn: boolean;
  sustainabilityNudges: SustainabilityNudgeLevel;
  learnFromChats: boolean;
  assistantOutputLanguage?: AssistantOutputLanguage;
  skipSafetyLayer1: boolean;
}
