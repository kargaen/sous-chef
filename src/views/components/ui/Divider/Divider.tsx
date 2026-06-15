import { View, type StyleProp, type ViewStyle } from "react-native";

import { dividerStyles } from "./Divider.styles";

interface DividerProps {
  style?: StyleProp<ViewStyle>;
}

export function Divider({ style }: DividerProps) {
  return <View accessibilityRole="none" style={[dividerStyles.base, style]} />;
}
