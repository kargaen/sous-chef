import { Image } from "expo-image";
import { Pressable, Text, View } from "react-native";

import { styles } from "./AssistantLauncher.styles";

const companionHappy = require("../../../../assets/svg/companion-happy.svg") as number;

export interface AssistantLauncherProps {
  label?: string;
  onPress: () => void;
}

export function AssistantLauncher({
  label = "Open chat",
  onPress,
}: AssistantLauncherProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open Sous Chef chat"
      onPress={onPress}
      style={({ pressed }) => [styles.launcher, pressed && { opacity: 0.85 }]}
    >
      <View style={styles.avatarFrame}>
        <Image
          source={companionHappy}
          style={styles.avatarImage}
          contentFit="contain"
          accessibilityLabel="Sous Chef"
        />
      </View>
      <View style={styles.pill}>
        <Text style={styles.pillText}>{label}</Text>
      </View>
    </Pressable>
  );
}
