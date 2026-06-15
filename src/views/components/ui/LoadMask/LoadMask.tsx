import { View } from "react-native";

import { Spinner } from "../Spinner";
import { loadMaskStyles } from "./LoadMask.styles";

export type LoadMaskTone = "neutral" | "warm";

type LoadMaskProps = {
  visible: boolean;
  label?: string;
  tone?: LoadMaskTone;
};

export function LoadMask({
  visible,
  label,
  tone = "neutral",
}: LoadMaskProps) {
  if (!visible) {
    return null;
  }

  return (
    <View style={[loadMaskStyles.container, loadMaskStyles[tone]]}>
      <View style={loadMaskStyles.panel}>
        <Spinner label={label} />
      </View>
    </View>
  );
}
