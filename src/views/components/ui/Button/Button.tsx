import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { colors } from "../../../../constants";
import {
  buttonLabelSizeStyles,
  buttonLabelVariantStyles,
  buttonSizeStyles,
  buttonStyles,
  buttonVariantStyles,
} from "./Button.styles";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps {
  label: string;
  onPress?: (event: GestureResponderEvent) => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  leftAccessory?: ReactNode;
  rightAccessory?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  label,
  onPress,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  leftAccessory,
  rightAccessory,
  style,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        buttonStyles.base,
        buttonVariantStyles[variant],
        buttonSizeStyles[size],
        isDisabled && buttonStyles.disabled,
        pressed && !isDisabled && buttonStyles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={
            variant === "primary" || variant === "danger"
              ? colors.text.inverse
              : colors.brand.terracotta
          }
        />
      ) : (
        <>
          {leftAccessory}
          <Text
            style={[
              buttonStyles.label,
              buttonLabelVariantStyles[variant],
              buttonLabelSizeStyles[size],
            ]}
          >
            {label}
          </Text>
          {rightAccessory}
        </>
      )}
    </Pressable>
  );
}
