import { create } from "zustand";

export type SousChefCompanionTone = "exhausted" | "happy";
export type SousChefCompanionMode = "message" | "chat";
export type SousChefCompanionChatLayout = "docked" | "expanded";

const EXHAUSTED_MESSAGE =
  "Sous Chef is a little exhausted and taking a well-deserved break. Try again in a moment.";

interface SousChefCompanionAction {
  label: string;
  route: string;
}

interface SousChefCompanionState {
  visible: boolean;
  mode: SousChefCompanionMode;
  chatLayout: SousChefCompanionChatLayout;
  tone: SousChefCompanionTone;
  message: string;
  action: SousChefCompanionAction | null;
  showCompanion: (
    tone: SousChefCompanionTone,
    message: string,
    action?: SousChefCompanionAction | null,
  ) => void;
  showExhausted: (message?: string) => void;
  openChat: (layout?: SousChefCompanionChatLayout) => void;
  expandChat: () => void;
  collapseChat: () => void;
  hideCompanion: () => void;
  clearExhausted: () => void;
}

export const useSousChefCompanionStore = create<SousChefCompanionState>()(
  (set) => ({
    visible: false,
    mode: "message",
    chatLayout: "docked",
    tone: "exhausted",
    message: EXHAUSTED_MESSAGE,
    action: null,

    showCompanion: (tone, message, action = null) =>
      set({
        visible: true,
        mode: "message",
        chatLayout: "docked",
        tone,
        message,
        action,
      }),

    showExhausted: (message) =>
      set({
        visible: true,
        mode: "message",
        chatLayout: "docked",
        tone: "exhausted",
        message: message ?? EXHAUSTED_MESSAGE,
        action: null,
      }),

    openChat: (layout = "docked") =>
      set({
        visible: true,
        mode: "chat",
        chatLayout: layout,
        action: null,
      }),

    expandChat: () =>
      set((state) =>
        state.mode === "chat" ? { chatLayout: "expanded" } : state,
      ),

    collapseChat: () =>
      set((state) =>
        state.mode === "chat" ? { chatLayout: "docked" } : state,
      ),

    hideCompanion: () =>
      set({
        visible: false,
        mode: "message",
        chatLayout: "docked",
        action: null,
      }),

    clearExhausted: () =>
      set((state) =>
        state.visible &&
        state.mode === "message" &&
        state.tone === "exhausted"
          ? {
              visible: false,
              mode: "message",
              chatLayout: "docked",
              action: null,
            }
          : state,
      ),
  }),
);
