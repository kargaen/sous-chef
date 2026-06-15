import { Text } from "react-native";

import { useAssistantExternalPromptStore } from "@/store";

import { HomeCard } from "../HomeCard";
import type { InSeasonCardViewModel } from "./InSeasonCard.hooks";
import { styles } from "./InSeasonCard.styles";

const MAX_PICKS = 3;

export interface InSeasonCardProps {
  vm: InSeasonCardViewModel;
  /** Optional LLM garnish (LP.0c). */
  hint?: string;
}

export function InSeasonCard({ vm, hint }: InSeasonCardProps) {
  const setPendingPrompt = useAssistantExternalPromptStore(
    (state) => state.setPendingPrompt,
  );
  const { produce, monthLabel, loading } = vm;

  if (loading) {
    return <HomeCard eyebrow="In season" title="Fresh this month" loading />;
  }

  // Nothing in season (or no data for this region) — the card disappears.
  if (produce.length === 0) {
    return null;
  }

  const names = produce.slice(0, MAX_PICKS).map((item) => item.name);
  const verb = names.length === 1 ? "is" : "are";

  // Opens the global assistant with a seasonal question — a real, working
  // destination instead of the not-yet-built Discover tab.
  const askSousChef = () =>
    setPendingPrompt({
      question: `What can I cook with what's in season right now${
        names.length ? ` — like ${names.join(", ")}?` : "?"
      }`,
      context: null,
    });

  return (
    <HomeCard
      eyebrow="In season"
      title={`Fresh in ${monthLabel}`}
      hint={hint}
      actionLabel="Ask Sous Chef"
      onAction={askSousChef}
    >
      <Text style={styles.body}>
        <Text style={styles.pick}>{names.join(", ")}</Text>
        {` ${verb} at their best right now — worth building a meal around.`}
      </Text>
    </HomeCard>
  );
}
