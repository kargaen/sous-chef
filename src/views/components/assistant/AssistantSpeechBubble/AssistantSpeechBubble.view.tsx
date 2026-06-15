import { Pressable, Text, View } from "react-native";

import { styles } from "./AssistantSpeechBubble.styles";

export type AssistantSpeechBubbleTone = "happy" | "exhausted";

export interface AssistantSpeechBubbleProps {
  tone?: AssistantSpeechBubbleTone;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss: () => void;
}

const toneFillColor: Record<AssistantSpeechBubbleTone, string> = {
  happy: "#F3FAEE",
  exhausted: "#FFF7EE",
};

export function AssistantSpeechBubble({
  tone = "happy",
  message,
  actionLabel,
  onAction,
  onDismiss,
}: AssistantSpeechBubbleProps) {
  const eyebrow = tone === "happy" ? "Sous Chef" : "Taking a break";
  const fillColor = toneFillColor[tone];

  return (
    <View
      style={[
        styles.bubble,
        tone === "happy" ? styles.bubbleHappy : styles.bubbleExhausted,
      ]}
    >
      <View style={styles.tailBorder} />
      <View style={[styles.tailFill, { borderTopColor: fillColor }]} />
      <View style={styles.eyebrowRow}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          onPress={onDismiss}
          style={styles.closeButton}
        >
          <Text style={styles.closeButtonText}>{"×"}</Text>
        </Pressable>
      </View>

      <Text style={styles.message}>{message}</Text>

      {actionLabel && onAction ? (
        <Pressable onPress={onAction} style={styles.actionButton}>
          <Text style={styles.actionButtonText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
