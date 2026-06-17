import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import type { Message, PantryAddSuggestionPayload } from "@/models/types";
import { colors, spacing, typography } from "@/constants";
import { FormattedText } from "@/views/components/ui";
import { BouncingDots } from "../BouncingDots";
import { styles } from "./AssistantChatSurface.styles";

const pantryCardStyles = StyleSheet.create({
  card: {
    marginTop: spacing.xs,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.background.card,
    padding: spacing.md,
    gap: spacing.sm,
    maxWidth: "80%",
    alignSelf: "flex-start",
  },
  label: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
  name: {
    fontWeight: "600" as const,
    color: colors.text.primary,
  },
  actions: {
    flexDirection: "row" as const,
    gap: spacing.sm,
  },
  confirmButton: {
    borderRadius: 8,
    backgroundColor: colors.brand.copper,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  confirmLabel: {
    fontSize: typography.size.sm,
    color: colors.text.inverse,
    fontWeight: "600" as const,
  },
  dismissButton: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  dismissLabel: {
    fontSize: typography.size.sm,
    color: colors.text.muted,
  },
});

export interface AssistantChatSurfaceProps {
  messages: Message[];
  draft: string;
  isStreaming: boolean;
  onChangeDraft: (text: string) => void;
  onSend: () => void;
  emptyStateText?: string;
  onConfirmPantryAdd?: (payload: PantryAddSuggestionPayload) => void;
}

export function AssistantChatSurface({
  messages,
  draft,
  isStreaming,
  onChangeDraft,
  onSend,
  emptyStateText,
  onConfirmPantryAdd,
}: AssistantChatSurfaceProps) {
  const scrollRef = useRef<ScrollView>(null);
  const [resolvedMessageIds, setResolvedMessageIds] = useState<Set<string>>(new Set());
  const canSend = draft.trim().length > 0 && !isStreaming;

  const resolveMessage = (id: string) => {
    setResolvedMessageIds((prev) => new Set([...prev, id]));
  };

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages.length, isStreaming]);

  return (
    <View style={styles.surface}>
      <ScrollView
        ref={scrollRef}
        style={styles.scrollArea}
        contentContainerStyle={[
          styles.scrollContent,
          messages.length === 0 && styles.emptyState,
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {messages.length === 0 && !isStreaming ? (
          <Text style={styles.emptyStateText}>
            {emptyStateText ??
              "Ask Sous Chef anything about your meal plans, pantry, or recipes."}
          </Text>
        ) : (
          <>
            {messages.map((message) => {
              const isUser = message.role === "user";
              const pantryCard =
                !isUser &&
                message.structuredMessage?.type === "pantry_add_suggestion" &&
                !resolvedMessageIds.has(message.id)
                  ? message.structuredMessage.payload
                  : null;

              return (
                <View
                  key={message.id}
                  style={[
                    styles.messageRow,
                    isUser ? styles.messageRowUser : styles.messageRowAssistant,
                  ]}
                >
                  <View
                    style={[
                      styles.messageBubble,
                      isUser
                        ? styles.messageBubbleUser
                        : styles.messageBubbleAssistant,
                    ]}
                  >
                    <FormattedText
                      style={[
                        styles.messageText,
                        isUser
                          ? styles.messageTextUser
                          : styles.messageTextAssistant,
                      ]}
                    >
                      {message.content}
                    </FormattedText>
                  </View>

                  {pantryCard ? (
                    <View style={pantryCardStyles.card}>
                      <Text style={pantryCardStyles.label}>
                        Add <Text style={pantryCardStyles.name}>{pantryCard.name}</Text> to your pantry?
                      </Text>
                      <View style={pantryCardStyles.actions}>
                        <Pressable
                          style={pantryCardStyles.confirmButton}
                          onPress={() => {
                            resolveMessage(message.id);
                            onConfirmPantryAdd?.(pantryCard);
                          }}
                        >
                          <Text style={pantryCardStyles.confirmLabel}>Add to pantry</Text>
                        </Pressable>
                        <Pressable
                          style={pantryCardStyles.dismissButton}
                          onPress={() => resolveMessage(message.id)}
                        >
                          <Text style={pantryCardStyles.dismissLabel}>No thanks</Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : null}
                </View>
              );
            })}

            {isStreaming ? (
              <View style={[styles.messageRow, styles.messageRowAssistant]}>
                <View style={[styles.messageBubble, styles.messageBubbleAssistant]}>
                  <BouncingDots />
                </View>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>

      <View style={styles.composerDock}>
        <View style={styles.composerInputShell}>
          <TextInput
            accessibilityLabel="Message Sous Chef"
            value={draft}
            onChangeText={onChangeDraft}
            placeholder="Message Sous Chef…"
            placeholderTextColor={colors.text.muted}
            multiline
            textAlignVertical="top"
            style={styles.composerInput}
            editable={!isStreaming}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send message"
            disabled={!canSend}
            onPress={onSend}
            style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
          >
            <Ionicons
              name="arrow-up"
              size={18}
              color={canSend ? colors.text.inverse : colors.text.muted}
            />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
