import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import type { TextInputProps } from "react-native";

import { useRecipeController } from "@/controllers";
import { useRecipeDraftStore } from "@/store";
import { useSafeBack } from "@/views/hooks/useSafeBack";

type RecipeSourceMode = "url" | "idea" | "paste";

const SOURCE_OPTIONS: { key: RecipeSourceMode; label: string }[] = [
  { key: "url", label: "From URL" },
  { key: "idea", label: "Idea" },
  { key: "paste", label: "Paste text" },
];

const SOURCE_LABELS: Record<RecipeSourceMode, string> = {
  url: "Recipe URL",
  idea: "Recipe idea",
  paste: "Pasted text",
};

const SOURCE_PLACEHOLDERS: Record<RecipeSourceMode, string> = {
  url: "https://...",
  idea: "A rough idea, dish concept, or flavor direction...",
  paste: "Paste recipe text, notes, or a clipping from anywhere...",
};

const SOURCE_HELPER_TEXT: Record<RecipeSourceMode, string> = {
  url: "Paste a recipe link and review the imported source before saving.",
  idea: "Start from a rough concept and turn it into a draft you can refine.",
  paste: "Drop in recipe text from notes, messages, or anywhere else.",
};

const EMPTY_SOURCE_INPUTS: Record<RecipeSourceMode, string> = {
  url: "",
  idea: "",
  paste: "",
};

export const useNewRecipeScreenView = () => {
  const router = useRouter();
  const goBack = useSafeBack();
  const params = useLocalSearchParams<{ cookbookId?: string; seed?: string }>();
  const { getClipboardRecipeSourceSuggestion, importRecipeSource } =
    useRecipeController();
  const setDraft = useRecipeDraftStore((s) => s.setDraft);

  // A seed handed in from Discover (a spark, produce, theme, or leftover idea)
  // pre-fills the "Idea" mode so the cook lands ready to generate.
  const seededIdea = typeof params.seed === "string" ? params.seed.trim() : "";

  const [sourceMode, setSourceMode] = useState<RecipeSourceMode>(
    seededIdea ? "idea" : "url",
  );
  const [isImportingSource, setIsImportingSource] = useState(false);
  // Skip the clipboard auto-suggestion when we already have a Discover seed, so
  // it doesn't clobber the pre-filled idea.
  const [hasCheckedClipboard, setHasCheckedClipboard] = useState(
    Boolean(seededIdea),
  );
  const [sourceInputs, setSourceInputs] = useState<
    Record<RecipeSourceMode, string>
  >(
    seededIdea
      ? { ...EMPTY_SOURCE_INPUTS, idea: seededIdea }
      : EMPTY_SOURCE_INPUTS,
  );
  const [sourceFeedback, setSourceFeedback] = useState<string | null>(
    seededIdea ? "Starting from your Discover idea." : null,
  );

  const sourceInput = sourceInputs[sourceMode];
  const canImportSource = sourceInput.trim().length > 0 && !isImportingSource;
  const isSourceInputMultiline = sourceMode !== "url";
  const sourceInputAutoCapitalize: TextInputProps["autoCapitalize"] =
    sourceMode === "url" ? "none" : "sentences";

  useFocusEffect(
    useCallback(() => {
      if (hasCheckedClipboard) return;

      let isActive = true;

      void (async () => {
        const suggestion = await getClipboardRecipeSourceSuggestion();
        if (!isActive) return;

        if (suggestion.kind === "url" && suggestion.value) {
          setSourceMode("url");
          setSourceInputs((current) => ({ ...current, url: suggestion.value ?? "" }));
          setSourceFeedback("Recipe link picked up from your clipboard.");
          setHasCheckedClipboard(true);
          return;
        }

        if (suggestion.kind === "paste" && suggestion.value) {
          setSourceMode("paste");
          setSourceInputs((current) => ({
            ...current,
            paste: suggestion.value ?? "",
          }));
          setSourceFeedback("Pasted recipe text picked up from your clipboard.");
          setHasCheckedClipboard(true);
          return;
        }

        setHasCheckedClipboard(true);
      })();

      return () => {
        isActive = false;
      };
    }, [getClipboardRecipeSourceSuggestion, hasCheckedClipboard]),
  );

  const handleImportSource = async () => {
    const trimmedSource = sourceInput.trim();
    if (!trimmedSource) return;

    setIsImportingSource(true);

    try {
      const imported = await importRecipeSource({ sourceMode, source: trimmedSource });
      if (!imported) return;

      setDraft({
        title: imported.title,
        ingredientsText: imported.ingredientsText,
        stepsText: imported.stepsText,
        notes: imported.notes ?? "",
        cookbookId: params.cookbookId ?? null,
        servings: imported.servings,
        prepMinutes: imported.prepMinutes,
        cookMinutes: imported.cookMinutes,
        estimatedCost: imported.estimatedCost,
      });

      router.push("/(tabs)/recipes/draft");
    } finally {
      setIsImportingSource(false);
    }
  };

  const handleCancel = goBack;

  return useMemo(
    () => ({
      canImportSource,
      handleCancel,
      handleImportSource,
      isImportingSource,
      isSourceInputMultiline,
      importMaskLabel: "Importing recipe source...",
      setSourceInput: (value: string) => {
        setSourceFeedback(null);
        setSourceInputs((current) => ({ ...current, [sourceMode]: value }));
      },
      setSourceMode: (mode: RecipeSourceMode) => {
        setSourceFeedback(null);
        setSourceMode(mode);
      },
      sourceHelperText: SOURCE_HELPER_TEXT[sourceMode],
      sourceFeedback,
      sourceInput,
      sourceInputAutoCapitalize,
      sourceInputLabel: SOURCE_LABELS[sourceMode],
      sourceInputPlaceholder: SOURCE_PLACEHOLDERS[sourceMode],
      sourceMode,
      sourceOptions: SOURCE_OPTIONS,
    }),
    [
      canImportSource,
      isImportingSource,
      isSourceInputMultiline,
      sourceFeedback,
      sourceInput,
      sourceInputAutoCapitalize,
      sourceMode,
      router,
    ],
  );
};
