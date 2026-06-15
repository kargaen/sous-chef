import { StyleSheet } from "react-native";

import { colors, spacing, typography } from "../../../../constants";

export const spinnerStyles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    padding: spacing.lg,
  },

  label: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.text.secondary,
  },
});
