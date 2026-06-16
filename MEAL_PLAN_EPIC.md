# Meal Plan Epic

## Why

The bottom bar promises **Plan** as a first-class destination, Home's "Today's
Menu" card is built and waiting for data, and much of the plumbing already exists —
yet `MealPlanScreen` is still a `PlaceholderScreen` and **no plan is ever created
or saved**. This epic builds the planner for real.

The product belief: planning a week is sometimes a careful, hands-on act and
sometimes a "just sort it out for me" act — often **both in the same sitting**. So
the planner is **dual-mode**: the user can build the plan by hand with AI assists
on tap, _or_ describe the week in plain language and have Sous Chef draft it — and
freely move between the two. AI is an **accelerator that never becomes a wall**:
every AI affordance has a manual equivalent, and a generated plan lands in the same
editable surface a hand-built one does.

The plan is also the **source of truth for the shopping list**, so ingredient
amounts must be correct (scaling), the list must support **shopping a few days at a
time** rather than the whole plan at once, and the plan must **bend to real life** —
spent days stay visible and meals can be bumped, shifted, or the plan extended when
plans change.

Architecture rules hold throughout: **reuse first, one MVC layer at a time, smallest
safe slice, no bespoke styling.** This is the full feature, built incrementally so
each phase is shippable.

## Product shape — two on-ramps, one plan

There is **one editable Plan** at the centre. Two on-ramps fill it:

- **Build it yourself (DIY).** A blank plan; the user fills each day directly. Inline
  AI assists are one tap away but the user drives.
- **Describe it (AI draft).** A single natural-language request box drafts the whole
  plan, which then drops into the same editable view for review and tweaking.

Both converge on the editable plan. Nothing the AI produces is locked; nothing the
user does requires the AI.

## What already exists (reuse-first inventory)

- **Model** — `MealPlan.types.ts` (`MealSlotType`, `MealSlot`, `WeekPlan`,
  `PlanPreference`) + `MealPlanSchema.ts`. Close, but needs extension (below).
- **Repository** — `MealPlanRepository.getByWeek` / `save` / `delete`, backed by
  `meal_plans` (`id`, `week_start_date`, `data` JSON). The JSON blob makes most
  model growth additive — no SQL migration for new slot/plan fields.
- **Controller** — `useMealPlanController` already has `loadPlanForWeek`,
  `savePlan`, `generatePlan` (LLM), `deriveShoppingList`. **No callers yet.**
- **Store** — `mealPlanStore` (`activePlan`, `shoppingList`, setters, `clear`).
- **Shopping** — `ShoppingListRepository.deriveForWeek(weekStartDate)` returns
  grouped list items today; extend it for scoped/partial shopping.
- **Adaptations** — `AdaptationService`, `RecipeAdaptScreen`, and the variant system
  (`parentId`, `promoteVariant`, variant switching on the recipe screen) already
  exist. Tier-1 scaling reuses all of it.
- **Recipes** — `RecipeRepository.getSaved` / `fetchById`; ingredient tokeniser in
  `utils` for fuzzy matching; `/recipes/new?seed=` accepts a seed.
- **Inspiration machinery** — `InspirationService`, spark prompt/parser, and the
  `savingsBiasFromSettings` pattern are reusable for inline suggestions and the
  generation context bundle.
- **Settings** — `useSettingsController` + `SettingsRepository` are the single
  source of truth; the nudge-frequency setting(s) already bias generation elsewhere.
- **Home** — `TodaysMenuCard` reads `activePlan` and matches `slot.date === today`.

## Model changes required

Owned up front, not discovered:

1. **A slot is recipe _or_ note — never a suggestion.** Extend `MealSlot` with `recipeId?: string | null`, `note?: string`, optional `servings`, and optional status. Validate at least one of recipeId/note is present on any _persisted_ slot.

   **Suggestions are transient UI state only.** The editable plan view holds a parallel, in-memory list of unresolved suggestion slots alongside the persisted plan. These slots exist only in component/controller state; they are never written to the repository. The user may generate, discard, and regenerate suggestions freely without touching the plan or the recipe database.

   Resolution happens in two moments:
   - **Inline (per-slot "Ask Sous Chef"):** the user sees one suggestion at a time and taps "Accept as note", "Create recipe", or "Try another". No save required; resolution is immediate and deliberate.
   - **First save (AI draft flow):** when the user submits a drafted plan that contains unresolved suggestion slots, the app pauses before writing to the repository and presents a **suggestion review step**: a list of every unresolved suggestion. For each, the user picks "Save as note", "Create recipe" (opens `/recipes/new?seed=…`), or "Remove". Only after all suggestions are resolved (or dismissed) does the plan save. Re-generating the draft before saving is free — no suggestions accumulate in storage between attempts.
