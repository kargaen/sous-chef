jest.mock("expo/virtual/env", () => ({
  env: process.env,
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
  },
}));

const AsyncStorage = jest.requireMock(
  "@react-native-async-storage/async-storage",
).default as {
  getItem: jest.Mock;
};

import { DEFAULT_MODEL, googleProvider } from "./google";

describe("googleProvider", () => {
  const originalGeminiApiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  const originalGeminiModel = process.env.EXPO_PUBLIC_GEMINI_MODEL;
  const originalFetch = global.fetch;

  beforeEach(() => {
    delete process.env.EXPO_PUBLIC_GEMINI_API_KEY;
    delete process.env.EXPO_PUBLIC_GEMINI_MODEL;
    AsyncStorage.getItem.mockReset();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: "{\"title\":\"Imported\"}" }],
            },
          },
        ],
      }),
    }) as typeof fetch;
  });

  afterEach(() => {
    if (originalGeminiApiKey === undefined) {
      delete process.env.EXPO_PUBLIC_GEMINI_API_KEY;
    } else {
      process.env.EXPO_PUBLIC_GEMINI_API_KEY = originalGeminiApiKey;
    }

    if (originalGeminiModel === undefined) {
      delete process.env.EXPO_PUBLIC_GEMINI_MODEL;
    } else {
      process.env.EXPO_PUBLIC_GEMINI_MODEL = originalGeminiModel;
    }

    global.fetch = originalFetch;
  });

  it("prefers the saved settings key over the env fallback", async () => {
    process.env.EXPO_PUBLIC_GEMINI_API_KEY = "env-key";
    process.env.EXPO_PUBLIC_GEMINI_MODEL = "gemini-3.1-flash-lite";
    AsyncStorage.getItem.mockResolvedValue(
      JSON.stringify({ geminiApiKey: "stored-key" }),
    );

    await googleProvider.send({
      system: "System",
      messages: [{ role: "user", content: "Hello" }],
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("gemini-3.1-flash-lite:generateContent?key=stored-key"),
      expect.objectContaining({
        method: "POST",
      }),
    );
  });

  // The env fallback is dev-only (gated on __DEV__, which jest treats as true).
  // Production builds ignore the env key so users cannot use the dev's key.
  it("falls back to the env key in development when settings are empty", async () => {
    process.env.EXPO_PUBLIC_GEMINI_API_KEY = "env-key";
    process.env.EXPO_PUBLIC_GEMINI_MODEL = "gemini-3.1-flash-lite";
    AsyncStorage.getItem.mockResolvedValue(
      JSON.stringify({ geminiApiKey: "   " }),
    );

    await googleProvider.send({
      system: "System",
      messages: [{ role: "user", content: "Hello" }],
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("gemini-3.1-flash-lite:generateContent?key=env-key"),
      expect.any(Object),
    );
  });

  it("uses the default model when EXPO_PUBLIC_GEMINI_MODEL is missing", async () => {
    process.env.EXPO_PUBLIC_GEMINI_API_KEY = "env-key";
    delete process.env.EXPO_PUBLIC_GEMINI_MODEL;
    AsyncStorage.getItem.mockResolvedValue(null);

    await googleProvider.send({
      system: "System",
      messages: [{ role: "user", content: "Hello" }],
    });

    // Assert against the source constant, not a duplicated literal, so a
    // deliberate DEFAULT_MODEL change updates the expectation automatically.
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(`${DEFAULT_MODEL}:generateContent?key=env-key`),
      expect.any(Object),
    );
  });

  it("passes a pinned model name through unchanged when provided in env", async () => {
    process.env.EXPO_PUBLIC_GEMINI_API_KEY = "env-key";
    process.env.EXPO_PUBLIC_GEMINI_MODEL = "gemini-2.5-flash";
    AsyncStorage.getItem.mockResolvedValue(null);

    await googleProvider.send({
      system: "System",
      messages: [{ role: "user", content: "Hello" }],
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("gemini-2.5-flash:generateContent?key=env-key"),
      expect.any(Object),
    );
  });
});
