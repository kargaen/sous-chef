---
name: sous-chef-failure-archaeology
description: >
  The chronicle of every major Sous Chef investigation — symptom, wrong turns,
  root cause, evidence, fix, and status, anchored to git SHAs. Load this BEFORE
  starting ANY debugging session, so you never re-fight a settled battle.
  Triggers: "429", "rate limited", "quota", "model overloaded", "503",
  "API key not valid", "LLM hangs", "spinner never resolves", "timeout",
  "adaptation came back in an unexpected format", "JSON parse failure",
  "tests pass but shouldn't", "__DEV__ undefined", "EAS build queued/stacked",
  "build quota", "debug menu won't open", "image generation fails",
  "Claude adapter", "Anthropic error", "why was X changed", "has this
  happened before", "git blame", or any symptom that smells like it has
  history. Also load when writing a postmortem or extending this chronicle.
---

# Failure archaeology — the Sous Chef incident chronicle

This file exists so a fresh engineer (or model) does not burn a day rediscovering a
conclusion that already cost days the first time. Every entry below was a real
investigation on this repo. Each is anchored to commits on `dev` so you can verify it
yourself instead of trusting prose.

**Rule 1: before debugging anything, scan the entry titles below.** If your symptom
matches an entry marked SETTLED, read the entry, apply its conclusion, and do NOT
re-open the investigation unless you have new evidence that contradicts the recorded
evidence.

**Rule 2: mine git yourself.** This chronicle can go stale; the log cannot.

```bash
cd /home/user/sous-chef
git log --oneline -60                 # recent history at a glance
git show <sha> --stat                 # what a commit touched
git show <sha> --format='%ad %B' --no-patch --date=short   # full commit message (often contains the postmortem)
git log --oneline --follow -- <path>  # history of one file
```

Commit messages in this repo are deliberately written as mini-postmortems (see
`ecebc53` for the best example). Read the message body, not just the subject line.

**Status legend**

| Status | Meaning |
| --- | --- |
| SETTLED | Root cause proven, fix shipped. Do not re-investigate without new evidence. |
| OPEN | Instrumented and waiting; the conclusion is NOT known yet. |
| SUPERSEDED | The fix was itself wrong or replaced; the entry records why. Read the superseding entry. |

**Jargon used below (defined once)**

- **RC build**: release-candidate Android APK built by `.github/workflows/rc-android.yml` on every push to `dev`, published to a fixed GitHub prerelease tag.
- **EAS**: Expo Application Services — the hosted build farm. Free tier: 15 Android builds/month, resets on the 1st.
- **`__DEV__`**: React Native global; `true` in Metro dev sessions, `false` in ALL compiled EAS builds (including the "preview" RC profile).
- **Smoke test**: opt-in Jest test that makes a real network call; gated behind `RUN_LLM_SMOKE=1`.
- **Quota-zeroed**: a Gemini model whose free-tier allocation is literally `limit: 0` in the 429 error body — retrying can never succeed.

---

## Entry 1 — The Great 429 Goose-Chase (2026-06-24 → 2026-07-01) — STATUS: SETTLED

The most expensive investigation in the repo's history. "The LLM is rate limited" had
**three distinct root causes** across two weeks, and two intermediate "fixes" treated the
wrong one. Memorize the ending: **always read the raw 429/quota-violation body with
curl before concluding anything.** The app truncates provider errors to status codes;
the raw body is where the truth lives.

### The arc, in order

| Step | Date | SHA | What happened |
| --- | --- | --- | --- |
| Symptom | ~2026-06-24 | — | Recipe import spinner never resolved; later, constant "exhausted" companion state. Model at the time: `gemini-3.5-flash` (a new thinking model under heavy free-tier demand → constant 503/429). |
| Fix (real, kept) | 2026-06-24 | `e04e5b7` | LLM calls hung indefinitely on `response.json()` in compiled builds (~9 min observed). Added 45s `AbortController` timeout + 2 retries (503/429/network) in `src/models/api/llm/google.ts`. |
| Wrong turn #1 | — | (part of `e04e5b7`) | Those retries included 429. Blind short-delay 429 retries **tripled quota burn** — every rate-limited call spent 3 requests to fail once. |
| Correction | 2026-06-25 | `377e3a4` | Stop retrying 429 at the provider layer. 429 = hard quota, not transient. Provider now retries ONLY 503 / abort / network failure. |
| Mitigation (real, kept) | 2026-06-25 | `3ffc057` + `7749304` | Priority queue in `src/services/LLMService.ts` serializing all LLM calls; `user` priority jumps ahead of `background` (HomeEnrichmentService, InspirationService, NudgeService demoted). User-priority 429s retry after 20s, max 2x (`RATE_LIMIT_RETRY_DELAY_MS = 20_000`, `MAX_USER_RATE_LIMIT_RETRIES = 2`). |
| UX layer | 2026-06-25 | `49e9f14` | `onQueued` / `onRateLimited` callbacks; availability listeners drive the companion "exhausted" state. |
| Wrong turn #2 | 2026-06-25 | `8bc7dc4` | Switched `DEFAULT_MODEL` to `gemini-2.0-flash` to escape the overloaded 3.5-flash. Reasonable-looking; actually WRONG — that model was **quota-zeroed** on the free tier (`limit: 0`), so 429s persisted for days and were misattributed to background call volume and key/project health. |
| The probe | 2026-07-01 | — | curl matrix across models with a fresh key proved it: every quota metric for `gemini-2.0-flash` returned `limit: 0`, while `gemini-2.5-flash`, `gemini-2.5-flash-lite`, and other current-gen models responded normally with quota available (recorded in the `ecebc53` commit body). |
| Root-cause fix | 2026-07-01 | `ecebc53` | `DEFAULT_MODEL = "gemini-2.5-flash"` in `google.ts` (+ matching Settings placeholder). 429s stopped. |

