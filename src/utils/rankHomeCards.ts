// Generic ranking for landing-page cards. Pure and deterministic: given the
// same signals and seed it always returns the same order. Each card's
// controller owns its own relevance score; this helper never knows why a
// score is high — it only filters, orders, and caps.

export interface HomeCardSignal {
  /** Stable identifier the Home composition maps back to a card element. */
  id: string;
  /** 0–1 priority computed from the card's own domain data. */
  relevance: number;
  /** When false the card is removed entirely (e.g. nothing worth showing). */
  visible: boolean;
}

export interface RankHomeCardsOptions {
  /** Maximum number of cards to show so the page never becomes a wall. */
  max?: number;
  /**
   * Daily freshness seed (LP.0b). Only affects tie-breaking between cards of
   * near-equal relevance, so the order feels fresh day to day without letting
   * a clearly more urgent card be demoted.
   */
  seed?: number;
}

// Cards whose relevance differs by less than this are treated as a tie and
// ordered by the seed instead, so equally-urgent cards rotate.
const TIE_EPSILON = 0.05;

const DEFAULT_MAX = 4;

// Deterministic FNV-1a hash mapped to [0, 1). Used only for tie-break jitter.
const hashToUnit = (value: string): number => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 100000) / 100000;
};

/**
 * Filter hidden cards, order by relevance (seed-shuffled within ties), and cap
 * the count. Returns the ordered ids of the cards that should render.
 */
export const rankHomeCards = (
  signals: HomeCardSignal[],
  options: RankHomeCardsOptions = {},
): string[] => {
  const { max = DEFAULT_MAX, seed = 0 } = options;

  return [...signals]
    .filter((signal) => signal.visible)
    .sort((a, b) => {
      if (Math.abs(a.relevance - b.relevance) >= TIE_EPSILON) {
        return b.relevance - a.relevance;
      }
      return hashToUnit(`${a.id}:${seed}`) - hashToUnit(`${b.id}:${seed}`);
    })
    .slice(0, Math.max(0, max))
    .map((signal) => signal.id);
};
