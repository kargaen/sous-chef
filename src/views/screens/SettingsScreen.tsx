import { Pressable, ScrollView, Share, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { spacing } from "@/constants";
import { Button, Spinner, TextField } from "@/views/components/ui";
import { screenStyles, textStyles } from "@/views/styles";
import { clearLogBuffer, exportLogs } from "@/utils/logger";

import { useSettingsScreenView } from "./SettingsScreen.hooks";
import { styles } from "./SettingsScreen.styles";

export default function SettingsScreen() {
  const view = useSettingsScreenView();
  const insets = useSafeAreaInsets();

  if (!view.hasLoaded) {
    return <Spinner label="Loading settings..." />;
  }

  return (
    <ScrollView
      ref={view.scrollViewRef}
      style={screenStyles.screen}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + spacing.md,
          paddingBottom: insets.bottom + spacing.xl,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={screenStyles.header}>
        <Text style={textStyles.eyebrow}>Sous Chef</Text>
        <Text style={textStyles.screenTitleCompact}>Settings</Text>
      </View>

      <View style={styles.introCard}>
        <View style={styles.introGlow} />
        <Text style={styles.introEyebrow}>Preferences</Text>
        <Text style={styles.introTitle}>Teach the sous chef how you cook</Text>
        <Text style={styles.introCopy}>
          Profile, learning, and support settings live here. Keep the assistant
          useful, understandable, and on your terms.
        </Text>
      </View>

      {view.error ? <Text style={textStyles.errorText}>{view.error}</Text> : null}

      <View style={styles.sectionBlock}>
        <Text style={styles.sectionEyebrow}>Assistant</Text>
        <Text style={styles.sectionTitle}>AI setup</Text>
        <Text style={styles.sectionCopy}>
          Bring your own Gemini key and adjust how present the sous chef should
          feel in the app.
        </Text>

        <View
          onLayout={view.handleSectionLayout(view.sectionIds.assistant)}
          style={[
            styles.card,
            view.highlightedSectionId === view.sectionIds.assistant
              ? styles.cardFocused
              : null,
          ]}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Assistant settings</Text>
            <Text style={styles.cardCopy}>
              Stored locally on this device unless you choose to share data
              later.
            </Text>
          </View>

          <View style={styles.fieldGroup}>
            <TextField
              label="Gemini API key"
              value={view.draft.geminiApiKey}
              onChangeText={(geminiApiKey) => {
                view.updateDraft({ geminiApiKey });
              }}
              placeholder="Paste your Gemini API key"
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              helperText="Get a key at ai.google.dev. It stays on this device for now."
            />

            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Reply language</Text>
              <View style={styles.toggleOptionsRow}>
                {view.languageOptions.map((option) => {
                  const isActive =
                    (view.draft.assistantOutputLanguage ?? "imply") ===
                    option.value;

                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => {
                        view.updateDraft({
                          assistantOutputLanguage: option.value,
                        });
                      }}
                      style={[
                        styles.optionChip,
                        isActive ? styles.optionChipActive : null,
                      ]}
                    >
                      <Text
                        style={[
                          styles.optionChipText,
                          isActive ? styles.optionChipTextActive : null,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={styles.helperText}>
                Imply follows whatever language you write in. Picking a
                language forces every reply into it, even when you paste
                recipes in other languages.
              </Text>
            </View>

            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Keep screen awake</Text>
              <View style={styles.toggleOptionsRow}>
                {[
                  { label: "Off", value: false },
                  { label: "On", value: true },
                ].map((option) => {
                  const isActive = view.draft.keepScreenOn === option.value;

                  return (
                    <Pressable
                      key={option.label}
                      onPress={() => {
                        view.updateDraft({ keepScreenOn: option.value });
                      }}
                      style={[
                        styles.optionChip,
                        isActive ? styles.optionChipActive : null,
                      ]}
                    >
                      <Text
                        style={[
                          styles.optionChipText,
                          isActive ? styles.optionChipTextActive : null,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Sustainability nudges</Text>
              <View style={styles.toggleOptionsRow}>
                {view.sustainabilityOptions.map((option) => {
                  const isActive =
                    view.draft.sustainabilityNudges === option.value;

                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => {
                        view.updateDraft({
                          sustainabilityNudges: option.value,
                        });
                      }}
                      style={[
                        styles.optionChip,
                        isActive ? styles.optionChipActive : null,
                      ]}
                    >
                      <Text
                        style={[
                          styles.optionChipText,
                          isActive ? styles.optionChipTextActive : null,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={styles.helperText}>{view.sustainabilityHelperText}</Text>
            </View>

            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>
                Let the sous chef learn from chats
              </Text>
              <View style={styles.toggleOptionsRow}>
                {[
                  { label: "Off", value: false },
                  { label: "On", value: true },
                ].map((option) => {
                  const isActive = view.draft.learnFromChats === option.value;

                  return (
                    <Pressable
                      key={option.label}
                      onPress={() => {
                        view.updateDraft({ learnFromChats: option.value });
                      }}
                      style={[
                        styles.optionChip,
                        isActive ? styles.optionChipActive : null,
                      ]}
                    >
                      <Text
                        style={[
                          styles.optionChipText,
                          isActive ? styles.optionChipTextActive : null,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.sectionBlock}>
        <Text style={styles.sectionEyebrow}>Profile</Text>
        <Text style={styles.sectionTitle}>Your cooking context</Text>
        <Text style={styles.sectionCopy}>
          Keep the sous chef useful by teaching it a little about your tastes,
          kitchen, and habits.
        </Text>

        <View
          onLayout={view.handleSectionLayout(view.sectionIds.chefProfile)}
          style={[
            styles.card,
            view.highlightedSectionId === view.sectionIds.chefProfile
              ? styles.cardFocused
              : null,
          ]}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Chef profile</Text>
            <Text style={styles.cardCopy}>
              This is the cooking context Sous Chef uses to personalize imports,
              prompts, and suggestions across the app.
            </Text>
          </View>

          <View style={styles.fieldGroup}>
            <TextField
              label="Your name"
              value={view.profileDraft.name}
              onChangeText={(name) => {
                view.updateProfileDraft({ name });
              }}
              placeholder="What should Sous Chef call you?"
            />

            <TextField
              label="Country"
              value={view.profileDraft.region}
              onChangeText={(region) => {
                view.updateProfileDraft({ region });
              }}
              placeholder="e.g. Denmark"
              helperText="Used as your cooking region for seasonal and local context."
            />

            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Diet</Text>
              <View style={styles.toggleOptionsRow}>
                {view.dietOptions.map((option) => {
                  const isActive = view.selectedDiet === option.value;

                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => {
                        view.handleSelectDiet(option.value);
                      }}
                      style={[
                        styles.optionChip,
                        isActive ? styles.optionChipActive : null,
                      ]}
                    >
                      <Text
                        style={[
                          styles.optionChipText,
                          isActive ? styles.optionChipTextActive : null,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <TextField
              label="Dislikes / ingredients to avoid"
              value={view.profileDraft.dislikedIngredientsText}
              onChangeText={(dislikedIngredientsText) => {
                view.updateProfileDraft({ dislikedIngredientsText });
              }}
              placeholder="e.g. cilantro, liver"
              helperText="Separate items with commas or new lines."
              multiline
              textAlignVertical="top"
              style={styles.textArea}
            />

            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Cooking skill</Text>
              <View style={styles.toggleOptionsRow}>
                {view.skillOptions.map((option) => {
                  const isActive =
                    view.profileDraft.skillLevel === option.value;

                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => {
                        view.updateProfileDraft({
                          skillLevel: option.value,
                        });
                      }}
                      style={[
                        styles.optionChip,
                        isActive ? styles.optionChipActive : null,
                      ]}
                    >
                      <Text
                        style={[
                          styles.optionChipText,
                          isActive ? styles.optionChipTextActive : null,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.actionColumn}>
              <Button
                label="Run intro wizard again"
                variant="secondary"
                onPress={view.handleOpenIntroWizard}
              />
              <Text style={styles.helperText}>
                The intro flow still leads into the broader kitchen setup path.
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.sectionBlock}>
        <Text style={styles.sectionEyebrow}>Pantry</Text>
        <Text style={styles.sectionTitle}>Pantry nudges</Text>
        <Text style={styles.sectionCopy}>
          Control how often the pantry surfaces forgotten items and suggests
          what to cook with them.
        </Text>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Suggestion frequency</Text>
          </View>

          <View style={styles.fieldGroup}>
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Surface pantry ideas</Text>
              <View style={styles.toggleOptionsRow}>
                {view.nudgeFrequencyOptions.map((option) => {
                  const isActive =
                    (view.draft.pantryNudgeFrequency ?? "monthly") ===
                    option.value;

                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => {
                        view.updateDraft({
                          pantryNudgeFrequency: option.value,
                        });
                      }}
                      style={[
                        styles.optionChip,
                        isActive ? styles.optionChipActive : null,
                      ]}
                    >
                      <Text
                        style={[
                          styles.optionChipText,
                          isActive ? styles.optionChipTextActive : null,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={styles.helperText}>
                {view.nudgeFrequencyHelperText}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.sectionBlock}>
        <Text style={styles.sectionEyebrow}>Support</Text>
        <Text style={styles.sectionTitle}>Keep the app understandable</Text>
        <Text style={styles.sectionCopy}>
          Rerun setup, recover defaults, and keep the trust story visible as the
          product grows.
        </Text>

        <View
          onLayout={view.handleSectionLayout(view.sectionIds.support)}
          style={[
            styles.card,
            view.highlightedSectionId === view.sectionIds.support
              ? styles.cardFocused
              : null,
          ]}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Support tools</Text>
            <Text style={styles.cardCopy}>
              These controls are here to keep the app transparent and
              recoverable while we build.
            </Text>
          </View>

          <View style={styles.actionColumn}>
            <Button
              label="Run intro wizard again"
              variant="secondary"
              onPress={view.handleOpenIntroWizard}
            />
            <Button
              label="Reset settings"
              variant="ghost"
              onPress={() => {
                void view.handleReset();
              }}
            />
          </View>
        </View>
      </View>

      {__DEV__ ? (
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionEyebrow}>Debug</Text>
          <Text style={styles.sectionTitle}>Developer tools</Text>
          <Text style={styles.sectionCopy}>
            Only visible in development builds. These settings cannot be enabled
            in production.
          </Text>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Safety</Text>
              <Text style={styles.cardCopy}>
                Skip Layer 1 safety classification to save tokens while testing.
                This toggle is hard-blocked in production builds.
              </Text>
            </View>

            <View style={styles.fieldGroup}>
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>Skip safety Layer 1</Text>
                <View style={styles.toggleOptionsRow}>
                  {[
                    { label: "Off", value: false },
                    { label: "On", value: true },
                  ].map((option) => {
                    const isActive =
                      view.draft.skipSafetyLayer1 === option.value;

                    return (
                      <Pressable
                        key={option.label}
                        onPress={() => {
                          view.updateDraft({ skipSafetyLayer1: option.value });
                        }}
                        style={[
                          styles.optionChip,
                          isActive ? styles.optionChipActive : null,
                        ]}
                      >
                        <Text
                          style={[
                            styles.optionChipText,
                            isActive ? styles.optionChipTextActive : null,
                          ]}
                        >
                          {option.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Diagnostic log</Text>
              <Text style={styles.cardCopy}>
                Exports the in-memory log buffer (last 500 entries). Share it
                as a file or copy it to the clipboard for debugging.
              </Text>
            </View>
            <View style={styles.fieldGroup}>
              <Button
                label="Share log"
                variant="secondary"
                size="sm"
                onPress={() => {
                  void Share.share({
                    title: "Sous Chef diagnostic log",
                    message: exportLogs(),
                  });
                }}
              />
              <Button
                label="Clear log buffer"
                variant="ghost"
                size="sm"
                onPress={clearLogBuffer}
              />
            </View>
          </View>
        </View>
      ) : null}

      <View style={styles.footerActions}>
        <Button
          label="Save"
          onPress={() => {
            void view.handleSave();
          }}
          loading={view.loading}
          disabled={!view.hasChanges}
        />
      </View>
    </ScrollView>
  );
}
