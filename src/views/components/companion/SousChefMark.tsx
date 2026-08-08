import { Image } from "expo-image";
import { Pressable } from "react-native";

interface SousChefMarkProps {
  size?: number;
  onPress?: () => void;
}

export function SousChefMark({ size = 24, onPress }: SousChefMarkProps) {
  const image = (
    <Image
      source={require("../../../assets/svg/companion-happy.svg")}
      style={{ width: size, height: size }}
      contentFit="contain"
      accessibilityLabel="Sous Chef"
    />
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress}>
        {image}
      </Pressable>
    );
  }

  return image;
}
