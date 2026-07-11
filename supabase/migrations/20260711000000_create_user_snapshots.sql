-- Phase 1 backup/restore: one snapshot row per user (see ARCHITECTURE.md,
-- "Upcoming Remote Durability Layer"). Matches SupabaseService's access
-- pattern exactly: upsert on user_id, select data by user_id.
--
-- Applied automatically by the release workflow's migrate-db job
-- (supabase db push); can also be pasted into the dashboard's SQL editor
-- (project wfjwjkjrbgluiupskuau). Idempotent.

create table if not exists public.user_snapshots (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data text not null,
  updated_at timestamptz not null default now()
);

alter table public.user_snapshots enable row level security;

-- RLS: a user can only ever touch their own row. No delete policy in
-- Phase 1 — nothing in the app deletes snapshots yet.
drop policy if exists "select own snapshot" on public.user_snapshots;
create policy "select own snapshot"
  on public.user_snapshots for select
  using (auth.uid() = user_id);

drop policy if exists "insert own snapshot" on public.user_snapshots;
create policy "insert own snapshot"
  on public.user_snapshots for insert
  with check (auth.uid() = user_id);

drop policy if exists "update own snapshot" on public.user_snapshots;
create policy "update own snapshot"
  on public.user_snapshots for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
