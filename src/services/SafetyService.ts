import {
  buildOutputScannerPrompt,
  buildSafetyClassifierPrompt,
} from "@/prompts/safetyTiers";
import { createLogger } from "@/utils/logger";

import { LLMService } from "./LLMService";

const log = createLogger("SafetyService");

export type SafetyClassification = "SAFE" | "OFF_TOPIC" | "T2" | "T0";

export const SafetyService = {
  classify: async (question: string): Promise<SafetyClassification> => {
    log.debug("Classifying input", { length: question.length });
    try {
      const response = await LLMService.send({
        system: buildSafetyClassifierPrompt(),
        messages: [{ role: "user", content: question }],
      });

      const label = response.content.trim().toUpperCase();

      if (label === "T0") {
        log.warn("Input classified T0 — hard block", { question: question.slice(0, 80) });
        return "T0";
      }
      if (label === "T2") {
        log.info("Input classified T2", { question: question.slice(0, 80) });
        return "T2";
      }
      if (label === "OFF_TOPIC") {
        log.info("Input classified OFF_TOPIC");
        return "OFF_TOPIC";
      }
      log.debug("Input classified SAFE");
      return "SAFE";
    } catch (error) {
      // Fail open — don't block the user when the classifier itself errors
      log.error("Safety classifier error — failing open", error);
      return "SAFE";
    }
  },

  scanOutput: async (response: string): Promise<boolean> => {
    log.debug("Scanning output", { length: response.length });
    try {
      const result = await LLMService.send({
        system: buildOutputScannerPrompt(),
        messages: [{ role: "user", content: response }],
      });
      const shouldBlock = result.content.trim().toUpperCase() === "BLOCK";
      if (shouldBlock) {
        log.warn("Output scanner blocked response");
      } else {
        log.debug("Output scanner passed");
      }
      return shouldBlock;
    } catch (error) {
      // Fail open — don't suppress valid responses when the scanner errors
      log.error("Output scanner error — failing open", error);
      return false;
    }
  },
};
