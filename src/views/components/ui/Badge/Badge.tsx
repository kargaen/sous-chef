import { Text, View, type StyleProp, type ViewStyle } from "react-native";

import {
  badgeLabelToneStyles,
  badgeStyles,
  badgeToneStyles,
} from "./Badge.styles";

export type BadgeTone = "neutral" | "sage" | "warning" | "danger" | "info";

interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  style?: StyleProp<ViewStyle>;
}

export function Badge({ label, tone = "neutral", style }: BadgeProps) {
  return (
    <View style={[badgeStyles.base, badgeToneStyles[tone], style]}>
      <Text style={[badgeStyles.label, badgeLabelToneStyles[tone]]}>
        {label}
      </Text>
    </View>
  );
}
