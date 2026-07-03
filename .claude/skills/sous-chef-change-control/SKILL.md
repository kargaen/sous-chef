---
name: sous-chef-change-control
description: >
  Change control and working discipline for the Sous Chef repo. Load this BEFORE
  making ANY code edit, planning a feature, starting a refactor, committing, pushing,
  or touching git branches. Also load when: a request seems to need multiple files or
  multiple MVC layers; a fix has already failed once or twice (iteration trap); you are
  unsure whether an assumption is safe; you found a conflict between ARCHITECTURE.md and
  the code (doc drift); you are considering a dependency install; anything involves
  "push to dev", "build", "release", "EAS", "APK", or "RC". Keywords: plan format,
  one file rule, one layer rule, rabbit hole, stop conditions, refactor pass,
  branch model, build consent, non-negotiables, doc drift.
---

# Sous Chef — Change Control & Working Discipline

Operational runbook for how changes are made in this repository. It distills the
root `CLAUDE.md` (the canonical source — if this file and `CLAUDE.md` ever disagree,
`CLAUDE.md` wins) and adds the project non-negotiables, the doc-drift doctrine, and
the branch/build model with the incidents behind them.

The core stance, verbatim from `CLAUDE.md`:

> A partial, safe implementation is better than a broad implementation with unpredictable consequences.

## When NOT to use this

This skill covers HOW to work, not WHAT the code does. For subject-matter detail,
prefer the sibling skill in `.claude/skills/` that covers the topic (run
`ls /home/user/sous-chef/.claude/skills/` to see what exists in your session):

| Your task | Use instead |
| --- | --- |
| Understanding the LLM provider stack, Gemini errors, model quotas, smoke tests | The sibling LLM/provider skill |
| Understanding app architecture, layer contents, storage schema | The sibling architecture/codebase skill (and `ARCHITECTURE.md` rules) |
| Running CI, cutting an RC, understanding EAS quota mechanics | The sibling CI/release skill |
| Debugging the open adaptation parse-failure bug | The sibling debugging/incident skill |

Even when using a sibling skill, the discipline in THIS file (one file, one layer,
plan first, build consent) still applies to any edit you make.

---

## 1. Change classification — do this before touching anything

Answer these four questions before any edit. If you cannot answer one, stop and ask
(see Assumption policy, section 7).

### 1a. Which layer is this change in?

The app is layered MVC. Import direction is strictly one-way down; a violation is a bug.

| Layer | Where | Typical files |
| --- | --- | --- |
| View | `src/views/` | Screens, components, `.styles.ts`, `.hooks.ts` |
| Controller | `src/controllers/` | `useXxxController` hooks |
| Store | `src/store/` | Zustand stores (14). Written by controllers, read by views |
| Service / Infrastructure | `src/services/` | `LLMService`, `StorageService`, etc. |
| Repository | `src/repositories/` | Data access over `StorageService` |
| Model | `src/models/` | `types/`, `schemas/`, `api/` (providers live in `src/models/api/llm/`) |
| Prompts | `src/prompts/` | 22 pure builder functions `(context) => string` |
| Navigation / Composition | `app/` | expo-router v6 routes; one-line re-exports of `src/views/screens/*` |
| Tests | `__tests__` / `*.test.ts` | Jest |

### 1b. Which single file?

Identify exactly one file. If the request names a file, that is the file. If not,
pick the smallest safe layer to begin with (typical order: model contract → service →
controller → view → composition → tests), state that choice in your plan, and say why.

### 1c. Is it single-file-safe?

A change is single-file-safe if the app still typechecks and behaves correctly with
ONLY that file changed. Check with:

```bash
npx tsc --noEmit -p /home/user/sous-chef
npm test           # or: npx jest <pattern>
```

If it is NOT single-file-safe, you have two legitimate paths:

- **Normal work**: do only the safest first file, stop, and name the next file that
  should change. Do not "complete the feature" across files.
