import type { LLMProvider, LLMRequest, LLMResponse } from "../llmApi";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = "gpt-4o";

const getApiKey = () => process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? "";

export const openaiProvider: LLMProvider = {
  send: async (request: LLMRequest): Promise<LLMResponse> => {
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getApiKey()}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: request.system },
          ...request.messages,
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI request failed: ${response.status}`);
    }

    const data = await response.json();
    return { content: data.choices[0].message.content };
  },

  stream: async (
    request: LLMRequest,
    onChunk: (chunk: string) => void,
  ): Promise<void> => {
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getApiKey()}`,
      },
      body: JSON.stringify({
        model: MODEL,
        stream: true,
        messages: [
          { role: "system", content: request.system },
          ...request.messages,
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI stream failed: ${response.status}`);
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
          const chunk = parsed?.choices?.[0]?.delta?.content;
          if (chunk) onChunk(chunk);
        } catch {
          // malformed chunk, skip
        }
      }
    }
  },
};
