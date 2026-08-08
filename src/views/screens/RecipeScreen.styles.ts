import { StyleSheet } from "react-native";

import { colors, radius, spacing, typography } from "@/constants";

export const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
    backgroundColor: colors.background.app,
  },

  screenTransparent: {
    flex: 1,
    backgroundColor: "transparent",
  },

  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },

  backRow: {
    paddingVertical: spacing.xs,
  },

  backLabel: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.text.muted,
    fontWeight: typography.weight.medium,
  },

  heroCard: {
    borderRadius: 30,
    backgroundColor: colors.brand.terracottaDark,
    padding: spacing.xl,
    gap: spacing.md,
  },

  heroGlow: {
    position: "absolute",
    right: -40,
    top: -20,
    width: 180,
    height: 180,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255, 248, 239, 0.12)",
  },

  eyebrow: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    fontWeight: typography.weight.semibold,
    color: "#F9D7BF",
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  title: {
    fontSize: 36,
    lineHeight: 42,
    fontWeight: typography.weight.bold,
    color: colors.text.inverse,
  },

  heroDescription: {
    maxWidth: 420,
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    color: "#F8E8DD",
  },

  statusCard: {
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.background.card,
    padding: spacing.lg,
    gap: spacing.sm,
  },

  statusTitle: {
    fontSize: typography.size.lg,
    lineHeight: typography.lineHeight.lg,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },

  statusCopy: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.text.secondary,
  },

  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },

  tagPill: {
    borderRadius: radius.pill,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },

  tagLabel: {
    fontSize: typography.size.xs,
    lineHeight: typography.lineHeight.xs,
    color: colors.text.inverse,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontWeight: typography.weight.semibold,
  },

  heroEyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  variantTag: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.4)",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },

  variantTagText: {
    fontSize: typography.size.xs,
    lineHeight: typography.lineHeight.xs,
    color: colors.text.inverse,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontWeight: typography.weight.semibold,
  },

  pagerContent: {
    gap: spacing.sm,
  },

  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: -spacing.sm,
  },

  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.border.strong,
    opacity: 0.4,
  },

  dotActive: {
    backgroundColor: colors.brand.terracotta,
    opacity: 1,
  },

  metricStrip: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },

  photoSection: {
    gap: spacing.sm,
  },

  photoFrame: {
    position: "relative",
    borderRadius: radius.xl,
    overflow: "hidden",
    backgroundColor: colors.background.muted,
  },

  photo: {
    width: "100%",
    height: 220,
  },

  photoOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.overlay.scrim,
  },

  photoOverlayText: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text.inverse,
  },

  photoEmpty: {
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border.strong,
    backgroundColor: colors.background.card,
    gap: spacing.sm,
  },

  photoEmptyTitle: {
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },

  photoEmptyCopy: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.text.secondary,
  },

  photoActions: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.sm,
  },

  photoActionButton: {
    flex: 1,
  },

  photoError: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.status.danger,
    paddingHorizontal: spacing.sm,
  },

  statsSection: {
    gap: spacing.sm,
  },

  statsStrip: {
    flexDirection: "row",
    gap: spacing.sm,
  },

  statCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.background.card,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    gap: spacing.xs,
  },

  statLabel: {
    fontSize: typography.size.xs,
    lineHeight: typography.lineHeight.xs,
    fontWeight: typography.weight.semibold,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colors.text.muted,
  },

  statValue: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },

  metricCard: {
    flexGrow: 1,
    minWidth: 104,
    borderRadius: radius.xl,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    padding: spacing.md,
    gap: spacing.xs,
  },

  metricValue: {
    fontSize: typography.size.lg,
    lineHeight: typography.lineHeight.lg,
    fontWeight: typography.weight.bold,
    color: colors.text.inverse,
  },

  metricLabel: {
    fontSize: typography.size.xs,
    lineHeight: typography.lineHeight.xs,
    color: "#F2CEC0",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },

  heroActions: {
    marginTop: spacing.sm,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
    gap: spacing.sm,
  },

  // The two headline actions share the row; the ⋮ trigger keeps its own width.
  heroActionPrimary: {
    flex: 1,
  },

  twoColumnLead: {
    flexDirection: "row",
    gap: spacing.md,
  },

  leadCard: {
    flex: 1,
    gap: spacing.xs,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: "#FFF1E5",
    padding: spacing.md,
  },

  leadLabel: {
    fontSize: typography.size.xs,
    lineHeight: typography.lineHeight.xs,
    color: colors.text.muted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },

  leadValue: {
    fontSize: typography.size.lg,
    lineHeight: typography.lineHeight.lg,
    fontWeight: typography.weight.bold,
    color: colors.brand.terracottaDark,
  },

  section: {
    gap: spacing.md,
  },

  ingredientsCard: {
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.background.card,
    padding: spacing.lg,
    paddingVertical: spacing.sm,
  },

  ingredientRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },

  firstIngredientRow: {
    borderTopWidth: 0,
  },

  ingredientBullet: {
    width: 12,
    height: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.brand.sage,
    marginLeft: spacing.xs,
  },

  ingredientMain: {
    flex: 1,
    gap: spacing.xxs,
  },

  ingredientName: {
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    color: colors.text.primary,
    fontWeight: typography.weight.medium,
  },

  ingredientNote: {
    fontSize: typography.size.xs,
    lineHeight: typography.lineHeight.xs,
    color: colors.text.muted,
  },

  ingredientAmount: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.brand.terracottaDark,
    fontWeight: typography.weight.bold,
  },

  stepsCard: {
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.background.card,
    padding: spacing.lg,
    gap: spacing.md,
  },

  stepRow: {
    flexDirection: "row",
    gap: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },

  firstStepRow: {
    paddingTop: 0,
    borderTopWidth: 0,
  },

  stepIndexWrap: {
    alignItems: "center",
  },

  stepIndex: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.brand.copper,
    alignItems: "center",
    justifyContent: "center",
  },

  stepIndexLabel: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    fontWeight: typography.weight.bold,
    color: colors.text.inverse,
  },

  stepStem: {
    width: 2,
    flex: 1,
    marginTop: spacing.xs,
    backgroundColor: colors.border.subtle,
  },

  stepBody: {
    flex: 1,
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },

  stepHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
  },

  stepTitle: {
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    color: colors.text.primary,
    fontWeight: typography.weight.bold,
  },

  durationChip: {
    borderRadius: radius.pill,
    backgroundColor: colors.background.muted,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },

  durationChipText: {
    fontSize: typography.size.xs,
    lineHeight: typography.lineHeight.xs,
    color: colors.text.secondary,
    fontWeight: typography.weight.semibold,
  },

  stepInstruction: {
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    color: colors.text.secondary,
  },

  notesCard: {
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: "#FFF3E8",
    padding: spacing.lg,
    gap: spacing.md,
  },

  noteBlock: {
    gap: spacing.xs,
  },

  noteBody: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.text.primary,
  },
});
