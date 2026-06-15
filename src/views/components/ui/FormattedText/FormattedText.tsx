import { Text } from "react-native";
import type { StyleProp, TextStyle } from "react-native";

export interface FormattedTextProps {
  children: string;
  style?: StyleProp<TextStyle>;
}

interface Segment {
  text: string;
  bold: boolean;
}

const parseBoldSegments = (input: string): Segment[] => {
  const segments: Segment[] = [];
  const pattern = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(input)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: input.slice(lastIndex, match.index), bold: false });
    }
    segments.push({ text: match[1], bold: true });
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < input.length) {
    segments.push({ text: input.slice(lastIndex), bold: false });
  }

  return segments;
};

/**
 * Renders a string with lightweight markdown support: `**bold**` spans only.
 * Everything else passes through as plain text.
 */
export function FormattedText({ children, style }: FormattedTextProps) {
  const segments = parseBoldSegments(children);

  return (
    <Text style={style}>
      {segments.map((segment, index) =>
        segment.bold ? (
          <Text key={index} style={{ fontWeight: "700" }}>
            {segment.text}
          </Text>
        ) : (
          segment.text
        ),
      )}
    </Text>
  );
}
