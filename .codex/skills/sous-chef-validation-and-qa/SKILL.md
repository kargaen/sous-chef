---
name: sous-chef-validation-and-qa
description: "Defines what counts as EVIDENCE that a Sous Chef change works: the four-part verification bar (tsc, jest, gated LLM smoke tests, owner device test), the full inventory of the 12 existing test files, the honest map of untested layers, and copy-pasteable patterns for adding tests at each MVC layer using the repo's own mocking idioms. Load this BEFORE: claiming any change is 'verified', 'done', or 'tested'; writing or modifying any *.test.ts(x) file; deciding whether to run the RUN_LLM_SMOKE live smoke tests; answering 'is there test coverage for X', 'how do I test a controller/repository/prompt/service', 'why does this test suite crash with Unexpected token export', or 'can you verify this works in the production build'. Keywords: verify, verified, evidence, test, jest, tsc, typecheck, coverage, smoke test, RUN_LLM_SMOKE, renderHook, mock AsyncStorage, mock expo-sqlite, react-test-renderer, prompt test, snapshot, regression, QA, acceptance."
---

# Validation & QA: What Counts as Evidence

A change to Sous Chef is **"verified"** only when you can point at evidence, not
at reasoning. "The code looks right" and "the types line up" are not evidence.
This skill defines the evidence bar, inventories every test that exists, maps
what is untested, and shows how to add tests using the repo's own patterns.

**Jargon used below, defined once:**

- **tsc clean** — `npx tsc --noEmit -p .` exits 0 (TypeScript compiles with no errors, no output files).
- **jest green** — `npm test` (which runs `jest`) passes all non-skipped tests.
- **smoke test** — an opt-in test that makes a REAL network call to a live LLM API, gated behind the `RUN_LLM_SMOKE=1` env var. Spends real API quota.
- **RC** — Release Candidate: the Android APK that the `rc-android.yml` GitHub workflow builds on every push to `dev` (see the build-run-release skill — pushing to dev REQUIRES explicit owner consent).
- **`__DEV__`** — React Native's global flag: `true` under `npx expo start` and in jest (set manually in `jest.setup.ts`), `false` in EVERY compiled EAS build, including the "preview" RC profile.

---

## 1. The evidence bar

A change is verified only with ALL of the applicable rows below:

| # | Evidence | Command / mechanism | Applies to |
|---|----------|---------------------|------------|
| a | **tsc clean** | `npx tsc --noEmit -p .` | Every change, no exceptions |
| b | **jest green** — including every suite that touches the files you changed | `npm test` (full run) plus `npx jest <pattern>` for the specific suites | Every change, no exceptions |
| c | **Passing gated smoke test** (where feasible — costs real quota, needs a real key) | `RUN_LLM_SMOKE=1 EXPO_PUBLIC_GEMINI_API_KEY=<key> npx jest google.smoke` | Changes to the LLM path: `src/models/api/llm/*`, `src/models/api/llm/google.ts` model/key resolution, provider swap, model pin change |
| d | **Owner device test** via the RC + diagnostic-log loop | Push to dev (OWNER CONSENT REQUIRED) → EAS preview APK → owner installs → reproduces → Settings → Debug → "Share log" (`SettingsScreen.tsx` line ~557) | Any behavior that differs when `__DEV__` is false |

**On (d), be honest in your reports: agents CANNOT verify `__DEV__ === false`
paths themselves.** Jest pins `__DEV__ = true` globally (`jest.setup.ts` line 2)
and `npx expo start` is always dev mode. The env-key fallback, the dev-only
`geminiModel` settings override, and `skipSafetyLayer1` are all dead code in
compiled builds — no test you run can demonstrate what a compiled APK does.
The only verification channel is the owner running the RC on a device and
exporting the diagnostic log (in-memory ring buffer, 500 entries max
(`src/utils/logger.ts` line 32, `BUFFER_MAX = 500`), `info`+ only in builds,
resets on app restart). When your change touches a `__DEV__`-gated branch, say
explicitly: *"verified in dev mode and jest; compiled-build behavior needs an
owner device test."*

**There is no CI test gate.** Neither `.github/workflows/rc-android.yml` nor
`release-android.yml` runs jest or tsc — they only build APKs. All
verification is local and manual. Nothing will catch what you don't run.

### Verified commands

