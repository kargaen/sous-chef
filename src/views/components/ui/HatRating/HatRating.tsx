import { Pressable, StyleSheet, View } from "react-native";

import { colors, spacing } from "@/constants";

import { ChefHat } from "./ChefHat";

export interface HatRatingProps {
  /** Current score, 0 = unrated. */
  value: number;
  onChange: (value: number) => void;
  max?: number;
  size?: number;
}

export function HatRating({ value, onChange, max = 5, size = 26 }: HatRatingProps) {
  return (
    <View style={styles.row}>
      {Array.from({ length: max }, (_, index) => {
        const position = index + 1;
        const filled = position <= value;

        return (
          <Pressable
            key={position}
            accessibilityRole="button"
            accessibilityLabel={`Rate ${position} of ${max}`}
            // Re-tapping the current score clears it back to unrated.
            onPress={() => onChange(value === position ? 0 : position)}
            hitSlop={6}
            style={[styles.hatButton, filled ? styles.filled : styles.empty]}
          >
            <ChefHat size={size} color={colors.brand.terracotta} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  hatButton: {
    paddingVertical: spacing.xxs,
  },
  filled: {
    opacity: 1,
  },
  empty: {
    opacity: 0.25,
  },
});
