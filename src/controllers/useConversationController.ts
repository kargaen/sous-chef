import { useState } from "react";

import { AdaptationResponseSchema } from "@/models/schemas";
import { RecipeRepository } from "@/models/repositories/RecipeRepository";
import type { AssistantAction, Message, PantryAddSuggestionPayload, SuggestionContext } from "@/models/types";
import {
  buildAdaptationPrompt,
  buildConversationPrompt,
  buildSystemPrompt,
  resolveForcedOutputLanguage,
} from "@/prompts";
import {
  SAFETY_T1_SYSTEM_NOTE,
  SAFETY_T2_SYSTEM_NOTE,
  T0_BLOCKED_RESPONSE,
} from "@/prompts/safetyTiers";
import { HabitService } from "@/services/HabitService";
import { LLMService } from "@/services/LLMService";
import { NudgeService } from "@/services/NudgeService";
import { SafetyService } from "@/services/SafetyService";
import { useChefProfileStore } from "@/store/chefProfileStore";
import { useConversationStore } from "@/store/conversationStore";
import { useSettingsStore } from "@/store/settingsStore";
import { trimContextWindow } from "@/utils/contextWindow";

const recipeRepository = new RecipeRepository();

const stripJsonFences = (value: string): string =>
  value
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

const VALID_ZONES = ["fridge", "freezer", "cupboard"] as const;
type ValidZone = (typeof VALID_ZONES)[number];
const isValidZone = (v: unknown): v is ValidZone =>
  VALID_ZONES.includes(v as ValidZone);

const VALID_MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;
type ValidMealType = (typeof VALID_MEAL_TYPES)[number];
const isValidMealType = (v: unknown): v is ValidMealType =>
  VALID_MEAL_TYPES.includes(v as ValidMealType);

const parseAction = (content: string): AssistantAction | null => {
  const trimmed = stripJsonFences(content).trim();
  if (!trimmed.startsWith("{")) return null;
  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    if (parsed.action === "create_recipe" && typeof parsed.idea === "string") {
      return { action: "create_recipe", idea: parsed.idea };
    }
    if (
      parsed.action === "add_pantry_item" &&
      typeof parsed.name === "string" &&
      isValidZone(parsed.zone)
    ) {
      return {
        action: "add_pantry_item",
        name: parsed.name,
        zone: parsed.zone,
        unit: typeof parsed.unit === "string" ? parsed.unit : undefined,
        quantity: typeof parsed.quantity === "string" ? parsed.quantity : undefined,
        createdDate: typeof parsed.createdDate === "string" ? parsed.createdDate : null,
        expiryDate: typeof parsed.expiryDate === "string" ? parsed.expiryDate : null,
      };
    }
    if (
      parsed.action === "add_to_meal_plan" &&
      typeof parsed.recipeTitle === "string" &&
      isValidMealType(parsed.mealType)
    ) {
      return {
        action: "add_to_meal_plan",
        recipeTitle: parsed.recipeTitle,
        mealType: parsed.mealType,
      };
    }
    return null;
  } catch {
    return null;
  }
};

const parsePantryAddSuggestion = (
  content: string,
): { text: string; payload: PantryAddSuggestionPayload } | null => {
  const lines = content.split("\n");
  const lastLine = lines[lines.length - 1].trim();
  if (!lastLine.startsWith("{")) return null;
  try {
    const parsed = JSON.parse(lastLine) as Record<string, unknown>;
    if (
      parsed.suggest_pantry_add !== true ||
      typeof parsed.name !== "string" ||
      !isValidZone(parsed.zone)
    ) {
      return null;
    }
    return {
      text: lines.slice(0, -1).join("\n").trim(),
      payload: {
        name: parsed.name,
        zone: parsed.zone,
        createdDate: typeof parsed.createdDate === "string" ? parsed.createdDate : null,
        expiryDate: typeof parsed.expiryDate === "string" ? parsed.expiryDate : null,
      },
    };
  } catch {
    return null;
  }
};

