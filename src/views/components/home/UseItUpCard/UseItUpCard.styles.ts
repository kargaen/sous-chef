import { StyleSheet } from "react-native";

import { colors, typography } from "@/constants";

export const styles = StyleSheet.create({
  body: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.text.secondary,
  },

  pick: {
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
});
