import { useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type NativeSyntheticEvent,
  type TextInputProps,
  type TextInputSelectionChangeEventData,
} from "react-native";

import { colors, radius, spacing, typography } from "@/constants";
import { textFieldStyles } from "../TextField/TextField.styles";

interface AutoPickerFieldProps extends Omit<
  TextInputProps,
  "value" | "onChangeText" | "style" | "selection" | "onSelectionChange"
> {
  label: string;
  value: string;
  options: readonly string[];
  onChangeText: (value: string) => void;
  helperText?: string;
  errorText?: string;
  maxVisibleOptions?: number;
  normaliseValue?: (value: string) => string;
}

interface SelectionRange {
  start: number;
  end: number;
}

const defaultNormaliseValue = (value: string): string => {
  return value.trim().toLowerCase();
};

const getCollapsedSelection = (position: number): SelectionRange => {
  return { start: position, end: position };
};

const getSuggestions = (
  value: string,
  options: readonly string[],
  maxVisibleOptions: number,
  normaliseValue: (value: string) => string,
): string[] => {
  const query = normaliseValue(value);

  if (!query) {
    return [...options].slice(0, maxVisibleOptions);
  }

  const matching = options.filter((option) => option.startsWith(query));

  if (matching.length > 0) {
    return matching;
  }

  return [query];
};

