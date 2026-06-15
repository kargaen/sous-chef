import { StyleSheet } from "react-native";

import { colors, radius, spacing, typography } from "@/constants";

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background.app,
  },

  content: {
    padding: spacing.lg,
    gap: spacing.xl,
    paddingBottom: spacing.xxxl,
  },

  backButton: {
    paddingVertical: spacing.xs,
  },

  backLabel: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.text.muted,
    fontWeight: typography.weight.medium,
  },

  pageHeader: {
    gap: spacing.sm,
  },

  pageTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },

  keepAwakeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  keepAwakeLabel: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.text.secondary,
  },

  section: {
    gap: spacing.md,
  },

  checkCard: {
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.background.card,
    padding: spacing.lg,
    paddingVertical: spacing.sm,
  },

  checkRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },

  firstCheckRow: {
    borderTopWidth: 0,
  },

  checkbox: {
    width: 26,
    height: 26,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border.strong,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
    flexShrink: 0,
  },

  checkboxChecked: {
    backgroundColor: colors.brand.sage,
    borderColor: colors.brand.sage,
  },

  checkmark: {
    fontSize: typography.size.xs,
    lineHeight: typography.lineHeight.xs,
    fontWeight: typography.weight.bold,
    color: colors.text.inverse,
  },

  stepOrder: {
    fontSize: typography.size.xs,
    lineHeight: typography.lineHeight.xs,
    fontWeight: typography.weight.bold,
    color: colors.text.muted,
  },

  checkLabel: {
    flex: 1,
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    color: colors.text.primary,
  },

  checkLabelDone: {
    textDecorationLine: "line-through",
    color: colors.text.muted,
  },

  finishSection: {
    gap: spacing.sm,
  },

  finishHint: {
    borderRadius: radius.lg,
    backgroundColor: "#EAF1E4",
    borderWidth: 1,
    borderColor: colors.brand.sage,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },

  finishHintText: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.brand.sageDark,
    fontWeight: typography.weight.semibold,
  },

  statusCard: {
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.background.card,
    padding: spacing.lg,
    gap: spacing.sm,
  },

  statusTitle: {
    fontSize: typography.size.lg,
    lineHeight: typography.lineHeight.lg,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },

  statusCopy: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.text.secondary,
  },
});
