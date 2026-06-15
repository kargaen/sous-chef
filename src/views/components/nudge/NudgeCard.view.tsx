import { StyleSheet, Text, View, type ViewStyle } from "react-native";

import { colors, spacing, typography } from "../../../constants";
import { Button } from "../ui";

export type NudgeTone = "default" | "seasonal" | "waste" | "budget";

interface NudgeCardProps {
  title: string;
  body: string;
  tone?: NudgeTone;
  actionLabel?: string;
  onPress?: () => void;
}

export function NudgeCard({
  title,
  body,
  tone = "default",
  actionLabel,
  onPress,
}: NudgeCardProps) {
  return (
    <View style={[styles.card, nudgeToneStyles[tone]]}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>

      {actionLabel && onPress ? (
        <View style={styles.action}>
          <Button
            label={actionLabel}
            size="sm"
            variant="ghost"
            onPress={onPress}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 280,
    minHeight: 156,
    borderRadius: 24,
    borderWidth: 1,
    padding: spacing.lg,
    backgroundColor: colors.background.card,
  },

  title: {
    marginBottom: spacing.sm,
    fontSize: typography.size.lg,
    lineHeight: typography.lineHeight.lg,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },

  body: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.text.secondary,
  },

  action: {
    marginTop: spacing.lg,
    alignItems: "flex-start",
  },
});

const nudgeToneStyles: Record<NudgeTone, ViewStyle> = {
  default: {
    borderColor: colors.border.subtle,
  },
  seasonal: {
    borderColor: colors.brand.sage,
    backgroundColor: "#F5FAF2",
  },
  waste: {
    borderColor: colors.status.warning,
    backgroundColor: "#FFF6E6",
  },
  budget: {
    borderColor: colors.brand.copper,
    backgroundColor: "#FFF1E5",
  },
};
