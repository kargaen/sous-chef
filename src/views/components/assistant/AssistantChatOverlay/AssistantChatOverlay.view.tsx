import { Pressable, Text, View } from "react-native";
import {
  KeyboardAvoidingView,
  useKeyboardState,
} from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useMemo } from "react";

import type { PantryAddSuggestionPayload } from "@/models/types";
import type { ConversationViewModel } from "@/controllers";
import { getDefaultAssistantGreeting } from "@/controllers";
import { AssistantChatSurface } from "../AssistantChatSurface";
import { styles } from "./AssistantChatOverlay.styles";

export interface AssistantChatOverlayProps {
  conversation: ConversationViewModel;
  onClose: () => void;
  onConfirmPantryAdd?: (payload: PantryAddSuggestionPayload) => void;
}

export function AssistantChatOverlay({
  conversation,
  onClose,
  onConfirmPantryAdd,
}: AssistantChatOverlayProps) {
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardState();
  const greeting = useMemo(() => getDefaultAssistantGreeting(), []);

  return (
    <KeyboardAvoidingView
      behavior="padding"
      style={[styles.host, { paddingTop: insets.top }]}
    >
      <Pressable style={styles.scrim} onPress={onClose} />

      {/* The KeyboardAvoidingView owns the bottom padding while the keyboard
          is open; the nav-bar inset only applies when it is closed. */}
      <View
        style={[
          styles.shell,
          { paddingBottom: keyboard.isVisible ? 0 : insets.bottom },
        ]}
      >
        <View style={styles.chrome}>
          <Text style={styles.chromeTitle}>Sous Chef</Text>
          <View style={styles.chromeActions}>
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              style={styles.chromeAction}
            >
              <Text style={styles.chromeActionText}>Close</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.body}>
          <AssistantChatSurface
            messages={conversation.messages}
            draft={conversation.draft}
            isStreaming={conversation.isStreaming}
            onChangeDraft={conversation.onChangeDraft}
            onSend={conversation.onSend}
            emptyStateText={greeting}
            onConfirmPantryAdd={onConfirmPantryAdd}
          />
          {conversation.blockedNotification ? (
            <Text style={styles.blockedNotice} pointerEvents="none">
              {conversation.blockedNotification}
            </Text>
          ) : null}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
