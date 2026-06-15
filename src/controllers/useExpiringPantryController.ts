import { useState } from "react";

import { PantryRepository } from "../models/repositories/PantryRepository";
import type { PantryItem } from "../models/types";

const repo = new PantryRepository();

/**
 * Read-only controller for the Home "Use It Up" glance card. Mirrors
 * `useSeasonalController`: one lightweight load plus the items it found. Stays
 * off the heavy `usePantryController` (CRUD + pantry store) so a glance card
 * never pulls the whole Pantry tab's machinery onto the landing surface.
 */
export const useExpiringPantryController = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expiring, setExpiring] = useState<PantryItem[]>([]);

  const loadExpiring = async (withinDays = 7): Promise<void> => {
    setLoading(true);
    try {
      const items = await repo.getExpiringSoon(withinDays);
      setExpiring(items);
    } catch {
      setError("Could not load expiring pantry items.");
    } finally {
      setLoading(false);
    }
  };

  return { loadExpiring, expiring, loading, error };
};
