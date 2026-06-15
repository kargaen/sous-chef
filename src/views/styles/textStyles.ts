import { StyleSheet } from "react-native";

import { colors, spacing, typography } from "@/constants";

export const textStyles = StyleSheet.create({
  eyebrow: {
    marginBottom: spacing.sm,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    fontWeight: typography.weight.semibold,
    color: colors.brand.terracotta,
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  screenTitle: {
    marginBottom: spacing.md,
    fontSize: typography.size.xxl,
    lineHeight: typography.lineHeight.xxl,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },

  screenTitleCompact: {
    fontSize: typography.size.xxl,
    lineHeight: typography.lineHeight.xxl,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },

  description: {
    maxWidth: 360,
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    color: colors.text.secondary,
  },

  sectionTitle: {
    fontSize: typography.size.lg,
    lineHeight: typography.lineHeight.lg,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },

  emptyText: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.text.muted,
  },

  errorText: {
    marginTop: spacing.sm,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.status.danger,
  },
});
