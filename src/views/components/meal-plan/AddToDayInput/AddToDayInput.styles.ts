import { StyleSheet } from "react-native";

import { colors, radius, spacing, typography } from "@/constants";

export const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },

  // ── Text mode ────────────────────────────────────────────────────────────

  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },

  textShell: {
    flex: 1,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.background.card,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },

  textInput: {
    flex: 1,
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    color: colors.text.primary,
    paddingVertical: spacing.sm,
  },

  suggestButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.background.muted,
  },

  suggestButtonText: {
    fontSize: typography.size.xs,
    lineHeight: typography.lineHeight.xs,
    fontWeight: typography.weight.semibold,
    color: colors.brand.terracotta,
  },

  // ── Typeahead dropdown ───────────────────────────────────────────────────

  dropdown: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.background.card,
    overflow: "hidden",
  },

  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },

  dropdownItemLast: {
    borderBottomWidth: 0,
  },

  dropdownItemText: {
    flex: 1,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.text.primary,
  },

  // ── Chip mode ─────────────────────────────────────────────────────────────

  chipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },

  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.brand.terracotta,
  },

  chipText: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text.inverse,
  },

  noteShell: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.background.card,
    paddingHorizontal: spacing.md,
    justifyContent: "center",
  },

  noteInput: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.text.primary,
    paddingVertical: spacing.sm,
  },

  submitButton: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: radius.lg,
    backgroundColor: colors.brand.terracotta,
  },

  submitButtonText: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text.inverse,
  },

  // ── Meal type selector ───────────────────────────────────────────────────

  typeSelector: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.background.muted,
  },

  typeSelectorText: {
    fontSize: typography.size.xs,
    lineHeight: typography.lineHeight.xs,
    fontWeight: typography.weight.semibold,
    color: colors.text.secondary,
  },

  // ── Trigger ──────────────────────────────────────────────────────────────

  addTrigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },

  addTriggerText: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.text.muted,
  },
});
