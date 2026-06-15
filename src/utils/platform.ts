import { Dimensions, Platform } from "react-native";

export const isIOS = (): boolean => Platform.OS === "ios";

export const isAndroid = (): boolean => Platform.OS === "android";

export const isWeb = (): boolean => Platform.OS === "web";

export const getPlatformName = (): string => Platform.OS;

export const isTablet = (): boolean => {
  const { width, height } = Dimensions.get("window");
  const shortestSide = Math.min(width, height);

  return shortestSide >= 600;
};

export const isSmallScreen = (): boolean => {
  const { width } = Dimensions.get("window");

  return width < 375;
};
