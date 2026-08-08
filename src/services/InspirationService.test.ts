import type { Inspiration } from "../models/types";
import { InspirationService } from "./InspirationService";
import { LLMService } from "./LLMService";

jest.mock("../models/repositories/InspirationRepository", () => {
  const mockInspirationRepo = {
    getActive: jest.fn(),
    mint: jest.fn(),
  };
  return {
    InspirationRepository: jest.fn(() => mockInspirationRepo),
    mockInspirationRepo,
  };
});

jest.mock("../models/repositories/ChefProfileRepository", () => ({
  ChefProfileRepository: jest.fn(() => ({ get: jest.fn() })),
}));

jest.mock("../models/repositories/PantryRepository", () => ({
  PantryRepository: jest.fn(() => ({ getExpiringSoon: jest.fn() })),
}));

jest.mock("../models/repositories/CookLogRepository", () => ({
  CookLogRepository: jest.fn(() => ({ getRecentCooks: jest.fn() })),
}));

jest.mock("../models/repositories/RecipeRepository", () => ({
  RecipeRepository: jest.fn(() => ({ fetchById: jest.fn() })),
}));

jest.mock("../models/repositories/SettingsRepository", () => ({
  SettingsRepository: jest.fn(() => ({ get: jest.fn().mockResolvedValue({ learnFromChats: false }) })),
}));

jest.mock("../models/repositories/DismissalRepository", () => ({
  DismissalRepository: jest.fn(() => ({ getRecentTitles: jest.fn() })),
}));

jest.mock("./LLMService", () => ({
  LLMService: { send: jest.fn() },
}));

jest.mock("../models/data/discoverThemes", () => ({
  monthToSeason: jest.fn(() => "summer"),
}));

jest.mock("../utils/dailySeed", () => ({
  getDailySeed: jest.fn(() => 20260718),
}));

const { mockInspirationRepo } = jest.requireMock(
  "../models/repositories/InspirationRepository",
) as {
  mockInspirationRepo: {
    getActive: jest.Mock;
    mint: jest.Mock;
  };
};

const makeSpark = (title: string): Inspiration => ({
  id: `spark-${title}`,
  kind: "spark",
  title,
  hook: `${title} hook`,
  payload: { seedPrompt: title },
  source: "test",
  dedupeKey: `spark:${title}`,
  relevance: 0.55,
  createdAt: "2026-07-18T00:00:00.000Z",
  expiresAt: "2026-07-19T00:00:00.000Z",
});

describe("InspirationService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (LLMService.send as jest.Mock).mockRejectedValue(new Error("offline"));
  });

  it("keeps deterministic fallback sparks distinct from titles already on screen", async () => {
    const existing = [
      makeSpark("Cook Something New"),
      makeSpark("Clear-the-Fridge Stir-Fry"),
    ];
    const minted: Inspiration[] = [];

    (mockInspirationRepo.getActive as jest.Mock).mockImplementation(({ kind }) =>
      kind === "spark" ? [...existing, ...minted] : [],
    );
    (mockInspirationRepo.mint as jest.Mock).mockImplementation((input) => {
      const spark = makeSpark(input.title);
      minted.push(spark);
      return spark;
    });

    await InspirationService.refreshSparks();

    expect(mockInspirationRepo.mint).toHaveBeenCalledTimes(4);
    const mintedTitles = (mockInspirationRepo.mint as jest.Mock).mock.calls.map(
      ([input]) => input.title,
    );
    expect(new Set(mintedTitles).size).toBe(mintedTitles.length);
    expect(mintedTitles).not.toContain("Cook Something New");
    expect(mintedTitles).not.toContain("Clear-the-Fridge Stir-Fry");
  });
});
