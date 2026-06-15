import type { PantryItem } from "../models/types";

interface NudgeContext {
  expiringItems: Pick<PantryItem, "name" | "expiryDate">[];
  habitSummary: Record<string, number>;
  month: number;
  region: string | null;
}

export const buildNudgePrompt = (ctx: NudgeContext): string =>
  `
Here is the current context for this cook:

Region: ${ctx.region ?? "unknown"}
Current month: ${ctx.month}
Items expiring soon: ${
    ctx.expiringItems.length > 0
      ? ctx.expiringItems
          .map((i) => `${i.name} (expires ${i.expiryDate})`)
          .join(", ")
      : "none"
  }
Recent activity: ${
    Object.entries(ctx.habitSummary)
      .map(([event, count]) => `${event}: ${count}x`)
      .join(", ") || "no recent activity"
  }

Based on this context, generate a single timely and helpful nudge.
Respond only with a JSON object — no preamble, no markdown, no explanation:
{
  "id": "<unique string>",
  "body": "<the nudge message, warm and specific, 1-2 sentences>",
  "contextType": "<waste | seasonal | budget | habit>",
  "actionLabel": "<short label for a follow-up action, or null>",
  "actionRoute": "<app route string, or null>"
}
`.trim();
