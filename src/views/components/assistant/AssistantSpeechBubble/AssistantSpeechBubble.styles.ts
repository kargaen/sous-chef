import { StyleSheet } from "react-native";

import { colors, radius, spacing, typography } from "@/constants";

export const styles = StyleSheet.create({
  bubble: {
    maxWidth: 260,
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

  bubbleHappy: {
    backgroundColor: "#F3FAEE",
  },

  bubbleExhausted: {
    backgroundColor: "#FFF7EE",
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

  // Two-triangle tail: border layer behind, fill layer on top
  tailBorder: {
    position: "absolute",
    bottom: -13,
    right: 22,
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 13,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: colors.border.subtle,
  },

  tailFill: {
    position: "absolute",
    bottom: -11,
    right: 23,
    width: 0,
    height: 0,
    borderLeftWidth: 9,
    borderRightWidth: 9,
    borderTopWidth: 11,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    // borderTopColor set inline to match tone background
  },
});
