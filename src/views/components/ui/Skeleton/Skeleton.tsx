import { useEffect, useRef } from "react";
import {
  Animated,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { skeletonStyles } from "./Skeleton.styles";

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * A placeholder block that gently pulses while real content loads. Used to
 * reserve a stable layout so the page never reflows under the reader as data
 * arrives (the no-jump loading rule). Native-driven opacity, so it stays cheap.
 */
export function Skeleton({
  width = "100%",
  height = 12,
  radius,
  style,
}: SkeletonProps) {
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.4,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={[
        skeletonStyles.block,
        { width, height, opacity: pulse },
        radius != null ? { borderRadius: radius } : null,
        style,
      ]}
    />
  );
}
