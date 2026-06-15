import { StyleSheet } from "react-native";

import { colors, radius, spacing, typography } from "@/constants";

export const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
  },

  content: {
    padding: spacing.lg,
    gap: spacing.xl,
    paddingBottom: spacing.xxxl,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },

  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    flex: 1,
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background.card,
  },

  backButtonText: {
    fontSize: typography.size.lg,
    lineHeight: typography.lineHeight.lg,
    color: colors.text.primary,
    fontWeight: typography.weight.bold,
  },

  headerTitle: {
    fontSize: typography.size.xxl,
    lineHeight: typography.lineHeight.xxl,
    color: colors.text.primary,
    fontWeight: typography.weight.bold,
  },

  brandMark: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.background.card,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },

  brandMarkText: {
    fontSize: typography.size.xs,
    lineHeight: typography.lineHeight.xs,
    color: colors.brand.terracotta,
    fontWeight: typography.weight.semibold,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },

  captureCard: {
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: "rgba(178, 110, 38, 0.28)",
    backgroundColor: "#3A2814",
    padding: spacing.xl,
    overflow: "hidden",
    gap: spacing.md,
  },

  captureGlow: {
    position: "absolute",
    right: -40,
    top: -20,
    width: 180,
    height: 180,
    borderRadius: radius.pill,
    backgroundColor: "rgba(213, 143, 30, 0.14)",
  },

  captureEyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },

  captureBadge: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "rgba(243, 187, 91, 0.22)",
    backgroundColor: "rgba(23, 18, 12, 0.42)",
    alignItems: "center",
    justifyContent: "center",
  },

  captureBadgeText: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
  },

  captureEyebrow: {
    fontSize: typography.size.xs,
    lineHeight: typography.lineHeight.xs,
    color: "#F3BB5B",
    fontWeight: typography.weight.bold,
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },

  captureTitle: {
    maxWidth: 320,
    fontSize: 42,
    lineHeight: 44,
    fontWeight: typography.weight.bold,
    color: colors.text.inverse,
  },

  captureCopy: {
    maxWidth: 360,
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    color: "#E5D2C2",
  },

  sectionHeader: {
    gap: spacing.xs,
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
    fontSize: typography.size.xxl,
    lineHeight: typography.lineHeight.xxl,
    color: colors.text.primary,
    fontWeight: typography.weight.bold,
  },

  sectionCopy: {
    maxWidth: 420,
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    color: colors.text.secondary,
  },

  sourceCard: {
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.background.card,
    padding: spacing.lg,
    gap: spacing.md,
  },

  sourceCardTitle: {
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    color: colors.text.muted,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: typography.weight.semibold,
  },

  sourceModeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },

  sourceModeChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.background.app,
  },

  sourceModeChipActive: {
    backgroundColor: colors.brand.copper,
    borderColor: colors.brand.copper,
  },

  sourceModeChipText: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.text.secondary,
    fontWeight: typography.weight.medium,
  },

  sourceModeChipTextActive: {
    color: colors.text.inverse,
    fontWeight: typography.weight.bold,
  },

  sourceActionRow: {
    gap: spacing.md,
  },

  sourceFieldWrap: {
    gap: spacing.sm,
  },

  sourceImportRow: {
    alignItems: "flex-start",
    gap: spacing.md,
  },

  sourceInput: {
    flex: 1,
  },

  sourceInputMultiline: {
    minHeight: 116,
    maxHeight: 220,
    textAlignVertical: "top",
    paddingTop: spacing.md,
  },

  importButton: {
    minWidth: 112,
  },

  sourceFeedback: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.brand.sageDark,
  },

  draftCard: {
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.background.card,
    padding: spacing.lg,
    gap: spacing.lg,
  },

  draftHeader: {
    gap: spacing.xs,
  },

  draftTitle: {
    fontSize: typography.size.lg,
    lineHeight: typography.lineHeight.lg,
    color: colors.text.primary,
    fontWeight: typography.weight.bold,
  },

  draftCopy: {
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    color: colors.text.secondary,
  },

  multilineField: {
    minHeight: 156,
    textAlignVertical: "top",
    paddingTop: spacing.md,
  },

  notesField: {
    minHeight: 108,
    textAlignVertical: "top",
    paddingTop: spacing.md,
  },

  footerActions: {
    flexDirection: "row",
    gap: spacing.md,
  },

  footerStatus: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.status.danger,
  },

  footerActionGroup: {
    gap: spacing.md,
    paddingBottom: spacing.md,
  },

  footerButton: {
    flex: 1,
  },
});
