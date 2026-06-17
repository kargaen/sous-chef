export type LLMRole = "user" | "assistant" | "system";

export type AssistantScopeKind =
  | "global"
  | "recipe"
  | "cookbook"
  | "pantry"
  | "meal_plan";

export type AssistantPromptSuggestionKind =
  | "adaptation"
  | "troubleshooting"
  | "planning"
  | "general";

export interface AssistantRouteContext {
  pathname: string;
  params?: Record<string, string>;
}

export interface AssistantScope {
  kind: AssistantScopeKind;
  label?: string;
  route?: AssistantRouteContext;
  recipeId?: string;
  cookbookId?: string;
  pantryItemIds?: string[];
  mealPlanId?: string;
}

export interface AssistantPromptSuggestion {
  id: string;
  label: string;
  prompt: string;
  kind: AssistantPromptSuggestionKind;
  scopeKinds?: AssistantScopeKind[];
}

export interface AssistantContext {
  entryPoint?: string;
  issueSummary?: string;
  issueDetails?: string;
}

export interface AdaptationIngredientSnapshot {
  ingredientId?: string;
  displayText: string;
  name: string;
  quantity?: string;
  unit?: string;
  notes?: string;
}

export interface AdaptationStepSnapshot {
  stepId?: string;
  order?: number;
  instruction: string;
}

export interface AdaptationIngredientAddChange {
  id: string;
  changeType: "add";
  targetType: "ingredient";
  after: AdaptationIngredientSnapshot;
  reason?: string;
}

export interface AdaptationIngredientRemoveChange {
  id: string;
  changeType: "remove";
  targetType: "ingredient";
  before: AdaptationIngredientSnapshot;
  reason?: string;
}

export interface AdaptationIngredientReplaceChange {
  id: string;
  changeType: "replace";
  targetType: "ingredient";
  before: AdaptationIngredientSnapshot;
  after: AdaptationIngredientSnapshot;
  reason?: string;
}

export type AdaptationIngredientChange =
  | AdaptationIngredientAddChange
  | AdaptationIngredientRemoveChange
  | AdaptationIngredientReplaceChange;

export interface AdaptationStepAddChange {
  id: string;
  changeType: "add";
  targetType: "step";
  after: AdaptationStepSnapshot;
  reason?: string;
}

export interface AdaptationStepRemoveChange {
  id: string;
  changeType: "remove";
  targetType: "step";
  before: AdaptationStepSnapshot;
  reason?: string;
}

export interface AdaptationStepReplaceChange {
  id: string;
  changeType: "replace";
  targetType: "step";
  before: AdaptationStepSnapshot;
  after: AdaptationStepSnapshot;
  reason?: string;
}

export type AdaptationStepChange =
  | AdaptationStepAddChange
  | AdaptationStepRemoveChange
  | AdaptationStepReplaceChange;

export interface AdaptationResponse {
  variantTitle?: string;
  summary: string;
  rationale: string;
  considerations: string[];
  ingredientChanges: AdaptationIngredientChange[];
  stepChanges: AdaptationStepChange[];
  adaptedIngredients?: AdaptationIngredientSnapshot[];
  adaptedSteps?: AdaptationStepSnapshot[];
}

export interface AdaptationStructuredMessage {
  type: "adaptation";
  payload: AdaptationResponse;
}

export type AssistantStructuredMessage = AdaptationStructuredMessage | PantryAddSuggestionStructuredMessage;

export interface Message {
  id: string;
  role: LLMRole;
  content: string;
  createdAt: string;
  scope?: AssistantScope | null;
  structuredMessage?: AssistantStructuredMessage | null;
}

export interface NudgeCard {
  id: string;
  body: string;
  contextType: "waste" | "seasonal" | "budget" | "habit";
  actionLabel?: string;
  actionRoute?: string;
}

export interface SuggestionContext {
  recipeId?: string;
  pantryItemIds?: string[];
  nudgeId?: string;
  recipeTitle?: string;
  pantryItemNames?: string[];
  nudgeBody?: string;
  assistantContext?: AssistantContext;
  scope?: AssistantScope;
  promptSuggestions?: AssistantPromptSuggestion[];
}

export interface AssistantSession {
  id: string;
  startedAt: string;
  lastUpdatedAt: string;
  activeScope: AssistantScope;
  messages: Message[];
  promptSuggestions: AssistantPromptSuggestion[];
}

export interface AssistantCreateRecipeAction {
  action: "create_recipe";
  idea: string;
}

export interface AssistantAddPantryItemAction {
  action: "add_pantry_item";
  name: string;
  zone: "fridge" | "freezer" | "cupboard";
  unit?: string;
  quantity?: string;
  createdDate?: string | null;
  expiryDate?: string | null;
}

export type AssistantAction = AssistantCreateRecipeAction | AssistantAddPantryItemAction;

export interface PantryAddSuggestionPayload {
  name: string;
  zone: "fridge" | "freezer" | "cupboard";
  createdDate?: string | null;
  expiryDate?: string | null;
}

export interface PantryAddSuggestionStructuredMessage {
  type: "pantry_add_suggestion";
  payload: PantryAddSuggestionPayload;
}
