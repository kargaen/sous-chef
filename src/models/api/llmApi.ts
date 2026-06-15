import type { Message } from "../types";
import { googleProvider } from "./llm/google";

// Every provider must implement this interface.
// The rest of the app only ever talks to this shape.
export interface LLMProvider {
  send: (request: LLMRequest) => Promise<LLMResponse>;
  stream: (
    request: LLMRequest,
    onChunk: (chunk: string) => void,
  ) => Promise<void>;
}

export interface LLMRequest {
  system: string;
  messages: Pick<Message, "role" | "content">[];
}

export interface LLMResponse {
  content: string;
}

// To switch providers, change this one line.
// Future: derive from env var e.g. process.env.EXPO_PUBLIC_LLM_PROVIDER
const activeProvider: LLMProvider = googleProvider;

export const llmApi: LLMProvider = activeProvider;
