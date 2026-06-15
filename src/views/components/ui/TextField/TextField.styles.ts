import { StyleSheet } from "react-native";

import { colors, radius, spacing, typography } from "@/constants";

export const textFieldStyles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },

  label: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },

  input: {
    minHeight: 48,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.background.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    color: colors.text.primary,
  },

  inputError: {
    borderColor: colors.status.danger,
  },

  helperText: {
    fontSize: typography.size.xs,
    lineHeight: typography.lineHeight.xs,
    color: colors.text.muted,
  },

  errorText: {
    fontSize: typography.size.xs,
    lineHeight: typography.lineHeight.xs,
    color: colors.status.danger,
  },
});
