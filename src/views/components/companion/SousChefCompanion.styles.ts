import { StyleSheet } from "react-native";

import { colors, radius, spacing, typography } from "@/constants";

export const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: spacing.lg,
    bottom: spacing.xl,
    right: spacing.xxxl,
    alignItems: "flex-start",
  },

  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    maxWidth: 320,
  },

  robotWrap: {
    width: 56,
    height: 70,
    alignItems: "center",
    justifyContent: "flex-end",
  },

  robotAntenna: {
    width: 4,
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.border.strong,
  },

  robotAntennaTip: {
    width: 10,
    height: 10,
    marginBottom: spacing.xxs,
    borderRadius: radius.pill,
    backgroundColor: colors.brand.copper,
  },

  robotHead: {
    width: 52,
    height: 44,
    marginTop: -2,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border.strong,
    backgroundColor: colors.background.muted,
    alignItems: "center",
    justifyContent: "center",
  },

  robotHeadExhausted: {
    backgroundColor: "#F2E6D5",
  },

  robotHeadHappy: {
    backgroundColor: "#E7F0E1",
  },

  robotEyesRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },

  robotEye: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.text.primary,
  },

  robotEyeExhausted: {
    transform: [{ scaleY: 0.35 }],
    opacity: 0.7,
  },

  robotMouth: {
    width: 18,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.text.muted,
  },

  robotMouthHappy: {
    height: 8,
    borderBottomLeftRadius: radius.pill,
    borderBottomRightRadius: radius.pill,
    borderTopLeftRadius: spacing.none,
    borderTopRightRadius: spacing.none,
  },

  robotBody: {
    width: 30,
    height: 14,
    marginTop: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.border.subtle,
  },

  bubble: {
    flex: 1,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.background.card,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    shadowColor: colors.text.primary,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },

  bubbleExhausted: {
    backgroundColor: "#FFF7EE",
  },

  bubbleHappy: {
    backgroundColor: "#F3FAEE",
  },

  eyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },

  eyebrow: {
    fontSize: typography.size.xs,
    lineHeight: typography.lineHeight.xs,
    color: colors.brand.terracotta,
    fontWeight: typography.weight.bold,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },

  closeButton: {
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },

  closeButtonText: {
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    color: colors.text.muted,
    fontWeight: typography.weight.bold,
  },

  message: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.text.secondary,
  },

  actionButton: {
    alignSelf: "flex-start",
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.brand.terracotta,
  },

  actionButtonText: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.text.inverse,
    fontWeight: typography.weight.bold,
  },
});