2. **Per-slot scaling (Tier 0).** Add a target **`servings`** (already present) as
   the scale driver, with the linear multiplier derived as
   `slotServings / recipe.baseServings`. No extra field strictly needed; expose the
   multiplier in the UI. (Tier 1 adaptations are just a `recipeId` pointing at a
   variant — no new field.)
3. **Optional slot status for real-life shifts.** `status?: "planned" | "cooked" |
"skipped"`. "Spent" can be derived purely from `date < today`, but an explicit
   status enables nicer bump/cook-log behaviour. Optional, additive.
4. **Generalise the week into a plan.** `startDate` (local `YYYY-MM-DD`) + `dayCount`
   (default from settings). Keep the `week_start_date` column as the start key; store
   `dayCount` in the JSON. `WeekPlan` gains `dayCount` and treats `weekStartDate` as
   `startDate`.
5. **New settings** (`Settings.types` + schema + defaults): `weekStartDay` (default
   start weekday) and `defaultPlanLength` (default `dayCount`, 7). Defaults only —
   every plan can override both.
6. **Cached shopping list (no table).** The list is **generated on demand** and
   cached for **~1 day, keyed by its inputs** (scope + a plan signature) in the KV
   store — including per-item checked state — so the user can drop it and pick it up
   again the same day, even across app restarts. When the inputs change (plan edited,
   or simply the next day) the signature no longer matches and it regenerates. No
   relational table; mirrors the existing session-cache pattern.
7. **Plan presets.** A small, durable list of saved `{ id, name, instructions,
defaults? }` presets (Phase 6). Lean toward a KV-backed `PlanPresetRepository`
   (small personal set) over a table.

All slot/plan growth is additive to the stored JSON; zod + defaults grow, existing
rows still parse.

## The editable plan view (anatomy, top → bottom)

1. **Plan header** — title / date range, start day, length; controls to set start
   date + length on create; navigation between plans and a "Today" affordance.
2. **AI request box** — one day-aware natural-language field (see "Full AI draft").
3. **Pantry toggle** — "Use what's in my pantry," feeding generation/suggestions.
4. **Surfaced nudging settings** — live-bound to real `AppSettings` (read + write via
   `useSettingsController`): a reminder of the active bias and a place to change it.
5. **Spent days group** — past/cooked days shown collapsed ("Earlier this plan"), each
   slot still actionable (bump forward) — the plan is a record, not just a forecast.
6. **Active day sections** — today → end, today highlighted, each listing its slots.
7. **Per-slot row** — recipe title (with a scale badge like "×2 · for 8") _or_
   freeform note _or_ a **suggestion chip** (transient only — visually distinct, never persisted). Suggestion chips render in an "unresolved" style so the user can immediately see which slots still need confirmation. They are cleared on rejection or on plan save via the suggestion review step.
8. **Per-day "+ Add"** — the flexible day input (below).
9. **Shopping action** — opens the scoped shopping list (below).
10. **Empty states** — empty day "Nothing planned"; empty plan invites the first
    entry or an AI draft; empty cookbook routes to `/recipes/new`.

## Per-day input — one field, two paths, one parse moment

A single text field per slot. No mode switches. Two paths reach the same outcome:

**Path A — typeahead match (recipe chip morph)**

The field runs fuzzy typeahead as the user types (token/substring, reuse the tokeniser). When the user taps a match the field morphs: the recipe title becomes a **recipe chip** (confirming `recipeId`), and a **note field** opens alongside it for any additional context ("for 8", "make it mild", "double the sauce"). The user can keep typing the note or leave it blank. The note is not parsed in-flight — it is raw text until save.

**Path B — free-form text**

The user types anything freely: "leftovers", "eat out", "Tom's curry for 8, mild". No typeahead match is required. The text is stored as-is and is equally valid. This path is the fallback when typeahead isn't triggered, isn't helpful, or the user simply prefers to write naturally.

**Post-submission parse (both paths)**

