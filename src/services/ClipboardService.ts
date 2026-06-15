import * as Clipboard from "expo-clipboard";

const URL_PATTERN = /^(https?:\/\/|www\.)\S+$/i;
const MIN_PASTE_LENGTH = 280;
const MIN_PASTE_LINES = 6;

export type ClipboardRecipeSourceKind = "none" | "url" | "paste";

export interface ClipboardRecipeSourceSuggestion {
  kind: ClipboardRecipeSourceKind;
  value: string | null;
}

const isLikelyUrl = (value: string): boolean => URL_PATTERN.test(value.trim());

const isLikelyLongformPaste = (value: string): boolean => {
  const trimmedValue = value.trim();
  const lineCount = trimmedValue
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean).length;

  return (
    trimmedValue.length >= MIN_PASTE_LENGTH || lineCount >= MIN_PASTE_LINES
  );
};

export const ClipboardService = {
  async getRecipeSourceSuggestion(): Promise<ClipboardRecipeSourceSuggestion> {
    try {
      const hasString = await Clipboard.hasStringAsync();

      if (!hasString) {
        return { kind: "none", value: null };
      }

      const clipboardValue = (await Clipboard.getStringAsync()).trim();

      if (!clipboardValue) {
        return { kind: "none", value: null };
      }

      if (isLikelyUrl(clipboardValue)) {
        return { kind: "url", value: clipboardValue };
      }

      if (isLikelyLongformPaste(clipboardValue)) {
        return { kind: "paste", value: clipboardValue };
      }

      return { kind: "none", value: null };
    } catch {
      return { kind: "none", value: null };
    }
  },
};