- **Explicit refactor pass** (user declared it): make the full clean change in the
  target file and list broken dependants in a Side note — see section 9.

### 1d. Does it touch anything on the non-negotiables list?

Scan section 11. Especially: does anything in this task push to `dev`? That triggers
a build. That requires owner consent FIRST.

---

## 2. Plan format

Before editing, provide a short plan: ~80% what, ~20% why. 2–3 paragraphs max.
Example shape (from `CLAUDE.md`):

```md
Plan:

- Update only `src/features/profile/controllers/useProfileController.ts`.
- Keep the change inside the controller layer.
- Add handling for the empty profile state.
- Avoid touching views, services, models, navigation, or tests.
- Reason: keeps the behavior isolated and reduces side effects.
```

(Path is illustrative from the root doc; real controllers live in `src/controllers/`.)

If the task benefits from breakdown, split into at most 5 parts — all within the same
file and layer — and track with the exact checkbox format `[x] Task 1 / [ ] Task 2`,
updating it as you go, top to bottom.

---

## 3. One file, one layer — the rule and why it exists

**Rule**: modify exactly one file per prompt run, in exactly one MVC layer, unless the
user explicitly authorizes a multi-file or cross-layer change.

**Why**: the owner is a solo product developer iterating in short passes. Small diffs
are reviewable in minutes, revertable with one `git revert`, and cannot silently break
a distant layer. Every incident in this repo's log traces back to either an external
surprise (quota, free-tier change) or a change whose blast radius was bigger than its
review. The discipline exists to keep blast radius equal to review effort.

The cross-layer guard, verbatim:

| If the user asks for… | Do not touch…         |
| --------------------- | --------------------- |
| A controller task     | Views or models       |
| A view task           | Models or controllers |
| A model task          | Views or controllers  |
| Service work          | Screen composition    |

It is better to explain why a requested feature in a requested file is the wrong place
for the logic than to comply into a broken architecture.

---

## 4. Rabbit hole protocol (verbatim-faithful)

If a request appears to violate the architecture, require a nasty workaround, introduce
avoidable technical debt, or go far outside best practices — **stop before editing**
and use the phrase **rabbit hole** explicitly, in this format:

```md
Rabbit hole:
[What part of the request is problematic]

Why this is risky:
[Why it is dangerous]

Underlying product goal:
[The simpler goal that seems to be underneath]

Safest next step:
[The smaller, safer action to take instead]
```

Do not continue with implementation until the risky direction has been narrowed or
corrected. Triggers include: cross-layer changes not explicitly requested, MVC-breaking
shortcuts, hidden global state, duplicating state across layers, broad rewrites for
narrow product issues, solving UX problems with architecture changes (or vice versa),
work that makes testing harder, scope expansion before the current slice works, and
"just make it work" requests that would damage maintainability.

For an architecture conflict specifically, the variant format is:

```md
Rabbit hole:
...

Why this conflicts with the architecture:
...

Safer alternative:
...
```

Then wait for a narrower instruction, or complete only the safe portion.

---

## 5. Iteration trap protocol (verbatim-faithful)

If an approach has been attempted **2 or more times** and each attempt either broke
something previously working, required a patch to fix the patch, or failed to produce
the intended outcome — **stop immediately. Do not attempt a third fix in the same
direction.** Declare it using the phrase **rabbit hole**:

```md
Rabbit hole (iteration trap):
[What we have tried and how many times]

Why we are stuck:
[The root reason the approach keeps failing — framework limitation, wrong abstraction, incorrect assumption, etc.]

What continuing would cost:
[The likely damage of one more patch attempt]

Recommended exit:
[A fundamentally different approach, a rollback target, or an explicit decision to defer this to a different tool/layer/person]
```

Do not: attempt "just one more tweak" after two failures; silently try a variation
without flagging it; blame framework quirks without questioning the approach itself.

**This rule has paid for itself in this repo.** Two documented cases:

