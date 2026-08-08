import React from "react";
import TestRenderer, { act } from "react-test-renderer";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

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
    Pressable: make("Pressable"),
    ScrollView: make("ScrollView"),
    StyleSheet: { create: (styles: unknown) => styles },
    Text: make("Text"),
    TextInput: make("TextInput"),
    View: make("View"),
  };
});

jest.mock("@expo/vector-icons", () => {
  const React = require("react");
  return { Feather: (props: unknown) => React.createElement("Feather", props) };
});

jest.mock("@react-native-community/datetimepicker", () => {
  const React = require("react");
  function DateTimePickerMock(props: unknown) {
    return React.createElement("DateTimePicker", props);
  }

  return DateTimePickerMock;
});

const activePlanFixture = {
    id: "plan-1",
    weekStartDate: "2026-07-19",
    dayCount: 1,
    slots: [
      {
        id: "slot-1",
        date: "2026-07-19",
        type: "dinner",
        recipeId: "recipe-curry",
      },
    ],
  };

const mockController = {
  activePlan: activePlanFixture as typeof activePlanFixture | null,
  acceptAllSuggestions: jest.fn(),
  acceptSlotVariant: jest.fn(),
  acceptSuggestion: jest.fn(),
  addSuggestionSlot: jest.fn(),
  applyPendingAdaptation: jest.fn(),
  createPlan: jest.fn(),
  createRecipeForSlot: jest.fn(),
  defaultPlanLength: 7,
  dismissAllSuggestions: jest.fn(),
  draftSlots: [],
  error: null,
  extendPlan: jest.fn(),
  generateFromRequest: jest.fn(),
  loadPlanForWeek: jest.fn(),
  loading: false,
  markSlotCooked: jest.fn(),
  pendingActions: [],
  pendingSlotVariant: null as null | {
    slotId: string;
    recipe: { id: string; title: string };
  },
  presets: [],
  removeSlot: jest.fn(),
  removeSuggestionSlot: jest.fn(),
  requestSlotVariant: jest.fn(),
  savePreset: jest.fn(),
  savedRecipes: [{ id: "recipe-curry", title: "Tom's Curry" }],
  submitSlotInput: jest.fn(),
  suggestForSlot: jest.fn(),
  cancelSlotVariant: jest.fn(),
  convertingSlotId: null as string | null,
  isSlotCooked: jest.fn(() => false),
  weekStartDay: 0,
};

jest.mock("@/controllers/useMealPlanController", () => ({
  useMealPlanController: () => mockController,
}));

jest.mock("@/controllers", () => ({
  useRegisterAssistantContext: jest.fn(),
}));

jest.mock("@/views/components/ui", () => {
  const React = require("react");
  return { Button: (props: unknown) => React.createElement("Button", props) };
});

jest.mock("../components/meal-plan", () => {
  const React = require("react");
  return {
    DaySection: (props: any) =>
      React.createElement(
        React.Fragment,
        null,
        React.createElement("Pressable", {
          accessibilityLabel: "Open planned recipe",
          onPress: () => props.onOpenRecipe("recipe-curry"),
        }),
        React.createElement("Pressable", {
          accessibilityLabel: "Create planned recipe",
          onPress: () => props.onCreateRecipe("slot-text"),
        }),
        React.createElement("Pressable", {
          accessibilityLabel: "Create planned recipe variant",
          onPress: () => props.onCreateVariant("slot-linked"),
        }),
      ),
    NudgeSettingsInline: () => React.createElement("NudgeSettingsInline"),
    PlanRequestBox: () => React.createElement("PlanRequestBox"),
  };
});

jest.mock("../../utils/planDateUtils", () => ({
  eachPlanDay: () => ["2026-07-19"],
  formatDayLabel: (date: string) => date,
  planStart: () => "2026-07-19",
  todayKey: () => "2026-07-19",
}));

import MealPlanScreen from "./MealPlanScreen";

