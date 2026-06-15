import { z } from "zod";

export const SustainabilityNudgeLevelSchema = z.enum([
  "off",
  "subtle",
  "default",
  "prominent",
]);

export const AssistantOutputLanguageSchema = z.string().min(1);

export const AppSettingsSchema = z.object({
  geminiApiKey: z.string(),
  keepScreenOn: z.boolean(),
  sustainabilityNudges: SustainabilityNudgeLevelSchema,
  learnFromChats: z.boolean(),
  assistantOutputLanguage: AssistantOutputLanguageSchema,
  skipSafetyLayer1: z.boolean(),
});

export type AppSettingsInput = z.infer<typeof AppSettingsSchema>;
