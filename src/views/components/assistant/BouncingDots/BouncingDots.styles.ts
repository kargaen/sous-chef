import { StyleSheet } from "react-native";

import { colors, radius, spacing } from "@/constants";

export const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },

  dot: {
    width: 7,
    height: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.text.muted,
  },
});
