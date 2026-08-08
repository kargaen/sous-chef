---
name: sous-chef-llm-reference
description: >
  Domain knowledge pack for Sous Chef's LLM layer. Load this BEFORE touching or
  debugging anything that talks to the model: llmApi.ts, google.ts,
  LLMService.ts, SafetyService.ts, anthropic.ts, googleImage.ts, anything in
  src/prompts/, or any controller/service that calls LLMService.send. Triggers:
  "429", "rate limit", "quota", "exhausted", "Gemini", "model not responding",
  "swap provider", "add Claude/Anthropic", "API key not valid", "adaptation
  came back in an unexpected format", JSON parse failures on LLM output, prompt
  changes, safety tiers, context window, timeouts, retries, priority queue,
  smoke tests, or choosing/probing a Gemini model. Also load before writing any
  NEW feature that needs an LLM call, so it uses the queue, priorities, and
  parsing idioms correctly.
---

# Sous Chef LLM Integration Reference

Everything a zero-context engineer needs about this app's LLM layer, verified
against the code on 2026-07-02. When this document and the code disagree, the
code wins — then fix this document.

**Jargon used below, defined once:**

- **Provider** — a module implementing the `LLMProvider` interface (one `send`,
  one `stream`) that talks to a specific vendor HTTP API.
- **Priority queue** — the module-level serializer in `LLMService.ts` that runs
  at most ONE LLM call at a time, app-wide.
- **Companion** — the on-screen mascot; its "exhausted" tone is the user-facing
  face of LLM failures (`src/store/sousChefCompanionStore.ts`, tones are
  `"exhausted" | "happy"`).
- **`__DEV__`** — React Native global; `true` in Metro dev sessions, **false in
  every EAS build including the RC "preview" APK**. Several LLM behaviors are
  gated on it (see the trap table).
- **Free-tier-zero** — a Gemini model whose free-tier quota limit is literally
  `0`; every call 429s forever regardless of pacing.

## When NOT to use this

| Your task | Use instead |
| --- | --- |
| Layering rules, where a new file belongs, MVC boundaries, naming | `.claude/skills/sous-chef-architecture-contract` |
| Anything touching builds, pushes to `dev`, EAS quota, CI workflows, release process, or change/consent discipline | `.claude/skills/sous-chef-change-control` |
| Non-LLM persistence, stores, repositories, UI work | Not this skill — this file covers only the path from a prompt builder to a parsed model response |

Reminder from change control that applies here too: never push to `dev`
(it auto-triggers an EAS build) and never run an EAS build without explicit
owner confirmation. Running the paid/live smoke tests spends the owner's API
quota — ask first.

## 1. Mental model: the call path

```
prompt builder (src/prompts/*, pure (context) => string)
        |
controller or service builds LLMRequest {system, messages}
        |
LLMService.send(request, priority, callbacks)   <- app-wide priority queue, 429 retry (user only)
        |
llmApi.send(request)                            <- provider indirection (one hardcoded line)
        |
googleProvider.send()                           <- key+model resolution, 45s timeout, 503/network retry
        |
Gemini v1beta generateContent (REST, no SDK)
        |
tolerant parser at the call site (fences/JSON extraction/zod)
```

Rules that fall out of this:

1. **Never call `llmApi` or `googleProvider` directly from features.** Every
   feature call goes through `LLMService.send` so queueing, priorities, and
   429 handling apply. (The only direct `googleProvider` consumers are its own
   tests; the only direct `getApiKey` consumer is the image API.)
2. **Every response is plain text.** There is no JSON mode
   (`responseMimeType`/`responseSchema` are NOT used), no `maxOutputTokens`,
   no temperature setting. Structure is enforced only by prompt contracts +
   tolerant parsers.
3. **Streaming exists but is dead code today.** `LLMService.stream` and both
   providers' `stream` methods have zero production callers (verified by grep;
   the only `.stream(` call site is inside `LLMService.ts` itself). The chat
   UI's `isStreaming` flag is a loading indicator, not real streaming.

## 2. Provider abstraction — `src/models/api/llmApi.ts`

The whole file is ~27 lines. The contract:

```ts
export interface LLMProvider {
  send: (request: LLMRequest) => Promise<LLMResponse>;
  stream: (request: LLMRequest, onChunk: (chunk: string) => void) => Promise<void>;
}
export interface LLMRequest {
  system: string;
  messages: Pick<Message, "role" | "content">[];   // role: "user" | "assistant"
}
export interface LLMResponse { content: string; }   // plain text, always
```

The active provider is **one hardcoded line** (line 25):

```ts
const activeProvider: LLMProvider = googleProvider;
export const llmApi: LLMProvider = activeProvider;
```

**To swap providers**: change that one line's right-hand side and the import
on line 2. Nothing else in the app knows which vendor is active. There is no
env-var switching (a comment marks it as a future idea only).

Providers on disk (`src/models/api/llm/`):

| File | Export | Status |
| --- | --- | --- |
| `google.ts` | `googleProvider` | **Active** (wired into `llmApi.ts`) |
| `anthropic.ts` | `claudeProvider` | Complete standby, **not wired**; Anthropic account currently unfunded, no free tier (see §10) |
| `openai.ts` | `openaiProvider` | **Stale orphan** — `gpt-4o` hardcoded, no timeout, no retry, env key not `__DEV__`-gated, zero imports anywhere. Do not wire it as-is; treat as a historical artifact |

## 3. `google.ts` anatomy (the active provider)

Path: `src/models/api/llm/google.ts`. Talks to
`https://generativelanguage.googleapis.com/v1beta/models` (exported as
`GEMINI_BASE_URL`) via raw `fetch` — no Google SDK.

### 3.1 API key resolution chain (`getApiKey`, exported)

1. `AsyncStorage["app_settings"].geminiApiKey` (the key the user typed into
   Settings; schema field in `src/models/schemas/SettingsSchema.ts`).
2. If empty: `process.env.EXPO_PUBLIC_GEMINI_API_KEY` — **only when `__DEV__`
   is true**. In any compiled build the env key is ignored by design, so a
   shipped APK can never leak the developer's key; every user supplies their
   own via Settings.
3. If both empty: the request goes out with an empty `?key=` → Gemini returns
   **403**.

`getApiKey` is exported specifically so `src/models/api/image/googleImage.ts`
resolves keys identically. Reuse it; do not write a second resolution path.

### 3.2 Model resolution chain (`getModel`)

1. **Dev builds only**: `AsyncStorage["app_settings"].geminiModel` override
   (set via the debug-only Settings field, commit `7f48326`). Ignored when
   `__DEV__` is false.
2. `process.env.EXPO_PUBLIC_GEMINI_MODEL` (works in all builds — it is baked
   in at build time).
3. `DEFAULT_MODEL = "gemini-2.5-flash"` (exported const).

`DEFAULT_MODEL` is deliberately a **pinned concrete model name, not a moving
alias** (e.g. not `gemini-flash-latest`): behavior must be reproducible across
machines, and free-tier quota is granted *per concrete model* — an alias can
silently start pointing at a model with zero free quota (§9).

### 3.3 Timeout / retry matrix (`send`)

| Constant | Value |
| --- | --- |
| `SEND_TIMEOUT_MS` | 45 000 (AbortController per attempt) |
| `MAX_RETRIES` | 2 (so up to 3 attempts total) |
| Backoff | 1.5 s after attempt 0, 3 s after attempt 1 |

Retry decision is string-matching on the thrown error (non-OK responses throw
`Error("Gemini request failed: <status>")` — the body is discarded here):

| Condition | Retried at provider? | Why |
| --- | --- | --- |
| `AbortError` (45 s timeout) | Yes | Before commit `e04e5b7` calls hung ~9 minutes on RN's default fetch; a timed-out call is likely transient |
| message contains `"503"` | Yes | Gemini "model overloaded" — transient by definition |
| message contains `"Network request failed"` | Yes | RN's generic offline/DNS error |
| message contains `"429"` | **NO — fails fast** | Deliberate (commit `377e3a4`). Blind provider-level 429 retries *tripled* quota burn during the incident, and a free-tier-zero 429 can never succeed. 429 handling belongs one layer up where priority is known (§4) |
| 400 / 403 / anything else | No | Deterministic failures; retrying wastes quota |

