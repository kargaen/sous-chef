import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, spacing } from "@/constants";
import { Button } from "@/views/components/ui";

import AuthScreen from "../AuthScreen";

// The sign-up step reuses the standalone AuthScreen and wraps it in a wizard
// footer. Both Skip and Continue advance to the next step immediately — an
// account is optional and email confirmation is never awaited (EPIC-006).
export default function SignUpStepScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const goNext = () => {
    router.push("/(onboarding)/taste-profile");
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <AuthScreen />
      </View>
      <View
        style={[
          styles.footer,
          { paddingBottom: insets.bottom + spacing.md },
        ]}
      >
        <Button label="Skip for now" variant="ghost" onPress={goNext} />
        <Button label="Continue" onPress={goNext} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.app,
  },

  content: {
    flex: 1,
  },

  footer: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
});
