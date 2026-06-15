import { Image } from "expo-image";

interface SousChefMarkProps {
  size?: number;
}

// The small Sous Chef avatar/brand mark — the happy cook SVG. Use this anywhere
// a "Sous Chef" symbol is needed, instead of a chef emoji.
export function SousChefMark({ size = 24 }: SousChefMarkProps) {
  return (
    <Image
      source={require("../../../assets/svg/companion-happy.svg")}
      style={{ width: size, height: size }}
      contentFit="contain"
      accessibilityLabel="Sous Chef"
    />
  );
}
