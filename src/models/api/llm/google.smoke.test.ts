// Live smoke test — opt-in. Runs ONLY when RUN_LLM_SMOKE=1, because it makes
// real network calls to Gemini and spends tokens. It is the early-warning that
// the pinned model names the app uses (DEFAULT_MODEL / DEFAULT_IMAGE_MODEL, or
// their .env overrides) still respond, since the mocked unit tests can only
// verify URL construction, not the live models.
//
// Run:  RUN_LLM_SMOKE=1 EXPO_PUBLIC_GEMINI_API_KEY=<key> npx jest google.smoke

jest.mock("expo/virtual/env", () => ({ env: process.env }));

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: { getItem: jest.fn().mockResolvedValue(null) },
}));

import { generateImage } from "../image/googleImage";
import { googleProvider } from "./google";

const RUN = process.env.RUN_LLM_SMOKE === "1";
const describeSmoke = RUN ? describe : describe.skip;

// Smallest possible valid PNG (1x1 transparent) to keep the image call cheap.
const ONE_PX_PNG =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

const stripFences = (value: string): string =>
  value
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

describeSmoke("LLM live smoke", () => {
  it("text model returns a valid JSON acceptance flag", async () => {
    const response = await googleProvider.send({
      system: "You are a connectivity check. Reply with one JSON object only.",
      messages: [
        { role: "user", content: 'Return exactly {"ok": true} and nothing else.' },
      ],
    });

    // 200 is implied (send throws otherwise). Now assert the body is valid JSON
    // and the model explicitly returned the acceptance flag.
    const parsed = JSON.parse(stripFences(response.content)) as { ok?: unknown };
    expect(parsed.ok).toBe(true);
  }, 30000);

  it("image model returns image data", async () => {
    const result = await generateImage({
      base64: ONE_PX_PNG,
      mimeType: "image/png",
      prompt: "Return this image unchanged.",
    });

    expect(result.base64.length).toBeGreaterThan(0);
    expect(result.mimeType).toMatch(/^image\//);
  }, 60000);
});
