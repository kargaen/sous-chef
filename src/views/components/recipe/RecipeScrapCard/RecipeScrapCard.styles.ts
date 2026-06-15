import { StyleSheet } from "react-native";

import { spacing, typography } from "@/constants";

export const styles = StyleSheet.create({
  cardContainer: {
    position: "relative",
    width: "100%",
    marginBottom: spacing.lg,
    alignItems: "stretch",
  },

  recipePaper: {
    position: "relative",
    overflow: "hidden",
    paddingVertical: spacing.lg,
    backgroundColor: "#FFFBF2",
    borderWidth: 1,
    borderColor: "#E8E3D5",
    shadowColor: "#4A3728",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },

  recipePaperFavorite: {
    borderWidth: 2,
    borderColor: "#D4AF37",
  },

  recipePaperPressed: {
    opacity: 0.92,
  },

  tape: {
    position: "absolute",
    top: -8,
    left: "50%",
    width: 70,
    height: 20,
    marginLeft: -35,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.1)",
    backgroundColor: "rgba(212, 175, 55, 0.2)",
    transform: [{ rotate: "-3deg" }],
    zIndex: 3,
  },

  binderColumn: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 10,
    justifyContent: "space-around",
    paddingVertical: 20,
    zIndex: 2,
  },

  holeOuter: {
    width: 12,
    height: 12,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8E3D5",
  },

  holeInner: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: "#F2EDE4",
  },

  contentPadding: {
    paddingLeft: spacing.xl + 10,
    paddingRight: spacing.lg,
  },

  cobwebContainer: {
    position: "absolute",
    top: -18,
    left: 0,
    width: 200,
    height: 150,
    zIndex: 2,
    opacity: 0.2,
  },

  stain: {
    position: "absolute",
    borderRadius: 50,
    zIndex: 1,
  },

  recipePaperHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },

  recipePaperTitle: {
    flex: 1,
    fontSize: typography.size.lg,
    lineHeight: typography.lineHeight.lg,
    fontWeight: typography.weight.bold,
    color: "#332B25",
  },

  recipePaperStar: {
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    color: "#D4AF37",
  },

  recipePaperDescription: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: "#6D5D51",
    fontStyle: "italic",
    marginBottom: spacing.md,
  },

  recipeMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },

  recipeMetaChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#F4EBDD",
  },

  recipeMetaChipText: {
    fontSize: typography.size.xs,
    lineHeight: typography.lineHeight.xs,
    fontWeight: typography.weight.semibold,
    color: "#7D6857",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },

  recipePaperFooter: {
    borderTopWidth: 1,
    borderTopColor: "#F0EBE0",
    paddingTop: spacing.sm,
  },

  recipePaperFooterText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: typography.weight.bold,
    color: "#9E8E81",
    letterSpacing: 0.8,
  },
});
