import { Feather } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, radius, spacing, typography } from "@/constants";
import { useMealPlanController } from "@/controllers/useMealPlanController";
import type { MealSlotType, SlotInput, SuggestionSlot } from "@/models/types";
import { Button } from "@/views/components/ui";
import { screenStyles, textStyles } from "@/views/styles";

import { DaySection, NudgeSettingsInline, PlanRequestBox } from "../components/meal-plan";
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
  // When a preset is tapped on the empty state, the instructions are queued here
  // so that generateFromRequest fires automatically once activePlan is set.
  const [pendingPreset, setPendingPreset] = useState<string | null>(null);
  const [lastRequest, setLastRequest] = useState<string | null>(null);
  const [savePresetName, setSavePresetName] = useState("");
  const [showSavePreset, setShowSavePreset] = useState(false);

  const currentStartDate = planStart(ctrl.weekStartDay);

  useEffect(() => {
    ctrl.loadPlanForWeek(currentStartDate);
  }, [currentStartDate]);

  // Auto-trigger AI draft after plan is created via a preset.
  useEffect(() => {
    if (pendingPreset && ctrl.activePlan) {
      ctrl.generateFromRequest(pendingPreset).catch(() => {});
      setPendingPreset(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingPreset, ctrl.activePlan?.id]);

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

          {/* Saved presets as quick-start chips */}
          {ctrl.presets.length > 0 ? (
            <View style={styles.presetsSection}>
              <Text style={styles.presetsLabel}>Quick start</Text>
              <View style={styles.presetsRow}>
                {ctrl.presets.map((preset) => (
                  <Pressable
                    key={preset.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Start plan from preset: ${preset.name}`}
                    onPress={async () => {
                      setPendingPreset(preset.instructions);
                      await ctrl.createPlan(currentStartDate, planDayCount);
                    }}
                    style={styles.presetChip}
                  >
                    <Feather name="bookmark" size={12} color={colors.brand.terracotta} />
                    <Text style={styles.presetChipText}>{preset.name}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

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

      {/* Nudge settings */}
      <NudgeSettingsInline />

      {/* AI request box */}
      <PlanRequestBox
        loading={ctrl.loading}
        onSubmit={(request, usePantry) => {
          setLastRequest(request);
          setShowSavePreset(false);
          setSavePresetName("");
          ctrl.generateFromRequest(request, usePantry);
        }}
      />

      {/* Save as preset (shown after a request is submitted) */}
      {lastRequest && !showSavePreset ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Save this request as a preset"
          onPress={() => setShowSavePreset(true)}
          style={styles.savePresetTrigger}
        >
          <Feather name="bookmark" size={12} color={colors.text.muted} />
          <Text style={styles.savePresetTriggerText}>Save as preset</Text>
        </Pressable>
      ) : null}

      {showSavePreset ? (
        <View style={styles.savePresetForm}>
          <TextInput
            style={styles.savePresetInput}
            value={savePresetName}
            onChangeText={setSavePresetName}
            placeholder="Preset name…"
            placeholderTextColor={colors.text.muted}
            returnKeyType="done"
            autoFocus
            onSubmitEditing={async () => {
              if (!savePresetName.trim() || !lastRequest) return;
              await ctrl.savePreset(savePresetName.trim(), lastRequest);
              setShowSavePreset(false);
              setSavePresetName("");
            }}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Save preset"
            onPress={async () => {
              if (!savePresetName.trim() || !lastRequest) return;
              await ctrl.savePreset(savePresetName.trim(), lastRequest);
              setShowSavePreset(false);
              setSavePresetName("");
            }}
            style={styles.savePresetButton}
          >
            <Text style={styles.savePresetButtonText}>Save</Text>
          </Pressable>
        </View>
      ) : null}

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
          onMarkCooked={ctrl.markSlotCooked}
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

  // ── Presets ────────────────────────────────────────────────────────────────

  presetsSection: {
    gap: spacing.xs,
  },

  presetsLabel: {
    fontSize: typography.size.xs,
    lineHeight: typography.lineHeight.xs,
    fontWeight: typography.weight.semibold,
    color: colors.text.muted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },

  presetsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },

  presetChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.brand.terracotta,
    backgroundColor: colors.background.card,
  },

  presetChipText: {
    fontSize: typography.size.xs,
    lineHeight: typography.lineHeight.xs,
    fontWeight: typography.weight.semibold,
    color: colors.brand.terracotta,
  },

  // ── Save as preset ─────────────────────────────────────────────────────────

  savePresetTrigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xxs,
    alignSelf: "flex-start",
    paddingVertical: spacing.xs,
  },

  savePresetTriggerText: {
    fontSize: typography.size.xs,
    lineHeight: typography.lineHeight.xs,
    color: colors.text.muted,
  },

  savePresetForm: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "center",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.background.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },

  savePresetInput: {
    flex: 1,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.text.primary,
    paddingVertical: spacing.xs,
  },

  savePresetButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.brand.terracotta,
  },

  savePresetButtonText: {
    fontSize: typography.size.xs,
    lineHeight: typography.lineHeight.xs,
    fontWeight: typography.weight.semibold,
    color: colors.text.inverse,
  },
});
