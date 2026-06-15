import Svg, { Circle, Rect } from "react-native-svg";

interface ChefHatProps {
  size?: number;
  color?: string;
}

// A simple chef's toque: a puffy crown (three overlapping rounds) over a band.
export function ChefHat({ size = 26, color = "#B8623B" }: ChefHatProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="7.5" cy="8.5" r="4" fill={color} />
      <Circle cx="16.5" cy="8.5" r="4" fill={color} />
      <Circle cx="12" cy="6.5" r="4.8" fill={color} />
      <Rect x="7" y="8" width="10" height="8" fill={color} />
      <Rect x="6" y="15" width="12" height="5" rx="1.4" fill={color} />
    </Svg>
  );
}
