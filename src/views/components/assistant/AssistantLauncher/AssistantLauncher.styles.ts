import { StyleSheet } from "react-native";
import { colors, radius, spacing, typography } from "@/constants";

export const styles = StyleSheet.create({
  launcher: {
    alignItems: "center",
    gap: spacing.xs,
    shadowColor: colors.text.primary,
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },

  avatarImage: {
    width: "100%",
    height: "100%",
  },

  avatarFrame: {
    width: 64,
    height: 64,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.background.card,
    padding: spacing.sm,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    // Drop shadow so the icon pops off the surface; offset downward so it
    // falls into the nav bar beneath it. (Android via elevation; iOS via shadow*.)
    shadowColor: colors.text.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 8,
  },

  // "Open chat" reads like a bottom-nav tab label sitting in the bar, not a
  // pill stuck to the floating icon.
  pill: {
    paddingHorizontal: spacing.xs,
  },

  pillText: {
    fontSize: typography.size.xs,
    lineHeight: typography.lineHeight.xs,
    fontWeight: typography.weight.medium,
    color: colors.text.secondary,
  },
});
