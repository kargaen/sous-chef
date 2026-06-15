import { StyleSheet, Text, View } from "react-native";

import { colors, spacing, typography } from "../../constants";

interface PlaceholderScreenProps {
  title: string;
  description: string;
}

export function PlaceholderScreen({
  title,
  description,
}: PlaceholderScreenProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>Sous Chef</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.xl,
    justifyContent: "center",
    backgroundColor: colors.background.app,
  },

  eyebrow: {
    marginBottom: spacing.sm,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.brand.terracotta,
    fontWeight: typography.weight.semibold,
  },

  title: {
    marginBottom: spacing.md,
    fontSize: typography.size.xxl,
    lineHeight: typography.lineHeight.xxl,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },

  description: {
    maxWidth: 340,
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    color: colors.text.secondary,
  },
});
