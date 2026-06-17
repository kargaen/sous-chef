import { useEffect, useState } from "react";

import { RecipeRepository } from "@/models/repositories/RecipeRepository";
import type { MealSlotType } from "@/models/types";
import { useMealPlanStore } from "@/store";
import { relevanceFor, type HomeCardSignal } from "@/utils";

export const TODAYS_MENU_CARD_ID = "todays-menu";

const recipeRepo = new RecipeRepository();

// Render today's meals in the natural order of the day.
const SLOT_ORDER: MealSlotType[] = ["breakfast", "lunch", "dinner", "snack"];

export interface TodaysMenuItem {
  type: MealSlotType;
  title: string;
}

export interface TodaysMenuCardViewModel {
  signal: HomeCardSignal;
  items: TodaysMenuItem[];
  loading: boolean;
}

// Local YYYY-MM-DD key for "today", compared against each slot's date.
const todayKey = (): string => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
};

/**
 * Home "Today's Menu" glance card. MVP: reads the active plan from the store
 * (no week-start math — there is no shared convention yet) and resolves today's
 * slots to recipe titles. Shows a plan-empty invite when nothing is planned,
 * which is the common case until plan persistence matures.
 */
export const useTodaysMenuCard = (): TodaysMenuCardViewModel => {
  const activePlan = useMealPlanStore((state) => state.activePlan);
  const [items, setItems] = useState<TodaysMenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const resolve = async (): Promise<void> => {
      setLoading(true);
      const today = todayKey();
      const slots = (activePlan?.slots ?? []).filter(
        (slot) => slot.date.slice(0, 10) === today,
      );

      const resolved: TodaysMenuItem[] = [];
      for (const slot of slots) {
        if (slot.recipeId) {
          const recipe = await recipeRepo.fetchById(slot.recipeId);
          if (recipe) resolved.push({ type: slot.type, title: recipe.title });
        } else if (slot.note) {
          resolved.push({ type: slot.type, title: slot.note });
        }
      }
      resolved.sort(
        (a, b) => SLOT_ORDER.indexOf(a.type) - SLOT_ORDER.indexOf(b.type),
      );

      if (!cancelled) {
        setItems(resolved);
        setLoading(false);
      }
    };

    void resolve();
    return () => {
      cancelled = true;
    };
  }, [activePlan]);

  // A planned day is timely (soft urgency, above inspiration); the empty invite
  // sits low in the inspiration band so it never crowds out real signals.
  const hasPlan = items.length > 0;
  const signal: HomeCardSignal = {
    id: TODAYS_MENU_CARD_ID,
    relevance: hasPlan
      ? relevanceFor("softUrgency", 0.4)
      : relevanceFor("inspiration", 0.3),
    visible: !loading,
  };

  return { signal, items, loading };
};
