-- THEORY_V2 Phase 2: unit mastery (80% on a unit quiz unlocks the next unit).
-- Additive + idempotent.

create table if not exists public.gw_theory_unit_mastery (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default current_tenant_id() references public.gw_tenants(id),
  user_id uuid not null,
  unit_id uuid not null references public.gw_theory_units(id) on delete cascade,
  best_score numeric(5,2) not null default 0,
  attempts int not null default 0,
  passed boolean not null default false,
  passed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, unit_id)
);
create index if not exists idx_gw_theory_unit_mastery_tenant on public.gw_theory_unit_mastery(tenant_id);
create index if not exists idx_gw_theory_unit_mastery_user on public.gw_theory_unit_mastery(user_id);

alter table public.gw_theory_unit_mastery enable row level security;

drop policy if exists tenant_isolation_restrict on public.gw_theory_unit_mastery;
create policy tenant_isolation_restrict on public.gw_theory_unit_mastery
  as restrictive for all to authenticated
  using (tenant_id = current_tenant_id()) with check (tenant_id = current_tenant_id());
drop policy if exists anon_tenant_isolation on public.gw_theory_unit_mastery;
create policy anon_tenant_isolation on public.gw_theory_unit_mastery
  as restrictive for all to anon
  using (tenant_id = anon_tenant_id()) with check (tenant_id = anon_tenant_id());
drop policy if exists own_mastery on public.gw_theory_unit_mastery;
create policy own_mastery on public.gw_theory_unit_mastery
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
