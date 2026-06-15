export type Hemisphere = "northern" | "southern";
export type Season = "spring" | "summer" | "autumn" | "winter";

export interface SeasonalProduce {
  id: string;
  name: string;
  season: Season;
  months: number[];
  description?: string;
}

export interface LocalSource {
  id: string;
  name: string;
  type: "farmersMarket" | "cooperative" | "grower";
  region: string;
}

export interface Region {
  code: string;
  name: string;
}
