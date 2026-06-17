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
  weekStartDay: z.union([
    z.literal(0), z.literal(1), z.literal(2), z.literal(3),
    z.literal(4), z.literal(5), z.literal(6),
  ]).optional().default(1),
  defaultPlanLength: z.number().int().positive().optional().default(7),
  pantryNudgeFrequency: z
    .enum(["daily", "weekly", "monthly", "rarely"])
    .optional()
    .default("monthly"),
});

export type AppSettingsInput = z.infer<typeof AppSettingsSchema>;
