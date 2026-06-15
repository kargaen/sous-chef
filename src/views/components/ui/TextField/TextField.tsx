import { Text, TextInput, View, type TextInputProps } from "react-native";

import { textFieldStyles } from "./TextField.styles";

interface TextFieldProps extends TextInputProps {
  label: string;
  helperText?: string;
  errorText?: string;
}

export function TextField({
  label,
  helperText,
  errorText,
  style,
  ...inputProps
}: TextFieldProps) {
  return (
    <View style={textFieldStyles.container}>
      <Text style={textFieldStyles.label}>{label}</Text>
      <TextInput
        placeholderTextColor="#8A7566"
        style={[
          textFieldStyles.input,
          errorText ? textFieldStyles.inputError : null,
          style,
        ]}
        {...inputProps}
      />
      {errorText ? (
        <Text style={textFieldStyles.errorText}>{errorText}</Text>
      ) : helperText ? (
        <Text style={textFieldStyles.helperText}>{helperText}</Text>
      ) : null}
    </View>
  );
}
