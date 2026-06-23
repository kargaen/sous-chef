import { Image } from "expo-image";
import { Pressable } from "react-native";

interface SousChefMarkProps {
  size?: number;
  onLongPress?: () => void;
}

export function SousChefMark({ size = 24, onLongPress }: SousChefMarkProps) {
  const image = (
    <Image
      source={require("../../../assets/svg/companion-happy.svg")}
      style={{ width: size, height: size }}
      contentFit="contain"
      accessibilityLabel="Sous Chef"
    />
  );

  if (onLongPress) {
    return (
      <Pressable onLongPress={onLongPress} delayLongPress={3000}>
        {image}
      </Pressable>
    );
  }

  return image;
}