`stream` has **no timeout and no retries** (currently dead code, so this has
never bitten — but know it before wiring streaming up).

Response text extraction: `data.candidates?.[0]?.content?.parts?.[0]?.text ?? ""`
— note a safety-blocked or empty candidate yields `content: ""`, not an error.

Unit tests: `google.test.ts` (mocked fetch/AsyncStorage — covers URL
construction and resolution chains). Live check: `google.smoke.test.ts` (§11).

## 4. `LLMService` — the app-wide priority queue

Path: `src/services/LLMService.ts`. Module-level state (one queue per JS
runtime), serializes ALL LLM traffic: one in-flight call at a time, ever.
This exists because the Gemini free tier is RPM-limited — parallel calls from
background features were starving user-facing calls (commits `3ffc057`,
`7749304`).

### 4.1 Priority semantics

```ts
export type LLMCallPriority = "user" | "background";
LLMService.send(request, priority = "user", callbacks?)
```

- `pump()` always dequeues the **first `"user"` item** in the queue, else the
  head. So user calls jump ahead of any number of queued background calls, but
  **never preempt** the currently running call — they wait for it to finish.
- FIFO within the same priority.
- `LLMService.stream(request, onChunk, priority)` enqueues the same way but
  supports no callbacks and no 429 retry.

### 4.2 Callbacks (`LLMSendCallbacks`)

| Callback | Fires when | What callers do with it |
| --- | --- | --- |
| `onQueued` | A `"user"`-priority call is submitted while another user call is already running or queued (`hasUserCallActive()`); fires only on first submission, not retries | Show the companion: "Still finishing something — your message is queued..." |
| `onRateLimited` | A user-priority call failed with `"429"` in the error message and is about to be retried | Show the companion: "Hit the rate limit — retrying automatically. No need to resend." |

### 4.3 429 retry (this is where 429 IS retried)

Only for `priority === "user"`:
`RATE_LIMIT_RETRY_DELAY_MS = 20_000`, `MAX_USER_RATE_LIMIT_RETRIES = 2`.
The retry sleeps 20 s **inside the queued task** (holding the queue — nothing
else runs during the wait), then re-enqueues. Background 429s fail
immediately; every background caller catches and falls back silently.

Detection is `error.message.includes("429")` — it matches the provider's
`Gemini request failed: 429` string. It cannot distinguish free-tier-zero from
an ordinary RPM cap (the provider discards the body), so a user call against a
quota-zeroed model burns 2×20 s before surfacing the error. See §9 for how to
tell those apart out-of-band.

### 4.4 Availability listeners — current reality

`notifyAvailability("available" | "exhausted")` fires after every terminal
success/failure, and `LLMService.subscribeAvailability(listener)` exists —
**but has zero production subscribers** (verified by grep; the only reference
outside `LLMService.ts` is a jest mock in `SafetyService.test.ts`). The
companion's "exhausted" state is actually driven directly by controllers
calling `showCompanion("exhausted", ...)` in `onQueued` / `onRateLimited` /
catch blocks. Treat `subscribeAvailability` as plumbed-but-unwired; wiring it
to the companion store is a plausible future slice, not current behavior.

### 4.5 Full caller map (every `LLMService.send` call site, verified)

Priority `"user"` means "default (arg omitted)" unless marked explicit.

