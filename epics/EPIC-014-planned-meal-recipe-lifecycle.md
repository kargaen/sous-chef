# EPIC-014: Planned Meal Recipe Lifecycle

**Status:** closed
**Created:** 2026-07-18
**Architecture baseline:** bab927c
**Source:** owner meal-plan test sessions on 2026-07-18 and 2026-07-19; split from the original EPIC-013 draft and revised as the planned-meal interaction was tested.

---

## 1. BDD — User Flows

### Flow 1: Cooking state comes from cooking history

```gherkin
Given a planned meal has not been recorded as cooked through the cooking flow
When the cook views the meal plan
Then the meal is not greyed out as cooked
And no second "mark cooked" action is offered on the planned meal
And the old circled-check control is replaced by a three-dot menu for meal actions

Given a planned recipe has a qualifying cook record for that planned occurrence
When the cook views the meal plan
Then its cooked presentation is inferred from cooking history
And the plan does not maintain a competing manually toggled cooked state
```

### Flow 2: Autocomplete a planned meal from saved recipes

```gherkin
Given saved recipes include "Tortillas" and "Spicy Tortillas"
When the cook types "Tor" into a planned-meal field
Then an autocomplete dropdown offers both matching recipes

When the cook selects "Spicy Tortillas"
Then the planned meal links to that recipe
And its visible text becomes the recipe's canonical title "Spicy Tortillas"
```

### Flow 3: Keep an unmatched planned meal as text

```gherkin
Given the cook enters text that is not linked to a saved recipe
When they add it to the plan
Then the planned meal remains plain text
And no recipe is generated automatically
And the cook can later explicitly ask to turn that text into a recipe
```

### Flow 4: Turn planned text into an original recipe on request

```gherkin
Given a planned meal contains plain text and no recipe link
When the cook opens its three-dot menu and chooses "Create recipe"
Then a spinner appears on that day tile while Sous Chef creates the recipe
And the planned meal remains text while creation is in progress
And after successful creation the planned meal references the new recipe id
And its standalone planning text is cleared

Given recipe creation fails
When the spinner stops
Then the planned meal remains unchanged as text
And the cook can request creation again from the three-dot menu
```

### Flow 5: Preserve a note alongside a linked recipe

```gherkin
Given a planned meal is linked to the canonical recipe "Tom's Curry"
When the cook adds a note such as "for 10" or "non spicy"
Then the planned meal retains both the recipe id and that note
And the linked original recipe is not mutated automatically
And the note is visually distinct from a standalone text-only meal
```

### Flow 6: Turn linked instructions into a recipe variant on request

```gherkin
Given a planned meal links to "Tom's Curry" and also contains the note "for 10"
When the cook explicitly requests a variant
Then Sous Chef proposes a scaled variant for 10 people for review
And after acceptance the planned meal references the saved variant's recipe id
And its variant-request note is cleared

Given a planned meal links to "Tom's Curry" and also contains the note "non spicy"
When the cook explicitly requests a variant
Then Sous Chef proposes a non-spicy variant for review
And after acceptance the planned meal references the saved variant's recipe id
And its variant-request note is cleared
```

### Flow 7: Open a linked planned recipe

```gherkin
Given a planned meal references a saved recipe
When the cook taps the recipe title
Then the app opens that recipe
```

**Out of scope for this epic:**
- Automatically generating or adapting recipes while the cook is typing; generation begins only after an explicit three-dot-menu action.
- A second review step for creating an original recipe from plain text; choosing "Create recipe" is the confirmation, while variant review remains separate because it changes an existing recipe lineage.
- Mutating an original recipe to satisfy slot-specific text; accepted adaptations become variants.
- Changing how cooking sessions or reflections create cook records; this epic only removes the competing meal-plan toggle and derives presentation from cooking history.
- Plan start dates and AI draft-day targeting — EPIC-013 owns those separate planning concerns.
- LLM provider switching, failover, and live-model quality benchmarking.

