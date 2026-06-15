import { useEffect } from "react";

import type { SuggestionContext } from "@/models/types";
import { useAssistantRouteContextStore } from "@/store/assistantRouteContextStore";

/**
 * Register route-level assistant context for the currently mounted screen.
 * The context is cleared automatically when the screen unmounts.
 *
 * Each module owns the context it builds — pass null while data is loading
 * and the resolved context once it is available.
 */
export function useRegisterAssistantContext(
  context: SuggestionContext | null,
): void {
  const setRouteContext = useAssistantRouteContextStore(
    (s) => s.setRouteContext,
  );

  // Derive a stable string key from the identity fields that actually matter.
  // This avoids re-running the effect on every render due to object reference churn.
  const stableKey = [
    context?.recipeId ?? "",
    context?.pantryItemIds?.join(",") ?? "",
    context?.nudgeId ?? "",
  ].join("|");

  useEffect(() => {
    setRouteContext(context);
    return () => {
      setRouteContext(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stableKey]);
}
