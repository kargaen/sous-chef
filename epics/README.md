# Epics

Planned work lives here as `EPIC-<NNN>-<slug>.md` files. See `epic-formulation`.

**Backend:** `files` (per `epic-store`; `git config epics.backend` unset = files).
A GitHub Issues + Projects v2 migration was proposed (`MIGRATE_EPICS_TO_GITHUB.md`)
and deliberately held: this environment has no `gh` CLI, which `epic-store` itself
requires before allowing the `github` backend. When revisited with `gh` available:
`kargaen` is a personal account, not an org — owner's decision is a **user-owned**
Projects v2 board, not an org-level one.
