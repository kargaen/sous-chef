---
name: sous-chef-product-frontier
description: >
  The Sous Chef product frontier: the seven open problems most worth advancing,
  each with verified current state, the repo's existing asset that makes it
  tractable, the first three concrete in-repo steps, and a falsifiable "you have
  a result when..." milestone. Load this when: the owner asks "what should we
  build next", "what's still open", "what's blocked and why", "is X already
  implemented"; you are planning work on slot adaptation / requestSlotAdaptation,
  pantry-aware suggestions, "you already have this" on the shopping list,
  provider failover / Claude standby, Gemini JSON mode / structured output,
  the Play Store / master release path, Home reflow / no-jump loading /
  skeletons, or test-coverage debt; or you are about to propose a roadmap item
  and need to know whether it is open, partially built, or owner-blocked.
  Keywords: roadmap, backlog, open problems, next feature, Tier 1 adaptation,
  meal plan P3.2, pantry quantities, shopping list, provider switch, failover,
  responseSchema, responseMimeType, JSON mode, release, Play Store, master
  stale, layout shift, skeleton, coverage debt.
---

# Sous Chef product frontier — open problems worth advancing

The owner's stated ambition is **product excellence**: a reliably shippable,
delightful cooking companion. This skill is the map of where the product can
still meaningfully improve, written so a zero-context engineer can pick up any
item without re-deriving the state of the repo.

## Read this first — nothing here is approved work

Every item below is **open** or **candidate**. NOTHING in this file is
pre-approved. Before touching code for any item:

1. Load `sous-chef-change-control` and follow it: plan-before-edit, one file
   per pass, one MVC layer at a time, assumption policy (stop and ask).
2. Get explicit owner consent for the item itself, and separately for anything
   that pushes to `dev` — **a push to `dev` that touches non-doc files
   triggers a quota-consuming EAS build** (see `sous-chef-build-run-release`;
   `.github/workflows/rc-android.yml` `paths-ignore` exempts only `.claude/**`,
   `**.md`, and `.github/**`).
3. Items marked **owner-blocked** need an owner decision before any step
   beyond reading; do not "unblock" them yourself.

Jargon used below, defined once:

| Term | Meaning in this repo |
| --- | --- |
| Controller | A React hook in `src/controllers/` (e.g. `useMealPlanController.ts`) — the only layer that writes Zustand stores and calls services/repositories. |
| Variant | An adapted copy of a recipe linked to its original via `parentId` (built by `AdaptationService.buildVariantRecipe`, rendered/promoted on the recipe screen). |
| Tier 0 / Tier 1 (meal plan) | Tier 0 = free linear servings scaling, no LLM, no variant (`setSlotServings`, shipped). Tier 1 = LLM adaptation of a slot's recipe into a saved variant the slot then points at (specced, not shipped as a user action). |
| Epic | A planning doc at repo root: `MEAL_PLAN_EPIC.md`, `LANDING_DISCOVER_MERGE_EPIC.md`, `COOKING_STATS_EPIC.md`. |
| JSON mode | Gemini's `generationConfig.responseMimeType: "application/json"` (+ optional `responseSchema`) which constrains output to parseable JSON. Not used anywhere in this repo today. |

## The frontier at a glance

| # | Problem | Status | Blocking factor |
| --- | --- | --- | --- |
| 1 | Per-slot Tier-1 adaptation (`requestSlotAdaptation`, MEAL_PLAN P3.2) | Open | Design decision: route through existing adapt flow vs one-shot |
| 2 | Pantry-aware suggestions + shopping-list "you already have this" | Open, epic-deferred | Pantry quantities are not trustworthy (no depletion tracking) |
| 3 | LLM provider failover (Claude standby → setting-driven switch) | **Candidate — currently out of scope per owner** | Owner decision + unfunded Anthropic account |
| 4 | Structured-output hardening: JSON mode across all 22 prompts | Open | Must not race the open adaptation-parse-bug investigation |
| 5 | Production release path (un-stale master, Play Store) | **Owner-blocked** | Release scope, signing, store account are owner decisions |
| 6 | Home no-jump loading (reflow under the reader) | Open, partially done | Discover lanes + generation zone still reflow |
| 7 | Test-coverage debt (stores/utils first) | Open enabler | None — cheapest item on this list |

---

## 1. `requestSlotAdaptation` — Tier-1 per-slot meal-plan adaptation

