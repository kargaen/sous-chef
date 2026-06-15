import { z } from "zod";

export const InspirationKindSchema = z.enum([
  "spark",
  "produce",
  "theme",
  "week_plan",
  "leftover",
  "nudge",
]);

export const InspirationPayloadSchema = z.object({
  seedPrompt: z.string().optional(),
  route: z.string().optional(),
  context: z.record(z.string(), z.unknown()).optional(),
});

export const InspirationSchema = z.object({
  id: z.string().min(1),
  kind: InspirationKindSchema,
  title: z.string().min(1),
  hook: z.string().min(1),
  payload: InspirationPayloadSchema,
  source: z.string().min(1),
  dedupeKey: z.string().min(1),
  relevance: z.number().min(0).max(1).optional(),
  createdAt: z.string().min(1),
  expiresAt: z.string().min(1),
  consumedAt: z.string().min(1).optional(),
});
