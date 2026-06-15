import { StyleSheet } from "react-native";

import { colors, spacing } from "@/constants";

export const loadMaskStyles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },

  warm: {
    backgroundColor: "rgba(255, 251, 242, 0.88)",
  },

  neutral: {
    backgroundColor: "rgba(27, 24, 20, 0.22)",
  },

  panel: {
    minWidth: 180,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.background.card,
  },
});
