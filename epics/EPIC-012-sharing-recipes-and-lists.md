# EPIC-012: Sharing Recipes and Lists

**Status:** draft
**Created:** 2026-07-17
**Revised:** 2026-07-26 (baseline efe3197) — narrowed to plain-text sharing: recipe = ingredients + steps; shopping list = only the ticked "basket" items.
**Architecture baseline:** 078988c
**Source:** Jot task “deling a opskrift og andre relevante ting som indkøbslister” — share a recipe and other relevant things such as shopping lists.

---

## 1. BDD — User Flows

### Flow 1: Share a recipe from its recipe surface

```gherkin
Given the cook is viewing a saved recipe on the recipe detail surface
When they choose to share it
Then the app opens the native share sheet with plain text containing the recipe title, its ingredient list, its numbered steps, and one warm Sous Chef attribution line
And no internal ids appear in the shared text
And sharing does not edit the recipe, cook log, pantry, or meal plan
```

### Flow 2: Share the ticked "basket" from the shopping-list surface

```gherkin
Given the cook has a generated shopping list for a selected scope with one or more items ticked off
When they choose to share it
Then the app opens the native share sheet with plain text containing only the ticked items — the "basket" — grouped by store section, each with its quantity and unit
And unticked items do not appear in the shared text
```

### Flow 3: Sharing is unavailable when the basket is empty

```gherkin
Given the cook has a generated shopping list but nothing is ticked off
When they look at the shopping-list surface
Then no share action is offered, because there is nothing in the basket to share
```

**Out of scope for this epic:**
- Public web links, deep links, recipient permissions, or collaborative editing.
- Cloud sync as a prerequisite for sharing.
- Image/PDF generation, QR codes, AirDrop-specific formatting, or social previews.
- Importing a shared recipe back into Sous Chef; this epic only exports text through native sharing.

---

## 2. Function Call Signatures

```ts
function formatRecipeShareText(recipe: Recipe): string;
```

Returns deterministic, plain-text recipe content for native sharing: title, ingredient list, numbered steps, and one warm attribution line. Includes enough detail to cook from the shared message and exposes no internal ids.

```ts
function formatShoppingListShareText(groups: ListGroup[]): string;
```

Returns deterministic, plain-text shopping-list content built from **only the ticked items** in `groups` — the "basket" — grouped by store section with each item's quantity and unit. Unticked items are dropped by the formatter itself so the "basket only" rule is pinned by a formatter test rather than by the caller. The current shopping-list screen builds this text inline (over all items, with a ✓ marker); this signature extracts a reusable, testable boundary and changes the output to basket-only.

```ts
function shareText(message: string, title: string): Promise<void>;
```

Thin wrapper around React Native `Share.share`, kept outside formatter tests so native behaviour is mocked at the smallest boundary.

---

## 3. TDD — Testing Strategy

How the flows in §1 become failing tests, and what each function call is measured against.

### Authority for correctness

| Flow | Function call | Authority | Fixture | Tolerance |
|---|---|---|---|---|
| 1 | `formatRecipeShareText` | Existing `Recipe` type and the ingredient/step content rendered on the recipe detail screen | `src/models/types/Recipe.types.ts`; `src/views/screens/RecipeScreen.tsx` | Exact text: title, each ingredient (`quantity unit name`), each numbered step, one attribution line; no `id` fields |
| 2 | `formatShoppingListShareText` | Legacy parity with the inline `handleShare` grouping/quantity formatting in `ShoppingListScreen`, with the deliberate change that only `checked` items appear and the `✓` marker is dropped | `src/views/screens/ShoppingListScreen.tsx` (lines 80–96); `src/models/types/ShoppingList.types.ts` | Grouped section order and quantity/unit formatting preserved from the legacy inline output; input rows with `checked: false` produce no output line; sections whose items are all unticked produce no header |
| 1, 2 | `shareText` | React Native `Share.share` API already used by the shopping-list screen | `src/views/screens/ShoppingListScreen.tsx` | Called once with expected title/message; native share result not asserted |
| 3 | Share-action visibility gate | The screen offers no share control when the ticked-item count is zero | `src/views/screens/ShoppingListScreen.tsx` | With a list where every item has `checked: false`, no element with the "Share shopping list" accessibility label renders |

### What is deliberately not tested

- Whether a recipient app preserves line breaks or markdown-like bullets.
- Native share-sheet success/cancel result semantics.
- Public-link availability, because no public sharing backend is in scope.
- Visual placement of every future share button beyond the first recipe and existing shopping-list surfaces.

---

## 4. Checklist

- [ ] 1. Add failing formatter tests in `src/utils/shareFormatters.test.ts` — done when the expected recipe text (title, ingredients, numbered steps, attribution, no ids) and the expected basket-only shopping-list text (only `checked` items, grouped, with quantity/unit, no `✓` marker) are both pinned without invoking React Native `Share`.
- [ ] 2. Add `src/utils/shareFormatters.ts` with `formatRecipeShareText` and `formatShoppingListShareText` — done when item 1 passes and the formatter exports contain no native side effects.
- [ ] 3. Refactor `src/views/screens/ShoppingListScreen.tsx` to build its share text from `formatShoppingListShareText` — done when the shared text contains only the ticked "basket" items and the inline formatting is removed.
- [ ] 4. Add a recipe share action to the recipe detail surface `src/views/screens/RecipeScreen.tsx` — done when a saved recipe can open the native share sheet with `formatRecipeShareText` output and no recipe data is mutated.
- [ ] 5. Add a thin sharing boundary if needed by the view/controller split — done when native `Share.share` mocking is isolated from formatter tests and the call site remains small.
- [ ] 6. (added 2026-07-26) Gate the shopping-list share action on the ticked-item count in `src/views/screens/ShoppingListScreen.tsx` — done when no share control renders while nothing is ticked (Flow 3).

---

## 5. Summary

The section a reader skips to when deciding whether this epic is safe.

### Architecture impact

- [x] No change to ARCHITECTURE.md expected
- [ ] Amends Description sections: <list>
- [ ] **Requires a Constitution change** — a human decision, blocks this epic until resolved

### North star deviation

“The app must feel warm and opinionated, not mechanical. The LLM is a collaborator embedded throughout — not a chatbot bolted on the side. Every architectural decision should serve this mission.”

No. Sharing exports the cook’s kitchen artefacts without adding a generic social network or changing the LLM collaboration model.

### Open questions

| # | Question | Blocks | Decision needed by |
|---|---|---|---|
| Q1 | Plain text vs. a Sous Chef header/footer for the recipe share? | — | **Resolved 2026-07-26:** plain text with one warm attribution line. |
| Q2 | Which recipe surface gets the share button? | — | **Resolved 2026-07-26:** recipe detail (`RecipeScreen.tsx`) first. |
| Q3 | For the shopping list — include, omit, or mark checked items? | — | **Resolved 2026-07-26:** share only the ticked "basket" items (with quantities); drop the redundant `✓` marker; hide the action when nothing is ticked. |
| Q4 | Keep grouping the shared basket by store section, or flat list? | — | **Resolved 2026-07-26:** keep the existing store-section grouping (sections with no ticked items are omitted). Revisit only if a flat list is requested. |

### New capability

Yes: recipes become shareable, and shopping-list sharing gets a tested formatter that can support future shareable kitchen artefacts.
