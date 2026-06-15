import { StyleSheet } from "react-native";

import { colors, spacing } from "@/constants";

export const screenStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background.app,
  },

  // Canonical screen content standard (matches the recipe screen): lg side
  // insets, xl gap between sections, generous bottom run-off. Screens override
  // paddingTop inline for the safe-area inset.
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.xl,
    paddingBottom: spacing.xxxl,
  },

  // Full-bleed screens (e.g. Home with its horizontal nudge carousel) own
  // vertical rhythm only; each child supplies its own horizontal inset via
  // `paddedSection`/`hero` so carousels can run edge-to-edge. Spacing matches
  // the canonical screen standard (lg inset on children, xl gap).
  scrollContentBleed: {
    gap: spacing.xl,
    paddingBottom: spacing.xxxl,
  },

  paddedSection: {
    paddingHorizontal: spacing.lg,
  },

  header: {
    gap: spacing.sm,
  },

  hero: {
    paddingHorizontal: spacing.lg,
  },

  actionsRow: {
    marginTop: spacing.xl,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },

  actionsRowTight: {
    marginTop: spacing.md,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },

  list: {
    gap: spacing.md,
  },
});
