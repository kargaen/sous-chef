import { useState } from "react";

import { AdaptationResponseSchema } from "@/models/schemas";
import type { AdaptationResponse, Recipe } from "@/models/types";
import {
  buildAdaptationPlanPrompt,
  buildAdaptationPrompt,
  buildSystemPrompt,
  resolveForcedOutputLanguage,
} from "@/prompts";
import type { AdaptationConservatism } from "@/prompts";
import { CookLogRepository } from "@/models/repositories/CookLogRepository";
import { RecipeRepository } from "@/models/repositories/RecipeRepository";
import { AdaptationService } from "@/services/AdaptationService";
import { LLMService } from "@/services/LLMService";
import { useChefProfileStore } from "@/store/chefProfileStore";
import { useSettingsStore } from "@/store/settingsStore";

export type AdaptationPhase =
  | "idle"
  | "planning"
  | "ready"
  | "adapting"
  | "adapted"
  | "saved";

export interface AdaptationChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export interface AdaptationQuickAction {
  id: string;
  label: string;
  prefill: string;
}

export interface AdaptationViewModel {
  phase: AdaptationPhase;
  messages: AdaptationChatMessage[];
  draft: string;
  error: string | null;
  result: AdaptationResponse | null;
  quickActions: AdaptationQuickAction[];
  conservatism: AdaptationConservatism;
  setConservatism: (level: AdaptationConservatism) => void;
  onChangeDraft: (text: string) => void;
  onSend: () => Promise<void>;
  onStartAdaptation: () => Promise<void>;
  onSaveVariant: () => Promise<void>;
  isSavingVariant: boolean;
  onReset: () => void;
}

const QUICK_ACTIONS: AdaptationQuickAction[] = [
  { id: "scale", label: "Scale", prefill: "Scale this recipe to serve " },
  {
    id: "healthier",
    label: "Healthier",
    prefill: "Please make this recipe a bit healthier without losing its character.",
  },
  {
    id: "cheaper",
    label: "Cheaper",
    prefill: "Make this recipe cheaper using more affordable ingredients.",
  },
  {
    id: "impress",
    label: "Impress",
    prefill: "Elevate this recipe to impress dinner guests.",
  },
  {
    id: "pantry",
    label: "Use my pantry",
    prefill: "Adapt this recipe to use what I have in my pantry: ",
  },
  {
    id: "faster",
    label: "Faster",
    prefill: "Reduce the prep and cooking time as much as reasonably possible.",
  },
];

// Confirmation intent, only honoured once a plan exists (phase "ready").
const GO_AHEAD_PATTERN =
  /\b(go ahead|do it|proceed|adapt it|make it so|sounds good|yes,? please|kør( på)?|gør det|ja tak|bare gør det)\b/i;

// Extract the outermost JSON object even when the model wraps it in
// fences or commentary.
const extractJsonObject = (value: string): string | null => {
  const start = value.indexOf("{");
  const end = value.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  return value.slice(start, end + 1);
};

const recipeRepository = new RecipeRepository();
const cookLogRepository = new CookLogRepository();

const parseAdaptationResponse = (
  content: string,
): AdaptationResponse | null => {
  const jsonText = extractJsonObject(content);
  if (!jsonText) {
    if (__DEV__) {
      console.warn("[adaptation] no JSON object in response:", content);
    }
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(jsonText);
    const validated = AdaptationResponseSchema.safeParse(parsed);
    if (!validated.success) {
      if (__DEV__) {
        console.warn(
          "[adaptation] schema validation failed:",
          JSON.stringify(validated.error.issues, null, 2),
        );
      }
      return null;
    }
    return validated.data;
  } catch (error) {
    if (__DEV__) {
      console.warn("[adaptation] JSON.parse failed:", error, jsonText);
    }
    return null;
  }
};

