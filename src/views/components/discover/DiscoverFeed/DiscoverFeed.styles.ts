import { StyleSheet } from "react-native";

import { radius, spacing } from "@/constants";

export const styles = StyleSheet.create({
  feed: {
    gap: spacing.xl,
  },

  leadStack: {
    gap: spacing.md,
  },

  // Skeleton placeholders for the inspiration lanes (no-jump loading): a section
  // heading plus two spark-card-sized blocks, so the feed reserves space and
  // swaps content in place instead of springing open from a spinner.
  loadingSection: {
    gap: spacing.md,
  },

  loadingTitle: {
    width: 160,
    height: 16,
  },

  loadingCard: {
    width: "100%",
    height: 112,
    borderRadius: radius.xl,
  },
});
