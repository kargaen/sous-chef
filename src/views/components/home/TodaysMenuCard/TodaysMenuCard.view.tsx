import { useRouter } from "expo-router";
import { Text, View } from "react-native";

import { HomeCard } from "../HomeCard";
import type { TodaysMenuCardViewModel } from "./TodaysMenuCard.hooks";
import { styles } from "./TodaysMenuCard.styles";

export interface TodaysMenuCardProps {
  vm: TodaysMenuCardViewModel;
  /** Optional LLM garnish (LP.0c). */
  hint?: string;
}

export function TodaysMenuCard({ vm, hint }: TodaysMenuCardProps) {
  const router = useRouter();
  const { items, loading } = vm;

  if (loading) {
    return <HomeCard eyebrow="Today's menu" title="What's on today" loading />;
  }

  const openPlan = () => router.push({ pathname: "/plan" });

  // Plan-empty variant — a gentle invite to plan the day.
  if (items.length === 0) {
    return (
      <HomeCard
        eyebrow="Today's menu"
        title="Nothing planned yet"
        tone="invite"
        hint={hint}
        actionLabel="Plan your week"
        onAction={openPlan}
      >
        <Text style={styles.empty}>
          Map out a few meals and they&apos;ll show up here when the day comes.
        </Text>
      </HomeCard>
    );
  }

  return (
    <HomeCard
      eyebrow="Today's menu"
      title="On the menu today"
      hint={hint}
      actionLabel="Open plan"
      onAction={openPlan}
    >
      <View style={styles.list}>
        {items.map((item) => (
          <View key={`${item.type}:${item.title}`} style={styles.row}>
            <Text style={styles.slot}>{item.type}</Text>
            <Text style={styles.title}>{item.title}</Text>
          </View>
        ))}
      </View>
    </HomeCard>
  );
}
