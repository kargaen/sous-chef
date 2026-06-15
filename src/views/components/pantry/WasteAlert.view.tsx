import { StyleSheet, Text, View } from "react-native";

import { colors, spacing, typography } from "../../../constants";
import { Button } from "../ui";

interface WasteAlertProps {
  title: string;
  body: string;
  actionLabel?: string;
  dismissLabel?: string;
  onPress?: () => void;
  onDismiss?: () => void;
}

export function WasteAlert({
  title,
  body,
  actionLabel,
  dismissLabel = "Dismiss",
  onPress,
  onDismiss,
}: WasteAlertProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>Waste-aware nudge</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>

      {actionLabel && onPress ? (
        <View style={styles.actions}>
          <Button label={actionLabel} size="sm" onPress={onPress} />
          {onDismiss ? (
            <Button
              label={dismissLabel}
              size="sm"
              variant="ghost"
              onPress={onDismiss}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.status.warning,
    backgroundColor: "#FFF6E6",
    padding: spacing.lg,
  },

  eyebrow: {
    marginBottom: spacing.xs,
    fontSize: typography.size.xs,
    lineHeight: typography.lineHeight.xs,
    fontWeight: typography.weight.semibold,
    color: colors.status.warning,
    textTransform: "uppercase",
    letterSpacing: 0.7,
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

  actions: {
    marginTop: spacing.lg,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
});
