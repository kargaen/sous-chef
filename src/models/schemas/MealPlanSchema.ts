import { z } from "zod";

export const MealSlotSchema = z
  .object({
    id: z.string(),
    date: z.string(),
    type: z.enum(["breakfast", "lunch", "dinner", "snack"]),
    text: z.string().optional(),
    recipeId: z.string().nullable().optional(),
    note: z.string().optional(),
    servings: z.number().int().positive().optional(),
    status: z.enum(["planned", "cooked", "skipped"]).optional(),
  })
  .superRefine((slot, ctx) => {
    const hasRecipe = !!slot.recipeId;
    const hasText = !!slot.text;
    const hasNote = !!slot.note;

    if (!hasRecipe && !hasText && !hasNote) {
      ctx.addIssue({
        code: "custom",
        message: "A slot must have standalone text or a recipe",
      });
    }

    if (hasText && (hasRecipe || hasNote)) {
      ctx.addIssue({
        code: "custom",
        message: "Standalone text cannot be combined with a recipe or note",
      });
    }
  })
  .transform((slot) => {
    if (!slot.recipeId && slot.note && !slot.text) {
      const { note, ...legacySlot } = slot;
      return { ...legacySlot, text: note };
    }

    return slot;
  });

export const WeekPlanSchema = z.object({
  id: z.string(),
  weekStartDate: z.string(),
  dayCount: z.number().int().positive().default(7),
  slots: z.array(MealSlotSchema),
});
