import { ActivityIndicator, Text, View } from "react-native";

import { colors } from "../../../../constants";
import { spinnerStyles } from "./Spinner.styles";

interface SpinnerProps {
  label?: string;
}

export function Spinner({ label }: SpinnerProps) {
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label ?? "Loading"}
      style={spinnerStyles.container}
    >
      <ActivityIndicator color={colors.brand.terracotta} />
      {label ? <Text style={spinnerStyles.label}>{label}</Text> : null}
    </View>
  );
}
