import type { LLMRequest, LLMResponse } from "../models/api/llmApi";
import { llmApi } from "../models/api/llmApi";
import { createLogger } from "../utils/logger";

const log = createLogger("LLMService");

export type LLMCallPriority = "user" | "background";

export interface LLMSendCallbacks {
  onQueued?: () => void;
  onRateLimited?: () => void;
}

type LLMAvailability = "available" | "exhausted";
type LLMAvailabilityListener = (availability: LLMAvailability) => void;

const listeners = new Set<LLMAvailabilityListener>();

const notifyAvailability = (availability: LLMAvailability) => {
  listeners.forEach((listener) => {
    listener(availability);
  });
};

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// --- Priority queue ---

interface PendingCall {
  priority: LLMCallPriority;
  run: () => Promise<void>;
}

const queue: PendingCall[] = [];
let processing = false;
let currentRunningPriority: LLMCallPriority | null = null;

const hasUserCallActive = () =>
  (processing && currentRunningPriority === "user") ||
  queue.some((c) => c.priority === "user");

function enqueue(priority: LLMCallPriority, run: () => Promise<void>): void {
  queue.push({ priority, run });
  void pump();
}

async function pump(): Promise<void> {
  if (processing) return;
  processing = true;
  while (queue.length > 0) {
    const idx = queue.findIndex((c) => c.priority === "user");
    const next = queue.splice(idx !== -1 ? idx : 0, 1)[0]!;
    currentRunningPriority = next.priority;
    await next.run();
  }
  currentRunningPriority = null;
  processing = false;
}

const RATE_LIMIT_RETRY_DELAY_MS = 20_000;
const MAX_USER_RATE_LIMIT_RETRIES = 2;

// --- Service ---

export const LLMService = {
  subscribeAvailability: (listener: LLMAvailabilityListener) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  send: (
    request: LLMRequest,
    priority: LLMCallPriority = "user",
    callbacks?: LLMSendCallbacks,
  ): Promise<LLMResponse> => {
    return new Promise<LLMResponse>((resolve, reject) => {
      let rateLimitRetries = 0;

      const attempt = (isRetry = false) => {
        if (!isRetry && priority === "user" && hasUserCallActive()) {
          callbacks?.onQueued?.();
        }

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
            const is429 =
              error instanceof Error && error.message.includes("429");

            if (
              is429 &&
              priority === "user" &&
              rateLimitRetries < MAX_USER_RATE_LIMIT_RETRIES
            ) {
              rateLimitRetries++;
              log.info("LLM rate limited — retrying", {
                attempt: rateLimitRetries,
                delayMs: RATE_LIMIT_RETRY_DELAY_MS,
              });
              callbacks?.onRateLimited?.();
              await sleep(RATE_LIMIT_RETRY_DELAY_MS);
              attempt(true);
            } else {
              log.error("LLM send failed", error);
              notifyAvailability("exhausted");
              reject(error);
            }
          }
        });
      };

      attempt();
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
