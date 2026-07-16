# EPIC-002: Supabase Background Sync (Phase 2)

**Status:** active
**Created:** 2026-07-12
**Architecture baseline:** 0fb1bc0c202a519cb6aba7569792ed7992dff704 (dev, post-shard)
**Source:** evicted from `ARCHITECTURE.md` §6 "Upcoming Remote Durability Layer" during the governance-bundle shard. Phase 1 (auth + whole-snapshot backup/restore) shipped in PR #4; its facts belong in Description sections via `epic-closeout`. This epic carries the unshipped Phase 2.

**Prerequisite (outside this epic, blocks item 2 below):** a `dependency-change` run adding
`expo-crypto`, contained to the Model-layer id-mint call sites this epic touches. Justification
block:

```md
Proposed dependency: expo-crypto (matching the installed Expo SDK ~54 constraint)
For: Crypto.randomUUID() — a CSPRNG-backed, collision-resistant id, replacing
Date.now()-based ids that collide when two offline devices mint a record in the
same millisecond before either has synced.

Why existing code cannot solve it: Math.random() is not a CSPRNG on Hermes/JSC,
so a hand-rolled UUID-shaped string reintroduces the exact collision class this
epic exists to remove (Flow 2 depends on ids being safe to merge across devices
without a rename step).

Smaller option without the dependency: a from-scratch RFC 4122 v4 generator is
~10 lines, but its randomness source would be Math.random() — not actually
smaller in the sense that matters, since the risk it reintroduces is the epic's
own reason for existing.

Risk introduced:
- Maintenance: official Expo SDK module, versioned and released alongside Expo SDK itself.
- Surface: native module bridge already present via other Expo packages; no new transitive deps.
- Reversibility: called only from the Model-layer id-mint sites listed in item 2 below — trivial to remove.

Proposed route: dependency-change run (contained to one module family — Model-layer
id-mint call sites). Closeout amends the stack table citing this run.

Install: https://docs.expo.dev/versions/latest/sdk/crypto/

Nothing was added. Proceed?
```

---

## 1. BDD — User Flows

### Flow 1: Cross-device edit reaches the other device

```gherkin
Given a signed-in user editing on two devices
When either device changes pantry, recipes, plans, budget, or profile
Then the change reaches the other device in the background
And neither device's UI ever blocks on sync
```

### Flow 2: Delete does not resurrect

```gherkin
Given a record deleted on one device
When the other device pulls
Then the record disappears there too
And is never resurrected by a later pull
```

### Flow 3: Two devices editing the same record offline do not fight

```gherkin
Given a record edited on device A while offline
And the same record edited on device B while offline
When both devices come back online and sync
Then exactly one edit wins deterministically
And a clock skew between the two devices does not change which one wins
```

**Out of scope for this epic:**
- Regenerable caches (`PricingService`, `SeasonalRepository` — pricing/seasonal cache entries)
- Habit, waste-log, and inspiration records (`HabitService`, `WasteService`,
  `InspirationRepository`/`InspirationService`) — explicitly excluded by the owner's Phase-2 plan
- Chat/assistant state: conversation messages (`useConversationController`,
  `conversationStore`), adaptation chat (`useAdaptationController`), and assistant suggestion
  chips (`AssistantShell.view.tsx`) — session-local, never persisted to a synced repository
- Transient, never-persisted UI state: meal-plan draft suggestion slots
  (`useMealPlanController.ts` `addSuggestionSlot`/`generateFromRequest`) and the pantry screen's
  draft suggestion slots (`PantryScreen.tsx`) — both live only in local React/Zustand state
  (`draftSlots`) and are never written through a repository, so there is nothing to sync
