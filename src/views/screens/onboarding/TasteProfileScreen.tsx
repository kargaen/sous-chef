import { useRouter } from "expo-router";

import { PlaceholderScreen } from "../_PlaceholderScreen";

export default function TasteProfileScreen() {
  const router = useRouter();

  return (
    <PlaceholderScreen
      title="Taste Profile"
      description="Dietary needs, dislikes, preferred cuisines, budget sensitivity, and skill level will be captured here."
      action={{
        label: "Continue",
        onPress: () => router.push("/(onboarding)/kitchen-setup"),
      }}
    />
  );
}
