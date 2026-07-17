---
name: sous-chef-diagnostics-and-tooling
description: >
  Diagnostics and measurement tooling for Sous Chef: three ready-to-run Gemini
  probe scripts (single-model probe with full raw error body + interpretation,
  multi-model health matrix, model listing), the gated live smoke tests, how to
  read the in-app diagnostic log export (format, module meanings, adaptation
  parse-failure fields), read-only EAS build inspection, and jest/tsc/lint as
  measurement instruments. Load this WHENEVER you need EVIDENCE instead of a
  guess: "is the Gemini key/model/quota actually broken?", "probe the model",
  "curl the API", "429/400/403/503 — which is it?", "quota-zeroed vs rate
  limited", "run the smoke test", "read this exported log", "what does this
  LLMService log line mean", "adaptation parse failed — what do the fields
  mean", "list EAS builds", "run one jest file", or before making ANY claim
  about the LLM provider's health. Rule enforced here: no LLM-provider claim
  without a raw curl body as evidence.
---

# Diagnostics & tooling (measure, don't eyeball)

This skill exists because of one expensive lesson: in June 2026 the app's 429s
were "fixed" by switching to a model that was itself quota-zeroed (commit
`8bc7dc4` — wrong fix), and the real fix (`ecebc53`) only happened after
someone curled a matrix of models and read the raw error bodies. The app
truncates provider errors to bare status codes (`Gemini request failed: 429`),
so app-side symptoms can NEVER distinguish "rate limited" from "this model has
zero quota, permanently". Only the raw HTTP body can.

**The rule, non-negotiable: no claim about the LLM provider (key validity,
model health, quota state, outage) without a raw curl response body as
evidence.** "It's probably rate limited" is not a finding. A pasted JSON error
body is.

Jargon used below, defined once:

| Term | Meaning |
|---|---|
| quota-zeroed | Gemini 429 whose quota-violation details report a limit of **0** for the model: that model has no free-tier allocation at all. Permanent for that model+tier; retrying can never work. |
| smoke test | A jest test that makes a real network call to the live provider. Gated behind `RUN_LLM_SMOKE=1` so `npm test` never spends tokens. |
| ring buffer | The in-memory log store in `src/utils/logger.ts`: last 500 entries, oldest evicted first, wiped on app restart. |
| `__DEV__` | React Native global. `true` under `npx expo start`, **`false` in every EAS build including the RC/preview APK**. Gates env-var keys, model override, safety skip, and debug-level log capture. |

---

## 1. The probe scripts (`scripts/` next to this file)

Three bash scripts, dependencies **curl + python3 only**, all executable, all
refusing to run without a key, none ever containing a key. Pass the key via
the `GEMINI_API_KEY` env var (preferred — positional args leak into shell
history and `ps`). **Never hardcode a key anywhere, including one-off shell
commands you might paste into a commit or doc.**

| Script | One-line purpose | Exit 0 means |
|---|---|---|
| `gemini-probe.sh [MODEL] [KEY]` | One cheap `generateContent` call to ONE model; prints the FULL raw body pretty-printed, then an interpretation footer | HTTP 200, model healthy |
| `gemini-model-matrix.sh [MODEL...]` | Same cheap call against a LIST of candidate models; prints a health table. **This is the exact probe that ended the 2026-06 quota goose-chase.** | at least one model healthy |
| `gemini-list-models.sh [KEY]` | Lists every model this key can access + supported generation methods | list retrieved |

### 1a. `gemini-probe.sh` — the evidence generator

```bash
GEMINI_API_KEY=<key> .claude/skills/sous-chef-diagnostics-and-tooling/scripts/gemini-probe.sh
GEMINI_API_KEY=<key> .claude/skills/sous-chef-diagnostics-and-tooling/scripts/gemini-probe.sh gemini-2.0-flash
```

Defaults to `gemini-2.5-flash` — the app's `DEFAULT_MODEL` in
`src/models/api/llm/google.ts`, so a bare invocation probes exactly what the
app uses. The key goes in the `x-goog-api-key` header, not the URL, so it
never appears in output. Exit codes: `0` healthy, `1` probe ran but unhealthy,
`2` no key, `3` curl transport failure (no HTTP response at all — network,
DNS, TLS, proxy).

