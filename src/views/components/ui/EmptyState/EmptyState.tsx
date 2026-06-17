import { StyleSheet, Text, View } from "react-native";

import { spacing } from "@/constants";
import { textStyles } from "@/views/styles";

interface EmptyStateProps {
  message: string;
}

export function EmptyState({ message }: EmptyStateProps) {
  return (
    <View style={styles.wrap}>
      <Text style={textStyles.emptyText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingVertical: spacing.xl,
    alignItems: "center",
    paddingHorizontal: spacing.lg,
  },
});
