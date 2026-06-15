// The shared, TTL-expiring inspiration store (Discover epic D.0). An
// inspiration is minted ad-hoc by any surface, persisted, and reused
// everywhere until it expires or the user acts on it (consumes it).

export type InspirationKind =
  | "spark"
  | "produce"
  | "theme"
  | "week_plan"
  | "leftover"
  | "nudge";

export interface InspirationPayload {
  /** Seed prompt handed to the recipe creator when the user acts on this item. */
  seedPrompt?: string;
  /** Optional route to navigate to when acted upon (e.g. a tab or screen). */
  route?: string;
  /** Free-form context the producing surface attached (ingredient, recipe id, month…). */
  context?: Record<string, unknown>;
}

export interface Inspiration {
  id: string;
  kind: InspirationKind;
  /** Short headline shown on the card/lane. */
  title: string;
  /** One-line enticing hook. */
  hook: string;
  /** What an acting tap should do (seed the creator, route, carry context). */
  payload: InspirationPayload;
  /** Which surface/producer minted it (e.g. "discover", "leftover-loop"). */
  source: string;
  /** Stable key used to reuse a live item instead of minting a duplicate. */
  dedupeKey: string;
  /** Optional ranking weight when several live items compete for one slot. */
  relevance?: number;
  /** ISO timestamp when the item was minted. */
  createdAt: string;
  /** ISO timestamp after which the item is stale and swept. */
  expiresAt: string;
  /** ISO timestamp set when the user acts on the item; consumed items are hidden and swept. */
  consumedAt?: string;
}
