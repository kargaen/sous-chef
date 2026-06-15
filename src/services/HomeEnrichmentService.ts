import {
  HOME_ENRICHMENT_SYSTEM_PROMPT,
  buildHomeEnrichmentUserMessage,
  parseHomeEnrichment,
  type HomeEnrichmentCard,
} from "../prompts/homeEnrichment";
import { LLMService } from "./LLMService";

// Session cache keyed by the card set + their content, so repeated Home mounts
// in a session never re-spend the call while the cards say the same thing.
const cache = new Map<string, Record<string, string>>();

const signatureFor = (cards: HomeEnrichmentCard[]): string =>
  cards.map((card) => `${card.id}:${card.detail}`).join("|");

/**
 * Home card enrichment (LP.0c). One batched, failure-silent garnish call over
 * the already-ranked cards: returns a hint per card id, or {} on any failure.
 * Order and visibility are decided upstream; this only adds optional garnish.
 */
export const HomeEnrichmentService = {
  enrich: async (
    cards: HomeEnrichmentCard[],
  ): Promise<Record<string, string>> => {
    if (cards.length === 0) return {};

    const signature = signatureFor(cards);
    const cached = cache.get(signature);
    if (cached) return cached;

    try {
      const response = await LLMService.send({
        system: HOME_ENRICHMENT_SYSTEM_PROMPT,
        messages: [
          { role: "user", content: buildHomeEnrichmentUserMessage(cards) },
        ],
      });
      const hints = parseHomeEnrichment(
        response.content,
        cards.map((card) => card.id),
      );
      cache.set(signature, hints);
      return hints;
    } catch {
      return {};
    }
  },
};
