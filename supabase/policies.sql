-- ============================================================================
-- Supabase Row Level Security (RLS) — Secure Starter Policies
-- ============================================================================
-- The single most common cause of Supabase data breaches is missing or
-- misconfigured RLS: a table left world-readable, or a policy that checks
-- nothing. These policies follow LEAST PRIVILEGE — every table is denied by
-- default the moment RLS is enabled, and access is granted explicitly, per
-- operation, scoped to the owning user.
--
-- GOLDEN RULE: RLS only protects queries made with the ANON or AUTHENTICATED
-- key. The SERVICE_ROLE key BYPASSES RLS entirely. Never ship the service_role
-- key to the browser, and never use it in a route that handles user input
-- without your own authorization checks.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- profiles: one row per auth user, holding app-level profile data.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  full_name  text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Read: only your own profile.
create policy "profiles_select_own"
  on public.profiles for select
  using ( (select auth.uid()) = id );

-- Update: only your own profile, and you cannot change the id.
create policy "profiles_update_own"
  on public.profiles for update
  using ( (select auth.uid()) = id )
  with check ( (select auth.uid()) = id );

-- NOTE: no insert policy — rows are created by the trigger below (security
-- definer, which bypasses RLS). No delete policy — deletion cascades from
-- auth.users. If you add a "delete my account" flow that runs as the user,
-- add an explicit delete policy scoped to (select auth.uid()) = id.

-- Auto-provision a profile row whenever a new auth user is created.
-- security definer + empty search_path prevents search_path hijacking, a real
-- privilege-escalation vector in Postgres functions. Because search_path is
-- empty, every object below MUST be schema-qualified (public.profiles).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- projects: example user-owned resource. Copy this pattern for every table.
-- SEPARATE policy per operation (select/insert/update/delete) — do NOT use a
-- single "for all" policy; explicit per-op policies are auditable and prevent
-- accidental over-permissioning.
-- ---------------------------------------------------------------------------
create table if not exists public.projects (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now()
);

alter table public.projects enable row level security;

create policy "projects_select_own"
  on public.projects for select
  using ( (select auth.uid()) = owner_id );

create policy "projects_insert_own"
  on public.projects for insert
  with check ( (select auth.uid()) = owner_id );

create policy "projects_update_own"
  on public.projects for update
  using ( (select auth.uid()) = owner_id )
  with check ( (select auth.uid()) = owner_id );

create policy "projects_delete_own"
  on public.projects for delete
  using ( (select auth.uid()) = owner_id );

-- ---------------------------------------------------------------------------
-- Verification: after running this, confirm RLS is ON for every public table.
-- Any row returned by this query is a table WITHOUT RLS — treat as a leak.
-- ---------------------------------------------------------------------------
select c.relname as table_without_rls
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relrowsecurity = false;
