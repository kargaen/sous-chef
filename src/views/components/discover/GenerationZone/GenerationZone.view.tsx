import { Pressable, Text, View } from "react-native";

import type { DiscoverThemeViewModel } from "@/controllers";
import { Button, Spinner, TextField } from "@/views/components/ui";

import { useGenerationZone } from "./GenerationZone.hooks";
import { styles } from "./GenerationZone.styles";

const MAX_THEME_CHIPS = 3;

interface GenerationZoneProps {
  themes: DiscoverThemeViewModel[];
  generating: boolean;
  /** Generate 3 ideas on a theme. */
  onTheme: (theme: DiscoverThemeViewModel) => void;
  /** Generate 3 random ideas. */
  onSurprise: () => void;
  /** Generate 3 ideas from the cook's own words. */
  onSubmitText: (text: string) => void;
}

/**
 * The "feed me more" controls at the foot of the Home feed (epic G.1). Three
 * co-equal ways to ask for more ideas — pick a theme, surprise me, or type a
 * request. Generated cards are appended above this zone by the owning feed.
 */
export function GenerationZone({
  themes,
  generating,
  onTheme,
  onSurprise,
  onSubmitText,
}: GenerationZoneProps) {
  const { text, setText, canSubmit, handleSubmit } =
    useGenerationZone(onSubmitText);
  const chips = themes.slice(0, MAX_THEME_CHIPS);

  return (
    <View style={styles.zone}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Keep going</Text>
        <Text style={styles.title}>Want a few more ideas?</Text>
        <Text style={styles.copy}>
          Pick a theme, get a surprise, or tell me what you&apos;re after.
        </Text>
      </View>

      {chips.length > 0 ? (
        <View style={styles.chipRow}>
          {chips.map((theme) => (
            <Pressable
              key={theme.id}
              accessibilityRole="button"
              disabled={generating}
              onPress={() => onTheme(theme)}
              style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
            >
              <Text style={styles.chipEmoji}>{theme.emoji}</Text>
              <Text style={styles.chipLabel}>{theme.title}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <Button
        label="Surprise me"
        variant="secondary"
        onPress={onSurprise}
        disabled={generating}
      />

      <TextField
        label="Or ask for something specific"
        placeholder="e.g. something cozy with squash, under 30 minutes"
        value={text}
        onChangeText={setText}
        editable={!generating}
        multiline
      />
      <Button
        label="Generate ideas"
        onPress={handleSubmit}
        disabled={!canSubmit || generating}
      />

      {generating ? (
        <View style={styles.loadingRow}>
          <Spinner />
          <Text style={styles.loadingText}>Cooking up ideas…</Text>
        </View>
      ) : null}
    </View>
  );
}
