import { StyleSheet } from "react-native";

import { colors, spacing, typography } from "@/constants";

export const styles = StyleSheet.create({
  header: {
    gap: spacing.sm,
  },

  // Pull-to-conjure affordance (epic G.2). Sits at the foot of the feed and is
  // revealed as the cook overscrolls past the bottom; opacity + scale are driven
  // by the overscroll distance in the screen.
  pullIndicator: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingTop: spacing.md,
  },

  pullText: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text.muted,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  gearButton: {
    padding: spacing.xs,
  },
});
