import { useRouter } from "expo-router";
import { Text } from "react-native";

import { HomeCard } from "../HomeCard";
import type { CookOrCreateCardViewModel } from "./CookOrCreateCard.hooks";
import { styles } from "./CookOrCreateCard.styles";

export interface CookOrCreateCardProps {
  vm: CookOrCreateCardViewModel;
  /** Optional LLM garnish (LP.0c). */
  hint?: string;
}

export function CookOrCreateCard({ vm, hint }: CookOrCreateCardProps) {
  const router = useRouter();
  const { recipe, loading, isSeasonal } = vm;

  const openCreator = () => router.push({ pathname: "/recipes/new" });

  if (loading) {
    return <HomeCard eyebrow="Tonight" title="Cook or create" loading />;
  }

  if (!recipe) {
    return (
      <HomeCard
        eyebrow="Start here"
        title="Bring a recipe into your book"
        hint={hint}
        actionLabel="Create a recipe"
        actionVariant="primary"
        onAction={openCreator}
      >
        <Text style={styles.meta}>
          Import from a link, riff on an idea, or write your own — Sous Chef
          helps you shape it.
        </Text>
      </HomeCard>
    );
  }

  const totalMinutes = recipe.prepMinutes + recipe.cookMinutes;

  return (
    <HomeCard
      eyebrow={isSeasonal ? "In season tonight" : "Tonight"}
      title={isSeasonal ? "A recipe that fits the season" : "Cook something you love"}
      hint={hint}
      actionLabel="View recipe"
      actionVariant="primary"
      onAction={() =>
        router.push({ pathname: "/recipe/[id]", params: { id: recipe.id } })
      }
      secondaryActionLabel="Create a recipe"
      onSecondaryAction={openCreator}
    >
      <Text style={styles.suggestionTitle}>{recipe.title}</Text>
      <Text style={styles.meta}>
        {totalMinutes} min · {recipe.servings} servings
        {isSeasonal ? " · uses what's in season" : ""}
      </Text>
    </HomeCard>
  );
}
