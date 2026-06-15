import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import type { Message } from "@/models/types";
import { colors } from "@/constants";
import { FormattedText } from "@/views/components/ui";
import { BouncingDots } from "../BouncingDots";
import { styles } from "./AssistantChatSurface.styles";

export interface AssistantChatSurfaceProps {
  messages: Message[];
  draft: string;
  isStreaming: boolean;
  onChangeDraft: (text: string) => void;
  onSend: () => void;
  emptyStateText?: string;
}

export function AssistantChatSurface({
  messages,
  draft,
  isStreaming,
  onChangeDraft,
  onSend,
  emptyStateText,
}: AssistantChatSurfaceProps) {
  const scrollRef = useRef<ScrollView>(null);
  const canSend = draft.trim().length > 0 && !isStreaming;

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
