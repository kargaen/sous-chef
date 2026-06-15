import { StyleSheet } from "react-native";

import { colors, radius, spacing, typography } from "@/constants";

export const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
  },

  content: {
    padding: spacing.lg,
    gap: spacing.xl,
    paddingBottom: spacing.xxxl,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },

  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    flex: 1,
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background.card,
  },

  backButtonText: {
    fontSize: typography.size.lg,
    lineHeight: typography.lineHeight.lg,
    color: colors.text.primary,
    fontWeight: typography.weight.bold,
  },

  headerTitle: {
    fontSize: typography.size.xxl,
    lineHeight: typography.lineHeight.xxl,
    color: colors.text.primary,
    fontWeight: typography.weight.bold,
  },

  brandMark: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.background.card,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },

  brandMarkText: {
    fontSize: typography.size.xs,
    lineHeight: typography.lineHeight.xs,
    color: colors.brand.terracotta,
    fontWeight: typography.weight.semibold,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },

  refineCard: {
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.background.card,
    padding: spacing.lg,
    gap: spacing.md,
  },

  refineLabel: {
    fontSize: typography.size.xs,
    lineHeight: typography.lineHeight.xs,
    color: colors.text.muted,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: typography.weight.semibold,
  },

  refineInputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
  },

  refineInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.background.app,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    color: colors.text.primary,
  },

  refineSendButton: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brand.copper,
  },

  refineSendButtonDisabled: {
    backgroundColor: colors.background.muted,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },

  refineErrorText: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.status.danger,
  },

  draftCard: {
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.background.card,
    padding: spacing.lg,
    gap: spacing.lg,
  },

  draftHeader: {
    gap: spacing.xs,
  },

  draftTitle: {
    fontSize: typography.size.lg,
    lineHeight: typography.lineHeight.lg,
    color: colors.text.primary,
    fontWeight: typography.weight.bold,
  },

  draftCopy: {
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    color: colors.text.secondary,
  },

  multilineField: {
    minHeight: 156,
    textAlignVertical: "top",
    paddingTop: spacing.md,
  },

  notesField: {
    minHeight: 108,
    textAlignVertical: "top",
    paddingTop: spacing.md,
  },

  footerActionGroup: {
    gap: spacing.md,
    paddingBottom: spacing.md,
  },

  footerStatus: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.status.danger,
  },

  footerActions: {
    flexDirection: "row",
    gap: spacing.md,
  },

  footerButton: {
    flex: 1,
  },
});
