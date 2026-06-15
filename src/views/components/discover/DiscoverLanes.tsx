import type { ReactNode } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import type {
  DiscoverLeftoverViewModel,
  DiscoverNudgeViewModel,
  DiscoverSparkViewModel,
  DiscoverThemeViewModel,
} from "@/controllers";

import { styles } from "./Discover.styles";

interface SectionProps {
  eyebrow?: string;
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  children: ReactNode;
}

export function DiscoverSection({
  eyebrow,
  title,
  actionLabel,
  onAction,
  children,
}: SectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderText}>
          {eyebrow ? <Text style={styles.sectionEyebrow}>{eyebrow}</Text> : null}
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        {actionLabel && onAction ? (
          <Pressable onPress={onAction} accessibilityRole="button">
            <Text style={styles.sectionActionLabel}>{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}

interface ProduceStripProps {
  names: string[];
  onPick: (name: string) => void;
}

export function ProduceStrip({ names, onPick }: ProduceStripProps) {
  if (names.length === 0) return null;

  return (
    <View style={styles.produceStrip}>
      {names.map((name) => (
        <Pressable
          key={name}
          accessibilityRole="button"
          onPress={() => onPick(name)}
          style={({ pressed }) => [
            styles.produceChip,
            pressed && styles.produceChipPressed,
          ]}
        >
          <Text style={styles.produceChipText}>{name}</Text>
        </Pressable>
      ))}
    </View>
  );
}

interface SparkCardProps {
  spark: DiscoverSparkViewModel;
  onPress: () => void;
  /** When provided, a ✕ lets the cook dismiss an irrelevant card (epic R.1). */
  onDismiss?: () => void;
}

export function SparkCard({ spark, onPress, onDismiss }: SparkCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.sparkCard,
        pressed && styles.sparkCardPressed,
      ]}
    >
      {onDismiss ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss this idea"
          hitSlop={8}
          onPress={onDismiss}
          style={styles.dismissButton}
        >
          <Text style={styles.dismissIcon}>×</Text>
        </Pressable>
      ) : null}
      <Text style={styles.sparkTitle}>{spark.title}</Text>
      <Text style={styles.sparkHook}>{spark.hook}</Text>
      <Text style={styles.sparkCue}>Tap to start cooking it →</Text>
    </Pressable>
  );
}

interface ThemeRowProps {
  themes: DiscoverThemeViewModel[];
  onPick: (theme: DiscoverThemeViewModel) => void;
}

export function ThemeRow({ themes, onPick }: ThemeRowProps) {
  if (themes.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.themeRow}
    >
      {themes.map((theme) => (
        <Pressable
          key={theme.id}
          accessibilityRole="button"
          onPress={() => onPick(theme)}
          style={({ pressed }) => [
            styles.themeCard,
            pressed && styles.themeCardPressed,
          ]}
        >
          <Text style={styles.themeEmoji}>{theme.emoji}</Text>
          <Text style={styles.themeTitle}>{theme.title}</Text>
          <Text style={styles.themeHook} numberOfLines={2}>
            {theme.hook}
          </Text>
          <Text style={styles.themeMeta}>
            {theme.matchCount > 0
              ? `${theme.matchCount} in your recipes`
              : "Start something new"}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

interface LeftoverCardProps {
  leftover: DiscoverLeftoverViewModel;
  onPress: () => void;
}

export function LeftoverCard({ leftover, onPress }: LeftoverCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.leftoverCard,
        pressed && styles.leftoverCardPressed,
      ]}
    >
      <Text style={styles.leftoverEyebrow}>Waste less</Text>
      <Text style={styles.leftoverTitle}>{leftover.title}</Text>
      <Text style={styles.leftoverHook}>{leftover.hook}</Text>
    </Pressable>
  );
}

interface NudgeBannerProps {
  nudge: DiscoverNudgeViewModel;
  onPress: () => void;
}

export function NudgeBanner({ nudge, onPress }: NudgeBannerProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.nudgeBanner,
        pressed && styles.nudgeBannerPressed,
      ]}
    >
      <Text style={styles.nudgeTitle}>{nudge.title}</Text>
      <Text style={styles.nudgeBody}>{nudge.body}</Text>
    </Pressable>
  );
}

interface CreateCardProps {
  onPress: () => void;
}

export function CreateCard({ onPress }: CreateCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.createCard,
        pressed && styles.createCardPressed,
      ]}
    >
      <Text style={styles.createTitle}>Start something new</Text>
      <Text style={styles.createCopy}>
        Bring Sous Chef a link, a clipping, or just a craving — we&apos;ll turn
        it into a recipe.
      </Text>
    </Pressable>
  );
}