### The three root causes "rate limited" actually had

1. `gemini-3.5-flash` genuinely overloaded (503s, transient) — retry/timeout was the right tool.
2. Self-inflicted quota burn from blind 429 retries — fixed by `377e3a4` + queue.
3. `gemini-2.0-flash` quota-zeroed (`limit: 0`, permanent for that model) — no amount of retrying, queueing, or key rotation could ever work.

### Verify / reproduce the probe

```bash
grep -n "DEFAULT_MODEL" src/models/api/llm/google.ts          # current pinned model
git show ecebc53 --format='%B' --no-patch                      # the postmortem commit message
# Raw probe (substitute model + key; NEVER commit a key):
curl -s "https://generativelanguage.googleapis.com/v1beta/models/<MODEL>:generateContent?key=<KEY>" \
  -H 'Content-Type: application/json' \
  -d '{"contents":[{"parts":[{"text":"ping"}]}]}' | head -50
```

Read the 429 body's quota-violation details: `limit: 0` = model quota-zeroed (switch
models); nonzero limits = ordinary RPM/RPD rate limit (waiting/retrying works). The
full error-discrimination table (400 vs 403 vs 429 vs 503) lives in the
`sous-chef-llm-reference` skill.

---

## Entry 2 — LLM calls hang indefinitely — STATUS: SETTLED

- **Symptom**: recipe import spinner spun forever in compiled builds; one hang observed ~9 minutes.
- **Wrong turn**: none recorded — but note the hang was on `response.json()`, i.e. AFTER a successful HTTP connect, which is why naive "is the API up" checks showed healthy.
- **Root cause**: no timeout anywhere in `googleProvider.send()`.
- **Fix**: `e04e5b7` (2026-06-24) — `SEND_TIMEOUT_MS = 45_000` with `AbortController` in `src/models/api/llm/google.ts`; abort is treated as retryable (2 retries, 1.5s/3s backoff).
- **Evidence**: `git show e04e5b7 --format='%B' --no-patch`.
- **Standing rule**: any NEW provider adapter must ship with a timeout from day one. The stale `openai.ts` orphan has none — do not copy it.

## Entry 3 — EAS build stacking / quota burn — STATUS: SETTLED (behavioral rule remains ACTIVE)

- **Symptom**: rapid pushes to `dev` queued multiple concurrent EAS builds; on 2026-07-02 four builds stacked and burned monthly quota. A prior month's quota was fully exhausted, blocking all builds for days.
- **Wrong turn**: assuming GitHub Actions `concurrency: cancel-in-progress: true` was enough. It cancels the *workflow run*, but a build already **submitted to EAS keeps running on EAS's side** and still counts against quota.
- **Fix**: `db46ed0` (2026-07-01) — explicit "Cancel stale RC builds" step in `.github/workflows/rc-android.yml` using `eas build:list` + `eas build:cancel` before submitting a new build.
- **Economics** (why this matters): free tier = 15 Android builds/month, resets on the 1st; builds failing within 3 minutes don't count; canceled builds count only if processing already started.
- **NON-NEGOTIABLE consequence (owner-canonized)**: NEVER trigger an EAS build — including any push to `dev`, which auto-triggers the RC workflow — without explicit owner confirmation. This is doctrine, not a suggestion. See `sous-chef-change-control`.
- **Verify**: `grep -n "Cancel stale" .github/workflows/rc-android.yml`.

## Entry 4 — `__DEV__` undefined in Jest silently broke provider tests — STATUS: SETTLED

