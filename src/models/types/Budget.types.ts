export interface BudgetPeriod {
  id: string;
  startDate: string;
  endDate: string;
  limitAmount: number;
  currency: string;
}

export interface SpendEntry {
  id: string;
  periodId: string;
  recipeId?: string;
  amount: number;
  note: string;
  recordedAt: string;
}

export interface CostEstimate {
  recipeId: string;
  estimatedAmount: number;
  currency: string;
  isCached: boolean;
}
