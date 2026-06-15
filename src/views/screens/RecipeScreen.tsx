import { useRouter } from "expo-router";
import { useRef } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";

import { colors, spacing } from "@/constants";
import { Button } from "@/views/components/ui";
import { useSafeBack } from "@/views/hooks/useSafeBack";
import { screenStyles, textStyles } from "@/views/styles";

import { useRecipeScreenView } from "./RecipeScreen.hooks";
import type { RecipePage } from "./RecipeScreen.hooks";
import { styles } from "./RecipeScreen.styles";

// How much of the next card peeks in from the edge — the visual cue that
// the hero is swipeable when variants exist.
const PAGE_PEEK = 24;

// The photo backdrop is sized relative to the screen WIDTH (the image spans the
// full width), so it keeps a natural horizontal-photo proportion on any device.
// The band fades into the app background; a small top peek reveals more of the
// image above the content before the gradient slides into the recipe card.
const PHOTO_BACKDROP_RATIO = 0.8; // band height as a fraction of screen width
const PHOTO_TOP_PEEK_RATIO = 0.1; // extra top padding as a fraction of screen width

export default function RecipeScreen() {
  const router = useRouter();
  const goBack = useSafeBack();
  const view = useRecipeScreenView();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const pagerRef = useRef<ScrollView>(null);
  const safeContentStyle = [
    screenStyles.scrollContent,
    {
      paddingTop: insets.top + windowWidth * PHOTO_TOP_PEEK_RATIO,
      paddingBottom: insets.bottom + spacing.xl,
    },
  ];

  if (view.statusType === "status") {
    return (
      <ScrollView
        style={screenStyles.screen}
        contentContainerStyle={safeContentStyle}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity style={styles.backRow} onPress={goBack}>
          <Text style={styles.backLabel}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>{view.statusTitle}</Text>
          <Text style={styles.statusCopy}>{view.statusCopy}</Text>
        </View>
      </ScrollView>
    );
  }

  const { activePage, handlePromote, pages, recipe, selectedPageIndex, selectPage, stats } =
    view;

  const hasVariants = pages.length > 1;
  // Horizontal padding of the content container is spacing.lg on each side.
  const contentWidth = windowWidth - spacing.lg * 2;
  const pageWidth = hasVariants ? contentWidth - PAGE_PEEK : contentWidth;
  const pageInterval = pageWidth + spacing.sm;

  // A real photo fades into the app background; with no photo, a soft warm tint
  // fades in. (`as const` keeps these as the tuples LinearGradient expects.)
  const backdropHeight = insets.top + windowWidth * PHOTO_BACKDROP_RATIO;
  const backdropColors = recipe.imageUri
    ? (["transparent", "transparent", colors.background.app] as const)
    : ([colors.background.muted, colors.background.app] as const);
  const backdropLocations = recipe.imageUri
    ? ([0, 0.45, 1] as const)
    : ([0, 1] as const);

  const renderHeroCard = (page: RecipePage) => (
    <View
      key={page.recipe.id}
      style={[styles.heroCard, { width: pageWidth }]}
    >
      <View style={styles.heroEyebrowRow}>
        <Text style={styles.eyebrow}>Recipe</Text>
        {page.isVariant ? (
          <View style={styles.variantTag}>
            <Text style={styles.variantTagText}>Variant</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.title}>{page.recipe.title}</Text>
      <Text style={styles.heroDescription}>{page.recipe.description}</Text>

      <View style={styles.tagRow}>
        {page.recipe.tags.map((tag) => (
          <View key={tag} style={styles.tagPill}>
            <Text style={styles.tagLabel}>{tag}</Text>
          </View>
        ))}
      </View>

      <View style={styles.metricStrip}>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{page.recipe.servings}</Text>
          <Text style={styles.metricLabel}>servings</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{page.totalMinutes}</Text>
          <Text style={styles.metricLabel}>minutes total</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{page.estimatedCostLabel}</Text>
          <Text style={styles.metricLabel}>estimated cost</Text>
        </View>
      </View>

      <View style={styles.heroActions}>
        <Button
          label="Start cooking"
          onPress={() => router.push(`/recipe/cook?id=${page.recipe.id}`)}
        />
        <Button
          label="Adapt recipe"
          variant="secondary"
          onPress={() => router.push(`/recipe/adapt?id=${page.recipe.id}`)}
        />
        <Button
          label="Edit recipe"
          variant="ghost"
          onPress={() => router.push(`/recipe/edit?id=${page.recipe.id}`)}
        />
        {page.isVariant ? (
          <Button
            label="Make this its own recipe"
            variant="ghost"
            onPress={() => {
              void handlePromote();
            }}
          />
        ) : null}
      </View>
    </View>
  );

  return (
    <View style={styles.screenRoot}>
      <View
        style={[styles.backdrop, { height: backdropHeight }]}
        pointerEvents="none"
      >
        {recipe.imageUri ? (
          <Image
            source={{ uri: recipe.imageUri }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
          />
        ) : null}
        <LinearGradient
          colors={backdropColors}
          locations={backdropLocations}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <ScrollView
        style={styles.screenTransparent}
        contentContainerStyle={safeContentStyle}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity style={styles.backRow} onPress={goBack}>
          <Text style={styles.backLabel}>← Back</Text>
        </TouchableOpacity>

      {hasVariants ? (
        <>
          <ScrollView
            ref={pagerRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={pageInterval}
            decelerationRate="fast"
            contentContainerStyle={styles.pagerContent}
            onMomentumScrollEnd={(event) => {
              const index = Math.round(
                event.nativeEvent.contentOffset.x / pageInterval,
              );
              selectPage(Math.max(0, Math.min(index, pages.length - 1)));
            }}
          >
            {pages.map(renderHeroCard)}
          </ScrollView>

          <View style={styles.dotsRow}>
            {pages.map((page, index) => (
              <TouchableOpacity
                key={page.recipe.id}
                accessibilityRole="button"
                accessibilityLabel={`Show ${
                  page.isVariant ? `variant ${index}` : "original"
                }`}
                hitSlop={10}
                onPress={() => {
                  selectPage(index);
                  pagerRef.current?.scrollTo({
                    x: index * pageInterval,
                    animated: true,
                  });
                }}
              >
                <View
                  style={[
                    styles.dot,
                    index === selectedPageIndex ? styles.dotActive : null,
                  ]}
                />
              </TouchableOpacity>
            ))}
          </View>
        </>
      ) : (
        renderHeroCard(activePage)
      )}

      <View style={styles.statsSection}>
        <View style={styles.statsStrip}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Cooked</Text>
            <Text style={styles.statValue}>{stats.cookedLabel}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Average</Text>
            <Text style={styles.statValue}>{stats.averageLabel}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Latest</Text>
            <Text style={styles.statValue} numberOfLines={2}>
              {stats.latestNote ?? "No cook notes yet"}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.twoColumnLead}>
        <View style={styles.leadCard}>
          <Text style={styles.leadLabel}>Prep</Text>
          <Text style={styles.leadValue}>{activePage.prepDurationLabel}</Text>
        </View>
        <View style={styles.leadCard}>
          <Text style={styles.leadLabel}>Cook</Text>
          <Text style={styles.leadValue}>{activePage.cookDurationLabel}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={textStyles.sectionTitle}>Ingredients</Text>
        <View style={styles.ingredientsCard}>
          {recipe.ingredients.map((ingredient, index) => (
            <View
              key={ingredient.id}
              style={[
                styles.ingredientRow,
                index === 0 ? styles.firstIngredientRow : null,
              ]}
            >
              <View style={styles.ingredientBullet} />
              <Text style={styles.ingredientAmount}>
                {ingredient.quantity} {ingredient.unit}
              </Text>
              <View style={styles.ingredientMain}>
                <Text style={styles.ingredientName}>{ingredient.name}</Text>
                {ingredient.notes ? (
                  <Text style={styles.ingredientNote}>{ingredient.notes}</Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={textStyles.sectionTitle}>Method</Text>
        <View style={styles.stepsCard}>
          {recipe.steps.map((step, index) => (
            <View
              key={step.order}
              style={[styles.stepRow, index === 0 ? styles.firstStepRow : null]}
            >
              <View style={styles.stepIndexWrap}>
                <View style={styles.stepIndex}>
                  <Text style={styles.stepIndexLabel}>{step.order}</Text>
                </View>
                {index < recipe.steps.length - 1 ? (
                  <View style={styles.stepStem} />
                ) : null}
              </View>

              <View style={styles.stepBody}>
                <View style={styles.stepHeader}>
                  <Text style={styles.stepTitle}>Step {step.order}</Text>
                  {step.durationMinutes ? (
                    <View style={styles.durationChip}>
                      <Text style={styles.durationChipText}>
                        {step.durationMinutes} min
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.stepInstruction}>{step.instruction}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {recipe.chefsNotes ? (
        <View style={styles.section}>
          <Text style={textStyles.sectionTitle}>Chef&apos;s Notes</Text>
          <View style={styles.notesCard}>
            <View style={styles.noteBlock}>
              <Text style={styles.noteBody}>{recipe.chefsNotes}</Text>
            </View>
          </View>
        </View>
      ) : null}
      </ScrollView>
    </View>
  );
}
