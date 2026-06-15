import { useState } from "react";
import { BudgetRepository } from "../models/repositories/BudgetRepository";
import type { BudgetPeriod, Recipe, SpendEntry } from "../models/types";
import { PricingService } from "../services/PricingService";
import { useBudgetStore } from "../store/budgetStore";
import { useChefProfileStore } from "../store/chefProfileStore";

const repo = new BudgetRepository();

export const useBudgetController = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setActivePeriod, setEntries, addEntry } = useBudgetStore();
  const profile = useChefProfileStore((s) => s.profile);

  const loadPeriod = async (id: string): Promise<void> => {
    setLoading(true);
    try {
      const period = await repo.getPeriod(id);
      if (!period) return;
      const entries = await repo.getEntriesForPeriod(id);
      setActivePeriod(period);
      setEntries(entries);
    } catch {
      setError("Could not load budget.");
    } finally {
      setLoading(false);
    }
  };

  const savePeriod = async (period: BudgetPeriod): Promise<void> => {
    try {
      await repo.savePeriod(period);
      setActivePeriod(period);
    } catch {
      setError("Could not save budget period.");
    }
  };

  const logSpend = async (entry: SpendEntry): Promise<void> => {
    try {
      await repo.insertEntry(entry);
      addEntry(entry);
    } catch {
      setError("Could not log spend.");
    }
  };

  const estimateRecipeCost = async (
    recipe: Recipe,
  ): Promise<{ total: number; currency: string; isCached: boolean } | null> => {
    if (!profile) return null;
    try {
      return await PricingService.estimateRecipeCost(
        recipe,
        profile.region,
        profile.currency,
      );
    } catch {
      setError("Could not estimate cost.");
      return null;
    }
  };

  return {
    loadPeriod,
    savePeriod,
    logSpend,
    estimateRecipeCost,
    loading,
    error,
  };
};
