// Relevance bands (epic guardrail). Every card's 0–1 relevance must fall in the
// band that matches its urgency, so rank order and visual tone never disagree —
// an expiring-food card always out-ranks open-ended inspiration, by score and
// not just by where it happens to be placed.
//
// The bands pair with (but stay independent of) the card's visual `HomeCardTone`:
//   hardUrgency / softUrgency → "urgent" tone, inspiration → "default"/"invite".
// Ranking lives here; the tone is a view decision. They correlate, never couple.

export const RELEVANCE_BANDS = {
  /** Open-ended inspiration — sparks, themes, "create something new". */
  inspiration: { min: 0, max: 0.6 },
  /** Soft urgency — gentle, time-aware nudges (leftover loop, end-of-week plan). */
  softUrgency: { min: 0.65, max: 0.79 },
  /** Hard urgency — something is actively at stake (food about to spoil). */
  hardUrgency: { min: 0.8, max: 1 },
} as const;

export type RelevanceBand = keyof typeof RELEVANCE_BANDS;

// Place a raw 0–1 intensity inside a band. Lets a card say "hard-urgency at 70%"
// without ever leaking past the band's edges and crossing into another tier.
export const relevanceFor = (
  band: RelevanceBand,
  intensity: number = 0.5,
): number => {
  const { min, max } = RELEVANCE_BANDS[band];
  const clamped = Math.min(1, Math.max(0, intensity));
  return min + (max - min) * clamped;
};
