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
    StyleSheet: { create: (styles: unknown) => styles },
    Text: make("Text"),
    View: make("View"),
  };
});

jest.mock("../AddToDayInput", () => {
  const React = require("react");
  return {
    AddToDayInput: (props: unknown) =>
      React.createElement("AddToDayInput", props),
  };
});

jest.mock("../PlannedSlotRow", () => {
  const React = require("react");
  return {
    PlannedSlotRow: (props: unknown) =>
      React.createElement("PlannedSlotRow", props),
    SuggestionSlotRow: (props: unknown) =>
      React.createElement("SuggestionSlotRow", props),
  };
});

import { DaySection } from "./DaySection.view";

const Subject = DaySection as React.ComponentType<any>;

describe("DaySection planned-meal lifecycle handoff", () => {
  it("forwards derived state and exact lifecycle callbacks to each planned row", () => {
    const textSlot: MealSlot = {
      id: "slot-text",
      date: "2026-07-20",
      type: "dinner",
      text: "Pasta night",
    };
    const linkedSlot: MealSlot = {
      id: "slot-linked",
      date: "2026-07-20",
      type: "dinner",
      recipeId: "recipe-curry",
      note: "non spicy",
    };
    const isSlotCooked = jest.fn((slot: MealSlot) => slot.id === "slot-linked");
    const onCreateRecipe = jest.fn();
    const onCreateVariant = jest.fn();
    let renderer: any;

    act(() => {
      renderer = TestRenderer.create(
        <Subject
          date="2026-07-20"
          dateLabel="Monday 20 July"
          isToday={false}
          slots={[textSlot, linkedSlot]}
          suggestionSlots={[]}
          pendingActions={[]}
          savedRecipes={[]}
          resolveRecipeTitle={(id: string) =>
            id === "recipe-curry" ? "Tom's Curry" : null
          }
          onAddSlot={jest.fn()}
          onRemoveSlot={jest.fn()}
          isSlotCooked={isSlotCooked}
          convertingSlotId="slot-text"
          onCreateRecipe={onCreateRecipe}
          onCreateVariant={onCreateVariant}
          onAcceptSuggestion={jest.fn()}
          onRejectSuggestion={jest.fn()}
        />,
      );
    });

    const rows = renderer.root.findAllByType("PlannedSlotRow");
    expect(rows).toHaveLength(2);
    expect(rows[0].props.isCooked).toBe(false);
    expect(rows[1].props.isCooked).toBe(true);
    expect(rows[0].props.convertingSlotId).toBe("slot-text");
    expect(rows[1].props.convertingSlotId).toBe("slot-text");

    act(() => {
      rows[0].props.onCreateRecipe("slot-text");
      rows[1].props.onCreateVariant("slot-linked");
    });

    expect(isSlotCooked).toHaveBeenCalledWith(textSlot);
    expect(isSlotCooked).toHaveBeenCalledWith(linkedSlot);
    expect(onCreateRecipe).toHaveBeenCalledTimes(1);
    expect(onCreateRecipe).toHaveBeenCalledWith("slot-text");
    expect(onCreateVariant).toHaveBeenCalledTimes(1);
    expect(onCreateVariant).toHaveBeenCalledWith("slot-linked");
  });
});
