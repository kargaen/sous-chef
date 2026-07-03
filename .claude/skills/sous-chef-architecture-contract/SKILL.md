---
name: sous-chef-architecture-contract
description: >
  The Sous Chef architecture contract: verified MVC layering, dependency direction,
  naming/placement conventions, the full persistence/store/service/prompt inventories,
  and the DRIFT REGISTER of every known place where ARCHITECTURE.md disagrees with the
  code (code wins). Load this BEFORE: deciding where a new file/function belongs; adding
  a table, AsyncStorage key, store, service, repository, or prompt; importing across
  layers; trusting anything ARCHITECTURE.md says about providers, Supabase, config.ts,
  or the file tree; or answering "where does X live / who owns Y / is the doc right".
  Keywords: MVC, layering, dependency direction, naming convention, .view.tsx,
  component triad, Item/List pair, style hierarchy, controller hook, repository pattern,
  Zustand store list, service list, SQLite tables, AsyncStorage keys, ARCHITECTURE.md
  drift, doc wrong, config.ts missing, Supabase, Anthropic vs Gemini.
---

# Sous Chef — Architecture Contract (verified reality + drift register)

**Doctrine (owner-decided 2026-07-02): when `ARCHITECTURE.md` and the code conflict, THE CODE WINS.**
This skill records the code's reality. Every known doc-vs-code conflict is in the
[Drift register](#drift-register-architecturemd-vs-code) below, each marked
"code wins — do not implement the doc's version". Do not silently edit `ARCHITECTURE.md`
to "fix" drift — route doc updates to the owner as a proposal.

`ARCHITECTURE.md`'s **rules** (layering, naming, component conventions, style hierarchy)
remain accurate and enforced. Its **inventory** (file tree, provider names, counts) has
drifted. Rules: trust the doc. Inventory: trust this skill and re-verify with the
commands at the bottom.

## When NOT to use this

- **Making any edit, plan, commit, push, build, or release decision** → load
  `sous-chef-change-control` first. It owns the one-file/one-layer discipline, rabbit-hole
  and iteration-trap rules, and the non-negotiable "never trigger an EAS build (including
  any push to `dev`) without explicit owner confirmation".
- **Debugging or changing LLM behavior** (Gemini errors, 429s, queueing, prompts, safety,
  API keys, `__DEV__` traps) → if a sibling skill covering the LLM stack exists under
  `.claude/skills/`, prefer it. This skill only tells you *where* the LLM code lives and
  *who owns what*.
- This skill is a **map**, not a permission slip. Knowing where something belongs does not
  authorize a multi-file or cross-layer change.

## The app in one paragraph

Sous Chef (`package.json` version `1.0.1-rc.5`) is a local-first React Native / Expo SDK 54
cooking-companion app with an embedded LLM assistant (Google Gemini as-built). Solo-developer
project, TypeScript strict. Routing is expo-router file routing in `app/`; every route file is
a one-line re-export of a screen, e.g. `app/(tabs)/pantry.tsx` is exactly
`export { default } from "@/views/screens/PantryScreen";`. All real code lives in `src/`.
Path alias `@/*` → `src/*` (tsconfig `paths` + jest `moduleNameMapper`).

## MVC layering (verified in code)

| Layer | Where it lives | Responsibility | Why it exists |
| --- | --- | --- | --- |
| Model | `src/models/` (`types/`, `schemas/`, `api/`, `repositories/`, `data/`, `defaults/`) | Data shape (TS interfaces), validation (Zod), raw network clients, data-source abstraction | One source of truth for shapes; controllers never touch raw fetch/SQL |
| View | `src/views/` (`screens/`, `components/`, `styles/`, `hooks/`) | Presentation: props in, callbacks out | Testable UI with RNTL; zero I/O in views |
| Controller | `src/controllers/` (`useXxxController` hooks) | Business logic; owns loading/error state; calls repos/services; writes stores | Screens import one controller hook; logic stays out of JSX |
| Service | `src/services/` | Side effects: LLM calls, SQLite/AsyncStorage, clipboard, photos, safety | The I/O boundary — mock it and everything above is pure |
| Prompts | `src/prompts/` | Pure functions `(context) => string` — versioned product personality | Prompt regressions are product bugs; keep them reviewable, snapshot-testable |
| Store | `src/store/` | Zustand global state slices | Cross-screen state without prop drilling; controllers write, views subscribe |

