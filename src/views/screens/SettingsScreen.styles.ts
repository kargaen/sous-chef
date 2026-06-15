import { StyleSheet } from "react-native";

import { colors, radius, spacing, typography } from "@/constants";

export const styles = StyleSheet.create({
  content: {
    padding: spacing.xl,
    gap: spacing.xl,
    paddingBottom: spacing.xxxl,
  },

  introCard: {
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: "rgba(178, 110, 38, 0.28)",
    backgroundColor: "#3A2814",
    padding: spacing.xl,
    overflow: "hidden",
    gap: spacing.md,
  },

  introGlow: {
    position: "absolute",
    right: -40,
    top: -20,
    width: 180,
    height: 180,
    borderRadius: radius.pill,
    backgroundColor: "rgba(213, 143, 30, 0.14)",
  },

  introEyebrow: {
    fontSize: typography.size.xs,
    lineHeight: typography.lineHeight.xs,
    color: "#F3BB5B",
    fontWeight: typography.weight.bold,
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },

  introTitle: {
    maxWidth: 320,
    fontSize: typography.size.xxl,
    lineHeight: typography.lineHeight.xxl,
    color: colors.text.inverse,
    fontWeight: typography.weight.bold,
  },

  introCopy: {
    maxWidth: 360,
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    color: "#E5D2C2",
  },

  sectionBlock: {
    gap: spacing.md,
  },

  sectionEyebrow: {
    fontSize: typography.size.xs,
    lineHeight: typography.lineHeight.xs,
    color: colors.text.muted,
    textTransform: "uppercase",
    letterSpacing: 1.1,
    fontWeight: typography.weight.semibold,
  },

  sectionTitle: {
    fontSize: typography.size.xl,
    lineHeight: typography.lineHeight.xl,
    color: colors.text.primary,
    fontWeight: typography.weight.bold,
  },

  sectionCopy: {
    maxWidth: 420,
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    color: colors.text.secondary,
  },

  card: {
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.background.card,
    padding: spacing.lg,
    gap: spacing.lg,
  },

  cardFocused: {
    borderColor: colors.brand.copper,
    shadowColor: colors.brand.copper,
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },

  cardHeader: {
    gap: spacing.xs,
  },

  cardTitle: {
    fontSize: typography.size.lg,
    lineHeight: typography.lineHeight.lg,
    color: colors.text.primary,
    fontWeight: typography.weight.bold,
  },

  cardCopy: {
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    color: colors.text.secondary,
  },

  fieldGroup: {
    gap: spacing.md,
  },

  toggleRow: {
    gap: spacing.sm,
  },

  toggleLabel: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.text.primary,
    fontWeight: typography.weight.semibold,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },

  toggleOptionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },

  optionChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.background.app,
  },

  optionChipActive: {
    backgroundColor: colors.brand.copper,
    borderColor: colors.brand.copper,
  },

  optionChipText: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.text.secondary,
    fontWeight: typography.weight.medium,
  },

  optionChipTextActive: {
    color: colors.text.inverse,
    fontWeight: typography.weight.bold,
  },

  helperText: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.text.muted,
  },

  textArea: {
    minHeight: 108,
    maxHeight: 180,
  },

  actionColumn: {
    gap: spacing.sm,
  },

  footerActions: {
    gap: spacing.md,
  },
});
