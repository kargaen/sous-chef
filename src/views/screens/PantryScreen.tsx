import { useEffect, useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { spacing } from "@/constants";
import { usePantryController } from "@/controllers/usePantryController";
import { createLogger } from "@/utils/logger";
import { EMPTY_PANTRY_ITEM_DRAFT } from "@/utils/pantry";
import {
  AddPantryItemForm,
  PantryItem,
  WasteAlert,
  type AddPantryItemFormValues,
} from "@/views/components/pantry";
import { Button, Divider, Spinner } from "@/views/components/ui";
import { screenStyles, textStyles } from "@/views/styles";

const logger = createLogger("PantryScreen");

export default function PantryScreen() {
  const {
    loadItems,
    addItem,
    updateItem,
    removeItemById,
    markItemUsed,
    logWasteForItem,
    items,
    wasteAlert,
    loading,
    error,
  } = usePantryController();
  const insets = useSafeAreaInsets();

  const [showForm, setShowForm] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<AddPantryItemFormValues>(
    EMPTY_PANTRY_ITEM_DRAFT,
  );
  const [dismissedAlertItemId, setDismissedAlertItemId] = useState<string | null>(
    null,
  );

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
          <Text style={textStyles.emptyText}>
            No pantry items yet. Add a few staples and we can start using them
            for planning and nudges.
          </Text>
        )}
      </View>
    </ScrollView>
  );
}
