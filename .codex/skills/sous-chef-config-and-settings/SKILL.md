---
name: sous-chef-config-and-settings
description: >
  Catalog of every configuration axis in Sous Chef: all AppSettings fields
  (types + zod schema + defaults + who reads each one), every EXPO_PUBLIC_*
  env var and its build-type behavior, the full AsyncStorage-key and SQLite-table
  inventory, app.json / eas.json axes that matter, what src/constants/ actually
  contains, and the verified end-to-end checklist for adding a new setting.
  Load this BEFORE: adding/renaming/removing an AppSettings field; touching
  Settings.types.ts, SettingsSchema.ts, default_settings.ts, SettingsRepository,
  settingsStore, useSettingsController, or SettingsScreen; adding or reading an
  env var; adding an AsyncStorage key or SQLite table; answering "where is X
  configured", "what is the default for Y", "why does this setting do nothing in
  the APK", "is this dev-only", "what env vars exist", "what tables/keys exist";
  or editing app.json / eas.json. Keywords: AppSettings, settings field, default
  value, zod schema, EXPO_PUBLIC, env var, .env, AsyncStorage key, storage key,
  SQLite table, app.json, eas.json, permissions, RECORD_AUDIO, newArchEnabled,
  constants, config.ts, dev-only, __DEV__, geminiModel, skipSafetyLayer1,
  geminiApiKey, debug mode.
---

# Sous Chef — Configuration & Settings Catalog

Every knob in the app, where it lives, who reads it, and how build type changes
its behavior. All paths, line references, and defaults below were verified
against the code on `dev` (see Provenance). When this file and the code
disagree, the code wins — re-verify with the commands in the last section.

Jargon used once, defined once:

- **`__DEV__`**: React Native global. `true` under `npx expo start` (Metro dev
  server), **`false` in every EAS-compiled build** — including the "preview"
  RC APK. There is no dev-client profile in `eas.json`, so no compiled build
  ever has `__DEV__ === true`.
- **EXPO_PUBLIC_ var**: an env var that Metro inlines into the JS bundle at
  bundle time from the environment / a local `.env` file. `.env` is gitignored
  and the CI workflow sets none of them, so in RC/production builds they are
  all empty strings unless someone configures EAS-side env (none is configured
  in this repo).
- **dev-only in EFFECT**: the Settings UI shows the control in every build, but
  the *consumer* of the value is gated with `__DEV__`, so the control does
  nothing in a compiled build. This is the house pattern — gate the effect,
  not the UI.

## When NOT to use this

| You are actually doing... | Load instead |
| --- | --- |
| Debugging LLM errors (429/503/400), prompts, provider swap, queue behavior | `sous-chef-llm-reference` |
| A broken symptom you can't yet localize; getting logs off a device | `sous-chef-debugging-playbook` |
| Deciding where a new file/layer belongs; doc-vs-code drift questions | `sous-chef-architecture-contract` |
| Building, running, releasing, EAS quota, CI workflows, `__DEV__` build matrix in depth | `sous-chef-build-run-release` |
| Planning any edit (one-file rule, consent rule, refactor passes) | `sous-chef-change-control` |
| Investigating why a past change was made | `sous-chef-failure-archaeology` |

This skill is the *reference catalog*; the siblings own the *procedures*.

---

## 1. AppSettings — the persisted settings object

Three files define it and MUST stay in sync (see Section 6 for why):

- Type: `src/models/types/Settings.types.ts`
- Zod schema: `src/models/schemas/SettingsSchema.ts` (`AppSettingsSchema`)
- Defaults: `src/models/defaults/default_settings.ts` (`DEFAULT_SETTINGS`)

Persisted as one JSON blob under AsyncStorage key `app_settings` by
`src/models/repositories/SettingsRepository.ts`. Loaded once at app start in
`app/_layout.tsx` into the Zustand store `src/store/settingsStore.ts`
(`useSettingsStore`); read/written through
`src/controllers/useSettingsController.ts` (`loadSettings` / `saveSettings` /
`updateField`).

### Field table

