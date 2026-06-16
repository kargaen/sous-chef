import { Feather } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, radius, spacing, typography } from "@/constants";
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
  const [planDayCount, setPlanDayCount] = useState(ctrl.defaultPlanLength);

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

          {/* Plan creation form */}
          <View style={styles.createForm}>
            <View style={styles.createRow}>
              <Text style={styles.createLabel}>Starting</Text>
              <Text style={styles.createValue}>
                {formatDayLabel(currentStartDate)}
              </Text>
            </View>

            <View style={styles.createRow}>
              <Text style={styles.createLabel}>Length</Text>
              <View style={styles.stepperRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Fewer days"
                  onPress={() =>
                    setPlanDayCount((n) => Math.max(1, n - 1))
                  }
                  style={styles.stepperButton}
                >
                  <Feather name="minus" size={14} color={colors.text.secondary} />
                </Pressable>
                <Text style={styles.stepperValue}>
                  {planDayCount} {planDayCount === 1 ? "day" : "days"}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="More days"
                  onPress={() =>
                    setPlanDayCount((n) => Math.min(30, n + 1))
                  }
                  style={styles.stepperButton}
                >
                  <Feather name="plus" size={14} color={colors.text.secondary} />
                </Pressable>
              </View>
            </View>
          </View>

          <Button
            label="Create Plan"
            variant="primary"
            onPress={async () => {
              await ctrl.createPlan(currentStartDate, planDayCount);
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
        onSubmit={(request, usePantry) =>
          ctrl.generateFromRequest(request, usePantry)
        }
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
    gap: spacing.xl,
  },

  createForm: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.background.card,
    overflow: "hidden",
  },

  createRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },

  createLabel: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.text.muted,
  },

  createValue: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },

  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },

  stepperButton: {
    width: 28,
    height: 28,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background.card,
  },

  stepperValue: {
    width: 64,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    textAlign: "center",
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
