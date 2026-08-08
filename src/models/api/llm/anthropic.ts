import type { LLMProvider, LLMRequest, LLMResponse } from "../llmApi";

export const CLAUDE_BASE_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
// Pinned text model. Override per-environment via EXPO_PUBLIC_CLAUDE_MODEL
// (see .env). Keep this a real, accessible model name — not a moving alias —
// so behavior is reproducible across machines.
export const DEFAULT_MODEL = "claude-sonnet-5";
const MAX_TOKENS = 4096;

// Dev-only fallback. In production builds (__DEV__ === false) the env key is
// ignored, so a shipped app can never use the developer's key.
const getApiKey = () =>
  __DEV__ ? (process.env.EXPO_PUBLIC_CLAUDE_API_KEY?.trim() ?? "") : "";
const getModel = () =>
  process.env.EXPO_PUBLIC_CLAUDE_MODEL?.trim() || DEFAULT_MODEL;

const toClaudeBody = (request: LLMRequest, stream: boolean) => ({
  model: getModel(),
  max_tokens: MAX_TOKENS,
  system: request.system,
  messages: request.messages.map((m) => ({ role: m.role, content: m.content })),
  stream,
});

const claudeHeaders = (apiKey: string) => ({
  "Content-Type": "application/json",
  "x-api-key": apiKey,
  "anthropic-version": ANTHROPIC_VERSION,
});

const SEND_TIMEOUT_MS = 45_000;
const MAX_RETRIES = 2;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export const claudeProvider: LLMProvider = {
  send: async (request: LLMRequest): Promise<LLMResponse> => {
    const apiKey = getApiKey();
    const body = JSON.stringify(toClaudeBody(request, false));

    let lastError: unknown;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);

      try {
        const response = await fetch(CLAUDE_BASE_URL, {
          method: "POST",
          headers: claudeHeaders(apiKey),
          body,
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Claude request failed: ${response.status}`);
        }

        const data = await response.json();
        const textBlock = (data.content ?? []).find(
          (block: { type: string; text?: string }) => block.type === "text",
        );
        return { content: textBlock?.text ?? "" };
      } catch (err) {
        lastError = err;
        const isAbort = err instanceof Error && err.name === "AbortError";
        const isRetryable =
          isAbort ||
          (err instanceof Error &&
            (err.message.includes("529") ||
              err.message.includes("500") ||
              err.message.includes("Network request failed")));

        if (isRetryable && attempt < MAX_RETRIES) {
          await sleep(attempt === 0 ? 1500 : 3000);
          continue;
        }

        throw err;
      } finally {
        clearTimeout(timer);
      }
    }

    throw lastError;
  },

  stream: async (
    request: LLMRequest,
    onChunk: (chunk: string) => void,
  ): Promise<void> => {
    const apiKey = getApiKey();
    const response = await fetch(CLAUDE_BASE_URL, {
      method: "POST",
      headers: claudeHeaders(apiKey),
      body: JSON.stringify(toClaudeBody(request, true)),
    });

    if (!response.ok) {
      throw new Error(`Claude stream failed: ${response.status}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    if (!reader) return;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const lines = decoder.decode(value).split("\n").filter(Boolean);
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        try {
          const parsed = JSON.parse(line.replace("data: ", ""));
          if (
            parsed.type === "content_block_delta" &&
            parsed.delta?.type === "text_delta"
          ) {
            onChunk(parsed.delta.text);
          }
        } catch {
          // malformed chunk, skip
        }
      }
    }
  },
};
