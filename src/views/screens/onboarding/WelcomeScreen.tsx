import { useRouter } from "expo-router";

import { PlaceholderScreen } from "../_PlaceholderScreen";

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <PlaceholderScreen
      title="Welcome"
      description="Brand introduction, product promise, and onboarding entry point will live here."
      action={{
        label: "Get started",
        onPress: () => router.push("/(onboarding)/sign-up"),
      }}
    />
  );
}
