# EPIC-015: Recipe Deletion

**Status:** active
**Created:** 2026-08-08
**Architecture baseline:** 81ca9ac

---

## 1. BDD — User Flows

A cook can save a recipe from four different entry points but has no way to remove one. The
shelf only grows. This epic gives the recipe view a delete action, and settles the one thing
deletion cannot decide on its own: what happens to the recipe's variants.

Variants are the reason this is not a one-line change. A variant is a real recipe whose
`parentId` points at its original, and variants are hidden from every listing — they surface
only inside their parent. Deleting a parent without a decision would strand its variants:
still on disk, no longer reachable from anywhere in the app. The cook is asked, because only
the cook knows whether the adapted version was the keeper.

### Flow 1: Delete a recipe that has no variants

```gherkin
Given the cook is viewing a saved recipe with no variants
When they choose "Delete recipe"
Then they are asked to confirm, and told the recipe cannot be recovered
And choosing "Cancel" leaves the recipe untouched

When they confirm
Then the recipe is removed from the shelf
And the cook is returned to the previous screen
And the recipe no longer appears in saved-recipe listings
```

### Flow 2: Delete a recipe that has variants

```gherkin
Given the cook is viewing a saved recipe that has two variants
When they choose "Delete recipe"
Then they are asked what should happen to the variants
And they are offered keeping the variants as recipes of their own, deleting everything, or cancelling

When they choose to keep the variants
Then the original recipe is removed
And each variant becomes a standalone recipe of its own
And each former variant appears in saved-recipe listings under its own title

When they choose to delete everything
Then the original recipe and all of its variants are removed
And none of them appear in saved-recipe listings

When they cancel
Then nothing is deleted and no variant is changed
```

### Flow 3: Delete a single variant

```gherkin
Given the cook has swiped to a variant of a saved recipe
When they choose "Delete recipe"
Then the confirmation refers only to that variant
And no question about variants is asked

When they confirm
Then only that variant is removed
And the original recipe and its other variants are untouched
And the cook stays on the original recipe
```

**Out of scope for this epic:**

- **Undo, trash, or soft delete.** Deletion is a hard `DELETE` on the `recipes` row, matching
  every other delete in the app today. Tombstones and soft delete are EPIC-002's P2.3 slice
  and are a prerequisite for sync, not for this button — building them here would make this
  epic a schema change for all thirteen tables.
- **Cleaning up cook logs, ratings, rating categories, and cook notes** for a deleted recipe.
  Those rows are keyed by `recipeId` and become unreferenced, not incorrect: `CookLogRepository`
  reads are always scoped by a recipe id the caller already holds, so orphan rows are invisible
  rather than wrong. Cascading them is a separate decision about whether cooking history should
  survive its recipe.
- **Repointing meal-plan slots** whose `recipeId` names a deleted recipe. The slot contract
  already tolerates a recipe that will not resolve, and deciding between clearing the slot and
  degrading it to text is a meal-plan decision, not a recipe one.
- **Deleting from the saved-recipe list or cookbook shelf.** One entry point ships first; a
  swipe-to-delete affordance on listings is a separate slice with its own confirmation design.
- **Bulk delete.**

---

## 2. Function Call Signatures

```ts
type VariantDisposition = "keep" | "delete";

function deleteRecipe(
  id: string,
  variantDisposition?: VariantDisposition,
): Promise<boolean>;
```

Removes one recipe and returns whether it was removed. `variantDisposition` decides the fate of
recipes whose `parentId` is `id`, and is only consulted when such recipes exist:

- `"keep"` — every variant is promoted to standalone (its `parentId` cleared) **before** the
  parent row is deleted, so an interrupted delete can never leave a variant pointing at a
  recipe that is gone.
- `"delete"` — every variant is deleted, then the parent.
- Omitted — valid only when the recipe has no variants; the call is a plain single delete.

Ordering is the load-bearing part of this contract. Promotion before deletion means the failure
mode of a crash mid-operation is a promoted variant plus a still-present parent — a visible,
self-correcting state — rather than an unreachable orphan.

**Not comprehensive.** The view-layer confirmation handlers are deliberately omitted; they
carry no contract another layer depends on.

---

## 3. TDD — Testing Strategy

### Authority for correctness

| Concern | Authority |
|---|---|
| Controller shape — loading/error handling, repository delegation, the `repo.delete(id)` call | **Legacy application output:** `useCookbookController.deleteCookbook` (`src/controllers/useCookbookController.ts:139`), the existing end-to-end delete in this codebase. The new call reproduces its structure: guard, delegate, set a domain error string on failure, clear loading in `finally`. |
| Promotion semantics for the `"keep"` path | **Legacy application output:** `RecipeRepository.promoteVariant` (`src/models/repositories/RecipeRepository.ts:56`), already shipped and already reachable from this screen via "Make this its own recipe". `"keep"` must produce the same stored result as the cook pressing that button on each variant. |
| The variant question itself — that it is asked, and its three outcomes | **Owner decision, 2026-08-08:** "deleting a parent recipe has to ask if the user wants to keep the variants as their own or delete them all." Recorded here because it exists nowhere else. |
| Which listings a deleted or promoted recipe appears in | **Legacy application output:** `RecipeRepository.getSaved`, which filters on `!recipe.parentId`. |

### Test map

