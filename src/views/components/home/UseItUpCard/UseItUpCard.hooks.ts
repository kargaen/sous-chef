import { useEffect, useRef, useState } from "react";

import { useExpiringPantryController } from "@/controllers";
import type { PantryItem } from "@/models/types";
import { relevanceFor, type HomeCardSignal } from "@/utils";
import { getDaysUntilExpiry } from "@/utils/pantry";

export const USE_IT_UP_CARD_ID = "use-it-up";

// How far ahead counts as "use it up soon". Items past this window are handled
// by the Pantry tab's waste flow, not the landing glance card.
const EXPIRY_WINDOW_DAYS = 7;

// Within ~2 days something is actively at stake (hard urgency); further out it
// is a gentle heads-up (soft urgency). Either band out-ranks inspiration, so an
// expiring item always sits above open-ended ideas — the epic guardrail.
const HARD_URGENCY_DAYS = 2;

export interface UseItUpCardViewModel {
  signal: HomeCardSignal;
  items: PantryItem[];
  loading: boolean;
}

export const useUseItUpCard = (): UseItUpCardViewModel => {
  const { loadExpiring, expiring, loading } = useExpiringPantryController();
  const loadRef = useRef(loadExpiring);
  loadRef.current = loadExpiring;

  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    void loadRef.current(EXPIRY_WINDOW_DAYS).finally(() => setHasLoaded(true));
  }, []);

  // The soonest item drives urgency: due today → top of its band, a week out →
  // the floor. Nothing expiring → the card hides and the page self-prunes.
  const soonestDays = expiring.length
    ? getDaysUntilExpiry(expiring[0].expiryDate)
    : null;

  const band = soonestDays !== null && soonestDays <= HARD_URGENCY_DAYS
    ? "hardUrgency"
    : "softUrgency";

  const intensity = soonestDays === null
    ? 0
    : Math.min(1, Math.max(0, (EXPIRY_WINDOW_DAYS - soonestDays) / EXPIRY_WINDOW_DAYS));

  const signal: HomeCardSignal = {
    id: USE_IT_UP_CARD_ID,
    relevance: expiring.length > 0 ? relevanceFor(band, intensity) : 0,
    visible: hasLoaded && expiring.length > 0,
  };

  return { signal, items: expiring, loading: loading || !hasLoaded };
};