**Spec**: `MEAL_PLAN_EPIC.md` — Tier-1 definition around lines 166–177, API name
at line ~289, build-order item `P3.2` at line ~321: *"Tier 1:
`requestSlotAdaptation` → existing adapt flow → bind variant to slot
(confirm-first)"*.

**Verified current state** (2026-07-02):

- `grep -rn requestSlotAdaptation src/` → **zero hits**. The name exists only
  in `MEAL_PLAN_EPIC.md`. Not implemented.
- `src/controllers/useMealPlanController.ts` has Tier 0 shipped
  (`setSlotServings`, line ~186) and — important nuance — **a close cousin
  already works**: `applyPendingAdaptation(slotId, description)` (lines
  ~224–291) runs the P5.4 path for AI-draft "pending adaptation intents": it
  calls `LLMService.send` with `buildAdaptationPrompt`, validates with
  `AdaptationResponseSchema`, saves a variant via
  `AdaptationService.buildVariantRecipe` + `recipeRepo.save`, and repoints the
  slot's `recipeId` at the variant. What's missing is the **user-initiated,
  confirm-first** version launched from a slot in the plan view.

**Why it's hard**: the epic says "→ existing adapt flow", i.e. the
conversational `RecipeAdaptScreen` (route `app/recipe/adapt.tsx`, takes
`?id=<recipeId>`). That screen saves variants but has **no mechanism to hand
the new variant id back to a meal-plan slot** — its hook
(`RecipeAdaptScreen.hooks.ts`) only reads `{ id }`. Choosing between (a)
extending the adapt flow with a return-binding param and (b) reusing the
one-shot `applyPendingAdaptation` shape behind a confirm sheet is a product/UX
decision, not a code decision. Per the assumption policy: ask, don't pick.

**Asset**: the entire adaptation pipeline exists and is field-proven —
`AdaptationService` (variant building via `parentId`), `promoteVariant`
(in `useRecipeController.ts` / `RecipeRepository.ts`), the recipe screen's
variant switching, `buildAdaptationPrompt`, `AdaptationResponseSchema`, and a
working slot-rebinding example in `applyPendingAdaptation`.

**First 3 steps in this repo**:

1. Read the spec and the working analog side by side:
   `MEAL_PLAN_EPIC.md` (Tier-1 section + P3.2) and
   `src/controllers/useMealPlanController.ts:224-291`.
2. Put the routing question to the owner with both options costed:
   one-shot confirm sheet (smallest diff, controller-only first pass) vs
   full conversational adapt flow (needs a slot-binding param on
   `app/recipe/adapt.tsx` — a navigation-layer change).
3. On approval, implement the smallest slice in one file:
   `requestSlotAdaptation` in `useMealPlanController.ts`, reusing the
   `applyPendingAdaptation` internals, gated behind an explicit confirm
   (Tier 1 is confirm-first by spec — it costs an LLM call).

**You have a result when**: from the plan view, a slot with a recipe can be
adapted ("make it vegetarian"), the user confirms before any LLM call runs, a
new variant appears under the original recipe's variant switcher, the slot's
`recipeId` points at the variant, and `deriveShoppingList` output reflects the
variant's ingredients — all verifiable on-device without touching the recipe
screen. Falsifier: if the slot still derives shopping lines from the parent
recipe, it does not count.

---

## 2. Pantry-aware suggestions + shopping-list "you already have this"

**Verified current state**:

- `MEAL_PLAN_EPIC.md` lines ~375–377 explicitly defers it: *"pantry-aware 'you
  already have this' on the shopping list (depends on trustworthy pantry
  quantities)"* — listed under "Out of scope (later, not this epic)".
- The structural pieces exist: SQLite `pantry` table
  (`src/services/StorageService.ts:48`), `PantryItem` with `quantity: number`
  and `unit: string` (`src/models/types/Pantry.types.ts`), ingredient matching
  utils (`src/utils/ingredientMatcher.ts`: `normalizeIngredientName`,
  `tokenizeIngredientName`, `matchIngredient`, `sortIngredientMatches`),
  pantry-fed generation (`generateFromRequest(text, usePantry)` in
  `useMealPlanController.ts:566`), and pantry LLM suggestions
  (`buildPantrySuggestionsPrompt` consumed by `usePantryController.ts`).

