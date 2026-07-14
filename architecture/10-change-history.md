# Change History

Append-only. Every Description amendment adds one row. Constitution changes do not go here.

| Date | Epic | Sections | Change |
|---|---|---|---|
| 2026-07-12 | PR #4 (pre-governance Supabase Phase 1) | §2, §4 | Supabase auth + snapshot backup/restore shipped: SupabaseService/SnapshotService/BackupService, authStore, auth/backup controllers, AuthScreen + /auth route, supabase/ migrations applied via workflow migrate-db jobs, EXPO_PUBLIC_SUPABASE_* in eas.json. |
| 2026-07-12 | cleanup follow-up | §4 | Removed nonexistent README.md from the tree (owner: no README wanted now). |
| 2026-07-12 | EPIC-006 | §4 | Added PendingSignupRepository and the app/(onboarding)/sign-up.tsx route; persisted pending email-confirmation + gated resend across AuthScreen and Settings. |
| 2026-07-13 | EPIC-008 | §2 | Documented the RC/stable release lifecycle: owner-dictated package.json versioning, RC guard, and master finalize + RC cleanup. |
