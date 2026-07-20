import { Feather } from "@expo/vector-icons";
import { useRef, useState } from "react";
import {
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

import { colors } from "@/constants";
import type { MealSlotType, Recipe, SlotInput } from "@/models/types";

import { styles } from "./AddToDayInput.styles";

const MEAL_TYPES: MealSlotType[] = ["breakfast", "lunch", "dinner", "snack"];

const TYPE_LABELS: Record<MealSlotType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

const nextType = (current: MealSlotType): MealSlotType => {
  const idx = MEAL_TYPES.indexOf(current);
  return MEAL_TYPES[(idx + 1) % MEAL_TYPES.length];
};

export interface AddToDayInputProps {
  date: string;
  defaultType?: MealSlotType;
  recipes: Recipe[];
  onSubmit: (type: MealSlotType, input: SlotInput) => void;
  onSuggest?: (type: MealSlotType) => void;
}

type InputMode = "idle" | "text" | "chip";

export function AddToDayInput({
  defaultType = "dinner",
  recipes,
  onSubmit,
  onSuggest,
}: AddToDayInputProps) {
  const [mode, setMode] = useState<InputMode>("idle");
  const [mealType, setMealType] = useState<MealSlotType>(defaultType);
  const [textValue, setTextValue] = useState("");
  const [noteValue, setNoteValue] = useState("");
  const [selectedRecipe, setSelectedRecipe] = useState<Pick<Recipe, "id" | "title"> | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const textRef = useRef<TextInput>(null);
  const noteRef = useRef<TextInput>(null);

  const filteredRecipes =
    textValue.length >= 2
      ? recipes.filter((r) =>
          r.title.toLowerCase().includes(textValue.toLowerCase()),
        )
      : [];

  const cycleType = () => setMealType(nextType(mealType));

  const selectRecipe = (recipe: Recipe) => {
    setSelectedRecipe({ id: recipe.id, title: recipe.title });
    setTextValue("");
    setShowDropdown(false);
    setMode("chip");
    setTimeout(() => noteRef.current?.focus(), 50);
  };

  const clearChip = () => {
    setSelectedRecipe(null);
    setNoteValue("");
    setMode("text");
    setTimeout(() => textRef.current?.focus(), 50);
  };

  const handleSubmit = () => {
    if (mode === "chip" && selectedRecipe != null) {
      onSubmit(mealType, {
        recipeId: selectedRecipe.id,
        note: noteValue.trim(),
      });
    } else if (textValue.trim()) {
      onSubmit(mealType, { rawText: textValue.trim() });
    }
    setMode("idle");
    setTextValue("");
    setNoteValue("");
    setSelectedRecipe(null);
    setShowDropdown(false);
  };

  const handleTextChange = (value: string) => {
    setTextValue(value);
    setShowDropdown(value.length >= 2);
  };

  if (mode === "idle") {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add something to this day"
        onPress={() => {
          setMode("text");
          setTimeout(() => textRef.current?.focus(), 50);
        }}
        style={styles.addTrigger}
      >
        <Feather name="plus" size={14} color={colors.text.muted} />
        <Text style={styles.addTriggerText}>Add something…</Text>
      </Pressable>
    );
  }

  // ── Shared meal type selector ──────────────────────────────────────────

  const TypePill = () => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Meal type: ${TYPE_LABELS[mealType]}. Tap to change.`}
      onPress={cycleType}
      style={styles.typeSelector}
    >
      <Text style={styles.typeSelectorText}>{TYPE_LABELS[mealType]}</Text>
      <Feather name="chevron-down" size={10} color={colors.text.secondary} />
    </Pressable>
  );

  // ── Chip mode ────────────────────────────────────────────────────────────

  if (mode === "chip" && selectedRecipe != null) {
    return (
      <View style={styles.container}>
        <TypePill />
        <View style={styles.chipRow}>
          <View style={styles.chip}>
            <Text style={styles.chipText}>{selectedRecipe.title}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear recipe selection"
              hitSlop={8}
              onPress={clearChip}
            >
              <Feather name="x" size={12} color={colors.text.inverse} />
            </Pressable>
          </View>

          <View style={styles.noteShell}>
            <TextInput
              ref={noteRef}
              style={styles.noteInput}
              value={noteValue}
              onChangeText={setNoteValue}
              placeholder="for 8, mild…"
              placeholderTextColor={colors.text.muted}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Save slot"
            onPress={handleSubmit}
            style={styles.submitButton}
          >
            <Text style={styles.submitButtonText}>Add</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── Text mode ─────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <TypePill />
      <View style={styles.inputRow}>
        <View style={styles.textShell}>
          <TextInput
            ref={textRef}
            style={styles.textInput}
            value={textValue}
            onChangeText={handleTextChange}
            placeholder="Recipe or note…"
            placeholderTextColor={colors.text.muted}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
            onBlur={() => {
              setTimeout(() => {
                if (textValue.trim()) {
                  handleSubmit();
                } else {
                  setMode("idle");
                  setShowDropdown(false);
                }
              }, 150);
            }}
            autoFocus
          />
          {onSuggest ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Ask Sous Chef for a suggestion"
              onPress={() => onSuggest(mealType)}
              style={styles.suggestButton}
            >
              <Text style={styles.suggestButtonText}>Ask SC</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {showDropdown && filteredRecipes.length > 0 ? (
        <View style={styles.dropdown}>
          {filteredRecipes.map((recipe, i) => (
            <Pressable
              key={recipe.id}
              accessibilityRole="button"
              accessibilityLabel={`Select ${recipe.title}`}
              onPress={() => selectRecipe(recipe)}
              style={[
                styles.dropdownItem,
                i === filteredRecipes.length - 1 ? styles.dropdownItemLast : null,
              ]}
            >
              <Feather name="book-open" size={14} color={colors.text.muted} />
              <Text style={styles.dropdownItemText}>{recipe.title}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}