| Field | Type | Default | Zod | Effective in compiled builds? | Read by (consumer of the VALUE) |
| --- | --- | --- | --- | --- | --- |
| `geminiApiKey` | `string` | `""` | `z.string()` (required) | **Yes — the ONLY key source in compiled builds** | `src/models/api/llm/google.ts` `getStoredApiKey()` (reads the `app_settings` blob from AsyncStorage directly, bypassing the repository); Settings UI field (`SettingsScreen.tsx` ~line 76) |
| `keepScreenOn` | `boolean` | `true` | `z.boolean()` | Yes | `src/controllers/useCookingSessionController.ts` (lines ~35, 69–74 keep-awake effect; ~111–119 toggle writes back via repo); rendered in `CookingScreen.tsx` |
| `sustainabilityNudges` | `"off" \| "subtle" \| "default" \| "prominent"` | `"default"` | enum | Yes | `src/services/InspirationService.ts` (~246–247, gates leftover/waste nudges when `"default"` or `"prominent"`); `src/views/components/meal-plan/NudgeSettingsInline/NudgeSettingsInline.view.tsx` (inline cycle control) |
| `learnFromChats` | `boolean` | `true` | `z.boolean()` | Yes | `src/services/InspirationService.ts` (~234, ~423 — gates taste-signal learning); dismissal-signal gating referenced by `DismissalRepository.ts` / `useDiscoverController.ts` comments (the gate itself lives in the service) |
| `assistantOutputLanguage` | `string` (optional in the TS type, **required** in zod — see quirk below) | `"imply"` | `z.string().min(1)` | Yes | `src/controllers/useConversationController.ts` (~211) and `src/controllers/useAdaptationController.ts` (~151) — passed into prompt builders |
| `skipSafetyLayer1` | `boolean` | `false` | `z.boolean()` | **No — dev-only in EFFECT** | `src/controllers/useConversationController.ts:185`: `const skipLayer1 = __DEV__ && (settings?.skipSafetyLayer1 ?? false);` UI toggle always visible in Settings → Debug |
| `weekStartDay` | `0..6` (optional) | `1` (Monday) | `.optional().default(1)` | Yes | `src/controllers/useMealPlanController.ts` (~113–114, ~145); `src/utils/planDateUtils.ts` `planStart()`; `MealPlanScreen.tsx` |
| `defaultPlanLength` | `number` (optional) | `7` | `z.number().int().positive().optional().default(7)` | Yes | `src/controllers/useMealPlanController.ts` (~115, ~146); `MealPlanScreen.tsx` (~24, seeds plan-day-count state) |
| `pantryNudgeFrequency` | `"daily" \| "weekly" \| "monthly" \| "rarely"` (optional) | `"monthly"` | `.optional().default("monthly")` | Yes | `src/controllers/usePantryController.ts` (~430) |
| `geminiModel` | `string` (optional) | `""` | `.optional().default("")` | **No — dev-only in EFFECT** | `src/models/api/llm/google.ts` `getModel()` — the AsyncStorage override is read **only inside `if (__DEV__)`**; compiled builds fall through to `EXPO_PUBLIC_GEMINI_MODEL` → `DEFAULT_MODEL` (`gemini-2.5-flash`). UI card ("Model override") always visible in Settings → Debug |

### Quirks you must know before editing

- **Type/schema mismatch on `assistantOutputLanguage`**: the TS type marks it
  optional (`assistantOutputLanguage?`), but the zod schema requires it (no
  `.optional()`). It survives in practice only because
  `SettingsRepository.get()` backfills missing keys from `DEFAULT_SETTINGS`
  before parsing. Do not copy this pattern; use `.optional().default()`.
- **Repository reset-on-invalid**: `SettingsRepository.get()` runs
  `mergeWithDefaultShape` (backfills missing keys from defaults, rejects
  type-mismatched values) then `AppSettingsSchema.safeParse`. If either fails,
  it **resets ALL settings to defaults — wiping the user's stored
  `geminiApiKey`**. A bad schema change is user-visible data loss.
- **Keep all three files in sync**: the zod schema strips unknown keys
  (default `z.object` behavior). A field present in `DEFAULT_SETTINGS` but
  absent from the schema gets stripped on every save and re-backfilled on
  every load (a silent re-save loop each launch). A field in the schema but
  not in defaults breaks the backfill.
