import { StyleSheet } from "react-native";

import { colors, radius, spacing, typography } from "@/constants";

export const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },

  section: {
    gap: spacing.xs,
  },

  sectionLabel: {
    fontSize: typography.size.xs,
    lineHeight: typography.lineHeight.xs,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: colors.text.muted,
    marginBottom: spacing.xs,
  },

  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
  },

  rowAdded: {
    backgroundColor: "#EAF1E2",
  },

  rowRemoved: {
    backgroundColor: "#F8E7E3",
  },

  marker: {
    width: 14,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    fontWeight: "700",
    textAlign: "center",
  },

  markerAdded: {
    color: colors.status.success,
  },

  markerRemoved: {
    color: colors.status.danger,
  },

  markerUnchanged: {
    color: colors.border.strong,
  },

  rowText: {
    flex: 1,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.text.primary,
  },

  rowTextAdded: {
    color: colors.brand.sageDark,
  },

  rowTextRemoved: {
    color: colors.status.danger,
    textDecorationLine: "line-through",
  },

  rowTextUnchanged: {
    color: colors.text.secondary,
  },
});
