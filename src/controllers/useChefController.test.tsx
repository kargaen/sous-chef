import { act } from "react-test-renderer";

import { renderHook } from "@/test-utils/renderHook";
import { useChefController } from "./useChefController";

jest.mock("../models/repositories/ChefProfileRepository", () => {
  const mockChefProfileRepository = {
    get: jest.fn(),
    save: jest.fn(),
    clear: jest.fn(),
  };
  return {
    ChefProfileRepository: jest.fn(() => mockChefProfileRepository),
    mockChefProfileRepository,
  };
});

jest.mock("../services/HabitService", () => ({
  HabitService: { record: jest.fn() },
}));

jest.mock("expo-crypto", () => ({
  randomUUID: jest.fn(() => "00000000-0000-4000-8000-000000000000"),
}));

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

const { mockChefProfileRepository } = jest.requireMock(
  "../models/repositories/ChefProfileRepository",
);

// RFC 4122 §4.4 — UUID version 4 layout.
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe("useChefController — id format", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockChefProfileRepository.get.mockResolvedValue(null);
    mockChefProfileRepository.save.mockResolvedValue(undefined);
  });

  it("mints a UUID v4 id for a brand-new profile draft", async () => {
    const { result } = renderHook(() => useChefController());

    await act(async () => {
      await result.current.saveProfileDraft({
        name: "Robin",
        region: "DK",
        skillLevel: "home cook",
        preferences: { dietary: [], dislikedIngredients: [] },
      });
    });

    expect(mockChefProfileRepository.save).toHaveBeenCalledTimes(1);
    const savedProfile = mockChefProfileRepository.save.mock.calls[0][0];
    expect(savedProfile.id).toMatch(UUID_V4);
  });
});