- Debug-screen unlock: a long-press approach failed twice; the exit was a different
  mechanism entirely (6-tap unlock, commit `7817213`).
- LLM 429 storm on 2026-07-02: the first "fix" swapped the default model to
  `gemini-2.0-flash` (commit `8bc7dc4`) — wrong, because that model's free-tier quota
  was zero (`429` with `"limit: 0"`), so no retry or swap-adjacent tweak could ever
  work. The exit was stepping outside the app: a raw `curl` matrix probe across models,
  which identified `gemini-2.5-flash` as the working model (commit `ecebc53`).
  Lesson: when stuck, get ground truth from outside the failing loop.

---

## 6. Stop conditions

Stop instead of continuing when ANY of these are true:

- The task requires several files but the user did not explicitly allow it
- The task crosses MVC layers without explicit permission
- A breakdown would need multiple files/layers to keep the code working
- The request conflicts with the architecture rules
- The implementation depends on unconfirmed assumptions
- Context is insufficient, or shows signs of context rot (requested file no longer
  matches described behavior; path depends on uninspected files; you would be guessing
  architecture decisions)
- The change is likely to cause side effects outside the current layer
- The correct implementation path is unclear
- The feature is becoming a rewrite rather than an iteration
- The request would require brittle hacks or avoidable technical debt
- The request solves a product problem with an architectural workaround

When stopping, report: (1) what was completed, (2) why you stopped, (3) the next
safest step. Do not compensate for uncertainty by editing more files.

---

## 7. Assumption policy

Do not make assumptions. Stopping to ask is always preferred over proceeding on a
guess. A partial result with no side effects beats a completed run built on a wrong
assumption. This is expected to happen often — it is not a failure.

When stopping, do not apologize or alarm. Simply: (1) state what was completed, if
anything; (2) state the assumption you are unwilling to make; (3) ask the minimum
questions needed to continue. If the assumption would require a hack, use the rabbit
hole protocol instead.

---

## 8. Refactor rules

Do not refactor unless explicitly asked. A refactor must be scoped to one file (unless
approved), related to the requested task, behavior-preserving, and explained before
editing. Never combine feature work and refactoring in one pass. If a refactor is a
prerequisite for the feature, stop and report it as the next safest step.

---

## 9. Refactor pass policy (explicit layer-by-layer refactors)

When the user declares an explicit refactor pass, the rules invert on one axis:
**the app is allowed to be broken between layer passes.** That is the user's
responsibility, not yours.

You MUST: make the full clean change in the target file; state in a Side note which
other files will break as a result.

You MUST NOT: leave old exports/signatures "just in case"; keep compatibility shims or
deprecated duplicates; soften the refactor to preserve build stability; refuse because
dependants will temporarily break.

Side note format:

```md
Side note:

- This change breaks the following dependants that must be updated in a later pass:
  - `src/controllers/useProfileController.ts` — imports the old `getUserProfile` signature
  - `src/views/screens/ProfileScreen.tsx` — uses the removed prop `isLoading`
```

---

## 10. Response shape

Standard response after work (omit empty sections; `Action needed from you` — for
anything only the owner can do: env vars, external dashboards, device testing, and
notably BUILD CONSENT — must always be the FINAL section when present):

```md
Changed:
- ...

Not changed:
- ...

Checks:
- ...

Findings for later:
- ...

Side note:
- ...

Test suggestion:
- What to test: ...
- Benefit: ...
- Current gap: ...

Next safest step:
- ...

Action needed from you:
- ...
```

Notes on specific sections:

- **Findings for later**: record useful discoveries unrelated to the requested change;
  never act on them unprompted.
- **Test suggestion**: only when concrete (what/benefit/current gap), and only because
  this repo has a Jest suite (12 test files; large gaps: all 14 stores, all utils,
  14/16 services, 18/20 controllers, 13/15 repos untested — plenty of candidates).