## Dependency direction — the hard import rules

Quoted from `ARCHITECTURE.md` ("Hard rules" + "Dependency Rule"), with as-built corrections marked:

> - Views never import from `services/`, `store/`, `repositories/`, or `prompts/`
> - Controllers never import from `views/`
> - Services never import from `controllers/`, `store/`, or `views/`
> - Prompts never import from anything except `models/types/`
> - Each layer may only import from layers _below_ it. Violations are treated as bugs.
> - View style files may import from `constants/` and `assets/` only.

**As-built corrections (code wins):**

1. **Views DO import Zustand stores.** 10+ view files subscribe directly
   (e.g. `src/views/screens/PantryScreen.tsx` uses `useMealPlanStore((s) => s.activePlan)`,
   and even grabs setters like `setDraftSlots`). The doc's own store section says
   "Controllers write to store; views read via hooks", contradicting its hard rule.
   Operative rule as practiced: **views may subscribe to stores; views must never import
   `services/`, `repositories/`, or `prompts/`** (verified: zero such imports in `src/views/`).
2. **Repositories and services are peers, not strictly stacked.** Repositories import
   `StorageService` (all SQLite/AsyncStorage repos do), while three orchestration services
   import repositories: `NudgeService`, `InspirationService`, `WasteService`. `StorageService`
   is the true bottom of that pair. Per-file the graph is acyclic; do not introduce a cycle.
3. Rules that DO hold, verified: controllers never import views (zero hits); prompts import
   only `../models/types` (type-only); services never import controllers/store/views.

Direction of new code: **views → controllers → repositories/services → models**. When unsure
which side of the repo/service seam something goes on: talks to a table or cache key → repository;
performs an external side effect or multi-repo orchestration → service.

## File placement + naming conventions (accurate — from ARCHITECTURE.md, verified in tree)

| Artefact | Convention | Verified example |
| --- | --- | --- |
| View component | `Name.view.tsx` | `src/views/components/nudge/NudgeCard.view.tsx` |
| View list component | `NameList.view.tsx` | (rule exists; no `*List.view.tsx` currently in tree — see Item/List below) |
| View component hook | `Name.hooks.ts` | `src/views/components/home/TodaysMenuCard/TodaysMenuCard.hooks.ts` |
| Component styles | `Name.styles.ts` | `src/views/components/companion/SousChefCompanion.styles.ts` |
| Screen | `NameScreen.tsx` (+ optional `NameScreen.hooks.ts`, `NameScreen.styles.ts`) | `src/views/screens/PantryScreen.tsx` |
| Controller hook | `useNameController.ts` | `src/controllers/usePantryController.ts` |
| Repository | `NameRepository.ts` | `src/models/repositories/PantryRepository.ts` |
| Service | `NameService.ts` | `src/services/NudgeService.ts` |
| API client | `nameApi.ts` | `src/models/api/recipeApi.ts` |
| Store slice | `nameStore.ts` | `src/store/pantryStore.ts` |
| Utility hook | `useName.ts` | `src/views/hooks/useSafeBack.ts` |
| Prompt template | `camelCaseTopic.ts` | `src/prompts/recipeAdaptation.ts` |
| Type file | `Name.types.ts` | `src/models/types/Pantry.types.ts` |
| Zod schema | `NameSchema.ts` | `src/models/schemas/PantrySchema.ts` |
| Route file | one-line re-export in `app/` | `app/(tabs)/pantry.tsx` |