| Purpose | Command |
|---|---|
| Install deps | `npm ci` |
| Typecheck | `npx tsc --noEmit -p .` |
| Full test suite | `npm test` |
| One suite | `npx jest <pattern>` e.g. `npx jest useCookbookController` |
| Lint | `npm run lint` (expo lint) |
| Gemini smoke (live, spends quota) | `RUN_LLM_SMOKE=1 EXPO_PUBLIC_GEMINI_API_KEY=<key> npx jest google.smoke` |
| Anthropic smoke (live; account currently unfunded — expect failure until funded) | `RUN_LLM_SMOKE=1 EXPO_PUBLIC_CLAUDE_API_KEY=<key> npx jest anthropic.smoke` |

---

## 2. Current baseline is RED (as of 2026-07-02) — protocol

On dev HEAD, the repo does NOT meet its own bar. Do not let this surprise you
into "fixing" things outside your slice, and do not let it launder new
breakage.

**Baseline (re-verify before relying on it):**

- `npx tsc --noEmit -p .` → **10 errors** across 6 files: `useMealPlanController.ts`, `usePantryController.ts`, `AssistantShell.view.tsx`, `NudgeSettingsInline.view.tsx`, `PlannedSlotRow.styles.ts`, `NewRecipeScreen.hooks.ts`.
- `npm test` → **2 failed suites, 2 skipped (smoke), 8 passed** (58 tests: 54 pass, 1 fail, 3 skip):
  - `src/prompts/recipeAdaptation.test.ts` — one assertion drifted: the prompt now says `"Write all user-facing text fields in Swedish, even if the cook or the source material uses another language."` but the test expects the older exact substring `"Write all user-facing text fields in Swedish."`. This is the prompt-regression guard FIRING (see §6) — the prompt changed without the test being updated in the same pass.
  - `src/controllers/useRecipeController.test.tsx` — crashes at import time with `SyntaxError: Unexpected token 'export'` from `node_modules/expo-sqlite`. Cause: `useRecipeController.ts` line 2 now imports `CookLogRepository`, which imports `StorageService`, which imports `expo-sqlite` (ESM, untransformed) — and the test mocks `RecipeRepository` but NOT `CookLogRepository`. A dependency was added to the controller without updating the test's mock boundary. See §5 trap box.

**Protocol given a red baseline:**

1. BEFORE editing, capture the baseline: run both commands, note the failures.
2. AFTER editing, re-run. Your bar: **zero NEW tsc errors, zero NEW jest failures, and every suite touching your changed files green.** If your changed file's own suite is one of the pre-existing failures, fixing that suite is in scope for your pass; other pre-existing failures are not.
3. Report pre-existing failures under `Findings for later:` — never fix them as a side effect (root CLAUDE.md one-file discipline).
4. Never report "tests pass" when the run has failures you're classifying as pre-existing. Report the exact counts and the classification.

---

## 3. Test inventory — all 12 files

The whole suite runs in ~2 seconds. `jest.config.js`: babel-jest transform,
`testEnvironment: "node"`, `@/` → `src/`, `clearMocks: true`, setup file
`jest.setup.ts` (defines `__DEV__ = true` and `IS_REACT_ACT_ENVIRONMENT`;
`__DEV__` was missing until commit `fe95299`, which silently broke all
google.ts tests). No `jest-expo` preset, no `@testing-library/react-native` —
hooks are tested with `react-test-renderer` via a custom helper (§5).

