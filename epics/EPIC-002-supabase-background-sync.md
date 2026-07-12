# EPIC-002: Supabase Background Sync (Phase 2)

**Status:** draft
**Created:** 2026-07-12
**Architecture baseline:** 6839154 (dev, pre-shard)
**Source:** evicted from `ARCHITECTURE.md` §6 "Upcoming Remote Durability Layer" during the governance-bundle shard. Phase 1 (auth + whole-snapshot backup/restore) shipped in PR #4; its facts belong in Description sections via `epic-closeout`. This epic carries the unshipped Phase 2.

---

## 1. BDD — User Flows

```gherkin
Given a signed-in user editing on two devices
When either device changes pantry, recipes, plans, budget, or profile
Then the change reaches the other device in the background
And neither device's UI ever blocks on sync
```

```gherkin
Given a record deleted on one device
When the other device pulls
Then the record disappears there too
And is never resurrected by a later pull
```

**Out of scope for this epic:**
- Regenerable caches (seasonal/pricing caches, inspirations, habits, waste log)
- Real-time subscriptions, multi-user sharing, merge-conflict UI
- Migrating existing `Date.now()` ids (new ids only)

---

## 4. Checklist (from the owner's locked Phase-2 plan)

```md
[ ] 1. P2.1 UUID adoption via expo-crypto.randomUUID at the ~8 id-mint sites — local-only, unblocks shared tables
[ ] 2. P2.2 Additive per-record updatedAt metadata, stamped on write; optional Zod fields so old rows parse
[ ] 3. P2.3 Soft-delete: delete → deletedAt; every read filters deletedAt IS NULL (six affected repos)
[ ] 4. P2.4 sync_queue table in StorageService + RESET_TABLES; markDirty(table,id) in each repo write
[ ] 5. P2.5 SyncService push: drain queue → Supabase LWW upsert
[ ] 6. P2.6 SyncService pull + LWW resolver (updatedAt, deviceId tiebreak) + tombstone apply
[ ] 7. P2.7 Background triggers: AppState foreground + debounced-after-write; fire-and-forget
[ ] 8. P2.8 (optional) retire redundant persist shadowing on the five stores
```

Backend prerequisite: per-domain remote tables mirroring the snapshot shape +
`updated_at`/`deleted_at`, each with `auth.uid() = user_id` RLS — as tracked
migrations in `supabase/migrations/`, applied by the workflows' migrate-db job.

---

## 5. Summary

### Architecture impact

- [x] Amends Description sections: §2 stack (sync becomes real), §4 full tree
  (SyncService, sync_queue), when slices ship.

### North star deviation

No — offline-first is preserved by design: local SQLite stays primary, sync is
background-only and never blocks the UI (Constitution §9).

### Open questions

| # | Question | Blocks |
|---|---|---|
| Q1 | Include a `rev` counter in P2.2, or defer (LWW works on updatedAt + deviceId alone)? | P2.2 |
| Q2 | Snapshot backups and incremental sync coexist — when does whole-snapshot backup retire, if ever? | Nothing; decide by P2.6 |
