import { Feather } from "@expo/vector-icons";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

import { colors } from "@/constants";

import { styles } from "./PlanRequestBox.styles";

export interface PlanRequestBoxProps {
  loading: boolean;
  onSubmit: (request: string, usePantry: boolean) => void;
}

export function PlanRequestBox({ loading, onSubmit }: PlanRequestBoxProps) {
  const [value, setValue] = useState("");
  const [usePantry, setUsePantry] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || loading) return;
    onSubmit(trimmed, usePantry);
    setValue("");
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={value}
          onChangeText={setValue}
          placeholder="Easy weekdays, big Sunday roast…"
          placeholderTextColor={colors.text.muted}
          multiline
          returnKeyType="done"
          blurOnSubmit
          onSubmitEditing={handleSubmit}
          editable={!loading}
        />
      </View>

      <View style={styles.actionsRow}>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityLabel="Use pantry ingredients in the draft"
          accessibilityState={{ checked: usePantry }}
          onPress={() => setUsePantry((v) => !v)}
          style={[styles.pantryToggle, usePantry && styles.pantryToggleActive]}
        >
          <Feather
            name="archive"
            size={12}
            color={usePantry ? colors.brand.terracotta : colors.text.muted}
          />
          <Text
            style={[
              styles.pantryToggleText,
              usePantry && styles.pantryToggleTextActive,
            ]}
          >
            Use my pantry
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Draft my meal plan"
          accessibilityState={{ disabled: loading || !value.trim() }}
          onPress={handleSubmit}
          disabled={loading || !value.trim()}
          style={[
            styles.button,
            (loading || !value.trim()) && styles.buttonDisabled,
          ]}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.text.inverse} />
          ) : (
            <>
              <Feather name="zap" size={14} color={colors.text.inverse} />
              <Text style={styles.buttonText}>Draft my plan</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}