describe("MealPlanScreen linked recipe navigation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockController.activePlan = activePlanFixture;
    mockController.pendingSlotVariant = null;
  });

  it("opens the exact recipe referenced by the planned slot", () => {
    let renderer: any;

    act(() => {
      renderer = TestRenderer.create(<MealPlanScreen />);
    });

    act(() => {
      renderer.root.find(
        (node: any) =>
          node.type === "Pressable" &&
          node.props.accessibilityLabel === "Open planned recipe",
      ).props.onPress();
    });

    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith("/recipe/recipe-curry");
  });

  it("hands exact planned slot ids to recipe creation and variant requests", () => {
    let renderer: any;

    act(() => {
      renderer = TestRenderer.create(<MealPlanScreen />);
    });

    act(() => {
      renderer.root.find(
        (node: any) =>
          node.type === "Pressable" &&
          node.props.accessibilityLabel === "Create planned recipe",
      ).props.onPress();
      renderer.root.find(
        (node: any) =>
          node.type === "Pressable" &&
          node.props.accessibilityLabel === "Create planned recipe variant",
      ).props.onPress();
    });

    expect(mockController.createRecipeForSlot).toHaveBeenCalledTimes(1);
    expect(mockController.createRecipeForSlot).toHaveBeenCalledWith("slot-text");
    expect(mockController.requestSlotVariant).toHaveBeenCalledTimes(1);
    expect(mockController.requestSlotVariant).toHaveBeenCalledWith("slot-linked");
  });

  it("reviews a pending variant with accept and cancel actions without navigating", () => {
    mockController.pendingSlotVariant = {
      slotId: "slot-linked",
      recipe: { id: "recipe-mild", title: "Tom's Curry — Mild" },
    };
    let renderer: any;

    act(() => {
      renderer = TestRenderer.create(<MealPlanScreen />);
    });

    const accept = renderer.root.findAll(
      (node: any) =>
        node.type === "Pressable" &&
        node.props.accessibilityLabel === "Accept planned recipe variant",
    );
    const cancel = renderer.root.findAll(
      (node: any) =>
        node.type === "Pressable" &&
        node.props.accessibilityLabel === "Cancel planned recipe variant",
    );
    expect(accept).toHaveLength(1);
    expect(cancel).toHaveLength(1);

    act(() => {
      accept[0].props.onPress();
      cancel[0].props.onPress();
    });

    expect(mockController.acceptSlotVariant).toHaveBeenCalledTimes(1);
    expect(mockController.cancelSlotVariant).toHaveBeenCalledTimes(1);
    expect(mockPush).not.toHaveBeenCalled();
  });
});

describe("MealPlanScreen start-date selection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockController.activePlan = null;
    mockController.pendingSlotVariant = null;
  });

  const openPicker = (renderer: any) => {
    act(() => {
      renderer.root.find(
        (node: any) =>
          node.type === "Pressable" &&
          node.props.accessibilityLabel === "Choose plan start date",
      ).props.onPress();
    });
    return renderer.root.findByType("DateTimePicker");
  };

  it("warns immediately for yesterday without blocking plan creation", async () => {
    let renderer: any;
    act(() => {
      renderer = TestRenderer.create(<MealPlanScreen />);
    });

    const picker = openPicker(renderer);
    act(() => {
      picker.props.onChange({}, new Date("2026-07-18T12:00:00.000Z"));
    });

    expect(
      renderer.root.findAll(
        (node: any) =>
          node.type === "Text" &&
          node.children.includes("This date is in the past."),
      ),
    ).toHaveLength(1);

    await act(async () => {
      await renderer.root.find(
        (node: any) => node.type === "Button" && node.props.label === "Create Plan",
      ).props.onPress();
    });

    expect(mockController.createPlan).toHaveBeenCalledWith("2026-07-18", 7);
  });

  it("shows no warning for today and submits a selected non-Monday date", async () => {
    let renderer: any;
    act(() => {
      renderer = TestRenderer.create(<MealPlanScreen />);
    });

    let picker = openPicker(renderer);
    act(() => {
      picker.props.onChange({}, new Date("2026-07-19T12:00:00.000Z"));
    });
    expect(
      renderer.root.findAll(
        (node: any) =>
          node.type === "Text" &&
          node.children.includes("This date is in the past."),
      ),
    ).toHaveLength(0);

    picker = openPicker(renderer);
    act(() => {
      picker.props.onChange({}, new Date("2026-07-23T12:00:00.000Z"));
    });
    expect(
      renderer.root.findAll(
        (node: any) => node.type === "Text" && node.children.includes("2026-07-23"),
      ),
    ).toHaveLength(1);

    await act(async () => {
      await renderer.root.find(
        (node: any) => node.type === "Button" && node.props.label === "Create Plan",
      ).props.onPress();
    });

    expect(mockController.createPlan).toHaveBeenCalledWith("2026-07-23", 7);
  });
});
