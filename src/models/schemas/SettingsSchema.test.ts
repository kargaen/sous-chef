import { AppSettingsSchema } from "./SettingsSchema";

// The load-bearing invariant for additive settings: a blob stored before a new
// field existed must still parse, defaulting the missing field — otherwise an
// app update would fail to read the user's saved settings.
describe("AppSettingsSchema — onboardingCompleted", () => {
  const baseStored = {
    geminiApiKey: "",
    keepScreenOn: true,
    sustainabilityNudges: "default",
    learnFromChats: true,
    assistantOutputLanguage: "imply",
    skipSafetyLayer1: false,
  };

  it("defaults onboardingCompleted to false when absent (pre-existing settings)", () => {
    const parsed = AppSettingsSchema.parse(baseStored);
    expect(parsed.onboardingCompleted).toBe(false);
  });

  it("round-trips an explicit true", () => {
    const parsed = AppSettingsSchema.parse({
      ...baseStored,
      onboardingCompleted: true,
    });
    expect(parsed.onboardingCompleted).toBe(true);
  });
});
