import { z } from "zod";

export const LLMRoleSchema = z.enum(["user", "assistant", "system"]);

export const AssistantScopeKindSchema = z.enum([
  "global",
  "recipe",
  "cookbook",
  "pantry",
  "meal_plan",
]);

export const AssistantPromptSuggestionKindSchema = z.enum([
  "adaptation",
  "troubleshooting",
  "planning",
  "general",
]);

export const AssistantRouteContextSchema = z.object({
  pathname: z.string().min(1),
  params: z.record(z.string(), z.string()).optional(),
});

export const AssistantScopeSchema = z.object({
  kind: AssistantScopeKindSchema,
  label: z.string().min(1).optional(),
  route: AssistantRouteContextSchema.optional(),
  recipeId: z.string().min(1).optional(),
  cookbookId: z.string().min(1).optional(),
  pantryItemIds: z.array(z.string().min(1)).optional(),
  mealPlanId: z.string().min(1).optional(),
});

export const AssistantPromptSuggestionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  prompt: z.string().min(1),
  kind: AssistantPromptSuggestionKindSchema,
  scopeKinds: z.array(AssistantScopeKindSchema).optional(),
});

export const AdaptationIngredientSnapshotSchema = z.object({
  ingredientId: z.string().min(1).optional(),
  displayText: z.string().min(1),
  name: z.string().min(1),
  quantity: z.string().min(1).optional(),
  unit: z.string().min(1).optional(),
  notes: z.string().min(1).optional(),
});

export const AdaptationStepSnapshotSchema = z.object({
  stepId: z.string().min(1).optional(),
  order: z.number().int().positive().optional(),
  instruction: z.string().min(1),
});

export const AdaptationIngredientAddChangeSchema = z.object({
  id: z.string().min(1),
  changeType: z.literal("add"),
  targetType: z.literal("ingredient"),
  after: AdaptationIngredientSnapshotSchema,
  reason: z.string().min(1).optional(),
});

export const AdaptationIngredientRemoveChangeSchema = z.object({
  id: z.string().min(1),
  changeType: z.literal("remove"),
  targetType: z.literal("ingredient"),
  before: AdaptationIngredientSnapshotSchema,
  reason: z.string().min(1).optional(),
});

export const AdaptationIngredientReplaceChangeSchema = z.object({
  id: z.string().min(1),
  changeType: z.literal("replace"),
  targetType: z.literal("ingredient"),
  before: AdaptationIngredientSnapshotSchema,
  after: AdaptationIngredientSnapshotSchema,
  reason: z.string().min(1).optional(),
});

export const AdaptationIngredientChangeSchema = z.union([
  AdaptationIngredientAddChangeSchema,
  AdaptationIngredientRemoveChangeSchema,
  AdaptationIngredientReplaceChangeSchema,
]);

export const AdaptationStepAddChangeSchema = z.object({
  id: z.string().min(1),
  changeType: z.literal("add"),
  targetType: z.literal("step"),
  after: AdaptationStepSnapshotSchema,
  reason: z.string().min(1).optional(),
});

export const AdaptationStepRemoveChangeSchema = z.object({
  id: z.string().min(1),
  changeType: z.literal("remove"),
  targetType: z.literal("step"),
  before: AdaptationStepSnapshotSchema,
  reason: z.string().min(1).optional(),
});

export const AdaptationStepReplaceChangeSchema = z.object({
  id: z.string().min(1),
  changeType: z.literal("replace"),
  targetType: z.literal("step"),
  before: AdaptationStepSnapshotSchema,
  after: AdaptationStepSnapshotSchema,
  reason: z.string().min(1).optional(),
});

export const AdaptationStepChangeSchema = z.union([
  AdaptationStepAddChangeSchema,
  AdaptationStepRemoveChangeSchema,
  AdaptationStepReplaceChangeSchema,
]);

export const AdaptationResponseSchema = z.object({
  variantTitle: z.string().min(1).optional(),
  summary: z.string().min(1),
  rationale: z.string().min(1),
  considerations: z.array(z.string().min(1)),
  ingredientChanges: z.array(AdaptationIngredientChangeSchema),
  stepChanges: z.array(AdaptationStepChangeSchema),
  adaptedIngredients: z.array(AdaptationIngredientSnapshotSchema).optional(),
  adaptedSteps: z.array(AdaptationStepSnapshotSchema).optional(),
});

export const AdaptationStructuredMessageSchema = z.object({
  type: z.literal("adaptation"),
  payload: AdaptationResponseSchema,
});

export const AssistantStructuredMessageSchema = z.union([
  AdaptationStructuredMessageSchema,
]);

export const MessageSchema = z.object({
  id: z.string().min(1),
  role: LLMRoleSchema,
  content: z.string(),
  createdAt: z.string().min(1),
  scope: AssistantScopeSchema.nullable().optional(),
  structuredMessage: AssistantStructuredMessageSchema.nullable().optional(),
});

export const NudgeCardSchema = z.object({
  id: z.string().min(1),
  body: z.string().min(1),
  contextType: z.enum(["waste", "seasonal", "budget", "habit"]),
  actionLabel: z.string().min(1).optional(),
  actionRoute: z.string().min(1).optional(),
});

export const SuggestionContextSchema = z.object({
  recipeId: z.string().min(1).optional(),
  pantryItemIds: z.array(z.string().min(1)).optional(),
  nudgeId: z.string().min(1).optional(),
  recipeTitle: z.string().min(1).optional(),
  pantryItemNames: z.array(z.string().min(1)).optional(),
  nudgeBody: z.string().min(1).optional(),
  scope: AssistantScopeSchema.optional(),
  promptSuggestions: z.array(AssistantPromptSuggestionSchema).optional(),
});

export const AssistantSessionSchema = z.object({
  id: z.string().min(1),
  startedAt: z.string().min(1),
  lastUpdatedAt: z.string().min(1),
  activeScope: AssistantScopeSchema,
  messages: z.array(MessageSchema),
  promptSuggestions: z.array(AssistantPromptSuggestionSchema),
});
