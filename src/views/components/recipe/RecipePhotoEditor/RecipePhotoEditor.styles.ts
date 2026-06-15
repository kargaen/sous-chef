import { StyleSheet } from "react-native";

import { colors, radius, spacing, typography } from "@/constants";

export const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },

  heading: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },

  subheading: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.text.secondary,
  },

  frame: {
    position: "relative",
    borderRadius: radius.xl,
    overflow: "hidden",
    backgroundColor: colors.background.muted,
  },

  image: {
    width: "100%",
    height: 200,
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.overlay.scrim,
  },

  overlayText: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text.inverse,
  },

  buttonRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },

  button: {
    flex: 1,
  },

  error: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.status.danger,
  },
});
