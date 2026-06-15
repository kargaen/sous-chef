import { useState } from "react";

import type { SuggestionContext } from "@/models/types";
import { useAssistantExternalPromptStore } from "@/store";

import { AssistantPromptFieldView } from "./AssistantPromptField.view";

interface AssistantPromptFieldProps {
  /**
   * Explicit context for this field. If omitted, AssistantShell falls back to
   * the currently registered route context (set by the active screen's controller).
   */
  context?: SuggestionContext;
  placeholder?: string;
}

export function AssistantPromptField({
  context,
  placeholder,
}: AssistantPromptFieldProps) {
  const [question, setQuestion] = useState("");
  const setPendingPrompt = useAssistantExternalPromptStore(
    (s) => s.setPendingPrompt,
  );

  const handleSubmit = () => {
    const trimmed = question.trim();
    if (!trimmed) return;
    setPendingPrompt({ question: trimmed, context: context ?? null });
    setQuestion("");
  };

  return (
    <AssistantPromptFieldView
      value={question}
      onChangeText={setQuestion}
      onSubmit={handleSubmit}
      placeholder={placeholder}
    />
  );
}
