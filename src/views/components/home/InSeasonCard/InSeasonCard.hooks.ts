import { useEffect, useRef, useState } from "react";

import { useSeasonalController } from "@/controllers";
import type { SeasonalProduce } from "@/models/types";
import type { HomeCardSignal } from "@/utils";

export const IN_SEASON_CARD_ID = "in-season";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export interface InSeasonCardViewModel {
  signal: HomeCardSignal;
  produce: SeasonalProduce[];
  monthLabel: string;
  loading: boolean;
}

export const useInSeasonCard = (): InSeasonCardViewModel => {
  const { loadInSeason, produce, loading } = useSeasonalController();
  const loadRef = useRef(loadInSeason);
  loadRef.current = loadInSeason;

  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    void loadRef.current().finally(() => setHasLoaded(true));
  }, []);

  const monthLabel = MONTH_NAMES[new Date().getMonth()];

  // Seasonal produce returned by the controller is already month-filtered, so
  // anything present is in season. Hide the card entirely when there is
  // nothing to show — the page self-prunes.
  const signal: HomeCardSignal = {
    id: IN_SEASON_CARD_ID,
    relevance: produce.length > 0 ? 0.4 : 0,
    visible: hasLoaded && produce.length > 0,
  };

  return { signal, produce, monthLabel, loading: loading || !hasLoaded };
};
