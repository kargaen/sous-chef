import { Feather } from "@expo/vector-icons";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { colors } from "@/constants";

import { styles } from "./PlanRequestBox.styles";

export interface PlanRequestBoxProps {
  loading: boolean;
  onSubmit: (request: string) => void;
}

export function PlanRequestBox({ loading, onSubmit }: PlanRequestBoxProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<TextInput>(null);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || loading) return;
    onSubmit(trimmed);
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
  );
}