- **`google.ts` reads `app_settings` directly from AsyncStorage** (its own
  `SETTINGS_STORAGE_KEY = "app_settings"` constant at line ~11), not via
  `SettingsRepository`. If you rename the storage key or restructure the blob,
  you must update `google.ts` too. This is a known, deliberate layering
  exception (models/api cannot import a repository).
- `keepScreenOn` is also *written* outside the Settings screen: the cooking
  session toggle persists it through `SettingsRepository.save` with an
  optimistic store update + rollback (`useCookingSessionController.ts`
  ~111–119).

### Debug mode (runtime toggle, NOT an AppSettings field)

Six consecutive taps (each within 1 s of the previous) on the bot avatar on the
Home screen (`src/views/screens/HomeScreen.tsx` ~48–63) call
`useUIStore.enableDebugMode()` and `configureLogger({ minLevel: "debug" })`.
Its only practical effect in a compiled build is raising the ring-buffer logger
from `info` to `debug` until the next app restart (`src/utils/logger.ts`:
`minLevel: __DEV__ ? "debug" : "info"`, buffer max 500 entries, in-memory
only). The Settings → Debug section itself is **always visible** in every
build (gate removed in commit `7817213`); the dev-only fields in it are
effect-gated, not hidden. `debugModeEnabled` in `src/store/uiStore.ts` is set
but currently read by nothing — the logger call is what matters.

---

## 2. Environment variables (every `EXPO_PUBLIC_*` in the codebase)

All are inlined at bundle time (see definition above). Verified complete via
`grep -rn "EXPO_PUBLIC_" src app` — if you add one, add it to this table.

| Var | Read at | `__DEV__`-gated in code? | Behavior |
| --- | --- | --- | --- |
| `EXPO_PUBLIC_GEMINI_API_KEY` | `src/models/api/llm/google.ts:18` | **Yes** | Dev-only fallback API key, used only when the Settings-stored key is empty. Compiled builds ignore it by design — every real user supplies a key via Settings. Also consumed by the live smoke test (`RUN_LLM_SMOKE=1 EXPO_PUBLIC_GEMINI_API_KEY=<key> npx jest google.smoke`). |
| `EXPO_PUBLIC_GEMINI_MODEL` | `src/models/api/llm/google.ts:33` | **No** | Text-model override; falls back to `DEFAULT_MODEL = "gemini-2.5-flash"`. Because it is NOT dev-gated, a value baked at bundle time WOULD apply in a compiled build — but CI sets nothing and `.env` is gitignored, so compiled builds use `DEFAULT_MODEL` in practice. Resolution order: (dev-only) `geminiModel` setting → this var → `DEFAULT_MODEL`. |
| `EXPO_PUBLIC_GEMINI_IMAGE_MODEL` | `src/models/api/image/googleImage.ts:12` | No | Image-model override; default `DEFAULT_IMAGE_MODEL = "gemini-2.5-flash-image"` (the free-tier image model; 3.x image models are paid and 429 instantly). |
| `EXPO_PUBLIC_CLAUDE_API_KEY` | `src/models/api/llm/anthropic.ts:14` | **Yes** | Key for the **standby** Claude provider. `claudeProvider` is complete but NOT wired into `llmApi.ts` (its only consumer is the gated smoke test: `RUN_LLM_SMOKE=1 EXPO_PUBLIC_CLAUDE_API_KEY=<key> npx jest anthropic.smoke`). |
| `EXPO_PUBLIC_CLAUDE_MODEL` | `src/models/api/llm/anthropic.ts:16` | No | Claude model override; default `"claude-sonnet-5"`. Standby, same as above. |
| `EXPO_PUBLIC_OPENAI_API_KEY` | `src/models/api/llm/openai.ts:6` | No | **Orphan.** `openai.ts` has zero importers anywhere (verified). Hardcodes `gpt-4o`, has no timeout. Do not build on it. |
| `EXPO_PUBLIC_API_BASE_URL` | `src/models/api/client.ts:4` | No | Base URL for a **vestigial REST layer** (axios client, 10 s timeout). Consumed by `recipeApi`, `cookbookApi`, `ingredientApi`, `seasonalApi`, which ARE reachable at runtime (recipe search in `useRecipeController`/`usePantryController`, `SeasonalRepository` via `useDiscoverController`/`useSeasonalController`, `PricingService` via `useBudgetController`). No backend exists; with the var unset, baseURL is `""` and those requests fail — call sites are expected to handle the error. Do not extend this layer without owner discussion. |
| `EXPO_PUBLIC_API_TOKEN` | `src/models/api/client.ts:12` | No | Bearer token for the same vestigial REST client (request interceptor). Same status as above. |
| `EXPO_PUBLIC_RESET_DB` | `app/_layout.tsx:41` | **Yes** (`__DEV__ && === "1"`) | One-shot dev switch: set to `1` in `.env`, reload once → `StorageService.resetDatabase()` wipes and recreates every SQLite table. Remove the flag after use. Can never fire in a compiled build. |