| Caller (file — function) | Priority | Callbacks | Purpose / parser |
| --- | --- | --- | --- |
| `useConversationController.ts` — `sendMessage` (structured-adaptation path, ~L238) | `"user"` explicit | onQueued + onRateLimited | Chat adaptation; `stripJsonFences` + `AdaptationResponseSchema.safeParse` |
| `useConversationController.ts` — `sendMessage` (conversational path, ~L284) | `"user"` explicit | onQueued + onRateLimited | Chat; `parseAction` + `parsePantryAddSuggestion` |
| `useRecipeController.ts` — `importRecipeSource` (~L376) | `"user"` explicit | onQueued + onRateLimited | Recipe import; `parseRecipeDraftFromLLM` |
| `useRecipeController.ts` — `refineDraft` (~L296) | user (default) | — | Draft refinement; `parseRecipeDraftFromLLM` |
| `useRecipeController.ts` — `generateDimensionsIfMissing` (~L121) | user (default) | — | Fire-and-forget rating dimensions; `RatingDimensionsService.parseGenerated` |
| `useAdaptationController.ts` — `runAdaptation` (~L177) | user (default) | — | **The open-bug path**; `parseAdaptationResponse` (§12) |
| `useAdaptationController.ts` — `requestPlan` (~L256) | user (default) | — | Plan chat; raw text, no parsing |
| `useMealPlanController.ts` — `applyPendingAdaptation` (~L241) | user (default) | — | Slot adaptation; inline `{…}` slice + zod |
| `useMealPlanController.ts` — `generateFromRequest` (~L600) | user (default) | — | Plan draft; `parsePlanDraft` |
| `useMealPlanController.ts` — `generatePlan` (~L659) | user (default) | — | Legacy plan; raw text |
| `usePantryController.ts` — `markItemUsed` (~L339) | user (default) | — | yes/no removal check; regex `/^yes/i` |
| `usePantryController.ts` — `suggestShelfLife` (~L375) | user (default) | — | Integer-only reply; `parseInt` |
| `usePantryController.ts` — `suggestFromPantry` (~L490) | user (default) | — | `parsePantrySuggestions` |
| `usePantryController.ts` — `suggestForItem` (~L520) | user (default) | — | `parsePantrySuggestions` |
| `usePantryController.ts` — `swapSuggestion` (~L554) | user (default) | — | `parsePantrySuggestions` |
| `useSubstitutionController.ts` — `getSuggestion` (~L34) | user (default) | — | Raw text shown as-is |
| `SafetyService.ts` — `classify` (~L17) / `scanOutput` (~L48) | user (default) | — | Single-label replies (§7) |
| `RecipeImportService.ts` — `generateRecipeFromIdea` (~L144) | user (default) | — | `parseRecipeDraftFromLLM` |
| `InspirationService.ts` — `generateMore` (~L505) | user (default) | — | User pressed "generate more"; `parseGeneratedCards` |
| `HomeEnrichmentService.ts` — `enrich` (~L32) | **`"background"`** | — | Home card garnish; `parseHomeEnrichment`; session-cached, `{}` on failure |
| `InspirationService.ts` — `generateSparks` (~L132) | **`"background"`** | — | Discover sparks; `parseSparks`, static fallback |
| `InspirationService.ts` — `getLeftover` (~L385) | **`"background"`** | — | Leftover idea; `parseLeftover` |
| `InspirationService.ts` — `getGeneratedThemes` (~L452) | **`"background"`** | — | Discover themes; `parseGeneratedThemes` |
| `NudgeService.ts` — `generateNudge` (~L52) | **`"background"`** | — | Home nudge; bare `JSON.parse` (no fence tolerance, no zod), `null` on any failure |

Rules for NEW callers: user-blocking flows → `"user"` + both callbacks wired
to the companion; ambient/prefetch flows → explicit `"background"` + silent
fallback + never surface errors. (Note `generateDimensionsIfMissing` is
fire-and-forget UX-wise but runs at user priority — a known inconsistency,
not a pattern to copy.)

## 5. Prompt conventions (`src/prompts/`)

22 builder modules (all files in `src/prompts/` except `index.ts` and the two
`*.test.ts` files). Convention, per ARCHITECTURE rules that remain enforced:
**prompt builders are pure functions `(context) => string`** — no I/O, no
store access, no imports from services/controllers. Callers gather context;
builders format it.

JSON-only response contracts: prompts that need structure say some variant of
"Return valid JSON only. Do not wrap the JSON in markdown fences. Do not add
commentary" and then spell out the exact shape (see `recipeAdaptation.ts` for
the largest contract — it enumerates every change-variant object). The model
still violates this sometimes; hence the tolerant parsers.

### 5.1 Tolerant parsing idioms and where each lives

