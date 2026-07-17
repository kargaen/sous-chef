# EPIC-010: AI-Assisted Meal Planning Confidence

**Status:** active
**Created:** 2026-07-17
**Architecture baseline:** 50d5309
**Source:** consolidates the still-useful meal-planning threads from EPIC-003. EPIC-004 is retired as shipped/stale Home work, and EPIC-005 remains the separate provider-role decision.

---

## 1. BDD — User Flows

### Flow 1: Adapt a planned slot with confirmation

```gherkin
Given a meal-plan slot points at a saved recipe
When the cook asks for a qualitative change to that slot
Then the app proposes an adapted recipe variant without changing the plan yet
And the slot only re-points at the accepted variant after explicit confirmation
And the shopping list reads ingredients from the accepted variant
```

### Flow 2: Enhance a reusable planning preset with an explicit AI action

```gherkin
Given the cook is in the plan preset area
When they tap a magic/enhance-style AI button
Then the app proposes a preset name and instructions for review
And the cook can edit, save, or discard the suggestion
And nothing is saved until the cook confirms the preset
```

The button is an experiment in whether AI can make better reusable planning prompts. It must be visually distinct from ordinary save controls, isolated to the preset area, and easy to remove if generated presets introduce unexpected ingredients, new planning assumptions, or deviations from what the cook intended.

**Out of scope for this epic:**
- LLM provider failover, provider switching, and Anthropic key UX — EPIC-005 owns that decision because it touches the model/API layer rather than meal-planning behaviour.
- Home urgent tone, seed-rotating sparks, and Home/Discover loading stability — EPIC-004 was stale roadmap cleanup, not meal-planning work.
- Drag-to-reorder, copy/duplicate week, recurring plans, multi-week outlook, and nutrition targets — these were explicitly deferred by the meal-plan source epic and remain separate product bets.
- Pantry-aware “you already have this” shopping-list intelligence — it depends on trustworthy pantry quantities and should be planned as its own inventory-quality thread.

---

## 2. Function Call Signatures

```ts
function requestSlotAdaptation(slotId: string, reason: string): Promise<void>;
```

Queues a transient slot suggestion from an adapted recipe variant; it must not mutate the active plan until the cook accepts the suggestion.

```ts
function suggestPlanPreset(instructions?: string): Promise<void>;
```

Queues a transient preset suggestion with a name and instructions after the cook taps the magic/enhance button; it must not call `PlanPresetRepository.save` until the cook accepts it through the existing preset-save path.

**Not comprehensive.** These are the cross-layer contracts that constrain the controller and view handoff; prompt helpers and parser helpers are deliberately left to implementation slices.

---

## 3. TDD — Testing Strategy

How the flows in §1 become failing tests, and what each function call is measured against.

### Authority for correctness

| Flow | Function call | Authority | Fixture | Tolerance |
|---|---|---|---|---|
| 1 | `requestSlotAdaptation` | Existing adaptation prompt/schema and variant-building contracts | `src/prompts/recipeAdaptation.test.ts`; `src/services/AdaptationService.test.ts` | Exact schema parse; accepted slot references the accepted variant id |
| 2 | `suggestPlanPreset` | Existing `PlanPreset` type plus explicit-save behaviour in `useMealPlanController` | `src/models/types/MealPlan.types.ts`; `src/controllers/useMealPlanController.ts` | Exact `PlanPreset` shape; zero `PlanPresetRepository.save` calls before confirmation |
| 2 | Magic/enhance preset button | Existing save-as-preset area in `MealPlanScreen` | `src/views/screens/MealPlanScreen.tsx` | Button is isolated to the preset area and does not persist anything without the controller confirmation path |

### What is deliberately not tested

- Live LLM quality; controller tests mock `LLMService`/`InspirationService` and assert confirmation boundaries, not model creativity.
- Pixel-perfect preset suggestion UI; the view slice verifies placement and isolation of the magic/enhance button, not exact artwork.
- Provider outage behaviour; EPIC-005 owns provider roles and degradation.

---

## 4. Checklist

- [ ] 1. Add failing slot-adaptation confirmation-boundary tests in `src/controllers/useMealPlanController.test.tsx` — done when the tests prove `requestSlotAdaptation` does not persist a plan change before acceptance and does repoint the slot after acceptance.
- [ ] 2. Implement `requestSlotAdaptation` in `src/controllers/useMealPlanController.ts` — done when item 1 passes and existing meal-plan behaviours remain unchanged.
- [ ] 3. Add failing preset-suggestion confirmation-boundary tests in `src/controllers/useMealPlanController.test.tsx` — done when the tests prove `suggestPlanPreset` creates a transient suggestion and does not call `PlanPresetRepository.save` before confirmation.
- [ ] 4. Implement `suggestPlanPreset` in `src/controllers/useMealPlanController.ts` — done when item 3 passes and the existing `savePreset` path remains the only persistence path.
- [ ] 5. Add the magic/enhance preset button in `src/views/screens/MealPlanScreen.tsx` — done when the preset area can request an AI-enhanced preset, the generated name/instructions remain editable before save, and removing the button would not change preset storage or typed-entry behaviour.

---

## 5. Summary

The section a reader skips to when deciding whether this epic is safe.

### Architecture impact

- [x] No change to ARCHITECTURE.md expected
- [ ] Amends Description sections: <list>
- [ ] **Requires a Constitution change** — a human decision, blocks this epic until resolved

### North star deviation

“The app must feel warm and opinionated, not mechanical. The LLM is a collaborator embedded throughout — not a chatbot bolted on the side. Every architectural decision should serve this mission.”

No. This epic keeps the LLM in the meal-planning flow as a collaborator whose suggestions remain opt-in and reversible until the cook confirms them.

### Open questions

| # | Question | Blocks | Decision needed by |
|---|---|---|---|
| Q1 | AI-proposed plan-preset generation via a magic/enhance button? | Nothing — confirmed. Build as an isolated experiment that remains removable. | Confirmed 2026-07-17 |

### New capability

Yes: confirmed meal-slot adaptation and an explicit AI-enhance preset button deepen the existing meal-planning assistant without adding a separate chatbot-style surface.