| Flow | Function call | Authority | Fixture | Tolerance |
|---|---|---|---|---|
| 1 | `deleteRecipe(id)` | `deleteCookbook` legacy shape | recipe with `getVariants` returning `[]`, in `src/controllers/useRecipeController.test.tsx` | `repo.delete` called exactly once with the exact id; `promoteVariant` calls exactly 0; returns `true`; `error` is `null` |
| 1 | `deleteRecipe(id)` when the repository throws | `deleteCookbook` legacy shape | `repo.delete` rejecting, same file | returns `false`; `error` exactly `"Could not delete recipe."`; `loading` exactly `false` after settling |
| 2 | `deleteRecipe(id, "keep")` | `promoteVariant` legacy output + owner decision | parent with two variants, same file | `promoteVariant` called exactly once per variant with exact ids; `delete` called exactly once, with the parent id only; every promote precedes the delete |
| 2 | `deleteRecipe(id, "delete")` | owner decision | parent with two variants, same file | `delete` called exactly 3 times — each variant id and the parent id; `promoteVariant` calls exactly 0 |
| 3 | `deleteRecipe(variantId)` | `deleteCookbook` legacy shape | variant whose own `getVariants` is `[]`, same file | `delete` called exactly once with the variant id; parent id appears in 0 calls |
| 1, 2 | `activeRecipe` after a successful delete | owner-confirmed return-to-previous behaviour | deleting the currently active recipe, same file | `activeRecipe` exactly `null` |

### What is deliberately not tested

- **The confirmation dialogs themselves.** `RecipeScreen` has no test file today, and adding
  RNTL coverage for `Alert.alert` button wiring is a larger change than the feature. The
  branching *decision* is tested at the controller, where it lives; the view only maps a
  chosen button to a disposition. Named as a gap in §5, not an oversight.
- Styling and placement of the delete button.
- That orphaned cook-log rows are cleaned up — per §1 they deliberately are not.
- Concurrent deletion of the same recipe from two screens; there is one entry point.

---

## 4. Checklist

- [x] 1. Add failing `deleteRecipe` tests in `src/controllers/useRecipeController.test.tsx` — done when all six test-map rows fail for the right reason (`deleteRecipe` is not a function). (`describe("deleteRecipe")`: 6 failed with `TypeError: result.current.deleteRecipe is not a function`.)
- [x] 2. Implement `deleteRecipe` with variant disposition in `src/controllers/useRecipeController.ts` — done when item 1 passes and no existing test in that file regresses. (`useRecipeController.deleteRecipe` + exported `VariantDisposition`; suite 16 passed.)
- [x] 3. Expose a `handleDelete` action and variant count from `src/views/screens/RecipeScreen.hooks.ts` — done when `npx tsc --noEmit` is clean and the screen can ask the controller to delete the page it is showing. (`useRecipeScreenView.handleDelete` + `variantCount`; `npx tsc --noEmit` clean.)
- [x] 4. Add the delete button and its confirmations to `src/views/screens/RecipeScreen.tsx` — done when a recipe with variants raises the three-way question, one without raises a plain confirm, and both return the cook to the previous screen. (`confirmDelete`/`runDelete` + danger-variant `Button` in `heroActions`; owner device test outstanding — see §5.)
- [x] 5. (added 2026-08-08) Park every action but the two headline ones behind a `⋮` menu in `src/views/components/recipe/RecipeActionsMenu/` — done when the hero row is Start cooking (primary), Adapt recipe (secondary), `⋮` (secondary), and Edit / Make this its own recipe / Delete sit inside the menu. (Owner request; `RecipeActionsMenu` component triad, delete rendered as the destructive item. Supersedes item 4's flat danger button — the delete *behaviour* it pinned is unchanged.)

---

## 5. Summary

### Architecture impact

- [x] No change to ARCHITECTURE.md expected
- [ ] Amends Description sections: —
- [ ] **Requires a Constitution change**

No new file, layer, table, store, service, or dependency. `RecipeRepository.delete` and
`promoteVariant` already exist; this epic adds one controller action and one button, in the
existing view → controller → repository direction.

### North star deviation

> "The app must feel warm and opinionated, not mechanical."

No. The variant question is the warm reading of a destructive action: a mechanical delete would
silently strand the cook's adapted versions, or silently destroy them. Asking once, in the
cook's own terms — keep these as their own recipes, or clear it all out — is the app having an
opinion about what deletion means, rather than exposing a database operation.

The pressure this epic does put on the architecture is the absence of a tombstone: with no soft
delete, "warm" has to be carried entirely by the confirmation copy, because there is no undo.
That is a known EPIC-002 dependency, not a new debt.

### Open questions

| # | Question | Blocks | Decision needed by |
|---|---|---|---|
| Q1 | Should cook logs, ratings, and cook notes be deleted with their recipe, or survive as anonymous cooking history? | No — orphan rows are unreferenced, not incorrect (§1) | Before EPIC-002's P2.3 soft-delete slice, which has to tombstone whatever answer this gets |
| Q2 | Should a meal-plan slot pointing at a deleted recipe clear itself, or degrade to its plain text? | No — the slot contract already tolerates an unresolvable id | Whenever a cook reports a blank planned meal |
| Q3 | Should delete also be reachable from the saved-recipe listing? | No | After the owner has used the button on the recipe screen |
| Q4 | Does the three-button variant dialog read clearly on a real device, or does it need a bottom sheet? | No — the flow works either way | Owner device test; `Alert.alert` renders three buttons stacked on Android, which is untested here |
| Q5 | Should the `⋮` menu dismiss when the cook taps elsewhere on the screen? | No — every item either navigates away or raises a dialog, so it cannot be left stranded open | Whenever a second consumer needs the menu; an outside-press scrim is a `ui/` primitive concern, not a recipe one |

### New capability

Destructive recipe management — the first place in the app where a cook can permanently remove
something they saved. The north star alludes to a collaborator that adapts and suggests, never
to one that removes; naming it here because every future delete affordance (listings, bulk,
cookbooks-with-contents) will cite this epic's confirmation pattern as precedent.