| File | What it actually asserts |
|---|---|
| `src/controllers/useCookbookController.test.tsx` | CRUD through a mocked `CookbookRepository`: slugged-id creation with trimmed fields, `getCookbooks(parentId)` pass-through, update merges unchanged fields from the existing record, "Cookbook not found." error surfacing, delete, and repo failure → `error` state ("Could not load cookbooks."). |
| `src/controllers/useRecipeController.test.tsx` | **Currently crashes at import (see §2).** Intended coverage: draft save with parsed ingredients/steps + `HabitService.record("recipe_saved")`, invalid-draft rejection before repo, fetch into `activeRecipe`, repo-failure fallback to `[]`, import routing (empty source rejected; url → companion message, no LLM; missing profile → chef-profile companion; idea/paste → `LLMService.send` with profile in system prompt, fenced-JSON response parsed to draft; LLM failure → "exhausted" companion + error). |
| `src/models/api/llm/google.test.ts` | Key/model resolution via mocked `expo/virtual/env` + AsyncStorage: stored settings key beats env key; env key is dev-only fallback; `DEFAULT_MODEL` used when `EXPO_PUBLIC_GEMINI_MODEL` unset (asserts against the imported constant, not a literal); pinned env model passed through. Asserts the fetch URL, mocked `fetch` — no network. |
| `src/models/api/llm/google.smoke.test.ts` | LIVE (gated `RUN_LLM_SMOKE === "1"`, else `describe.skip`): text model returns parseable JSON `{"ok": true}` (30s timeout). Image test is `it.skip` — Gemini removed image generation from the free tier, so it always 429s with limit 0 regardless of app health. |
| `src/models/api/llm/anthropic.smoke.test.ts` | LIVE (same gate): `claudeProvider.send` returns parseable `{"ok": true}`. The ONLY consumer of `anthropic.ts` — there is no mocked unit test for that provider. |
| `src/models/repositories/CookbookRepository.test.ts` | Against mocked `StorageService.dbRun/dbQuery/dbQueryFirst` with exact SQL strings: trimmed create payload (`INSERT OR REPLACE INTO cookbooks ...`), local read wins over remote `cookbookApi`, delete reparents children and merges `recipeIds` into the parent (asserts call ORDER with `toHaveBeenNthCalledWith`), root delete reassigns to top level, remote fetchAll parse. |
| `src/models/repositories/RecipeRepository.test.ts` | Same pattern for recipes: save preserves nested ingredients/steps as JSON, `getSaved` round-trip, local-before-remote `fetchById`, remote fallback when local miss, delete by id, `reassignCookbookRecipes` rewrites only matching recipes. |
| `src/prompts/conversation.test.ts` | `buildConversationPrompt` output contains recipe-context lines (title, ingredient list, nudge attribution) and ends with the user message; non-recipe context framed as pantry items, no `"recipe:"` string. Plain `toContain` — no snapshots. |
| `src/prompts/recipeAdaptation.test.ts` | `buildAdaptationPrompt` demands JSON-only output, output language directive (explicit and implied), recipe context with `[ingredient-N]` / `[step-N]` id markers, and the response-shape contract (`"changeType": "replace"`, `"adaptedIngredients"?: ...`). **One assertion currently failing — see §2.** These id markers and the shape contract are load-bearing for the open adaptation parse-failure bug. |
| `src/services/AdaptationService.test.ts` | `buildVariantRecipe` pure logic, no mocks: direct variant gets `parentId` = root; variant-of-a-variant FLATTENS to sibling of root; `variantTitle` fallback to parent title; ingredient replace/add/remove application; step replace/add with sequential renumbering; unparseable quantity preserved in `notes`. |
| `src/services/SafetyService.test.ts` | `classify` maps LLM labels T0/T2/OFF_TOPIC/SAFE case-insensitively, trims whitespace, FAILS OPEN to SAFE on unknown label or thrown error; `scanOutput` maps BLOCK/CLEAN, fails open to false; request shape (non-empty system prompt, exactly one user message). Mocks `LLMService.send`. |
| `src/views/screens/NewRecipeScreen.hooks.test.tsx` | `useNewRecipeScreenView` with mocked `expo-router`, `@/controllers`, `@/store`: clipboard URL prefill (mode/input/feedback message), and import success staging the draft in `useRecipeDraftStore.setDraft` then `router.push("/(tabs)/recipes/draft")`; null import → no store write, no navigation. |

---

## 4. The honest gap map

Counts are from directory listings (excluding `index.ts` and `*.test.*`),
verified 2026-07-02. "Untested" means no dedicated test file — some logic is
exercised indirectly through controller tests, but nothing asserts it.