Not `EXPO_PUBLIC_` but env-adjacent: `RUN_LLM_SMOKE=1` gates the two live smoke
tests (they cost real quota; never run them casually).

Comment in `llmApi.ts` (~line 24) mentions a *future*
`EXPO_PUBLIC_LLM_PROVIDER` — it does not exist; provider selection is the
hardcoded `const activeProvider: LLMProvider = googleProvider;` line.

**Never commit a `.env` or embed a real key anywhere.** `.gitignore` covers
`.env` and its variants; keep it that way.

---

## 3. Persistence inventory (verified complete)

### SQLite — database `"sous-chef.db"` (`src/services/StorageService.ts`, `openDatabaseSync` at line ~159)

13 tables, all created in `StorageService.ts` `CREATE TABLE IF NOT EXISTS`
statements (lines ~10–130):

`recipes`, `cookbooks`, `meal_plans`, `budget_periods`, `spend_entries`,
`pantry`, `habits`, `waste_log`, `cook_logs`, `ratings`, `rating_categories`,
`cook_notes`, `inspirations`

There is no migration system — tables are create-if-not-exists only. Schema
changes to an existing table need an explicit plan (and the owner), not an
edit to the CREATE statement.

### AsyncStorage keys

Via `StorageService.storageGetItem/SetItem/RemoveItem` (thin AsyncStorage
wrappers, lines ~248–270):

| Key | Owner file | Contents |
| --- | --- | --- |
| `app_settings` | `src/models/repositories/SettingsRepository.ts:6` (also read raw by `src/models/api/llm/google.ts:11`) | The AppSettings JSON blob (Section 1) |
| `chef_profile` | `src/models/repositories/ChefProfileRepository.ts:4` | Chef profile JSON |
| `plan-presets-v1` | `src/models/repositories/PlanPresetRepository.ts:5` | Meal-plan presets array |
| `discover_dismissal_signals` | `src/models/repositories/DismissalRepository.ts:9` | Discover dismissal signals (decay window, not a learning archive) |
| `seasonal_cache_{regionCode}_{month}` (prefix) | `src/models/repositories/SeasonalRepository.ts:5` | Seasonal produce cache, 1-week TTL |
| `pricing_cache_{recipeId}_{region}` (prefix) | `src/services/PricingService.ts:6` | Recipe cost estimates cache |

Via Zustand `persist` middleware (these use AsyncStorage **directly** through
`createJSONStorage(() => AsyncStorage)`, NOT StorageService):

| Key | Store file |
| --- | --- |
| `pantry-store` | `src/store/pantryStore.ts` |
| `meal-plan-store` | `src/store/mealPlanStore.ts` |
| `cookbook-store` | `src/store/cookbookStore.ts` |
| `budget-store` | `src/store/budgetStore.ts` |
| `chef-profile-store` | `src/store/chefProfileStore.ts` |

Adding a key: repositories own AsyncStorage keys; go through
`StorageService.storage*` wrappers so errors are wrapped consistently. A new
persisted store follows the `persist` + `createJSONStorage` pattern above.

---

## 4. `app.json` and `eas.json` — axes that matter

### `app.json` (expo config)

