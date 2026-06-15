export const colors = {
  background: {
    app: "#FFF8EF",
    card: "#FFFFFF",
    muted: "#F4E8D8",
  },

  text: {
    primary: "#2F241D",
    secondary: "#5C4A3F",
    muted: "#8A7566",
    inverse: "#FFFFFF",
  },

  border: {
    subtle: "#E7D7C5",
    strong: "#C8A98D",
  },

  brand: {
    cream: "#FFF8EF",
    terracotta: "#B8623B",
    terracottaDark: "#8F472B",
    sage: "#7F9272",
    sageDark: "#596B50",
    copper: "#C47A3F",
  },

  status: {
    success: "#6F8F5F",
    warning: "#C9892B",
    danger: "#B94A3A",
    info: "#5F7F9A",
  },

  overlay: {
    scrim: "rgba(47, 36, 29, 0.32)",
  },
} as const;

export type AppColors = typeof colors;