**Why it's blocked**: quantities are entered once and never depleted. The app
tracks `usedCount` (incremented per use, `usePantryController.ts:330`) but
**never decrements `quantity`** — `grep -rn "quantity" src/controllers/usePantryController.ts`
shows quantity only set at add/edit time. So "you have 200g flour" is a claim
the app cannot stand behind, and a shopping list that wrongly says "you
already have this" actively harms trust. The epic's deferral is correct: the
blocker is a **data-trust problem, not a UI problem**. Any fix starts at the
model/controller layer (a depletion or staleness signal), not at the shopping
list.

**Asset**: `pantry` table + typed quantities + `usedCount` telemetry +
`ingredientMatcher.ts` (already fuzzy-matches names) + the shopping-list
derivation pipeline (`deriveShoppingList` in `useMealPlanController.ts`,
`ShoppingListRepository.ts`).

**First 3 steps in this repo**:

1. Quantify the trust gap: read `usePantryController.ts` add/edit/markUsed
   paths and confirm no depletion write exists (re-verify with the grep above).
2. Propose to the owner the smallest trust primitive — candidates: (a)
   presence-only matching ("you have *some* flour", no amounts — sidesteps the
   quantity problem entirely), (b) staleness decay via `lastSurfacedAt` /
   `createdDate`, (c) explicit "still have it?" confirm prompts. Option (a) is
   the only one that unblocks the shopping-list feature without solving
   depletion; say so.
3. On approval, prototype presence-only matching as a pure function first:
   pantry names × shopping-list lines through `matchIngredient`, in
   `src/utils/` with tests — no UI, no schema change, easy rollback.

**You have a result when**: given a plan whose derived shopping list contains
"2 onions" and a pantry containing "onion", the derivation output carries a
machine-checkable "in pantry" flag on that line (assert in a jest test), and
the flag is presence-based — it never claims an amount. Falsifier: any output
that asserts a quantity the user didn't recently confirm.

---

## 3. Provider failover — Claude standby (CANDIDATE, currently out of scope)

**Owner status**: explicitly **not current scope**. Recorded here as a
candidate because the repo already paid most of the cost.

**Verified current state**:

- `src/models/api/llmApi.ts:25`: `const activeProvider: LLMProvider =
  googleProvider;` — the one-line switch, with a comment pointing at a future
  env-driven selection.
- `src/models/api/llm/anthropic.ts`: complete `claudeProvider` implementing
  `LLMProvider` (`DEFAULT_MODEL = "claude-sonnet-5"`), consumed only by its
  gated smoke test. Its API key is **dev-only env**
  (`EXPO_PUBLIC_CLAUDE_API_KEY`, line ~13, `__DEV__`-gated) — in any compiled
  build it resolves to `""`. There is no `claudeApiKey` in `AppSettings`
  (`src/models/types/Settings.types.ts` lists only `geminiApiKey` +
  `geminiModel`), and no provider-selection setting.
- The Anthropic account is unfunded (no free tier), so even the smoke test
  (`RUN_LLM_SMOKE=1 EXPO_PUBLIC_CLAUDE_API_KEY=<key> npx jest anthropic.smoke`)
  cannot pass today.
- `src/models/api/llm/openai.ts` is a stale orphan (zero imports); it is not
  an asset — do not resurrect it as part of this item without asking.

**Why it's blocked**: money and product priority, not code. A real failover
needs a funded key, a `claudeApiKey` settings field (settings layer), a
provider-selection axis, and key-missing UX matching the Gemini path — that is
a multi-file, multi-layer change requiring an explicit owner-approved plan.

**Asset**: the `LLMProvider` interface means every caller is already
provider-agnostic; `claudeProvider` is written and smoke-testable; all traffic
funnels through `LLMService`, so queueing/rate-limit behavior carries over.

**First 3 steps in this repo** (only after the owner re-opens this):

1. Fund the account, then prove the adapter:
   `RUN_LLM_SMOKE=1 EXPO_PUBLIC_CLAUDE_API_KEY=<key> npx jest anthropic.smoke`.
2. Load `sous-chef-config-and-settings` and draft the settings-layer plan
   (`claudeApiKey`, `llmProvider` fields: types → zod → defaults → repository
   → store → controller → screen), one file per pass.
3. Replace the hardcoded line in `llmApi.ts` with setting-driven resolution,
   defaulting to Gemini, only after the settings plumbing exists.

**You have a result when**: on a compiled build (not dev — `__DEV__` traps,
see `sous-chef-build-run-release`), setting provider=Claude plus a device-set
key makes conversation, import, and adaptation work end-to-end; and with the
key removed, the app shows the same Settings-directed "add your key" UX the
Gemini path shows — no crash, no silent hang. Falsifier: any flow that still
hits Gemini while the setting says Claude.

