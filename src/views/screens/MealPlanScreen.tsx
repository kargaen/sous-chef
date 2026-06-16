import { Feather } from "@expo/vector-icons";
import { useEffect } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, spacing } from "@/constants";
import { useMealPlanController } from "@/controllers/useMealPlanController";
import type { MealSlotType, SlotInput, SuggestionSlot } from "@/models/types";
import { Button } from "@/views/components/ui";
import { screenStyles, textStyles } from "@/views/styles";

import { DaySection, PlanRequestBox } from "../components/meal-plan";
import {
  eachPlanDay,
  formatDayLabel,
  planStart,
  todayKey,
} from "../../utils/planDateUtils";

export default function MealPlanScreen() {
  const insets = useSafeAreaInsets();
  const ctrl = useMealPlanController();

  const currentStartDate = planStart(ctrl.weekStartDay);

  useEffect(() => {
    ctrl.loadPlanForWeek(currentStartDate);
  }, [currentStartDate]);

  // Resolve a recipe title from the controller's already-loaded savedRecipes cache.
  // Slot recipeIds reference saved recipes only, so no extra fetch is needed.
  const resolveRecipeTitle = (recipeId: string): string | null =>
    ctrl.savedRecipes.find((r) => r.id === recipeId)?.title ?? null;

  const handleAddSlot = async (
    date: string,
    type: MealSlotType,
    input: SlotInput,
  ) => {
    await ctrl.submitSlotInput(date, type, input);
  };

  const handleSuggest = async (date: string, type: MealSlotType) => {
    const text = await ctrl.suggestForSlot(date, type);
    if (text) ctrl.addSuggestionSlot(date, type, text);
  };

  const handleAcceptSuggestion = async (slot: SuggestionSlot) => {
    await ctrl.acceptSuggestion(slot);
  };

  // ── No plan state ─────────────────────────────────────────────────────────

  if (!ctrl.loading && !ctrl.activePlan) {
    return (
      <View
        style={[
          screenStyles.screen,
          styles.centered,
          { paddingTop: insets.top + spacing.xl },
        ]}
      >
        <View style={styles.emptyWrap}>
          <Text style={textStyles.screenTitle}>Meal Plan</Text>
          <Text style={[textStyles.description, { marginBottom: spacing.xl }]}>
            Plan your week, one day at a time. Add meals by hand or let Sous
            Chef draft the whole week for you.
          </Text>
          <Button
            label="Create this week's plan"
            variant="primary"
            onPress={async () => {
              await ctrl.createPlan(currentStartDate);
            }}
          />
        </View>
      </View>
    );
  }

  // ── Active plan ───────────────────────────────────────────────────────────

  const plan = ctrl.activePlan;
  const today = todayKey();
  const days = plan ? eachPlanDay(plan.weekStartDate, plan.dayCount) : [];

  const spentDays = days.filter((d) => d < today);
  const activeDays = days.filter((d) => d >= today);

  const slotsForDay = (date: string) =>
    (plan?.slots ?? []).filter((s) => s.date === date);

  const suggestionsForDay = (date: string) =>
    ctrl.draftSlots.filter((s) => s.date === date);

  return (
    <ScrollView
      style={screenStyles.screen}
      contentContainerStyle={[
        screenStyles.scrollContent,
        { paddingTop: insets.top + spacing.md },
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={screenStyles.header}>
        <Text style={textStyles.eyebrow}>Meal Plan</Text>
        <Text style={textStyles.screenTitleCompact} numberOfLines={1}>
          {plan
            ? formatDayLabel(plan.weekStartDate).replace(/\w+\s/, "") +
              " – " +
              formatDayLabel(days[days.length - 1] ?? plan.weekStartDate).replace(/\w+\s/, "")
            : "This week"}
        </Text>
      </View>

      {/* AI request box */}
      <PlanRequestBox
        loading={ctrl.loading}
        onSubmit={(request) => ctrl.generateFromRequest(request)}
      />

      {/* Spent days (collapsed summary) */}
      {spentDays.length > 0 ? (
        <View style={styles.spentGroup}>
          <Text style={styles.spentLabel}>
            Earlier this plan · {spentDays.length} day
            {spentDays.length !== 1 ? "s" : ""}
          </Text>
        </View>
      ) : null}

      {/* Active days */}
      {activeDays.map((date) => (
        <DaySection
          key={date}
          date={date}
          dateLabel={formatDayLabel(date)}
          isToday={date === today}
          slots={slotsForDay(date)}
          suggestionSlots={suggestionsForDay(date)}
          pendingActions={ctrl.pendingActions}
          savedRecipes={ctrl.savedRecipes}
          resolveRecipeTitle={resolveRecipeTitle}
          onAddSlot={handleAddSlot}
          onRemoveSlot={ctrl.removeSlot}
          onAcceptSuggestion={handleAcceptSuggestion}
          onRejectSuggestion={ctrl.removeSuggestionSlot}
          onSuggest={handleSuggest}
        />
      ))}

      {/* Extend plan */}
      {plan ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add more days to this plan"
          onPress={() => ctrl.extendPlan(7)}
          style={styles.extendButton}
        >
          <Feather name="plus" size={14} color={colors.text.muted} />
          <Text style={styles.extendText}>Add 7 more days</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: {
    justifyContent: "center",
  },

  emptyWrap: {
    paddingHorizontal: spacing.lg,
  },

  spentGroup: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderStyle: "dashed",
  },

  spentLabel: {
    fontSize: 13,
    color: colors.text.muted,
  },

  extendButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    alignSelf: "center",
  },

  extendText: {
    fontSize: 13,
    color: colors.text.muted,
  },
});
