import { useState } from "react";

// View-local state for the free-text field: holds the draft, exposes whether it
// can submit, and clears on submit. No domain logic — generation is the parent's.
export const useGenerationZone = (onSubmitText: (text: string) => void) => {
  const [text, setText] = useState("");
  const canSubmit = text.trim().length > 0;

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (trimmed.length === 0) return;
    onSubmitText(trimmed);
    setText("");
  };

  return { text, setText, canSubmit, handleSubmit };
};
