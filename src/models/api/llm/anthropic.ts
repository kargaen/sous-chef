import type { LLMProvider, LLMRequest, LLMResponse } from "../llmApi";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-20250514";
const MAX_TOKENS = 1024;

export const anthropicProvider: LLMProvider = {
  send: async (request: LLMRequest): Promise<LLMResponse> => {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: request.system,
        messages: request.messages,
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic request failed: ${response.status}`);
    }

    const data = await response.json();
    return { content: data.content[0].text };
  },

  stream: async (
    request: LLMRequest,
    onChunk: (chunk: string) => void,
  ): Promise<void> => {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        stream: true,
        system: request.system,
        messages: request.messages,
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic stream failed: ${response.status}`);
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
        const json = line.replace("data: ", "");
        if (json === "[DONE]") return;
        try {
          const parsed = JSON.parse(json);
          const chunk = parsed?.delta?.text;
          if (chunk) onChunk(chunk);
        } catch {
          // malformed chunk, skip
        }
      }
    }
  },
};