---

## 2. Function Call Signatures

```ts
interface MealSlot {
  id: string;
  date: string;
  type: MealSlotType;
  text?: string;
  recipeId?: string | null;
  note?: string;
  servings?: number;
}
```

The persisted meal contract has two distinct modes: `text` is a standalone unlinked meal, while `recipeId` may carry a complementary `note`. A canonical slot never stores `text` together with `recipeId`, and `note` is only valid with `recipeId`. Autocomplete selection displays the canonical recipe title. Once standalone text is accepted as a new recipe, the slot keeps the resulting `recipeId` and clears `text`; once a linked note is accepted as a variant request, the slot keeps the variant `recipeId` and clears that note.

Legacy compatibility is deterministic: a stored `note` without a `recipeId` was the old representation of standalone text and normalizes to `text` on read. A stored `recipeId` plus `note` remains unchanged. Canonical data is written on the next ordinary plan save; no standalone migration is required.

```ts
function createRecipeForSlot(slotId: string): Promise<void>;
```

For a text-only slot, generates and saves an original recipe after the explicit menu action. While running, `convertingSlotId` identifies the day tile that shows the spinner. Success atomically replaces `text` with the generated `recipeId`; failure clears loading and leaves the slot unchanged.

```ts
function requestSlotVariant(slotId: string): Promise<void>;
```

For a linked slot with a note, prepares a reviewable variant using the linked recipe as parent. It does not repoint the slot until the cook accepts and saves the variant.

**Not comprehensive.** These contracts constrain storage, controller orchestration, and view handoff; matching helpers and presentation props are deliberately omitted.

```ts
type SlotInput =
  | { rawText: string }
  | { recipeId: string; note: string };
```

Autocomplete selection crosses the view/controller boundary by stable recipe identity. The controller resolves the canonical title from its saved-recipe cache for presentation only; it must not fuzzy-rematch an explicitly selected recipe.

```ts
function parseSlotInput(input: SlotInput): {
  text?: string;
  recipeId?: string;
  note?: string;
  servings?: number;
  adaptationIntents: string[];
};
```

Raw unmatched input becomes standalone `text`. Explicit recipe selection preserves its `recipeId`, keeps user context as `note`, and derives scaling or adaptation intent from that note without fuzzy title matching.

---

## 3. TDD — Testing Strategy

### Authority for correctness

The owner-confirmed 2026-07-18 acceptance scenarios in §1 are the authority for new lifecycle behaviour. Existing output from `CookLogRepository`, `useRecipeController.importRecipeSource`, `parseRecipeDraftFromLLM`, `AdaptationResponseSchema`, and `AdaptationService.buildVariantRecipe` is the legacy authority where this epic reuses cooking, recipe-draft, and variant behaviour.

### Test map