- **Symptom**: none visible — that's the trap. `src/models/api/llm/google.test.ts` tests exercising `__DEV__`-gated code paths (env-key fallback, model override) were silently broken because Jest's node environment does not define React Native's `__DEV__` global.
- **Fix**: `fe95299` (2026-07-01) — one line in `jest.setup.ts`: `(globalThis as unknown as { __DEV__: boolean }).__DEV__ = true;`
- **Standing rule**: any test touching `__DEV__`-gated logic depends on `jest.setup.ts`. Also remember the runtime side of this trap: `__DEV__` is `false` in ALL EAS builds including the "preview" RC profile — so compiled APKs ignore env API keys, the `geminiModel` Settings override, and `skipSafetyLayer1`.
- **Verify**: `cat jest.setup.ts`.

## Entry 5 — Debug unlock: long-press failed twice → 6-tap — STATUS: SETTLED (canonical iteration-trap example)

- **Symptom**: field builds needed a way to open the debug panel; long-press-the-bot unlock (`4f66ea3`, 2026-06-18) did not work reliably; a follow-up patch (`884498f`, haptic feedback) still didn't make it dependable.
- **Root cause**: the long-press gesture approach itself, not its tuning.
- **Fix**: `7817213` (2026-06-23) — abandoned the gesture direction entirely; replaced with a 6-tap unlock and always-visible dev tools section.
- **Lesson**: this is the repo's textbook case for root `CLAUDE.md`'s iteration-trap rule — two failed attempts in one direction means the *direction* is wrong. Do not attempt a third tweak; change approach or stop.

## Entry 6 — Gemini image generation removed from free tier — STATUS: SETTLED

- **Symptom**: image smoke test failing despite healthy key/project.
- **Root cause**: Google removed image generation from the Gemini free tier — not an app or key problem.
- **Fix**: `2d148f3` (2026-07-01) — `it.skip` on the image case in `src/models/api/llm/google.smoke.test.ts` (the text case still runs when opted in).
- **Standing rule**: **do NOT use image-test failures as evidence of key or project health.** Text smoke test is the health check: `RUN_LLM_SMOKE=1 EXPO_PUBLIC_GEMINI_API_KEY=<key> npx jest google.smoke`.
- **Verify**: `grep -n "it.skip" src/models/api/llm/google.smoke.test.ts`.

## Entry 7 — Rotated API key looked like an app bug — STATUS: SETTLED (no commit)

- **Symptom**: compiled build suddenly returned instant 400s on every LLM call — instant failure (no 45s timeout wait) made it look like a code regression.
- **Root cause**: the Gemini API key had been rotated. Gemini returns **400 + "API key not valid" / `API_KEY_INVALID`** for a bad key (not 401, which is what intuition expects).
- **Fix**: no code change — re-entered the key in Settings on the device. Remember: in compiled builds the ONLY key source is `app_settings.geminiApiKey` in AsyncStorage (env key is `__DEV__`-gated).
- **Where the log signature lives**: the field-debugging playbook skill (exported "Share log" from Settings → Debug is the only field channel; ring buffer, 500 entries, resets on restart — `src/utils/logger.ts`).
- **Standing rule**: instant 400s ≠ regression. Check the key before reading a single line of code.

## Entry 8 — Adaptation parse failures — STATUS: OPEN (do not close this entry)

- **Symptom**: recipe adaptation intermittently fails with the user-facing error "The adaptation came back in an unexpected format. Try again." On 2026-07-02: 3 consecutive failures adapting an already-adapted variant (`recipe_1783008233834`) while the first adaptation of the base recipe succeeded. Failing responses were large (5–6 KB) and HTTP-successful — failure is post-transport, in `extractJsonObject` → `JSON.parse` → `AdaptationResponseSchema` (zod) inside `src/controllers/useAdaptationController.ts`.
- **Instrumentation shipped**: `4c8f7e0` (2026-07-02) — parse failures now log the failure reason plus a 500-char `responseSnippet` to the ring buffer. **Awaiting field repro.**
- **Candidate causes (UNCONFIRMED — do not present as fact)**: response truncation (no `maxOutputTokens` is set anywhere — though the longest observed response succeeded); variant-recipe id formatting in `buildAdaptationPrompt`; model JSON drift. Gemini `responseSchema`/`responseMimeType` JSON mode is NOT currently used (`grep -rn "responseSchema\|responseMimeType" src` → no hits).
- **Next step lives in**: the adaptation-parse campaign skill (if present in `.claude/skills/`). If you get a field log with a parse-failure snippet, that campaign is where the analysis procedure lives.

## Entry 9 — Claude adapter correct but account unfunded — STATUS: SETTLED (blocked externally)

