import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { spacing } from "@/constants";
import { Button, LoadMask, TextField } from "@/views/components/ui";
import { screenStyles } from "@/views/styles";

import { useNewRecipeScreenView } from "./NewRecipeScreen.hooks";
import { styles } from "./NewRecipeScreen.styles";

export default function NewRecipeScreen() {
  const view = useNewRecipeScreenView();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.screenRoot}>
      <ScrollView
        style={screenStyles.screen}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.md },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Pressable
              onPress={view.handleCancel}
              disabled={view.isImportingSource}
              style={styles.backButton}
            >
              <Text style={styles.backButtonText}>{"←"}</Text>
            </Pressable>
            <Text style={styles.headerTitle}>New recipe</Text>
          </View>

          <View style={styles.brandMark}>
            <Text style={styles.brandMarkText}>Sous Chef</Text>
          </View>
        </View>

        <View style={styles.captureCard}>
          <View style={styles.captureGlow} />

          <View style={styles.captureEyebrowRow}>
            <View style={styles.captureBadge}>
              <Text style={styles.captureBadgeText}>{"🧉"}</Text>
            </View>
            <Text style={styles.captureEyebrow}>Capture</Text>
          </View>

          <Text style={styles.captureTitle}>Bring a recipe into the book</Text>
          <Text style={styles.captureCopy}>
            Import from the web, riff on an idea, or write your own draft.
            Review first, then save the version you trust.
          </Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionEyebrow}>Start with a source</Text>
          <Text style={styles.sectionTitle}>
            Choose how the sous chef should help
          </Text>
          <Text style={styles.sectionCopy}>
            Pick the fastest path in: URL import, a rough idea, or pasted text
            from anywhere.
          </Text>
        </View>

        <View style={styles.sourceCard}>
          <Text style={styles.sourceCardTitle}>Import recipe</Text>

          <View style={styles.sourceModeRow}>
            {view.sourceOptions.map((option) => {
              const isActive = option.key === view.sourceMode;
              return (
                <Pressable
                  key={option.key}
                  onPress={() => view.setSourceMode(option.key)}
                  disabled={view.isImportingSource}
                  style={[
                    styles.sourceModeChip,
                    isActive ? styles.sourceModeChipActive : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.sourceModeChipText,
                      isActive ? styles.sourceModeChipTextActive : null,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.sourceActionRow}>
            <View style={styles.sourceFieldWrap}>
              <TextField
                label={view.sourceInputLabel}
                value={view.sourceInput}
                onChangeText={view.setSourceInput}
                placeholder={view.sourceInputPlaceholder}
                autoCapitalize={view.sourceInputAutoCapitalize}
                autoCorrect={false}
                helperText={view.sourceHelperText}
                multiline={view.isSourceInputMultiline}
                editable={!view.isImportingSource}
                style={[
                  styles.sourceInput,
                  view.isSourceInputMultiline ? styles.sourceInputMultiline : null,
                ]}
              />
            </View>
            <View style={styles.sourceImportRow}>
              <Button
                label="Import"
                onPress={() => { void view.handleImportSource(); }}
                disabled={!view.canImportSource}
                loading={view.isImportingSource}
                style={styles.importButton}
              />
            </View>
          </View>

          {view.sourceFeedback ? (
            <Text style={styles.sourceFeedback}>{view.sourceFeedback}</Text>
          ) : null}
        </View>
      </ScrollView>

      <LoadMask
        visible={view.isImportingSource}
        label={view.importMaskLabel}
        tone="warm"
      />
    </View>
  );
}
