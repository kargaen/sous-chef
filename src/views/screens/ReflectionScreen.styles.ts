import { StyleSheet } from "react-native";

import { colors, radius, spacing, typography } from "@/constants";

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background.app,
  },

  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },

  backButton: {
    paddingVertical: spacing.xs,
    paddingRight: spacing.sm,
  },

  backLabel: {
    fontSize: typography.size.lg,
    color: colors.text.secondary,
  },

  headerTitle: {
    flex: 1,
    fontSize: typography.size.lg,
    lineHeight: typography.lineHeight.lg,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },

  brand: {
    fontSize: typography.size.sm,
    color: colors.text.muted,
    fontWeight: typography.weight.semibold,
  },

  content: {
    padding: spacing.lg,
    gap: spacing.xl,
  },

  introCard: {
    padding: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: colors.background.muted,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    gap: spacing.sm,
  },

  introEyebrow: {
    fontSize: typography.size.xs,
    lineHeight: typography.lineHeight.xs,
    fontWeight: typography.weight.semibold,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.brand.terracotta,
  },

  introTitle: {
    fontSize: typography.size.xl,
    lineHeight: typography.lineHeight.xl,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },

  introCopy: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.text.secondary,
  },

  section: {
    gap: spacing.sm,
  },

  sectionEyebrow: {
    fontSize: typography.size.xs,
    lineHeight: typography.lineHeight.xs,
    fontWeight: typography.weight.semibold,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.text.muted,
  },

  sectionTitle: {
    fontSize: typography.size.lg,
    lineHeight: typography.lineHeight.lg,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },

  sectionCopy: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.text.secondary,
  },

  card: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.background.card,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    gap: spacing.md,
    marginTop: spacing.xs,
  },

  cardTitle: {
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },

  cardCopy: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.text.muted,
  },

  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },

  ratingLabel: {
    flex: 1,
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    color: colors.text.primary,
  },

  noteInput: {
    minHeight: 96,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.background.app,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    color: colors.text.primary,
    textAlignVertical: "top",
  },

  footer: {
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },

  footerButton: {
    flex: 1,
  },

  statusWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
});