- **State**: `src/models/api/llm/anthropic.ts` is a complete `claudeProvider` (default model `claude-sonnet-5`), NOT wired into `llmApi.ts` — the active provider is the hardcoded `const activeProvider: LLMProvider = googleProvider;` (line 25 of `src/models/api/llmApi.ts`). Its only consumer is the gated smoke test added in `283f4c9` (2026-07-01): `RUN_LLM_SMOKE=1 EXPO_PUBLIC_CLAUDE_API_KEY=<key> npx jest anthropic.smoke`. The adapter file predates `ac5cc79` as a stub; `ac5cc79` (2026-07-01) made it real.
- **Key insight**: an Anthropic error mentioning **"credit balance too low" means the adapter WORKS** — auth, request shape, and routing are all correct; only funding is missing. There is no Anthropic free tier. Do not "debug" the adapter on that error.
- **To activate later**: fund the account, then flip `activeProvider` — one line. Do not wire it speculatively.

## Entry 10 — SettingsScreen JSX closing-tag build failure — STATUS: SETTLED

- **Symptom**: build failure after debug-section work.
- **Root cause**: a stray extra `</View>` in `src/views/screens/SettingsScreen.tsx`.
- **Fix**: `86bc925` (2026-06-23), one-line deletion.
- **Lesson**: trivial, but recorded because it burned a build during the quota-scarce period (see Entry 3) — a local `npx tsc --noEmit -p .` before any push would have caught it for free.

## Entry 11 — CI shape churn before the current split — STATUS: SUPERSEDED (by the current workflows)

- **History**: `224ec31` first EAS+Release workflow → `98c2d20` triggered releases on `dev` pushes (too aggressive) → `135689f` (2026-06-24) split into `rc-android.yml` (dev → RC prerelease) and `release-android.yml` (master/v* → stable) → `847639e` + `9ce4506` settled on a fixed `v{base}-rc` prerelease tag from `package.json` (no run number) → `e411497` surfaced EAS stderr on failure → `db46ed0` added stale-build cancellation (Entry 3).
- **Current reality**: `release-android.yml` is dormant — `master` is ~73 commits behind `dev`. Treat `rc-android.yml` as the only live pipeline.
- **Verify**: `git log --oneline -- .github/workflows/` and `git rev-list --count master..dev`.

---

## When NOT to use this

| Your task | Use instead |
| --- | --- |
| Live-debugging a NEW LLM symptom (error discrimination table, queue semantics, smoke commands, prompt/parsing idioms) | `sous-chef-llm-reference` |
| Deciding where code belongs, layer boundaries, store/table/key inventories, ARCHITECTURE.md drift questions | `sous-chef-architecture-contract` |
| About to edit, commit, push, build, or plan work (one-file rule, build consent, iteration-trap procedure) | `sous-chef-change-control` |
| Working the OPEN adaptation-parse bug end-to-end | the adaptation-parse campaign skill in `.claude/skills/` (Entry 8 here is only the summary) |

This skill is a **history book**, not a runbook for new problems. If your symptom
matches no entry, close this and debug fresh (with `sous-chef-llm-reference` if the
symptom is LLM-shaped) — then, when settled, ADD an entry here in the same
symptom → wrong turns → root cause → evidence → fix → status shape, with SHAs.

---

## Provenance and maintenance

Written 2026-07-02 from direct inspection of the repo at `dev` HEAD `4c8f7e0` plus the
owner's incident notes. All SHAs are short SHAs on `dev`. Re-verify volatile facts
before relying on them:

| Fact | Re-verify with |
| --- | --- |
| All SHAs, dates, commit messages | `git log --oneline -60` and `git show <sha> --format='%ad %B' --no-patch --date=short` |
| Active model is `gemini-2.5-flash` | `grep -n "DEFAULT_MODEL" src/models/api/llm/google.ts` |
| Active provider is Google | `grep -n "activeProvider" src/models/api/llmApi.ts` |
| 429 handling: fail-fast at provider, 20s x2 retry for user calls in service | `grep -n "429" src/models/api/llm/google.ts src/services/LLMService.ts` |
| 45s timeout | `grep -n "SEND_TIMEOUT_MS" src/models/api/llm/google.ts` |
| `__DEV__` shim in Jest | `cat jest.setup.ts` |
| Image smoke still skipped | `grep -n "it.skip" src/models/api/llm/google.smoke.test.ts` |
| Stale-build cancel step present | `grep -n "Cancel stale" .github/workflows/rc-android.yml` |
| Entry 8 still OPEN (no fix commit after 4c8f7e0) | `git log --oneline -- src/controllers/useAdaptationController.ts` |
| No JSON mode / maxOutputTokens yet | `grep -rn "responseSchema\|responseMimeType\|maxOutputTokens" src` |
| Ring buffer size 500 | `grep -n "BUFFER_MAX" src/utils/logger.ts` |
| master↔dev divergence | `git rev-list --count master..dev` |
| EAS free-tier numbers (15/month, 3-min rule) | Expo pricing docs — external, changes without notice |

When an OPEN entry closes or a SETTLED one is overturned, update its Status line and
append the new SHA — do not delete history. Superseded conclusions are the most
valuable part of this file.
