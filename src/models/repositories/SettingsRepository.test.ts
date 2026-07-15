import { SettingsRepository } from "./SettingsRepository";

jest.mock("@/services/StorageService", () => {
  const store = new Map<string, string>();
  return {
    StorageService: {
      storageGetItem: jest.fn(async (key: string) => store.get(key) ?? null),
      storageSetItem: jest.fn(async (key: string, value: string) => {
        store.set(key, value);
      }),
      storageRemoveItem: jest.fn(async (key: string) => {
        store.delete(key);
      }),
      __store: store,
    },
  };
});

const { StorageService } = jest.requireMock("@/services/StorageService");

// A settings blob as it would have been saved before onboardingCompleted
// existed — valid, but missing that one key.
const legacyBlob = JSON.stringify({
  geminiApiKey: "abc",
  keepScreenOn: true,
  sustainabilityNudges: "default",
  learnFromChats: true,
  assistantOutputLanguage: "imply",
  skipSafetyLayer1: false,
});

describe("SettingsRepository — onboarding completion migration", () => {
  const repo = new SettingsRepository();

  beforeEach(() => {
    StorageService.__store.clear();
    jest.clearAllMocks();
  });

  it("migrates a pre-onboardingCompleted blob to true and persists it", async () => {
    StorageService.__store.set("app_settings", legacyBlob);

    const settings = await repo.get();

    expect(settings.onboardingCompleted).toBe(true);
    const saved = JSON.parse(StorageService.__store.get("app_settings"));
    expect(saved.onboardingCompleted).toBe(true);
  });

  it("leaves a fresh install (no stored blob) at false so it onboards", async () => {
    const settings = await repo.get();

    expect(settings.onboardingCompleted).toBe(false);
  });

  it("does not migrate a blob that already carries onboardingCompleted", async () => {
    StorageService.__store.set(
      "app_settings",
      JSON.stringify({ ...JSON.parse(legacyBlob), onboardingCompleted: false }),
    );

    const settings = await repo.get();

    expect(settings.onboardingCompleted).toBe(false);
  });
});
