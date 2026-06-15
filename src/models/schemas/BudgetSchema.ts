import { z } from "zod";

export const BudgetPeriodSchema = z.object({
  id: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  limitAmount: z.number().positive(),
  currency: z.string().length(3),
});

export const SpendEntrySchema = z.object({
  id: z.string(),
  periodId: z.string(),
  recipeId: z.string().optional(),
  amount: z.number().nonnegative(),
  note: z.string(),
  recordedAt: z.string(),
});