export function AutoPickerField({
  label,
  value,
  options,
  onChangeText,
  helperText,
  errorText,
  maxVisibleOptions = options.length,
  normaliseValue = defaultNormaliseValue,
  placeholderTextColor = "#8A7566",
  autoCapitalize = "none",
  autoCorrect = false,
  ...inputProps
}: AutoPickerFieldProps) {
  const [focused, setFocused] = useState(false);
  const [selection, setSelection] = useState<SelectionRange>();
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<TextInput | null>(null);
  const previousValueRef = useRef(value);
  const selectionRef = useRef<SelectionRange | undefined>(undefined);
  const deleteModeRef = useRef(false);
  const completionSelectionRef = useRef<SelectionRange | null>(null);

  useEffect(() => {
    previousValueRef.current = value;
  }, [value]);

  useEffect(() => {
    selectionRef.current = selection;
  }, [selection]);

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }
    };
  }, []);

  const suggestions = useMemo(() => {
    return getSuggestions(value, options, maxVisibleOptions, normaliseValue);
  }, [maxVisibleOptions, normaliseValue, options, value]);

  const clearPendingBlur = () => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
  };

  const commitValue = (nextValue: string, nextSelection?: SelectionRange) => {
    previousValueRef.current = nextValue;
    onChangeText(nextValue);
    selectionRef.current = nextSelection;
    setSelection(nextSelection);
  };

  const applyAutocomplete = (nextText: string) => {
    const previousValue = previousValueRef.current;
    const previousNormalised = normaliseValue(previousValue);

    // Use completionSelectionRef (stable) not selectionRef (mutated by onSelectionChange)
    const completionSelection = completionSelectionRef.current;
    const hadActiveCompletion = completionSelection !== null;

    let effectiveInput = nextText;

    if (hadActiveCompletion && completionSelection) {
      if (
        nextText.length > previousValue.length &&
        nextText.startsWith(previousValue)
      ) {
        // Selection was not applied — char was appended after completion end.
        // Extract what the user typed and merge with their typed prefix.
        effectiveInput = `${previousValue.slice(0, completionSelection.start)}${nextText.slice(previousValue.length)}`;
      } else {
        // Selection was applied — completion was replaced by what the user typed.
        effectiveInput = nextText;
      }
    }

    const effectiveNormalised = normaliseValue(effectiveInput);

    // Backspace on a selection: user deleted exactly the completion portion.
    // Without this, the completion re-triggers immediately and the user can't delete.
    if (
      hadActiveCompletion &&
      completionSelection &&
      effectiveNormalised.length > 0 &&
      effectiveNormalised ===
        normaliseValue(previousValue.slice(0, completionSelection.start))
    ) {
      deleteModeRef.current = true;
      completionSelectionRef.current = null;
      commitValue(
        effectiveNormalised,
        getCollapsedSelection(effectiveNormalised.length),
      );
      return;
    }

    // Compare against typed length (completionSelection.start), not the full completion length.
    const previousTypedLength =
      hadActiveCompletion && completionSelection
        ? completionSelection.start
        : previousNormalised.length;

    const isDeleting = effectiveNormalised.length < previousTypedLength;

    if (isDeleting) {
      deleteModeRef.current = true;
      completionSelectionRef.current = null;
      commitValue(
        effectiveNormalised,
        getCollapsedSelection(effectiveNormalised.length),
      );
      return;
    }

    if (!effectiveNormalised) {
      deleteModeRef.current = false;
      completionSelectionRef.current = null;
      commitValue("", undefined);
      return;
    }

    if (deleteModeRef.current) {
      const resumedForwardTyping =
        effectiveNormalised.length > previousTypedLength;
      if (!resumedForwardTyping) {
        completionSelectionRef.current = null;
        commitValue(
          effectiveNormalised,
          getCollapsedSelection(effectiveNormalised.length),
        );
        return;
      }
      deleteModeRef.current = false;
    }

    const firstMatch = options.find((option) =>
      option.startsWith(effectiveNormalised),
    );

    if (firstMatch && firstMatch !== effectiveNormalised) {
      const nextSelection = {
        start: effectiveNormalised.length,
        end: firstMatch.length,
      };
      completionSelectionRef.current = nextSelection;
      commitValue(firstMatch, nextSelection);
      return;
    }

    completionSelectionRef.current = null;
    commitValue(
      effectiveNormalised,
      getCollapsedSelection(effectiveNormalised.length),
    );
  };
  /*const applyAutocomplete = (nextText: string) => {
    const previousValue = previousValueRef.current;
    const previousNormalised = normaliseValue(previousValue);
    const previousSelection = selectionRef.current;
    const hadActiveCompletion =
      previousSelection &&
      previousSelection.start !== previousSelection.end &&
      completionSelectionRef.current &&
      completionSelectionRef.current.start === previousSelection.start &&
      completionSelectionRef.current.end === previousSelection.end;

    let effectiveInput = nextText;

    if (
      hadActiveCompletion &&
      nextText.length > previousValue.length &&
      nextText.startsWith(previousValue)
    ) {
      effectiveInput = `${previousValue.slice(0, previousSelection.start)}${nextText.slice(previousValue.length)}`;
    }

    const effectiveNormalised = normaliseValue(effectiveInput);
    const isDeleting = effectiveNormalised.length < previousNormalised.length;

    if (isDeleting) {
      deleteModeRef.current = true;
      completionSelectionRef.current = null;
      commitValue(
        effectiveNormalised,
        getCollapsedSelection(effectiveNormalised.length),
      );
      return;
    }

    if (!effectiveNormalised) {
      deleteModeRef.current = false;
      completionSelectionRef.current = null;
      commitValue("", undefined);
      return;
    }

    if (deleteModeRef.current) {
      const resumedForwardTyping =
        effectiveNormalised.length > previousNormalised.length;

      if (!resumedForwardTyping) {
        completionSelectionRef.current = null;
        commitValue(
          effectiveNormalised,
          getCollapsedSelection(effectiveNormalised.length),
        );
        return;
      }

      deleteModeRef.current = false;
    }

    const firstMatch = options.find((option) =>
      option.startsWith(effectiveNormalised),
    );

    if (firstMatch && firstMatch !== effectiveNormalised) {
      const nextSelection = {
        start: effectiveNormalised.length,
        end: firstMatch.length,
      };

      completionSelectionRef.current = nextSelection;
      commitValue(firstMatch, nextSelection);
      return;
    }

    completionSelectionRef.current = null;
    commitValue(
      effectiveNormalised,
      getCollapsedSelection(effectiveNormalised.length),
    );
  };*/

  const handleSuggestionPress = (suggestion: string) => {
    clearPendingBlur();
    deleteModeRef.current = false;
    completionSelectionRef.current = null;
    commitValue(suggestion, getCollapsedSelection(suggestion.length));
    inputRef.current?.focus();
  };

  const handleClear = () => {
    clearPendingBlur();
    deleteModeRef.current = false;
    completionSelectionRef.current = null;
    commitValue("", undefined);
    setFocused(true);
    inputRef.current?.focus();
  };

  const handleSelectionChange = (
    event: NativeSyntheticEvent<TextInputSelectionChangeEventData>,
  ) => {
    const nextSelection = event.nativeEvent.selection;
    selectionRef.current = nextSelection;
    setSelection(nextSelection);
  };

  const query = normaliseValue(value);

  return (
    <View style={textFieldStyles.container}>
      <Text style={textFieldStyles.label}>{label}</Text>

      <View
        style={[styles.inputShell, errorText ? styles.inputShellError : null]}
      >
        <TextInput
          ref={inputRef}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          placeholderTextColor={placeholderTextColor}
          value={value}
          selection={selection}
          onChangeText={applyAutocomplete}
          onSelectionChange={handleSelectionChange}
          onFocus={() => {
            clearPendingBlur();
            setFocused(true);
          }}
          onBlur={() => {
            blurTimeoutRef.current = setTimeout(() => {
              setFocused(false);
            }, 120);
          }}
          style={styles.input}
          {...inputProps}
        />

        {value ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Clear ${label}`}
            hitSlop={8}
            onPressIn={handleClear} // was: onPress
            style={({ pressed }) => [
              styles.clearButton,
              pressed ? styles.clearButtonPressed : null,
            ]}
          >
            <Text style={styles.clearButtonLabel}>x</Text>
          </Pressable>
        ) : null}
      </View>

      {focused ? (
        <ScrollView
          style={styles.dropdown}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
        >
          {suggestions.map((suggestion, index) => {
            const matchingPrefix =
              query && suggestion.startsWith(query) ? query : suggestion;
            const suffix = suggestion.slice(matchingPrefix.length);

            return (
              <Pressable
                key={`${suggestion}-${index}`}
                accessibilityRole="button"
                onPress={() => {
                  handleSuggestionPress(suggestion);
                }}
                style={({ pressed }) => [
                  styles.option,
                  index === 0 ? styles.firstOption : null,
                  pressed ? styles.optionPressed : null,
                ]}
              >
                <Text style={styles.optionText}>
                  <Text style={styles.optionMatch}>{matchingPrefix}</Text>
                  {suffix ? (
                    <Text style={styles.optionSuffix}>{suffix}</Text>
                  ) : null}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      {errorText ? (
        <Text style={textFieldStyles.errorText}>{errorText}</Text>
      ) : helperText ? (
        <Text style={textFieldStyles.helperText}>{helperText}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  inputShell: {
    minHeight: 48,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.background.card,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },

  inputShellError: {
    borderColor: colors.status.danger,
  },

  input: {
    flex: 1,
    paddingVertical: spacing.sm,
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    color: colors.text.primary,
  },

  clearButton: {
    minWidth: 28,
    minHeight: 28,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background.muted,
  },

  clearButtonPressed: {
    opacity: 0.8,
  },

  clearButtonLabel: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    fontWeight: typography.weight.bold,
    color: colors.text.secondary,
  },

  dropdown: {
    marginTop: spacing.xs,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.background.card,
    overflow: "hidden",
    maxHeight: 220,
  },

  option: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },

  firstOption: {
    borderTopWidth: 0,
    backgroundColor: colors.background.muted,
  },

  optionPressed: {
    opacity: 0.8,
  },

  optionText: {
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    color: colors.text.primary,
  },

  optionMatch: {
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },

  optionSuffix: {
    color: colors.text.muted,
  },
});
