import { useEffect, useRef, useState } from "react";

import type { HomeEnrichmentCard } from "@/prompts/homeEnrichment";
import { HomeEnrichmentService } from "@/services";
import { getDailySeed, rankHomeCards } from "@/utils";

import {
  COOK_OR_CREATE_CARD_ID,
  useCookOrCreateCard,
  type CookOrCreateCardViewModel,
} from "./CookOrCreateCard";
import {
  IN_SEASON_CARD_ID,
  useInSeasonCard,
  type InSeasonCardViewModel,
} from "./InSeasonCard";
import {
  USE_IT_UP_CARD_ID,
  useUseItUpCard,
  type UseItUpCardViewModel,
} from "./UseItUpCard";
import {
  TODAYS_MENU_CARD_ID,
  useTodaysMenuCard,
  type TodaysMenuCardViewModel,
} from "./TodaysMenuCard";

export interface HomeFeedViewModel {
  cookOrCreate: CookOrCreateCardViewModel;
  inSeason: InSeasonCardViewModel;
  useItUp: UseItUpCardViewModel;
  todaysMenu: TodaysMenuCardViewModel;
  /** Card ids in render order, already filtered to visible and capped. */
  order: string[];
  /** True until every glance card has resolved — drives the skeleton swap. */
  loading: boolean;
  /** Optional LLM garnish per card id (LP.0c). Arrives after first paint. */
  hints: Record<string, string>;
}

/**
 * Composition controller for the landing feed. Calls each card's hook in a
 * fixed order (rules-of-hooks safe), ranks their signals with the daily seed,
 * then fires a single batched, failure-silent enrichment call over the ranked
 * cards. Enrichment never changes order or visibility — it only adds garnish.
 */
export const useHomeFeed = (): HomeFeedViewModel => {
  const inSeason = useInSeasonCard();
  const cookOrCreate = useCookOrCreateCard(inSeason.produce);
  const useItUp = useUseItUpCard();
  const todaysMenu = useTodaysMenuCard();

  const order = rankHomeCards(
    [cookOrCreate.signal, inSeason.signal, useItUp.signal, todaysMenu.signal],
    { seed: getDailySeed() },
  );

  // The feed shows skeletons until every glance card has resolved, so the real
  // cards swap in together (top-to-bottom, no reflow) rather than popping in
  // one at a time as each load finishes.
  const loading =
    cookOrCreate.loading ||
    inSeason.loading ||
    useItUp.loading ||
    todaysMenu.loading;

  // Summarise what each ranked card is currently showing, so the garnish call
  // can speak to real content rather than generic card names.
  const summarise = (id: string): HomeEnrichmentCard | null => {
    switch (id) {
      case COOK_OR_CREATE_CARD_ID:
        return {
          id,
          label: "Cook or create",
          detail: cookOrCreate.recipe
            ? `Suggested recipe: ${cookOrCreate.recipe.title}`
            : "No saved recipe yet — inviting them to create one",
        };
      case IN_SEASON_CARD_ID:
        return {
          id,
          label: "In season",
          detail: `In season now: ${inSeason.produce
            .slice(0, 4)
            .map((item) => item.name)
            .join(", ")}`,
        };
      case USE_IT_UP_CARD_ID:
        return {
          id,
          label: "Use it up",
          detail: `Expiring soon: ${useItUp.items
            .slice(0, 4)
            .map((item) => item.name)
            .join(", ")}`,
        };
      case TODAYS_MENU_CARD_ID:
        return {
          id,
          label: "Today's menu",
          detail: todaysMenu.items.length
            ? `Planned today: ${todaysMenu.items
                .map((item) => item.title)
                .join(", ")}`
            : "Nothing planned today",
        };
      default:
        return null;
    }
  };

  const enrichmentCards = order
    .map(summarise)
    .filter((card): card is HomeEnrichmentCard => card !== null);

  const [hints, setHints] = useState<Record<string, string>>({});

  // Stable trigger: only re-enrich when the set or its content actually changes.
  // The cards themselves are read through a ref so they stay out of the deps.
  const signature = enrichmentCards
    .map((card) => `${card.id}:${card.detail}`)
    .join("|");
  const cardsRef = useRef(enrichmentCards);
  cardsRef.current = enrichmentCards;
  const requestedRef = useRef<string>("");

  useEffect(() => {
    if (cardsRef.current.length === 0) return;
    if (requestedRef.current === signature) return;
    requestedRef.current = signature;

    let cancelled = false;
    void HomeEnrichmentService.enrich(cardsRef.current).then((result) => {
      if (!cancelled) setHints(result);
    });
    return () => {
      cancelled = true;
    };
  }, [signature]);

  return { cookOrCreate, inSeason, useItUp, todaysMenu, order, loading, hints };
};
