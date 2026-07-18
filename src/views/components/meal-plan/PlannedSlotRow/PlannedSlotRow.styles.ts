import { StyleSheet } from "react-native";

import { colors, radius, spacing, typography } from "@/constants";

export const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },

  typeLabel: {
    width: 72,
    paddingTop: 2,
    fontSize: typography.size.xs,
    lineHeight: typography.lineHeight.xs,
    fontWeight: typography.weight.semibold,
    color: colors.text.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  contentColumn: {
    flex: 1,
    gap: spacing.xxs,
  },

  recipeChip: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.brand.terracotta,
  },

  recipeChipText: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text.inverse,
  },

  scaleBadge: {
    fontSize: typography.size.xs,
    lineHeight: typography.lineHeight.xs,
    color: colors.text.inverse,
    opacity: 0.8,
  },

  noteText: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.text.secondary,
  },

  adaptationBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xxs,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.brand.copper,
  },

  adaptationBadgeText: {
    fontSize: typography.size.xs,
    lineHeight: typography.lineHeight.xs,
    color: colors.brand.copper,
  },

  cookButton: {
    paddingTop: 2,
    paddingLeft: spacing.xs,
  },

  removeButton: {
    paddingTop: 2,
    paddingLeft: spacing.xs,
  },

  rowCooked: {
    opacity: 0.65,
  },

  typeLabelCooked: {
    color: colors.text.muted,
  },

  recipeChipCooked: {
    backgroundColor: colors.background.card,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },

  recipeChipTextCooked: {
    color: colors.text.muted,
  },

  noteTextCooked: {
    color: colors.text.muted,
  },

  suggestionChip: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.brand.terracotta,
  },

  suggestionChipText: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.brand.terracotta,
  },

  suggestionActions: {
    flexDirection: "row",
    gap: spacing.xs,
    marginTop: spacing.xxs,
  },
});
