# EPIC-003: Meal Plan — Remaining Slices

**Status:** superseded by EPIC-010
**Created:** 2026-07-12
**Architecture baseline:** 5739e7d (dev, post-shard)
**Source:** carved out of the retired root `MEAL_PLAN_EPIC.md` during governance cleanup. Everything else in that document is verified shipped (slot model, presets repository, scoped shopping with checked-state cache, bump/shift/extend, cooked tie-in via `CookLogRepository.recordCook`).

---

## 1. BDD — User Flows

### Flow 1: Tier-1 slot adaptation (was P3.2)

```gherkin
Given a plan slot pointing at a saved recipe
When the user asks for a qualitative change ("non-spicy, there'll be kids")
Then the app proposes the adaptation and waits for explicit confirmation
And on confirm, the existing adapt flow produces a variant
And the slot re-points at the variant so shopping reads its ingredients
```

Verified absent: `requestSlotAdaptation` appears nowhere in `src/`.

### Flow 2: Ask for a premade preset (was P6.4)

```gherkin
Given the plan home's preset list
When the user asks for a suggested preset
Then an AI-proposed name + instructions appears for tweaking and saving
And nothing is saved without the user's confirmation
```

Verified absent: no premade-preset generation path in `src/`.

**Out of scope (quoted from the source epic, still deferred):**
> Drag-to-reorder, copy/duplicate a specific week, recurring plans. Multi-week
> outlook in one view; auto-replanning on pantry/recipe changes. Nutrition /
> macro targets; pantry-aware "you already have this" on the shopping list
> (depends on trustworthy pantry quantities).

---

## 5. Summary

### Architecture impact

- [x] No change to ARCHITECTURE.md expected — both flows ride existing contracts
  (`AdaptationService` variants, `PlanPresetRepository`).

### North star deviation

No — AI stays opt-in and always confirmed, per the source epic's guardrail.

### Open questions

| # | Question | Blocks |
|---|---|---|
| Q1 | Preset UI label: "themes" or "presets"? (code says presets) | Nothing |
| Q2 | Is P6.4 wanted at all, or is typing instructions enough? | Flow 2 |
