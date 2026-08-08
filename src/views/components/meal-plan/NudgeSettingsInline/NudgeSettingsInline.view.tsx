import { Feather } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text } from "react-native";

import { colors, radius, spacing, typography } from "@/constants";
import { useSettingsController } from "@/controllers/useSettingsController";
import type { SustainabilityNudgeLevel } from "@/models/types/Settings.types";

const LEVELS: SustainabilityNudgeLevel[] = [
  "off",
  "subtle",
  "default",
  "prominent",
];

const LEVEL_LABELS: Record<SustainabilityNudgeLevel, string> = {
  off: "Off",
  subtle: "Subtle",
  default: "Default",
  prominent: "Prominent",
};

const nextLevel = (current: SustainabilityNudgeLevel): SustainabilityNudgeLevel => {
  const idx = LEVELS.indexOf(current);
  return LEVELS[(idx + 1) % LEVELS.length];
};

export function NudgeSettingsInline() {
  const settingsCtrl = useSettingsController();
  const current: SustainabilityNudgeLevel =
    settingsCtrl.settings?.sustainabilityNudges ?? "default";

  const handleCycle = async () => {
    await settingsCtrl.updateField({ sustainabilityNudges: nextLevel(current) });
  };

  if (current === "off") return null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Sustainability nudge: ${LEVEL_LABELS[current]}. Tap to change.`}
      onPress={handleCycle}
      style={styles.pill}
    >
      <Feather name="feather" size={12} color={colors.brand.sage} />
      <Text style={styles.label}>
        Nudge: <Text style={styles.value}>{LEVEL_LABELS[current]}</Text>
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.brand.sage,
    backgroundColor: colors.background.card,
  },

  label: {
    fontSize: typography.size.xs,
    lineHeight: typography.lineHeight.xs,
    color: colors.text.muted,
  },

  value: {
    fontWeight: typography.weight.semibold,
    color: colors.brand.sageDark,
  },
});