At save time, a `parseSlotNote` pass runs over every slot. For recipe-chip slots it parses the note field; for plain-text slots it parses the whole string. It extracts:
- A recipe candidate if confident (fuzzy match → `recipeId`; no confident match → slot stays as `note`)
- A servings hint ("for 8" → `servings: 8`, Tier-0 scale, no LLM)
- Adaptation intents ("mild", "non-spicy", "for kids" → queued as **pending adaptation actions** the user confirms before any LLM runs)

Anything the parser cannot resolve stays as the note string. The user sees the slot rendered correctly after save with any pending actions surfaced below it. Both paths arrive at the same resolved state — the difference is only whether the recipe chip was set during input or inferred by the parser at save.

**Ask Sous Chef (inline suggestion)**

"Suggest something" returns one contextual idea. It lands as a **suggestion chip** (visually distinct from a confirmed recipe chip — outlined/dashed treatment). A note field appears alongside it. The user may tap "Try another" repeatedly without touching the plan or recipe database. Accepting a suggestion promotes it to a recipe chip (if it matches a saved recipe) or keeps it as a suggestion chip; the note field captures any modifications. Resolution to a persisted slot follows the same save-time gate as the AI draft flow.

## Scaling & per-plan adaptations (two tiers)

A slot can be "wrong" for the shopping list in two unrelated ways — **quantity** ("I
need this for 8") and **character** ("non-spicy, there'll be kids"). They get
different tools, and **AI is only ever opt-in**:

- **Tier 0 — linear scale. Free, silent, no variant. The default.** The slot's
  target `servings` drives a multiplier (`slotServings / recipe.baseServings`); the
  shopping derivation multiplies ingredient amounts. No LLM, no saved variant,
  nothing to clean up — the weekly-dinner-party user stays here and never accrues
  variant clutter. For the _shopping list specifically_, linear is almost always
  correct (you really do buy 1.5× the onions); non-linear concerns are a _cooking_
  matter (seasoning, pan size, bake time), not a shopping-quantity one.
- **Tier 1 — AI adaptation. Opt-in, always confirmed.** For cooking-accurate scaling
  _or_ a qualitative change, the user requests an adaptation → reuses the existing
  `AdaptationService` → saves a **variant** (the `parentId` system the recipe screen
  already renders + can promote) → the slot points at that variant. The shopping list
  then reads the variant's own ingredients. This doubles as the well-known
  recipe-site "scale" feature plus qualitative power ("non-spicy for kids").

**Guardrail:** linear scaling is silent and free; **any AI adaptation is always
confirmed.** The AI-draft parser sets `servings` for "scaled to 8" (Tier 0, no LLM),
but for "non-spicy, kids" it surfaces a **pending action** ("Adapt Tom's Curry →
non-spicy for kids?") the user taps to run — never a silent pile of LLM tasks or
variants.

**Decision:** express scaling as **target servings** ("for 8") with the multiplier
shown, rather than a raw multiplier field (recommended).

## Full AI draft (the describe-it on-ramp)

The request box accepts rich, **day-specific** natural language, e.g. _"Easy
weekdays, big weekend; Wednesday friends over for [dish]; maybe leftovers Thursday."_

- Build a deterministic **context bundle** (mirror `buildGenerationContext`): start
  date + length, per-day framing, season, pantry/expiring **iff the toggle is on**,
  recent cooks, tastes, the **nudging bias** from settings.
- One LLM call + tolerant parser (mirror `parseSparks`/`parseGeneratedThemes`) → a
  draft Plan. Each day resolves to one of three outcomes: a **saved recipe when confident** (fuzzy match on title), a **freeform note** for explicit literals ("leftovers", "eat out"), or an **unresolved suggestion** for everything else. Low-confidence meal ideas always land as suggestion slots — never auto-promoted to notes. The user must explicitly confirm them.
  Scale-only phrases set `servings`; qualitative ones become **pending adaptation actions**.
- **Review before save** — the draft lands in the editable view as a mix of recipe slots, note slots, and suggestion chips. The user reads, tweaks, and can re-generate as many times as they like; none of this touches the repository. Only when the user taps **Save plan** does anything persist.
- **Suggestion resolution gate (first save)** — if the plan contains any unresolved suggestion slots when the user saves, a **suggestion review sheet** appears before the repository write. It lists every suggestion with three actions per row: "Save as note", "Create recipe" (seeds `/recipes/new?seed=…` and parks the slot until the recipe is saved), or "Remove". Once all suggestions are resolved or removed, the plan writes. Aborting the sheet returns the user to the editable view with suggestions still intact for further iteration.

## Plan presets (saved plan "themes")

A recurring planning style deserves to be saved and reused. A **plan preset** boils a
plan request down to a **name + a set of loose instructions** that auto-populate a new
plan via the AI draft — e.g. _"Easy weekdays, splurge the weekend"_ or _"Summer
holiday mode — greens and grill every day."_ It is, in effect, a **named, saved version
of the AI request box** (plus its context toggles), reusable on tap.

- **Plan home always offers "Create plan"** (blank/manual). Beneath it sit the user's
  saved presets; tapping one starts a new plan and runs the draft from its
  instructions (still review-before-save). The blank create path is never hidden.
- **Save a preset** two ways: name + type the loose instructions, or **boil down the
  current plan/request** into a preset (the request text becomes the instructions; offer
  an AI-suggested short name).
- **Ask for a premade preset** — an optional button requests an AI-proposed preset
  (name + instructions) to tweak and save, mirroring the Discover LLM-themes pattern.
- A preset stores `{ name, instructions, defaults? }` (defaults may carry `usePantry`,
  `dayCount`, etc.). It holds **instructions + context only — never pinned recipes** —
  so it stays evergreen and re-draws fresh each use.

**Naming note:** "theme" already denotes the Discover recipe-idea themes
(`DiscoverTheme`); these are **plan presets** in code to avoid the collision. The UI
label can still read "themes" if you prefer the word — your call.

## Shopping list (partial-shopping first)

The list is derived from the plan but is built for how people actually shop —
**a few days at a time, in more than one trip.**

- **Scope selector.** The user chooses _which days to shop for_: a rolling window
  (e.g. "next 3 days"), today→end, or an explicit day selection. Spent days are
  excluded by default. "Shop for 3 days if that's how you roll" is the headline case.
- **Scoped, scaled aggregation.** Extend `deriveForWeek` → `deriveForDates(dates[])`:
  gather the scoped slots, apply Tier-0 multipliers / read Tier-1 variant ingredients,
  and **aggregate duplicates** (two recipes needing onions → one summed line),
  grouped by aisle/category (the existing `ListGroup` shape).
- **Partial completion via a 1-day cache.** The derived list + per-item **checked**
  state are cached for ~1 day, keyed by inputs (scope + plan signature), in the KV
  store. The user buys part of it, leaves, and returns the same day to exactly where
  they left off — across app restarts — without a database table.
- **Inputs change → regenerate.** If the scope or the plan changes (or it's a new
  day), the signature no longer matches and the list regenerates fresh; checks reset.
  Accepted trade-off: a changed plan means a changed list anyway, so we don't try to
  reconcile checks against an edited plan.
- **Print/share** the scoped list (the original "print a shopping list" goal).

## Plan shifting & spent days (mostly non-LLM)

Real plans slip. These are deterministic plan/date operations — **no LLM** — so they
stay instant and free:

- **Spent days stay visible.** Days before today (or marked cooked) render in a
  collapsed "Earlier this plan" group, so the plan reads as a record too.
- **Bump a meal.** A planned meal that didn't happen (spur-of-the-moment invite
  elsewhere) can be **bumped** to a future day — move the slot's `date` forward.
- **Shift the plan.** Slide the remaining (today-onward) slots forward by N days when
  everything pushes back a day.
- **Extend the plan.** Append days at the end (`dayCount += n`) when the plan needs to
  run longer.
- **Cooked tie-in (optional).** Marking a slot cooked can log it via
  `CookLogRepository`, and feeds the spent/skipped distinction for bump logic.

All of this rides on the one date util; Today's Menu keeps matching `slot.date ===
today`, so it follows shifts automatically.

## Week start & length (generalised convention)

- `weekStartDay` **user setting** = the default start weekday; a new plan defaults its
  `startDate` accordingly.
- **Plans are not locked to it** — on create, the user picks **any start date** and
  **any length**, because real schedules don't all begin Monday.
- One small util owns the math (`planStart(setting)`, `addDays`,
  `eachPlanDay(startDate, dayCount)`); the plan stores explicit `startDate` +
  `dayCount`.

**Decision (recommended): flexible length + arbitrary start, default 7 from the
setting.** Fixed 7-day would contradict "start on any weekday"; once start is
arbitrary, variable length is nearly free. Keep the _default_ a clean 7.

## MVC mapping (reuse-first)

- **Model / Schema:** extend `MealSlot` (optional `recipeId`/`note`, optional
  `servings`/`status`), add `dayCount` to the plan, add `weekStartDay` +
  `defaultPlanLength` to settings, and a persisted shopping-list shape (scope +
  checked). Update zod + defaults; reads stay backward-safe.
- **Util:** `planStart` / `addDays` / `eachPlanDay` (pure, tested).
- **Repository:** `MealPlanRepository` unchanged for plans; `ShoppingListRepository`
  gains `deriveForDates` + persisted checked state.
- **Service:** plan-generation prompt + parser (new); context-bundle builder
  (reuse/extend); per-slot suggestion reuses spark generation; **scaling/adaptation
  reuse `AdaptationService`**; title→`recipeId` resolution is a service concern.
- **Controller:** extend `useMealPlanController` with `createPlan`, `addSlot` /
  `updateSlot` / `removeSlot` / `setSlotNote`, `assignRecipe`, `setSlotServings`
  (Tier 0), `requestSlotAdaptation` (Tier 1, confirm-first), `bumpSlot(toDate)`,
  `shiftPlan(byDays)`, `extendPlan(days)`, `generateFromRequest(text,{usePantry})`,
  `suggestForSlot(...)`; shopping: `deriveForDates`, `toggleShoppingItem`. One active
  plan in the store.
  `parseSlotNote(slot)` runs at save time (not in-flight) over every slot: extracts a
  confident recipe match → `recipeId`, a servings hint → `servings` (Tier 0, no LLM),
  and adaptation intents → queued pending actions. Unresolved text stays as `note`.
  This is the single parse moment for both the free-text path and the chip+note path.
- **View:** replace the placeholder with the editable plan screen + `DaySection`
  (active + spent), `PlannedSlotRow` (with scale badge), the flexible `AddToDayInput`,
  `PlanRequestBox`, `PantryToggle`, `NudgeSettingsInline` (settings-bound), a
  `ScopePicker` + `ShoppingListView`, and bump/shift/extend affordances.
- **Composition / hydration:** load the current plan into the store on Plan mount and
  where Home needs it, so Today's Menu populates without visiting Plan first.

## Build order (phased; each slice shippable)

**Phase 1 — Foundations & the editable spine**

1. `P1.1` Settings: `weekStartDay` + `defaultPlanLength`.
2. `P1.2` Plan/slot model extension (optional `recipeId`/`note`/`servings`,
   `dayCount`) + zod + at-least-one validation.
3. `P1.3` Date util `planStart`/`addDays`/`eachPlanDay` + tests.
4. `P1.4` Controller: `createPlan`, `addSlot`/`updateSlot`/`removeSlot`/`setSlotNote`;
   persist + store hydration. No UI.
5. `P1.5` Read-only plan view (days/slots, empty states).
6. `P1.6` Manual editing: freeform add + remove. First write path.
7. `P1.7` Today's Menu hydration on Home.

**Phase 2 — DIY inline assists** 8. `P2.1` Fuzzy recipe typeahead → `assignRecipe`. 9. `P2.2` Unified `AddToDayInput` (text ⟷ pick in one field). 10. `P2.3` Per-slot "Ask Sous Chef" → accept as note or seed creator.

**Phase 3 — Scaling & per-plan adaptations** 11. `P3.1` Tier 0: `setSlotServings` + derived multiplier + scale badge. 12. `P3.2` Tier 1: `requestSlotAdaptation` → existing adapt flow → bind variant to
slot (confirm-first).

**Phase 4 — Pantry & live settings surface** 13. `P4.1` `PantryToggle` (per-generation, seeded from setting) feeding context. 14. `P4.2` `NudgeSettingsInline` bound live to `useSettingsController`.

**Phase 5 — Full AI draft** 15. `P5.1` Plan-generation prompt + tolerant parser → draft Plan (recipe | note | suggestion per slot). 16. `P5.2` Day-aware context bundle (reuse/extend). 17. `P5.3` `PlanRequestBox` → `generateFromRequest` → editable view with suggestion chips visible; user can re-generate freely. 18. `P5.4` Title→recipe resolution + scale/adaptation intent (scale sets servings; qualitative → pending adaptation action). 19. `P5.5` Suggestion review sheet on first save: list unresolved suggestions → "Save as note" / "Create recipe" / "Remove" per row → plan writes only after all are resolved.

**Phase 6 — Plan presets (themes)** 19. `P6.1` `PlanPreset` model + KV-backed `PlanPresetRepository` (save/list/delete). 20. `P6.2` Plan home: "Create plan" + saved-presets list; tap a preset → new plan
drafted from its instructions. 21. `P6.3` Save a preset (name + instructions, or boil down the current request with
an AI-suggested name). 22. `P6.4` "Ask for a premade preset" (AI-proposed preset to tweak + save).

**Phase 7 — Shopping list (partial-first)** 23. `P7.1` `deriveForDates` + scaled, aggregated, grouped lines. 24. `P7.2` `ScopePicker` (rolling window / today→end / explicit days). 25. `P7.3` 1-day input-keyed KV cache holding the derived list + checked state;
same-day pick-up; regenerate on signature change. 26. `P7.4` Print/share the scoped list.

**Phase 8 — Plan shifting & spent days** 27. `P8.1` Spent-days group (collapsed, derived from date/status). 28. `P8.2` `bumpSlot(toDate)`. 29. `P8.3` `shiftPlan(byDays)` + `extendPlan(days)`. 30. `P8.4` Optional cooked tie-in via `CookLogRepository`.

**Phase 9 — Creation controls & polish** 31. `P9.1` Start-date + length picker on create (defaults from settings). 32. `P9.2` Plan navigation / "Today", today highlight, slot ordering.

## Risks / gaps

- **Slot polymorphism.** Persisted slots are recipe or note only — never suggestion. The suggestion review gate on first save is the single enforcement point. Unresolved suggestion slots must live in controller/component state, never in the plan model passed to the repository. Any code path that writes a slot must assert that at least one of `recipeId`/`note` is set.
- **Title resolution.** "Tom's curry" must not silently bind to a random saved curry;
  resolve only on confident match, else a note.
- **Token cost / latency.** Generation and per-slot suggestion are explicit/on-demand;
  never auto-fire on load; cache stable inputs.
- **Scaling correctness.** Tier 0 is shopping-accurate but not cooking-perfect; Tier 1
  is the opt-in fix — keep the boundary clear in the UI.
- **Shopping cache invalidation.** Checked state lives only while the inputs (scope +
  plan signature) are unchanged; any edit or a new day regenerates and resets — by
  design, the accepted trade-off.
- **Settings write-through.** Surfaced settings mutate real `AppSettings`, no shadow
  copy.
- **One active plan in the store.** Navigating/shifting swaps it; be explicit.
- **Time zones / DST.** Local-time, date-only string compares everywhere.
- **Empty cookbook.** Every recipe-dependent affordance falls back to create.

## Decisions to confirm

- ✅ **Flexible length + arbitrary start, default 7** — confirmed.
- ✅ **Scaling UX:** target servings — confirmed.
- ✅ **Shopping persistence:** on-demand generation + ~1-day input-keyed KV cache, no
  table — confirmed.
- ✅ **Slot model:** single `MealSlot` with optional `recipeId`/`note`/`servings`,
  zod at-least-one validation — confirmed (Option A).
- ✅ **Inline suggestions:** seed-only — confirmed.
- ⏳ **Preset label & storage:** "plan presets" in code (UI may say "themes"); KV-backed
  repository (recommended) vs. a table — awaiting confirmation.
- ⏳ **"Ask for a premade preset"** in v1 vs. deferred.

## Out of scope (later, not this epic)

- Drag-to-reorder, copy/duplicate a specific week, recurring plans. (Reusable
  _presets_ are now in scope — see Plan presets; copying a concrete week's exact
  recipes is the out-of-scope part.)
- Multi-week outlook in one view; auto-replanning on pantry/recipe changes.
- Nutrition / macro targets; pantry-aware "you already have this" on the shopping list
  (depends on trustworthy pantry quantities).

## Definition of done

- Plan tab opens to an editable plan; the user can **build by hand** (freeform text,
  fuzzy-pick, inline suggestions) **and** **describe a week** to have Sous Chef draft
  it, then edit — all persisted.
- Slots **scale** (Tier 0 servings) and can be **adapted** (Tier 1, confirmed),
  feeding correct amounts downstream.
- The **shopping list supports partial shopping** — scoped to chosen days, scaled and
  aggregated, with persisted check-off across trips.
- The plan **bends to real life** — spent days stay visible; meals bump, the plan
  shifts and extends.
- Plans support **arbitrary start + length**, defaulting from `weekStartDay` /
  `defaultPlanLength`; pantry toggle and **real** nudging settings are surfaced and
  editable.
- **Today's Menu** shows today's planned meals. `tsc` clean; util + parser tested;
  existing suites green.
