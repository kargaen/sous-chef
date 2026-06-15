import { useRouter } from "expo-router";
import { forwardRef, useEffect, useImperativeHandle } from "react";
import { View } from "react-native";

import { useDiscoverController } from "@/controllers";
import type { DiscoverThemeViewModel } from "@/controllers";
import { useAssistantExternalPromptStore } from "@/store";
import { Skeleton, Spinner } from "@/views/components/ui";

import {
  CreateCard,
  DiscoverSection,
  LeftoverCard,
  NudgeBanner,
  ProduceStrip,
  SparkCard,
  ThemeRow,
} from "../DiscoverLanes";
import { GenerationZone } from "../GenerationZone";
import { styles } from "./DiscoverFeed.styles";

const MAX_PRODUCE_CHIPS = 6;

/**
 * Imperative surface the owning screen can drive. The pull-to-load gesture
 * (epic G.2) lives on Home's ScrollView, but the action lives here with the
 * controller — so Home triggers it through this handle on overscroll-release.
 */
export interface DiscoverFeedHandle {
  generateRandom: () => void;
}

/**
 * The Discover inspiration feed, embedded in the Home surface. Self-contained:
 * it owns the discover controller, loads the lanes on mount, and wires each
 * lane's tap. Renders the lanes only — the owning screen provides page chrome.
 */
export const DiscoverFeed = forwardRef<DiscoverFeedHandle>(function DiscoverFeed(
  _props,
  ref,
) {
  const router = useRouter();
  const {
    loadDiscover,
    refreshSparks,
    generateMore,
    consume,
    dismiss,
    produce,
    sparks,
    sparksRefreshing,
    themes,
    leftover,
    nudgeItems,
    generatedCards,
    generating,
    discoverLoading,
  } = useDiscoverController();
  const setPendingPrompt = useAssistantExternalPromptStore(
    (state) => state.setPendingPrompt,
  );

  useEffect(() => {
    void loadDiscover();
  }, [loadDiscover]);

  // Home's pull-to-load gesture (G.2) reaches the generation action through here.
  useImperativeHandle(
    ref,
    () => ({
      generateRandom: () => void generateMore("random", ""),
    }),
    [generateMore],
  );

  const seedCreator = (seed: string) =>
    router.push({ pathname: "/recipes/new" as const, params: { seed } });

  const onSpark = (id: string, seed: string) => {
    consume(id);
    seedCreator(seed);
  };

  const onTheme = (theme: DiscoverThemeViewModel) => seedCreator(theme.seedPrompt);

  const onProduce = (name: string) => seedCreator(`A recipe featuring ${name}`);

  const onLeftover = () => {
    if (!leftover) return;
    consume(leftover.id);
    seedCreator(leftover.seedPrompt);
  };

  const onNudge = () => {
    const nudge = nudgeItems[0];
    if (!nudge) return;
    setPendingPrompt({ question: nudge.body, context: null });
  };

  const produceNames = produce.slice(0, MAX_PRODUCE_CHIPS).map((p) => p.name);
  const nudge = nudgeItems[0] ?? null;
  const isEmpty =
    sparks.length === 0 && themes.length === 0 && produceNames.length === 0;

  return (
    <View style={styles.feed}>
      {discoverLoading && isEmpty ? (
        <View style={styles.loadingSection}>
          <Skeleton style={styles.loadingTitle} />
          <Skeleton style={styles.loadingCard} />
          <Skeleton style={styles.loadingCard} />
        </View>
      ) : null}

      {sparks.length > 0 || produceNames.length > 0 ? (
        <DiscoverSection
          eyebrow="Fresh today"
          title="Cook something good"
          actionLabel={sparks.length > 0 ? "Show me more" : undefined}
          onAction={sparks.length > 0 ? () => void refreshSparks() : undefined}
        >
          <View style={styles.leadStack}>
            {sparks.map((spark, index) => (
              <View key={spark.id} style={styles.leadStack}>
                <SparkCard
                  spark={spark}
                  onPress={() => onSpark(spark.id, spark.seedPrompt)}
                  onDismiss={() => dismiss(spark.id)}
                />
                {index === 0 && produceNames.length > 0 ? (
                  <ProduceStrip names={produceNames} onPick={onProduce} />
                ) : null}
              </View>
            ))}

            {sparks.length === 0 && produceNames.length > 0 ? (
              <ProduceStrip names={produceNames} onPick={onProduce} />
            ) : null}

            {sparksRefreshing ? <Spinner /> : null}
          </View>
        </DiscoverSection>
      ) : null}

      {themes.length > 0 ? (
        <DiscoverSection eyebrow="Browse by mood" title="Themes for the season">
          <ThemeRow themes={themes} onPick={onTheme} />
        </DiscoverSection>
      ) : null}

      {leftover ? (
        <DiscoverSection
          eyebrow="From your kitchen"
          title="Don't let it go to waste"
        >
          <LeftoverCard leftover={leftover} onPress={onLeftover} />
        </DiscoverSection>
      ) : null}

      {nudge ? (
        <DiscoverSection eyebrow="A little nudge" title="Worth a thought">
          <NudgeBanner nudge={nudge} onPress={onNudge} />
        </DiscoverSection>
      ) : null}

      <DiscoverSection eyebrow="Make it yours" title="Create a recipe">
        <CreateCard
          onPress={() => router.push({ pathname: "/recipes/new" as const })}
        />
      </DiscoverSection>

      {generatedCards.length > 0 ? (
        <DiscoverSection eyebrow="Made for you" title="Fresh ideas">
          <View style={styles.leadStack}>
            {generatedCards.map((card) => (
              <SparkCard
                key={card.id}
                spark={card}
                onPress={() => onSpark(card.id, card.seedPrompt)}
                onDismiss={() => dismiss(card.id)}
              />
            ))}
          </View>
        </DiscoverSection>
      ) : null}

      <GenerationZone
        themes={themes}
        generating={generating}
        onTheme={(theme) => void generateMore("theme", theme.title)}
        onSurprise={() => void generateMore("random", "")}
        onSubmitText={(value) => void generateMore("freeText", value)}
      />
    </View>
  );
});
