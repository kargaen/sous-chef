import { StyleSheet } from "react-native";
import { spacing } from "@/constants";

export const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: "box-none",
    zIndex: 10,
    elevation: 10,
  },

  launcherAnchor: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: "flex-end",
    alignItems: "flex-end",
    gap: spacing.sm,
    pointerEvents: "box-none",
  },
});
