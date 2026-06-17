import { StyleSheet } from "react-native";

import { colors, radius, spacing, typography } from "@/constants";

export const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },

  inputRow: {
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderRadius: radius.lg,
    backgroundColor: colors.background.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 72,
  },

  input: {
    flex: 1,
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    color: colors.text.primary,
  },

  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },

  pantryToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.background.card,
  },

  pantryToggleActive: {
    borderColor: colors.brand.terracotta,
    backgroundColor: colors.background.muted,
  },

  pantryToggleText: {
    fontSize: typography.size.xs,
    lineHeight: typography.lineHeight.xs,
    fontWeight: typography.weight.semibold,
    color: colors.text.muted,
  },

  pantryToggleTextActive: {
    color: colors.brand.terracotta,
  },

  button: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.brand.terracotta,
  },

  buttonDisabled: {
    backgroundColor: colors.background.muted,
  },

  buttonText: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text.inverse,
  },
});