- **Suggestions for improvement**: after a clean completion, at most 1–3 short bullets,
  within the same layer.
- If the user missed a still-necessary instruction from a previous message, reiterate
  it in ALL CAPS.

---

## 11. Project non-negotiables

| Rule | Why | Incident behind it |
| --- | --- | --- |
| **NEVER trigger an EAS build without explicit owner confirmation — and every push to `dev` IS a build trigger** (`.github/workflows/rc-android.yml` fires on `push: branches: [dev]`) | EAS free tier is 15 Android builds/month, resets on the 1st. Builds are a scarce shared resource; burning them blocks all releases until reset | 2026-07-02: stacked pushes to `dev` queued 4 concurrent EAS builds and burned monthly quota. A prior month's quota was fully exhausted, blocking all builds for days. CI mitigation exists (GH concurrency + explicit `Cancel stale RC builds` step, commit `db46ed0`) but mitigation is not consent — ask first, every time |
| **Agent never installs dependencies** | Package CLIs/flags go stale and vary by environment; installs are side effects outside the requested diff. If a dependency seems necessary: stop, explain why existing code can't solve it, what would be added, its risk, and the no-dependency alternative. Link official install docs; the user installs; you verify afterwards | Standing rule from root `CLAUDE.md` (no single triggering incident; treat as policy) |
| **No secrets in the repo — ever** | Solo repo with public release artifacts; a leaked key means rotation plus a poisoned git history. API keys live in device settings (AsyncStorage `app_settings.geminiApiKey`) or `EXPO_PUBLIC_*` env vars (dev-only), never in committed files | Standard practice, canonized by owner (no known leak incident — keep it that way) |
| **Views contain zero developer-facing text** | Any string rendered in a view IS product text the end user will see. No placeholder labels, status notes like "local preview for now", or annotations rendered as UI. Commentary goes in a todo comment, not the view. No exceptions | Standing rule from root `CLAUDE.md` — "A view with developer notes in it is not a testable view" |

Priority order when rules collide (from `CLAUDE.md`): (1) preserve working behavior,
(2) follow the architecture doc's rules, (3) satisfy the exact request, (4) small diff,
(5) one file, (6) one layer, (7) stop early if unclear. Never prioritize appearing
productive over keeping the codebase stable.

---

## 12. Doc-drift doctrine

Owner-decided 2026-07-02: **when `ARCHITECTURE.md` and the code conflict, CODE WINS.**

- Document and act on verified code reality, not the doc's claims.
- Flag every drift item you encounter explicitly — do not silently work around it.
- Do NOT edit `ARCHITECTURE.md` yourself. Route proposed updates to the owner
  (an "Action needed from you" item or a Findings-for-later note).
- `ARCHITECTURE.md`'s RULES (layering, import direction, naming, component
  conventions, `.styles.ts`/`.hooks.ts` restrictions) remain accurate and enforced —
  the drift is in its DESCRIPTIONS of what exists.

Known drift as of 2026-07-02:

| ARCHITECTURE.md says | Code reality |
| --- | --- |
| Anthropic API is the LLM provider (header line 3; also lines ~62, ~145, ~248; note line ~43 was partially updated to say Gemini) | Active provider is Gemini: `const activeProvider: LLMProvider = googleProvider;` at `src/models/api/llmApi.ts:25`. A complete `claudeProvider` exists in `src/models/api/llm/anthropic.ts` but is not wired in; `src/models/api/llm/openai.ts` is a stale orphan |
| Supabase remote sync (line ~42) | No Supabase code exists anywhere in `src/` |
| `src/constants/config.ts` holds API URLs / LLM model string (line ~322) | File does not exist (`src/constants/` has only colors/cookingUnits/index/radius/spacing/typography). The model string lives in `src/models/api/llm/google.ts` (`DEFAULT_MODEL = "gemini-2.5-flash"`) |
| ~6 prompt files listed | 22 prompt builders in `src/prompts/` (25 `.ts` files minus 2 tests minus the `index.ts` barrel) |
| — (related): `package.json` has a `reset-project` script pointing at `./scripts/reset-project.js` | `scripts/` directory does not exist; the script is dead |

