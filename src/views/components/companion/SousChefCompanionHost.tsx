import { useRouter, type Href } from "expo-router";

import { useSousChefCompanionStore } from "@/store";

import { SousChefCompanion } from "./SousChefCompanion";

/**
 * Mounts the Sous Chef companion overlay and binds it to the companion store.
 * Without this, `showCompanion(...)` calls set state that nothing renders — so
 * guidance and error messages are silently dropped. Mounted once at the app
 * root; only the "message" mode renders here (chat mode is the AssistantShell).
 */
export function SousChefCompanionHost() {
  const router = useRouter();
  const visible = useSousChefCompanionStore((state) => state.visible);
  const mode = useSousChefCompanionStore((state) => state.mode);
  const tone = useSousChefCompanionStore((state) => state.tone);
  const message = useSousChefCompanionStore((state) => state.message);
  const action = useSousChefCompanionStore((state) => state.action);
  const hideCompanion = useSousChefCompanionStore(
    (state) => state.hideCompanion,
  );

  const onAction = action
    ? () => {
        hideCompanion();
        router.push(action.route as Href);
      }
    : undefined;

  return (
    <SousChefCompanion
      visible={visible && mode === "message"}
      tone={tone}
      message={message}
      actionLabel={action?.label}
      onAction={onAction}
      onDismiss={hideCompanion}
    />
  );
}
