---
name: sous-chef-debugging-playbook
description: >
  Symptom-to-triage runbook for debugging Sous Chef in the field. Load this
  FIRST when something is broken and you don't yet know why — before editing
  any code. Triggers: an LLM feature errors instantly or hangs; "429", "503",
  "400", "API key not valid", "quota", "rate limit"; "works in expo start but
  not in the APK / compiled build / RC build"; "the adaptation came back in an
  unexpected format"; recipe import fails; jest fails with "__DEV__ is not
  defined"; EAS build fails immediately; Metro bundling error in CI but fine
  locally; "how do I get logs off the device"; user-reported bug with no
  stack trace. Gives the triage table, the diagnostic-log export loop, the
  __DEV__ dev-vs-build trap table, and the discriminating-experiment method.
---

# Sous Chef Debugging Playbook (symptom -> triage)

Runbook for a zero-context engineer or agent. Start at the symptom table,
follow the row, run the listed commands verbatim. Do NOT start editing code
until a row's triage has told you which layer is actually failing.

Jargon used throughout, defined once:

- **Compiled build / APK / RC build**: an Android binary produced by EAS
  (Expo Application Services, Expo's cloud build farm) via
  `.github/workflows/rc-android.yml`. In ALL EAS builds — including the
  "preview" RC profile — the React Native global `__DEV__` is `false`.
- **`expo start` / dev client**: local development mode. `__DEV__` is `true`.
  Several behaviors differ (see the `__DEV__` trap table below). This is the
  single most common source of "works on my machine".
- **Provider**: the code that actually calls the Gemini HTTP API —
  `src/models/api/llm/google.ts`, exposed through `src/models/api/llmApi.ts`
  (`const activeProvider: LLMProvider = googleProvider;`, line 25).
- **LLMService**: `src/services/LLMService.ts` — a module-level priority
  queue that serializes every LLM call in the app. All app features go
  through `LLMService.send(request, priority, callbacks)`.
- **Ring buffer log**: `src/utils/logger.ts` — the only field-debugging
  channel for compiled builds. Details in "The diagnostic-log loop".
- **Free-tier-zero**: a Gemini model whose free-tier quota allocation is
  literally 0 — every call 429s forever. Distinct from an ordinary rate
  limit. This distinction cost days once (commits `8bc7dc4` -> `ecebc53`).

Sibling skills: probe scripts and tooling detail live in
`sous-chef-diagnostics-and-tooling`; full incident narratives live in
`sous-chef-failure-archaeology`; provider/queue/prompt internals live in
`sous-chef-llm-reference`.

---

## The triage table

| # | Symptom | Most likely cause | First move | Incident |
|---|---------|-------------------|-----------|----------|
| 1 | LLM feature fails instantly in a compiled build (import/adapt/chat errors within ~1s) | 400 `API_KEY_INVALID` — bad, rotated, or missing Settings key (env key is ignored in builds) | Check the device's Settings key; curl the key raw | — (recurring; see row 1) |
| 2 | 429 errors | EITHER free-tier-zero model (permanent) OR ordinary rate limit (transient) | Curl the model and READ THE BODY — never trust the status code alone | `8bc7dc4` (wrong fix), `ecebc53` (root cause) |
| 3 | 503 errors | Gemini model overloaded — transient | Usually nothing; provider already retries 2x. Persistent = check Google status | `e04e5b7` (added retry) |
| 4 | LLM call hangs forever / spinner never resolves | Pre-`e04e5b7` builds hung ~9 min on `response.json()`. Now capped at 45 s | If a hang exceeds ~45 s + retries (~2 min worst case), the bug is ABOVE the provider (queue or controller) | `e04e5b7` |
| 5 | Works in `expo start`, broken in the APK | One of the four `__DEV__`-gated behaviors | Walk the `__DEV__` trap table below, in order | `fe95299` (related) |
| 6 | "The adaptation came back in an unexpected format" | LLM returned non-JSON / truncated / schema-invalid JSON | Export the diagnostic log; read `reason` + `detail` + `responseSnippet` from the `Adaptation response parse failed` warn entry | `4c8f7e0` (open bug — see row 6) |
| 7 | Jest fails with `__DEV__ is not defined` (or google.ts tests behave impossibly) | `__DEV__` is a Metro global; jest has no Metro | It is defined in `jest.setup.ts` line 2 — check that setup file is loaded (`jest.config.js` `setupFilesAfterEach`/`setupFiles`) | `fe95299` |
| 8 | EAS build fails immediately (within ~3 min) | EITHER monthly EAS quota exhausted OR a bundling error | Read the workflow's "=== EAS error output ===" step log; quota errors mention plan limits, bundling errors show Metro output | `86bc925`, `db46ed0` |
| 9 | Metro bundling error in EAS but `expo start` is fine locally | Fast Refresh masked a syntax error, or stale local cache | Reproduce locally with a cold production-style bundle before touching CI | `86bc925` |

Each row is expanded below. Rows cite commit SHAs on `dev`; read the full
story with `git show <sha>` or in `sous-chef-failure-archaeology`.

---

## Row 1 — LLM feature fails instantly in a compiled build

**Mechanism.** In compiled builds the ONLY key source is the key the user
typed into Settings, stored in AsyncStorage under `app_settings` as
`geminiApiKey` (`src/models/api/llm/google.ts`, `getApiKey`). The
`EXPO_PUBLIC_GEMINI_API_KEY` env fallback is `__DEV__`-gated and therefore
dead in every APK — by design, so a shipped app can never leak the
developer's key.

**The rotated-key trap.** Gemini returns **400** (not 401) with
`API_KEY_INVALID` / "API key not valid" for a bad or rotated key. If you
rotate your key in Google AI Studio, every device still carrying the old key
starts failing instantly with what the app surfaces as just
`Gemini request failed: 400` — the provider truncates error bodies to the
status code (`google.ts` line 94). A bare "400" from the field is a key
problem until proven otherwise.

**Triage:**

1. Export the diagnostic log (see loop below). Look for
   `LLM send failed` entries containing `Gemini request failed: 400` or `403`.
2. `403` = no key was sent at all (`?key=` was empty) — the Settings field is
   blank on that device.
3. `400` = a key WAS sent but Google rejected it — retyped wrong, rotated,
   or revoked. Verify outside the app:

```bash
curl -s -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=$GEMINI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"Reply with the single word: ok"}]}]}'
```

   A bad key returns HTTP 400 with `"status": "INVALID_ARGUMENT"` and
   `API_KEY_INVALID` in the details. A good key returns a candidates array.
4. Fix = re-enter a valid key in Settings on the device. Never "fix" this in
   code, and never retry a 400 — it is deterministic.

---

## Row 2 — 429 errors: free-tier-zero vs ordinary rate limit

This is the single most important discrimination in the whole playbook.
Both cases return HTTP 429. Their meanings are opposite:

| 429 flavor | Body signature | Meaning | Correct reaction |
|---|---|---|---|
| **Free-tier-zero** | quota-violation details containing `"limit": 0` for a quota metric whose name ends in `-FreeTier` | The MODEL has zero free-tier allocation. Permanent for that model. Retrying can NEVER work | Switch models (curl-probe candidates first) |
| **Ordinary rate limit** | quota details with NONZERO limits (requests-per-minute / per-day) | You are sending too fast or hit the daily cap | Wait/pace. `LLMService` already retries user-priority calls 2x after 20 s |

**The incident that taught this** (full writeup in
`sous-chef-failure-archaeology`): every call started 429ing. Commit
`8bc7dc4` "fixed" it by switching the default model to `gemini-2.0-flash` —
the WRONG fix, because the failing model was quota-zeroed, and switching
without probing was a guess. Commit `ecebc53` found the real answer by
running a raw curl matrix across candidate models and reading full 429
bodies, landing on `gemini-2.5-flash` (the current `DEFAULT_MODEL` in
`google.ts` line 10).

**Exact probe** (same call the app makes, minus the app):

```bash
curl -s -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/<MODEL>:generateContent?key=$GEMINI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"Reply with the single word: ok"}]}]}'
```

What each 429 body looks like (representative shape — Google's exact field
layout drifts; the discriminator is the quota metric's limit value):

- **Free-tier-zero**: `"status": "RESOURCE_EXHAUSTED"`, and inside
  `error.details` a QuotaFailure violation for a metric named like
  `...GenerateRequestsPerDayPerProjectPerModel-FreeTier` with a limit of
  **0**.
- **Ordinary rate limit**: same `RESOURCE_EXHAUSTED` status, but the violated
  metric shows a nonzero limit (e.g. per-minute or per-day requests), often
  with a `RetryInfo` detail carrying a retry delay.

**Why you must curl**: the text provider throws
`Gemini request failed: 429` and discards the body (`google.ts` line 94).
The one exception is `src/models/api/image/googleImage.ts`, which keeps the
first 800 chars of the body precisely so `limit 0` survives into the log.
For text-model 429s, the raw curl is the only way to see the flavor.

**Retry topology (so you don't add a redundant or harmful retry):**

- Provider (`google.ts`): retries 2x on 503 / abort / network ONLY. 429
  fails fast here — deliberately, since commit `377e3a4` (blind provider
  retry of 429s was tripling quota burn).
- Service (`LLMService.ts`): user-priority 429s retry after 20 s, up to 2x,
  firing the `onRateLimited` callback. Background-priority 429s fail
  immediately and flip availability listeners to "exhausted".

---

## Row 3 — 503 errors

503 = the Gemini model is overloaded. Transient. The provider already
retries twice (1.5 s then 3 s backoff, `google.ts` lines 68-111). If 503s
persist across minutes, it is Google's capacity problem, not yours — probe
with the row-2 curl to confirm, then wait. Do not switch models for a 503.

---

## Row 4 — LLM call hangs forever

**History**: before commit `e04e5b7`, `googleProvider.send()` had no timeout
and calls in compiled builds could hang ~9 minutes on `response.json()`,
leaving e.g. the recipe-import spinner spinning forever.

**Now**: an `AbortController` aborts every attempt at 45 s
(`SEND_TIMEOUT_MS = 45_000`, `google.ts` line 68), and aborts are retried up
to 2x. Worst case a `send()` resolves or rejects within roughly
45+1.5+45+3+45 s ≈ 2.5 minutes.

**Triage**: if a user reports a spinner stuck longer than that, the hang is
NOT in the provider. Suspect, in order:

1. The `LLMService` queue — a long-running earlier call ahead in the queue
   (all calls serialize; user priority jumps queue but still waits for the
   currently running call). Look for `LLM send` debug entries without a
   matching `LLM response received` info entry.
2. A controller that awaits something else after the LLM resolves.
3. The 20 s x2 rate-limit retry adding up (check for
   `LLM rate limited — retrying` info entries in the log).

---

## Row 5 — Works in `expo start` but not in the APK: the `__DEV__` trap table

`__DEV__` is `false` in ALL EAS builds, including the "preview" RC profile.
Four behaviors silently change. Walk this table top to bottom:

| Dev-only behavior | Where gated | Effect in every compiled build | Field symptom |
|---|---|---|---|
| Env API key fallback (`EXPO_PUBLIC_GEMINI_API_KEY`) | `google.ts` `getEnvApiKey` | Ignored — device Settings key is the ONLY key | LLM features 400/403 instantly (row 1) |
| `geminiModel` Settings override | `google.ts` `getModel` | Ignored — model is `EXPO_PUBLIC_GEMINI_MODEL` baked at build time, else `DEFAULT_MODEL` (`gemini-2.5-flash`) | "I set a different model in Settings and nothing changed" |
| `skipSafetyLayer1` Settings toggle | `useConversationController.ts` line 185 (`__DEV__ && settings?.skipSafetyLayer1`) | Ignored — safety Layer 1 always runs | Conversations behave differently (safety refusals appear) than in dev testing |
| Logger `debug` level | `logger.ts` line 19 (`minLevel: __DEV__ ? "debug" : "info"`) | `log.debug` entries are dropped from the ring buffer | Exported field logs are missing the debug lines you added |

Corollary for instrumenting field bugs: **use `log.info` / `log.warn` /
`log.error`, never `log.debug`, for anything you need to see in an exported
log from a compiled build.** (Exception: the 6-tap debug unlock also runs
`configureLogger({ minLevel: "debug" })` at runtime — but only for entries
logged AFTER the unlock, in that app session.)

Related: jest also lacks `__DEV__` (row 7).

---

## Row 6 — "The adaptation came back in an unexpected format" (OPEN BUG)

**Where it lives**: `src/controllers/useAdaptationController.ts`. Pipeline:
`extractJsonObject` (grabs first `{` to last `}`, line 94) -> `JSON.parse`
-> `AdaptationResponseSchema.safeParse` (zod). Any failure sets the error
string at line 199.

**Status as of 2026-07-02**: intermittent, unreproduced. Three consecutive
failures on 2026-07-02 adapting an already-adapted variant
(`recipe_1783008233834`) while the first adaptation of the base recipe
succeeded. Responses were HTTP-successful and large (5-6 KB). Candidate
causes — ALL UNCONFIRMED: response truncation (no `maxOutputTokens` is set),
variant-recipe formatting in `buildAdaptationPrompt`, plain model JSON
drift. Gemini's `responseSchema`/`responseMimeType` JSON mode is NOT used.

**Triage** (diagnostics shipped in `4c8f7e0`):

1. Have the user export the diagnostic log (loop below) IMMEDIATELY after a
   failure — the buffer resets on app restart.
2. Find the `log.warn` entry `Adaptation response parse failed`. It carries:
   - `reason`: one of `no_json_found` | `json_parse_error` |
     `schema_validation_failed`
   - `detail`: JSON.parse error message, or first 5 zod issues
   - `responseSnippet`: first 500 chars of the raw model output
3. Map reason -> hypothesis:
   - `no_json_found` -> model replied in prose (prompt drift) or empty content
   - `json_parse_error` -> truncated/malformed JSON — check whether the
     snippet starts sane; truncation supports the maxOutputTokens theory
   - `schema_validation_failed` -> model changed field shapes — the zod
     issues in `detail` name the exact fields
4. Note the preceding `LLM response received` info entry's `responseLength`
   — compare failing vs succeeding sizes.

Note: `useConversationController.ts` has its OWN, simpler
`parseAdaptationResponse` (fence-stripping, line 117) without this enriched
logging; the error string above is unique to `useAdaptationController.ts`.
Recipe import failures surface as "Sous Chef could not import that recipe
right now." (`useRecipeController.ts` line 419) — different message,
similar parse-triage thinking applies.

---

## Row 7 — Jest fails with `__DEV__ is not defined`

`__DEV__` is injected by Metro, not Node, so jest's node environment doesn't
have it. It is defined manually in `jest.setup.ts` line 2:

```ts
(globalThis as unknown as { __DEV__: boolean }).__DEV__ = true;
```

Until commit `fe95299` this was missing and ALL `google.ts` unit tests were
silently broken (they exercise `__DEV__`-gated branches). If the error
reappears: confirm `jest.setup.ts` still defines it and that `jest.config.js`
still lists the setup file. If you write tests for `__DEV__ === false`
behavior, flip the global inside the test and restore it — remember it is
`true` by default in the suite.

---

## Row 8 — EAS build fails immediately

Two very different causes produce "the RC workflow failed fast". The build
step in `.github/workflows/rc-android.yml` pipes EAS stderr and prints it
under `=== EAS error output ===` on failure — read that first.

| Signature in the log | Cause | Action |
|---|---|---|
| Message about plan/quota/build limits from EAS | Monthly EAS build quota exhausted (free tier: 15 Android builds/month, resets on the 1st) | STOP. Do not re-push to "retry". Wait for reset or get owner decision. See build-consent rule below |
| Metro/bundler output with a syntax error | Code doesn't bundle in production mode | Reproduce locally (row 9) |

**The `86bc925` story**: removing a `__DEV__` ternary wrapper in
`SettingsScreen.tsx` left an unmatched `</View>`. `expo start` with Fast
Refresh kept serving the last good bundle locally, so it LOOKED fine; the
cold EAS bundle failed with a JSX syntax error, burning a build slot on a
one-line mistake. Mitigations since: quota notes — builds failing within 3
minutes don't count against quota; canceled builds count only if processing
started; `db46ed0` added an explicit "Cancel stale RC builds" step
(`eas build:list` + `eas build:cancel`) because GitHub Actions concurrency
cannot reach builds already submitted to Expo's servers.

**NON-NEGOTIABLE**: never trigger an EAS build — including ANY push to
`dev`, which auto-triggers the RC workflow — without explicit owner
confirmation. Stacked pushes once queued 4 concurrent EAS builds and burned
monthly quota; a prior month's quota exhaustion blocked all builds for days.
Full rule in `sous-chef-change-control`.

---

## Row 9 — Metro bundling error in EAS but fine locally

"Fine locally" usually means "fine under Fast Refresh with a warm cache".
Before blaming CI, reproduce a cold, production-style pass locally:

```bash
npx tsc --noEmit -p .        # catches most syntax/type breakage in seconds
npx expo export --platform android   # cold Metro production bundle, no cache
```

If `expo export` fails locally with the same error as EAS, it was never a CI
problem. If it truly only fails in EAS, diff the environment: Node version
(workflow pins Node 20), a file only present locally (gitignored?), or
case-sensitive import paths (Linux CI vs macOS).

---

## The diagnostic-log loop (only field channel for compiled builds)

`src/utils/logger.ts`: in-memory ring buffer, **500 entries max** (oldest
dropped), **resets on every app restart**, min level `info` in compiled
builds (`debug` in dev). There is no persistent log file and no crash
reporter — this buffer is everything.

How the user exports it:

1. On the Home screen, tap the companion/mark **6 times quickly** (within
   1 s gaps) — commit `7817213`; this replaced a long-press unlock that
   failed twice. Success gives a haptic + companion message and raises the
   runtime log level to `debug` for the rest of the session.
2. Settings -> **Debug** section -> Diagnostic log card -> **"Share log"**
   (uses the OS share sheet; there is also "Clear log buffer").
3. The export is newline-separated entries with a header
   (`# Sous Chef diagnostic log`, entry count, min level). Entry format:
   `[ISO timestamp]\t[module]\t[LEVEL]\tmessage\tdetails-json`.

Operational rules that follow from the design:

- **Capture before restart.** A crash or restart wipes the buffer.
- **Instrument with `log.info`/`log.warn`/`log.error`** for anything that
  must survive into a field export (see row 5 corollary).
- 500 entries go fast when background services (HomeEnrichmentService,
  InspirationService, NudgeService) are chatty — ask the user to reproduce
  the bug and export immediately, not "after dinner".
- Ring buffer + export shipped in `53a334f`; grep `createLogger(` to find a
  module's log tag when searching an export.

---

## The discriminating-experiment principle

Every hard incident in this repo was cracked the same way. When an LLM-ish
failure resists a 5-minute diagnosis:

1. **Reproduce OUTSIDE the app first.** Cheapest lab: the gated live smoke
   test —

   ```bash
   RUN_LLM_SMOKE=1 EXPO_PUBLIC_GEMINI_API_KEY=<key> npx jest google.smoke
   ```

   (Real network call, spends tokens; the image test inside it is
   `it.skip`'d since `2d148f3` because Gemini's free tier dropped image
   generation. A Claude-provider variant exists:
   `RUN_LLM_SMOKE=1 EXPO_PUBLIC_CLAUDE_API_KEY=<key> npx jest anthropic.smoke`
   — but note the Anthropic account is unfunded, so expect billing errors.)
   Still ambiguous? Drop to raw curl (row 2 probe).

2. **Change exactly one variable per experiment.** Fresh key vs same key.
   Different model vs same model. Dev build vs APK. The `8bc7dc4` misfix
   happened because model AND assumption changed at once; the `ecebc53` fix
   came from a one-variable-at-a-time curl matrix.

3. **Demand the full error body.** The app truncates to
   `Gemini request failed: <status>`; identical status codes hide opposite
   root causes (row 2). No triage conclusion from a bare status code.

4. **Two failed fix attempts in the same direction = stop.** That is the
   iteration-trap rule from the root `CLAUDE.md` — declare it, don't patch
   the patch. The debug-unlock UI (`4f66ea3` long-press -> `7817213` 6-tap)
   and the model-swap saga are both on-record examples.

---

## When NOT to use this

- You already know WHICH code is wrong and need internals of the LLM stack
  (queue semantics, prompt builders, provider swap, safety tiers, JSON
  parsing idioms for new features) -> `sous-chef-llm-reference`.
- You need the probe/tooling scripts themselves, smoke-test mechanics, or
  environment setup detail -> `sous-chef-diagnostics-and-tooling`.
- You want the full narrative of a past incident (what was tried, in what
  order, and why) -> `sous-chef-failure-archaeology`.
- You are about to EDIT code, commit, push, or anything build/release
  adjacent -> `sous-chef-change-control` (one-file rule, build consent).
- You are deciding WHERE a fix belongs in the MVC layering, or whether
  ARCHITECTURE.md can be trusted on a point ->
  `sous-chef-architecture-contract`.

---

## Provenance and maintenance

Verified against the repo on **2026-07-02**. Everything below is volatile;
re-verify before trusting, one line each:

| Fact | Re-verify with |
|---|---|
| `DEFAULT_MODEL = "gemini-2.5-flash"`, 45 s timeout, retry set (503/abort/network only) | `grep -n "DEFAULT_MODEL\|SEND_TIMEOUT_MS\|503" src/models/api/llm/google.ts` |
| Active provider is googleProvider | `grep -n "activeProvider" src/models/api/llmApi.ts` |
| Key resolution: Settings `geminiApiKey` first, env key `__DEV__`-only | `grep -n "getEnvApiKey\|geminiApiKey" src/models/api/llm/google.ts` |
| LLMService 429 retry: 20 s, max 2, user priority only | `grep -n "RATE_LIMIT_RETRY_DELAY_MS\|MAX_USER_RATE_LIMIT" src/services/LLMService.ts` |
| Logger: 500-entry ring buffer, `info` min level in builds | `grep -n "BUFFER_MAX\|minLevel" src/utils/logger.ts` |
| 6-tap debug unlock + runtime debug level | `grep -n "markTapCount\|configureLogger" src/views/screens/HomeScreen.tsx` |
| Share-log UI in Settings Debug section | `grep -n "Share log\|exportLogs" src/views/screens/SettingsScreen.tsx` |
| Adaptation parse triage fields (reason/detail/responseSnippet) | `grep -n "failureReason\|responseSnippet" src/controllers/useAdaptationController.ts` |
| `skipSafetyLayer1` is `__DEV__`-gated | `grep -rn "skipSafetyLayer1" src/controllers/useConversationController.ts` |
| `__DEV__` defined for jest | `grep -n "__DEV__" jest.setup.ts` |
| Smoke test invocations | `head -20 src/models/api/llm/google.smoke.test.ts src/models/api/llm/anthropic.smoke.test.ts` |
| CI: stale-build cancel step, stderr surfacing | `grep -n "build:cancel\|EAS error output" .github/workflows/rc-android.yml` |
| Image provider keeps 800 chars of error body | `grep -n "slice(0, 800)" src/models/api/image/googleImage.ts` |
| Incident SHAs cited here still exist on dev | `git log --oneline dev \| grep -E "e04e5b7\|377e3a4\|8bc7dc4\|ecebc53\|fe95299\|4c8f7e0\|86bc925\|db46ed0\|7817213\|53a334f\|2d148f3"` |
| Gemini 429 body shapes / free-tier terms (Google-side, changes on their schedule) | run the row-2 curl probe with a live key and read the body |
| EAS quota numbers (15/month, <3 min failures free) | Expo dashboard / current EAS pricing docs — NOT verifiable from this repo |
| Open adaptation bug status | search exported field logs for `Adaptation response parse failed`; check `git log --oneline -5 -- src/controllers/useAdaptationController.ts` |
