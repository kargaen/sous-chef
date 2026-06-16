import { Text, View } from "react-native";

import type {
  AdaptationIntent,
  MealSlot,
  MealSlotType,
  Recipe,
  SlotInput,
  SuggestionSlot,
} from "@/models/types";

import { AddToDayInput } from "../AddToDayInput";
import { PlannedSlotRow, SuggestionSlotRow } from "../PlannedSlotRow";
import { styles } from "./DaySection.styles";

export interface DaySectionProps {
  date: string;
  dateLabel: string;
  isToday: boolean;
  slots: MealSlot[];
  suggestionSlots: SuggestionSlot[];
  pendingActions: AdaptationIntent[];
  savedRecipes: Recipe[];
  resolveRecipeTitle: (recipeId: string) => string | null;
  onAddSlot: (date: string, type: MealSlotType, input: SlotInput) => void;
  onRemoveSlot: (slotId: string) => void;
  onAcceptSuggestion: (slot: SuggestionSlot) => void;
  onRejectSuggestion: (id: string) => void;
  onSuggest?: (date: string, type: MealSlotType) => void;
}

export function DaySection({
  date,
  dateLabel,
  isToday,
  slots,
  suggestionSlots,
  pendingActions,
  savedRecipes,
  resolveRecipeTitle,
  onAddSlot,
  onRemoveSlot,
  onAcceptSuggestion,
  onRejectSuggestion,
  onSuggest,
}: DaySectionProps) {
  const hasContent = slots.length > 0 || suggestionSlots.length > 0;

  return (
    <View style={[styles.section, isToday && styles.sectionToday]}>
      <View style={[styles.header, isToday && styles.headerToday]}>
        <Text style={[styles.dateLabel, isToday && styles.dateLabelToday]}>
          {dateLabel}
        </Text>
        {isToday ? (
          <View style={styles.todayBadge}>
            <Text style={styles.todayBadgeText}>Today</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.body}>
        {!hasContent ? (
          <View style={styles.emptySlots}>
            <Text style={styles.emptyText}>Nothing planned</Text>
          </View>
        ) : null}

        {slots.map((slot, i) => (
          <View key={slot.id}>
            {i > 0 ? <View style={styles.divider} /> : null}
            <PlannedSlotRow
              slot={slot}
              recipeTitle={
                slot.recipeId ? (resolveRecipeTitle(slot.recipeId) ?? undefined) : undefined
              }
              pendingActions={pendingActions}
              onRemove={onRemoveSlot}
            />
          </View>
        ))}

        {suggestionSlots.map((s, i) => (
          <View key={s.id}>
            {slots.length + i > 0 ? <View style={styles.divider} /> : null}
            <SuggestionSlotRow
              slot={s}
              onAccept={onAcceptSuggestion}
              onReject={onRejectSuggestion}
            />
          </View>
        ))}

        <View style={styles.addRow}>
          <AddToDayInput
            date={date}
            recipes={savedRecipes}
            onSubmit={(type, input) => onAddSlot(date, type, input)}
            onSuggest={
              onSuggest ? (type) => onSuggest(date, type) : undefined
            }
          />
        </View>
      </View>
    </View>
  );
}
