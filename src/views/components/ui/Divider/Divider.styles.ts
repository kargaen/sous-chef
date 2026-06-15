import { StyleSheet } from "react-native";

import { colors } from "../../../../constants";

export const dividerStyles = StyleSheet.create({
  base: {
    height: StyleSheet.hairlineWidth,
    width: "100%",
    backgroundColor: colors.border.subtle,
  },
});
