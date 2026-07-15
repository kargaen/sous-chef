import { Redirect } from "expo-router";

import { useSettingsStore } from "@/store";

export default function IndexRoute() {
  const settings = useSettingsStore((state) => state.settings);
  const hasLoaded = useSettingsStore((state) => state.hasLoaded);

  // RootLayout gates rendering on dbReady and loads settings first, so this is
  // normally already true; the guard just avoids a wrong redirect on the very
  // first frame if the store hasn't hydrated yet.
  if (!hasLoaded) {
    return null;
  }

  return (
    <Redirect
      href={settings?.onboardingCompleted ? "/(tabs)" : "/(onboarding)/welcome"}
    />
  );
}
