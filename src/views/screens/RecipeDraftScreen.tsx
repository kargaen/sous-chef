import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, spacing } from "@/constants";
import { Button, LoadMask, TextField } from "@/views/components/ui";
import { screenStyles } from "@/views/styles";

import { useRecipeDraftScreenView } from "./RecipeDraftScreen.hooks";
import { styles } from "./RecipeDraftScreen.styles";

export default function RecipeDraftScreen() {
  const view = useRecipeDraftScreenView();
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
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Pressable onPress={view.handleBack} style={styles.backButton}>
              <Text style={styles.backButtonText}>{"←"}</Text>
            </Pressable>
            <Text style={styles.headerTitle}>Recipe draft</Text>
          </View>

          <View style={styles.brandMark}>
            <Text style={styles.brandMarkText}>Sous Chef</Text>
          </View>
        </View>

        <View style={styles.refineCard}>
          <Text style={styles.refineLabel}>Refine this recipe</Text>
          <View style={styles.refineInputRow}>
            <TextInput
              value={view.refineRequest}
              onChangeText={view.setRefineRequest}
              placeholder='e.g. "make it spicy" or "reduce prep time"'
              placeholderTextColor={colors.text.muted}
              multiline
              textAlignVertical="top"
              style={styles.refineInput}
              editable={!view.isRefining}
              onSubmitEditing={() => { void view.handleRefine(); }}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Apply refinement"
              disabled={!view.canRefine}
              onPress={() => { void view.handleRefine(); }}
              style={[
                styles.refineSendButton,
                !view.canRefine && styles.refineSendButtonDisabled,
              ]}
            >
              <Ionicons
                name="arrow-up"
                size={18}
                color={view.canRefine ? colors.text.inverse : colors.text.muted}
              />
            </Pressable>
          </View>

          {view.refineError ? (
            <Text style={styles.refineErrorText}>{view.refineError}</Text>
          ) : null}
        </View>

        <View style={styles.draftCard}>
          <View style={styles.draftHeader}>
            <Text style={styles.draftTitle}>Draft</Text>
            <Text style={styles.draftCopy}>
              Review and edit before saving to your cookbook.
            </Text>
          </View>

          <TextField
            label="Title *"
            value={view.title}
            onChangeText={view.setTitle}
            placeholder="e.g. Sourdough bread"
            autoCapitalize="words"
            autoCorrect={false}
          />

          <TextField
            label="Ingredients"
            value={view.ingredients}
            onChangeText={view.setIngredients}
            placeholder={`500g bread flour\n10g salt\n7g instant yeast\n350ml water`}
            multiline
            style={styles.multilineField}
          />

          <TextField
            label="Steps"
            value={view.steps}
            onChangeText={view.setSteps}
            placeholder="1. Mix flour, salt and yeast..."
            multiline
            style={styles.multilineField}
          />

          <TextField
            label="Notes"
            value={view.notes}
            onChangeText={view.setNotes}
            placeholder="Any tips, variations, sourcing notes..."
            multiline
            style={styles.notesField}
          />
        </View>

        <View style={styles.footerActionGroup}>
          <View style={styles.footerActions}>
            <Button
              label="Back"
              variant="ghost"
              onPress={view.handleBack}
              style={styles.footerButton}
            />
            <Button
              label="Save recipe"
              onPress={() => { void view.handleSave(); }}
              disabled={!view.canSave}
              loading={view.isSaving}
              style={styles.footerButton}
            />
          </View>
        </View>
      </ScrollView>

      <LoadMask
        visible={view.isRefining}
        label="Refining your recipe..."
        tone="warm"
      />
    </View>
  );
}
