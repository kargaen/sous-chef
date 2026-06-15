import { z } from "zod";

export const IngredientSchema = z.object({
  id: z.string(),
  name: z.string(),
  quantity: z.number().positive(),
  unit: z.string(),
  notes: z.string().optional(),
});

export const StepSchema = z.object({
  order: z.number().int().positive(),
  instruction: z.string(),
  durationMinutes: z.number().optional(),
});

export const RecipeSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  description: z.string(),
  categoryId: z.string().min(1).nullable().optional(),
  parentId: z.string().min(1).nullable().optional(),
  servings: z.number().int().positive(),
  prepMinutes: z.number().int().nonnegative(),
  cookMinutes: z.number().int().nonnegative(),
  ingredients: z.array(IngredientSchema).min(1),
  steps: z.array(StepSchema).min(1),
  chefsNotes: z.string().optional(),
  tags: z.array(z.string()),
  season: z.string().optional(),
  estimatedCost: z.number().nonnegative().optional(),
  imageUri: z.string().min(1).optional(),
  imageEnhanced: z.boolean().optional(),
  createdDate: z.string(),
  lastUpdatedDate: z.string(),
});
