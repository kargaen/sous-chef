import { create } from "zustand";
import type {
  AssistantPromptSuggestion,
  AssistantScope,
  AssistantSession,
  Message,
  NudgeCard,
  SuggestionContext,
} from "../models/types";

const createTimestamp = (): string => new Date().toISOString();

const createSessionId = (): string => `session_${Date.now()}`;

const createGlobalScope = (): AssistantScope => ({
  kind: "global",
  label: "Sous Chef",
});

const inferScopeFromSuggestionContext = (
  context: SuggestionContext | null,
): AssistantScope | null => {
  if (!context) {
    return null;
  }

  if (context.scope) {
    return context.scope;
  }

  if (context.recipeId) {
    return {
      kind: "recipe",
      recipeId: context.recipeId,
      label: context.recipeTitle,
    };
  }

  if (context.pantryItemIds?.length) {
    return {
      kind: "pantry",
      pantryItemIds: context.pantryItemIds,
    };
  }

  return null;
};

const createSessionState = () => {
  const timestamp = createTimestamp();

  return {
    activeSessionId: createSessionId(),
    sessionStartedAt: timestamp,
    sessionLastUpdatedAt: timestamp,
    activeScope: createGlobalScope(),
    promptSuggestions: [] as AssistantPromptSuggestion[],
  };
};

// Not persisted â€” the shared assistant session resets between app sessions by design
interface ConversationState {
  activeSessionId: string;
  sessionStartedAt: string;
  sessionLastUpdatedAt: string;
  activeScope: AssistantScope;
  promptSuggestions: AssistantPromptSuggestion[];
  messages: Message[];
  activeNudges: NudgeCard[];
  suggestionContext: SuggestionContext | null;
  isStreaming: boolean;
  getActiveSession: () => AssistantSession;
  addMessage: (message: Message) => void;
  appendToLastMessage: (chunk: string) => void;
  setMessages: (messages: Message[]) => void;
  setActiveNudges: (nudges: NudgeCard[]) => void;
  setSuggestionContext: (context: SuggestionContext | null) => void;
  setActiveScope: (scope: AssistantScope) => void;
  setPromptSuggestions: (suggestions: AssistantPromptSuggestion[]) => void;
  setIsStreaming: (value: boolean) => void;
  clear: () => void;
}

export const useConversationStore = create<ConversationState>()((set, get) => ({
  ...createSessionState(),
  messages: [],
  activeNudges: [],
  suggestionContext: null,
  isStreaming: false,

  getActiveSession: () => {
    const state = get();

    return {
      id: state.activeSessionId,
      startedAt: state.sessionStartedAt,
      lastUpdatedAt: state.sessionLastUpdatedAt,
      activeScope: state.activeScope,
      messages: state.messages,
      promptSuggestions: state.promptSuggestions,
    };
  },

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
      sessionLastUpdatedAt: createTimestamp(),
    })),

  // Appends a streamed chunk to the last message in place
  appendToLastMessage: (chunk) =>
    set((state) => {
      const messages = [...state.messages];
      const last = messages[messages.length - 1];
      if (!last || last.role !== "assistant") return state;
      messages[messages.length - 1] = {
        ...last,
        content: last.content + chunk,
      };
      return { messages, sessionLastUpdatedAt: createTimestamp() };
    }),

  setMessages: (messages) =>
    set({ messages, sessionLastUpdatedAt: createTimestamp() }),

  setActiveNudges: (nudges) => set({ activeNudges: nudges }),

  setSuggestionContext: (context) =>
    set((state) => {
      const inferredScope = inferScopeFromSuggestionContext(context);

      if (!context) {
        return {
          suggestionContext: null,
          activeScope: createGlobalScope(),
          promptSuggestions: [],
          sessionLastUpdatedAt: createTimestamp(),
        };
      }

      return {
        suggestionContext: context,
        activeScope: inferredScope ?? state.activeScope,
        promptSuggestions: context.promptSuggestions ?? state.promptSuggestions,
        sessionLastUpdatedAt: createTimestamp(),
      };
    }),

  setActiveScope: (scope) =>
    set({ activeScope: scope, sessionLastUpdatedAt: createTimestamp() }),

  setPromptSuggestions: (suggestions) =>
    set({
      promptSuggestions: suggestions,
      sessionLastUpdatedAt: createTimestamp(),
    }),

  setIsStreaming: (value) => set({ isStreaming: value }),

  clear: () =>
    set({
      ...createSessionState(),
      messages: [],
      activeNudges: [],
      suggestionContext: null,
      isStreaming: false,
    }),
}));