One meta-drift: root `CLAUDE.md` refers to the doc as `architecture.md` (lowercase);
the actual file is `/home/user/sous-chef/ARCHITECTURE.md`. Same document.

---

## 13. Branch model

```
feature work ──► dev ──(push = RC BUILD, OWNER CONSENT REQUIRED FIRST)──► master (release-only)
```

| Branch | Role | Push consequence |
| --- | --- | --- |
| `dev` | Where all work lands. Version `1.0.1-rc.5` | **Every push triggers `rc-android.yml`**: EAS `preview`-profile APK, published by overwriting the fixed GitHub prerelease tag `v{base}-rc` (e.g. `v1.0.1-rc`). This consumes EAS build quota → **owner consent required BEFORE any push** |
| `master` | Release-only. Currently **73 commits behind `dev`** (verified 2026-07-02) | Triggers `release-android.yml` (also on `v*` tags and `workflow_dispatch`) — currently dormant. Never push here as part of routine work |

Practical rules:

1. Commit locally as much as you like; **pushing** is the consent boundary.
2. Batch commits into ONE consented push — stacked pushes are exactly what caused the
   2026-07-02 quota burn. The CI cancel-stale step reduces waste but canceled EAS
   builds still count if processing started.
3. EAS quota facts: 15 Android + 15 iOS builds/month (free tier), resets on the 1st of
   the calendar month; builds failing within 3 minutes don't count.
4. Never merge or push `dev` → `master` without an explicit release instruction from
   the owner.

---

## Provenance and maintenance

Written 2026-07-02 against `dev` at commit `4c8f7e0`. Everything below is volatile —
re-verify before relying on it:

| Fact | Re-verify with |
| --- | --- |
| Root discipline doc (canonical source of sections 2–10) | `cat /home/user/sous-chef/CLAUDE.md` |
| Active LLM provider line | `grep -n activeProvider /home/user/sous-chef/src/models/api/llmApi.ts` |
| Default model string | `grep -n DEFAULT_MODEL /home/user/sous-chef/src/models/api/llm/google.ts` |
| RC workflow trigger + cancel-stale step | `grep -n -A3 'on:' /home/user/sous-chef/.github/workflows/rc-android.yml` and `grep -n 'Cancel stale' /home/user/sous-chef/.github/workflows/rc-android.yml` |
| Release workflow trigger | `grep -n -A5 'on:' /home/user/sous-chef/.github/workflows/release-android.yml` |
| master-behind-dev count (was 73) | `git -C /home/user/sous-chef rev-list --count master..dev` |
| Package version (was 1.0.1-rc.5) | `grep '"version"' /home/user/sous-chef/package.json` |
| Prompt builder count (was 22; command prints 23 = builders + `index.ts` barrel) | `ls /home/user/sous-chef/src/prompts/*.ts \| grep -v test \| wc -l` |
| `src/constants/config.ts` still absent | `ls /home/user/sous-chef/src/constants/` |
| `scripts/reset-project.js` still absent | `ls /home/user/sous-chef/scripts/ 2>&1` |
| ARCHITECTURE.md drift lines (Anthropic/Supabase/config.ts) | `grep -n -i 'anthropic\|supabase\|config.ts' /home/user/sous-chef/ARCHITECTURE.md` |
| Test-coverage gap counts | `ls /home/user/sous-chef/src/**/__tests__ 2>/dev/null; npx jest --listTests` |
| Typecheck / test commands still valid | `npx tsc --noEmit -p /home/user/sous-chef && npm test` |
| EAS free-tier limits (15/mo, reset on 1st, <3min failures free) | Expo pricing docs — external, not verifiable from repo; confirm at expo.dev/pricing |
