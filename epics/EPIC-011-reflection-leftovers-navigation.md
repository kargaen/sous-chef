# EPIC-011: Reflection Leftovers Navigation Bug

**Status:** draft
**Created:** 2026-07-17
**Architecture baseline:** 078988c
**Source:** Jot task “saving to pantry after a cook registers the cook and saves to pantry, but does not switch to the recipe route like saving normally does.”

---

## 1. BDD — User Flows

### Flow 1: Save reflection without leftovers

```gherkin
Given the cook is on the reflection screen after cooking a recipe
When they save the cook and decline the leftovers prompt
Then the cook is recorded exactly once
And the app returns to the previous recipe route
```

### Flow 2: Save reflection with leftovers

```gherkin
Given the cook is on the reflection screen after cooking a recipe
When they save the cook and choose “Save to pantry” in the leftovers prompt
Then the cook is recorded exactly once
And one pantry leftover entry is saved
And the app returns to the same recipe route the non-pantry save path uses
```

### Flow 3: Leftover save fails after cook save

```gherkin
Given the cook has already saved the reflection
When the pantry leftover save fails
Then the app shows the existing pantry failure message
And the app still leaves the reflection screen through the normal saved-cook route
And the cook is not recorded a second time
```

**Out of scope for this epic:**
- Changing how leftovers are named, portioned, or dated.
- Redesigning the reflection screen or leftovers prompt.
- Adding pantry quantity merging or duplicate detection; this bug only protects navigation and single-submit behaviour.

---

## 2. Function Call Signatures

```ts
function handleSave(): Promise<void>;
```

Saves the reflection once, optionally saves leftovers once, and always uses one shared post-save navigation path after the saved-cook decision resolves.

```ts
function saveLeftoversFromCook(recipeName: string): Promise<boolean>;
```

Existing pantry controller contract. The bug fix should treat this as a side effect after the cook is already recorded, not as a reason to call `onSave` again.

---

## 3. TDD — Testing Strategy

How the flows in §1 become failing tests, and what each function call is measured against.

### Authority for correctness

| Flow | Function call | Authority | Fixture | Tolerance |
|---|---|---|---|---|
| 1 | `handleSave` | Existing reflection save path in `ReflectionScreen` | `src/views/screens/ReflectionScreen.tsx` | Exactly one `onSave` call; existing `goBack` path reached |
| 2 | `handleSave` | Existing leftovers persistence contract in `usePantryController` | `src/controllers/usePantryController.ts` | Exactly one `saveLeftoversFromCook` call; exactly one `onSave` call; `goBack` reached after pantry promise settles |
| 3 | `handleSave` | Existing pantry failure alert copy in `ReflectionScreen` | `src/views/screens/ReflectionScreen.tsx` | Failure alert shown; `goBack` still reached; no second cook log call |

### What is deliberately not tested

- Live shelf-life suggestion quality; pantry controller tests can mock the expiry suggestion.
- Expo Router internals; the view test should assert the callback to the existing safe-back hook rather than the router implementation.
- Duplicate pantry detection, because current pantry save creates a new leftovers item by design.

---

## 4. Checklist

- [ ] 1. Add a failing reflection leftovers navigation test in `src/views/screens/ReflectionScreen.test.tsx` — done when “Save to pantry” proves one reflection save, one pantry save, and one normal post-save navigation.
- [ ] 2. Fix the reflection save handler in `src/views/screens/ReflectionScreen.tsx` — done when item 1 passes and the non-pantry save path still leaves the screen.
- [ ] 3. Add a failing pantry-failure navigation test in `src/views/screens/ReflectionScreen.test.tsx` — done when a rejected/false leftover save still shows the failure alert and exits without recording another cook.
- [ ] 4. Confirm the existing skip path remains unchanged in `src/views/screens/ReflectionScreen.tsx` — done when skipping reflection still records a bare cook once and leaves through the same safe-back path.

---

## 5. Summary

The section a reader skips to when deciding whether this epic is safe.

### Architecture impact

- [x] No change to ARCHITECTURE.md expected
- [ ] Amends Description sections: <list>
- [ ] **Requires a Constitution change** — a human decision, blocks this epic until resolved

### North star deviation

“The app must feel warm and opinionated, not mechanical. The LLM is a collaborator embedded throughout — not a chatbot bolted on the side. Every architectural decision should serve this mission.”

No. This is a workflow bug fix that preserves the warm leftovers nudge while making the result predictable and reversible.

### Open questions

| # | Question | Blocks | Decision needed by |
|---|---|---|---|
| Q1 | Should the final route be a literal recipe detail route or the current `useSafeBack` destination? | Item 2 | Before implementation; recommended: keep `useSafeBack` unless the owner wants an explicit route replacement. |

### New capability

No: this restores expected navigation and single-submit behaviour for an existing reflection-to-pantry flow.