- Real-time subscriptions, multi-user sharing, merge-conflict UI
- Migrating ids that already exist on-device (new ids only — see item 2's scope)
- Recipe photo files (`PhotoService`): its `photo_<timestamp>_<rand>` value names a file in the
  local `recipe-photos/` directory, not a field stored on any synced record — whether photo
  *files* themselves need cross-device sync is a separate product question, not this epic's

---

## 2. Function Call Signatures

*(deferred to revision 2 — P2.1 is a pure 1:1 id-format swap at existing call sites; no new
cross-layer contract is introduced yet. P2.4's `markDirty(table, id)` and P2.6's LWW resolver
will get signatures here when their own slices are formulated.)*

---

## 3. TDD — Testing Strategy

### Authority for correctness

| Authority | Use when | Example |
|---|---|---|
| Textbook / published standard | The id format itself is being verified | RFC 4122 §4.4 (UUID version 4 layout) |

Every item in this revision's checklist (§4) is a P2.1 id-format swap: the new id must match the
UUID v4 layout defined by RFC 4122 §4.4. This is a closed-form standard, not a legacy-parity
case — there is no prior UUID output to reproduce, only a format to match. Tolerance is exact
string-pattern match; there is no numeric quantity to bound.

### Test map

| Flow | Function call | Authority | Fixture | Tolerance |
|---|---|---|---|---|
| 1 | `useChefController` profile-create id | RFC 4122 §4.4 | inline regex `/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i` | exact match, no tolerance |
| 1 | `usePantryController` item-create id (both sites) | RFC 4122 §4.4 | same regex | exact match |
| 1 | `useMealPlanController` `newSlotId`, `createPlan`, `savePreset` ids | RFC 4122 §4.4 | same regex | exact match |
| 1 | `useCookbookController` cookbook-create id | RFC 4122 §4.4 | same regex | exact match |
| 1 | `AdaptationService` ingredient-id and recipe-id fallbacks | RFC 4122 §4.4 | same regex | exact match |
| 1 | `recipeBuilder.createRecipeId()` | RFC 4122 §4.4 | same regex | exact match |
| 1 | `CookLogRepository.createId()` (shared by log entry/rating/note/category) | RFC 4122 §4.4 | same regex | exact match |

### What is deliberately not tested

- Uniqueness across billions of ids (birthday-bound collision probability) — trusted to
  `expo-crypto`'s native CSPRNG, not re-derived here.
- Flow 2 (delete/tombstone) and Flow 3 (rev-counter LWW) have no test map rows yet — they belong
  to P2.2/P2.3/P2.6, which are not sliced into checklist items in this revision (see §4 note).

---

## 4. Checklist

Only the next slice (P2.1 — UUID adoption) is broken into one-file items. P2.2 onward stay as
the owner's phase-level roadmap (below the checklist) until each is sliced by its own
`epic-formulation` pass, per that skill's support for adding items incrementally as work
reaches them.

Verified scope: grep for `Date.now()` id-mint call sites (2026-07-16, baseline above) found 7
files with **in-scope** sites — not the "~8 sites" the prior revision claimed. The remaining
`Date.now()` matches in the codebase are either non-id timing/cache code or out-of-scope
domains, both listed in §1. `CookLogRepository.ts` is included per Q3's resolution below: cook
history must be saved (owner decision, 2026-07-16) — it is in this epic's sync domain, not
snapshot-only.

```md
[ ] 1. Add failing test asserting `useChefController`'s created-profile id matches RFC 4122 §4.4
       in `src/controllers/useChefController.test.tsx` (new file, `.tsx` to match this
       directory's existing controller-test convention) — done when it fails because the
       current id is `chef_<timestamp>`
[ ] 2. Implement: swap `chef_${Date.now()}` for `Crypto.randomUUID()` in
       `src/controllers/useChefController.ts` — done when item 1 passes
[ ] 3. Add failing test asserting new pantry-item ids match RFC 4122 §4.4 in
       `src/controllers/usePantryController.test.tsx` (new file, `.tsx` convention) — done when
       it fails for the current `pantry_<timestamp>` format at both mint sites
[ ] 4. Implement: swap both `pantry_${Date.now()}` sites for `Crypto.randomUUID()` in
       `src/controllers/usePantryController.ts` — done when item 3 passes
[ ] 5. Add failing test asserting `createPlan`'s plan id, `newSlotId()`'s slot id, and
       `savePreset`'s preset id all match RFC 4122 §4.4 in
       `src/controllers/useMealPlanController.test.tsx` (new file, `.tsx` convention) — done
       when it fails for the current `plan-<timestamp>` / `slot-<timestamp>` /
       `preset-<timestamp>` formats. Assert the two `suggestion-` ids (draft slots) are
       unchanged — they stay out of scope.
[ ] 6. Implement: swap `newSlotId()`, `createPlan`'s id literal, and `savePreset`'s id literal in
       `src/controllers/useMealPlanController.ts` to `Crypto.randomUUID()` — done when item 5
       passes. Leave the `suggestion-${Date.now()}...` sites untouched.
[ ] 7. Update the existing `"creates a cookbook with a slugged id and normalized fields"` test in
       `src/controllers/useCookbookController.test.tsx` (existing file — this test already pins
       the current `<slug>-<timestamp base36>` format via `jest.spyOn(Date, "now")`, and will
       fail once item 8 lands unless updated first) to assert the id matches RFC 4122 §4.4
       instead — done when the test fails against the current slugged-id implementation
[ ] 8. Implement: swap `` `${slugifyCookbookId(title)}-${Date.now().toString(36)}` `` for
       `Crypto.randomUUID()` in `src/controllers/useCookbookController.ts` — done when item 7
       passes. Note: this drops the human-readable slug prefix from new cookbook ids; flag to
       the owner at closeout as a visible id-shape change (cookbook ids were the only
       human-readable ones in the app).
[ ] 9. Add failing test asserting `AdaptationService`'s ingredient-id fallback and recipe-id
       both match RFC 4122 §4.4, in `src/services/AdaptationService.test.ts` (existing file) —
       done when it fails for the current `ing_<timestamp>_<index>` / `recipe_<timestamp>`
       formats
[ ] 10. Implement: swap both `ing_${Date.now()}_${index}` and `recipe_${Date.now()}` in
        `src/services/AdaptationService.ts` for `Crypto.randomUUID()` — done when item 9 passes
[ ] 11. Add failing test asserting `createRecipeId()`'s output matches RFC 4122 §4.4 in
        `src/utils/recipeBuilder.test.ts` (new file) — done when it fails for the current
        `recipe-<timestamp>-<rand>` format
[ ] 12. Implement: swap the literal in `createRecipeId()` in `src/utils/recipeBuilder.ts` for
        `Crypto.randomUUID()` — done when item 11 passes
[ ] 13. Add failing test asserting `CookLogRepository.createId()`'s output matches RFC 4122
        §4.4 in `src/models/repositories/CookLogRepository.test.ts` (new file) — done when it
        fails for the current `<prefix>_<timestamp>_<rand>` format
[ ] 14. Implement: swap the literal in `createId(prefix)` in
        `src/models/repositories/CookLogRepository.ts` for `Crypto.randomUUID()` (drop the
        `prefix` argument and its callers' prefixes — a UUID does not need one) — done when
        item 13 passes
```

### Planned phases (not yet sliced into checklist items)

```md
P2.2  Additive per-record metadata: updatedAt (stamped on write) + rev (monotonic per-record
      integer, incremented on every local write; primary LWW ordering signal — updatedAt is
      demoted to display/tiebreak only, per the owner's resolution of Q1 below). Optional Zod
      fields so old rows parse, mirroring the onboardingCompleted precedent
      (Settings.types.ts / SettingsSchema.ts / SettingsRepository.ts).
      Verified scope (8 domains, corrected from the prior revision's "six affected repos" for
      P2.3 — PlanPreset was missing, and Q3 has since added CookLogRepository): Pantry, Recipe,
      Cookbook, MealPlan (covers plan + slot), PlanPreset, Budget (covers BudgetPeriod +
      SpendEntry), ChefProfile, CookLogRepository (covers cook log entry, rating, note, category).
      Files per domain: <Domain>.types.ts, <Domain>Schema.ts, <Domain>Repository.ts — except
      PlanPreset, which has no schema file (PlanPresetRepository reads/writes a raw AsyncStorage
      array with no Zod validation today), so only its type (shared with MealPlan.types.ts) and
      PlanPresetRepository.ts need touching.
P2.3  Soft-delete: delete → deletedAt; every read filters deletedAt IS NULL. Same 8 repos as
      P2.2. PlanPresetRepository's delete() is currently a hard delete (splice from the array) —
      it needs the same soft-delete conversion as the SQLite-backed repos. Cook log entries are
      normally append-only in the UI today (no delete affordance exists yet) — confirm at P2.3
      time whether a tombstone path is needed now or deferred until a delete affordance ships.
P2.4  sync_queue table in StorageService + RESET_TABLES; markDirty(table, id) called from each
      of the 8 repos' write paths.
P2.5  Backend prerequisite for P2.5/P2.6: per-domain remote tables mirroring the snapshot shape
      + updated_at/deleted_at/rev, each with auth.uid() = user_id RLS, as a tracked migration in
      supabase/migrations/, applied by the workflows' migrate-db job. SyncService push: drain
      queue → Supabase upsert.
P2.6  SyncService pull + LWW resolver (rev primary, updatedAt tiebreak, deviceId final tiebreak)
      + tombstone apply.
P2.7  Background triggers: AppState foreground + debounced-after-write; fire-and-forget.
P2.8  (optional) retire redundant persist shadowing on the five stores.
```

---

## 5. Summary

### Architecture impact

- [x] Amends Description sections: §2 stack (sync becomes real), §4 full tree
  (SyncService, sync_queue), when slices ship. P2.1 alone (this revision's checklist) touches no
  new directories and needs no Description amendment on its own — the amendment lands at the
  closeout of whichever phase first adds a new file/directory (P2.4's sync_queue, most likely).

### North star deviation

No — offline-first is preserved by design: local SQLite stays primary, sync is
background-only and never blocks the UI (Constitution §9). The owner's own framing for this
epic: local DB is for offline use; once online, everything syncs to the remote DB forcibly
without disturbing the user; the remote DB exists purely for data longevity, not as an
interactive merge arena.

### Open questions

| # | Question | Blocks | Decision needed by |
|---|---|---|---|
| Q1 | Include a `rev` counter in P2.2, or defer (LWW works on updatedAt + deviceId alone)? | P2.2 | **Resolved 2026-07-16: include it.** A monotonic per-record integer is immune to clock skew/jumps between devices, which a pure `updatedAt` timestamp is not; `updatedAt` is demoted to tiebreak/display only. |
| Q2 | Snapshot backups and incremental sync coexist — when does whole-snapshot backup retire, if ever? | Nothing | by P2.6 |
| Q3 | Is cook history (`CookLogRepository`) part of this epic's incremental-sync domain, or does it stay snapshot-only (Phase 1) forever? | Was blocking whether P2.1 touches `CookLogRepository.ts` | **Resolved 2026-07-16: cook history must be saved** (owner decision) — it joins the incremental-sync domain alongside pantry/recipes/plans/budget/profile. `CookLogRepository.ts` is now items 13–14 in §4, and is an 8th repo in P2.2/P2.3's roadmap scope (added to the 7 already listed there). |

### New capability

No — this delivers the durability/sync mechanism the north star already alludes to
(architecture/constitution/09-offline-first-principle.md's remote-durability note); it does not
expand the product's feature surface.
