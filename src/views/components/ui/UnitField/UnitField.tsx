import {
  COOKING_UNIT_OPTIONS,
  DEFAULT_VISIBLE_COOKING_UNITS,
} from "@/constants";

import { AutoPickerField } from "../AutoPickerField";

interface UnitFieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  helperText?: string;
  errorText?: string;
  placeholder?: string;
}

export function UnitField({
  label,
  value,
  onChangeText,
  helperText,
  errorText,
  placeholder = "g, kg, ml, dl",
}: UnitFieldProps) {
  return (
    <AutoPickerField
      label={label}
      value={value}
      options={COOKING_UNIT_OPTIONS}
      maxVisibleOptions={DEFAULT_VISIBLE_COOKING_UNITS}
      onChangeText={onChangeText}
      helperText={helperText}
      errorText={errorText}
      placeholder={placeholder}
    />
  );
}
