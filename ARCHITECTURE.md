# Sous Chef — Architecture

### Expo · React Native · TypeScript · Zustand · SQLite · Anthropic API · MVC

---

## Mission

The app must feel warm and opinionated, not mechanical. The LLM is a collaborator embedded throughout — not a chatbot bolted on the side. Every architectural decision should serve this mission.

---

## Write Policy

Three content classes, three locations. The class decides who may write.

| Class | Location | Written by |
|---|---|---|
| **Constitution** | `architecture/constitution/` | Humans, by review. Agents cite, never edit. |
| **Description** | `architecture/description/` | `epic-closeout`, after a slice ships. Reactionary only. |
| **Deferred** | `epics/` | Speculative content never lives in this document; it becomes an epic. |

Every Description amendment appends a row to `architecture/10-change-history.md` (append-only).

---

## Index

| § | File | Contains |
|---|---|---|
| 1 | `architecture/constitution/01-architecture-philosophy.md` | The three-layer MVC split, services/prompts placement, nudge philosophy as a code boundary |
| 2 | `architecture/description/02-stack.md` | Tech stack table — framework, routing, state, local DB, remote sync, LLM, validation, testing |
| 3 | `architecture/constitution/03-data-flow.md` | One-directional data flow and the hard import rules between layers |
| 4 | `architecture/description/04-full-tree.md` | Annotated folder tree of the entire repository |
| 5 | — | removed; remaining tab work became `epics/EPIC-001-remaining-tab-additions.md` |
| 6 | — | removed; Phase 1 shipped, background sync became `epics/EPIC-002-supabase-background-sync.md` |
| 7 | `architecture/constitution/07-key-conventions.md` | Naming, component folder structure, item/list pairs, extraction bias, commenting, dependency rule, style hierarchy, controller/repository/prompt patterns, companion/load-mask/focus-link conventions |
| 8 | `architecture/constitution/08-testing-philosophy.md` | What each MVC layer tests and where the mock boundaries sit |
| 9 | `architecture/constitution/09-offline-first-principle.md` | The offline-first rules; local SQLite stays primary, sync never blocks the UI |
| 10 | `architecture/10-change-history.md` | Append-only log of Description amendments |
