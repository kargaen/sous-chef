import { useRouter } from "expo-router";
import { Text } from "react-native";

import { getDaysUntilExpiry } from "@/utils/pantry";

import { HomeCard } from "../HomeCard";
import type { UseItUpCardViewModel } from "./UseItUpCard.hooks";
import { styles } from "./UseItUpCard.styles";

const MAX_NAMES = 3;

const dueText = (days: number | null): string => {
  if (days === null) return "soon";
  if (days <= 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
};

export interface UseItUpCardProps {
  vm: UseItUpCardViewModel;
  /** Optional LLM garnish (LP.0c). */
  hint?: string;
}

export function UseItUpCard({ vm, hint }: UseItUpCardProps) {
  const router = useRouter();
  const { items, loading } = vm;

  if (loading) {
    return (
      <HomeCard eyebrow="Use it up" title="Before it's gone" tone="urgent" loading />
    );
  }

  // Nothing nearing its date — the card disappears and the page self-prunes.
  if (items.length === 0) {
    return null;
  }

  const names = items.slice(0, MAX_NAMES).map((item) => item.name);
  const verb = names.length === 1 ? "is" : "are";
  const due = dueText(getDaysUntilExpiry(items[0].expiryDate));

  return (
    <HomeCard
      eyebrow="Use it up"
      title="Cook before it's gone"
      tone="urgent"
      hint={hint}
      actionLabel="Review pantry"
      onAction={() => router.push({ pathname: "/pantry" })}
    >
      <Text style={styles.body}>
        <Text style={styles.pick}>{names.join(", ")}</Text>
        {` ${verb} nearing the end — the soonest is due ${due}.`}
      </Text>
    </HomeCard>
  );
}