| Axis | Value | Why it matters |
| --- | --- | --- |
| `expo.version` | `"1.0.0"` | **NOT the RC version source.** The RC tag comes from `package.json` `version` (currently `1.0.1-rc.5`) — the CI workflow computes `v{base}-rc` from it (`.github/workflows/rc-android.yml`, "Resolve RC tag from package.json"). Bump `package.json` for releases; whether/when to bump `app.json` is an owner decision. |
| `newArchEnabled` | `true` | React Native New Architecture is ON. Native-module choices must be new-arch compatible. |
| `scheme` | `"souschef"` | Deep-link scheme (expo-router). |
| `android.package` | `"com.kargaen.souschef"` | Application id. Changing it makes installs stop upgrading in place. Never change casually. |
| `android.permissions` | `["android.permission.RECORD_AUDIO"]` | **Unused** — no audio/recording code exists in `src/` or `app/` (verified by grep). Drift candidate: removing it is an owner decision (Play-listing-visible change), not a drive-by cleanup. |
| `android.*` misc | `edgeToEdgeEnabled: true`, `predictiveBackGestureEnabled: false`, `softwareKeyboardLayoutMode: "resize"` | Behavioral flags; tested-as-is. |
| `plugins` | `expo-router`, `expo-splash-screen` (with splash config), `expo-sqlite`, `expo-localization`, `expo-font`, `expo-image-picker` (with photo/camera permission strings) | Config plugins run at prebuild. Adding a plugin = native change = new build required to test (see build-consent rule in `sous-chef-build-run-release`). |
| `experiments` | `typedRoutes: true`, `reactCompiler: false` | Typed routes are generated; React Compiler deliberately off. |
| `extra.eas.projectId` / `owner` | `e2434387-c0b9-4f8c-bb4f-d448f5a87b6d` / `kargaen` | EAS project binding. |

### `eas.json`

| Profile | Android output | Notes |
| --- | --- | --- |
| `preview` | `apk` | What the RC workflow builds on every push to `dev`. |
| `production` | `app-bundle` | Plus `ios.resourceClass: "m-medium"`. Used by the (currently dormant) release workflow. |

**Neither profile sets `developmentClient`, so `__DEV__ === false` in BOTH.**
Every dev-gated behavior in Sections 1–2 is off in every compiled build,
including the "preview" RC APK. This is the single most common source of
"works in expo start, broken in the APK" confusion.

Reminder (canonical, from root CLAUDE.md / change-control): **never push to
`dev` or otherwise trigger an EAS build without explicit owner confirmation** —
builds consume a hard monthly quota.

---

## 5. `src/constants/` — what is actually there

`index.ts` re-exports exactly five modules. **There is no `config.ts`.**

| File | Contents |
| --- | --- |
| `colors.ts` | Design-token palette (background/text/border/brand groups) |
| `spacing.ts` | Spacing scale (`none`..`xxxl`, 0–40) |
| `radius.ts` | Radius scale (`sm`..`pill`) |
| `typography.ts` | Font size / line-height / weight scales |
| `cookingUnits.ts` | `COOKING_UNIT_OPTIONS` (g, kg, ml, dl, l, tsp, tbsp, pinch, pcs, …) |

**Drift flag (code wins):** `ARCHITECTURE.md` (~line 322) claims
`src/constants/config.ts` holds "API base URLs, feature flags, LLM model
string". That file does not exist. In reality: the LLM model string is
`DEFAULT_MODEL` in `src/models/api/llm/google.ts`; API base URL is the env var
`EXPO_PUBLIC_API_BASE_URL` in `src/models/api/client.ts`; there is no
feature-flag module. Do not create `config.ts` to "fix" the doc — route
ARCHITECTURE.md corrections to the owner.

---

## 6. THE CHECKLIST — adding a new setting end-to-end

Derived from the real `geminiModel` addition (commit `7f48326`, which touched
exactly these files). This is inherently a **multi-file, multi-layer change**:
under the house one-file-per-pass discipline, get explicit authorization for a
multi-file change first, or do it as sequential passes in this order (model
files first — the app tolerates a missing UI card, but not a schema/defaults
mismatch, per the quirks in Section 1).

1. **Type** — `src/models/types/Settings.types.ts`: add the field to
   `AppSettings`. Mark it optional (`field?:`) when it has a schema default.
