import {
  buildPlanDraftUserMessage,
  parsePlanDraft,
} from "./mealPlanDraft";

const buildMessage = buildPlanDraftUserMessage as (ctx: unknown) => string;
const parseDraft = parsePlanDraft as (
  content: string,
  eligibleDates: string[],
) => ReturnType<typeof parsePlanDraft>;

const availableDays = [
  { label: "Sunday", date: "2026-07-19" },
  { label: "Monday", date: "2026-07-20" },
  { label: "Saturday", date: "2026-07-25" },
  { label: "Saturday", date: "2026-08-01" },
];

const filledSlots = [
  { date: "2026-07-18", type: "dinner", text: "Tortillas" },
];

describe("meal-plan draft targeting", () => {
  it("serializes eligible days and filled slots while preserving legacy context", () => {
    expect(
      JSON.parse(
        buildMessage({
          request: "Draft the rest of the plan",
          availableDays,
          filledSlots,
          month: 7,
          region: "Paris",
          cuisinePreferences: ["Italian"],
          skillLevel: "home cook",
          pantryHighlights: ["tomatoes"],
        }),
      ),
    ).toEqual({
      request: "Draft the rest of the plan",
      availableDays,
      filledSlots,
      month: 7,
      region: "Paris",
      cuisinePreferences: ["Italian"],
      skillLevel: "home cook",
      pantryHighlights: ["tomatoes"],
    });
  });

  it("targets only the first chronological unfilled named weekday", () => {
    const message = JSON.parse(
      buildMessage({
        request: "What should we have on Saturday?",
        availableDays,
        filledSlots,
        month: 7,
        region: null,
        cuisinePreferences: [],
        skillLevel: null,
      }),
    );

    expect(message.availableDays).toEqual([
      { label: "Saturday", date: "2026-07-25" },
    ]);
    expect(message.filledSlots).toEqual(filledSlots);
  });

  it("rejects otherwise valid suggestions outside the eligible dates", () => {
    const content = JSON.stringify([
      {
        date: "2026-07-18",
        type: "dinner",
        title: "Overwrite Existing Meal",
      },
      {
        date: "2026-07-25",
        type: "dinner",
        title: "Summer Tomato Pasta",
      },
      {
        date: "2026-08-01",
        type: "dinner",
        title: "Unrequested Saturday Curry",
      },
    ]);

    expect(parseDraft(content, ["2026-07-25"])).toEqual([
      {
        date: "2026-07-25",
        type: "dinner",
        title: "Summer Tomato Pasta",
        note: undefined,
      },
    ]);
  });
});
