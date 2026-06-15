import { z } from "zod";

export const MealSlotSchema = z.object({
  id: z.string(),
  date: z.string(),
  type: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  recipeId: z.string(),
  servings: z.number().int().positive(),
});

export const WeekPlanSchema = z.object({
  id: z.string(),
  weekStartDate: z.string(),
  slots: z.array(MealSlotSchema),
});