| Idiom | What it does | Implementations (all local, deliberately not shared — check before assuming one exists in scope) |
| --- | --- | --- |
| **stripFences** | Regex-strip a leading ```` ```json ```` and trailing ```` ``` ```` | `stripJsonFences` in `useConversationController.ts` (~L32) and in `src/utils/recipeBuilder.ts` (~L40); `stripFences` in both smoke tests |
| **extractJsonObject** | Slice from first `{` to last `}` — survives fences AND prose around the JSON | `extractJsonObject` in `useAdaptationController.ts` (~L94); inlined `indexOf("{")`/`lastIndexOf("}")` in `useMealPlanController.applyPendingAdaptation` (~L251) |
| **extract JSON array** | Same but `[` … `]` | `parseSparks` in `src/prompts/discoverSparks.ts` (~L50); `RatingDimensionsService.parseGenerated` (~L37) |
| **last-line JSON** | Prose answer + machine-readable JSON on the final line; split, parse last line, keep the prose | `parsePantryAddSuggestion` in `useConversationController.ts` (~L88) |
| **first-char sniff** | `trimmed.startsWith("{")` to decide "is this an action or just chat" | `parseAction` in `useConversationController.ts` (~L48) |
| **zod safeParse** | Schema-validate after JSON.parse; never throw | `AdaptationResponseSchema` (defined in `src/models/schemas/ConversationSchema.ts` ~L120) used in `useAdaptationController`, `useConversationController`, `useMealPlanController` |
| **manual field filtering** | typeof-check each field, drop malformed entries, cap counts | `parseRecipeDraftFromLLM` (`src/utils/recipeBuilder.ts`), `parseSparks`, `parseGeneratedThemes`, `parseLeftover`, `parseHomeEnrichment`, `parsePantrySuggestions` |

Failure posture: background parsers return `[]`/`{}`/`null` and fall back;
user-facing parsers surface a friendly error and keep the phase recoverable.
`NudgeService` is the one bare `JSON.parse` with no tolerance — its catch
returns `null`, which is why nudges "fail silently" by design.

## 6. Context window management

`src/utils/contextWindow.ts`. Used in exactly one place: the conversational
path of `useConversationController` (`trimContextWindow(previousMessages)`
before building the request).

- Token estimate: `ceil(chars / 4)` (`estimateTokensFromText`), or a message's
  own `estimatedTokens` if present.
- `trimContextWindow(messages, maxTokens = 3_500)` = `buildContextWindow` with
  `preserveMostRecent: 8`, `alwaysPreserveRoles: ["system"]`.
- Selection: always keep system-role messages and the 8 most recent; then walk
  backwards adding older messages while they fit the budget; return in
  original order. Note the preserved set is added regardless of budget — the
  8 most recent always survive even if they alone exceed `maxTokens`.

Adaptation/import/inspiration calls do NOT trim — they send a single built
prompt. Large recipes make large prompts; nothing caps them today.

## 7. Safety tiers pipeline

Only the free-chat path (`useConversationController.sendMessage`) runs safety.
Direct feature calls (import, adaptation, pantry, inspiration) do not — their
prompts are app-constructed, not free text.

```
Layer 1  SafetyService.classify(userText)      -> SAFE | OFF_TOPIC | T2 | T0
Layer 2  system-prompt note injection           (T2/OFF_TOPIC only)
Layer 3  SafetyService.scanOutput(response)    -> block-or-pass on the reply
```

| Label | Meaning | Effect |
| --- | --- | --- |
| `T0` | Harmful/illegal/jailbreak | Hard stop before the main call; show `T0_BLOCKED_RESPONSE`; nothing stored |
| `T2` | Good-faith but dangerous cooking practice | Append `SAFETY_T2_SYSTEM_NOTE` to the system prompt (refuse method, state hazard, offer safe alternative) |
| `OFF_TOPIC` | Not about food | Append `SAFETY_T1_SYSTEM_NOTE` (polite redirect) |
| `SAFE` | Normal | No note |

