---
name: sous-chef-docs-and-writing
description: >
  Docs and writing conventions for Sous Chef: which document is canonical for what
  (CLAUDE.md, ARCHITECTURE.md, the three epic docs), the copy-pasteable EPIC TEMPLATE
  extracted from the real epics, epic status markers (checkbox tri-state, decision
  markers), commit-message house style with real examples, the comment policy, the
  View Cleanliness rule, and the response shape for reporting work. Load this BEFORE:
  writing or updating ANY .md file in this repo; starting, extending, or retiring an
  epic; writing a commit message; adding code comments; wording any user-visible UI
  text; or answering "which doc is the source of truth", "how do I write an epic",
  "what's the commit style", "how do I mark a task done/deferred", "can I fix
  ARCHITECTURE.md". Keywords: epic, epic doc, epic template, MEAL_PLAN_EPIC,
  COOKING_STATS_EPIC, LANDING_DISCOVER_MERGE_EPIC, docs of record, commit message,
  conventional commits, comment policy, why not what, View Cleanliness, developer
  text in UI, response shape, Changed/Not changed, Action needed from you, doc drift,
  retire an epic, carried over, decisions to confirm.
---

# Sous Chef — Docs & Writing Conventions

You are writing for a solo product developer who works in small, reviewable passes.
Every document in this repo has a defined role and trust level. Every piece of prose —
epic, commit message, comment, UI string, work report — has a house style. This skill
is that style guide.

## 1. The docs of record

All four doc types live at the repo root (there is no `docs/` directory).

| Document | Role | Trust level | Who updates it |
|---|---|---|---|
| `CLAUDE.md` | Agent working discipline: one file/one layer per pass, plan-before-edit, rabbit-hole and iteration-trap rules, assumption policy, response shape. First heading literally reads `# AGENTS.md`. | **Canonical.** Follow it exactly. Never contradict or route around it. | Owner only. |
| `ARCHITECTURE.md` | Layering rules, naming conventions, component conventions, comment policy. | **Rules canonical; facts drifted.** The RULES (dependency direction, naming, placement, commenting) are accurate and enforced. Several FACTS (provider, Supabase, config.ts, prompt count, file tree) are stale — the code wins. Full drift register: `sous-chef-architecture-contract`. | Owner only. Propose fixes; never edit silently. |
| `MEAL_PLAN_EPIC.md`, `COOKING_STATS_EPIC.md`, `LANDING_DISCOVER_MERGE_EPIC.md` | Spec + status artifacts. Each is simultaneously the feature spec, the reuse inventory, the build plan, and the living progress tracker (checkboxes and decision markers get updated as slices ship). | Trust the intent; verify claimed code facts against the code before relying on them. | Agent updates status markers when a slice ships and the owner asks; owner decides scope changes. |
| `.claude/skills/*/SKILL.md` | Verified operational knowledge (this library). | Each skill carries its own provenance date; re-verify volatile facts. | Agent, with owner review. |

Case quirk: `CLAUDE.md` refers to "`architecture.md`" in lowercase; the actual file is
`ARCHITECTURE.md`. Same document — Linux is case-sensitive, so always use the
uppercase name in paths and commands.

### The drift rule (owner-decided doctrine)

When ARCHITECTURE.md and the code disagree, **the code wins**. When you are writing
or updating any doc:

