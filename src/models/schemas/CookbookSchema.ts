import { z } from "zod";

const CookbookIdSchema = z.string().min(1);

export const CookbookSchema = z.object({
  id: CookbookIdSchema,
  title: z.string().trim().min(1),
  description: z.string().trim().optional(),
  parentId: CookbookIdSchema.nullable().optional(),
  recipeIds: z.array(z.string().min(1)).default([]),
});

export const CookbookInputSchema = CookbookSchema.omit({
  id: true,
});

export type CookbookInput = z.infer<typeof CookbookInputSchema>;
