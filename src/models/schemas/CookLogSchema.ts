import { z } from "zod";

const ScoreSchema = z.number().int().min(1).max(5);

export const CookLogEntrySchema = z.object({
  id: z.string().min(1),
  recipeId: z.string().min(1),
  cookedAt: z.string().min(1),
  overallScore: ScoreSchema.optional(),
});

export const RatingSchema = z.object({
  id: z.string().min(1),
  cookLogId: z.string().min(1),
  categoryId: z.string().min(1),
  score: ScoreSchema,
});

export const RatingCategorySchema = z.object({
  id: z.string().min(1),
  recipeId: z.string().min(1),
  label: z.string().min(1),
  displayOrder: z.number().int().nonnegative(),
});

export const CookNoteSchema = z.object({
  id: z.string().min(1),
  recipeId: z.string().min(1),
  body: z.string().min(1),
  createdAt: z.string().min(1),
});
