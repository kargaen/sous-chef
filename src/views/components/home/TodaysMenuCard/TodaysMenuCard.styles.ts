import { StyleSheet } from "react-native";

import { colors, spacing, typography } from "@/constants";

export const styles = StyleSheet.create({
  list: {
    gap: spacing.xs,
  },

  row: {
    flexDirection: "row",
    gap: spacing.sm,
  },

  slot: {
    width: 76,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text.muted,
    textTransform: "capitalize",
  },

  title: {
    flex: 1,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.text.primary,
  },

  empty: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.text.secondary,
  },
});
