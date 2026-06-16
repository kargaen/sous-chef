import { z } from "zod";

export const MealSlotSchema = z
  .object({
    id: z.string(),
    date: z.string(),
    type: z.enum(["breakfast", "lunch", "dinner", "snack"]),
    recipeId: z.string().nullable().optional(),
    note: z.string().optional(),
    servings: z.number().int().positive().optional(),
    status: z.enum(["planned", "cooked", "skipped"]).optional(),
  })
  .refine((slot) => !!slot.recipeId || !!slot.note, {
    message: "A slot must have a recipe or a note",
  });

export const WeekPlanSchema = z.object({
  id: z.string(),
  weekStartDate: z.string(),
  dayCount: z.number().int().positive().default(7),
  slots: z.array(MealSlotSchema),
});
