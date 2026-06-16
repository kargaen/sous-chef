import { StyleSheet } from "react-native";

import { colors, radius, spacing, typography } from "@/constants";

export const styles = StyleSheet.create({
  section: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.background.card,
    overflow: "hidden",
  },

  sectionToday: {
    borderColor: colors.brand.terracotta,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background.muted,
  },

  headerToday: {
    backgroundColor: colors.brand.terracotta,
  },

  dateLabel: {
    flex: 1,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text.secondary,
  },

  dateLabelToday: {
    color: colors.text.inverse,
  },

  todayBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.25)",
  },

  todayBadgeText: {
    fontSize: typography.size.xs,
    lineHeight: typography.lineHeight.xs,
    fontWeight: typography.weight.bold,
    color: colors.text.inverse,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  body: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },

  divider: {
    height: 1,
    backgroundColor: colors.border.subtle,
    marginHorizontal: spacing.md,
  },

  emptySlots: {
    paddingVertical: spacing.md,
  },

  emptyText: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.text.muted,
    fontStyle: "italic",
  },

  addRow: {
    paddingTop: spacing.sm,
  },
});