Layer 3 asks a scanner prompt for `CLEAN`/`BLOCK`; on `BLOCK` the just-added
user message is removed from the store and `T0_BLOCKED_RESPONSE` shown.
Prompts + constants live in `src/prompts/safetyTiers.ts`; both classifier and
scanner **fail open** (errors → `SAFE`/`CLEAN`) so the safety layer can never
brick chat. Each safety layer is its own `LLMService.send` — a fully safetied
chat message costs **3 LLM calls** (classify, answer, scan). Remember this
when reasoning about RPM limits.

`app_settings.skipSafetyLayer1` skips layer 1 — but only when `__DEV__` is
true, so it is inert in every compiled build.

## 8. `__DEV__` trap table (memorize)

`__DEV__` is **false in ALL EAS builds, including the "preview" RC APK**.
Consequences inside compiled builds:

| Feature | Compiled-build behavior |
| --- | --- |
| `EXPO_PUBLIC_GEMINI_API_KEY` env fallback | Ignored — only the Settings-entered key works |
| `app_settings.geminiModel` override | Ignored — model = `EXPO_PUBLIC_GEMINI_MODEL` or `DEFAULT_MODEL` |
| `skipSafetyLayer1` | Ignored — safety always runs |
| Logger `debug` level | Dropped — ring buffer keeps `info`+ only |

Jest does not define `__DEV__`; `jest.setup.ts` sets it to `true` manually
(commit `fe95299` — before that, every `google.ts` test silently exercised the
prod branch). If a test suddenly behaves like a prod build, check this first.

## 9. Gemini free-tier economics (as of 2026-07-02)

The app runs on the Gemini **free tier** with the user's own key. Hard-won
facts:

- **Quota is per concrete model and can be revoked.** Google reallocates
  free-tier quota between model generations. Incident: `gemini-2.0-flash` was
  quota-zeroed — every call returned 429 with `limit: 0`. Commit `8bc7dc4`
  switched TO 2.0-flash as a "fix" (wrong — it was moving onto a zeroed
  model); commit `ecebc53` root-caused it with a curl matrix across models and
  pinned `gemini-2.5-flash`. Lesson: **a persistent 429 is not necessarily
  pacing; probe before pacing.**
- **Image generation was removed from the free tier entirely.** The image
  smoke test is `it.skip`'d for exactly this (commit `2d148f3`);
  `DEFAULT_IMAGE_MODEL = "gemini-2.5-flash-image"` in `googleImage.ts` and the
  3.x image models 429 instantly without paid billing.
- **This is why `DEFAULT_MODEL` is pinned, not an alias** — an alias can move
  under you onto a model with different (or zero) free quota.

### 9.1 Probing current model availability (run outside the app)

List models visible to the key:

```bash
curl -s "https://generativelanguage.googleapis.com/v1beta/models?key=$GEMINI_API_KEY" \
  | python3 -c 'import json,sys; [print(m["name"]) for m in json.load(sys.stdin)["models"]]'
```

Being listed does NOT prove usable free quota. Probe a specific model with a
real (cheap) generateContent call and **read the raw error body** — the app
throws away everything but the status code:

```bash
curl -s -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=$GEMINI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"Reply with the single word: ok"}]}]}'
```

Repeat per candidate model to build the availability matrix (this is exactly
how the `ecebc53` fix was found).

### 9.2 Gemini error semantics table (from raw curl bodies)

| Response | Body signature | Meaning | Correct reaction |
| --- | --- | --- | --- |
| 400 | `"API key not valid"` / `API_KEY_INVALID` | Bad or rotated key (Gemini uses 400 here, NOT 401) | Re-enter key in Settings; never retry |
| 403 | permission denied | No key sent at all (empty `?key=`) | Key resolution chain returned "" — check Settings / `__DEV__` trap |
| 429 | quota-violation details containing `"limit": 0` (metric name ends `-FreeTier`) | **Free-tier-zero**: that model has NO free allocation — permanent for the model | Switch models (probe first); retrying can never work |
| 429 | quota details with nonzero limits | Ordinary RPM/RPD rate limit | Pacing/retry works; `LLMService` handles it for user calls |
| 503 | model overloaded | Transient capacity | Provider-level retry handles it |

The app truncates all of this to `Gemini request failed: <status>` — the ONE
exception is `googleImage.ts`, which keeps the first 800 chars of the body
precisely so a 429's `limit 0` survives into the log. When field-debugging,
always reproduce with curl to see the full body.

