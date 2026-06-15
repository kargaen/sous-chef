import { Ionicons } from "@expo/vector-icons";
import { useRef } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { useKeyboardState } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, spacing } from "@/constants";
import { Button, FormattedText } from "@/views/components/ui";
import { AdaptationDiffView } from "@/views/components/recipe/AdaptationDiffView";
import { useSafeBack } from "@/views/hooks/useSafeBack";

import { useRecipeAdaptScreenView } from "./RecipeAdaptScreen.hooks";
import { styles } from "./RecipeAdaptScreen.styles";

export default function RecipeAdaptScreen() {
  const goBack = useSafeBack();
  const view = useRecipeAdaptScreenView();
  const scrollRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardState();
  const headerSafeStyle = [styles.header, { paddingTop: insets.top + spacing.sm }];
  // The root KeyboardAvoidingView already lifts the composer above the
  // keyboard — only pad for the nav bar while the keyboard is closed.
  const composerSafeStyle = [
    styles.composer,
    { paddingBottom: keyboard.isVisible ? spacing.md : insets.bottom + spacing.md },
  ];

  const { adaptation, recipe } = view;
  const isBusy =
    adaptation.phase === "planning" || adaptation.phase === "adapting";
  const canSend = adaptation.draft.trim().length > 0 && !isBusy;

  if (view.recipeLoading || view.recipeError) {
    return (
      <View style={styles.screen}>
        <View style={headerSafeStyle}>
          <Pressable style={styles.backButton} onPress={goBack}>
            <Text style={styles.backLabel}>←</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Adapt recipe</Text>
        </View>
        <View style={styles.statusWrap}>
          {view.recipeLoading ? (
            <ActivityIndicator size="small" color={colors.brand.terracotta} />
          ) : null}
          <Text style={styles.statusText}>
            {view.recipeError ?? "Getting the recipe ready…"}
          </Text>
        </View>
      </View>
    );
  }

  if (!recipe) return null;

  return (
    <View style={styles.screen}>
      <View style={headerSafeStyle}>
        <Pressable style={styles.backButton} onPress={goBack}>
          <Text style={styles.backLabel}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {recipe.title}
        </Text>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.messageList}
        contentContainerStyle={styles.messageListContent}
        onContentSizeChange={() =>
          scrollRef.current?.scrollToEnd({ animated: true })
        }
        keyboardShouldPersistTaps="handled"
      >
        {adaptation.messages.length === 0 ? (
          <Text style={styles.emptyHint}>
            Ask me to scale the recipe, swap an ingredient, troubleshoot a
            problem, or anything else about this dish.
          </Text>
        ) : null}

        {adaptation.messages.map((message) => (
          <View
            key={message.id}
            style={[
              styles.bubble,
              message.role === "user"
                ? styles.bubbleUser
                : styles.bubbleAssistant,
            ]}
          >
            <FormattedText
              style={
                message.role === "user"
                  ? styles.bubbleTextUser
                  : styles.bubbleTextAssistant
              }
            >
              {message.content}
            </FormattedText>
          </View>
        ))}

        {isBusy ? (
          <View style={styles.thinkingRow}>
            <ActivityIndicator size="small" color={colors.brand.terracotta} />
            <Text style={styles.thinkingLabel}>
              {adaptation.phase === "adapting"
                ? "Adapting the recipe…"
                : "Thinking…"}
            </Text>
          </View>
        ) : null}

        {adaptation.error ? (
          <Text style={styles.errorText}>{adaptation.error}</Text>
        ) : null}

        {(adaptation.phase === "adapted" || adaptation.phase === "saved") &&
        adaptation.result ? (
          <View style={styles.diffCard}>
            <Text style={styles.diffRationale}>
              {adaptation.result.rationale}
            </Text>
            <AdaptationDiffView recipe={recipe} response={adaptation.result} />
            {adaptation.phase === "adapted" ? (
              <Button
                label="Save as variant"
                loading={adaptation.isSavingVariant}
                onPress={() => {
                  void adaptation.onSaveVariant();
                }}
              />
            ) : (
              <>
                <Text style={styles.savedConfirmation}>
                  Variant saved to this recipe.
                </Text>
                <Button
                  label="Done"
                  variant="secondary"
                  onPress={goBack}
                />
              </>
            )}
          </View>
        ) : null}
      </ScrollView>

      {adaptation.phase === "ready" ? (
        <View style={styles.startAdaptationWrap}>
          <Button
            label="Start adaptation"
            onPress={() => {
              void adaptation.onStartAdaptation();
            }}
          />
        </View>
      ) : null}

      <View style={composerSafeStyle}>
        <Text style={styles.toolsLabel}>Chef tools</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
          keyboardShouldPersistTaps="handled"
        >
          {adaptation.quickActions.map((action) => (
            <Pressable
              key={action.id}
              style={styles.chip}
              onPress={() => view.handleQuickAction(action.prefill)}
            >
              <Text style={styles.chipText}>{action.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.inputRow}>
          <TextInput
            value={adaptation.draft}
            onChangeText={adaptation.onChangeDraft}
            placeholder="Scale for 10, swap butter, why did it split…"
            placeholderTextColor={colors.text.muted}
            multiline
            style={styles.input}
            editable={!isBusy}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send"
            disabled={!canSend}
            onPress={() => {
              void adaptation.onSend();
            }}
            style={[
              styles.sendButton,
              !canSend ? styles.sendButtonDisabled : null,
            ]}
          >
            <Ionicons
              name="arrow-up"
              size={20}
              color={canSend ? colors.text.inverse : colors.text.muted}
            />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