export function useAdaptationController(
  recipe: Recipe | null,
): AdaptationViewModel {
  const [phase, setPhase] = useState<AdaptationPhase>("idle");
  const [messages, setMessages] = useState<AdaptationChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AdaptationResponse | null>(null);
  const [conservatism, setConservatism] =
    useState<AdaptationConservatism>("minimal");
  const [isSavingVariant, setIsSavingVariant] = useState(false);

  const profile = useChefProfileStore((s) => s.profile);
  const settings = useSettingsStore((s) => s.settings);
  const forcedLanguage = resolveForcedOutputLanguage(
    settings?.assistantOutputLanguage,
  );

  const appendMessage = (role: "user" | "assistant", content: string) => {
    setMessages((prev) => [
      ...prev,
      { id: `adapt_${Date.now()}_${prev.length}`, role, content },
    ]);
  };

  const collectRequest = (history: AdaptationChatMessage[]): string =>
    history
      .filter((m) => m.role === "user")
      .map((m) => m.content)
      .join("\n");

  const runAdaptation = async (
    history: AdaptationChatMessage[],
  ): Promise<void> => {
    if (!recipe || !profile) return;

    setError(null);
    setPhase("adapting");

    try {
      const response = await LLMService.send({
        system: buildSystemPrompt(profile, forcedLanguage),
        messages: [
          {
            role: "user",
            content: buildAdaptationPrompt({
              recipe,
              reason: collectRequest(history),
              outputLanguage: forcedLanguage,
            }),
          },
        ],
      });

      const parsed = parseAdaptationResponse(response.content);
      if (!parsed) {
        setError("The adaptation came back in an unexpected format. Try again.");
        setPhase("ready");
        return;
      }

      setResult(parsed);
      if (parsed.summary) appendMessage("assistant", parsed.summary);
      setPhase("adapted");
    } catch {
      setError("Could not run the adaptation.");
      setPhase("ready");
    }
  };

  const requestPlan = async (
    history: AdaptationChatMessage[],
    latestRequest: string,
  ): Promise<void> => {
    if (!recipe || !profile) return;

    setError(null);
    setPhase("planning");

    try {
      const isFirstExchange = history.filter((m) => m.role === "user").length === 1;

      const llmMessages = isFirstExchange
        ? [
            {
              role: "user" as const,
              content: buildAdaptationPlanPrompt({
                recipe,
                request: latestRequest,
                conservatism,
                outputLanguage: forcedLanguage,
              }),
            },
          ]
        : [
            {
              role: "user" as const,
              content: buildAdaptationPlanPrompt({
                recipe,
                request: collectRequest(history.slice(0, 1)),
                conservatism,
                outputLanguage: forcedLanguage,
              }),
            },
            ...history.slice(1).map((m) => ({
              role: m.role,
              content: m.content,
            })),
          ];

      const response = await LLMService.send({
        system: buildSystemPrompt(profile, forcedLanguage),
        messages: llmMessages,
      });

      appendMessage("assistant", response.content);
      setPhase("ready");
    } catch {
      setError("Could not reach the sous chef.");
      setPhase(history.length > 1 ? "ready" : "idle");
    }
  };

  const onSend = async (): Promise<void> => {
    const text = draft.trim();
    if (!text || !recipe) return;
    if (phase === "planning" || phase === "adapting") return;

    setDraft("");

    const nextHistory: AdaptationChatMessage[] = [
      ...messages,
      { id: `adapt_${Date.now()}_${messages.length}`, role: "user", content: text },
    ];
    setMessages(nextHistory);

    // Confirmation phrases only trigger adaptation once a plan has been shown.
    if (phase === "ready" && GO_AHEAD_PATTERN.test(text)) {
      await runAdaptation(nextHistory);
      return;
    }

    await requestPlan(nextHistory, text);
  };

  const onStartAdaptation = async (): Promise<void> => {
    if (phase !== "ready") return;
    await runAdaptation(messages);
  };

  const onSaveVariant = async (): Promise<void> => {
    if (!recipe || !result || phase !== "adapted") return;

    setError(null);
    setIsSavingVariant(true);

    try {
      const variant = AdaptationService.buildVariantRecipe(recipe, result);
      await recipeRepository.save(variant);

      // A variant inherits its parent's rating dimensions rather than
      // generating new ones, so ratings stay comparable across the family.
      try {
        const parentCategories = cookLogRepository.getRatingCategories(recipe.id);
        if (parentCategories.length > 0) {
          cookLogRepository.saveRatingCategories(
            variant.id,
            parentCategories.map((category) => ({ label: category.label })),
          );
        }
      } catch {
        // Non-fatal — the variant falls back to fixed dimensions only.
      }

      setPhase("saved");
    } catch {
      setError("Could not save the variant.");
    } finally {
      setIsSavingVariant(false);
    }
  };

  const onReset = (): void => {
    setPhase("idle");
    setMessages([]);
    setDraft("");
    setError(null);
    setResult(null);
    setIsSavingVariant(false);
  };

  return {
    phase,
    messages,
    draft,
    error,
    result,
    quickActions: QUICK_ACTIONS,
    conservatism,
    setConservatism,
    onChangeDraft: setDraft,
    onSend,
    onStartAdaptation,
    onSaveVariant,
    isSavingVariant,
    onReset,
  };
}
