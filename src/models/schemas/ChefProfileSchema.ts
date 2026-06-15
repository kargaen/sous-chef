import { z } from "zod";

export const PreferenceSchema = z.object({
  dietary: z.array(z.string()),
  dislikedIngredients: z.array(z.string()),
  cuisinePreferences: z.array(z.string()),
});

export const ChefProfileSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  skillLevel: z.enum(["beginner", "home cook", "confident", "advanced"]),
  preferences: PreferenceSchema,
  region: z.string(),
  currency: z.string().length(3),
  createdAt: z.string(),
});

export const ChefProfileInputSchema = ChefProfileSchema.omit({
  id: true,
  createdAt: true,
});
export type ChefProfileInput = z.infer<typeof ChefProfileInputSchema>;
