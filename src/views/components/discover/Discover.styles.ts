import { StyleSheet } from "react-native";

import { colors, radius, spacing, typography } from "@/constants";

export const styles = StyleSheet.create({
  section: {
    gap: spacing.md,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: spacing.sm,
  },

  sectionHeaderText: {
    flex: 1,
    gap: spacing.xxs,
  },

  sectionEyebrow: {
    fontSize: typography.size.xs,
    lineHeight: typography.lineHeight.xs,
    fontWeight: typography.weight.semibold,
    color: colors.brand.terracotta,
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  sectionTitle: {
    fontSize: typography.size.lg,
    lineHeight: typography.lineHeight.lg,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },

  sectionActionLabel: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    fontWeight: typography.weight.semibold,
    color: colors.brand.terracotta,
  },

  // Produce strip (In Season)
  produceStrip: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },

  produceChip: {
    borderRadius: radius.pill,
    backgroundColor: colors.brand.sage,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },

  produceChipPressed: {
    opacity: 0.8,
  },

  produceChipText: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text.inverse,
  },

  // Spark card
  sparkCard: {
    borderRadius: radius.xl,
    backgroundColor: colors.background.card,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: spacing.lg,
    gap: spacing.xs,
  },

  sparkCardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },

  sparkTitle: {
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    paddingRight: spacing.lg,
  },

  // Optional ✕ to dismiss an irrelevant card (epic R.1).
  dismissButton: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background.muted,
  },

  dismissIcon: {
    fontSize: 16,
    lineHeight: 18,
    fontWeight: typography.weight.bold,
    color: colors.text.muted,
  },

  sparkHook: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.text.secondary,
  },

  sparkCue: {
    marginTop: spacing.xs,
    fontSize: typography.size.xs,
    lineHeight: typography.lineHeight.xs,
    fontWeight: typography.weight.semibold,
    color: colors.brand.terracotta,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },

  // Theme cards (horizontal)
  themeRow: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },

  themeCard: {
    width: 168,
    borderRadius: radius.xl,
    backgroundColor: colors.background.muted,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: spacing.md,
    gap: spacing.xs,
  },

  themeCardPressed: {
    opacity: 0.9,
  },

  themeEmoji: {
    fontSize: 28,
    lineHeight: 34,
  },

  themeTitle: {
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },

  themeHook: {
    fontSize: typography.size.xs,
    lineHeight: typography.lineHeight.xs,
    color: colors.text.secondary,
  },

  themeMeta: {
    marginTop: spacing.xs,
    fontSize: typography.size.xs,
    lineHeight: typography.lineHeight.xs,
    fontWeight: typography.weight.semibold,
    color: colors.text.muted,
  },

  // Leftover card (warm accent — gentle urgency)
  leftoverCard: {
    borderRadius: radius.xl,
    backgroundColor: "#FFF1E5",
    borderWidth: 1,
    borderColor: colors.border.strong,
    padding: spacing.lg,
    gap: spacing.xs,
  },

  leftoverCardPressed: {
    opacity: 0.92,
  },

  leftoverEyebrow: {
    fontSize: typography.size.xs,
    lineHeight: typography.lineHeight.xs,
    fontWeight: typography.weight.semibold,
    color: colors.brand.terracottaDark,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },

  leftoverTitle: {
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },

  leftoverHook: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.text.secondary,
  },

  // Nudge banner
  nudgeBanner: {
    borderRadius: radius.xl,
    backgroundColor: colors.brand.terracottaDark,
    padding: spacing.lg,
    gap: spacing.xs,
  },

  nudgeBannerPressed: {
    opacity: 0.92,
  },

  nudgeTitle: {
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    fontWeight: typography.weight.bold,
    color: colors.text.inverse,
  },

  nudgeBody: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: "#F8E8DD",
  },

  // Create-something-new card
  createCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border.strong,
    backgroundColor: colors.background.card,
    padding: spacing.lg,
    gap: spacing.xs,
    alignItems: "flex-start",
  },

  createCardPressed: {
    opacity: 0.92,
  },

  createTitle: {
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },

  createCopy: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.text.secondary,
  },
});
