import React from "react";
import TestRenderer, { act } from "react-test-renderer";

import type { MealSlot } from "@/models/types";

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
    ActivityIndicator: make("ActivityIndicator"),
    Pressable: make("Pressable"),
    StyleSheet: { create: (styles: unknown) => styles },
    Text: make("Text"),
    View: make("View"),
  };
});

jest.mock("@expo/vector-icons", () => {
  const React = require("react");
  return { Feather: (props: unknown) => React.createElement("Feather", props) };
});

import { PlannedSlotRow } from "./PlannedSlotRow.view";

const slot = (overrides: Partial<MealSlot>): MealSlot => ({
  id: "slot-1",
  date: "2026-07-19",
  type: "dinner",
  ...overrides,
});

const renderRow = (props: Record<string, unknown>) => {
  let renderer: any;

  act(() => {
    renderer = TestRenderer.create(
      <PlannedSlotRow
        slot={slot({ text: "Sunday supper" })}
        pendingActions={[]}
        onRemove={jest.fn()}
        {...props}
      />,
    );
  });

  return renderer!;
};

const buttonsWithLabel = (
  renderer: any,
  label: string,
) =>
  renderer.root.findAll(
    (node: any) =>
      node.type === "Pressable" && node.props.accessibilityLabel === label,
  );

describe("PlannedSlotRow meal actions", () => {
  it("replaces the manual cooked control with a text-slot create recipe action", () => {
    const onCreateRecipe = jest.fn();
    const renderer = renderRow({ onCreateRecipe, onMarkCooked: jest.fn() });

    expect(
      renderer.root.findAll(
        (node: any) =>
          node.type === "Pressable" &&
          String(node.props.accessibilityLabel).startsWith("Mark "),
      ),
    ).toHaveLength(0);

    act(() => {
      buttonsWithLabel(renderer, "Open dinner meal actions")[0].props.onPress();
    });

    expect(buttonsWithLabel(renderer, "Create recipe")).toHaveLength(1);

    act(() => {
      buttonsWithLabel(renderer, "Create recipe")[0].props.onPress();
    });

    expect(onCreateRecipe).toHaveBeenCalledTimes(1);
    expect(onCreateRecipe).toHaveBeenCalledWith("slot-1");
  });

  it("keeps text visible and shows one spinner while that slot is converting", () => {
    const renderer = renderRow({ convertingSlotId: "slot-1" });

    expect(
      renderer.root.findAll(
        (node: any) =>
          node.type === "Text" && node.children.includes("Sunday supper"),
      ),
    ).toHaveLength(1);
    expect(renderer.root.findAllByType("ActivityIndicator")).toHaveLength(1);
  });

  it("offers variant creation only for a linked recipe with a note", () => {
    const onCreateVariant = jest.fn();
    const renderer = renderRow({
      slot: slot({
        text: undefined,
        recipeId: "recipe-curry",
        note: "non spicy",
      }),
      recipeTitle: "Tom's Curry",
      onCreateVariant,
    });

    act(() => {
      buttonsWithLabel(renderer, "Open dinner meal actions")[0].props.onPress();
    });

    expect(buttonsWithLabel(renderer, "Create variant")).toHaveLength(1);
    expect(buttonsWithLabel(renderer, "Create recipe")).toHaveLength(0);
  });

  it("opens a linked recipe with its exact id", () => {
    const onOpenRecipe = jest.fn();
    const renderer = renderRow({
      slot: slot({ text: undefined, recipeId: "recipe-curry" }),
      recipeTitle: "Tom's Curry",
      onOpenRecipe,
    });

    act(() => {
      buttonsWithLabel(renderer, "Open recipe Tom's Curry")[0].props.onPress();
    });

    expect(onOpenRecipe).toHaveBeenCalledTimes(1);
    expect(onOpenRecipe).toHaveBeenCalledWith("recipe-curry");
  });
});

describe("PlannedSlotRow derived cooked presentation", () => {
  const cookedRows = (renderer: any) =>
    renderer.root.findAll(
      (node: any) =>
        node.type === "View" &&
        Array.isArray(node.props.style) &&
        node.props.style.some((style: any) => style?.opacity === 0.65),
    );

  it("ignores the legacy slot status when derived cooked state is false", () => {
    const renderer = renderRow({
      slot: slot({
        text: undefined,
        recipeId: "recipe-curry",
        status: "cooked",
      }),
      recipeTitle: "Tom's Curry",
      isCooked: false,
    });

    expect(cookedRows(renderer)).toHaveLength(0);
    expect(buttonsWithLabel(renderer, "Open dinner meal actions")).toHaveLength(1);
  });

  it("applies cooked presentation only from the derived prop without hiding meal actions", () => {
    const renderer = renderRow({
      slot: slot({ text: undefined, recipeId: "recipe-curry", status: "planned" }),
      recipeTitle: "Tom's Curry",
      isCooked: true,
    });

    expect(cookedRows(renderer)).toHaveLength(1);
    expect(buttonsWithLabel(renderer, "Open dinner meal actions")).toHaveLength(1);
    expect(
      renderer.root.findAll(
        (node: any) =>
          node.type === "Pressable" &&
          String(node.props.accessibilityLabel).startsWith("Mark "),
      ),
    ).toHaveLength(0);
  });
});
