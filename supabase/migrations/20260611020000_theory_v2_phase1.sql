-- THEORY_V2 Phase 1: leveled music theory curriculum scaffolding.
-- Additive + idempotent. Curriculum content tables are platform-global;
-- per-user tables (progress, placements) follow the tenant RLS pattern.

-- ── Curriculum content (global) ────────────────────────────────────────────

create table if not exists public.gw_theory_levels (
  id smallint primary key,                  -- 1–4
  slug text not null unique,                -- 'elementary' | 'middle' | 'high' | 'college'
  name text not null,
  description text
);

create table if not exists public.gw_theory_units (
  id uuid primary key default gen_random_uuid(),
  level_id smallint not null references public.gw_theory_levels(id),
  sort_order int not null,
  title text not null,
  description text,
  unique (level_id, sort_order)
);
create index if not exists idx_gw_theory_units_level on public.gw_theory_units(level_id);

create table if not exists public.gw_theory_lessons (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.gw_theory_units(id) on delete cascade,
  sort_order int not null,
  title text not null,
  description text,
  content jsonb not null default '[]'::jsonb,   -- lesson body blocks (text, notation, audio)
  -- Deep link into an existing read-music drill (/read-music/:level/:exercise)
  legacy_level_slug text,
  legacy_exercise_slug text,
  unique (unit_id, sort_order)
);
create index if not exists idx_gw_theory_lessons_unit on public.gw_theory_lessons(unit_id);

create table if not exists public.gw_theory_exercises (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.gw_theory_lessons(id) on delete cascade,
  type text not null check (type in
    ('multiple_choice','audio_id','staff_placement','rhythm_tap',
     'keyboard_id','speed_drill','dictation','sight_singing')),
  prompt jsonb not null,
  answer jsonb not null,
  difficulty smallint not null default 1,
  created_at timestamptz not null default now()
);
create index if not exists idx_gw_theory_exercises_lesson on public.gw_theory_exercises(lesson_id);

-- ── Per-user state (tenant-scoped) ─────────────────────────────────────────

create table if not exists public.gw_theory_progress (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default current_tenant_id() references public.gw_tenants(id),
  user_id uuid not null,
  lesson_id uuid not null references public.gw_theory_lessons(id) on delete cascade,
  status text not null default 'not_started'
    check (status in ('not_started','in_progress','complete','mastered')),
  best_score numeric(5,2),
  attempts int not null default 0,
  last_attempt_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, lesson_id)
);
create index if not exists idx_gw_theory_progress_tenant on public.gw_theory_progress(tenant_id);
create index if not exists idx_gw_theory_progress_user on public.gw_theory_progress(user_id);

create table if not exists public.gw_theory_placements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default current_tenant_id() references public.gw_tenants(id),
  user_id uuid not null,
  placed_level smallint references public.gw_theory_levels(id),
  placed_unit uuid references public.gw_theory_units(id),
  taken_at timestamptz not null default now(),
  detail jsonb
);
create index if not exists idx_gw_theory_placements_tenant on public.gw_theory_placements(tenant_id);
create index if not exists idx_gw_theory_placements_user on public.gw_theory_placements(user_id);

-- ── RLS ────────────────────────────────────────────────────────────────────

alter table public.gw_theory_levels enable row level security;
alter table public.gw_theory_units enable row level security;
alter table public.gw_theory_lessons enable row level security;
alter table public.gw_theory_exercises enable row level security;
alter table public.gw_theory_progress enable row level security;
alter table public.gw_theory_placements enable row level security;

-- Curriculum is global, read-only from the client (writes via service role / seeds)
drop policy if exists theory_content_read on public.gw_theory_levels;
create policy theory_content_read on public.gw_theory_levels for select to anon, authenticated using (true);
drop policy if exists theory_content_read on public.gw_theory_units;
create policy theory_content_read on public.gw_theory_units for select to anon, authenticated using (true);
drop policy if exists theory_content_read on public.gw_theory_lessons;
create policy theory_content_read on public.gw_theory_lessons for select to anon, authenticated using (true);
drop policy if exists theory_content_read on public.gw_theory_exercises;
create policy theory_content_read on public.gw_theory_exercises for select to anon, authenticated using (true);

-- Per-user tables: tenant isolation (restrictive) + own-rows access (permissive)
drop policy if exists tenant_isolation_restrict on public.gw_theory_progress;
create policy tenant_isolation_restrict on public.gw_theory_progress
  as restrictive for all to authenticated
  using (tenant_id = current_tenant_id()) with check (tenant_id = current_tenant_id());
drop policy if exists anon_tenant_isolation on public.gw_theory_progress;
create policy anon_tenant_isolation on public.gw_theory_progress
  as restrictive for all to anon
  using (tenant_id = anon_tenant_id()) with check (tenant_id = anon_tenant_id());
drop policy if exists own_progress on public.gw_theory_progress;
create policy own_progress on public.gw_theory_progress
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists tenant_isolation_restrict on public.gw_theory_placements;
create policy tenant_isolation_restrict on public.gw_theory_placements
  as restrictive for all to authenticated
  using (tenant_id = current_tenant_id()) with check (tenant_id = current_tenant_id());
drop policy if exists anon_tenant_isolation on public.gw_theory_placements;
create policy anon_tenant_isolation on public.gw_theory_placements
  as restrictive for all to anon
  using (tenant_id = anon_tenant_id()) with check (tenant_id = anon_tenant_id());
drop policy if exists own_placements on public.gw_theory_placements;
create policy own_placements on public.gw_theory_placements
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── Feature flag (off by default) ──────────────────────────────────────────

insert into public.gw_feature_flags (flag_key, is_enabled, description)
select 'THEORY_V2', false, 'Leveled music theory curriculum (Read Music expansion)'
where not exists (select 1 from public.gw_feature_flags where flag_key = 'THEORY_V2');
