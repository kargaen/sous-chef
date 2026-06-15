// Sentinel value for the assistant output language setting: the model should
// follow the language of the conversation instead of being forced.
export const IMPLY_OUTPUT_LANGUAGE = "imply";

/**
 * Resolve the stored output language setting to a forced language, or
 * undefined when the language should be implied from the conversation
 * (explicit "imply" choice, missing, or blank value).
 */
export const resolveForcedOutputLanguage = (
  value?: string,
): string | undefined => {
  const trimmed = value?.trim();
  if (!trimmed || trimmed.toLowerCase() === IMPLY_OUTPUT_LANGUAGE) {
    return undefined;
  }
  return trimmed;
};
