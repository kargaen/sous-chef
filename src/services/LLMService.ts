import type { LLMRequest, LLMResponse } from "../models/api/llmApi";
import { llmApi } from "../models/api/llmApi";
import { createLogger } from "../utils/logger";

const log = createLogger("LLMService");

export type LLMCallPriority = "user" | "background";

type LLMAvailability = "available" | "exhausted";
type LLMAvailabilityListener = (availability: LLMAvailability) => void;

const listeners = new Set<LLMAvailabilityListener>();

const notifyAvailability = (availability: LLMAvailability) => {
  listeners.forEach((listener) => {
    listener(availability);
  });
};

// --- Priority queue ---

interface PendingCall {
  priority: LLMCallPriority;
  run: () => Promise<void>;
}

const queue: PendingCall[] = [];
let processing = false;

function enqueue(priority: LLMCallPriority, run: () => Promise<void>): void {
  queue.push({ priority, run });
  void pump();
}

async function pump(): Promise<void> {
  if (processing) return;
  processing = true;
  while (queue.length > 0) {
    // User calls jump ahead of background calls.
    const idx = queue.findIndex((c) => c.priority === "user");
    const next = queue.splice(idx !== -1 ? idx : 0, 1)[0]!;
    await next.run();
  }
  processing = false;
}

// --- Service ---

export const LLMService = {
  subscribeAvailability: (listener: LLMAvailabilityListener) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  send: (request: LLMRequest, priority: LLMCallPriority = "user"): Promise<LLMResponse> => {
    return new Promise<LLMResponse>((resolve, reject) => {
      enqueue(priority, async () => {
        log.debug("LLM send", {
          priority,
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
          resolve(response);
        } catch (error) {
          log.error("LLM send failed", error);
          notifyAvailability("exhausted");
          reject(error);
        }
      });
    });
  },

  stream: (
    request: LLMRequest,
    onChunk: (chunk: string) => void,
    priority: LLMCallPriority = "user",
  ): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
      enqueue(priority, async () => {
        log.debug("LLM stream start", {
          priority,
          systemLength: request.system?.length ?? 0,
          messages: request.messages.length,
        });
        const start = Date.now();
        try {
          await llmApi.stream(request, onChunk);
          log.info("LLM stream complete", { ms: Date.now() - start });
          notifyAvailability("available");
          resolve();
        } catch (error) {
          log.error("LLM stream failed", error);
          notifyAvailability("exhausted");
          reject(error);
        }
      });
    });
  },
};
