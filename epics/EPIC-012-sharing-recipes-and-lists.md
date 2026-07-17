# EPIC-012: Sharing Recipes and Lists

**Status:** draft
**Created:** 2026-07-17
**Architecture baseline:** 078988c
**Source:** Jot task “deling a opskrift og andre relevante ting som indkøbslister” — share a recipe and other relevant things such as shopping lists.

---

## 1. BDD — User Flows

### Flow 1: Share a recipe from its recipe surface

```gherkin
Given the cook is viewing a saved recipe
When they choose to share it
Then the app opens the native share sheet with the recipe title, ingredients, steps, and a Sous Chef attribution
And sharing does not edit the recipe, cook log, pantry, or meal plan
```

### Flow 2: Share a shopping list from the shopping-list surface

```gherkin
Given the cook has a generated shopping list for a selected scope
When they choose to share it
Then the app opens the native share sheet with grouped shopping-list sections and quantities
And checked items remain visibly marked in the shared text
```

### Flow 3: Share a future relevant kitchen artefact through the same formatter boundary

```gherkin
Given the app later exposes another shareable kitchen artefact
When that artefact is routed through the sharing formatter boundary
Then its shared text is deterministic, product-worded, and tested without requiring the native share sheet
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

Returns deterministic, user-facing text for native sharing. It should include enough recipe detail to cook from the shared message without exposing internal ids.

```ts
function formatShoppingListShareText(groups: ListGroup[]): string;
```

Returns deterministic, grouped shopping-list text. The current shopping list screen already builds share text inline; this signature creates a reusable formatter boundary before adding more share surfaces.

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
| 1 | `formatRecipeShareText` | Existing `Recipe` type and rendered recipe detail content | `src/models/types/Recipe.types.ts`; recipe detail screen using the selected recipe | Exact text sections for title, ingredients, steps, and attribution; no ids |
| 2 | `formatShoppingListShareText` | Existing inline share formatting in `ShoppingListScreen` | `src/views/screens/ShoppingListScreen.tsx`; `src/models/types/ShoppingList.types.ts` | Existing grouped section order and quantity formatting preserved |
| 1, 2 | `shareText` | React Native `Share.share` API already used by the shopping-list screen | `src/views/screens/ShoppingListScreen.tsx` | Called once with expected title/message; native share result not asserted |
| 3 | Formatter boundary | Architecture rule that views stay presentation-only and side effects sit below controllers/services | `architecture/constitution/03-data-flow.md`; `architecture/constitution/07-key-conventions.md` | Future shareables add formatter tests before view buttons |

### What is deliberately not tested

- Whether a recipient app preserves line breaks or markdown-like bullets.
- Native share-sheet success/cancel result semantics.
- Public-link availability, because no public sharing backend is in scope.
- Visual placement of every future share button beyond the first recipe and existing shopping-list surfaces.

---

## 4. Checklist

- [ ] 1. Add failing formatter tests in `src/utils/shareFormatters.test.ts` for recipe and shopping-list text — done when the expected text is pinned without invoking React Native `Share`.
- [ ] 2. Add `src/utils/shareFormatters.ts` — done when item 1 passes and the formatter exports contain no native side effects.
- [ ] 3. Refactor `src/views/screens/ShoppingListScreen.tsx` to use `formatShoppingListShareText` — done when current shopping-list sharing output is unchanged.
- [ ] 4. Add a recipe share action to the recipe detail surface — done when a saved recipe can open the native share sheet with `formatRecipeShareText` output and no recipe data is mutated.
- [ ] 5. Add a thin sharing boundary if needed by the view/controller split — done when native `Share.share` mocking is isolated from formatter tests and the call site remains small.

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
| Q1 | Should shared recipe text be plain text only, or include a lightweight Sous Chef header/footer? | Item 1 | Before formatter implementation; recommended: plain text with one warm attribution line. |
| Q2 | Which recipe surface gets the first share button: recipe detail, cook mode, or cookbook card? | Item 4 | Before view implementation; recommended: recipe detail first. |
| Q3 | Should shopping-list checked items be included, omitted, or marked? | Item 1 | Before formatter implementation; recommended: preserve the current checked marker. |

### New capability

Yes: recipes become shareable, and shopping-list sharing gets a tested formatter that can support future shareable kitchen artefacts.
