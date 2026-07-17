---
name: sous-chef-investigation-methodology
description: >-
  The investigation discipline that turns a hunch into an accepted fix in
  Sous Chef — evidence bar, predict-before-probe, control-variable ladder,
  reproduce-outside-the-app, iteration-trap exits, and the full idea
  lifecycle from hunch to owner-validated fix, each with a worked example
  from this repo's git history. Load this when you are ABOUT TO FORM OR
  TEST A THEORY: "I think the cause is...", "let me just try...", "maybe
  it's the key / the model / the quota / truncation", choosing between
  candidate root causes, deciding whether evidence is sufficient to ship a
  fix, a fix attempt just failed (especially a second time), you are
  tempted to add a retry / switch models / switch providers, or you are
  writing up a root cause in a commit body. Keywords: hypothesis, root
  cause, evidence, discriminating experiment, reproduce, isolate variable,
  iteration trap, goose chase, prove it, why did the fix not work,
  intermittent bug, candidate causes.
---

# Investigation methodology (prove it, don't guess)

This skill is the discipline layer. It does not tell you which curl to run
(that is `sous-chef-diagnostics-and-tooling`) or what past incidents concluded
(that is `sous-chef-failure-archaeology`). It tells you **how to reason** so
that your investigation ends in an accepted root cause instead of a
multi-session goose chase — which this repo has already had once (the
persistent-429 chase, roughly 2026-06-24 through 2026-07-01), and whose
scars are cited throughout as worked examples.

**Definitions used below**

| Term | Meaning here |
|---|---|
| Discriminating probe | An experiment whose possible outcomes point to *different* causes, so the result eliminates hypotheses instead of just "checking if it works now" |
| Negative observation | Something that did NOT happen but your theory says should have (these kill theories faster than positives confirm them) |
| Control-variable ladder | A sequence of reproductions, each changing exactly one thing relative to the previous rung |
| Iteration trap | Two failed fix attempts in the same direction (defined and mandated by root `CLAUDE.md`) |
| Quota-zeroed | A Gemini 429 whose error body shows `limit: 0` — the model has no free-tier allocation at all; retrying can never work |

---

## Recipe 1 — The evidence bar: one mechanism must explain ALL observations, including the negatives

A root cause is accepted only when a **single mechanism** accounts for every
observation you have — especially the observations that *contradict* the
popular theory. If your theory needs a second helper theory to cover one data
point, you do not have the root cause yet.

**Checklist before you call something a root cause:**

- [ ] List every observation, positive and negative, in one place.
- [ ] For each observation, write one line: "explained by mechanism because ...".
- [ ] Any observation that needs "...and also, separately..." fails the bar.
- [ ] The mechanism predicts something you have NOT yet tested. Test it.

### Worked example: the persistent-429 goose chase (June–July 2026)

Symptom: every LLM feature returned 429 constantly. Observations on the table:

| # | Observation | "Background calls exhausting quota" theory | "Model quota-zeroed" theory |
|---|---|---|---|
| 1 | 429s on user-initiated calls | explained (quota shared) | explained (`limit: 0`) |
| 2 | 429s persisted after demoting background callers (`7749304`) | NOT explained — should have improved | explained |
| 3 | 429s persisted after quiet periods | weakly explained ("daily cap?") | explained |
| 4 | **A fresh API key with zero prior usage still 429'd** | **NOT explained — a fresh key has burned nothing** | explained: the limit is on the *model*, not the key |
| 5 | Other models responded fine with the same key | not explained | explained: only `gemini-2.0-flash` was zeroed |

Observation 4 is the negative that should have killed the quota-burn theory
on the spot. Instead, plausible-sounding fixes shipped first: `377e3a4`
(stop retrying 429), `3ffc057`/`7749304` (priority queue + background
demotion), `49e9f14` (companion feedback). All of these were *good code* —
and none of them touched the actual cause, because nobody had yet run the
probe that distinguished "quota being burned" from "quota does not exist".

The `limit: 0` discovery (raw curl error body, fresh key, model matrix)
explained all five rows with one mechanism. That is what the bar looks like.