## 10. The Claude standby (`anthropic.ts`) — exact activation steps

`src/models/api/llm/anthropic.ts` exports a complete `claudeProvider`:
Messages API (`https://api.anthropic.com/v1/messages`, version header
`2023-06-01`), `DEFAULT_MODEL = "claude-sonnet-5"`, `MAX_TOKENS = 4096`, same
45 s timeout and 2-retry backoff, retrying on 529/500/network (Anthropic's
overload code is 529, not 503). Its only consumer is `anthropic.smoke.test.ts`.

**It is NOT wired, and the Anthropic account is unfunded (no free tier), so
activating it is a paid decision — owner sign-off required.**

Wiring steps if activated:

1. Owner funds the Anthropic account and provides a key path decision.
2. In `llmApi.ts`: import `claudeProvider`, change line 25's assignment. That
   is the entire provider swap.
3. **Key resolution gap**: `claudeProvider.getApiKey` reads ONLY
   `EXPO_PUBLIC_CLAUDE_API_KEY` and only when `__DEV__` — there is no
   Settings-stored key for Claude. A compiled build would have NO key. Before
   shipping, mirror google.ts's chain: add a `claudeApiKey` field to
   `SettingsSchema` + Settings UI, and read AsyncStorage `app_settings` first.
   (That is model + view + provider work — multiple passes under the one-file
   discipline.)
4. Re-check every parser: prompts/parsers were hardened against *Gemini's*
   fencing habits; Claude's differ. Run the JSON-contract flows end-to-end.
5. 429 handling in `LLMService` is provider-agnostic (string `"429"`) and
   carries over; the free-tier-zero semantics of §9 are Gemini-specific.
6. Smoke check first:
   `RUN_LLM_SMOKE=1 EXPO_PUBLIC_CLAUDE_API_KEY=<key> npx jest anthropic.smoke`

## 11. Diagnostics and tests

- **Ring-buffer logger** (`src/utils/logger.ts`): in-memory, 500 entries max,
  lost on app restart; `info`+ in compiled builds. Export: Settings → Debug →
  "Share log" (`SettingsScreen.tsx` ~L557, via `exportLogs()`; debug section
  unlocks with 6 taps — commit `7817213`). This is the ONLY field-debugging
  channel for compiled builds. `LLMService` logs every send (priority, sizes),
  every response (ms, length), rate-limit retries, and failures.
- **Mocked unit tests**: `npx jest google.test` — URL construction, key/model
  resolution, retry logic, all with mocked fetch.
- **Live smoke tests** (spend real quota — get consent first):
  - `RUN_LLM_SMOKE=1 EXPO_PUBLIC_GEMINI_API_KEY=<key> npx jest google.smoke`
    — text model must return `{"ok": true}`; the image test inside is
    `it.skip`'d (free tier removed image gen).
  - `RUN_LLM_SMOKE=1 EXPO_PUBLIC_CLAUDE_API_KEY=<key> npx jest anthropic.smoke`
- Type/lint: `npx tsc --noEmit -p .` and `npm run lint`.
- Coverage reality: `LLMService.ts` itself has **no unit test**; queue
  semantics are unverified by tests. Tread carefully there.

## 12. Open bug (active campaign target — do not "fix" blind)

**Symptom**: recipe adaptation intermittently fails with "The adaptation came
back in an unexpected format" (`useAdaptationController.runAdaptation`).
Observed 2026-07-02: 3 consecutive failures adapting an *already-adapted
variant* (`recipe_1783008233834`) while the first adaptation of the base
recipe succeeded; responses were 5–6 KB and HTTP-successful, so the failure is
inside `parseAdaptationResponse` → `extractJsonObject` / `JSON.parse` /
`AdaptationResponseSchema.safeParse`.

**Shipped instrumentation** (commit `4c8f7e0`): the parse path now logs
`failureReason` (`no_json_found` | `json_parse_error` |
`schema_validation_failed`), a detail (first 5 zod issues or the JSON error),
and a 500-char response snippet — retrievable via Share log. **Status: awaiting
a field repro with that log.**

