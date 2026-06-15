import { act } from "react-test-renderer";

import type { CookbookInput } from "@/models/types";
import { renderHook } from "@/test-utils/renderHook";
import { useCookbookController } from "./useCookbookController";

jest.mock("../models/repositories/CookbookRepository", () => {
  const mockCookbookRepository = {
    create: jest.fn(),
    delete: jest.fn(),
    getAll: jest.fn(),
    getById: jest.fn(),
    getCookbooks: jest.fn(),
    remove: jest.fn(),
    update: jest.fn(),
  };

  return {
    CookbookRepository: jest.fn(() => mockCookbookRepository),
    mockCookbookRepository,
  };
});

const { mockCookbookRepository } = jest.requireMock(
  "../models/repositories/CookbookRepository",
);

describe("useCookbookController", () => {
  beforeEach(() => {
    mockCookbookRepository.create.mockReset();
    mockCookbookRepository.delete.mockReset();
    mockCookbookRepository.getAll.mockReset();
    mockCookbookRepository.getById.mockReset();
    mockCookbookRepository.getCookbooks.mockReset();
    mockCookbookRepository.remove.mockReset();
    mockCookbookRepository.update.mockReset();
    jest.spyOn(Date, "now").mockReturnValue(1234567890);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("creates a cookbook with a slugged id and normalized fields", async () => {
    mockCookbookRepository.create.mockImplementation(
      async (id: string, payload: CookbookInput) => ({
        id,
        ...payload,
      }),
    );
    const { result } = renderHook(() => useCookbookController());

    let created;
    await act(async () => {
      created = await result.current.createCookbook({
        title: "  Bread & Butter  ",
        description: "  Golden recipes  ",
        parentId: null,
      });
    });

    expect(mockCookbookRepository.create).toHaveBeenCalledWith(
      "bread-butter-kf12oi",
      {
        title: "Bread & Butter",
        description: "Golden recipes",
        parentId: null,
        recipeIds: [],
      },
    );
    expect(created).toEqual({
      id: "bread-butter-kf12oi",
      title: "Bread & Butter",
      description: "Golden recipes",
      parentId: null,
      recipeIds: [],
    });
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it("returns top-level and nested cookbook collections", async () => {
    const cookbooks = [{ id: "cookbook-1", title: "Dinner", recipeIds: [] }];
    mockCookbookRepository.getCookbooks.mockResolvedValue(cookbooks);
    const { result } = renderHook(() => useCookbookController());

    let loaded;
    await act(async () => {
      loaded = await result.current.getCookbooks("parent-1");
    });

    expect(mockCookbookRepository.getCookbooks).toHaveBeenCalledWith(
      "parent-1",
    );
    expect(loaded).toEqual(cookbooks);
  });

  it("updates a cookbook by merging unchanged fields from the existing record", async () => {
    const existing = {
      id: "cookbook-1",
      title: "Dinner",
      description: "Weeknights",
      parentId: "parent-1",
      recipeIds: ["recipe-1"],
    };
    mockCookbookRepository.getById.mockResolvedValue(existing);
    mockCookbookRepository.update.mockImplementation(
      async (_id: string, payload: CookbookInput) => ({
        id: existing.id,
        ...payload,
      }),
    );
    const { result } = renderHook(() => useCookbookController());

    let updatedCookbook;
    await act(async () => {
      updatedCookbook = await result.current.updateCookbook("cookbook-1", {
        description: "Weekend dinners",
      });
    });

    expect(mockCookbookRepository.update).toHaveBeenCalledWith("cookbook-1", {
      title: "Dinner",
      description: "Weekend dinners",
      parentId: "parent-1",
      recipeIds: ["recipe-1"],
    });
    expect(updatedCookbook).toEqual({
      id: "cookbook-1",
      title: "Dinner",
      description: "Weekend dinners",
      parentId: "parent-1",
      recipeIds: ["recipe-1"],
    });
  });

  it("surfaces a cookbook not found error during update", async () => {
    mockCookbookRepository.getById.mockResolvedValue(null);
    const { result } = renderHook(() => useCookbookController());

    let caughtError;
    await act(async () => {
      try {
        await result.current.updateCookbook("missing", {
          title: "Updated",
        });
      } catch (error) {
        caughtError = error;
      }
    });

    expect(caughtError).toEqual(new Error("Cookbook not found."));
    expect(result.current.error).toBe("Cookbook not found.");
  });

  it("deletes an existing cookbook", async () => {
    mockCookbookRepository.getById.mockResolvedValue({
      id: "cookbook-1",
      title: "Dinner",
      description: undefined,
      parentId: null,
      recipeIds: [],
    });
    mockCookbookRepository.delete.mockResolvedValue(undefined);
    const { result } = renderHook(() => useCookbookController());

    await act(async () => {
      await result.current.deleteCookbook("cookbook-1");
    });

    expect(mockCookbookRepository.delete).toHaveBeenCalledWith("cookbook-1");
    expect(result.current.error).toBeNull();
  });

  it("loads all cookbooks and surfaces repository failures", async () => {
    mockCookbookRepository.getAll.mockRejectedValue(new Error("db down"));
    const { result } = renderHook(() => useCookbookController());

    let caughtError;
    await act(async () => {
      try {
        await result.current.getAllCookbooks();
      } catch (error) {
        caughtError = error;
      }
    });

    expect(caughtError).toEqual(new Error("db down"));
    expect(result.current.error).toBe("Could not load cookbooks.");
  });
});
