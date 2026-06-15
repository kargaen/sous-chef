import { StyleSheet } from "react-native";

import { colors, radius, spacing, typography } from "@/constants";

export const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
    elevation: 20,
    justifyContent: "flex-end",
  },

  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay.scrim,
  },

  shell: {
    width: "100%",
    height: "100%",
    overflow: "hidden",
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.background.card,
    shadowColor: colors.text.primary,
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },

  chrome: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
    backgroundColor: colors.background.card,
  },

  chromeTitle: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  chromeActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },

  chromeAction: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.background.muted,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },

  chromeActionText: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text.secondary,
  },

  body: {
    flex: 1,
  },

  blockedNotice: {
    position: "absolute",
    bottom: spacing.sm,
    left: spacing.lg,
    right: spacing.lg,
    fontSize: typography.size.xs,
    lineHeight: typography.lineHeight.xs,
    color: colors.text.muted,
    textAlign: "center",
  },
});
