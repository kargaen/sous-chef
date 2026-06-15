import { create } from "zustand";

import type { SuggestionContext } from "../models/types";

export interface PendingExternalPrompt {
  question: string;
  context: SuggestionContext | null;
}

interface AssistantExternalPromptState {
  pendingPrompt: PendingExternalPrompt | null;
  setPendingPrompt: (p: PendingExternalPrompt | null) => void;
}

export const useAssistantExternalPromptStore =
  create<AssistantExternalPromptState>()((set) => ({
    pendingPrompt: null,
    setPendingPrompt: (p) => set({ pendingPrompt: p }),
  }));
