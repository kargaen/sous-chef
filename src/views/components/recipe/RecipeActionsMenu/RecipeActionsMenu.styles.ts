import { StyleSheet } from "react-native";

import { colors, radius, spacing, typography } from "@/constants";

export const styles = StyleSheet.create({
  // The trigger sits in the hero action row beside the two primary actions, so
  // it is sized to the row's button height rather than to its own label.
  trigger: {
    paddingHorizontal: spacing.lg,
  },

  // Full width so it wraps onto its own line inside the hero action row.
  menu: {
    width: "100%",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.background.card,
    overflow: "hidden",
  },

  item: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },

  itemLast: {
    borderBottomWidth: 0,
  },

  itemPressed: {
    backgroundColor: colors.background.muted,
  },

  itemLabel: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },

  itemLabelDestructive: {
    color: colors.status.danger,
  },
});
