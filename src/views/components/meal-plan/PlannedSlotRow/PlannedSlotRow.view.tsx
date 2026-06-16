import { Feather } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { colors } from "@/constants";
import type { AdaptationIntent, MealSlot, MealSlotType, SuggestionSlot } from "@/models/types";

import { styles } from "./PlannedSlotRow.styles";

const TYPE_LABELS: Record<MealSlotType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

// ── Persisted slot row ──────────────────────────────────────────────────────

export interface PlannedSlotRowProps {
  slot: MealSlot;
  recipeTitle?: string;
  pendingActions: AdaptationIntent[];
  onRemove: (slotId: string) => void;
  onMarkCooked?: (slotId: string) => void;
}

export function PlannedSlotRow({
  slot,
  recipeTitle,
  pendingActions,
  onRemove,
  onMarkCooked,
}: PlannedSlotRowProps) {
  const hasRecipe = !!slot.recipeId && !!recipeTitle;
  const scaleMultiplier =
    slot.servings != null && slot.servings > 0 ? slot.servings : null;
  const isCooked = slot.status === "cooked";

  const slotActions = pendingActions.filter((a) => a.slotId === slot.id);

  return (
    <View style={[styles.row, isCooked && styles.rowCooked]}>
      <Text style={[styles.typeLabel, isCooked && styles.typeLabelCooked]}>
        {TYPE_LABELS[slot.type]}
      </Text>

      <View style={styles.contentColumn}>
        {hasRecipe ? (
          <View style={[styles.recipeChip, isCooked && styles.recipeChipCooked]}>
            <Text style={[styles.recipeChipText, isCooked && styles.recipeChipTextCooked]}>
              {recipeTitle}
            </Text>
            {scaleMultiplier != null && !isCooked ? (
              <Text style={styles.scaleBadge}>· {scaleMultiplier} srv</Text>
            ) : null}
          </View>
        ) : null}

        {slot.note ? (
          <Text style={[styles.noteText, isCooked && styles.noteTextCooked]}>
            {slot.note}
          </Text>
        ) : null}

        {!isCooked
          ? slotActions.map((action, i) => (
              <View key={`${action.slotId}-${i}`} style={styles.adaptationBadge}>
                <Feather name="zap" size={10} color={colors.brand.copper} />
                <Text style={styles.adaptationBadgeText}>
                  Adapt: {action.description}
                </Text>
              </View>
            ))
          : null}
      </View>

      {!isCooked && onMarkCooked ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Mark ${TYPE_LABELS[slot.type]} as cooked`}
          hitSlop={8}
          onPress={() => onMarkCooked(slot.id)}
          style={styles.cookButton}
        >
          <Feather name="check-circle" size={16} color={colors.status.success} />
        </Pressable>
      ) : isCooked ? (
        <Feather name="check-circle" size={16} color={colors.status.success} style={styles.cookButton} />
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Remove ${TYPE_LABELS[slot.type]} slot`}
        hitSlop={8}
        onPress={() => onRemove(slot.id)}
        style={styles.removeButton}
      >
        <Feather name="x" size={16} color={colors.text.muted} />
      </Pressable>
    </View>
  );
}

// ── Suggestion slot row ─────────────────────────────────────────────────────

export interface SuggestionSlotRowProps {
  slot: SuggestionSlot;
  onAccept: (slot: SuggestionSlot) => void;
  onReject: (id: string) => void;
}

export function SuggestionSlotRow({
  slot,
  onAccept,
  onReject,
}: SuggestionSlotRowProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.typeLabel}>{TYPE_LABELS[slot.type]}</Text>

      <View style={styles.contentColumn}>
        <View style={styles.suggestionChip}>
          <Feather name="zap" size={12} color={colors.brand.terracotta} />
          <Text style={styles.suggestionChipText}>{slot.suggestionText}</Text>
        </View>

        <View style={styles.suggestionActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Accept suggestion"
            hitSlop={8}
            onPress={() => onAccept(slot)}
          >
            <Text style={[styles.adaptationBadgeText, { color: colors.status.success }]}>
              Add to plan
            </Text>
          </Pressable>
          <Text style={styles.noteText}>·</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss suggestion"
            hitSlop={8}
            onPress={() => onReject(slot.id)}
          >
            <Text style={styles.noteText}>Dismiss</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
