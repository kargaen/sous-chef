import type { LLMRequest, LLMResponse } from "../models/api/llmApi";
import { llmApi } from "../models/api/llmApi";

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
    try {
      const response = await llmApi.send(request);
      notifyAvailability("available");
      return response;
    } catch (error) {
      notifyAvailability("exhausted");
      throw error;
    }
  },

  stream: async (
    request: LLMRequest,
    onChunk: (chunk: string) => void,
  ): Promise<void> => {
    try {
      await llmApi.stream(request, onChunk);
      notifyAvailability("available");
    } catch (error) {
      notifyAvailability("exhausted");
      throw error;
    }
  },
};
