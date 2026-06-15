import { useState } from "react";

export type AssistantMode = "launcher" | "expanded";

export interface AssistantShellViewModel {
  mode: AssistantMode;
  open: () => void;
  close: () => void;
}

export function useAssistantShellController(): AssistantShellViewModel {
  const [mode, setMode] = useState<AssistantMode>("launcher");

  return {
    mode,
    open: () => setMode("expanded"),
    close: () => setMode("launcher"),
  };
}