---

## 4. Structured-output hardening — JSON mode across all 22 prompts

**Verified current state**:

- `grep -rn "responseSchema\|responseMimeType" src/` → **zero hits**. No
  Gemini JSON mode anywhere. `google.ts` sends no `generationConfig` at all
  (also: no `maxOutputTokens` — responses are unbounded).
- `LLMRequest` (`src/models/api/llmApi.ts`) is just
  `{ system, messages }` — no field to request structured output.
- Hand-rolled JSON extraction is scattered: `extractJsonObject` in
  `useAdaptationController.ts:94`, inline `indexOf("{")` slicing in
  `useMealPlanController.ts:251`, `RatingDimensionsService.ts:43`,
  `prompts/leftoverLoop.ts:44`, `prompts/pantrySuggestions.ts:86`,
  `prompts/homeEnrichment.ts:37`, fence-stripping in
  `useConversationController.ts`, plus bare `JSON.parse` in
  `NudgeService.ts:57`. Each is a separate way to fail.
- 22 prompt builders in `src/prompts/` (25 files minus `index.ts` and 2 tests).

**Why it's hard / caution**: there is an **open bug campaign** on intermittent
adaptation parse failures ("The adaptation came back in an unexpected
format"), with diagnostic logging shipped (commit `4c8f7e0`) and a field repro
pending. Turning on JSON mode before that evidence lands would destroy the
repro and leave the root cause unknown (see
`sous-chef-investigation-methodology`: no fix without a discriminating
experiment). JSON mode is the likely *eventual* hardening, but it must be
sequenced after — or explicitly as the conclusion of — that investigation.
Also, each prompt's expected shape differs; a blanket switch is a 22-surface
change that must go prompt-by-prompt, one file per pass.

**Asset**: every LLM call already funnels through `LLMService.send` →
`llmApi` → `google.ts`, so the transport change is one adapter; and the
parse-failure diagnostic logging from `4c8f7e0` gives a before/after metric.

**First 3 steps in this repo**:

1. Coordinate with the open campaign: load
   `sous-chef-llm-reliability-campaign` (the executable runbook for the
   adaptation bug and JSON-mode decision gates) plus
   `sous-chef-failure-archaeology`; confirm with the owner whether the
   adaptation bug has a root cause yet.
2. Model-layer slice (one file): extend `LLMRequest` in `llmApi.ts` with an
   optional structured-output field (e.g. `responseFormat?: "json"` and/or a
   schema payload) — types only, no behavior change for existing callers.
3. Adapter slice (one file): map that field to
   `generationConfig.responseMimeType` (+ `responseSchema` where a zod schema
   already exists) in `google.ts`; pilot on exactly one caller — the
   adaptation path, since it has both a zod schema
   (`AdaptationResponseSchema`) and failure telemetry.

**You have a result when**: the adaptation parse-failure diagnostic (reason +
snippet, from `4c8f7e0`) stops appearing in exported device logs across
repeated adapt-an-already-adapted-variant sessions — the exact scenario that
failed 3× on 2026-07-02 — while non-piloted prompts are byte-identical in
behavior. Falsifier: one new parse-failure log line from the piloted path.

---

## 5. Production release path — un-stale master, Play Store (OWNER-BLOCKED)

**Verified current state**:

- `master` tip is `71f1c09` (2026-06-15); `dev` is **76 commits ahead**
  (`git rev-list --count master..dev`). Everything users run today is the RC
  APK from `rc-android.yml` (fixed prerelease tag, version `1.0.1-rc.5`).
- `release-android.yml` exists (triggers: push to `master`, `v*` tags) but is
  dormant — and note: it builds with `--profile preview` (**APK**), while
  `eas.json` defines an unused `production` profile (`app-bundle`). Play Store
  requires an AAB, so the release workflow as written cannot produce a
  store-uploadable artifact.
- Android package id: `com.kargaen.souschef` (`app.json`).

**Why it's blocked**: every remaining step is an owner decision or an external
account action: what commit range constitutes the stable release, Play Console
account, signing/credentials in EAS, whether `release-android.yml` should
switch to the production profile. None of this is agent-executable, and both
merging to `master` and tagging trigger quota-consuming EAS builds — **the
build-consent rule applies in full**.

**Asset**: the CI skeleton is done (split RC/release workflows, commit
`135689f`; stale-build cancellation `db46ed0`), the production EAS profile is
already defined, and the RC pipeline proves the build works end-to-end.

**First 3 steps in this repo**:

1. Produce the release inventory for the owner, read-only:
   `git log --oneline master..dev` grouped by feature/fix, flagging anything
   dev-only or half-shipped.
2. Diff the two workflows and write up the concrete gaps (`--profile preview`
   vs `production`, artifact type, versioning source) — as a doc for the
   owner, not as workflow edits.
3. Draft the release checklist (version bump, tag, quota headroom — 15
   Android builds/month resetting on the 1st, consent checkpoints) and hand it
   over. Stop there.

**You have a result when**: the owner has a one-page inventory + checklist and
has made the go/no-go decisions; a "result" for the agent here is
**explicitly not** a merged master or a triggered build. Falsifier: any EAS
build consumed by this item without a recorded owner confirmation.

---

## 6. Home no-jump loading — the page must not reflow under the reader

**Verified current state**:

- `LANDING_DISCOVER_MERGE_EPIC.md` line ~117: section **"Note for later —
  ordered, no-jump loading"** — open guidance, still marked for later. Rule as
  written: *"top-to-bottom, append-only growth — nothing above the reader's
  current position may shift"*, with fixed-height skeletons named the
  preferred fix.
- Partially done already: a reusable `Skeleton` component exists
  (`src/views/components/ui/Skeleton/`) and `HomeScreen.tsx:159` renders three
  `HomeCardSkeleton`s while the top card feed loads
  (`HomeCardSkeleton.tsx` explicitly documents the no-jump intent).
- Still open per the epic note: the `DiscoverFeed` lanes below the cards
  (`src/views/components/discover/DiscoverFeed/`) and the generation zone's
  newly-minted cards, which must reserve their slot while generating.

**Why it's hard**: the enrichment/lanes resolve asynchronously at different
speeds (batched enrichment in `useHomeFeed.ts`), and reserving space requires
per-lane fixed heights that match real rendered content across device widths
— guess wrong and you trade reflow for clipping. It is a view-layer problem
with a measurement component, best attacked one lane at a time.

**Asset**: the preference is already written down (skeletons > ordered
reveal), the `Skeleton` primitive and a worked example (`HomeCardSkeleton`)
exist, and the top-of-feed conversion is a template to copy.

**First 3 steps in this repo**:

1. Reproduce and localize: run `npx expo start`, load Home cold, and note
   which elements shove content — check `DiscoverFeed.view.tsx` (it already
   imports skeleton styling; verify what it covers).
2. Pick the single worst-jumping lane and give it a fixed-height skeleton that
   reserves its slot, modeled on `HomeCardSkeleton` — one view file, one pass.
3. Repeat lane-by-lane; the generation zone's reserve-while-generating slot is
   its own later pass.

**You have a result when**: with a cold cache, you can hold your thumb on the
first visible card while every lane below finishes loading and the card never
moves — on-device, filmable. Falsifier: any visible downward shove of
already-rendered content during load.

---

## 7. Test-coverage debt — stores and utils first (the enabler)

**Verified current state**: 12 test files total. Tested: 2 controllers
(`useCookbookController`, `useRecipeController`), 2 repositories (Cookbook,
Recipe), 2 services (`AdaptationService`, `SafetyService`), 2 prompts
(conversation, recipeAdaptation), `google.ts`, 2 gated smoke tests,
`NewRecipeScreen.hooks`. **Untested: all 13 Zustand stores in `src/store/`,
all 13 util modules in `src/utils/`, 13 of 15 services, 11 of 13
repositories, 16 of 18 controller hooks.**

**Why it matters here**: every other frontier item lands in code that is
currently unverifiable except by hand. Items 1, 2 and 4 all touch parse/derive
logic that is *pure* and therefore cheap to lock down. Coverage is not a
feature — it is what makes the features on this list shippable without fear.

**Why stores/utils first**: they are pure functions and plain state
containers — no native modules, no mocking beyond what `jest.setup.ts`
already provides, no `renderHook` ceremony. Highest safety-per-hour on the
list, and zero product risk.

**Asset**: working jest setup (`jest.config.js`: babel-jest, node env,
`@/ → src/`; `__DEV__` defined in `jest.setup.ts` since `fe95299`) and 12
existing files to copy idioms from (see `sous-chef-validation-and-qa` for the
per-layer patterns).

**First 3 steps in this repo**:

1. Start with `src/utils/planDateUtils.ts` — the meal-plan epic (P1.3) even
   specced it "+ tests" and none shipped. Pure date math, table-driven cases.
2. Then `src/utils/ingredientMatcher.ts` — it directly de-risks frontier
   item 2 (its match semantics become the "you already have this" contract).
3. Then one store as the template for the rest — `mealPlanStore.ts` or
   `pantryStore.ts`, whichever frontier item gets picked up first.

**You have a result when**: `npx jest src/utils` runs green with real
assertions on at least `planDateUtils` and `ingredientMatcher`, and `npm test`
total suite count has grown accordingly. Falsifier: snapshot-only or
assertion-free tests — those add count, not safety.

---

## When NOT to use this

| You actually need | Go to |
| --- | --- |
| Rules for making any edit at all (plan format, one-file/one-layer, consent) | `sous-chef-change-control` |
| Where a file/function belongs; layer map; doc-drift register | `sous-chef-architecture-contract` |
| Building/running/releasing; EAS quota; `__DEV__` build traps | `sous-chef-build-run-release` |
| Something is broken right now and you need triage | `sous-chef-debugging-playbook` |
| Probing Gemini health, reading device logs, smoke tests | `sous-chef-diagnostics-and-tooling` |
| History of a past bug or fix (SHAs, wrong turns) | `sous-chef-failure-archaeology` |
| Forming/testing a root-cause theory in general | `sous-chef-investigation-methodology` |
| Working the open adaptation parse bug / JSON-mode decision itself | `sous-chef-llm-reliability-campaign` |
| LLM layer internals (queue, prompts, providers, parsing idioms) | `sous-chef-llm-reference` |
| What counts as "verified"; how to write tests per layer | `sous-chef-validation-and-qa` |
| Settings/env/storage-key inventory; adding a setting | `sous-chef-config-and-settings` |
| Writing epics, commits, or any .md; UI text rules | `sous-chef-docs-and-writing` |

This skill tells you **what is worth doing and why it's stuck** — never how to
bypass the discipline in those siblings.

## Provenance and maintenance

Facts verified against the repo on **2026-07-02**. Re-verify before relying on
any of them — this file describes a moving frontier, and items get built,
re-scoped, or owner-cancelled. If an item below is shipped, edit its section
to "shipped, see commit <sha>" rather than deleting it.

| Volatile fact | Re-verify with |
| --- | --- |
| `requestSlotAdaptation` still unimplemented (epic-only) | `grep -rn requestSlotAdaptation src/ MEAL_PLAN_EPIC.md` |
| `applyPendingAdaptation` / `setSlotServings` in the controller | `grep -n "applyPendingAdaptation\|setSlotServings" src/controllers/useMealPlanController.ts` |
| Pantry "you already have this" still deferred in the epic | `grep -n "already have this" MEAL_PLAN_EPIC.md` |
| No quantity depletion in pantry controller | `grep -n "quantity\|usedCount" src/controllers/usePantryController.ts` |
| Provider still hardcoded to Gemini | `grep -n activeProvider src/models/api/llmApi.ts` |
| No `claudeApiKey`/provider field in settings | `cat src/models/types/Settings.types.ts` |
| JSON mode still unused; no `generationConfig` | `grep -rn "responseSchema\|responseMimeType\|generationConfig" src/` |
| Prompt-builder count (currently 22) | `ls src/prompts/*.ts \| grep -v "test\|index" \| wc -l` |
| master staleness vs dev | `git fetch && git rev-list --count origin/master..origin/dev` |
| Release workflow still builds `--profile preview` | `grep -n "profile" .github/workflows/release-android.yml` |
| RC-build paths-ignore (docs/skills don't burn quota) | `grep -n -A4 paths-ignore .github/workflows/rc-android.yml` |
| Home skeletons: what exists vs open | `grep -rn Skeleton src/views/screens/HomeScreen.tsx src/views/components/discover/` |
| "Note for later" still open in the landing epic | `grep -n "Note for later" LANDING_DISCOVER_MERGE_EPIC.md` |
| Test-file inventory (currently 12) | `find src -name "*.test.ts*" \| sort` |
| Store/util module counts | `ls src/store src/utils` |
| Open adaptation parse bug status | `git log --oneline --grep=adaptation` and check exported device logs for the `4c8f7e0` diagnostic |