---

## Recipe 2 — Write your predictions down BEFORE running the probe

Before you run any probe, write a table: each live hypothesis, and the
**exact observable** it predicts. If you cannot state what a hypothesis
predicts, it is not a hypothesis — it is a mood.

This forces two things: (a) the probe you pick must actually discriminate
(different hypotheses → different predicted outputs), and (b) you cannot
retro-fit the result to whatever theory you liked ("well, that's *consistent
with*..." is how goose chases survive).

### Worked example: the prediction table that would have ended the 429 chase in one probe

For "LLM calls fail instantly with an error", against a raw
`curl` of `https://generativelanguage.googleapis.com/v1beta/models/<model>:generateContent?key=<key>`:

| Hypothesis | Predicted probe result |
|---|---|
| Key is bad/rotated | `400` with `API_KEY_INVALID` / "API key not valid" in the body (Gemini uses 400, not 401, for this) |
| Key missing entirely | `403` |
| Model is dead for free tier (quota-zeroed) | `429` with `"limit": 0` in the quota-violation details — **and a fresh key also 429s** |
| Ordinary rate limit (RPM/RPD) | `429` with nonzero limits in the body — **and it succeeds after a quiet period** |
| Model overloaded | `503` — and a retry succeeds |
| App-side bug (queue, timeout, parsing) | Raw curl succeeds while the app fails |

Note that two hypotheses ("quota-zeroed" vs "rate limit") produce the *same
status code* and are only distinguished by the raw error body plus one extra
variable (fresh key / quiet period). This is exactly why the app's truncation
of errors to status codes (`Gemini request failed: 429` in
`src/models/api/llm/google.ts`) kept the wrong theory alive: the
discriminating detail never reached anyone. **Always get the raw body.**
Ready-made probes live in
`.claude/skills/sous-chef-diagnostics-and-tooling/scripts/` (`gemini-probe.sh`,
`gemini-model-matrix.sh`).

---

## Recipe 3 — The control-variable ladder: one variable per rung

When a failure could live in any of several layers, reproduce it in a
sequence where each step changes exactly one thing. The rung where behavior
changes localizes the fault. Skipping rungs is how you end up "fixing" the
wrong layer.

The ladder actually used to crack the 429 case:

| Rung | Reproduction | Variable isolated vs previous rung | If behavior changes here, fault is in... |
|---|---|---|---|
| 1 | The failing feature in the app | (baseline) | — |
| 2 | Gated smoke test: `RUN_LLM_SMOKE=1 EXPO_PUBLIC_GEMINI_API_KEY=<key> npx jest google.smoke` | Removes the app runtime (queue, stores, safety layer, UI) but keeps the provider code | LLMService queue / app wiring |
| 3 | Raw `curl` of the same endpoint | Removes ALL app code | `google.ts` provider code |
| 4 | Same curl, **fresh API key** with zero usage | Removes key history / project quota state | The key or its accumulated usage |
| 5 | Same curl, **different models** (the matrix) | Removes the model | The specific model's allocation |

In June 2026 the failure survived rungs 1–4 unchanged (fresh key still
429'd) and flipped at rung 5 (`gemini-2.5-flash` and `gemini-2.5-flash-lite`
fine, `gemini-2.0-flash` returning `limit: 0`). That single flip *is* the
localization: the model, not the key, not the app, not usage volume.

**Rules for the ladder:**

- One variable per rung. "Fresh key AND different model" tells you nothing.
- Run rungs top-down (cheapest-to-interpret first is rung 3; but rung 2
  matters when you suspect app code).
- Record the raw output of every rung. A rung whose output you paraphrased
  from memory has not been run.

---

## Recipe 4 — Reproduce outside the app FIRST

Corollary of Recipe 3, important enough to stand alone: **before changing
any app code for an externally-visible failure, reproduce the failure with
the smallest tool that exhibits it** — usually curl, sometimes a gated smoke
test.

Why this is non-negotiable here:

1. The app truncates provider errors to status codes (see Recipe 2), so
   in-app evidence is structurally lossy.
2. Compiled builds behave differently from dev (`__DEV__ === false` in ALL
   EAS builds: env keys ignored, model override ignored). An in-app repro
   conflates the bug with the build-type trap. See
   `sous-chef-build-run-release` for the full `__DEV__` table.
3. Device field-debugging has exactly one channel — the 500-entry in-memory
   ring buffer (`src/utils/logger.ts`, `BUFFER_MAX = 500`, resets on app
   restart, exported via Settings → Debug → "Share log"). It is precious
   and slow; do not spend it on questions curl can answer in 5 seconds.

Cautionary tale: `2d148f3` had to skip the *image* smoke test because Gemini
removed image generation from the free tier — meaning that test 429'd with
`limit: 0` regardless of app or key health. Until that was understood, an
"outside-the-app repro" that accidentally used the image endpoint produced a
false signal about text-model connectivity. Reproducing outside the app only
works if the outside repro exercises **the same call** the app makes.

Exception: failures that only exist inside the app (parse failures, queue
behavior, store state) obviously cannot be reproduced by curl. For those,
the outside-the-app analogue is a jest repro (see
`sous-chef-validation-and-qa` for the mocking idioms).

---

## Recipe 5 — The iteration-trap exit: two failed fixes = stop, declare, re-derive

Root `CLAUDE.md` mandates this and it is not optional: if an approach has
been attempted **2 or more times** and each attempt broke something, needed
a patch-on-a-patch, or failed to produce the outcome — stop. Do not attempt
a third fix in the same direction. Declare the trap explicitly (the phrase
"rabbit hole" in the response, using the format in `CLAUDE.md`), then
re-derive from evidence: usually that means going back to Recipe 2 and
asking "what probe discriminates between 'my approach is slightly wrong' and
'my approach cannot work'?"

### Worked example: the debug-unlock gesture

Goal: let the owner unlock the debug panel (log export) in a compiled build.

| Attempt | Commit | What happened |
|---|---|---|
| 1 | `4f66ea3` — 5-second long-press on the bot avatar | Did not work reliably on device |
| 2 | `884498f` — add haptic feedback the moment the gesture lands | A patch to make attempt 1 perceivable; the gesture itself still failed |
| 3 (direction change) | `7817213` — **abandon long-press entirely**; 6 consecutive taps, each within 1s of the previous, haptic on the 6th | Works; shipped |

Attempt 2 is the tell: it patched the *feedback* of a mechanism that was
itself the problem. After two failures the correct move was not "tune the
long-press duration" (a third same-direction fix) — it was to question the
mechanism (long-press gesture recognition on that pressable) and swap it
for one with trivially observable state (a tap counter). That is what
"re-derive" means: the replacement approach should be one whose failure
modes you can actually see.

### The other iteration trap in this repo's history

The model-switching sequence `8bc7dc4` → `ecebc53` is the same pattern at
investigation scale. `8bc7dc4` switched the default model to
`gemini-2.0-flash` on plausible reasoning (its body: the previous default
was "a new thinking model under heavy demand, causing constant 503/429") —
but *without a discriminating probe of the destination model*. It landed on
a model with zero free-tier allocation, which manufactured the next several
debugging sessions. A model/provider switch is a fix attempt like any
other: it counts toward the two-strike limit, and it requires a probe of
the target before it ships (run the matrix script first).

---

## Recipe 6 — The idea lifecycle: hunch → probe → root-cause note → fix → archaeology → validated build

Every accepted fix in this repo travels this pipeline. Skipping a stage is
how wrong fixes ship and how right fixes get re-litigated later.

| Stage | What it is | Gate to pass |
|---|---|---|
| 1. Hunch | "Maybe it's X" | Allowed to exist for free; NOT allowed to justify an edit |
| 2. Prediction table | Recipe 2 | Each live hypothesis has a distinct predicted observable |
| 3. Discriminating probe | Recipe 3/4 | Raw output recorded; one mechanism survives Recipe 1's bar |
| 4. Root-cause note in the commit body | See exemplar below | A stranger can reconstruct the evidence from the body alone |
| 5. Fix | Smallest change that removes the mechanism | One file, one layer, per `CLAUDE.md`/`sous-chef-change-control` |
| 6. Archaeology entry | Extend `sous-chef-failure-archaeology` | Symptom, wrong turns, evidence, fix SHA all present |
| 7. (Behavior-changing only) Build + device validation | Owner-consented EAS build; owner tests on device | **NEVER trigger a build — including any push to dev — without explicit owner confirmation.** See `sous-chef-build-run-release` |

### The exemplar root-cause commit body (`ecebc53`, quoted verbatim)

```
fix(llm): switch default Gemini model to gemini-2.5-flash

gemini-2.0-flash has been quota-zeroed on the free tier — confirmed via
curl against a fresh API key: every quota metric returns limit: 0 for
this model specifically, while gemini-2.5-flash, gemini-2.5-flash-lite,
and other current-gen models respond normally with quota available.
This was the actual cause of the persistent 429s traced across several
prior debugging sessions, not background call volume or key/project
issues.
```

Why this body is the standard: it names the mechanism ("quota-zeroed"),
the evidence method ("curl against a fresh API key"), the discriminating
observation ("limit: 0 for this model specifically, while [others] respond
normally"), AND it explicitly buries the disproven theories ("not background
call volume or key/project issues") so no future session resurrects them.
Compare `8bc7dc4`'s body, which asserts a cause with no evidence method —
plausible prose, wrong outcome. Retrieve either any time with
`git show -s --format='%B' <sha>`.

### Current worked-in-progress example: the adaptation parse failure

The open bug ("The adaptation came back in an unexpected format",
intermittent, 3x on 2026-07-02 adapting an already-adapted variant) is
currently at **stage 3** of this pipeline, and should be treated that way:

- Hunches on record, all UNCONFIRMED: response truncation (no
  `maxOutputTokens` set), variant-recipe id formatting in
  `buildAdaptationPrompt` (`src/prompts/recipeAdaptation.ts`), model JSON
  drift.
- The probe instrumentation shipped in `4c8f7e0`:
  `parseAdaptationResponse` in `src/controllers/useAdaptationController.ts`
  now logs `failureReason` (`no_json_found` | `json_parse_error` |
  `schema_validation_failed`), `failureDetail`, and a 500-char
  `responseSnippet` through the ring-buffer logger.
- The prediction table already exists implicitly — write it explicitly when
  the field log arrives: truncation predicts `json_parse_error` with an
  unterminated-input message and a snippet that starts with valid JSON;
  prompt/id formatting predicts `schema_validation_failed` with specific
  zod issues; wholesale JSON drift predicts `no_json_found`.
- Do NOT ship a fix (e.g., Gemini `responseSchema`/`responseMimeType` JSON
  mode, which is currently not used) before the log discriminates. That
  would be `8bc7dc4` again.

---

## Recipe 7 — Where good root causes have actually come from here

Ranked by historical yield in this repo:

| Source | Incidents it cracked | How to use it |
|---|---|---|
| **Raw error bodies** (curl, never the app's truncated message) | The `limit: 0` discovery (`ecebc53`); image-tier removal (`2d148f3`) | `bash .claude/skills/sous-chef-diagnostics-and-tooling/scripts/gemini-probe.sh` |
| **Git archaeology** (when did behavior change, what did the body claim) | Reconstructing the model-switch chain; `fe95299` (tests silently broken since jest lacked `__DEV__`) | `git log --format='%h %ad %s' --date=short -- <path>`, then `git show -s --format='%B' <sha>` |
| **Changing exactly one variable** | Fresh-key rung and model-matrix rung of the ladder | Recipe 3 |
| Reading more code | Approximately nothing, alone | Code reading generates hypotheses (stage 1); it never closes them |

That last row is the point: in every solved incident above, the closing
evidence came from an *experiment* or from *history*, not from staring at
the source until a theory felt right.

## Anti-patterns (fenced off by name)

| Anti-pattern | Why it is fenced | The scar |
|---|---|---|
| Fixing the symptom at the wrong layer | The mechanism survives and resurfaces wearing a new symptom | Queue/priority/feedback work (`3ffc057`, `7749304`, `49e9f14`) was all good engineering that could not fix a quota-zeroed model |
| Stacking retries | Retrying a permanent failure burns quota and delays the real error; retrying 429 specifically tripled quota burn | `e04e5b7` added 429 retries; `377e3a4` had to remove them ("Retrying with short delays wastes quota without recovering"). Today `google.ts` retries ONLY 503/abort/network; `LLMService` retries 429 only for user-priority, 20s apart, max 2 — do not add more layers |
| Switching models/providers before discriminating the failure | You may switch *onto* the actual problem | `8bc7dc4` switched onto the quota-zeroed model. Also: the Anthropic adapter (`anthropic.ts`) exists but the account is unfunded — a provider switch is not a free move even when the code is ready |
| "Consistent with my theory" reasoning | Consistency is cheap; discrimination is the product | The quota-burn theory stayed "consistent with" everything except the fresh-key negative across several debugging sessions |
| Debugging the compiled build with dev-mode assumptions | `__DEV__` is false in ALL EAS builds; env keys and overrides vanish | The reason `google.ts` key resolution and the ring-buffer logger exist in their current shape |

---

## When NOT to use this

- You have a **symptom and no theory yet** and need triage ("which of
  400/403/429/503 is this, what do I check first") → load
  `sous-chef-debugging-playbook`.
- You need the **actual probe commands, scripts, smoke tests, or log-format
  reference** → load `sous-chef-diagnostics-and-tooling`.
- You suspect **this exact failure happened before** and want its
  conclusion → load `sous-chef-failure-archaeology` (never re-fight a
  settled battle).
- You are past investigation and now **making the edit** (plan format, one
  file/one layer, commit/push rules) → load `sous-chef-change-control`.
- You are deciding what counts as **verification of the fix** (tsc, jest,
  smoke, device) → load `sous-chef-validation-and-qa`.
- Anything touching **builds, EAS, pushing to dev** → load
  `sous-chef-build-run-release` and obey the consent rule.

## Provenance and maintenance

Facts verified against the repo on 2026-07-02. Re-verify before relying on
any volatile claim:

| Claim | Re-verification command |
|---|---|
| `ecebc53` body text quoted above | `git show -s --format='%B' ecebc53` |
| `8bc7dc4` rationale / `377e3a4` retry removal / `e04e5b7` original retries | `git show -s --format='%B' 8bc7dc4 377e3a4 e04e5b7` |
| Debug-unlock sequence (long-press → haptic → 6-tap) | `git show -s --format='%h %s' 4f66ea3 884498f 7817213` |
| `google.ts` retries only 503/abort/network, 45s timeout, `DEFAULT_MODEL = "gemini-2.5-flash"` | `grep -n 'DEFAULT_MODEL\|SEND_TIMEOUT_MS\|isRetryable' src/models/api/llm/google.ts` |
| `LLMService` 429 retry: user-priority only, 20s, max 2 | `grep -n 'RATE_LIMIT_RETRY_DELAY_MS\|MAX_USER_RATE_LIMIT_RETRIES' src/services/LLMService.ts` |
| Parse-failure logging fields (`failureReason`, `responseSnippet`) | `grep -n 'failureReason\|responseSnippet' src/controllers/useAdaptationController.ts` |
| Ring buffer size 500 | `grep -n 'BUFFER_MAX' src/utils/logger.ts` |
| Smoke test invocation | `head -10 src/models/api/llm/google.smoke.test.ts` |
| Active provider is Gemini | `grep -n 'activeProvider' src/models/api/llmApi.ts` |
| Probe scripts exist | `ls .claude/skills/sous-chef-diagnostics-and-tooling/scripts/` |
| Adaptation bug still open / JSON mode still unused | `grep -rn 'responseSchema\|responseMimeType' src/models/api/llm/google.ts` (no hits = still unused) |

If the adaptation parse bug gets closed, move its worked example from
Recipe 6 into `sous-chef-failure-archaeology` and replace it here with the
next open investigation.
