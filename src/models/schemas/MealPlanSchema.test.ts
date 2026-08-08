import { MealSlotSchema } from "./MealPlanSchema";

const baseSlot = {
  id: "slot-1",
  date: "2026-07-18",
  type: "dinner" as const,
};

describe("MealSlotSchema — standalone text and linked recipe notes", () => {
  it("accepts canonical text-only, recipe-only, and recipe-plus-note slots", () => {
    expect(
      MealSlotSchema.parse({ ...baseSlot, text: "Dinner at Mum's" }),
    ).toEqual({ ...baseSlot, text: "Dinner at Mum's" });

    expect(
      MealSlotSchema.parse({ ...baseSlot, recipeId: "recipe-1" }),
    ).toEqual({ ...baseSlot, recipeId: "recipe-1" });

    expect(
      MealSlotSchema.parse({
        ...baseSlot,
        recipeId: "recipe-1",
        note: "Make it mild",
      }),
    ).toEqual({
      ...baseSlot,
      recipeId: "recipe-1",
      note: "Make it mild",
    });
  });

  it("normalizes a legacy note-only slot to standalone text", () => {
    expect(
      MealSlotSchema.parse({ ...baseSlot, note: "Takeaway" }),
    ).toEqual({ ...baseSlot, text: "Takeaway" });
  });

  it("rejects empty and text-plus-recipe slots", () => {
    expect(MealSlotSchema.safeParse(baseSlot).success).toBe(false);
    expect(
      MealSlotSchema.safeParse({
        ...baseSlot,
        text: "Different meal",
        recipeId: "recipe-1",
      }).success,
    ).toBe(false);
  });
});