Its interpretation footer encodes the hard-won decode table:

| Status + body signature | Meaning | Action |
|---|---|---|
| `200` | Key and model both work | Problem is app-side. Stop blaming the provider. |
| `400` + `API_KEY_INVALID` / "API key not valid" | Bad/rotated/restricted key. **Gemini returns 400, not 401, for this** | Fix the key. In-app the key is `app_settings.geminiApiKey` (AsyncStorage) or, dev-only, `EXPO_PUBLIC_GEMINI_API_KEY` |
| `400` without `API_KEY_INVALID` | Malformed request | Probe/script bug, read the message |
| `403` | No key reached the API at all, or key not permitted for this API | Supply/permit a key |
| `404` | Model name doesn't exist for this API version/key | Run `gemini-list-models.sh` |
| `429` + QuotaFailure violation with `quotaValue: "0"` (or `limit: 0` in the message) | **Quota-zeroed model** — permanent for this model+tier | Switch models (run the matrix). Retrying is provably futile |
| `429` with nonzero limits | Ordinary RPM/RPD rate limit | Wait (body's RetryInfo gives the delay) and retry |
| `503` | Model overloaded, transient, server-side | Retry with backoff — the app already does (2 retries, 1.5s/3s, in `google.ts`) |

### 1b. `gemini-model-matrix.sh` — when one model misbehaves, probe them all

```bash
GEMINI_API_KEY=<key> .claude/skills/sous-chef-diagnostics-and-tooling/scripts/gemini-model-matrix.sh
GEMINI_API_KEY=<key> .claude/skills/sous-chef-diagnostics-and-tooling/scripts/gemini-model-matrix.sh gemini-2.5-flash gemini-2.5-flash-lite
```

Default candidates: `gemini-2.5-flash`, `gemini-2.5-flash-lite`,
`gemini-2.5-pro`, `gemini-2.0-flash`, `gemini-2.0-flash-lite` (the app's
pinned model first). Model names churn — refresh the candidate list from
`gemini-list-models.sh` when in doubt. Output is a `MODEL / HTTP / VERDICT`
table; verdicts use the same classifier as the single probe. Read the table
as a diff: **"one row quota-zeroed, others healthy" means switch models;
"every row 429" means the key/account is throttled; "every row BAD KEY" means
the key is the problem, not any model.** The table is triage — for any bad
row, get the raw body with `gemini-probe.sh <model>` before concluding.

### 1c. `gemini-list-models.sh` — what can this key call today

```bash
GEMINI_API_KEY=<key> .claude/skills/sous-chef-diagnostics-and-tooling/scripts/gemini-list-models.sh
```

Prints model names + `supportedGenerationMethods`. Only models listing
`generateContent` are usable by the app's text path. Being listed does NOT
imply usable quota — a listed model can still be quota-zeroed (that was the
goose-chase). Listed ≠ healthy; probe it.

---

## 2. Gated live smoke tests (spend real tokens — run deliberately)

Both suites are `describe.skip` unless `RUN_LLM_SMOKE=1`, so plain `npm test`
never touches the network. Exact invocations (from the test files'
own headers):

```bash
# Gemini text model (the provider the app actually uses):
RUN_LLM_SMOKE=1 EXPO_PUBLIC_GEMINI_API_KEY=<key> npx jest google.smoke

# Anthropic (claudeProvider — built but NOT wired into the app):
RUN_LLM_SMOKE=1 EXPO_PUBLIC_CLAUDE_API_KEY=<key> npx jest anthropic.smoke
```

| Fact | Detail |
|---|---|
| What google.smoke proves | The pinned `DEFAULT_MODEL` (or its `EXPO_PUBLIC_GEMINI_MODEL` override) responds live AND returns parseable JSON (`{"ok": true}`, fences stripped). Mocked unit tests only verify URL construction. |
| The image test | `it.skip`'d on purpose (`2d148f3`): Gemini removed image generation from the free tier, so it always 429s with limit 0 regardless of app health. Do not "fix" it by un-skipping. |
| anthropic.smoke caveat | The Anthropic account is unfunded (no free tier) as of 2026-07-02 — expect this to fail on billing, not code, until funded. |
| Smoke test vs probe script | The probe scripts test the provider in isolation; the smoke test additionally exercises the app's own request shaping (`toGeminiMessages`, key/model resolution with AsyncStorage mocked to null). If probe passes and smoke fails, the bug is in `google.ts`. |

---

## 3. Reading the in-app diagnostic log export

The ring-buffer logger (`src/utils/logger.ts`) is the **only** field-debugging
channel for compiled builds — there is no remote telemetry.

**How to get a log off a device:** Settings → Debug section ("Developer
tools", always visible) → "Share log" (uses the OS share sheet; "Clear log
buffer" sits next to it). To capture **debug-level** entries in a compiled
build, first tap the bot mark on the Home screen **6 times** (each tap within
1s of the previous) — that enables debug mode and calls
`configureLogger({ minLevel: "debug" })`. Without the unlock, compiled builds
capture info+ only (`minLevel: __DEV__ ? "debug" : "info"`), and the unlock
only affects entries logged **after** it. The buffer holds 500 entries max and
is wiped on app restart — export before relaunching.

**Format** (from `formatEntry`): tab-separated —

```
[<ISO-8601 timestamp>]\t[<module>]\t[<LEVEL>]\t<message>\t<details>
```

- `module` is the `createLogger("...")` name, e.g. `LLMService`,
  `useRecipeController`, `useAdaptationController`; child loggers appear as
  `parent:child`.
- `LEVEL` is `DEBUG|INFO|WARN|ERROR`.
- `details` is each extra argument JSON-stringified and space-joined; `Error`
  arguments become their stack trace.
- The export is prefixed with header lines: `# Sous Chef diagnostic log`,
  `# Exported: <ts>`, `# Entries: <n> (max 500)`, `# Min level: <level>`.

### What the key entries mean

**`[LLMService]`** — every LLM call in the app funnels through here
(serialized priority queue):

| Entry | Level | Details | Meaning |
|---|---|---|---|
| `LLM send` | debug | `{priority, systemLength, messages}` | Call dequeued and starting. Absent in compiled builds unless debug-unlocked. |
| `LLM response received` | info | `{ms, responseLength}` | Success. `ms` near 45,000×(n+1) suggests timeout-retry churn (provider timeout is 45s). `responseLength` is your truncation evidence for parse failures. |
| `LLM rate limited — retrying` | info | `{attempt, delayMs}` | User-priority call hit 429; queue-level retry after 20s, max 2. |
| `LLM send failed` | error | error stack | Terminal failure after all retries; availability flips to "exhausted" (companion shows exhausted state). Message is typically `Gemini request failed: <status>` — **status code only, which is exactly why you must curl for the body**. |
| `LLM stream start` / `LLM stream complete` / `LLM stream failed` | debug/info/error | as above | Streaming path equivalents. |

**`[useRecipeController]`** — search/load/save plus recipe import:

| Entry | Meaning |
|---|---|
| `Searching recipes` / `Search results` (debug) | Local search, no LLM involved. |
| `Fetching recipe by id` / `Recipe fetched` / `Recipe not found` | Repository reads; `Recipe not found` (warn) with a valid-looking id suggests a stale reference. |
| `Saving recipe` / `Recipe edits saved` / `Could not save recipe (edits)` | Repository writes. |
| `Importing recipe` (info, `{sourceMode, sourceLength}`) | Import started; `sourceMode` tells you text vs URL path. |
| `URL fetch failed during recipe import` (error) | Failure fetching the page — before any LLM call. |
| `Recipe import parsed` (info, `{title}`) | LLM response parsed into a draft successfully. |
| `Recipe import LLM call failed` (error) | The LLM call or its parsing failed. |

**`[useAdaptationController]`** — the adaptation flow, including the enriched
parse-failure diagnostics shipped in `4c8f7e0` for the open intermittent bug
("The adaptation came back in an unexpected format"):

| Entry | Details | Meaning |
|---|---|---|
| `Running adaptation` (info) | `{recipeId, historyLength}` | Final adaptation call dispatched (plan chat uses separate "planning" entries). |
| `Adaptation response parse failed` (warn) | `{recipeId, reason, detail, responseSnippet}` | **The bug's fingerprint — see field decode below.** |
| `Adaptation complete` (info) | `{recipeId, hasIngredientChanges}` | Parsed and schema-validated. |
| `Adaptation LLM call failed` / `Adaptation planning call failed` (error) | error stack | Transport-level failure, NOT a parse failure — different bug. |
| `Saving adaptation variant` / `Variant saved` / `Could not save adaptation variant` | `{parentId}` / `{variantId}` | Variant persistence. |

Parse-failure field decode (`parseAdaptationResponse` in
`src/controllers/useAdaptationController.ts`):

| `reason` | Produced by | `detail` contains | What it tells you |
|---|---|---|---|
| `no_json_found` | `extractJsonObject` found no `{...}` span | — | Model returned prose/refusal with no JSON at all. |
| `json_parse_error` | `JSON.parse` threw | the parse error message (often with a character position) | Malformed JSON — if `responseSnippet` (first 500 chars) starts mid-structure or the position is near `responseLength`, suspect truncation (no `maxOutputTokens` is set — candidate cause, UNCONFIRMED). |
| `schema_validation_failed` | zod `AdaptationResponseSchema.safeParse` failed | first 5 zod issues, JSON-stringified | Valid JSON, wrong shape — the issues name exactly which fields drifted. |

**Reading technique:** pair the `warn` with the immediately preceding
`[LLMService] LLM response received` to get `responseLength`; length + reason
+ snippet together discriminate truncation vs drift vs refusal. Known repro
context for the open bug: 3 consecutive failures on 2026-07-02 adapting an
already-adapted variant while the base recipe adapted fine — when reading a
field log, note whether `recipeId` is a variant.

---

## 4. EAS build inspection (read-only — measurement, not action)

**Consent rule (owner-canonized): NEVER trigger an EAS build — including any
push to `dev`, which auto-triggers the RC workflow — without explicit owner
confirmation.** Everything below is inspection. See
`sous-chef-build-run-release` before doing anything that creates or cancels a
build.

Verified invocations (these exact flags run in
`.github/workflows/rc-android.yml`):

```bash
# What is queued/running right now for the RC profile?
eas build:list --platform android --build-profile preview \
  --status in-progress --non-interactive --json --limit 10

# --status accepts one value per call; the CI loops over: new, in-queue, in-progress
# Extract ids from the JSON:
eas build:list --platform android --build-profile preview \
  --status in-queue --non-interactive --json --limit 10 | jq -r '.[].id'
```

Use cases: verifying no stale builds are burning quota after a push incident
(4 concurrent builds were once queued by stacked pushes — commit `db46ed0`
added the CI-side cancel step); counting builds against the free-tier quota
(15 Android + 15 iOS per calendar month, resets on the 1st; sub-3-minute
failures don't count; canceled builds count only if processing started).

`eas build:cancel <id> --non-interactive` is what CI uses to kill stale
builds — it is **mutating** and quota-relevant; if you think a manual cancel
is needed, confirm with the owner first. Requires an authenticated eas CLI
(`EXPO_TOKEN` in CI); other statuses/flags: check `eas build:list --help`
rather than trusting memory.

---

## 5. jest / tsc / lint as measurement instruments

All verified against `package.json` and `jest.config.js` (babel-jest, node
test environment, `@/` → `src/`, setup file `jest.setup.ts`).

| Command | What it measures |
|---|---|
| `npm test` | Full jest suite (12 test files — coverage is thin: stores, utils, most services/controllers/repos untested, so green ≠ safe). |
| `npx jest google` | All test files whose path matches the pattern (here: `google.test.ts` + `google.smoke.test.ts` — the smoke part self-skips without `RUN_LLM_SMOKE=1`). |
| `npx jest src/models/api/llm/google.test.ts` | Exactly one file. Fastest loop while editing that file. |
| `npx jest -t "some test name"` | Tests whose name matches, across files. |
| `npx tsc --noEmit -p .` | Typecheck only, no output files. Run before AND after an edit; the delta in error count is the measurement. |
| `npm run lint` | `expo lint`. Same before/after discipline. |

Trap with history: jest only has `__DEV__` because `jest.setup.ts` defines it
manually (commit `fe95299`) — before that, every `google.ts` test failed
silently-wrong. If a test errors with `__DEV__ is not defined`, the setup file
isn't loading; check the `setupFilesAfterEnv` wiring in `jest.config.js`
before touching the test.

Measurement discipline for any change: (1) record the baseline — run the
narrowest relevant jest file + `npx tsc --noEmit -p .` BEFORE editing;
(2) after editing, rerun the same commands; (3) report the delta, not an
impression. "Looks right" is eyeballing; "0 tsc errors before, 0 after, 7/7
tests in google.test.ts passing" is measurement.

---

## When NOT to use this

| Your situation | Use instead |
|---|---|
| Something is broken and you don't yet know what — you need symptom→cause triage | `sous-chef-debugging-playbook` (it will send you back here for the probes) |
| You need to understand or modify the LLM layer itself (queue, priorities, prompts, parsing idioms, provider swap) | `sous-chef-llm-reference` |
| You're about to build, release, push to dev, or manage EAS quota/consent | `sous-chef-build-run-release` |
| "Has this failure happened before / why was X changed" | `sous-chef-failure-archaeology` |
| You're about to edit code (plan format, one-file rule, stop conditions) | `sous-chef-change-control` |
| Where a setting/env var/storage key lives and what reads it | `sous-chef-config-and-settings` |

This skill is the instrument drawer: load it when the question is "what is
actually true right now, and how do I prove it".

---

## Provenance and maintenance

Written 2026-07-02 from the code as-built on `dev`. The scripts' error paths
(missing key; live `400 API_KEY_INVALID` against the real Gemini endpoint)
were executed and verified; the 200/429/503 paths follow the documented
response shapes but were not exercised live (no valid key available at
authoring time) — if a footer ever misclassifies a real body, fix the
classifier and note it here.

Re-verify volatile facts before relying on them:

| Fact | One-line check |
|---|---|
| App's default model is `gemini-2.5-flash` | `grep DEFAULT_MODEL src/models/api/llm/google.ts` |
| Provider truncates errors to status codes | `grep "Gemini request failed" src/models/api/llm/google.ts` |
| Log entry format / 500-entry buffer / info+ in builds | `grep -n "BUFFER_MAX\|minLevel\|formatEntry" src/utils/logger.ts` |
| 6-tap debug unlock raises log level | `grep -n "markTapCount\|configureLogger" src/views/screens/HomeScreen.tsx` |
| Share log lives in Settings Debug section | `grep -n "Share log" src/views/screens/SettingsScreen.tsx` |
| Smoke test invocations + image skip | `head -10 src/models/api/llm/google.smoke.test.ts src/models/api/llm/anthropic.smoke.test.ts && grep -n "it.skip" src/models/api/llm/google.smoke.test.ts` |
| LLMService log lines / 20s 429 retry | `grep -n "log\.\|RATE_LIMIT_RETRY" src/services/LLMService.ts` |
| Adaptation parse-failure reasons + 500-char snippet | `grep -n "failureReason\|responseSnippet" src/controllers/useAdaptationController.ts` |
| eas build:list flags | `grep -n "eas build" .github/workflows/rc-android.yml` |
| jest config (setup file, @/ mapping) | `cat jest.config.js` |
| npm scripts (test/lint) | `grep -A8 '"scripts"' package.json` |
| Scripts still parse | `bash -n .claude/skills/sous-chef-diagnostics-and-tooling/scripts/*.sh` |

External volatility beyond the repo's control: Gemini model names, free-tier
quota policy, and error-body shapes (`QuotaFailure` details, `RetryInfo`) can
change server-side at any time — when a script's verdict and the raw body
disagree, the raw body wins. That is the whole point of this skill.
