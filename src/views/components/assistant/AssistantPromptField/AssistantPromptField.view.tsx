import { Text, TextInput, TouchableOpacity, View } from "react-native";

import { colors } from "@/constants";

import { styles } from "./AssistantPromptField.styles";

interface AssistantPromptFieldViewProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  disabled?: boolean;
}

export function AssistantPromptFieldView({
  value,
  onChangeText,
  onSubmit,
  placeholder = "Ask Sous Chef…",
  disabled = false,
}: AssistantPromptFieldViewProps) {
  const canSend = value.trim().length > 0 && !disabled;

  return (
    <View style={styles.field}>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={colors.text.muted}
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        returnKeyType="send"
        blurOnSubmit={false}
        editable={!disabled}
      />
      <TouchableOpacity
        style={[styles.sendButton, !canSend ? styles.sendButtonDisabled : null]}
        onPress={onSubmit}
        disabled={!canSend}
      >
        <Text style={styles.sendButtonLabel}>↑</Text>
      </TouchableOpacity>
    </View>
  );
}
