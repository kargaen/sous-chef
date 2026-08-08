import React from "react";
import TestRenderer, { act } from "react-test-renderer";

jest.mock("react-native", () => {
  const React = require("react");
  const make = (name: string) => {
    function MockComponent(props: Record<string, unknown>) {
      return React.createElement(name, props, props.children);
    }

    MockComponent.displayName = name;
    return MockComponent;
  };

  return {
    Alert: { alert: jest.fn() },
    StyleSheet: { create: (styles: unknown) => styles },
    ScrollView: make("ScrollView"),
    Text: make("Text"),
    TextInput: make("TextInput"),
    TouchableOpacity: make("TouchableOpacity"),
    View: make("View"),
  };
});

import { Alert, Text } from "react-native";

import ReflectionScreen from "./ReflectionScreen";

const mockGoBack = jest.fn();
const mockOnSave = jest.fn();
const mockOnSkip = jest.fn();
const mockSaveLeftoversFromCook = jest.fn();

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ id: "recipe-1" }),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("@/views/hooks/useSafeBack", () => ({
  useSafeBack: () => mockGoBack,
}));

jest.mock("@/controllers", () => ({
  useReflectionController: () => ({
    recipe: null,
    recipeTitle: "Soup",
    loading: false,
    dimensions: [],
    overallScore: 0,
    setOverallScore: jest.fn(),
    dimensionScores: {},
    setDimensionScore: jest.fn(),
    note: "",
    setNote: jest.fn(),
    saving: false,
    onSave: mockOnSave,
    onSkip: mockOnSkip,
  }),
}));

jest.mock("@/controllers/usePantryController", () => ({
  usePantryController: () => ({
    saveLeftoversFromCook: mockSaveLeftoversFromCook,
  }),
}));

jest.mock("@/views/components/ui", () => {
  const React = require("react");
  const { Text } = require("react-native");

  return {
    Button: ({ label, onPress }: { label: string; onPress: () => void }) =>
      React.createElement(Text, { onPress }, label),
    HatRating: () => React.createElement(Text, null, "HatRating"),
    Spinner: ({ label }: { label: string }) =>
      React.createElement(Text, null, label),
  };
});

jest.mock("@/views/components/recipe/RecipePhotoEditor", () => {
  const React = require("react");
  const { Text } = require("react-native");

  return {
    RecipePhotoEditor: () => React.createElement(Text, null, "RecipePhotoEditor"),
  };
});

jest.mock("@/views/components/companion", () => {
  const React = require("react");
  const { Text } = require("react-native");

  return {
    SousChefMark: () => React.createElement(Text, null, "SousChefMark"),
  };
});

const pressSave = (renderer: any) => {
  const saveButton = renderer.root.findAll((node: any) =>
    node.props.onPress && node.children.includes("Save"),
  )[0];
  if (!saveButton?.props.onPress) {
    throw new Error("Save button not found");
  }
  saveButton.props.onPress();
};

const pressSkip = (renderer: any) => {
  const skipButton = renderer.root.findAll((node: any) =>
    node.props.onPress && node.children.includes("Skip"),
  )[0];
  if (!skipButton?.props.onPress) {
    throw new Error("Skip button not found");
  }
  skipButton.props.onPress();
};

describe("ReflectionScreen register-cook flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOnSave.mockResolvedValue(true);
    jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("records once, saves leftovers once, and returns after the pantry choice", async () => {
    mockSaveLeftoversFromCook.mockResolvedValue(true);
    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<ReflectionScreen />);
    });

    await act(async () => {
      pressSave(renderer);
    });

    const buttons = (Alert.alert as jest.Mock).mock.calls[0][2];
    await act(async () => {
      buttons[1].onPress();
      await Promise.resolve();
    });

    expect(mockOnSave).toHaveBeenCalledTimes(1);
    expect(mockSaveLeftoversFromCook).toHaveBeenCalledTimes(1);
    expect(mockSaveLeftoversFromCook).toHaveBeenCalledWith("Soup");
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it("still returns after a rejected leftover save", async () => {
    mockSaveLeftoversFromCook.mockRejectedValue(new Error("LLM quota exhausted"));
    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<ReflectionScreen />);
    });

    await act(async () => {
      pressSave(renderer);
    });

    const buttons = (Alert.alert as jest.Mock).mock.calls[0][2];
    await act(async () => {
      buttons[1].onPress();
      await Promise.resolve();
    });

    expect(mockOnSave).toHaveBeenCalledTimes(1);
    expect(mockSaveLeftoversFromCook).toHaveBeenCalledTimes(1);
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it("keeps the skip path as one bare cook record and one return", async () => {
    mockOnSkip.mockResolvedValue(true);
    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<ReflectionScreen />);
    });

    await act(async () => {
      pressSkip(renderer);
      await Promise.resolve();
    });

    expect(mockOnSkip).toHaveBeenCalledTimes(1);
    expect(mockOnSave).not.toHaveBeenCalled();
    expect(mockSaveLeftoversFromCook).not.toHaveBeenCalled();
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
