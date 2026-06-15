import { StyleSheet } from "react-native";

import { colors, spacing, typography } from "@/constants";

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
    paddingBottom: spacing.sm,
  },

  backButton: {
    paddingVertical: spacing.xs,
    paddingRight: spacing.sm,
  },

  backLabel: {
    fontSize: typography.size.xl,
    lineHeight: typography.lineHeight.xl,
    color: colors.text.muted,
    fontWeight: typography.weight.bold,
  },

  headerTitle: {
    fontSize: typography.size.lg,
    lineHeight: typography.lineHeight.lg,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },

  content: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xxxl,
  },

  intro: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.text.secondary,
  },

  multilineInput: {
    minHeight: 132,
    textAlignVertical: "top",
  },

  shortMultiline: {
    minHeight: 72,
    textAlignVertical: "top",
  },

  errorText: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.status.danger,
  },

  footer: {
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    backgroundColor: colors.background.card,
  },

  footerButton: {
    flex: 1,
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
    color: colors.text.secondary,
    textAlign: "center",
  },
});
