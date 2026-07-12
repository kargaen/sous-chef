import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, radius, spacing, typography } from "@/constants";
import {
  RESEND_GRACE_MS,
  useAuthController,
} from "@/controllers/useAuthController";
import { Button, TextField } from "@/views/components/ui";
import { screenStyles, textStyles } from "@/views/styles";

type AuthMode = "signIn" | "signUp";

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const ctrl = useAuthController();
  const [mode, setMode] = useState<AuthMode>("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Ticks while a confirmation is pending so the resend button re-enables
  // when the grace period lapses without any user interaction.
  const [now, setNow] = useState(() => Date.now());

  const pendingSignup = ctrl.pendingSignup;

  useEffect(() => {
    if (!pendingSignup) {
      return;
    }

    const interval = setInterval(() => {
      setNow(Date.now());
    }, 30_000);

    return () => {
      clearInterval(interval);
    };
  }, [pendingSignup]);

  const canResend =
    pendingSignup !== null &&
    now - new Date(pendingSignup.lastSentAt).getTime() >= RESEND_GRACE_MS;

  const handleSubmit = () => {
    if (mode === "signIn") {
      void ctrl.signIn(email, password);
    } else {
      void ctrl.signUp(email, password);
    }
  };

  if (ctrl.status === "authenticated") {
    return (
      <View
        style={[
          screenStyles.screen,
          styles.centered,
          { paddingTop: insets.top + spacing.xl },
        ]}
      >
        <Text style={textStyles.screenTitleCompact}>You&apos;re signed in</Text>
        <Text style={textStyles.emptyText}>
          {ctrl.user?.email ?? "Account connected."}
        </Text>
        <Button
          label="Sign out"
          variant="secondary"
          onPress={() => {
            void ctrl.signOut();
          }}
          loading={ctrl.loading}
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={screenStyles.screen}
      contentContainerStyle={[
        screenStyles.scrollContent,
        {
          paddingTop: insets.top + spacing.md,
          paddingBottom: insets.bottom + spacing.xl,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={screenStyles.header}>
        <Text style={textStyles.eyebrow}>Sous Chef</Text>
        <Text style={textStyles.screenTitleCompact}>
          {mode === "signIn" ? "Sign in" : "Create an account"}
        </Text>
        <Text style={textStyles.description}>
          An account keeps your pantry, recipes, and plans recoverable if this
          device is lost or wiped.
        </Text>
      </View>

      {ctrl.error ? <Text style={textStyles.errorText}>{ctrl.error}</Text> : null}

      {pendingSignup ? (
        <View style={styles.noticeCard}>
          <Text style={styles.noticeText}>
            Account created — confirm via the mail sent to{" "}
            {pendingSignup.email}, then sign in here.
          </Text>
          <Button
            label="Resend confirmation mail"
            variant="ghost"
            size="sm"
            onPress={() => {
              void ctrl.resendConfirmation();
            }}
            disabled={!canResend}
            loading={ctrl.loading}
          />
          {!canResend ? (
            <Text style={styles.noticeText}>
              A mail was sent recently — resend unlocks in a few minutes.
            </Text>
          ) : null}
        </View>
      ) : null}

      <View style={styles.fieldGroup}>
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
        />

        <TextField
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="At least 6 characters"
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <View style={styles.actionColumn}>
        <Button
          label={mode === "signIn" ? "Sign in" : "Create account"}
          onPress={handleSubmit}
          loading={ctrl.loading}
          disabled={!email || !password}
        />
        <Button
          label={
            mode === "signIn"
              ? "New here? Create an account"
              : "Already have an account? Sign in"
          }
          variant="ghost"
          onPress={() => {
            setMode(mode === "signIn" ? "signUp" : "signIn");
          }}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },

  fieldGroup: {
    gap: spacing.md,
  },

  noticeCard: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.background.card,
    gap: spacing.sm,
  },

  noticeText: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.text.secondary,
  },

  actionColumn: {
    gap: spacing.sm,
  },
});
