import { useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, spacing, typography } from "@/constants";
import { usePantryController } from "@/controllers/usePantryController";
import { useRegisterAssistantContext } from "@/controllers";
import type { PantrySuggestion } from "@/prompts/pantrySuggestions";
import { createLogger } from "@/utils/logger";
import { EMPTY_PANTRY_ITEM_DRAFT } from "@/utils/pantry";
import {
  AddPantryItemForm,
  PantryItem,
  WasteAlert,
  type AddPantryItemFormValues,
} from "@/views/components/pantry";
import { Button, Divider, EmptyState, Spinner } from "@/views/components/ui";
import { screenStyles, textStyles } from "@/views/styles";
import { useRouter } from "expo-router";

const logger = createLogger("PantryScreen");

export default function PantryScreen() {
  const {
    loadItems,
    addItem,
    updateItem,
    removeItemById,
    markItemUsed,
    logWasteForItem,
    removalPrompt,
    clearRemovalPrompt,
    suggestShelfLife,
    suggestFromPantry,
    swapSuggestion,
    findRecipeForSuggestion,
    generateRecipeFromIdea,
    items,
    wasteAlert,
    loading,
    error,
  } = usePantryController();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [showForm, setShowForm] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<AddPantryItemFormValues>(
    EMPTY_PANTRY_ITEM_DRAFT,
  );
  const [dismissedAlertItemId, setDismissedAlertItemId] = useState<string | null>(
    null,
  );
  const [suggestions, setSuggestions] = useState<PantrySuggestion[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [swappingIndex, setSwappingIndex] = useState<number | null>(null);
  const [recipeLoading, setRecipeLoading] = useState(false);
  const [suggestingShelfLife, setSuggestingShelfLife] = useState(false);

  useRegisterAssistantContext({
    scope: { kind: "pantry" },
    promptSuggestions: [
      {
        id: "pantry-cook",
        label: "What can I cook?",
        prompt: "What can I make with what I have, especially anything expiring soon?",
        kind: "planning",
        scopeKinds: ["pantry"],
      },
      {
        id: "pantry-plan",
        label: "Plan around my pantry",
        prompt: "Help me plan this week's dinners around what I already have.",
        kind: "planning",
        scopeKinds: ["pantry", "meal_plan"],
      },
      {
        id: "pantry-shelf",
        label: "How long does it keep?",
        prompt: "How long does a typical pantry item last once opened?",
        kind: "general",
        scopeKinds: ["pantry"],
      },
    ],
  });

  useEffect(() => {
    if (!removalPrompt) return;
    Alert.alert(
      "Remove from pantry?",
      `You've used "${removalPrompt.name}" — does it need to stay in the pantry, or is it all gone?`,
      [
        {
          text: "Keep it",
          style: "cancel",
          onPress: clearRemovalPrompt,
        },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            clearRemovalPrompt();
            void removeItemById(removalPrompt.id);
          },
        },
      ],
    );
  }, [removalPrompt]);

  useEffect(() => {
    logger.info("Pantry screen mounted; loading pantry items");
    void loadItems();
  }, [loadItems]);

  const editingItem = useMemo(() => {
    return items.find((item) => item.id === editingItemId) ?? null;
  }, [editingItemId, items]);

  const visibleWasteAlert =
    wasteAlert && dismissedAlertItemId !== wasteAlert.itemId ? wasteAlert : null;

  const closeEditor = () => {
    setShowForm(false);
    setEditingItemId(null);
    setFormValues(EMPTY_PANTRY_ITEM_DRAFT);
  };

  const startCreate = () => {
    setEditingItemId(null);
    setFormValues(EMPTY_PANTRY_ITEM_DRAFT);
    setShowForm(true);
  };

  const startEdit = (itemId: string) => {
    const item = items.find((candidate) => candidate.id === itemId);

    if (!item) return;

    logger.info("Editing pantry item", {
      id: item.id,
      name: item.name,
    });

    setEditingItemId(item.id);
    setFormValues(item.draft);
    setShowForm(true);
  };

  const submitForm = async () => {
    const didSave = editingItemId
      ? await updateItem(editingItemId, formValues)
      : await addItem(formValues);

    if (didSave) {
      closeEditor();
    }
  };

  const handleRemove = async () => {
    if (!editingItemId) return;

    const didRemove = await removeItemById(editingItemId);

    if (didRemove) {
      closeEditor();
    }
  };

  const handleMarkUsed = async () => {
    if (!editingItemId) return;
    const didMarkUsed = await markItemUsed(editingItemId);
    if (didMarkUsed) {
      closeEditor();
      // removalPrompt may be set asynchronously after the LLM responds —
      // the useEffect above will show the Alert when it arrives.
    }
  };

  const handleSuggestShelfLife = async () => {
    if (!formValues.name) return;
    setSuggestingShelfLife(true);
    try {
      const expiryDate = await suggestShelfLife(formValues.name);
      if (expiryDate) {
        setFormValues((prev) => ({ ...prev, expiryDate }));
      }
    } finally {
      setSuggestingShelfLife(false);
    }
  };

  const handleSuggest = async () => {
    setSuggestLoading(true);
    try {
      const results = await suggestFromPantry();
      setSuggestions(results);
    } finally {
      setSuggestLoading(false);
    }
  };

  const handleSwap = async (index: number) => {
    setSwappingIndex(index);
    try {
      const target = suggestions[index];
      const replacement = await swapSuggestion(target, suggestions);
      if (replacement) {
        setSuggestions((prev) => {
          const next = [...prev];
          next[index] = replacement;
          return next;
        });
      }
    } finally {
      setSwappingIndex(null);
    }
  };

  const handleCookSuggestion = async (suggestion: PantrySuggestion) => {
    setRecipeLoading(true);
    try {
      const existingId = await findRecipeForSuggestion(suggestion);
      if (existingId) {
        router.push(`/recipe/${existingId}`);
        return;
      }
      const recipe = await generateRecipeFromIdea(suggestion);
      if (recipe) {
        router.push(`/recipe/${recipe.id}`);
      }
    } finally {
      setRecipeLoading(false);
    }
  };

  const handleAddToPlan = async (suggestion: PantrySuggestion) => {
    setRecipeLoading(true);
    try {
      const existingId = await findRecipeForSuggestion(suggestion);
      if (!existingId) {
        const generated = await generateRecipeFromIdea(suggestion);
        if (!generated) return; // generation failed — don't navigate with nothing saved
      }
      // Recipe is saved — navigate to plan where the cook can add it by name
      router.push({ pathname: "/(tabs)/plan" });
    } finally {
      setRecipeLoading(false);
    }
  };

  const handleLogWaste = async () => {
    if (!editingItemId) return;

    const didLogWaste = await logWasteForItem(editingItemId, "discarded");

    if (didLogWaste) {
      closeEditor();
    }
  };

  return (
    <ScrollView
      style={screenStyles.screen}
      contentContainerStyle={[
        screenStyles.scrollContent,
        { paddingTop: insets.top + spacing.md },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={screenStyles.header}>
        <Text style={textStyles.eyebrow}>Inventory</Text>
        <Text style={textStyles.screenTitleCompact}>Pantry</Text>
        <Text style={textStyles.description}>
          Keep track of what you have, what needs using soon, and what can shape
          tonight&apos;s cooking.
        </Text>

        {error ? <Text style={textStyles.errorText}>{error}</Text> : null}

        <View style={screenStyles.actionsRowTight}>
          <Button
            label={showForm && !editingItemId ? "Hide form" : "Add item"}
            onPress={() => {
              if (showForm && !editingItemId) {
                closeEditor();
                return;
              }

              startCreate();
            }}
          />

          <Button
            label="Refresh pantry"
            variant="secondary"
            onPress={() => {
              void loadItems();
            }}
          />
        </View>

        <Button
          label={suggestLoading ? "Finding ideas…" : "What should I cook?"}
          variant="secondary"
          onPress={() => {
            void handleSuggest();
          }}
          disabled={suggestLoading || items.length === 0}
        />
      </View>

      {showForm ? (
        <AddPantryItemForm
          mode={editingItem ? "edit" : "add"}
          values={formValues}
          onChange={setFormValues}
          onSubmit={() => {
            void submitForm();
          }}
          onCancel={closeEditor}
          onDelete={
            editingItem
              ? () => {
                  void handleRemove();
                }
              : undefined
          }
          onMarkUsed={
            editingItem
              ? () => {
                  void handleMarkUsed();
                }
              : undefined
          }
          onLogWaste={
            editingItem
              ? () => {
                  void handleLogWaste();
                }
              : undefined
          }
          onSuggestShelfLife={() => {
            void handleSuggestShelfLife();
          }}
          suggestingShelfLife={suggestingShelfLife}
          loading={loading}
          errorText={error}
        />
      ) : null}

      {visibleWasteAlert ? (
        <WasteAlert
          title={visibleWasteAlert.title}
          body={visibleWasteAlert.body}
          actionLabel={visibleWasteAlert.actionLabel}
          onPress={() => {
            startEdit(visibleWasteAlert.itemId);
          }}
          onDismiss={() => {
            setDismissedAlertItemId(visibleWasteAlert.itemId);
          }}
        />
      ) : null}

      {suggestions.length > 0 ? (
        <View style={suggestionStyles.section}>
          <Text style={textStyles.sectionTitle}>Recipe ideas from your pantry</Text>

          {recipeLoading ? (
            <Spinner label="Building recipe…" />
          ) : null}

          {suggestions.map((suggestion, index) => (
            <View key={`${suggestion.title}-${index}`} style={suggestionStyles.card}>
              <View style={suggestionStyles.cardBody}>
                <Text style={suggestionStyles.cardTitle}>{suggestion.title}</Text>
                {suggestion.description ? (
                  <Text style={suggestionStyles.cardDescription}>
                    {suggestion.description}
                  </Text>
                ) : null}
              </View>
              <View style={suggestionStyles.cardActions}>
                <Button
                  label="Cook this"
                  size="sm"
                  onPress={() => {
                    void handleCookSuggestion(suggestion);
                  }}
                  disabled={recipeLoading}
                />
                <Button
                  label="Add to plan"
                  size="sm"
                  variant="secondary"
                  onPress={() => {
                    void handleAddToPlan(suggestion);
                  }}
                  disabled={recipeLoading}
                />
                <Button
                  label={swappingIndex === index ? "…" : "Swap"}
                  size="sm"
                  variant="ghost"
                  onPress={() => {
                    void handleSwap(index);
                  }}
                  disabled={swappingIndex !== null || recipeLoading}
                />
              </View>
            </View>
          ))}

          <Button
            label="Clear suggestions"
            variant="ghost"
            size="sm"
            onPress={() => setSuggestions([])}
          />
        </View>
      ) : null}

      <Divider />

      <View style={screenStyles.list}>
        <Text style={textStyles.sectionTitle}>Current items</Text>
        <Text style={textStyles.emptyText}>
          Tap any row to review or edit it. Remove, mark used, and waste logging
          all live behind explicit actions.
        </Text>

        {loading && items.length === 0 ? (
          <Spinner label="Loading pantry..." />
        ) : items.length > 0 ? (
          items.map((item) => (
            <PantryItem
              key={item.id}
              name={item.name}
              quantity={item.quantity}
              zone={item.zone}
              expiryStatus={item.expiryStatus}
              expiryLabel={item.expiryLabel}
              selected={editingItemId === item.id}
              onPress={() => {
                startEdit(item.id);
              }}
            />
          ))
        ) : (
          <EmptyState message="No pantry items yet. Add a few staples and we can start using them for planning and nudges." />
        )}
      </View>
    </ScrollView>
  );
}

const suggestionStyles = StyleSheet.create({
  section: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.sm,
  },

  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.background.card,
    padding: spacing.lg,
    gap: spacing.md,
  },

  cardBody: {
    gap: spacing.xs,
  },

  cardTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },

  cardDescription: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.text.secondary,
  },

  cardActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
});
