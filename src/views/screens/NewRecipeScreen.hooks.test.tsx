import { act } from "react-test-renderer";

import { renderHook } from "@/test-utils/renderHook";
import { useNewRecipeScreenView } from "./NewRecipeScreen.hooks";

let mockCurrentParams: { cookbookId?: string; seed?: string } = {};
const mockSetDraft = jest.fn();

jest.mock("expo-router", () => {
  const ReactRuntime = jest.requireActual("react") as typeof import("react");
  const mockRouter = {
    back: jest.fn(),
    push: jest.fn(),
    canGoBack: jest.fn(() => true),
  };

  return {
    mockRouter,
    useFocusEffect: (callback: () => void | (() => void)) => {
      ReactRuntime.useEffect(() => callback(), [callback]);
    },
    useLocalSearchParams: () => mockCurrentParams,
    useRouter: () => mockRouter,
  };
});

jest.mock("@/controllers", () => {
  const mockRecipeController = {
    getClipboardRecipeSourceSuggestion: jest.fn(),
    importRecipeSource: jest.fn(),
  };

  return {
    mockRecipeController,
    useRecipeController: () => mockRecipeController,
  };
});

jest.mock("@/store", () => ({
  useRecipeDraftStore: (selector: (state: { setDraft: jest.Mock }) => unknown) =>
    selector({ setDraft: mockSetDraft }),
}));

const { mockRouter } = jest.requireMock("expo-router");
const { mockRecipeController } = jest.requireMock("@/controllers");

describe("useNewRecipeScreenView", () => {
  beforeEach(() => {
    mockCurrentParams = {};
    mockRouter.back.mockReset();
    mockRouter.push.mockReset();
    mockSetDraft.mockReset();
    mockRecipeController.getClipboardRecipeSourceSuggestion.mockReset();
    mockRecipeController.importRecipeSource.mockReset();
    mockRecipeController.getClipboardRecipeSourceSuggestion.mockResolvedValue({
      kind: "none",
      value: null,
    });
  });

  it("prefills a recipe url from the clipboard when there is no seed", async () => {
    mockRecipeController.getClipboardRecipeSourceSuggestion.mockResolvedValue({
      kind: "url",
      value: "https://example.com/recipe",
    });

    const { result } = renderHook(() => useNewRecipeScreenView());

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.sourceMode).toBe("url");
    expect(result.current.sourceInput).toBe("https://example.com/recipe");
    expect(result.current.sourceFeedback).toBe(
      "Recipe link picked up from your clipboard.",
    );
  });

  // After a successful import the hook stages the draft in the draft store and
  // navigates to the draft screen — it no longer holds the recipe fields itself
  // (those are edited on RecipeDraftScreen).
  it.each([
    ["url", "https://example.com/pasta", null],
    [
      "idea",
      "A bright spring pasta with peas and lemon",
      {
        title: "Spring Pasta",
        ingredientsText: "200g pasta\n1 lemon",
        stepsText: "Boil the pasta\nFinish with lemon",
        notes: "Built from a rough idea.",
      },
    ],
    [
      "paste",
      "Title: Pantry Soup\nIngredients: beans, tomato",
      {
        title: "Pantry Soup",
        ingredientsText: "1 can beans\n2 tomatoes",
        stepsText: "Simmer\nSeason",
        notes: "Cleaned from pasted text.",
      },
    ],
  ] as const)(
    "imports the %s source into the draft store and opens the draft screen",
    async (sourceMode, sourceInput, importedDraft) => {
      mockRecipeController.importRecipeSource.mockResolvedValue(importedDraft);
      const { result } = renderHook(() => useNewRecipeScreenView());

      await act(async () => {
        await Promise.resolve();
      });

      act(() => {
        result.current.setSourceMode(sourceMode);
      });
      act(() => {
        result.current.setSourceInput(sourceInput);
      });

      await act(async () => {
        await result.current.handleImportSource();
      });

      expect(mockRecipeController.importRecipeSource).toHaveBeenCalledWith({
        sourceMode,
        source: sourceInput,
      });

      if (importedDraft) {
        expect(mockSetDraft).toHaveBeenCalledWith(
          expect.objectContaining({
            title: importedDraft.title,
            ingredientsText: importedDraft.ingredientsText,
            stepsText: importedDraft.stepsText,
            notes: importedDraft.notes,
            cookbookId: null,
          }),
        );
        expect(mockRouter.push).toHaveBeenCalledWith("/(tabs)/recipes/draft");
      } else {
        expect(mockSetDraft).not.toHaveBeenCalled();
        expect(mockRouter.push).not.toHaveBeenCalled();
      }
    },
  );
});