const parseAdaptationResponse = (content: string) => {
  try {
    const parsed: unknown = JSON.parse(stripJsonFences(content));
    const validated = AdaptationResponseSchema.safeParse(parsed);
    return validated.success ? validated.data : null;
  } catch {
    return null;
  }
};

export interface ConversationViewModel {
  messages: Message[];
  draft: string;
  isStreaming: boolean;
  error: string | null;
  onChangeDraft: (text: string) => void;
  onSend: () => Promise<void>;
  sendDirect: (text: string) => Promise<{ tone: "happy" | "exhausted" }>;
  blockedNotification: string | null;
  onLoadNudges: () => Promise<void>;
  onOpenWithContext: (context: SuggestionContext) => void;
  onClear: () => void;
}

export interface ConversationControllerOptions {
  onDispatchAction?: (action: AssistantAction) => void;
}

export function useConversationController(
  options: ConversationControllerOptions = {},
): ConversationViewModel {
  const { onDispatchAction } = options;
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [blockedNotification, setBlockedNotification] = useState<string | null>(null);

  const {
    activeScope,
    messages,
    promptSuggestions,
    suggestionContext: activeSuggestionContext,
    addMessage,
    appendToLastMessage,
    setActiveNudges,
    setMessages,
    setPromptSuggestions,
    setSuggestionContext,
    setIsStreaming,
    isStreaming,
    clear,
  } = useConversationStore();

  const profile = useChefProfileStore((s) => s.profile);
  const settings = useSettingsStore((s) => s.settings);

  const sendMessage = async (
    text: string,
  ): Promise<{ tone: "happy" | "exhausted" }> => {
    if (!text || !profile) return { tone: "happy" };

    // Clear any previous blocked notification as soon as a new message is attempted
    setBlockedNotification(null);

    const resolvedScope = useConversationStore.getState().activeScope;

    // Layer 1: classify the request — skippable in dev builds only
    const skipLayer1 = __DEV__ && (settings?.skipSafetyLayer1 ?? false);
    const safetyLabel = skipLayer1
      ? ("SAFE" as const)
      : await SafetyService.classify(text);

    // T0: hard stop — show notification, store nothing
    if (safetyLabel === "T0") {
      setBlockedNotification(T0_BLOCKED_RESPONSE);
      return { tone: "exhausted" };
    }

    setError(null);
    setIsStreaming(true);

    const resolvedSuggestionContext = useConversationStore.getState().suggestionContext ?? undefined;
    const isUnsafe = safetyLabel !== "SAFE";

    // Inject safety note into system prompt for T1/T2
    const safetyNote =
      safetyLabel === "T2"
        ? SAFETY_T2_SYSTEM_NOTE
        : safetyLabel === "OFF_TOPIC"
          ? SAFETY_T1_SYSTEM_NOTE
          : "";
    const forcedLanguage = resolveForcedOutputLanguage(
      settings?.assistantOutputLanguage,
    );
    const resolvedSystemPrompt =
      buildSystemPrompt(profile, forcedLanguage) + safetyNote;

    const matchedSuggestion = promptSuggestions.find((s) => s.prompt === text);
    const shouldUseStructuredAdaptation =
      !isUnsafe &&
      resolvedScope.kind === "recipe" &&
      typeof resolvedScope.recipeId === "string" &&
      matchedSuggestion?.kind === "adaptation";

    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
      scope: resolvedScope,
    };
    addMessage(userMessage);

    try {
      // Structured adaptation path (recipe context + adaptation suggestion, SAFE only)
      if (shouldUseStructuredAdaptation && resolvedScope.recipeId) {
        const recipe = await recipeRepository.fetchById(resolvedScope.recipeId);

        if (recipe) {
          const response = await LLMService.send({
            system: resolvedSystemPrompt,
            messages: [
              {
                role: "user",
                content: buildAdaptationPrompt({
                  recipe,
                  reason: text,
                  outputLanguage: forcedLanguage,
                }),
              },
            ],
          });

          const structuredAdaptation = parseAdaptationResponse(response.content);
          addMessage({
            id: `msg_${Date.now() + 1}`,
            role: "assistant",
            content: structuredAdaptation?.summary ?? response.content,
            createdAt: new Date().toISOString(),
            scope: resolvedScope,
            structuredMessage: structuredAdaptation
              ? { type: "adaptation", payload: structuredAdaptation }
              : null,
          });

          HabitService.record("chat_opened");
          return { tone: "happy" };
        }
      }

      // Conversational path
      const previousMessages = useConversationStore.getState().messages.slice(0, -1);
      const trimmed = trimContextWindow(previousMessages);

      const response = await LLMService.send({
        system: resolvedSystemPrompt,
        messages: [
          ...trimmed.map((m) => ({ role: m.role, content: m.content })),
          {
            role: "user",
            content: buildConversationPrompt({
              userMessage: text,
              suggestionContext:
                !isUnsafe && resolvedSuggestionContext
                  ? {
                      nudgeBody: resolvedSuggestionContext.nudgeBody,
                      recipeTitle: resolvedSuggestionContext.recipeTitle,
                      pantryItemNames: resolvedSuggestionContext.pantryItemNames,
                    }
                  : undefined,
              assistantContext: !isUnsafe
                ? resolvedSuggestionContext?.assistantContext
                : undefined,
            }),
          },
        ],
      });

      // Layer 3: scan the output before displaying it
      const outputBlocked = await SafetyService.scanOutput(response.content);
      if (outputBlocked) {
        // Remove the user message that was already added — store nothing from this exchange
        setMessages(useConversationStore.getState().messages.slice(0, -1));
        setBlockedNotification(T0_BLOCKED_RESPONSE);
        return { tone: "exhausted" };
      }

      // Don't dispatch app actions for flagged content
      if (!isUnsafe) {
        const action = parseAction(response.content);
        if (action && onDispatchAction) {
          onDispatchAction(action);
          return { tone: "happy" };
        }

        const pantrySuggestion = parsePantryAddSuggestion(response.content);
        if (pantrySuggestion) {
          addMessage({
            id: `msg_${Date.now() + 1}`,
            role: "assistant",
            content: pantrySuggestion.text,
            createdAt: new Date().toISOString(),
            scope: resolvedScope,
            structuredMessage: {
              type: "pantry_add_suggestion",
              payload: pantrySuggestion.payload,
            },
          });
          HabitService.record("chat_opened");
          return { tone: "happy" };
        }
      }

      addMessage({
        id: `msg_${Date.now() + 1}`,
        role: "assistant",
        content: response.content,
        createdAt: new Date().toISOString(),
        scope: resolvedScope,
      });

      HabitService.record("chat_opened");
      return { tone: isUnsafe ? "exhausted" : "happy" };
    } catch {
      setError("Could not send message.");
      return { tone: "happy" };
    } finally {
      setIsStreaming(false);
    }
  };

  const onSend = async (): Promise<void> => {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    await sendMessage(text);
  };

  const sendDirect = async (
    text: string,
  ): Promise<{ tone: "happy" | "exhausted" }> => {
    return sendMessage(text.trim());
  };

  const onLoadNudges = async (): Promise<void> => {
    try {
      const nudge = await NudgeService.generateNudge();
      if (nudge) setActiveNudges([nudge]);
    } catch {
      // Nudges fail silently
    }
  };

  const onOpenWithContext = (context: SuggestionContext): void => {
    const suggestions = context.promptSuggestions ?? [];
    setPromptSuggestions(suggestions);
    setSuggestionContext(context);
    HabitService.record("chat_opened");
  };

  return {
    messages,
    draft,
    isStreaming,
    error,
    blockedNotification,
    onChangeDraft: setDraft,
    onSend,
    sendDirect,
    onLoadNudges,
    onOpenWithContext,
    onClear: clear,
  };
}
