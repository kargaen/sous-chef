import { useLocalSearchParams } from "expo-router";
import { ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, spacing } from "@/constants";
import { useReflectionController } from "@/controllers";
import { Button, HatRating, Spinner } from "@/views/components/ui";
import { RecipePhotoEditor } from "@/views/components/recipe/RecipePhotoEditor";
import { SousChefMark } from "@/views/components/companion";
import { useSafeBack } from "@/views/hooks/useSafeBack";

import { styles } from "./ReflectionScreen.styles";

export default function ReflectionScreen() {
  const goBack = useSafeBack();
  const params = useLocalSearchParams<{ id?: string }>();
  const insets = useSafeAreaInsets();
  const recipeId = typeof params.id === "string" ? params.id : "";
  const view = useReflectionController(recipeId);

  const handleSave = async () => {
    const ok = await view.onSave();
    if (ok) goBack();
  };

  const handleSkip = async () => {
    const ok = await view.onSkip();
    if (ok) goBack();
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => goBack()}>
          <Text style={styles.backLabel}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>How did it go?</Text>
        <View style={styles.brandRow}>
          <SousChefMark size={18} />
          <Text style={styles.brand}>Sous Chef</Text>
        </View>
      </View>

      {view.loading ? (
        <View style={styles.statusWrap}>
          <Spinner label="Getting the kitchen ready…" />
        </View>
      ) : (
        <>
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.introCard}>
              <View style={styles.brandRow}>
                <SousChefMark size={16} />
                <Text style={styles.introEyebrow}>Reflection</Text>
              </View>
              <Text style={styles.introTitle}>
                How did {view.recipeTitle ?? "this dish"} go?
              </Text>
              <Text style={styles.introCopy}>
                A fast debrief makes the app better the next time this dish comes
                back onto the stove.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionEyebrow}>First signal</Text>
              <Text style={styles.sectionTitle}>Overall feel</Text>
              <Text style={styles.sectionCopy}>
                Start with the big picture, then go deeper only if you want to.
              </Text>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Overall rating</Text>
                <Text style={styles.cardCopy}>How happy are you with this cook?</Text>
                <View style={styles.ratingRow}>
                  <Text style={styles.ratingLabel}>Overall</Text>
                  <HatRating
                    value={view.overallScore}
                    onChange={view.setOverallScore}
                  />
                </View>
              </View>
            </View>

            {view.dimensions.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionEyebrow}>Details</Text>
                <Text style={styles.sectionTitle}>What stood out?</Text>
                <Text style={styles.sectionCopy}>
                  Optional finer-grained scores help future cooks and variants
                  feel smarter.
                </Text>

                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Dimension ratings</Text>
                  <Text style={styles.cardCopy}>Only score what feels useful.</Text>
                  {view.dimensions.map((dimension) => (
                    <View key={dimension.id} style={styles.ratingRow}>
                      <Text style={styles.ratingLabel}>{dimension.label}</Text>
                      <HatRating
                        value={view.dimensionScores[dimension.id] ?? 0}
                        onChange={(score) =>
                          view.setDimensionScore(dimension.id, score)
                        }
                      />
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            <View style={styles.section}>
              <Text style={styles.sectionEyebrow}>Notes</Text>
              <Text style={styles.sectionTitle}>Leave a breadcrumb for next time</Text>
              <Text style={styles.sectionCopy}>
                Capture what worked, what surprised you, or what you would change.
              </Text>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Cook notes</Text>
                <Text style={styles.cardCopy}>
                  Optional, but high-value once you revisit the dish.
                </Text>
                <TextInput
                  value={view.note}
                  onChangeText={view.setNote}
                  placeholder="What worked, what to try next time…"
                  placeholderTextColor={colors.text.muted}
                  multiline
                  style={styles.noteInput}
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionEyebrow}>The dish</Text>
              <Text style={styles.sectionTitle}>Add a photo</Text>
              <Text style={styles.sectionCopy}>
                Snap the finished plate — Sous Chef can tidy it up for you.
              </Text>
              <View style={styles.card}>
                <RecipePhotoEditor recipe={view.recipe} heading="" />
              </View>
            </View>
          </ScrollView>

          <View
            style={[
              styles.footer,
              { paddingBottom: insets.bottom + spacing.md },
            ]}
          >
            <Button
              label="Skip"
              variant="ghost"
              onPress={() => {
                void handleSkip();
              }}
              disabled={view.saving}
              style={styles.footerButton}
            />
            <Button
              label="Save"
              onPress={() => {
                void handleSave();
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
