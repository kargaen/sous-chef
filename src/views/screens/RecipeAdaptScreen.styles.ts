import { StyleSheet } from "react-native";

import { colors, radius, spacing, typography } from "@/constants";

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background.app,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },

  backButton: {
    paddingVertical: spacing.xs,
    paddingRight: spacing.sm,
  },

  backLabel: {
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    color: colors.text.secondary,
  },

  headerTitle: {
    flex: 1,
    fontSize: typography.size.lg,
    lineHeight: typography.lineHeight.lg,
    fontWeight: "700",
    color: colors.text.primary,
  },

  messageList: {
    flex: 1,
  },

  messageListContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },

  emptyHint: {
    marginTop: spacing.xxl,
    paddingHorizontal: spacing.xl,
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    fontStyle: "italic",
    textAlign: "center",
    color: colors.text.muted,
  },

  bubble: {
    maxWidth: "85%",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
  },

  bubbleUser: {
    alignSelf: "flex-end",
    backgroundColor: colors.brand.terracotta,
  },

  bubbleAssistant: {
    alignSelf: "flex-start",
    backgroundColor: colors.background.card,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },

  bubbleTextUser: {
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    color: colors.text.inverse,
  },

  bubbleTextAssistant: {
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    color: colors.text.primary,
  },

  thinkingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    alignSelf: "flex-start",
    paddingHorizontal: spacing.sm,
  },

  thinkingLabel: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    fontStyle: "italic",
    color: colors.text.muted,
  },

  errorText: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.status.danger,
    paddingHorizontal: spacing.sm,
  },

  diffCard: {
    alignSelf: "stretch",
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.background.card,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    gap: spacing.md,
  },

  diffRationale: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.text.secondary,
  },

  savedConfirmation: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    fontWeight: "600",
    color: colors.status.success,
    textAlign: "center",
  },

  startAdaptationWrap: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },

  composer: {
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    backgroundColor: colors.background.app,
    paddingBottom: spacing.lg,
  },

  toolsLabel: {
    fontSize: typography.size.xs,
    lineHeight: typography.lineHeight.xs,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: colors.text.muted,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },

  chipsRow: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },

  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.background.muted,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },

  chipText: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    fontWeight: "600",
    color: colors.text.secondary,
  },

  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },

  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.background.card,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    fontSize: typography.size.md,
    color: colors.text.primary,
  },

  sendButton: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brand.terracotta,
  },

  sendButtonDisabled: {
    backgroundColor: colors.background.muted,
  },

  statusWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.md,
  },

  statusText: {
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    textAlign: "center",
    color: colors.text.secondary,
  },
});
