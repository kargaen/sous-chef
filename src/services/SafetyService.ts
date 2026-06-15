import {
  buildOutputScannerPrompt,
  buildSafetyClassifierPrompt,
} from "@/prompts/safetyTiers";

import { LLMService } from "./LLMService";

export type SafetyClassification = "SAFE" | "OFF_TOPIC" | "T2" | "T0";

export const SafetyService = {
  classify: async (question: string): Promise<SafetyClassification> => {
    try {
      const response = await LLMService.send({
        system: buildSafetyClassifierPrompt(),
        messages: [{ role: "user", content: question }],
      });

      const label = response.content.trim().toUpperCase();

      if (label === "T0") return "T0";
      if (label === "T2") return "T2";
      if (label === "OFF_TOPIC") return "OFF_TOPIC";
      return "SAFE";
    } catch {
      // Fail open — don't block the user when the classifier itself errors
      return "SAFE";
    }
  },

  scanOutput: async (response: string): Promise<boolean> => {
    try {
      const result = await LLMService.send({
        system: buildOutputScannerPrompt(),
        messages: [{ role: "user", content: response }],
      });
      return result.content.trim().toUpperCase() === "BLOCK";
    } catch {
      // Fail open — don't suppress valid responses when the scanner errors
      return false;
    }
  },
};
