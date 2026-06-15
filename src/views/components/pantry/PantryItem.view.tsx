import { Pressable, StyleSheet, Text, View } from "react-native";

import { type StorageZone } from "@/models/types";
import { STORAGE_ZONE_LABELS } from "@/utils/pantry";
import { colors, spacing, typography } from "../../../constants";
import { Badge } from "../ui";
import { ExpiryChip, type ExpiryStatus } from "./ExpiryChip.view";

interface PantryItemProps {
  name: string;
  quantity: string;
  zone: StorageZone;
  expiryStatus: ExpiryStatus;
  expiryLabel?: string;
  onPress?: () => void;
  selected?: boolean;
}

export function PantryItem({
  name,
  quantity,
  zone,
  expiryStatus,
  expiryLabel,
  onPress,
  selected = false,
}: PantryItemProps) {
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : "text"}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.container,
        selected ? styles.selected : null,
        pressed && onPress ? styles.pressed : null,
      ]}
    >
      <View style={styles.main}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.quantity}>{quantity}</Text>

        <View style={styles.zone}>
          <Badge label={STORAGE_ZONE_LABELS[zone]} tone="neutral" />
        </View>
      </View>

      <ExpiryChip status={expiryStatus} label={expiryLabel} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 84,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.background.card,
    padding: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },

  selected: {
    borderColor: colors.brand.terracotta,
    backgroundColor: colors.background.muted,
  },

  pressed: {
    opacity: 0.82,
  },

  main: {
    flex: 1,
  },

  name: {
    marginBottom: spacing.xs,
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },

  quantity: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.text.secondary,
  },

  zone: {
    marginTop: spacing.sm,
  },
});
