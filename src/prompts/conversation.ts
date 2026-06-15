interface ConversationContext {
  userMessage: string;
  suggestionContext?: {
    recipeTitle?: string;
    pantryItemNames?: string[];
    nudgeBody?: string;
  };
  assistantContext?: {
    entryPoint?: string;
    issueSummary?: string;
    issueDetails?: string;
  };
}

export const buildConversationPrompt = (ctx: ConversationContext): string => {
  const internalContextLines: string[] = [];
  const contextLines: string[] = [];
  const suggestionContext = ctx.suggestionContext ?? {};
  const assistantContext = ctx.assistantContext ?? {};
  const hasRecipeContext = Boolean(suggestionContext.recipeTitle);

  if (hasRecipeContext) {
    internalContextLines.push(
      "Internal assistant context: this chat was opened from a recipe detail view and should stay anchored to that recipe unless the cook explicitly changes topic.",
    );
  } else if (suggestionContext.pantryItemNames?.length) {
    internalContextLines.push(
      "Internal assistant context: this chat was opened from a pantry or ingredient context and should treat the listed items as the active working set.",
    );
  }
  if (suggestionContext.nudgeBody) {
    internalContextLines.push(
      "Internal assistant context: this chat was launched from a nudge card and should remember that nudge as the starting point.",
    );
  }
  if (assistantContext.entryPoint) {
    internalContextLines.push(
      `Internal assistant context: this chat was opened from "${assistantContext.entryPoint}".`,
    );
  }
  if (assistantContext.issueSummary) {
    internalContextLines.push(
      `Internal assistant context: the user is asking about this issue: "${assistantContext.issueSummary}". Explain what is missing or what happened in plain language, and suggest the next concrete step.`,
    );
  }
  if (assistantContext.issueDetails) {
    internalContextLines.push(
      `Internal assistant context details: ${assistantContext.issueDetails}`,
    );
  }
  if (internalContextLines.length === 0) {
    internalContextLines.push(
      "Internal assistant context: this is a general kitchen-assistant chat opened from the global assistant entry point.",
    );
  }

  if (hasRecipeContext) {
    contextLines.push(
      `The cook is asking about this recipe: "${suggestionContext.recipeTitle}"`,
    );
  }
  if (suggestionContext.pantryItemNames?.length) {
    contextLines.push(
      hasRecipeContext
        ? `Relevant ingredients and nearby context for this recipe: ${suggestionContext.pantryItemNames.join(", ")}`
        : `Relevant pantry items: ${suggestionContext.pantryItemNames.join(", ")}`,
    );
  }
  if (suggestionContext.nudgeBody) {
    contextLines.push(
      `This conversation was started from a nudge: "${suggestionContext.nudgeBody}"`,
    );
  }

  return [...internalContextLines, ...contextLines, ctx.userMessage].join("\n\n");
};
