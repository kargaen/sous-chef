import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { spacing } from "@/constants";
import { Button, Spinner, TextField } from "@/views/components/ui";
import { RecipePhotoEditor } from "@/views/components/recipe/RecipePhotoEditor";

import { useEditRecipeScreenView } from "./EditRecipeScreen.hooks";
import { styles } from "./EditRecipeScreen.styles";

export default function EditRecipeScreen() {
  const view = useEditRecipeScreenView();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity style={styles.backButton} onPress={view.handleCancel}>
          <Text style={styles.backLabel}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit recipe</Text>
      </View>

      {view.loading ? (
        <View style={styles.statusWrap}>
          <Spinner label="Loading recipe…" />
        </View>
      ) : view.notFound ? (
        <View style={styles.statusWrap}>
          <Text style={styles.statusText}>This recipe isn’t on your shelf.</Text>
          <Button
            label="Go back"
            variant="secondary"
            onPress={view.handleCancel}
          />
        </View>
      ) : (
        <>
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.intro}>
              Make quick manual edits — no AI, just your changes.
            </Text>

            <RecipePhotoEditor recipe={view.recipe} />

            <TextField
              label="Title"
              value={view.title}
              onChangeText={view.setTitle}
              placeholder="Recipe title"
            />
            <TextField
              label="Description"
              value={view.description}
              onChangeText={view.setDescription}
              placeholder="A short description"
              multiline
              style={styles.shortMultiline}
            />

            <TextField
              label="Servings"
              value={view.servings}
              onChangeText={view.setServings}
              placeholder="e.g. 4"
              keyboardType="numeric"
            />
            <TextField
              label="Prep (minutes)"
              value={view.prepMinutes}
              onChangeText={view.setPrepMinutes}
              placeholder="e.g. 15"
              keyboardType="numeric"
            />
            <TextField
              label="Cook (minutes)"
              value={view.cookMinutes}
              onChangeText={view.setCookMinutes}
              placeholder="e.g. 30"
              keyboardType="numeric"
            />
            <TextField
              label="Estimated cost"
              value={view.estimatedCost}
              onChangeText={view.setEstimatedCost}
              placeholder="e.g. 12.50"
              keyboardType="numeric"
              helperText="Leave blank if unknown."
            />

            <TextField
              label="Ingredients"
              value={view.ingredientsText}
              onChangeText={view.setIngredientsText}
              placeholder={"2 cups flour\n1 tsp salt"}
              multiline
              style={styles.multilineInput}
              helperText="One ingredient per line."
            />
            <TextField
              label="Steps"
              value={view.stepsText}
              onChangeText={view.setStepsText}
              placeholder={"Preheat the oven…\nMix the dry ingredients…"}
              multiline
              style={styles.multilineInput}
              helperText="One step per line."
            />
            <TextField
              label="Chef's notes"
              value={view.chefsNotes}
              onChangeText={view.setChefsNotes}
              placeholder="Tips, tweaks, reminders…"
              multiline
              style={styles.shortMultiline}
            />

            {view.error ? (
              <Text style={styles.errorText}>{view.error}</Text>
            ) : null}
          </ScrollView>

          <View
            style={[
              styles.footer,
              { paddingBottom: insets.bottom + spacing.md },
            ]}
          >
            <Button
              label="Cancel"
              variant="ghost"
              onPress={view.handleCancel}
              disabled={view.saving}
              style={styles.footerButton}
            />
            <Button
              label="Save changes"
              onPress={() => {
                void view.handleSave();
              }}
              loading={view.saving}
              style={styles.footerButton}
            />
          </View>
        </>
      )}
    </View>
  );
}
