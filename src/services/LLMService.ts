import type { LLMRequest, LLMResponse } from "../models/api/llmApi";
import { llmApi } from "../models/api/llmApi";
import { createLogger } from "../utils/logger";

const log = createLogger("LLMService");

type LLMAvailability = "available" | "exhausted";
type LLMAvailabilityListener = (availability: LLMAvailability) => void;

const listeners = new Set<LLMAvailabilityListener>();

const notifyAvailability = (availability: LLMAvailability) => {
  listeners.forEach((listener) => {
    listener(availability);
  });
};

export const LLMService = {
  subscribeAvailability: (listener: LLMAvailabilityListener) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  send: async (request: LLMRequest): Promise<LLMResponse> => {
    log.debug("LLM send", {
      systemLength: request.system?.length ?? 0,
      messages: request.messages.length,
    });
    const start = Date.now();
    try {
      const response = await llmApi.send(request);
      log.info("LLM response received", {
        ms: Date.now() - start,
        responseLength: response.content.length,
      });
      notifyAvailability("available");
      return response;
    } catch (error) {
      log.error("LLM send failed", error);
      notifyAvailability("exhausted");
      throw error;
    }
  },

  stream: async (
    request: LLMRequest,
    onChunk: (chunk: string) => void,
  ): Promise<void> => {
    log.debug("LLM stream start", {
      systemLength: request.system?.length ?? 0,
      messages: request.messages.length,
    });
    const start = Date.now();
    try {
      await llmApi.stream(request, onChunk);
      log.info("LLM stream complete", { ms: Date.now() - start });
      notifyAvailability("available");
    } catch (error) {
      log.error("LLM stream failed", error);
      notifyAvailability("exhausted");
      throw error;
    }
  },
};
