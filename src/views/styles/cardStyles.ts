import { StyleSheet } from "react-native";

import { colors, radius, spacing } from "@/constants";

export const cardStyles = StyleSheet.create({
  base: {
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.background.card,
    padding: spacing.lg,
  },

  compact: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.background.card,
    padding: spacing.md,
  },

  warning: {
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.status.warning,
    backgroundColor: "#FFF6E6",
    padding: spacing.lg,
  },
});