2. **Schema** — `src/models/schemas/SettingsSchema.ts`: add the zod entry as
   `.optional().default(<default>)`. This is what lets settings blobs saved by
   older app versions parse cleanly instead of triggering the
   reset-to-defaults path (which wipes the user's stored API key — Section 1
   quirks).
3. **Defaults** — `src/models/defaults/default_settings.ts`: add the same
   default to `DEFAULT_SETTINGS`. All three files must agree; the repository's
   shape-merge uses `DEFAULT_SETTINGS` as the template and the schema strips
   anything it doesn't know about.
4. **Consumer read** — read the value where it takes effect:
   - Controllers/views: `useSettingsStore((s) => s.settings)` (hydrated at app
     start by `app/_layout.tsx`) or via `useSettingsController`.
   - Services: take settings as an argument (see `InspirationService`) —
     services do not subscribe to stores.
   - models/api may not import repositories; if an api module truly needs a
     setting, it reads the `app_settings` AsyncStorage blob directly like
     `google.ts` does (use that exception sparingly).
5. **Settings UI** — add the card/field in
   `src/views/screens/SettingsScreen.tsx` (draft state plumbing lives in
   `SettingsScreen.hooks.ts`). Product copy only — no developer notes in views.
6. **If dev-only: gate the EFFECT with `__DEV__`, not the UI.** Pattern
   precedents: `useConversationController.ts:185`
   (`__DEV__ && (settings?.skipSafetyLayer1 ?? false)`) and the `if (__DEV__)`
   block in `google.ts` `getModel()`. Leave the control visible and say in its
   card copy that it has no effect in compiled builds (see the existing
   "Model override" and "Skip safety Layer 1" cards for tone).
7. **Verify** — `npx tsc --noEmit -p .` and `npx jest Settings` (repository
   round-trip), plus `npx jest google` if you touched the model/key
   resolution. Exercise the Settings screen in `npx expo start`: save, kill,
   relaunch, confirm the value survives and old blobs upgrade (watch for the
   repository's `wasUpgraded` re-save).

---

## Provenance and maintenance

Verified against the working tree on branch `dev` (HEAD `3b070b9`) on
**2026-07-02**. Line numbers are approximate anchors ("~"), not contracts.
Re-verify each section before relying on it:

| Fact | Re-verify with |
| --- | --- |
| AppSettings fields / schema / defaults | `cat src/models/types/Settings.types.ts src/models/schemas/SettingsSchema.ts src/models/defaults/default_settings.ts` |
| Who reads a settings field | `grep -rn "<fieldName>" src --include="*.ts*" \| grep -v ".test."` |
| `skipSafetyLayer1` / `geminiModel` dev gates | `grep -n "__DEV__" src/controllers/useConversationController.ts src/models/api/llm/google.ts` |
| Complete env-var list | `grep -rn "EXPO_PUBLIC_" src app --include="*.ts*"` |
| Key/model resolution order | `sed -n '1,60p' src/models/api/llm/google.ts` |
| openai.ts still an orphan | `grep -rln "openai" src app --include="*.ts*"` (only `openai.ts` itself should match) |
| Active provider line | `grep -n "activeProvider" src/models/api/llmApi.ts` |
| SQLite table list + DB name | `grep -n "CREATE TABLE\|DATABASE_NAME" src/services/StorageService.ts` |
| AsyncStorage keys (repos/services) | `grep -rn "STORAGE_KEY\|CACHE_KEY_PREFIX\|PROFILE_KEY" src --include="*.ts" \| grep -v ".test."` |
| Zustand persist keys | `grep -n "name:" src/store/*.ts` |
| app.json / eas.json axes | `cat app.json eas.json` |
| RECORD_AUDIO still unused | `grep -rn "RECORD_AUDIO\|expo-av\|Audio\." src app --include="*.ts*"` |
| constants contents / no config.ts | `ls src/constants/ && cat src/constants/index.ts` |
| RC tag version source | `grep -n "package.json" .github/workflows/rc-android.yml` |
| Debug 6-tap unlock + logger levels | `grep -n "markTapCount\|enableDebugMode" src/views/screens/HomeScreen.tsx && grep -n "minLevel\|BUFFER_MAX" src/utils/logger.ts` |
| The add-a-setting exemplar commit | `git show --stat 7f48326` |
