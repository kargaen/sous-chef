import { useRouter, type Href } from "expo-router";
import { useCallback } from "react";

// expo-router's router.back() throws "The action 'GO_BACK' was not handled"
// when the current screen is the first entry in the stack — e.g. opened via a
// deep link, or after a router.replace() wiped the history. This always lands
// somewhere sensible instead of crashing or silently doing nothing.
const HOME_FALLBACK = "/(tabs)" as Href;

export const useSafeBack = (fallback: Href = HOME_FALLBACK) => {
  const router = useRouter();

  return useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(fallback);
    }
  }, [router, fallback]);
};
