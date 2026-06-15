import { useState } from "react";
import { SeasonalRepository } from "../models/repositories/SeasonalRepository";
import type { SeasonalProduce } from "../models/types";
import { SeasonalService } from "../services/SeasonalService";
import { useChefProfileStore } from "../store/chefProfileStore";

const repo = new SeasonalRepository();

export const useSeasonalController = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [produce, setProduce] = useState<SeasonalProduce[]>([]);
  const profile = useChefProfileStore((s) => s.profile);

  const loadInSeason = async (): Promise<void> => {
    if (!profile) return;
    setLoading(true);
    try {
      const month = SeasonalService.getCurrentMonth();
      const items = await repo.getByRegionAndMonth(profile.region, month);
      setProduce(items);
    } catch {
      setError("Could not load seasonal produce.");
    } finally {
      setLoading(false);
    }
  };

  return { loadInSeason, produce, loading, error };
};