Tests are **colocated** next to the file under test (`Name.test.ts(x)`), not in a `__tests__/`
directory (the doc's `__tests__/` tree never materialized). 12 test files exist as of 2026-07-02.

## Component folder triad

Non-trivial components get their own folder with up to four files tied by a barrel:

```
ComponentName/
├── index.ts                    # Barrel export only — no logic
├── ComponentName.view.tsx      # JSX only — props in, callbacks out; no useState/useEffect/derivations
├── ComponentName.styles.ts     # StyleSheet.create({}) only — imports src/constants/ only
└── ComponentName.hooks.ts      # Optional — view-local state/animation/formatting; may also import src/utils/
```

- `.hooks.ts` files must NOT import `controllers/`, `store/`, `services/`, `repositories/`, `prompts/`.
  (Exception already noted: views broadly do subscribe to stores; keep new store reads in the
  screen/view, not in `.styles.ts`.)
- Simple fully-dumb components skip the hooks file.
- **As-built variance:** newer domains use the folder triad (`home/TodaysMenuCard/`,
  `ui/Button/`); older domains use flat files in a shared folder with one barrel
  (`pantry/PantryItem.view.tsx` + `pantry/index.ts`). `ui/` primitives name their component
  file `Name.tsx` (not `.view.tsx`), e.g. `ui/Button/Button.tsx`. Follow the pattern of the
  folder you are editing; use the full triad for new non-trivial components.

## Item/List component pair rule

Any component rendering a collection sourced from model data splits in two:
**Item** (`Name.view.tsx`, renders one typed item) and **List** (`NameList.view.tsx`, maps the
array, owns empty state and separators, does nothing else — never fetches, derives, or
transforms; loading/error state comes from the controller as props).
**Status in tree:** `PantryItem.view.tsx` exists; no `*List.view.tsx` file currently exists —
collections are mapped inside screens/feed components today. The rule still applies to new
collection UI; extracting Lists is an accepted follow-up, not a blocker.

## Extraction bias

Prefer extracting a named component over inline markup, even for single use. Extract when the
element maps to a named domain concept (`ExpiryChip`, `CostBadge`), has its own visual state,
would change independently of its parent, appears more than once, or the parent view exceeds
~80 lines of JSX. Rationale: unpicking a monolithic view costs far more than a small
single-use component. When in doubt, extract.

## Style hierarchy (a rule must live at the highest level that makes sense)

| Level | Location | Contains |
| --- | --- | --- |
| 1 | `src/constants/` (`colors`, `spacing`, `typography`, `radius`, `cookingUnits`) | Raw design tokens only |
| 2 | `src/views/styles/` (`screenStyles`, `textStyles`, `cardStyles`) | Named shared styles composed from tokens |
| 3 | `src/views/components/ui/` | Design-system primitive defaults (Button, TextField, Badge, LoadMask, …) — consumers pass variant props, never restyle |
| 4 | `src/views/screens/*.styles.ts` | Only layout unique to that screen |
| 5 | `src/views/components/<domain>/*.styles.ts` | Only what is structurally inseparable from the component |

Before writing any style rule: does it already exist higher up? Should it? Is the override
justified? If the right level is unclear, ask the owner — do not guess. Note the doc's
`constants/skillLevels.ts` and `constants/config.ts` do not exist; actual `src/constants/` is
`colors, cookingUnits, index, radius, spacing, typography`.

## Controller hook pattern

Controllers are the only layer screens call for behavior. Each `useXxxController` owns its
domain's loading/error state, validates with Zod schemas, calls repositories/services, writes
stores, and returns `{ actions..., loading, error }` — never JSX. 18 hooks exist (17 named
`useXxxController` plus `useRegisterAssistantContext`), alongside two non-hook helpers
(`buildHomeBriefing.ts`, `getAssistantGreeting.ts`) and a barrel.
Rationale: every screen has exactly one behavior seam to mock in tests.

## Repository pattern (rationale)

A controller calls `PantryRepository.getExpiringSoon()` and never knows whether the answer
came from SQLite, AsyncStorage, or a remote API. Swapping a storage backend is a
repository-only change. All persistence goes through `src/services/StorageService.ts` —
repositories never import `expo-sqlite` or `AsyncStorage` directly (the five persisted Zustand
stores are the one sanctioned AsyncStorage bypass, via `createJSONStorage`). StorageService API:
`dbQuery<T>`, `dbQueryFirst<T>`, `dbRun`, `dbExec` (all sync SQLite), `storageGetItem/SetItem/RemoveItem`
(async AsyncStorage), `initializeDatabase`, `resetDatabase` (drops the 13 `RESET_TABLES`, recreates schema).

## Persistence inventory (verified 2026-07-02)

SQLite database: `sous-chef.db` (`DATABASE_NAME` in `src/services/StorageService.ts`; schema
created idempotently with `CREATE TABLE IF NOT EXISTS`).

| SQLite table | Owner (only writer/reader) |
| --- | --- |
| `recipes` | `src/models/repositories/RecipeRepository.ts` |
| `cookbooks` | `src/models/repositories/CookbookRepository.ts` |
| `meal_plans` | `src/models/repositories/MealPlanRepository.ts` |
| `budget_periods` | `src/models/repositories/BudgetRepository.ts` |
| `spend_entries` | `src/models/repositories/BudgetRepository.ts` |
| `pantry` | `src/models/repositories/PantryRepository.ts` |
| `habits` | `src/services/HabitService.ts` (a service owns this table directly) |
| `waste_log` | `src/services/WasteService.ts` (ditto) |
| `cook_logs` | `src/models/repositories/CookLogRepository.ts` |
| `ratings` | `CookLogRepository.ts` |
| `rating_categories` | `CookLogRepository.ts` |
| `cook_notes` | `CookLogRepository.ts` |
| `inspirations` | `src/models/repositories/InspirationRepository.ts` |

| AsyncStorage key | Owner |
| --- | --- |
| `app_settings` | `src/models/repositories/SettingsRepository.ts` (`SETTINGS_STORAGE_KEY`). Also read directly by `src/models/api/llm/google.ts` for `geminiApiKey`/`geminiModel` — a deliberate exception so the api layer stays below repositories. |
| `chef_profile` | `src/models/repositories/ChefProfileRepository.ts` (`PROFILE_KEY`) |
| `plan-presets-v1` | `src/models/repositories/PlanPresetRepository.ts` (`STORAGE_KEY`) |
| `discover_dismissal_signals` | `src/models/repositories/DismissalRepository.ts` (`DISMISSAL_STORAGE_KEY`) |
| `seasonal_cache_*` (prefix) | `src/models/repositories/SeasonalRepository.ts` (`CACHE_KEY_PREFIX`) |
| `pricing_cache_*` (prefix) | `src/services/PricingService.ts` (`CACHE_KEY_PREFIX`) |
| `budget-store`, `chef-profile-store`, `cookbook-store`, `meal-plan-store`, `pantry-store` | Zustand `persist` middleware (`createJSONStorage(() => AsyncStorage)`) in the five persisted stores — see store inventory. Managed by zustand, not by any repository |

`ShoppingListRepository` owns no table — it derives the list from `MealPlanRepository` +
`PantryRepository` + `RecipeRepository`. Adding a table or key = add it to the owner file AND
(for tables) to `RESET_TABLES` in StorageService, or reset will silently miss it.

## Store inventory — 13 Zustand stores in `src/store/` (doc lists 7)

Five stores use `persist(…, { name, storage: createJSONStorage(() => AsyncStorage) })`;
the rest are in-memory only and rehydrated by controllers from repositories.

| Store | Persisted? | Holds |
| --- | --- | --- |
| `assistantExternalPromptStore` | no | A pending question+context handed to the assistant from another surface |
| `assistantRouteContextStore` | no | The current route's `SuggestionContext` for the assistant |
| `budgetStore` | yes (`budget-store`) | Active `BudgetPeriod`, spend entries, running total |
| `chefProfileStore` | yes (`chef-profile-store`) | `ChefProfile` + `onboardingComplete` flag |
| `conversationStore` | no (resets between app sessions by design) | Assistant sessions/messages, suggestions, nudge delivery |
| `cookSessionStore` | no | Active cook-mode session: checked ingredient ids / step orders |
| `cookbookStore` | yes (`cookbook-store`) | Cookbooks + uncategorized recipes |
| `mealPlanStore` | yes (`meal-plan-store`) | Active `WeekPlan`, draft slots, derived shopping-list groups |
| `pantryStore` | yes (`pantry-store`) | Live pantry items (set/upsert/remove) |
| `recipeDraftStore` | no | In-progress recipe draft fields (title, ingredientsText, stepsText, …) |
| `settingsStore` | no (settings persist via `SettingsRepository` → `app_settings`) | `AppSettings` + `hasLoaded` |
| `sousChefCompanionStore` | no | Floating companion tone (`happy`/`exhausted`), mode, message, actions |
| `uiStore` | no | Theme, active bottom sheet |

## Service inventory — 15 services in `src/services/` (doc lists 7)

| Service | One line |
| --- | --- |
| `AdaptationService` | Converts LLM adaptation plans/snapshots into valid `Recipe` shapes (text quantities → numbers, fallback to 1 + note) |
| `ClipboardService` | Clipboard read/write wrapper. **Not exported from `services/index.ts`** |
| `HabitService` | Silently records cook-behaviour events into the SQLite `habits` table; summarizes for nudges |
| `HomeEnrichmentService` | One batched, failure-silent background LLM "garnish" call for Home cards; session-cached by card content |
| `InspirationService` | Discover sparks / leftover loop / themes; background LLM + deterministic no-LLM fallbacks; SQLite `inspirations` |
| `LLMService` | Module-level priority queue serializing ALL LLM calls; `"user"` jumps ahead of `"background"`; user-priority 429 retried after 20s up to 2x; availability listeners drive companion "exhausted" state |
| `NudgeService` | Decides when/what to nudge: assembles pantry/profile/habit context, one background LLM call → `NudgeCard`, silent-fail to `null` |
| `PhotoService` | Recipe photos in a durable app directory (survive cache clears); calls `generateImage` from `models/api/image/googleImage.ts` |
| `PricingService` | Ingredient price estimates via `ingredientApi`; AsyncStorage cache `pricing_cache_*` |
| `RatingDimensionsService` | Fixed always-present rating dimensions (stable ids) + LLM-generated per-recipe dimensions. **Exported with extras** (`FIXED_RATING_DIMENSIONS`, type `RatingDimension`) |
| `RecipeImportService` | Fetches a recipe web page on-device (no CORS), prefers JSON-LD Recipe data, falls back to stripped text, hands to LLM importer |
| `SafetyService` | LLM input classification (SAFE/OFF_TOPIC/tiers) + output scan, prompts in `src/prompts/safetyTiers.ts`. **Not exported from `services/index.ts`** |
| `SeasonalService` | Tiny: `getCurrentMonth()` only (seasonal data itself lives in `SeasonalRepository`) |
| `StorageService` | Unified SQLite + AsyncStorage wrapper; schema creation; `resetDatabase` |
| `WasteService` | Writes/queries SQLite `waste_log`; reads `PantryRepository` for expiry |

Background-priority LLM callers (verified): `HomeEnrichmentService`, `InspirationService` (3 call
sites), `NudgeService`. Everything else defaults to `"user"` priority.

## Prompt inventory — 22 modules in `src/prompts/` (doc lists 6)

All pure `(context) => string` (plus two exported constants). Modules: `adaptationPlan`,
`conversation`, `discoverSparks`, `generateMore`, `generateThemes`, `homeEnrichment`,
`inspiration`, `leftoverLoop`, `mealPlanDraft`, `mealPlanning`, `nudgePrompt`,
`outputLanguage` (constant + resolver), `pantrySuggestions` (2 builders), `photoCleanup`
(constant `PHOTO_CLEANUP_PROMPT`), `ratingDimensions`, `recipeAdaptation`, `recipeGeneration`,
`recipeImport`, `safetyTiers` (2 builders), `substitution`, `systemPrompt`, `wasteReduction`.
Barrel: `src/prompts/index.ts`. Prompts import only `../models/types` (type-only). Context
assembly is the controller's/service's job — prompts never fetch.

## LLM/API layer map (ownership only — see the LLM-stack sibling skill for behavior)

| File | Status |
| --- | --- |
| `src/models/api/llmApi.ts` | `LLMProvider` interface (`send`, `stream`); **active provider is one hardcoded line** (line 25): `const activeProvider: LLMProvider = googleProvider;` |
| `src/models/api/llm/google.ts` | Active provider. `DEFAULT_MODEL = "gemini-2.5-flash"` (line 10); key = AsyncStorage `app_settings.geminiApiKey` first, env key only when `__DEV__`; 45s timeout; retries 503/abort/network only (429 fails fast here — LLMService handles user-priority 429s) |
| `src/models/api/llm/anthropic.ts` | Complete `claudeProvider` (`DEFAULT_MODEL = "claude-sonnet-5"`), NOT wired into `llmApi.ts`; only consumer is its gated smoke test |
| `src/models/api/llm/openai.ts` | **Stale orphan** — see weak points |
| `src/models/api/image/googleImage.ts` | `generateImage`, `DEFAULT_IMAGE_MODEL = "gemini-2.5-flash-image"`; reuses `getApiKey` from `google.ts`; consumed by `PhotoService` |
| `src/models/api/client.ts` | Axios instance for the REST clients — **vestigial**, see weak points |
| `src/models/api/{cookbook,recipe,seasonal,ingredient}Api.ts` | REST clients over `client.ts`, consumed by `RecipeRepository`, `CookbookRepository`, `SeasonalRepository`, `PricingService` |

## Drift register (ARCHITECTURE.md vs code)

Every row: **code wins — do not implement the doc's version.** Doc fixes go to the owner.

| # | ARCHITECTURE.md claim (location) | Verified code reality |
| --- | --- | --- |
| 1 | LLM provider is Anthropic (title line 3; data-flow line 62; `llmApi.ts` described as "Anthropic messages endpoint wrapper" line 145; `LLMService` "Anthropic API calls" line 248; testing table "Mock Anthropic API" line 703). Note the Stack table (line 43) was already updated to "Google Gemini API" — the rest of the doc was not | Active provider is Gemini: `llmApi.ts` line 25 hardcodes `googleProvider`; `anthropic.ts` exists but is unwired (and the Anthropic account is unfunded) |
| 2 | Supabase remote sync exists/optional (Stack line 42; data-flow line 62; Offline-First rule 5 line 719) | **Zero Supabase code.** No dependency in `package.json`, no import anywhere in `src/`. The app is purely local |
| 3 | `src/constants/config.ts` holds "API base URLs, feature flags, LLM model string" (line 322); also lists `constants/skillLevels.ts` (line 321) | Neither file exists. `src/constants/` = `colors, cookingUnits, index, radius, spacing, typography`. Model string lives in `google.ts` (`DEFAULT_MODEL`); REST base URL in `client.ts` via `EXPO_PUBLIC_API_BASE_URL` |
| 4 | ~6 prompt templates listed (lines 276–293) | 22 prompt modules in `src/prompts/` |
| 5 | (package.json, not the doc) `"reset-project": "node ./scripts/reset-project.js"` | `scripts/` directory does not exist; `npm run reset-project` will fail. Leftover from the Expo template. Do not "fix" by creating the script; do not run it |
| 6 | Hard rule: "Views never import from … `store/`" (line 75) | Views subscribe to Zustand stores directly in 10+ files (screens and components), occasionally including setters. The doc self-contradicts at line 297 ("views read via hooks"). Operative rule: views may use store hooks; views must never import `services/`, `repositories/`, `prompts/` (holds, verified) |
| 7 | Layer diagram: services import `models/types` only; repositories sit above services (lines 507–518) | `NudgeService`, `InspirationService`, `WasteService` import repositories; repositories import `StorageService`. Repos and services are peers with `StorageService` at the bottom; the per-file graph stays acyclic |
| 8 | File tree lists 7 stores, 8 repositories, 7 services, 9 controllers; `src/hooks/` with `useDebounce`/`useAppState`/`useRegion`/`useTimerCountdown`; `__tests__/` directory; `app/chat.tsx`, `(tabs)/discover.tsx`, `(tabs)/settings.tsx`; screens `DiscoverScreen`/`ChatScreen` | Reality: 13 stores, 13 repositories, 15 services, 18 controller hooks (+2 helpers). No `src/hooks/` (utility hooks live in `src/views/hooks/` — only `useSafeBack.ts`). Tests are colocated; no `__tests__/`. Actual routes: `app/(onboarding)/{welcome,taste-profile,kitchen-setup}`, `app/(tabs)/{index,pantry,plan,recipes/*}`, `app/recipe/{[id],adapt,cook,edit,reflect}`, `app/{chef-profile,settings,shopping-list,index,_layout}`. No chat route — assistant chat is the floating companion overlay. No `DiscoverScreen.tsx`/`ChatScreen.tsx`; discover UI lives in `src/views/components/discover/` |
| 9 | Zustand "persisted with `zustand/middleware/persist` + AsyncStorage" (Stack line 40) | Partially true, not universal: exactly 5 of 13 stores persist (`budget`, `chefProfile`, `cookbook`, `mealPlan`, `pantry`); the other 8 are in-memory and rehydrated by controllers from repositories. Check the store file before assuming state survives restart |

## Known weak points (as-built; do not silently "fix" — raise with owner first)

- **`src/services/index.ts` barrel is partial.** It omits `ClipboardService` and
  `SafetyService`; consumers import those by direct path (`@/services/SafetyService`,
  `../services/ClipboardService`). Mixed import styles are normal here — match the file
  you're editing; don't refactor the barrel as a drive-by.
- **`src/models/api/client.ts` REST layer is vestigial.** Axios instance with
  `baseURL: process.env.EXPO_PUBLIC_API_BASE_URL ?? ""` — that env var is set nowhere
  (no `.env` in repo, nothing in `eas.json`), so `recipeApi`/`cookbookApi`/`seasonalApi`/
  `ingredientApi` calls have no working backend. Repos that call them tolerate failure.
  Do not build features that depend on this layer without owner sign-off.
- **`src/models/api/llm/openai.ts` is an orphan.** Hardcodes `MODEL = "gpt-4o"`, has no
  timeout/AbortController, and has zero importers anywhere. Do not wire it in; do not use
  it as a template (google.ts/anthropic.ts are the maintained patterns).
- **`android.permission.RECORD_AUDIO` in `app.json` is unused.** No audio/speech code or
  dependency exists. Removing it is an owner decision (it changes the built APK — and
  builds require explicit owner consent).
- **Item/List pair rule has no List exemplars yet** — collections are currently mapped
  inline in screens/feeds. Apply the rule to new collection UI.
- Test coverage is thin: 12 test files; all 13 stores, all utils, most services (13/15),
  most controllers, and most repositories (11/13) are untested. Mind the blast radius.

## Provenance and maintenance

Verified 2026-07-02 against the working tree at commit `4c8f7e0` on `dev` by direct
inspection of the repository (read-only). Line numbers are exact as of that commit and may
shift. Re-verify volatile facts before quoting them:

| Fact | Re-verify with |
| --- | --- |
| Active LLM provider line | `grep -n "activeProvider" src/models/api/llmApi.ts` |
| Default models | `grep -n "DEFAULT_MODEL\|DEFAULT_IMAGE_MODEL" src/models/api/llm/*.ts src/models/api/image/*.ts` |
| SQLite tables + reset list | `grep -n "CREATE TABLE\|RESET_TABLES" -A2 src/services/StorageService.ts` |
| Table ownership | `grep -rln "FROM <table>\|INTO <table>" src --include="*.ts" \| grep -v test` |
| AsyncStorage keys | `grep -rn "STORAGE_KEY\|KEY_PREFIX\|PROFILE_KEY" src/models/repositories src/services \| grep -v test` |
| Store count/list | `ls src/store/` and `grep -rn "= create<" src/store/` |
| Which stores persist | `grep -rn "persist(\|name:" src/store/*.ts` |
| Service count/list | `ls src/services/ \| grep -v test \| grep -v index` |
| Barrel gaps | `diff <(ls src/services \| grep -v test \| grep -v index \| sed 's/.ts//') <(grep -o 'from "./[A-Za-z]*"' src/services/index.ts \| sed 's|from "./||;s|"||' \| sort -u)` |
| Repository list | `ls src/models/repositories/` |
| Prompt modules | `ls src/prompts/ \| grep -v test \| grep -v index` |
| Views importing store (drift #6) | `grep -rln 'from "@/store' src/views` |
| Services importing repos (drift #7) | `grep -rn "repositories" src/services/*.ts \| grep import` |
| Supabase absence (drift #2) | `grep -rin supabase src package.json` |
| config.ts absence (drift #3) | `ls src/constants/` |
| reset-project script (drift #5) | `grep -n reset-project package.json; ls scripts` |
| RECORD_AUDIO unused | `grep -n RECORD_AUDIO app.json; grep -rn "expo-av\|Audio\." src app --include="*.ts*"` |
| REST layer env var unset | `grep -rn EXPO_PUBLIC_API_BASE_URL src eas.json; ls -a \| grep "^\.env"` |
| openai.ts orphan | `grep -rln "llm/openai\|openaiProvider" src app` |
| Test file list | `npx jest --listTests` |