| Flow | Function call / surface | Authority | Fixture | Tolerance |
|---|---|---|---|---|
| 1 | cooked-state derivation | Existing `src/models/repositories/CookLogRepository.ts` output plus owner-confirmed §1 rule | linked slots with matching and non-matching cook-log dates in `src/controllers/useMealPlanController.test.tsx` | Cooked/not-cooked value exact for every slot; 0 plan-status writes |
| 1 | cooked planned-meal rendering | Owner-confirmed absence of a second cooked UX | cooked and uncooked slots in `src/views/components/meal-plan/PlannedSlotRow/PlannedSlotRow.view.test.tsx` | Manual cook-action count exactly 0; cooked style present only for derived cooked input |
| 2 | recipe autocomplete and canonical selection | Existing saved-recipe title matching plus owner-confirmed canonical-title rule | `Tortillas`, `Spicy Tortillas`, and query `Tor` in `src/views/components/meal-plan/AddToDayInput/AddToDayInput.view.test.tsx` | Both matches shown exactly once; selected title and recipe id exact |
| 2 | selected-recipe input parsing | Owner-confirmed stable recipe identity plus the existing saved-recipe cache in `src/controllers/useMealPlanController.ts` | two similarly titled recipes and an explicit selected id in `src/controllers/useMealPlanController.test.tsx` | Parsed recipe id exact; 0 fuzzy-title matches for explicit selection |
| 3, 5 | raw-text input parsing | Owner-confirmed standalone-text contract | unmatched meal text in `src/controllers/useMealPlanController.test.tsx` | Parsed `text` exact; 0 `note` values and 0 recipe ids for unmatched input |
| 3, 5 | meal-slot schema and input parsing | Owner-confirmed distinction between standalone `text` and a `note` complementary to `recipeId` | text-only, recipe-only, recipe-plus-note, legacy note-only, and invalid text-plus-recipe input in `src/models/schemas/MealPlanSchema.test.ts` | Canonical fields exact; 0 text-plus-recipe or note-without-recipe outputs; 0 implicit LLM or recipe-save calls |
| 4 | `createRecipeForSlot` | Existing `RecipeImportService.generateRecipeFromIdea` output plus owner-confirmed explicit menu action | text-only slot with mocked success and failure in `src/controllers/useMealPlanController.test.tsx` | Spinner slot id exact; 0 slot mutations before generated recipe exists; success saves once and replaces text with recipe id; failure performs 0 saves and 0 plan mutations |
| 6 | `requestSlotVariant` | Legacy `AdaptationResponseSchema` in `src/models/schemas/ConversationSchema.ts` and `AdaptationService.buildVariantRecipe` | `Tom's Curry` with note `for 10`, and `Tom's Curry` with note `non spicy`, in `src/controllers/useMealPlanController.test.tsx` | Variant `parentId` exact; 0 slot mutations before acceptance; accepted slot has variant id and no variant-request note |
| 1, 4, 6, 7 | planned-meal action menu and linked-recipe interaction | Owner-confirmed three-dot-menu, spinner, and recipe-navigation behaviour | text-only, converting, linked-recipe, and linked-note slots in `src/views/components/meal-plan/PlannedSlotRow/PlannedSlotRow.view.test.tsx` | Circled-check action count exactly 0; one applicable conversion action; spinner count exactly 1 for converting slot; recipe callback receives exact id once |
| 7 | meal-plan recipe navigation | Existing recipe detail route | linked slot in `src/views/screens/MealPlanScreen.test.tsx` | One navigation call with exact recipe id |
| 1, 4, 6 | day-section lifecycle handoff | Owner-confirmed cooked, conversion, and variant flows plus the implemented `PlannedSlotRow` prop contract | cooked, text-only, converting, and linked-note slots in `src/views/components/meal-plan/DaySection/DaySection.view.test.tsx` | Derived cooked value exact; converting slot id exact; create and variant callbacks each receive the exact slot id once |
| 4, 6 | meal-plan lifecycle orchestration | Owner-confirmed explicit menu actions and review-before-variant-save behaviour plus the implemented controller contract | text-only slot, linked-note slot, and pending variant in `src/views/screens/MealPlanScreen.test.tsx` | Create and variant requests each call the exact controller method once; pending variant exposes one accept and one cancel action; no navigation occurs on acceptance |

### What is deliberately not tested

- Pixel-perfect dropdown, menu, spinner, cooked, or conversion-action styling.
- Live-model recipe quality; mocked valid and invalid responses test deterministic boundaries.
- Cooking-session and reflection internals that already produce cook logs.
- Whether the meal plan caused the cook; cooked presentation only matches recipe identity and local cooking date, because last-minute substitutions are not inferable.

---

## 4. Checklist

