import { StyleSheet } from "react-native";

import { colors, typography } from "@/constants";

export const styles = StyleSheet.create({
  suggestionTitle: {
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },

  meta: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.text.secondary,
  },
});
