-- Device push-notification tokens (APNs/FCM) per user.
create table if not exists public.gw_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  token text not null unique,
  platform text not null default 'ios',
  tenant_id uuid default current_tenant_id(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.gw_push_tokens enable row level security;

create policy "own tokens" on public.gw_push_tokens
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy tenant_or_template_restrict on public.gw_push_tokens
  as restrictive for all to authenticated
  using (tenant_id = current_tenant_id())
  with check (tenant_id = current_tenant_id());

create trigger trg_set_tenant_id before insert on public.gw_push_tokens
  for each row execute function set_tenant_id_default();

grant select, insert, update, delete on public.gw_push_tokens to authenticated;
grant select on public.gw_push_tokens to service_role;
