import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import {
  Animated,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, spacing } from "@/constants";
import { useCookingSessionController } from "@/controllers";
import { AssistantPromptField } from "@/views/components/assistant/AssistantPromptField";
import { Button } from "@/views/components/ui";
import { useSafeBack } from "@/views/hooks/useSafeBack";
import { textStyles } from "@/views/styles";

import { styles } from "./CookingScreen.styles";

interface CookingScreenProps {
  recipeId: string;
}

export default function CookingScreen({ recipeId }: CookingScreenProps) {
  const router = useRouter();
  const goBack = useSafeBack();
  const session = useCookingSessionController(recipeId);
  const insets = useSafeAreaInsets();
  const safeContentStyle = [
    styles.content,
    {
      paddingTop: insets.top + spacing.md,
      paddingBottom: insets.bottom + spacing.xl,
    },
  ];

  const scrollRef = useRef<ScrollView>(null);
  const stepsY = useRef(0);
  const finishY = useRef(0);
  const prevAllStepsDone = useRef(false);
  const prevAllIngredientsDone = useRef(false);
  const shakeX = useRef(new Animated.Value(0)).current;

  const allIngredientsDone =
    !!session.recipe &&
    session.recipe.ingredients.length > 0 &&
    session.recipe.ingredients.every((ingredient) =>
      session.checkedIngredientIds.includes(ingredient.id),
    );

  const allStepsDone =
    !!session.recipe &&
    session.recipe.steps.length > 0 &&
    session.recipe.steps.every((step) =>
      session.checkedStepOrders.includes(step.order),
    );

  // Checking off the last ingredient scrolls down to the steps.
  useEffect(() => {
    if (allIngredientsDone && !prevAllIngredientsDone.current) {
      scrollRef.current?.scrollTo({
        y: Math.max(stepsY.current - 40, 0),
        animated: true,
      });
    }
    prevAllIngredientsDone.current = allIngredientsDone;
  }, [allIngredientsDone]);

  // Checking off the last step brings the finish/rate action into view and
  // gives the button a ~1s shake to nudge a rating.
  useEffect(() => {
    if (allStepsDone && !prevAllStepsDone.current) {
      scrollRef.current?.scrollTo({
        y: Math.max(finishY.current - 60, 0),
        animated: true,
      });
      shakeX.setValue(0);
      Animated.sequence(
        [8, -8, 7, -7, 5, -5, 3, -3, 0].map((toValue) =>
          Animated.timing(shakeX, {
            toValue,
            duration: 95,
            useNativeDriver: true,
          }),
        ),
      ).start();
    }
    prevAllStepsDone.current = allStepsDone;
  }, [allStepsDone, shakeX]);

  if (session.loading && !session.recipe) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={safeContentStyle}>
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <Text style={styles.backLabel}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>Preparing your kitchen…</Text>
          <Text style={styles.statusCopy}>Getting the recipe ready.</Text>
        </View>
      </ScrollView>
    );
  }

  if (session.error || !session.recipe) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={safeContentStyle}>
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <Text style={styles.backLabel}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>Unable to load recipe</Text>
          <Text style={styles.statusCopy}>
            {session.error ?? "This recipe couldn't be found."}
          </Text>
        </View>
      </ScrollView>
    );
  }

  const { recipe } = session;

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.screen}
      contentContainerStyle={safeContentStyle}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <TouchableOpacity style={styles.backButton} onPress={goBack}>
        <Text style={styles.backLabel}>← Back</Text>
      </TouchableOpacity>

      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>{recipe.title}</Text>
        <View style={styles.keepAwakeRow}>
          <Text style={styles.keepAwakeLabel}>Keep screen on</Text>
          <Switch
            value={session.keepScreenOn}
            onValueChange={session.toggleKeepScreenOn}
            thumbColor={
              session.keepScreenOn
                ? colors.brand.terracotta
                : colors.background.card
            }
            trackColor={{ false: colors.border.subtle, true: "#F3C9B5" }}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={textStyles.sectionTitle}>Ingredients</Text>
        <View style={styles.checkCard}>
          {recipe.ingredients.map((ingredient, index) => {
            const checked = session.checkedIngredientIds.includes(ingredient.id);
            return (
              <TouchableOpacity
                key={ingredient.id}
                style={[
                  styles.checkRow,
                  index === 0 ? styles.firstCheckRow : null,
                ]}
                onPress={() => session.toggleIngredient(ingredient.id)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.checkbox,
                    checked ? styles.checkboxChecked : null,
                  ]}
                >
                  {checked ? (
                    <Text style={styles.checkmark}>✓</Text>
                  ) : null}
                </View>
                <Text
                  style={[
                    styles.checkLabel,
                    checked ? styles.checkLabelDone : null,
                  ]}
                >
                  {ingredient.quantity} {ingredient.unit} {ingredient.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View
        style={styles.section}
        onLayout={(event) => {
          stepsY.current = event.nativeEvent.layout.y;
        }}
      >
        <Text style={textStyles.sectionTitle}>Steps</Text>
        <View style={styles.checkCard}>
          {recipe.steps.map((step, index) => {
            const checked = session.checkedStepOrders.includes(step.order);
            return (
              <TouchableOpacity
                key={step.order}
                style={[
                  styles.checkRow,
                  index === 0 ? styles.firstCheckRow : null,
                ]}
                onPress={() => session.toggleStep(step.order)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.checkbox,
                    checked ? styles.checkboxChecked : null,
                  ]}
                >
                  {checked ? (
                    <Text style={styles.checkmark}>✓</Text>
                  ) : (
                    <Text style={styles.stepOrder}>{step.order}</Text>
                  )}
                </View>
                <Text
                  style={[
                    styles.checkLabel,
                    checked ? styles.checkLabelDone : null,
                  ]}
                >
                  {step.instruction}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View
        style={styles.finishSection}
        onLayout={(event) => {
          finishY.current = event.nativeEvent.layout.y;
        }}
      >
        {allStepsDone ? (
          <View style={styles.finishHint}>
            <Text style={styles.finishHintText}>
              Don&apos;t forget to rate the recipe!
            </Text>
          </View>
        ) : null}
        <Animated.View style={{ transform: [{ translateX: shakeX }] }}>
          <Button
            label="Finish cooking"
            onPress={() => router.push(`/recipe/reflect?id=${recipeId}`)}
          />
        </Animated.View>
        <Button
          label="Skip rating"
          variant="ghost"
          onPress={() => {
            session.finishWithoutRating();
            goBack();
          }}
        />
      </View>

      <AssistantPromptField placeholder="Ask Sous Chef about this recipe…" />
    </ScrollView>
  );
}
