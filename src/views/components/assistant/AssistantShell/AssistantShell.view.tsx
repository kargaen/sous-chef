import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";
import { useEffect, useRef, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { AssistantAction, PantryAddSuggestionPayload, SuggestionSlot } from "@/models/types";
import {
  useAssistantShellController,
  useConversationController,
  useRecipeController,
} from "@/controllers";
import { usePantryController } from "@/controllers/usePantryController";
import {
  useAssistantExternalPromptStore,
  useAssistantRouteContextStore,
  useConversationStore,
  useMealPlanStore,
  useRecipeDraftStore,
} from "@/store";
import { todayKey } from "@/utils/planDateUtils";
import { colors } from "@/constants";
import { AssistantChatOverlay } from "../AssistantChatOverlay";
import { AssistantLauncher } from "../AssistantLauncher";
import { AssistantSpeechBubble } from "../AssistantSpeechBubble";
import { BouncingDots } from "../BouncingDots";
import { styles } from "./AssistantShell.styles";

const BUBBLE_TRUNCATE_LENGTH = 180;

// The launcher sits low so it reads as docked in — and overflowing — the
// bottom nav bar, rather than floating well above it. Small clearance keeps it
// overlapping the bar; the nav-bar safe-area inset is added on top at render
// time. Tune this single value to nudge it up/down.
const LAUNCHER_TAB_BAR_CLEARANCE = 12;

const truncateForBubble = (text: string): string => {
  const plain = text.replace(/\*\*(.+?)\*\*/g, "$1");
  if (plain.length <= BUBBLE_TRUNCATE_LENGTH) return plain;

  const slice = plain.slice(0, BUBBLE_TRUNCATE_LENGTH);
  const lastSpace = slice.lastIndexOf(" ");
  const cut = lastSpace > 0 ? slice.slice(0, lastSpace) : slice;
  return `${cut.trimEnd()}…`;
};

export function AssistantShell() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { mode, open, close } = useAssistantShellController();
  const { importRecipeSource } = useRecipeController();
  const { addItem: addPantryItem } = usePantryController();
  const setDraft = useRecipeDraftStore((s) => s.setDraft);
  const setMealPlanDraftSlots = useMealPlanStore((s) => s.setDraftSlots);
  const routeContext = useAssistantRouteContextStore((s) => s.routeContext);
  const pendingPrompt = useAssistantExternalPromptStore((s) => s.pendingPrompt);
  const clearPendingPrompt = useAssistantExternalPromptStore(
    (s) => s.setPendingPrompt,
  );
  const [isGeneratingRecipe, setIsGeneratingRecipe] = useState(false);
  const [speechBubble, setSpeechBubble] = useState<string | null>(null);
  const [speechBubbleTone, setSpeechBubbleTone] = useState<"happy" | "exhausted">("happy");

  // Track mode in a ref so async callbacks read the current value
  const modeRef = useRef(mode);
  modeRef.current = mode;

  const handleDispatchAction = async (action: AssistantAction) => {
    close();

    if (action.action === "create_recipe") {
      setIsGeneratingRecipe(true);
      try {
        const imported = await importRecipeSource({
          sourceMode: "idea",
          source: action.idea,
        });

        if (imported) {
          setDraft({
            title: imported.title,
            ingredientsText: imported.ingredientsText,
            stepsText: imported.stepsText,
            notes: imported.notes,
            cookbookId: null,
          });
          router.push("/(tabs)/recipes/draft");
        }
      } finally {
        setIsGeneratingRecipe(false);
      }
    }

    if (action.action === "add_pantry_item") {
      const ok = await addPantryItem({
        name: action.name,
        quantity: action.quantity ?? "1",
        unit: action.unit ?? "unit",
        storageZone: action.zone,
        expiryDate: action.expiryDate ?? "",
        createdDate: action.createdDate ?? "",
      });
      if (ok) {
        setSpeechBubbleTone("happy");
        setSpeechBubble(`Added ${action.name} to your pantry.`);
      }
    }

    if (action.action === "add_to_meal_plan") {
      const slot: SuggestionSlot = {
        id: `suggestion-${Date.now()}`,
        date: todayKey(),
        type: action.mealType,
        suggestionText: action.recipeTitle,
      };
      const currentDrafts = useMealPlanStore.getState().draftSlots;
      setMealPlanDraftSlots([...currentDrafts, slot]);
      router.push("/(tabs)/plan");
      setSpeechBubbleTone("happy");
      setSpeechBubble(`Added ${action.recipeTitle} as a ${action.mealType} suggestion — tap Accept in your plan.`);
    }
  };

  const handleConfirmPantryAdd = (payload: PantryAddSuggestionPayload) => {
    void addPantryItem({
      name: payload.name,
      quantity: "1",
      unit: "unit",
      storageZone: payload.zone,
      expiryDate: payload.expiryDate ?? "",
      createdDate: payload.createdDate ?? "",
    });
  };

  const conversation = useConversationController({
    onDispatchAction: (action) => { void handleDispatchAction(action); },
  });

  const handleOpen = () => {
    setSpeechBubble(null);
    if (routeContext) conversation.onOpenWithContext(routeContext);
    open();
  };

  // Handle external prompt: send silently, show reply in speech bubble if chat is closed
  useEffect(() => {
    if (!pendingPrompt) return;

    const { question, context } = pendingPrompt;
    clearPendingPrompt(null);

    // Merge: route context is the base, explicit context adds to or overrides specific fields
    const resolvedContext =
      context && routeContext
        ? { ...routeContext, ...context }
        : context ?? routeContext ?? null;
    if (resolvedContext) conversation.onOpenWithContext(resolvedContext);

    void conversation.sendDirect(question).then(({ tone }) => {
      // Only show speech bubble if the chat overlay is not already open
      if (modeRef.current !== "launcher") return;

      const messages = useConversationStore.getState().messages;
      const lastAssistant = [...messages]
        .reverse()
        .find((m) => m.role === "assistant");
      if (lastAssistant) {
        setSpeechBubbleTone(tone);
        setSpeechBubble(truncateForBubble(lastAssistant.content));
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingPrompt]);

  if (mode === "expanded") {
    return (
      <AssistantChatOverlay
        conversation={conversation}
        onClose={close}
        onConfirmPantryAdd={handleConfirmPantryAdd}
      />
    );
  }

  return (
    <View style={styles.host}>
      <View
        style={[
          styles.launcherAnchor,
          { paddingBottom: insets.bottom + LAUNCHER_TAB_BAR_CLEARANCE },
        ]}
      >
        {speechBubble ? (
          <AssistantSpeechBubble
            tone={speechBubbleTone}
            message={speechBubble}
            actionLabel="Continue in chat"
            onAction={() => {
              setSpeechBubble(null);
              open();
            }}
            onDismiss={() => setSpeechBubble(null)}
          />
        ) : null}
        <AssistantLauncher onPress={handleOpen} />
      </View>

      {isGeneratingRecipe ? (
        <View style={generatingStyles.overlay}>
          <View style={generatingStyles.panel}>
            <BouncingDots />
          </View>
        </View>
      ) : null}
    </View>
  );
}

const generatingStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay.scrim,
    alignItems: "center",
    justifyContent: "center",
  },
  panel: {
    borderRadius: 20,
    backgroundColor: colors.background.card,
    paddingHorizontal: 32,
    paddingVertical: 24,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
});
