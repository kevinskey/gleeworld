-- Per-user opt-in list of which Google calendars to pull.
-- Without this, google-sync only ever pulled `primary`, which left
-- secondary calendars (Family, Work, side-project) invisible in GleeWorld.
--
-- Lifecycle:
--   * google-list-calendars hits Google's calendarList endpoint and
--     UPSERTs one row per calendar the user can see. New rows are
--     created with is_enabled = (google_calendar_id = 'primary') so the
--     primary keeps working out of the box and the rest are off until
--     the user picks them.
--   * google-sync iterates over `is_enabled = true` rows and fetches
--     events from each. Each event row tags google_calendar_id so the
--     UI can render with the right color / let the user filter per cal.
--   * Toggling a row off does NOT delete already-pulled events; they
--     stay in gw_google_events with the now-disabled calendar id and
--     the user can clear them via the picker's "Hide events" action
--     (handled client-side by filtering on calendar id).

create table if not exists public.gw_google_calendar_subscriptions (
  id                   uuid primary key default gen_random_uuid(),
  tenant_id            uuid not null default public.current_tenant_id(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  google_calendar_id   text not null,                  -- e.g. 'primary', 'family@group.calendar.google.com'
  summary              text,                           -- display name from Google
  description          text,
  background_color     text,                           -- '#RRGGBB' Google color hint
  foreground_color     text,
  access_role          text,                           -- 'owner' / 'reader' / 'writer' / 'freeBusyReader'
  is_primary           boolean not null default false,
  is_enabled           boolean not null default false, -- user picks
  last_listed_at       timestamptz not null default now(),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (user_id, google_calendar_id)
);

create index if not exists gw_google_calendar_subs_tenant_user_idx
  on public.gw_google_calendar_subscriptions (tenant_id, user_id);

-- DEFAULT + BEFORE INSERT trigger (matches gw_google_connections pattern).
create or replace function public.gw_google_calendar_subs_set_tenant_id()
returns trigger language plpgsql as $$
begin
  if new.tenant_id is null then new.tenant_id := public.current_tenant_id(); end if;
  if new.user_id   is null then new.user_id   := auth.uid();                end if;
  return new;
end; $$;

drop trigger if exists gw_google_calendar_subs_tenant_trigger on public.gw_google_calendar_subscriptions;
create trigger gw_google_calendar_subs_tenant_trigger
  before insert on public.gw_google_calendar_subscriptions
  for each row execute function public.gw_google_calendar_subs_set_tenant_id();

create or replace function public.gw_google_calendar_subs_touch()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end; $$;

drop trigger if exists gw_google_calendar_subs_touch_trigger on public.gw_google_calendar_subscriptions;
create trigger gw_google_calendar_subs_touch_trigger
  before update on public.gw_google_calendar_subscriptions
  for each row execute function public.gw_google_calendar_subs_touch();

alter table public.gw_google_calendar_subscriptions enable row level security;

drop policy if exists tenant_isolation_restrict on public.gw_google_calendar_subscriptions;
drop policy if exists "Users see own google subs" on public.gw_google_calendar_subscriptions;
drop policy if exists "Users write own google subs" on public.gw_google_calendar_subscriptions;

create policy tenant_isolation_restrict
  on public.gw_google_calendar_subscriptions
  as restrictive
  for all
  using  (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());

create policy "Users see own google subs"
  on public.gw_google_calendar_subscriptions
  for select to authenticated
  using (user_id = auth.uid());

create policy "Users write own google subs"
  on public.gw_google_calendar_subscriptions
  for all to authenticated
  using  (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update, delete on public.gw_google_calendar_subscriptions to authenticated;

-- Seed: if a user already has gw_google_connections rows (existing
-- connections from before this migration), insert a primary subscription
-- so the sync keeps working without requiring them to refresh the picker.
insert into public.gw_google_calendar_subscriptions
  (tenant_id, user_id, google_calendar_id, summary, is_primary, is_enabled)
select c.tenant_id, c.user_id, 'primary', 'Primary', true, true
from public.gw_google_connections c
on conflict (user_id, google_calendar_id) do nothing;
