import { create } from "zustand";

import type { SuggestionContext } from "../models/types";

interface AssistantRouteContextState {
  routeContext: SuggestionContext | null;
  setRouteContext: (context: SuggestionContext | null) => void;
}

export const useAssistantRouteContextStore =
  create<AssistantRouteContextState>()((set) => ({
    routeContext: null,
    setRouteContext: (context) => set({ routeContext: context }),
  }));
