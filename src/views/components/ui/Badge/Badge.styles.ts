import { StyleSheet, type TextStyle, type ViewStyle } from "react-native";

import { colors, spacing, typography } from "../../../../constants";
import type { BadgeTone } from "./Badge";

export const badgeStyles = StyleSheet.create({
  base: {
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },

  label: {
    fontSize: typography.size.xs,
    lineHeight: typography.lineHeight.xs,
    fontWeight: typography.weight.semibold,
  },
});

export const badgeToneStyles: Record<BadgeTone, ViewStyle> = {
  neutral: {
    backgroundColor: colors.background.muted,
    borderColor: colors.border.subtle,
  },
  sage: {
    backgroundColor: "#EEF3EA",
    borderColor: "#D4E0CD",
  },
  warning: {
    backgroundColor: "#FFF2D8",
    borderColor: "#E8C47D",
  },
  danger: {
    backgroundColor: "#FCE7E3",
    borderColor: "#E6B1A8",
  },
  info: {
    backgroundColor: "#E8F0F5",
    borderColor: "#BFD0DC",
  },
};

export const badgeLabelToneStyles: Record<BadgeTone, TextStyle> = {
  neutral: {
    color: colors.text.secondary,
  },
  sage: {
    color: colors.brand.sageDark,
  },
  warning: {
    color: colors.status.warning,
  },
  danger: {
    color: colors.status.danger,
  },
  info: {
    color: colors.status.info,
  },
};
