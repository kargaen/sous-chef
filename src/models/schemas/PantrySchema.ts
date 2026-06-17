import { z } from "zod";

import { STORAGE_ZONES } from "../types";

export const PantryItemSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.string(),
  storageZone: z.enum(STORAGE_ZONES),
  expiryDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Expiry date must be YYYY-MM-DD")
    .optional(),
  createdDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Created date must be YYYY-MM-DD")
    .optional(),
  usedCount: z.number().int().nonnegative().default(0),
  lastSurfacedAt: z.string().optional(),
});

export const PantryItemInputSchema = PantryItemSchema.omit({
  id: true,
});
export type PantryItemInput = z.infer<typeof PantryItemInputSchema>;
