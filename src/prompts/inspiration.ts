interface InspirationContext {
  month: number;
  region: string | null;
}

export const buildInspirationPrompt = (ctx: InspirationContext): string =>
  `
Current month: ${ctx.month}
Region: ${ctx.region ?? "unknown"}

What ingredients or dishes are at their best right now in this region?
Suggest two or three ideas that celebrate what is in season locally.
Be evocative and enthusiastic — make the cook excited to cook something seasonal.
Keep it brief and conversational.
`.trim();
