import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { Stack, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { KeyboardAvoidingView, KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { colors, spacing, typography } from "@/constants";
import { SettingsRepository } from "@/models/repositories";
import { BackupService } from "@/services/BackupService";
import { StorageService, SupabaseService } from "@/services";
import { useAuthStore } from "@/store/authStore";
import { useSettingsStore } from "@/store";
import { createLogger } from "@/utils/logger";
import { AssistantShell } from "@/views/components/assistant/AssistantShell";
import { SousChefCompanionHost } from "@/views/components/companion";

const ROOT_KEEP_AWAKE_TAG = "root-layout-keep-screen-on";
const log = createLogger("RootLayout");

// The chat launcher (AssistantShell) floats above the bottom of every screen.
// On Stack screens there is no tab bar to sit beside, so reserve a clear strip
// at the bottom of each scene to scroll content past it. The (tabs) screen
// overrides this to 0 because the tab bar already owns that space.
const LAUNCHER_BOTTOM_CLEARANCE = 88;

export default function RootLayout() {
  const [dbReady, setDbReady] = useState(false);
  const segments = useSegments();
  const settings = useSettingsStore((state) => state.settings);
  const setSettings = useSettingsStore((state) => state.setSettings);

  // Onboarding runs in its own clean shell — the floating chat launcher belongs
  // to the standard app, not the intro flow.
  const inOnboarding = segments[0] === "(onboarding)";

  useEffect(() => {
    let mounted = true;
    const settingsRepository = new SettingsRepository();

    void (async () => {
      // Dev-only DB reset switch: set EXPO_PUBLIC_RESET_DB=1 in .env, reload the
      // app once to wipe + recreate every table, then remove the flag. Gated on
      // __DEV__ so a production build can never wipe a user's data.
      if (__DEV__ && process.env.EXPO_PUBLIC_RESET_DB === "1") {
        StorageService.resetDatabase();
      }

      StorageService.initializeDatabase();
      const loadedSettings = await settingsRepository.get();

      if (mounted) {
        setSettings(loadedSettings);
        setDbReady(true);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [setSettings]);

  useEffect(() => {
    if (!dbReady) {
      return;
    }

    let active = true;
    let subscription: ReturnType<typeof SupabaseService.onAuthStateChange> | null = null;

    void (async () => {
      try {
        subscription = SupabaseService.onAuthStateChange((session) => {
          if (active) {
            useAuthStore.getState().setSession(session);
          }
        });

        const session = await SupabaseService.getSession();

        if (!active) {
          return;
        }

        useAuthStore.getState().setSession(session);

        if (session) {
          try {
            await BackupService.restoreFromRemote();
            const syncedSettings = await new SettingsRepository().get();

            if (active) {
              setSettings(syncedSettings);
            }
          } catch (error) {
            log.info("Startup database sync skipped", error);
          }
        }
      } catch (error) {
        log.info("Session restore skipped", error);
      }
    })();

    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, [dbReady, setSettings]);

  useEffect(() => {
    if (!settings) {
      return;
    }

    if (settings.keepScreenOn) {
      void activateKeepAwakeAsync(ROOT_KEEP_AWAKE_TAG);
      return;
    }

    void deactivateKeepAwake(ROOT_KEEP_AWAKE_TAG);
  }, [settings]);

  if (!dbReady) {
    return <SplashScreen />;
  }

  const screens = (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: colors.background.app,
            paddingBottom: LAUNCHER_BOTTOM_CLEARANCE,
          },
        }}
      >
        <Stack.Screen
          name="(tabs)"
          options={{
            contentStyle: { backgroundColor: colors.background.app, paddingBottom: 0 },
          }}
        />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="shopping-list" />
        <Stack.Screen name="chef-profile" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="recipe/[id]" />
        <Stack.Screen name="recipe/adapt" />
        <Stack.Screen name="recipe/reflect" />
        <Stack.Screen name="recipe/edit" />
      </Stack>
      {!inOnboarding ? <AssistantShell /> : null}
      <SousChefCompanionHost />
    </>
  );

  return (
    <SafeAreaProvider>
      <KeyboardProvider>
        <KeyboardAvoidingView behavior="padding" style={styles.appShell}>
          {screens}
        </KeyboardAvoidingView>
      </KeyboardProvider>
    </SafeAreaProvider>
  );
}

function SplashScreen() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="small" color={colors.brand.terracotta} />
      <Text style={styles.label}>Preparing the kitchen…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  appShell: {
    flex: 1,
  },

  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    backgroundColor: colors.background.app,
  },

  label: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.text.secondary,
  },
});
