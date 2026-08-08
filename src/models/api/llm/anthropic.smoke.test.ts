// Live smoke test — opt-in. Runs ONLY when RUN_LLM_SMOKE=1, because it makes
// a real network call to Anthropic and spends tokens. It is the early-warning
// that DEFAULT_MODEL (or its .env override) still responds, since there is no
// mocked unit test for this provider yet.
//
// Run:  RUN_LLM_SMOKE=1 EXPO_PUBLIC_CLAUDE_API_KEY=<key> npx jest anthropic.smoke

jest.mock("expo/virtual/env", () => ({ env: process.env }));

import { claudeProvider } from "./anthropic";

const RUN = process.env.RUN_LLM_SMOKE === "1";
const describeSmoke = RUN ? describe : describe.skip;

const stripFences = (value: string): string =>
  value
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

describeSmoke("Claude LLM live smoke", () => {
  it("text model returns a valid JSON acceptance flag", async () => {
    const response = await claudeProvider.send({
      system: "You are a connectivity check. Reply with one JSON object only.",
      messages: [
        { role: "user", content: 'Return exactly {"ok": true} and nothing else.' },
      ],
    });

    const parsed = JSON.parse(stripFences(response.content)) as { ok?: unknown };
    expect(parsed.ok).toBe(true);
  }, 30000);
});
