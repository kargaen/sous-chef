import { PendingSignupRepository } from "./PendingSignupRepository";

jest.mock("@/services/StorageService", () => {
  const store = new Map<string, string>();
  const StorageService = {
    storageGetItem: jest.fn(async (key: string) => store.get(key) ?? null),
    storageSetItem: jest.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    storageRemoveItem: jest.fn(async (key: string) => {
      store.delete(key);
    }),
    __store: store,
  };
  return { StorageService };
});

const { StorageService } = jest.requireMock("@/services/StorageService");

describe("PendingSignupRepository", () => {
  const repo = new PendingSignupRepository();

  beforeEach(() => {
    StorageService.__store.clear();
    jest.clearAllMocks();
  });

  it("returns null when nothing is pending", async () => {
    expect(await repo.get()).toBeNull();
  });

  it("round-trips a pending signup", async () => {
    const pending = {
      email: "cook@example.com",
      lastSentAt: "2026-07-12T10:00:00.000Z",
    };

    await repo.save(pending);

    expect(await repo.get()).toEqual(pending);
  });

  it("save replaces an existing pending signup", async () => {
    await repo.save({
      email: "old@example.com",
      lastSentAt: "2026-07-12T09:00:00.000Z",
    });
    await repo.save({
      email: "new@example.com",
      lastSentAt: "2026-07-12T10:00:00.000Z",
    });

    expect((await repo.get())?.email).toBe("new@example.com");
  });

  it("clear removes the pending signup", async () => {
    await repo.save({
      email: "cook@example.com",
      lastSentAt: "2026-07-12T10:00:00.000Z",
    });

    await repo.clear();

    expect(await repo.get()).toBeNull();
  });

  it("returns null on corrupt stored data instead of throwing", async () => {
    StorageService.__store.set("pending_signup", "{not json");

    expect(await repo.get()).toBeNull();
  });

  it("returns null when the stored shape is wrong", async () => {
    StorageService.__store.set(
      "pending_signup",
      JSON.stringify({ email: 42 }),
    );

    expect(await repo.get()).toBeNull();
  });
});
