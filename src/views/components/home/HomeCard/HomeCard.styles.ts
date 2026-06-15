import { StyleSheet } from "react-native";

import { colors, radius, spacing, typography } from "@/constants";

export const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.background.card,
    padding: spacing.lg,
    gap: spacing.md,
  },

  // Urgency guardrail (epic): urgency must read by more than rank order, so an
  // urgent card gets a warm accent + an icon. Layered over the base `card`.
  cardUrgent: {
    borderColor: colors.brand.terracottaDark,
    backgroundColor: "#FFF1E5",
  },

  // Invite: a gentler, open-ended prompt (often an empty-app state).
  cardInvite: {
    borderStyle: "dashed",
    borderColor: colors.border.strong,
  },

  header: {
    gap: spacing.xs,
  },

  eyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },

  eyebrow: {
    fontSize: typography.size.xs,
    lineHeight: typography.lineHeight.xs,
    fontWeight: typography.weight.semibold,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.brand.terracotta,
  },

  eyebrowUrgent: {
    color: colors.brand.terracottaDark,
  },

  title: {
    fontSize: typography.size.lg,
    lineHeight: typography.lineHeight.lg,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },

  body: {
    gap: spacing.sm,
  },

  // LLM garnish — only rendered when a hint is present.
  hintBlock: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.background.muted,
  },

  hintMark: {
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
  },

  hintBody: {
    flex: 1,
    gap: spacing.xxs,
  },

  hintLabel: {
    fontSize: typography.size.xs,
    lineHeight: typography.lineHeight.xs,
    fontWeight: typography.weight.semibold,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.text.muted,
  },

  hintText: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.text.secondary,
  },

  actionRow: {
    marginTop: spacing.xs,
    gap: spacing.sm,
  },

  loadingWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.lg,
  },
});
