import AsyncStorage from "@react-native-async-storage/async-storage";

import type { LLMProvider, LLMRequest, LLMResponse } from "../llmApi";

export const GEMINI_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta/models";
// Pinned text model. Override per-environment via EXPO_PUBLIC_GEMINI_MODEL
// (see .env). Keep this a real, accessible model name — not a moving alias —
// so behavior is reproducible across machines.
export const DEFAULT_MODEL = "gemini-3.5-flash";
const SETTINGS_STORAGE_KEY = "app_settings";

// Dev-only fallback. In production builds (__DEV__ === false) the env key is
// ignored, so a shipped app can never use the developer's key — every user
// must supply their own via Settings. Keep your key in .env for local dev only;
// do not ship a production build with a real key in EXPO_PUBLIC_GEMINI_API_KEY.
const getEnvApiKey = () =>
  __DEV__ ? (process.env.EXPO_PUBLIC_GEMINI_API_KEY?.trim() ?? "") : "";
const getModel = () =>
  process.env.EXPO_PUBLIC_GEMINI_MODEL?.trim() || DEFAULT_MODEL;

const getStoredApiKey = async (): Promise<string> => {
  try {
    const rawSettings = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);

    if (!rawSettings) {
      return "";
    }

    const parsed = JSON.parse(rawSettings) as { geminiApiKey?: unknown };
    return typeof parsed.geminiApiKey === "string"
      ? parsed.geminiApiKey.trim()
      : "";
  } catch {
    return "";
  }
};

// Shared key resolution: user's stored key first, dev-only env fallback after.
// Exported so the image API uses the exact same resolution.
export const getApiKey = async (): Promise<string> => {
  const storedApiKey = await getStoredApiKey();
  return storedApiKey || getEnvApiKey();
};

const toGeminiMessages = (request: LLMRequest) => ({
  system_instruction: { parts: [{ text: request.system }] },
  contents: request.messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  })),
});

const SEND_TIMEOUT_MS = 45_000;
const MAX_RETRIES = 2;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export const googleProvider: LLMProvider = {
  send: async (request: LLMRequest): Promise<LLMResponse> => {
    const apiKey = await getApiKey();
    const model = getModel();
    const url = `${GEMINI_BASE_URL}/${model}:generateContent?key=${apiKey}`;
    const body = JSON.stringify(toGeminiMessages(request));

    let lastError: unknown;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);

      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          signal: controller.signal,
        });

        if (response.status === 503 || response.status === 429) {
          throw new Error(`Gemini request failed: ${response.status}`);
        }

        if (!response.ok) {
          throw new Error(`Gemini request failed: ${response.status}`);
        }

        const data = await response.json();
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        return { content };
      } catch (err) {
        lastError = err;
        const isAbort =
          err instanceof Error && err.name === "AbortError";
        const isRetryable =
          isAbort ||
          (err instanceof Error &&
            (err.message.includes("503") ||
              err.message.includes("429") ||
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
    const apiKey = await getApiKey();
    const model = getModel();
    const url = `${GEMINI_BASE_URL}/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toGeminiMessages(request)),
    });

    if (!response.ok) {
      throw new Error(`Gemini stream failed: ${response.status}`);
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
          const chunk = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (chunk) onChunk(chunk);
        } catch {
          // malformed chunk, skip
        }
      }
    }
  },
};
