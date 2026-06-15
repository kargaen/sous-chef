import type { PantryItem } from "../models/types";

interface WasteReductionContext {
  expiringItems: Pick<PantryItem, "name" | "expiryDate">[];
  month: number;
  region: string | null;
}

export const buildWasteReductionPrompt = (ctx: WasteReductionContext): string =>
  `
These items are expiring soon:
${ctx.expiringItems.map((i) => `- ${i.name} (expires ${i.expiryDate})`).join("\n")}

Current month: ${ctx.month}
Region: ${ctx.region ?? "unknown"}

Suggest one or two simple ways to use these up before they go to waste.
Be warm and encouraging — frame this as an opportunity, not a warning.
Mention the ingredients by name and keep it practical.
`.trim();