Candidate causes (all UNCONFIRMED — do not present as diagnosis):
truncated output (no `maxOutputTokens` is set, though the longest observed
response succeeded), variant-recipe ingredient/step id formatting flowing into
`buildAdaptationPrompt` (`src/prompts/recipeAdaptation.ts` interpolates
ingredient ids into `- [id] ...` lines), or plain model JSON drift. A possible
future mitigation is Gemini's `responseMimeType: "application/json"` /
`responseSchema` JSON mode, which the app deliberately does not use yet — that
would be an owner-approved provider-layer change, not a quick patch.

## 13. Known ARCHITECTURE.md drift (LLM-related — doc is WRONG, code wins)

Per owner doctrine (2026-07-02): document reality, flag drift, route doc fixes
to the owner — never silently edit ARCHITECTURE.md.

| ARCHITECTURE.md claim | Code reality |
| --- | --- |
| Anthropic API is the LLM (header, L145, L248, L352, L703 mention Anthropic) | Active provider is Gemini via `googleProvider`; Anthropic is an unwired standby |
| `LLMService.ts` does "prompt assembly, Anthropic API calls, stream parsing" | `LLMService` is a queue/priority wrapper; prompt assembly is in `src/prompts/`, HTTP in `google.ts`; streaming is dead code |
| `src/constants/config.ts` holds API URLs / LLM model string | File does not exist; base URL + model live in `google.ts` (and `googleImage.ts`) |
| `LLMService.test.ts` exists | It does not; `LLMService` is untested |
| ~6 prompts listed | 22 prompt builder modules |
| Supabase sync layer | No Supabase code exists anywhere |

## Provenance and maintenance

Authored 2026-07-02 against the `dev` branch working tree. Every path,
function, constant, and line-ish location above was verified by reading the
code that day. Volatile facts and their one-line re-verification commands:

| Fact | Re-verify with |
| --- | --- |
| Active provider is `googleProvider`, line 25 | `grep -n "activeProvider" src/models/api/llmApi.ts` |
| `DEFAULT_MODEL = "gemini-2.5-flash"` | `grep -n "DEFAULT_MODEL" src/models/api/llm/google.ts` |
| 45 s timeout / 2 retries / 429 fails fast at provider | `grep -n "SEND_TIMEOUT_MS\|MAX_RETRIES\|429" src/models/api/llm/google.ts` |
| Queue constants (20 s, 2 retries) and priority pump | `grep -n "RATE_LIMIT_RETRY_DELAY_MS\|MAX_USER_RATE_LIMIT_RETRIES\|findIndex" src/services/LLMService.ts` |
| Caller map + priorities | `grep -rn "LLMService.send" src \| grep -v test` and `grep -rn '"background"' src` |
| `subscribeAvailability` still unwired | `grep -rn "subscribeAvailability" src \| grep -v "LLMService.ts"` |
| Streaming still dead code | `grep -rn "\.stream(" src` |
| Prompt builder count (22) | `ls src/prompts \| grep -v test \| grep -v index \| wc -l` |
| Settings keys (`geminiApiKey`, `geminiModel`, `skipSafetyLayer1`) | `grep -n "gemini\|skipSafety" src/models/schemas/SettingsSchema.ts` |
| Image model + free-tier note | `grep -n "DEFAULT_IMAGE_MODEL" src/models/api/image/googleImage.ts` |
| Image smoke still skipped | `grep -n "it.skip" src/models/api/llm/google.smoke.test.ts` |
| Claude standby still unwired / model name | `grep -rn "claudeProvider" src \| grep -v anthropic` (should show only test) |
| Adaptation-bug instrumentation present | `grep -n "failureReason\|responseSnippet" src/controllers/useAdaptationController.ts` |
| Gemini model quota status (changes on Google's schedule, not ours) | the two curl probes in §9.1 |
| ARCHITECTURE.md drift rows | `grep -n -i "anthropic\|config.ts\|supabase" ARCHITECTURE.md` |

If any command above contradicts this file, the code/API is right — update
this skill and flag ARCHITECTURE.md drift to the owner.
