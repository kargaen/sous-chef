import { useRouter } from "expo-router";

import { useSettingsController } from "@/controllers";

import { PlaceholderScreen } from "../_PlaceholderScreen";

export default function KitchenSetupScreen() {
  const router = useRouter();
  const { updateField } = useSettingsController();

  // Last wizard step: persist the completion flag so the first-run gate
  // (app/index.tsx) sends future launches straight to the app, then enter it.
  const finish = async () => {
    await updateField({ onboardingCompleted: true });
    router.replace("/(tabs)");
  };

  return (
    <PlaceholderScreen
      title="Kitchen Setup"
      description="Equipment, storage zones, pantry baseline, fridge items, and cooking constraints will be captured here."
      action={{
        label: "Finish",
        onPress: () => {
          void finish();
        },
      }}
    />
  );
}
