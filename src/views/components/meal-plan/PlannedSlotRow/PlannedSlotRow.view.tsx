import { useState } from "react";
import { Feather } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

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
  onAdapt?: (slotId: string, description: string) => void;
  convertingSlotId?: string | null;
  onCreateRecipe?: (slotId: string) => void;
  onCreateVariant?: (slotId: string) => void;
  onOpenRecipe?: (recipeId: string) => void;
  isCooked?: boolean;
}

export function PlannedSlotRow({
  slot,
  recipeTitle,
  pendingActions,
  onRemove,
  onAdapt,
  convertingSlotId,
  onCreateRecipe,
  onCreateVariant,
  onOpenRecipe,
  isCooked = false,
}: PlannedSlotRowProps) {
  const [actionsOpen, setActionsOpen] = useState(false);
  const hasRecipe = !!slot.recipeId && !!recipeTitle;
  const isConverting = convertingSlotId === slot.id;
  const scaleMultiplier =
    slot.servings != null && slot.servings > 0 ? slot.servings : null;
  const slotActions = pendingActions.filter((a) => a.slotId === slot.id);

  return (
    <View style={[styles.row, isCooked && styles.rowCooked]}>
      <Text style={[styles.typeLabel, isCooked && styles.typeLabelCooked]}>
        {TYPE_LABELS[slot.type]}
      </Text>

      <View style={styles.contentColumn}>
        {hasRecipe ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open recipe ${recipeTitle}`}
            disabled={!onOpenRecipe}
            onPress={() => onOpenRecipe?.(slot.recipeId!)}
            style={[styles.recipeChip, isCooked && styles.recipeChipCooked]}
          >
            <Text style={[styles.recipeChipText, isCooked && styles.recipeChipTextCooked]}>
              {recipeTitle}
            </Text>
            {scaleMultiplier != null && !isCooked ? (
              <Text style={styles.scaleBadge}>· {scaleMultiplier} srv</Text>
            ) : null}
          </Pressable>
        ) : null}

        {slot.text ? (
          <Text style={[styles.noteText, isCooked && styles.noteTextCooked]}>
            {slot.text}
          </Text>
        ) : null}

        {slot.note ? (
          <Text style={[styles.noteText, isCooked && styles.noteTextCooked]}>
            {slot.note}
          </Text>
        ) : null}

        {!isCooked
          ? slotActions.map((action, i) =>
              onAdapt && action.description ? (
                <Pressable
                  key={`${action.slotId}-${i}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Apply adaptation: ${action.description}`}
                  hitSlop={8}
                  onPress={() => onAdapt(slot.id, action.description!)}
                  style={styles.adaptationBadge}
                >
                  <Feather name="zap" size={10} color={colors.brand.copper} />
                  <Text style={styles.adaptationBadgeText}>
                    Adapt: {action.description}
                  </Text>
                </Pressable>
              ) : (
                <View key={`${action.slotId}-${i}`} style={styles.adaptationBadge}>
                  <Feather name="zap" size={10} color={colors.brand.copper} />
                  <Text style={styles.adaptationBadgeText}>
                    Adapt: {action.description}
                  </Text>
                </View>
              )
            )
          : null}
      </View>

      {isConverting ? (
        <ActivityIndicator size="small" color={colors.brand.terracotta} />
      ) : null}

      <View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open ${slot.type} meal actions`}
          hitSlop={8}
          onPress={() => setActionsOpen((open) => !open)}
          style={styles.cookButton}
        >
          <Feather name="more-horizontal" size={16} color={colors.text.muted} />
        </Pressable>

        {actionsOpen && slot.text && !slot.recipeId && onCreateRecipe ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Create recipe"
            onPress={() => {
              setActionsOpen(false);
              onCreateRecipe(slot.id);
            }}
          >
            <Text style={styles.noteText}>Create recipe</Text>
          </Pressable>
        ) : null}

        {actionsOpen && slot.recipeId && slot.note && onCreateVariant ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Create variant"
            onPress={() => {
              setActionsOpen(false);
              onCreateVariant(slot.id);
            }}
          >
            <Text style={styles.noteText}>Create variant</Text>
          </Pressable>
        ) : null}
      </View>

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
