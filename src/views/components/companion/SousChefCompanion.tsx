import { Image } from "expo-image";
import { Pressable, Text, View } from "react-native";

import { styles } from "./SousChefCompanion.styles";

export type SousChefCompanionTone = "exhausted" | "happy";

type SousChefCompanionProps = {
  visible: boolean;
  tone: SousChefCompanionTone;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss: () => void;
};

function RobotFace({ tone }: Pick<SousChefCompanionProps, "tone">) {
  const source =
    tone === "happy"
      ? require("../../../assets/svg/companion-happy.svg")
      : require("../../../assets/svg/companion-exhausted.svg");

  return (
    <View style={styles.robotWrap}>
      <Image
        source={source}
        style={{ width: "100%", height: "100%" }}
        contentFit="contain"
        accessibilityLabel={tone === "happy" ? "Happy Sous Chef" : "Exhausted Sous Chef"}
      />
    </View>
  );
}

export function SousChefCompanion({
  visible,
  tone,
  message,
  actionLabel,
  onAction,
  onDismiss,
}: SousChefCompanionProps) {
  if (!visible) {
    return null;
  }

  const eyebrow = tone === "happy" ? "Sous Chef" : "Taking a break";

  return (
    <View pointerEvents="box-none" style={styles.container}>
      <View style={styles.row}>
        <RobotFace tone={tone} />

        <View
          style={[
            styles.bubble,
            tone === "happy" ? styles.bubbleHappy : styles.bubbleExhausted,
          ]}
        >
          <View style={styles.eyebrowRow}>
            <Text style={styles.eyebrow}>{eyebrow}</Text>
            <Pressable onPress={onDismiss} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>{"\u00d7"}</Text>
            </Pressable>
          </View>
          <Text style={styles.message}>{message}</Text>
          {actionLabel && onAction ? (
            <Pressable onPress={onAction} style={styles.actionButton}>
              <Text style={styles.actionButtonText}>{actionLabel}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}