- [x] 1. Add failing meal-slot schema tests in `src/models/schemas/MealPlanSchema.test.ts` — done when the Flow 3 and 5 fixtures accept text-only, recipe-only, and recipe-plus-note slots; reject empty and text-plus-recipe slots; normalize a legacy note-only slot to text; preserve a linked recipe note; and never output note without recipe. (`MealSlotSchema — standalone text and linked recipe notes`: 3 passed.)
- [x] 2. Add the distinct standalone-`text` and linked-`note` contract with backward-compatible normalization in `src/models/schemas/MealPlanSchema.ts` — done when item 1 passes and canonical output never conflates standalone text with a complementary recipe note. (`MealSlotSchema` validation and legacy normalization.)
- [x] 3. Align the public meal-slot type and document its invariant in `src/models/types/MealPlan.types.ts` — done when item 1 typechecks with `text` as standalone content and `note` as optional linked-recipe context. (`npx tsc --noEmit` passed.)
- [x] 14. (added 2026-07-18) Add the stable selected-recipe variant to `SlotInput` in `src/models/types/MealPlan.types.ts` — `{ recipeId, note }` is the selected-recipe boundary and repository-wide typechecking passes.
- [x] 15. (added 2026-07-18) Add parsing tests in `src/controllers/useMealPlanController.test.tsx` — selected recipe identity and unmatched standalone text both pass without fuzzy rematching explicit selections.
- [x] 16. (added 2026-07-18) Update slot-input parsing in `src/controllers/useMealPlanController.ts` — selected identity, linked notes, and standalone raw text pass focused controller tests.
- [x] 4. Add autocomplete interaction tests in `src/views/components/meal-plan/AddToDayInput/AddToDayInput.view.test.tsx` — contained-title matches, canonical-title display, and selected-id submission pass.
- [x] 5. Update `src/views/components/meal-plan/AddToDayInput/AddToDayInput.view.tsx` — selected recipes submit stable ids and unmatched entries retain the raw-text path; focused tests and repository-wide typechecking pass.
- [x] 6. Add failing text-to-recipe lifecycle tests in `src/controllers/useMealPlanController.test.tsx` — success and failure tests pass, proving conversion repoints only after recipe persistence and failure preserves the original text slot. (`npx jest src/controllers/useMealPlanController.test.tsx --runInBand`: 4 passed.)
- [x] 7. Implement `createRecipeForSlot` in `src/controllers/useMealPlanController.ts` — `RecipeImportService.generateRecipeFromIdea` runs only through the explicit controller action, exposes the converting slot id, and atomically repoints the slot after recipe persistence. (Focused tests, `npx tsc --noEmit`, and 20-suite Jest run passed.)
- [x] 8. Add failing planned-meal action tests in `src/views/components/meal-plan/PlannedSlotRow/PlannedSlotRow.view.test.tsx` — four tests pass for the absent checkmark, contextual three-dot-menu actions, text-preserving in-tile spinner, and exact recipe-id callback.
- [x] 9. Add the three-dot menu, contextual conversion actions, spinner, and linked-recipe press target in `src/views/components/meal-plan/PlannedSlotRow/PlannedSlotRow.view.tsx` — text remains visible until conversion succeeds; focused tests, typechecking, and all 21 active Jest suites pass.
- [x] 17. (added 2026-07-19) Add failing linked-recipe navigation tests in `src/views/screens/MealPlanScreen.test.tsx` — one test passes, proving a planned recipe opens the recipe-detail route exactly once with its stable id.
- [x] 18. (added 2026-07-19) Wire linked planned recipes to recipe detail through `src/views/screens/MealPlanScreen.tsx` and `DaySection.view.tsx` — owner-approved two-file handoff; focused tests, typechecking, and all 22 active Jest suites pass.
- [x] 19. (added 2026-07-19) Add linked-note variant confirmation tests in `src/controllers/useMealPlanController.test.tsx` — scaling, qualitative, cancellation, and malformed-response tests pass; proposals do not persist or repoint before acceptance, and acceptance saves once, repoints once, and clears the note.
- [x] 20. (added 2026-07-19) Implement `requestSlotVariant` and its accept/cancel boundary in `src/controllers/useMealPlanController.ts` — pending proposals remain reviewable, cancellation is mutation-free, malformed output is ignored, and accepted variants persist before the slot is repointed; 8 focused controller tests, typechecking, and all 22 active Jest suites pass.
- [x] 10. Add cooked-state derivation tests in `src/controllers/useMealPlanController.test.tsx` — recipe identity and planned local calendar date must both match, while unlinked text and non-matching dates remain uncooked with 0 meal-plan or cook-log writes.
- [x] 11. Replace manual cooked-state orchestration with cook-history-derived state in `src/controllers/useMealPlanController.ts` — `isSlotCooked` reads cook logs without mutation and the meal-plan screen no longer exposes the obsolete mark-cooked callback; 9 focused controller tests, typechecking, and all 22 active Jest suites pass.
- [x] 12. Add derived cooked-presentation tests in `src/views/components/meal-plan/PlannedSlotRow/PlannedSlotRow.view.test.tsx` — legacy slot status is ignored, derived cooked input alone controls styling, the three-dot menu remains available, and no manual cooked action returns.
- [x] 13. Render only cook-history-derived cooked presentation in `src/views/components/meal-plan/PlannedSlotRow/PlannedSlotRow.view.tsx` — the row defaults to uncooked and applies cooked styling only from its derived `isCooked` input; 6 focused view tests, typechecking, and all 22 active Jest suites pass.
- [x] 21. (added 2026-07-19) Add lifecycle-handoff tests in `src/views/components/meal-plan/DaySection/DaySection.view.test.tsx` — exact cooked derivation, conversion state, text-to-recipe requests, and linked-note variant requests cross the day-section boundary.
- [x] 22. (added 2026-07-19) Forward lifecycle state and callbacks in `src/views/components/meal-plan/DaySection/DaySection.view.tsx` — every planned row receives derived cooked state, conversion state, and its applicable controller actions; focused tests, typechecking, and all 23 active Jest suites pass.
- [x] 23. (added 2026-07-19) Add lifecycle-orchestration tests in `src/views/screens/MealPlanScreen.test.tsx` — exact create-recipe and variant-request slot ids plus one accept and one cancel action for a pending variant pass without navigation.
- [x] 24. (added 2026-07-19) Wire planned-meal lifecycle orchestration and pending-variant review in `src/views/screens/MealPlanScreen.tsx` — controller-derived state and actions reach day sections, pending variants remain reviewable in place, and no second cooked-state or automatic-generation path is added; 3 focused screen tests, typechecking, and all 23 active Jest suites pass.

---

## 5. Summary

### Architecture impact

- [x] No change to ARCHITECTURE.md expected
- [ ] Amends Description sections: <list>
- [ ] **Requires a Constitution change** — a human decision, blocks this epic until resolved

### North star deviation

“The app must feel warm and opinionated, not mechanical. The LLM is a collaborator embedded throughout — not a chatbot bolted on the side. Every architectural decision should serve this mission.”

No. Recipe creation and adaptation remain embedded in the planned-meal flow, explicit, reviewable, and reversible until acceptance, while cooking history becomes the single humane source of truth instead of a duplicate mechanical toggle.

### Open questions

| # | Question | Blocks | Decision needed by |
|---|---|---|---|
| Q1 | Cooked presentation matches a cook log only when its recipe id matches the planned recipe and its cooking timestamp falls on the planned local calendar date; ratings remain independent of meal-plan intent. | Nothing — confirmed 2026-07-19 | Confirmed |
| Q3 | After accepting a generated variant, remain on the meal plan; the cook can open the variant by tapping the linked recipe. | Nothing — confirmed 2026-07-19 | Confirmed |

### New capability

Yes: planned meals become explicit text-and-recipe references that can be promoted, only on request and after review, into original recipes or linked variants.