1. **Never restate a drifted fact.** If a doc update would repeat something
   ARCHITECTURE.md gets wrong (e.g. "Anthropic is the LLM provider", "Supabase
   handles sync", "model string lives in `src/constants/config.ts`"), state the
   verified code reality instead and flag the drift explicitly.
2. **Never "fix" ARCHITECTURE.md silently.** Route the correction to the owner as a
   proposal ("Action needed from you: ARCHITECTURE.md §X says …, code does …,
   suggest updating to …"). Same for `package.json`'s dangling
   `reset-project` script (references `./scripts/reset-project.js`, which does not
   exist).
3. **Check the drift register first.** `sous-chef-architecture-contract` lists every
   known drift item so you don't re-discover or re-litigate them.

## 2. The epic template

The three real epics share DNA. Extracted structure, section by section, with which
epic demonstrates it best:

| Section | Purpose | Best live example |
|---|---|---|
| `## Why` / `## Purpose` | 1–4 paragraphs of product narrative: the problem, the product belief, the constraints that hold throughout. | `MEAL_PLAN_EPIC.md` "Why" |
| `## What already exists (reuse-first inventory)` | Bullet list of every model, repo, controller, store, service, screen that already exists and will be reused — with exact symbol names. Written BEFORE designing anything new. | `MEAL_PLAN_EPIC.md` |
| Product-shape sections | Anatomy of the surface (often "top → bottom"), interaction contracts, guardrails. As many as needed. | All three |
| `## Model changes required` | Schema/model growth "owned up front, not discovered". Additive-only where possible. | `MEAL_PLAN_EPIC.md` |
| `## MVC mapping (reuse-first)` | Explicit bullet per layer — Model/Schema, Util, Repository, Service, Controller, View, Navigation/Composition — naming the exact files and functions each layer gains. This is what lets the owner work one layer per pass. | `MEAL_PLAN_EPIC.md`, `LANDING_DISCOVER_MERGE_EPIC.md` |
| `## Build order` (phased, numbered slices) | Numbered, individually shippable slices with epic-scoped IDs: `P1.1`…`P9.2` (Meal Plan phases), `CS.1`…`CS.6` (Cooking Stats themes), `M.1`/`C.1`/`G.1`/`R.1` (Merge epic tracks). Each slice must leave the app shippable. | All three |
| `## Risks / gaps` / `## Flags` | Known hazards, hard gaps ("cannot ship until resolved") vs soft gaps, dependencies to add (link docs — the owner installs, per the dependency rule). | `COOKING_STATS_EPIC.md` "Flags" |
| `## Decisions to confirm` | Open product decisions with status markers (see §3). Recommendations allowed ("recommended") but the owner confirms. | `MEAL_PLAN_EPIC.md` |
| `## Out of scope` / deferred / rejected | What is deliberately NOT in this epic, **with reasons**, so it isn't re-proposed. | `MEAL_PLAN_EPIC.md`, `LANDING_DISCOVER_MERGE_EPIC.md` |
| `## Definition of done` | Concrete, checkable end state, including "tsc clean; existing suites green". | `MEAL_PLAN_EPIC.md` |
| Retirement sections (only when an epic supersedes others) | `## Carried over from …` — still-wanted unshipped threads that survive into the new epic "so nothing is lost" — plus an **"Already resolved — do NOT carry"** list so settled work is never re-done. | `LANDING_DISCOVER_MERGE_EPIC.md` |

### Copy-pasteable skeleton

Create new epics as `<FEATURE>_EPIC.md` at the repo root (SCREAMING_SNAKE, matching
the existing three). Pick a short unique slice prefix that doesn't collide with
`P`, `CS`, `M`, `C`, `G`, `R`.

```markdown
# <Feature> Epic

## Why

<1–4 paragraphs: the product problem, the product belief, and the constraints that
hold throughout. End with the standing rule: reuse first, one MVC layer at a time,
smallest safe slice — the full feature, built incrementally so each phase is
shippable.>

## What already exists (reuse-first inventory)

- **Model** — `<Type>.types.ts` (`<symbols>`) + `<Type>Schema.ts`. <fit/gap note>
- **Repository** — `<X>Repository.<methods>`, backed by <table / AsyncStorage key>.
- **Controller** — `use<X>Controller` already has `<methods>`. <caller status>
- **Store** — `<x>Store` (`<state fields>`).
- **Service** — `<X>Service` <what it does that this epic reuses>.
- **View** — `<Screen/components>` <what renders today>.

## Model changes required

Owned up front, not discovered:

1. **<Change>.** <exact fields, defaults, zod growth; additive where possible.>
2. ...

All growth is additive to stored data; zod + defaults grow, existing rows still parse.

## <Product shape sections — anatomy top → bottom, interaction contracts, guardrails>

## MVC mapping (reuse-first)

- **Model / Schema:** <exact types + schema changes>
- **Util:** <pure functions, tested>
- **Repository:** <methods gained / unchanged>
- **Service:** <prompts, parsers, service functions>
- **Controller:** <hook methods gained>
- **View:** <screens/components gained>
- **Navigation / Composition:** <routes, hydration, tab changes>

## Build order (phased; each slice shippable)

**Phase 1 — <name>**

1. `<PFX>1.1` <smallest safe slice — usually settings or model growth. One layer.>
2. `<PFX>1.2` <next slice>

**Phase 2 — <name>**

3. `<PFX>2.1` ...

## Risks / gaps

- **<Risk>.** <why it bites and the guardrail>

### Hard gaps (a feature cannot ship until resolved)

1. **<Gap>.** <what must be built/decided first>

### Dependencies to add (per dependency rules — link docs, do not auto-install)

- <package> for <slice> (link to official install docs; the user installs, the
  agent verifies after).

## Decisions to confirm

- ⏳ **<Decision>:** <options; recommendation marked "(recommended)"> — awaiting
  confirmation.

## Out of scope (later, not this epic)

- <item> — <reason it is deferred or was rejected>

## Definition of done

- <user-visible outcome bullets>
- `tsc` clean; <new units> tested; existing suites green.
```

When RETIRING one or more epics into a successor, the successor additionally gets:

```markdown
## Carried over from the <old> epic(s)

The source epic(s) are being retired; these still-wanted, unshipped threads survive
here so nothing is lost.

- **<Thread>** (was <old-slice-id>): <what remains to build>.

**Already resolved — do NOT carry:**

- <item> — **done** (`<symbol/evidence>`).
```

## 3. Status markers (exact glyphs in use)

Two marker systems, used in different sections. Do not invent new glyphs.

**Task checkboxes** (build-order / theme task lists — see `COOKING_STATS_EPIC.md`):

| Marker | Meaning | Convention |
|---|---|---|
| `- [ ]` | Not started | Bare task text. |
| `- [x]` | Done | Append the evidence in parentheses: the symbol or file that shipped it, e.g. `(HatRating UI component.)`. |
| `- [~]` | Partially done / done differently | Append what deviated and why, e.g. the CS.4 "Updated <date>" item. |

**Decision markers** (`## Decisions to confirm` — see `MEAL_PLAN_EPIC.md`):

| Marker | Meaning |
|---|---|
| `✅` | Confirmed by the owner — append `— confirmed.` (and the chosen option if there were several). |
| `⏳` | Awaiting owner confirmation — append `— awaiting confirmation.` A recommendation may be marked `(recommended)`. |
| Moved to "Out of scope" with a reason | Rejected. Rejected decisions are not left in the list with a glyph; they move sections so the reason is preserved. |

Update markers in place as slices ship — the epic is the status tracker; there is no
separate progress doc.

## 4. Commit message house style

Style is by convention only — no commitlint/husky in the repo. The convention
(verifiable with `git log`) is conventional-commit-ish:

```
<type>(<scope>): <imperative subject, lowercase, no trailing period>

<body: the ROOT CAUSE and the reasoning, not a diff narration.
Wrapped ~72 cols. Present in every non-trivial commit.>
```

- **Types in use:** `feat`, `fix`, `test`, `ci`, `chore`, `docs`, `refactor`.
- **Scopes in use:** feature or layer names — `llm`, `settings`, `pantry`,
  `meal-plan`, `ci`, `test`, `adaptation`, `debug`, `logging`, `chatbot`,
  `assistant`, `skills`. `ci:` and `chore:` often appear scopeless.
- **The body explains WHY.** The best commits read like one-paragraph postmortems
  with evidence. Early history (pre-discipline) has bare non-conventional subjects —
  do not imitate those.
- **Trailers:** agent-authored commits carry a `Co-Authored-By: Claude … ` trailer
  (exact form varies by tool version; use whatever your current harness instructs).
- **Never commit or push without being asked** — and remember any push to `dev`
  triggers a quota-consuming EAS build unless the path filter exempts it
  (see `sous-chef-build-run-release` for the consent rule).

Real examples from `git log` (subject + body):

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

```
fix(test): define __DEV__ global in jest setup

Jest runs without the jest-expo preset, so __DEV__ was never defined,
silently breaking every test that touches google.ts (dev-only API key
and model-override resolution) before it could reach any assertions.
```

```
fix(ci): cancel stale EAS builds before submitting a new RC build

GitHub Actions' concurrency cancel-in-progress only stops the workflow
run itself — it can't reach an EAS build already submitted to Expo's
servers by an earlier run. Rapid pushes to dev were leaving predecessor
builds queued/running on Expo, burning the monthly free-tier quota.
Explicitly cancel any new/in-queue/in-progress build for this profile
before submitting a new one.
```

Note what all three do: name the mechanism, cite the evidence, and rule out the
wrong explanation. Aim for that.

## 5. Code comment policy (from ARCHITECTURE.md "Commenting Practice" — a rules section, still accurate)

- **Comment `why`, not `what`.** Never restate the next line of code.
- Comment invariants, assumptions, surprising behavior, and cross-layer decisions
  hard to infer locally.
- Prefer self-explanatory names and smaller functions over pervasive commentary; a
  function needing many comments should be refactored instead.
- A small number of high-value comments beats decoration.

## 6. View Cleanliness rule (from CLAUDE.md — no exceptions)

Any text rendered inside a view is **product text** — the user will see it. Never
put developer notes, placeholder labels, status explanations, or "local preview for
now"-style strings in a view. If commentary on a view change is needed, put it in a
`// TODO` code comment, never in the rendered UI. A view with developer notes in it
is not a testable view. This also shapes epic writing: when an epic specifies UI
copy, that copy is final product wording (e.g. "Nothing planned", "Only score what
feels useful"), not a placeholder to be replaced later.

## 7. Response shape when reporting work (from CLAUDE.md)

When reporting completed work in a session, use CLAUDE.md's section skeleton, in
this order, omitting empty sections:

```
Changed:            — exact edits made
Not changed:        — what was deliberately left alone
Checks:             — what was run (tsc, jest, lint) and what was NOT run
Findings for later: — discoveries not acted on (never turned into extra edits)
Side note:          — e.g. dependants a refactor pass will break
Test suggestion:    — What to test / Benefit / Current gap (only if a suite exists — it does: 12 jest files)
Next safest step:   — one small step
Action needed from you: — ALWAYS the final section when present
```

Plans before edits are 2–3 short paragraphs, ~80% what / ~20% why. Task breakdowns
use the `[x]`/`[ ]` checkbox format, max 5 parts. See `CLAUDE.md` for the full
discipline; this skill only fixes the *shapes* so all writing looks consistent.

## 8. Writing checklist (run before saving any doc change)

- [ ] Did I restate any known-drifted fact (provider, Supabase, config.ts, prompt
      count, file tree, reset-project script)? → Fix to code reality + flag, or stop.
- [ ] Is this edit to ARCHITECTURE.md or CLAUDE.md? → Stop; propose to owner instead.
- [ ] New epic? → Skeleton from §2, unique slice prefix, reuse inventory verified
      against the code (grep the symbols — don't trust memory).
- [ ] Marking a task `[x]`? → Append the shipped symbol/file as evidence in parens.
- [ ] Any UI copy in the doc? → Write it as final product text (§6).
- [ ] Commit message? → type(scope) subject + root-cause body (§4). No push to dev
      without owner consent.

## When NOT to use this

| You actually need… | Load instead |
|---|---|
| What ARCHITECTURE.md gets wrong, layer rules, where a file belongs, inventories | `sous-chef-architecture-contract` |
| The working discipline itself (one file/one layer, rabbit hole, stop conditions) while making a code edit | `sous-chef-change-control` |
| Building, releasing, EAS quota, the push-to-dev consent rule mechanics | `sous-chef-build-run-release` |
| Debugging a broken behavior | `sous-chef-debugging-playbook` / `sous-chef-failure-archaeology` |
| LLM layer specifics or prompt engineering content (vs. doc conventions) | `sous-chef-llm-reference` |
| Test/verification strategy | `sous-chef-validation-and-qa` |

This skill covers how to WRITE things down — docs, epics, commits, comments, UI
copy, reports — not how to build, debug, or verify.

## Provenance and maintenance

Verified against the repo on **2026-07-02**. Re-verify volatile facts:

| Fact | Re-verify with |
|---|---|
| Root docs present (3 epics + CLAUDE.md + ARCHITECTURE.md, no docs/ dir) | `ls /home/user/sous-chef/*.md` |
| Epic section structure & slice IDs (P1.1 / CS.1 / M.1) | `grep -n "^#\#\|P1.1\|CS.1\|M.1" MEAL_PLAN_EPIC.md COOKING_STATS_EPIC.md LANDING_DISCOVER_MERGE_EPIC.md` |
| Decision markers ✅/⏳ and `[~]` checkbox in use | `grep -n "✅\|⏳\|\[~\]" *_EPIC.md` |
| "Carried over" / "do NOT carry" retirement pattern | `grep -n "Carried over\|do NOT carry" LANDING_DISCOVER_MERGE_EPIC.md` |
| Commit type/scope distribution | `git log --format='%s' \| sed -E 's/:.*//' \| sort \| uniq -c \| sort -rn` |
| Example commit bodies quoted in §4 | `git show -s --format='%s%n%n%b' ecebc53 fe95299 db46ed0` |
| Comment policy wording | `grep -n -A10 "Commenting Practice" ARCHITECTURE.md` |
| View Cleanliness + response shape + `architecture.md` lowercase quirk | `grep -n "View Cleanliness\|Action needed from you\|architecture.md" CLAUDE.md` |
| No commit tooling (convention only) | `grep -n "commitlint\|husky" package.json` |
| reset-project drift still present | `grep -n reset-project package.json && ls scripts 2>&1` |
| Test suite exists (Test-suggestion section applies) | `ls src/**/__tests__ 2>/dev/null \| head` or `npx jest --listTests` |
