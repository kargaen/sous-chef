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

export interface AddToDayInputProps {
  date: string;
  type: MealSlotType;
  recipes: Recipe[];
  onSubmit: (input: SlotInput) => void;
  onSuggest?: () => void;
}

type InputMode = "idle" | "text" | "chip";

export function AddToDayInput({
  recipes,
  onSubmit,
  onSuggest,
}: AddToDayInputProps) {
  const [mode, setMode] = useState<InputMode>("idle");
  const [textValue, setTextValue] = useState("");
  const [noteValue, setNoteValue] = useState("");
  const [chipTitle, setChipTitle] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const textRef = useRef<TextInput>(null);
  const noteRef = useRef<TextInput>(null);

  const filteredRecipes =
    textValue.length >= 2
      ? recipes.filter((r) =>
          r.title.toLowerCase().includes(textValue.toLowerCase()),
        )
      : [];

  const selectRecipe = (recipe: Recipe) => {
    setChipTitle(recipe.title);
    setTextValue("");
    setShowDropdown(false);
    setMode("chip");
    setTimeout(() => noteRef.current?.focus(), 50);
  };

  const clearChip = () => {
    setChipTitle(null);
    setNoteValue("");
    setMode("text");
    setTimeout(() => textRef.current?.focus(), 50);
  };

  const handleSubmit = () => {
    if (mode === "chip" && chipTitle != null) {
      onSubmit({ chipTitle, note: noteValue.trim() });
    } else if (textValue.trim()) {
      onSubmit({ rawText: textValue.trim() });
    }
    // Reset
    setMode("idle");
    setTextValue("");
    setNoteValue("");
    setChipTitle(null);
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

  if (mode === "chip" && chipTitle != null) {
    return (
      <View style={styles.container}>
        <View style={styles.chipRow}>
          <View style={styles.chip}>
            <Text style={styles.chipText}>{chipTitle}</Text>
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

  // Text mode
  return (
    <View style={styles.container}>
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
              // Small delay so dropdown taps register before hiding.
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
              onPress={onSuggest}
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
