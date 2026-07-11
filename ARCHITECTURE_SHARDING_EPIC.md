# Architecture Sharding & Agent-Governance Epic

## Why

The project is about to receive a new, generic `AGENTS.md`/skill-set (18 personal
skills — epics, work orders, `rabbit-hole-check`, `architecture-md-maintenance`,
etc. — installed to `~/.claude/skills/`) that will fully replace the current
`CLAUDE.md`. Per the owner's direction, the currently-uploaded `AGENTS.md` is
simply renamed to `CLAUDE.md` — not merged, not imported. Everything the current
`CLAUDE.md` says will stop applying the moment that happens.

At the same time, `ARCHITECTURE.md` (739 lines, one file) is meant to move to a
sharded `architecture/` directory (`constitution/` + `description/`), per the new
skill set's `architecture-shard` skill.

Doing both at once, mid-way through the Supabase backup/restore work (PR #4), is
exactly the kind of overlapping structural change that makes a project feel
fragile. This epic exists so nothing real gets silently dropped when `CLAUDE.md`
is replaced, and so the sharding starts from an honest inventory instead of the
new skill pack's assumed document shape — which this repo's `ARCHITECTURE.md`
does not currently have (verified below).

**Sequencing (owner's call):** this epic's work starts only after PR #4 settles.
This document is prep, written now so the decision isn't made under time pressure
later.

---

## Part 1 — What's genuinely project-specific in the current CLAUDE.md

Most of the current `CLAUDE.md` (620 lines) is generic workflow guidance dressed
in Sous-Chef-flavoured examples (`useProfileController`, `ProfileScreen.tsx` —
neither is a real file in this repo). The new `AGENTS.md` replaces that guidance
directly; nothing needs rescuing there. The items below are the exceptions —
either a real project fact, a real inconsistency, or a real preference that isn't
generic and would otherwise vanish.

### 1a. Two slightly different layer models exist today

- `CLAUDE.md`'s "Work on One MVC Layer at a Time" names: **Model, View,
  Controller, Service/Infrastructure, Navigation/Composition, Tests**.
- `ARCHITECTURE.md`'s Dependency Rule (the one actually in force all session)
  names a more precise five-layer stack with **Repositories as their own layer**
  between Services and Controllers: `View → Controllers → Repositories →
  Services + Prompts → Models`.

`ARCHITECTURE.md`'s version is the one that's actually been followed (e.g.
`SupabaseService`/`SnapshotService`/`BackupService` all sit at the Services
layer, called by Repositories or Controllers per that diagram). `CLAUDE.md`'s
coarser version is stale/redundant, not a second source of truth. **Decision
needed during sharding:** confirm `ARCHITECTURE.md`'s dependency diagram is the
sole layer model going forward; nothing from `CLAUDE.md`'s version needs to
survive.

### 1b. External services list is inaccurate and should be corrected, not carried forward

`CLAUDE.md`'s "User-Required Action Rule" lists example external services
including **Firebase** and **Stripe** — neither appears anywhere in this
codebase (no imports, no env vars, no config). The actual verified external
services as of this session are:

- **Expo / EAS** — build, OTA, `eas.json` profiles
- **Google Gemini** — primary LLM (`EXPO_PUBLIC_GEMINI_API_KEY`,
  `src/models/api/llm/google.ts`)
- **Anthropic** — present in `src/models/api/llm/anthropic.ts`
  (`EXPO_PUBLIC_ANTHROPIC_API_KEY`) — role vs. Gemini not documented anywhere;
  worth clarifying when this list is rewritten
- **Supabase** — new, added this session (`SupabaseService.ts`, auth +
  snapshot backup/restore)

**Decision needed:** when this list is rewritten as a Description-class fact
(likely a new `tech-stack`/`external-services` section), use this verified list,
not the old one.

### 1c. The "product-development alignment" preference is real and worth a home

`CLAUDE.md`'s "Product-Development Alignment" and "MVC Iteration Strategy"
sections describe how the owner actually wants to work: quick visible slices,
layer-by-layer passes, MVP-first, no speculative extensibility. This isn't
generic boilerplate — it's a real, standing preference that shaped how the
entire Supabase epic was executed this session (one file per turn, stop and
confirm at each layer, repository gaps fixed narrowly rather than
speculatively).

**Decision needed:** the new skill pack's target layout names a
`constitution/20-agent-working-rules.md` slot — this is the natural destination.
Confirm during Phase 2 classification.

### 1d. Everything else in the current CLAUDE.md is superseded, not lost

The remaining sections (one-file-at-a-time, stop conditions, assumption policy,
rabbit-hole formats, refactor rules, dependency rules, communication style, view
cleanliness, safety priority) all have a direct, working equivalent in the new
skill pack (`planning-and-breakdown`, `rabbit-hole-check`, `refactor-guard`,
`dependency-change`, and `AGENTS.md`'s own Safety Priority list, which is nearly
identical ordering already). No migration action needed beyond the rename
already decided.

---

## Part 2 — Why `ARCHITECTURE.md` needs a from-scratch classification, not the pack's assumed one

The new skill pack's Phase 2/Phase 4 instructions assume `ARCHITECTURE.md` already
has numbered `§` sections, a `North Star` section, a `Write Policy` header, and a
`§24 Deferred Decisions` section. Verified directly against this repo's actual
739-line file:

```
$ grep -n "Write Policy\|North Star\|Deferred Decision\|Section [0-9]" ARCHITECTURE.md
(no matches)
```

None of that scaffolding exists. The real document is organised as: Mission →
Architecture Philosophy → Stack → Data Flow → Full Tree → Upcoming Tab Additions
→ Upcoming Remote Durability Layer → Key Conventions (naming, component folder
structure, item/list pairs, extraction bias, commenting, dependency rule, style
hierarchy, controller/repository/prompt patterns, LLM context window, nudge vs.
chat, Sous Chef Companion, Load Masks, Settings Focus Links) → Testing Philosophy
→ Offline-First Principle.

So Phase 2 of the migration (classify every section as Constitution vs.
Description) has to happen from this actual shape, not the pack's example one,
and section numbers will need to be assigned for the first time rather than
preserved. That's a bigger first step than the pack's instructions imply, and
should be flagged as such when Phase 2 actually runs.

---

## Plan (starts after PR #4 settles)

- [ ] 1. Install the 18-skill pack to `~/.claude/skills/` (personal, not
      project) and verify the three invariants from `INSTALL.md` Phase 1 —
      done when all three checks pass.
- [ ] 2. Rename the uploaded `AGENTS.md` to `CLAUDE.md`, replacing the current
      file wholesale — done when `CLAUDE.md`'s content matches the uploaded
      file exactly.
- [ ] 3. Assign `§` numbers to `ARCHITECTURE.md`'s real sections (see Part 2)
      and propose a Constitution/Description class per section — done when a
      full section list with proposed classes is reported and confirmed.
- [ ] 4. Fold in the decisions from Part 1 (1a–1c) at the appropriate
      classified location, and correct the external-services list per 1b —
      done when each is placed and the owner has confirmed the placement.
- [ ] 5. Shard into `architecture/constitution/` and `architecture/description/`
      per the confirmed classification, verify by reconstruction (concatenated
      shards diff cleanly against the pre-shard file), and write the root index.
- [ ] 6. Run Phase 5's verification scripts
      (`leak_check.py`, `find_skills.py`, `gate.sh audit`) and the
      `architecture-drift-audit` skill against the freshly sharded document.

## Open questions

| # | Question | Blocks |
|---|---|---|
| Q1 | Gemini vs. Anthropic — which is primary, which is fallback/experimental? Neither `CLAUDE.md` nor `ARCHITECTURE.md` says. | Item 4 (external-services correction) |
| Q2 | Does `branch-lifecycle`'s `branch.integration=dev` / `branch.release=master` config match how `dev`/`master` are actually used today, given the existing `rc-android.yml`/`release-android.yml` split discovered this session? | Item 1 (skill config), non-blocking |
