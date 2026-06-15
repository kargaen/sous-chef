import { StyleSheet, type TextStyle, type ViewStyle } from "react-native";

import { colors, spacing, typography } from "../../../../constants";
import type { ButtonSize, ButtonVariant } from "./Button";

export const buttonStyles = StyleSheet.create({
  base: {
    minHeight: 44,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
    borderWidth: 1,
  },

  pressed: {
    opacity: 0.82,
  },

  disabled: {
    opacity: 0.48,
  },

  label: {
    fontWeight: typography.weight.semibold,
  },
});

export const buttonVariantStyles: Record<ButtonVariant, ViewStyle> = {
  primary: {
    backgroundColor: colors.brand.terracotta,
    borderColor: colors.brand.terracotta,
  },
  secondary: {
    backgroundColor: colors.background.muted,
    borderColor: colors.border.subtle,
  },
  ghost: {
    backgroundColor: "transparent",
    borderColor: "transparent",
  },
  danger: {
    backgroundColor: colors.status.danger,
    borderColor: colors.status.danger,
  },
};

export const buttonLabelVariantStyles: Record<ButtonVariant, TextStyle> = {
  primary: {
    color: colors.text.inverse,
  },
  secondary: {
    color: colors.text.primary,
  },
  ghost: {
    color: colors.brand.terracotta,
  },
  danger: {
    color: colors.text.inverse,
  },
};

export const buttonSizeStyles: Record<ButtonSize, ViewStyle> = {
  sm: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  md: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  lg: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
};

export const buttonLabelSizeStyles: Record<ButtonSize, TextStyle> = {
  sm: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
  },
  md: {
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
  },
  lg: {
    fontSize: typography.size.lg,
    lineHeight: typography.lineHeight.lg,
  },
};
