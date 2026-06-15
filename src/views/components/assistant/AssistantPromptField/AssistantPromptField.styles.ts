import { StyleSheet } from "react-native";

import { colors, radius, spacing, typography } from "@/constants";

export const styles = StyleSheet.create({
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.background.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },

  input: {
    flex: 1,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.text.primary,
    paddingVertical: spacing.xs,
  },

  sendButton: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.brand.terracottaDark,
    alignItems: "center",
    justifyContent: "center",
  },

  sendButtonDisabled: {
    backgroundColor: colors.background.muted,
  },

  sendButtonLabel: {
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    color: colors.text.inverse,
    fontWeight: typography.weight.bold,
  },
});
