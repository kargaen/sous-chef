import React from "react";
import TestRenderer, { act } from "react-test-renderer";

import type { Recipe, SlotInput } from "@/models/types";

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

import { AddToDayInput } from "./AddToDayInput.view";

const recipe = (id: string, title: string): Recipe => ({
  id,
  title,
  description: "",
  servings: 2,
  prepMinutes: 0,
  cookMinutes: 0,
  ingredients: [],
  steps: [],
  tags: [],
  createdDate: "2026-07-18",
  lastUpdatedDate: "2026-07-18",
});

describe("AddToDayInput recipe autocomplete", () => {
  it("shows contained title matches and submits the selected recipe id", () => {
    const onSubmit = jest.fn();
    const selectedRecipeInput = {
      recipeId: "recipe-spicy",
      note: "",
    } satisfies SlotInput;
    let renderer: any;

    act(() => {
      renderer = TestRenderer.create(
        <AddToDayInput
          date="2026-07-19"
          recipes={[
            recipe("recipe-tortillas", "Tortillas"),
            recipe("recipe-spicy", "Spicy Tortillas"),
            recipe("recipe-soup", "Tomato Soup"),
          ]}
          onSubmit={onSubmit}
        />,
      );
    });

    act(() => {
      renderer!.root.find(
        (node: any) =>
          node.type === "Pressable" &&
          node.props.accessibilityLabel === "Add something to this day",
      ).props.onPress();
    });

    act(() => {
      renderer!.root.findByType("TextInput").props.onChangeText("Tor");
    });

    expect(
      renderer!.root.findAll(
        (node: any) =>
          node.type === "Pressable" &&
          node.props.accessibilityLabel === "Select Tortillas",
      ),
    ).toHaveLength(1);
    expect(
      renderer!.root.findAll(
        (node: any) =>
          node.type === "Pressable" &&
          node.props.accessibilityLabel === "Select Spicy Tortillas",
      ),
    ).toHaveLength(1);
    expect(
      renderer!.root.findAll(
        (node: any) =>
          node.type === "Pressable" &&
          node.props.accessibilityLabel === "Select Tomato Soup",
      ),
    ).toHaveLength(0);

    act(() => {
      renderer!.root.find(
        (node: any) =>
          node.type === "Pressable" &&
          node.props.accessibilityLabel === "Select Spicy Tortillas",
      ).props.onPress();
    });

    expect(
      renderer!.root.findAll(
        (node: any) =>
          node.type === "Text" && node.children.includes("Spicy Tortillas"),
      ),
    ).toHaveLength(1);

    act(() => {
      renderer!.root.find(
        (node: any) =>
          node.type === "Pressable" &&
          node.props.accessibilityLabel === "Save slot",
      ).props.onPress();
    });

    expect(onSubmit).toHaveBeenCalledWith("dinner", selectedRecipeInput);
  });
});
