import { StyleSheet } from "react-native";

import { colors, radius, spacing, typography } from "@/constants";

export const styles = StyleSheet.create({
  surface: {
    flex: 1,
    backgroundColor: colors.background.card,
  },

  scrollArea: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },

  composerDock: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    backgroundColor: colors.background.card,
  },

  composerInputShell: {
    position: "relative",
    borderRadius: radius.xl,
    backgroundColor: colors.background.card,
    minHeight: 80,
    justifyContent: "center",
  },

  composerInput: {
    minHeight: 80,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    paddingRight: 58,
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    color: colors.text.primary,
    backgroundColor: colors.background.card,
  },

  sendButton: {
    position: "absolute",
    right: spacing.sm,
    bottom: spacing.sm,
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brand.copper,
  },

  sendButtonDisabled: {
    backgroundColor: colors.background.muted,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },

  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xl,
  },

  emptyStateText: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.text.muted,
    textAlign: "center",
  },

  messageRow: {
    marginBottom: spacing.md,
  },

  messageRowUser: {
    alignItems: "flex-end",
  },

  messageRowAssistant: {
    alignItems: "flex-start",
  },

  messageBubble: {
    maxWidth: "80%",
    borderRadius: radius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },

  messageBubbleUser: {
    backgroundColor: colors.brand.copper,
  },

  messageBubbleAssistant: {
    backgroundColor: colors.background.muted,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },

  messageBubbleStreaming: {
    opacity: 0.7,
  },

  messageText: {
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
  },

  messageTextUser: {
    color: colors.text.inverse,
  },

  messageTextAssistant: {
    color: colors.text.primary,
  },
});