| Layer | Modules | Tested | Untested |
|---|---|---|---|
| Stores (`src/store/`) | 13 | 0 | **All 13** — incl. `settingsStore`, `sousChefCompanionStore`, `conversationStore` |
| Utils (`src/utils/`) | 13 | 0 | **All 13** — incl. `contextWindow`, `ingredientMatcher`, `recipeBuilder`, `rankHomeCards`, `logger` |
| Services (`src/services/`) | 15 | 2 (Adaptation, Safety) | **13/15** — incl. `LLMService` (the priority queue + 429 retry logic has ZERO tests), `StorageService`, `NudgeService`, `HabitService`, `RecipeImportService` |
| Controllers (`src/controllers/`) | 20 | 2 (useCookbook, useRecipe — latter broken) | **18/20** — incl. `useAdaptationController` (owner of the open parse-failure bug: `extractJsonObject` line ~94, `AdaptationResponseSchema.safeParse` line ~118 — untested) |
| Repositories (`src/models/repositories/`) | 13 | 2 (Cookbook, Recipe) | **11/13** — incl. `SettingsRepository`, `PantryRepository`, `MealPlanRepository` |
| Schemas (`src/models/schemas/`) | 10 | 0 | **All 10** zod schemas — incl. `RecipeSchema`, `SettingsSchema` (ARCHITECTURE.md's testing table calls schema parse tests the easiest win: "None needed" as mock boundary) |
| Prompts (`src/prompts/`) | 22 builders | 2 (conversation, recipeAdaptation) | **20/22** — incl. `recipeImport`, `safetyTiers`, `systemPrompt` |
| Views/screens | ~all | 1 hook file (NewRecipeScreen.hooks) | Everything else; no component render tests exist at all |

High-leverage targets if asked "where should a test go first": `LLMService`
queue behavior, `useAdaptationController` parse path (directly serves the open
bug), and zod schema parse/fail cases (cheap, no mocks).

---

## 5. How to add tests per layer — the repo's own patterns

Copy the idioms below from the existing files; do not invent new ones.
Respect one-file discipline: adding a test file IS the one file for that pass.

### Universal rules

- Test file sits NEXT TO the source: `Foo.ts` → `Foo.test.ts` (`.test.tsx` if it renders hooks/JSX).
- `jest.mock(...)` factories must be fully self-contained (jest hoists them above imports). The repo's trick for reaching into a mock: return the mock object AS an extra export from the factory, then grab it with `jest.requireMock(...)` — see any controller test.
- Pin nondeterminism the way the repo does: `jest.spyOn(Date, "now").mockReturnValue(...)`, `jest.spyOn(Date.prototype, "toISOString")`, `jest.spyOn(Math, "random")` in `beforeEach`; `jest.restoreAllMocks()` in `afterEach`.
- `clearMocks: true` is set globally, but existing tests still `mockReset()` explicitly in `beforeEach` — follow suit.

### TRAP: the expo-sqlite import crash (currently live in the repo)

`testEnvironment` is `node` and there is no `transformIgnorePatterns`
override, so ANY unmocked import chain that reaches an Expo native module
(`expo-sqlite`, `expo-clipboard`, ...) crashes the whole suite with
`SyntaxError: Unexpected token 'export'`. This is exactly why
`useRecipeController.test.tsx` is red today: the controller grew an import of
`CookLogRepository` → `StorageService` → `expo-sqlite`, and the test's mock
list wasn't extended. **When a suite dies at import time, read the `at
Object.require` stack in the error — it names the unmocked chain. Mock the
FIRST repo-owned module in that chain** (here: `jest.mock("../models/repositories/CookLogRepository", ...)`),
not the native module itself.

### Model/API layer (pattern: `google.test.ts`)

```ts
jest.mock("expo/virtual/env", () => ({ env: process.env }));   // env access goes through this module
jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: { getItem: jest.fn() },
}));
```

Mock `global.fetch`, save/restore the original and any `EXPO_PUBLIC_*` vars in
`beforeEach`/`afterEach`, and assert on the URL with
`expect.stringContaining(...)`. Assert against imported constants
(`DEFAULT_MODEL`) rather than duplicated string literals.

### Repository layer (pattern: `RecipeRepository.test.ts`)

Mock the single boundary: `jest.mock("@/services/StorageService", ...)`
exposing `dbQuery`, `dbQueryFirst`, `dbRun` as `jest.fn()`; mock the sibling
`../api/*Api` module. Feed rows as `{ data: JSON.stringify(entity) }` (the
tables store JSON blobs). Assert EXACT SQL strings and params in `dbRun`
calls; use `toHaveBeenNthCalledWith` when write order matters. Build fixtures
with a local `makeX(overrides = {})` factory.

### Controller layer (pattern: `useCookbookController.test.tsx`)

Use the repo's own hook harness — there is no @testing-library:

```tsx
import { act } from "react-test-renderer";
import { renderHook } from "@/test-utils/renderHook";   // src/test-utils/renderHook.tsx — returns { result, rerender, unmount }
```

Mock repositories as classes: factory returns
`{ XRepository: jest.fn(() => mockXRepository), mockXRepository }`. Mock
Zustand stores as selector-callers:
`useXStore: (selector) => selector(mockStateObject)` (see the
`chefProfileStore` / `sousChefCompanionStore` mocks in
`useRecipeController.test.tsx`). Wrap every hook action in
`await act(async () => { ... })`; assert both the returned value and the
hook's `error` / `loading` state.

### Service layer (patterns: `AdaptationService.test.ts`, `SafetyService.test.ts`)

Pure logic (AdaptationService): no mocks at all — construct inputs, assert
outputs. LLM-consuming services (SafetyService): mock `./LLMService` with
`send: jest.fn()`, drive it with `mockResolvedValueOnce({ content: "..." })`,
and test the label-parsing/fail-open matrix plus the request shape via
`mockSend.mock.calls[0]`.

### Prompt layer (patterns: `conversation.test.ts`, `recipeAdaptation.test.ts`)

No mocks. Call the builder with a fixture context, assert with `toContain` on
the exact user-facing/contract-bearing lines: JSON-shape contracts, id markers
(`[ingredient-1]`), language directives, and ending/framing invariants
(`prompt.endsWith(userMessage)`). **Not snapshots** — see §7.

### Screen-hook layer (pattern: `NewRecipeScreen.hooks.test.tsx`)

Mock `expo-router` (factory builds `mockRouter` and implements
`useFocusEffect` via `React.useEffect` with `jest.requireActual("react")`),
mock the barrel `@/controllers` returning a mock controller object, mock
`@/store` selector-style. Flush initial effects with
`await act(async () => { await Promise.resolve(); })`.

---

## 6. Smoke-test discipline

**Why gated:** the smoke tests call live APIs and spend real quota — Gemini
free-tier quota is the app's scarcest resource (past incidents: a blind 429
retry tripled quota burn; a quota-zeroed model looked like an outage for
days). They are `describe.skip` unless `RUN_LLM_SMOKE=1`, so `npm test` is
always free and offline. **Never run them in CI** — there is no CI test step
today, and adding smoke tests to one would burn quota on every push.

**What they prove:** the mocked `google.test.ts` can only verify URL
construction. The smoke test is the early-warning that the pinned model
(`DEFAULT_MODEL` in `google.ts`, currently `gemini-2.5-flash`) still responds
and returns parseable JSON. Model availability is volatile (Gemini has
removed models and zeroed free-tier allocations before), so URL-level green
does not imply live green.

**When to run (needs a real key — ask the owner; never commit or echo keys):**

| Moment | Which |
|---|---|
| Before AND after any change to `google.ts`, `llmApi.ts`, or the model pin | `RUN_LLM_SMOKE=1 EXPO_PUBLIC_GEMINI_API_KEY=<key> npx jest google.smoke` |
| Before wiring/funding the Anthropic provider | `RUN_LLM_SMOKE=1 EXPO_PUBLIC_CLAUDE_API_KEY=<key> npx jest anthropic.smoke` (account unfunded as of 2026-07-02 — expect failure until funded) |
| When "is the model/key/quota broken?" needs an answer | Prefer the raw curl probes in the diagnostics-and-tooling skill — a smoke failure alone doesn't discriminate 400 vs 403 vs 429-limit-0 vs 503 |

**When NOT to run:** routine feature work that merely CALLS `LLMService`
(mock it), doc changes, CI, or "just to be safe." A failing smoke test with a
429 body containing `"limit: 0"` means the model has no free-tier allocation
(permanent for that model) — retrying can never fix it; do not loop the smoke
test hoping.

The image-generation smoke test stays `it.skip` until the project has billing
(free tier lost image generation). Do not un-skip it as a "fix."

---

## 7. Acceptance thresholds and the golden inventory

**There are no coverage gates.** `jest.config.js` has no `coverageThreshold`,
no `collectCoverage`, and no CI enforces anything. The bar is qualitative and
per-change: **changed code has tests demonstrating the changed behavior** —
the specific new branch, error path, or contract, not incidental line
coverage.

**Prompt tests are personality regression guards.** ARCHITECTURE.md (Testing
Philosophy section): "Because prompt strings encode the app's personality and
reasoning, regressions in them are product bugs, not just test failures."
Treat a prompt-test failure as a product regression to reconcile deliberately
— either the prompt change was intended (update the assertion IN THE SAME
PASS and say what product behavior changed) or it wasn't (revert the prompt).
Today's `recipeAdaptation.test.ts` failure (§2) is this guard doing its job.
Doc-drift note (code wins; route doc fixes to the owner): ARCHITECTURE.md says
prompt tests are *snapshot* tests and views are tested via *RNTL*, and its
LLMService row says mock the *Anthropic* API — in reality prompt tests are
explicit `toContain` assertions, there is no @testing-library dependency
(react-test-renderer + `src/test-utils/renderHook.tsx`), and the live provider
is Gemini.

---

## 8. What NOT to do

- **No new test frameworks or deps** — no @testing-library/react-native, no jest-expo, no vitest, no msw. The stack is jest 29 + babel-jest + react-test-renderer + the in-repo `renderHook`. (Root CLAUDE.md: agents never install dependencies.)
- **No snapshot sprawl.** Zero snapshots exist (`Snapshots: 0 total`) despite the doc's wording. Explicit assertions on contract-bearing lines beat `toMatchSnapshot()`, which rubber-stamps drift — exactly what prompt tests exist to prevent.
- **No un-gating or CI-wiring of smoke tests**, and never hardcode a key.
- **One file per pass** — a source change and its test update are two files; if both are needed, do the source file, then state the test file as the next step (or get explicit multi-file authorization).
- **Don't "fix" the red baseline as a side effect** — report it under `Findings for later:`.
- **Don't claim device verification you can't perform** — `__DEV__ === false` behavior is owner-device-only evidence (§1d).
- **Never push to dev to "test the build"** — every dev push triggers a quota-consuming EAS build; explicit owner consent is REQUIRED first (see build-run-release skill).

---

## When NOT to use this

| If you need... | Load instead |
|---|---|
| To diagnose a live failure (429/400/503, hangs, parse errors, works-in-dev-not-in-APK) | `sous-chef-debugging-playbook` |
| Raw Gemini probe scripts, log-export field meanings, EAS build inspection | `sous-chef-diagnostics-and-tooling` |
| Build/run/release mechanics, EAS quota, the consent rule, `__DEV__` build semantics in depth | `sous-chef-build-run-release` |
| Where a file/test belongs in the MVC layering, naming conventions, doc-drift register | `sous-chef-architecture-contract` |
| Working discipline for making the edit itself (one file, plan format, stop conditions) | `sous-chef-change-control` |
| LLM layer internals (queue, priorities, prompts, providers) before touching them | `sous-chef-llm-reference` |
| History of past incidents and why fixes look the way they do | `sous-chef-failure-archaeology` |

---

## Provenance and maintenance

Verified against the repo on **2026-07-02** (dev HEAD `6928c9f`). Re-verify volatile facts before relying on them:

| Fact | Re-verify with |
|---|---|
| 12 test files, their locations | `find src app -name "*.test.*" \| sort` |
| Baseline: 10 tsc errors / which files | `npx tsc --noEmit -p . 2>&1 \| grep -c "error TS"` |
| Baseline: 2 failing, 2 skipped suites | `npm test` |
| Jest config (babel-jest, node env, `@/` map, setup file, no coverage gates) | `cat jest.config.js` |
| `__DEV__ = true` pinned in tests | `cat jest.setup.ts` (fix landed in `git log --oneline -- jest.setup.ts` → `fe95299`) |
| renderHook helper exists | `cat src/test-utils/renderHook.tsx` |
| Smoke gate + commands | `grep -rn "RUN_LLM_SMOKE" src/` |
| Image smoke still skipped | `grep -n "it.skip" src/models/api/llm/google.smoke.test.ts` |
| Gap-map counts per layer | `ls src/store src/utils src/services src/controllers src/models/repositories src/models/schemas src/prompts` |
| No test/tsc steps in CI | `grep -n "jest\|tsc" .github/workflows/*.yml` |
| No test-framework deps beyond jest + react-test-renderer | `sed -n '/devDependencies/,/}/p' package.json` |
| Log buffer size 500 | `grep -n "BUFFER_MAX" src/utils/logger.ts` |
| "Share log" export exists | `grep -n "Share log" src/views/screens/SettingsScreen.tsx` |
| Prompt-regression rationale in doc | `grep -n "personality" ARCHITECTURE.md` |
| Adaptation parse path (open bug) | `grep -n "extractJsonObject\|AdaptationResponseSchema" src/controllers/useAdaptationController.ts` |

If the red baseline in §2 has been fixed since, update §2 rather than trusting it — the protocol (baseline-diff before/after) stays valid either way.
