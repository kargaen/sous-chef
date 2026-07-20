# EPIC-013: Meal Plan Creation and Draft Targeting

**Status:** closed
**Created:** 2026-07-18
**Architecture baseline:** 2a0e3fe
**Source:** owner meal-plan test session on 2026-07-18; split from the original EPIC-013 draft after review.

**Implementation prerequisite completed 2026-07-20:** `@react-native-community/datetimepicker` 8.4.4 is the approved platform-native calendar boundary and is installed through its contained dependency-change run.

---

## 1. BDD — User Flows

### Flow 1: Choose any plan start date

```gherkin
Given the cook is creating a meal plan
When they open Starting
Then a calendar date picker appears
And they can choose any calendar day rather than being locked to the previous Monday
And the selected date remains visible in the creation form
And Create Plan starts the plan on that selected date
```

### Flow 2: Warn without blocking for a past start date

```gherkin
Given the cook is choosing a meal-plan start date
When they choose today or a future date
Then no past-date warning appears

Given the cook is choosing a meal-plan start date
When they choose a date before today
Then a warning appears immediately beside the Starting field
And the warning explains that the date is in the past
And the cook can still create the plan with that date
```

### Flow 3: Draft only unfilled plan days

```gherkin
Given a meal plan contains both filled and unfilled days
When the cook asks Sous Chef to draft meals
Then Sous Chef receives enough plan context to distinguish filled from unfilled days
And suggestions are returned only for unfilled days requested by the cook
And existing planned meals remain unchanged
```

### Flow 4: Understand a request for one named weekday

```gherkin
Given a meal plan contains an unfilled Saturday
When the cook asks "What should we have on Saturday?"
Then the draft contains suggestions for that Saturday only

Given a meal plan contains more than one Saturday
And at least one Saturday is already filled
When the cook asks "What should we have on Saturday?"
Then the draft targets the first unfilled Saturday in chronological order
And it does not suggest a meal for a filled Saturday
```

**Out of scope for this epic:**
- Planned-meal recipe identity, autocomplete, text-to-recipe conversion, variants, and cooked-state presentation — EPIC-014 owns that separate meal lifecycle.
- LLM provider switching, failover, or live-model quality benchmarking; deterministic context and response filtering are tested with mocked model output.
- Drag-to-reorder, recurring plans, multi-week overview, nutrition targets, and pantry-quantity intelligence.

---

## 2. Function Call Signatures

```ts
function buildPlanDraftUserMessage(ctx: {
  request: string;
  availableDays: PlanDraftDay[];
  filledSlots: Array<{ date: string; type: MealSlotType; text: string }>;
  month: number;
  region: string | null;
  cuisinePreferences: string[];
  skillLevel: string | null;
  pantryHighlights?: string[];
}): string;
```

The draft request identifies both occupied slots and eligible dates. Model output is still validated locally, and suggestions for dates outside the deterministic eligible set are discarded.

**Not comprehensive.** The cross-layer prompt context is pinned because changing it later would rewrite controller and prompt tests. Date-picker presentation and small date helpers are deliberately omitted.

---

## 3. TDD — Testing Strategy

### Authority for correctness

The owner-confirmed 2026-07-18 acceptance scenarios in §1 are the authority for new date and targeting behaviour. The existing serialized prompt produced by `src/prompts/mealPlanDraft.ts` is the legacy-output authority for context fields this epic does not change.

### Test map

| Flow | Function call / surface | Authority | Fixture | Tolerance |
|---|---|---|---|---|
| 1, 2 | plan start-date selection and validation | Owner-confirmed §1 scenarios | fixed local dates for yesterday, today, and tomorrow in `src/views/screens/MealPlanScreen.test.tsx` | Exact `YYYY-MM-DD` key; warning count exactly 1 for yesterday and 0 for today/tomorrow; submission count exactly 1 for every date |
| 3, 4 | `buildPlanDraftUserMessage` and response eligibility filtering | Owner-confirmed §1 scenarios plus legacy JSON fields in `src/prompts/mealPlanDraft.ts` | plan spanning two Saturdays with the first filled and the second unfilled in `src/prompts/mealPlanDraft.test.ts` | Eligible dates and serialized fields exact; 0 suggestions on filled or unrequested dates |
| 3, 4 | `generateFromRequest` orchestration | Existing controller-to-prompt handoff in `src/controllers/useMealPlanController.ts` | active plan containing filled and unfilled dates in `src/controllers/useMealPlanController.test.tsx` | Existing slots unchanged; suggestion dates exactly equal the requested eligible-date set |

### What is deliberately not tested

- Pixel-perfect calendar or warning styling.
- Native calendar internals supplied by the approved date-picker primitive.
- Live-model creativity or whether a model independently understands every weekday phrase; deterministic eligible-date filtering is the final guardrail.
- Recipe conversion and cooked-state behaviour, which EPIC-014 tests separately.

---

## 4. Checklist

- [x] 1. Add start-date interaction tests in `src/views/screens/MealPlanScreen.test.tsx` — yesterday warns immediately without blocking, today does not warn, and a selected non-Monday date remains visible and is submitted.
- [x] 2. Add selected start-date state, the calendar trigger, nearby warning, and selected-date submission in `src/views/screens/MealPlanScreen.tsx` — the approved native picker drives authoritative plan creation; 5 focused screen tests, typechecking, and all 23 active Jest suites pass.
- [x] 3. Add prompt-context and eligibility tests in `src/prompts/mealPlanDraft.test.ts` — filled-slot serialization, legacy context preservation, first-unfilled-Saturday targeting, and rejection outside eligible dates pass.
- [x] 4. Extend draft context serialization and deterministic response filtering in `src/prompts/mealPlanDraft.ts` — available days and filled slots are serialized, named weekdays select the first chronological match, and parser output is restricted to eligible dates; 3 focused prompt tests, typechecking, and all 24 active Jest suites pass.
- [x] 5. Add draft orchestration tests in `src/controllers/useMealPlanController.test.tsx` — existing slots become filled context, only the first requested unfilled weekday becomes a suggestion, and the active plan remains unchanged.
- [x] 6. Update `generateFromRequest` in `src/controllers/useMealPlanController.ts` — filled-slot context and chronological eligible dates reach the prompt, and parsed suggestions are restricted to the prompt's final eligible dates; 10 focused controller tests, typechecking, and all 24 active Jest suites pass.

---

## 5. Summary

### Architecture impact

- [ ] No change to ARCHITECTURE.md expected
- [x] Amends Description sections: `architecture/description/02-stack.md` after the proposed `@react-native-community/datetimepicker` dependency is approved and installed through its contained dependency-change run
- [ ] **Requires a Constitution change** — a human decision, blocks this epic until resolved

### North star deviation

“The app must feel warm and opinionated, not mechanical. The LLM is a collaborator embedded throughout — not a chatbot bolted on the side. Every architectural decision should serve this mission.”

No. The cook controls the plan's actual dates, while the embedded collaborator receives accurate occupied-day context and is constrained from overwriting the cook's existing choices.

### Open questions

| # | Question | Blocks | Decision needed by |
|---|---|---|---|
| Q1 | Use `@react-native-community/datetimepicker` 8.4.4 for the start-date control; approved and installed through the contained dependency-change run. | Nothing — confirmed 2026-07-20 | Confirmed |

### New capability

No new product area: this epic corrects plan creation and makes the existing AI drafting capability aware of occupied and explicitly requested dates.
