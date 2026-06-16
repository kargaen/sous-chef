import { Feather } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, radius, spacing, typography } from "@/constants";
import { useMealPlanController } from "@/controllers/useMealPlanController";
import { eachPlanDay, todayKey } from "@/utils/planDateUtils";
import { screenStyles, textStyles } from "@/views/styles";

type Scope = "today" | "3days" | "all";

const SCOPE_LABELS: Record<Scope, string> = {
  today: "Today",
  "3days": "3 days",
  all: "Full plan",
};

const SECTION_LABELS: Record<string, string> = {
  produce: "Produce",
  meat: "Meat & Fish",
  dairy: "Dairy",
  bakery: "Bakery & Grains",
  frozen: "Frozen",
  pantry: "Pantry & Spices",
  other: "Other",
};

export default function ShoppingListScreen() {
  const insets = useSafeAreaInsets();
  const ctrl = useMealPlanController();
  const [scope, setScope] = useState<Scope>("3days");

  const plan = ctrl.activePlan;
  const today = todayKey();

  const activeDays = plan
    ? eachPlanDay(plan.weekStartDate, plan.dayCount).filter((d) => d >= today)
    : [];

  const scopedDates: string[] =
    scope === "today"
      ? activeDays.slice(0, 1)
      : scope === "3days"
        ? activeDays.slice(0, 3)
        : activeDays;

  useEffect(() => {
    if (!plan) return;
    ctrl.deriveShoppingList(plan.weekStartDate, scopedDates);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, plan?.id]);

  if (!plan) {
    return (
      <View
        style={[
          screenStyles.screen,
          styles.centered,
          { paddingTop: insets.top + spacing.xl },
        ]}
      >
        <Text style={textStyles.emptyText}>
          No active plan yet. Head to the Plan tab to get started.
        </Text>
      </View>
    );
  }

  const totalItems = ctrl.shoppingList.reduce(
    (n, g) => n + g.items.length,
    0,
  );
  const checkedCount = ctrl.shoppingList.reduce(
    (n, g) => n + g.items.filter((i) => i.checked).length,
    0,
  );

  return (
    <ScrollView
      style={screenStyles.screen}
      contentContainerStyle={[
        screenStyles.scrollContent,
        { paddingTop: insets.top + spacing.md },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={screenStyles.header}>
        <Text style={textStyles.eyebrow}>Shopping List</Text>
        <Text style={textStyles.screenTitleCompact}>What to buy</Text>
      </View>

      {/* Scope picker */}
      <View style={styles.scopeRow}>
        {(["today", "3days", "all"] as Scope[]).map((s) => (
          <Pressable
            key={s}
            accessibilityRole="button"
            accessibilityLabel={`Shop for ${SCOPE_LABELS[s]}`}
            accessibilityState={{ selected: scope === s }}
            onPress={() => setScope(s)}
            style={[styles.scopeChip, scope === s && styles.scopeChipActive]}
          >
            <Text
              style={[
                styles.scopeChipText,
                scope === s && styles.scopeChipTextActive,
              ]}
            >
              {SCOPE_LABELS[s]}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Progress counter */}
      {totalItems > 0 ? (
        <Text style={styles.progressText}>
          {checkedCount} of {totalItems} ticked off
        </Text>
      ) : null}

      {/* Item groups */}
      {ctrl.shoppingList.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={textStyles.emptyText}>
            Nothing to buy for this scope — add recipe-linked slots to the plan
            first.
          </Text>
        </View>
      ) : (
        ctrl.shoppingList.map((group) => (
          <View key={group.section} style={styles.group}>
            <Text style={styles.groupTitle}>
              {SECTION_LABELS[group.section] ?? group.section}
            </Text>
            {group.items.map((item) => (
              <Pressable
                key={item.id}
                accessibilityRole="checkbox"
                accessibilityLabel={item.name}
                accessibilityState={{ checked: item.checked }}
                onPress={() => ctrl.toggleShoppingItem(item.id)}
                style={styles.itemRow}
              >
                <Feather
                  name={item.checked ? "check-square" : "square"}
                  size={18}
                  color={
                    item.checked ? colors.status.success : colors.border.strong
                  }
                />
                <View style={styles.itemContent}>
                  <Text
                    style={[
                      styles.itemName,
                      item.checked && styles.itemNameChecked,
                    ]}
                  >
                    {item.name}
                  </Text>
                  {item.quantity > 0 ? (
                    <Text style={styles.itemQty}>
                      {item.quantity % 1 === 0
                        ? String(item.quantity)
                        : item.quantity.toFixed(1)}
                      {item.unit ? ` ${item.unit}` : ""}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            ))}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
  },

  // ── Scope picker ────────────────────────────────────────────────────────

  scopeRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },

  scopeChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.background.card,
  },

  scopeChipActive: {
    borderColor: colors.brand.terracotta,
    backgroundColor: colors.brand.terracotta,
  },

  scopeChipText: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text.secondary,
  },

  scopeChipTextActive: {
    color: colors.text.inverse,
  },

  // ── Progress ────────────────────────────────────────────────────────────

  progressText: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.text.muted,
  },

  // ── Groups ──────────────────────────────────────────────────────────────

  group: {
    gap: spacing.xs,
  },

  groupTitle: {
    fontSize: typography.size.xs,
    lineHeight: typography.lineHeight.xs,
    fontWeight: typography.weight.semibold,
    color: colors.text.muted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: spacing.xxs,
  },

  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },

  itemContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  itemName: {
    flex: 1,
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    color: colors.text.primary,
  },

  itemNameChecked: {
    textDecorationLine: "line-through",
    color: colors.text.muted,
  },

  itemQty: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.text.muted,
    marginLeft: spacing.sm,
  },

  // ── Empty ───────────────────────────────────────────────────────────────

  emptyWrap: {
    paddingVertical: spacing.xl,
    alignItems: "center",
  },
});
