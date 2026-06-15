import { StyleSheet, Text, View } from "react-native";

import { STORAGE_ZONES } from "@/models/types";
import {
  STORAGE_ZONE_LABELS,
  type PantryItemDraft,
} from "@/utils/pantry";
import { colors, spacing } from "@/constants";
import { Button, TextField, UnitField } from "@/views/components/ui";
import { cardStyles, textStyles } from "@/views/styles";

export type AddPantryItemFormValues = PantryItemDraft;

interface AddPantryItemFormProps {
  mode?: "add" | "edit";
  values: AddPantryItemFormValues;
  onChange: (nextValues: AddPantryItemFormValues) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  onDelete?: () => void;
  onMarkUsed?: () => void;
  onLogWaste?: () => void;
  loading?: boolean;
  errorText?: string | null;
}

export function AddPantryItemForm({
  mode = "add",
  values,
  onChange,
  onSubmit,
  onCancel,
  onDelete,
  onMarkUsed,
  onLogWaste,
  loading = false,
  errorText,
}: AddPantryItemFormProps) {
  const updateField = (field: keyof AddPantryItemFormValues, value: string) => {
    onChange({
      ...values,
      [field]: value,
    });
  };

  const title = mode === "edit" ? "Edit pantry item" : "Add pantry item";
  const description =
    mode === "edit"
      ? "Adjust the quantity, storage spot, or expiry date without leaving the pantry."
      : "Add the basics first. Barcode scan and richer item editing can come later.";

  return (
    <View style={cardStyles.base}>
      <View style={styles.header}>
        <Text style={textStyles.sectionTitle}>{title}</Text>
        <Text style={textStyles.emptyText}>{description}</Text>
      </View>

      <View style={styles.fields}>
        <TextField
          label="Name"
          value={values.name}
          onChangeText={(value) => updateField("name", value)}
          placeholder="Milk"
        />

        <TextField
          label="Quantity"
          value={values.quantity}
          onChangeText={(value) => updateField("quantity", value)}
          placeholder="1"
          keyboardType="decimal-pad"
        />

        <UnitField
          label="Unit"
          value={values.unit}
          onChangeText={(value) => updateField("unit", value)}
          helperText="Metric and Nordic kitchen units are suggested as you type."
        />

        <View style={styles.zoneSection}>
          <Text style={textStyles.sectionTitle}>Storage zone</Text>
          <View style={styles.zoneOptions}>
            {STORAGE_ZONES.map((zone) => (
              <Button
                key={zone}
                label={STORAGE_ZONE_LABELS[zone]}
                size="sm"
                variant={values.storageZone === zone ? "primary" : "secondary"}
                onPress={() => {
                  updateField("storageZone", zone);
                }}
              />
            ))}
          </View>
        </View>

        <TextField
          label="Expiry date"
          value={values.expiryDate}
          onChangeText={(value) => updateField("expiryDate", value)}
          placeholder="YYYY-MM-DD"
          autoCapitalize="none"
          helperText="Leave blank if unknown."
        />
      </View>

      {errorText ? <Text style={textStyles.errorText}>{errorText}</Text> : null}

      <View style={styles.actions}>
        <Button
          label={loading ? "Saving..." : mode === "edit" ? "Save changes" : "Add item"}
          loading={loading}
          onPress={onSubmit}
        />

        {onCancel ? (
          <Button
            label="Cancel"
            variant="ghost"
            onPress={onCancel}
            disabled={loading}
          />
        ) : null}
      </View>

      {mode === "edit" ? (
        <View style={styles.secondaryActions}>
          <Button
            label="Mark used"
            variant="secondary"
            size="sm"
            onPress={onMarkUsed}
            disabled={loading || !onMarkUsed}
          />
          <Button
            label="Log waste"
            variant="secondary"
            size="sm"
            onPress={onLogWaste}
            disabled={loading || !onLogWaste}
          />
          <Button
            label="Remove item"
            variant="danger"
            size="sm"
            onPress={onDelete}
            disabled={loading || !onDelete}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },

  fields: {
    gap: spacing.md,
  },

  zoneSection: {
    gap: spacing.sm,
  },

  zoneOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },

  actions: {
    marginTop: spacing.lg,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },

  secondaryActions: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
});
