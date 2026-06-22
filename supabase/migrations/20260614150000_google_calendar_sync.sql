-- Google Calendar inbound sync — per-user OAuth connections and the
-- imported events that come with them.
--
-- ── Tables ───────────────────────────────────────────────────────────────
--   gw_google_connections  — one row per user that has linked their Google
--                            account. Holds the refresh_token (long-lived)
--                            and the current access_token (~1 hour TTL).
--   gw_google_events       — events pulled from the user's Google calendar.
--                            Kept in a separate table so they don't pollute
--                            gw_events and so the sync worker can wipe +
--                            repopulate without touching real GleeWorld rows.
--   gw_oauth_states        — short-lived nonces used to defend the OAuth
--                            redirect against CSRF. TTL: 10 minutes.
--
-- ── Multi-tenant safety ─────────────────────────────────────────────────
--   Standard three-layer pattern, same as gw_event_categories /
--   gw_calendars: DEFAULT current_tenant_id(), BEFORE INSERT trigger, and a
--   RESTRICTIVE policy. Permissive policies layer ownership rules on top —
--   a user can only touch their OWN row.

-- ── gw_google_connections ───────────────────────────────────────────────

create table if not exists public.gw_google_connections (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null default public.current_tenant_id(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  google_email    text,
  google_sub      text,                       -- Google's stable user id ("sub")
  access_token    text,
  refresh_token   text not null,              -- the long-lived one we depend on
  token_type      text not null default 'Bearer',
  expires_at      timestamptz,
  scope           text,
  last_synced_at  timestamptz,
  last_error      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (user_id)                            -- one Google connection per user
);

create index if not exists gw_google_connections_tenant_idx
  on public.gw_google_connections (tenant_id, user_id);

create or replace function public.gw_google_connections_set_tenant_id()
returns trigger language plpgsql as $$
begin
  if new.tenant_id is null then new.tenant_id := public.current_tenant_id(); end if;
  if new.user_id  is null then new.user_id  := auth.uid();                end if;
  return new;
end; $$;

drop trigger if exists gw_google_connections_tenant_id_trigger on public.gw_google_connections;
create trigger gw_google_connections_tenant_id_trigger
  before insert on public.gw_google_connections
  for each row execute function public.gw_google_connections_set_tenant_id();

create or replace function public.gw_google_connections_touch()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end; $$;

drop trigger if exists gw_google_connections_touch_trigger on public.gw_google_connections;
create trigger gw_google_connections_touch_trigger
  before update on public.gw_google_connections
  for each row execute function public.gw_google_connections_touch();

alter table public.gw_google_connections enable row level security;

drop policy if exists tenant_isolation_restrict on public.gw_google_connections;
drop policy if exists "Users see own connection" on public.gw_google_connections;
drop policy if exists "Users write own connection" on public.gw_google_connections;

create policy tenant_isolation_restrict
  on public.gw_google_connections
  as restrictive
  for all
  using  (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());

create policy "Users see own connection"
  on public.gw_google_connections
  for select to authenticated
  using (user_id = auth.uid());

create policy "Users write own connection"
  on public.gw_google_connections
  for all to authenticated
  using  (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update, delete on public.gw_google_connections to authenticated;

-- ── gw_google_events ────────────────────────────────────────────────────

create table if not exists public.gw_google_events (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null default public.current_tenant_id(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  google_event_id     text not null,
  google_calendar_id  text not null default 'primary',
  title               text,
  description         text,
  location            text,
  start_at            timestamptz,
  end_at              timestamptz,
  all_day             boolean not null default false,
  html_link           text,
  recurrence          text[],
  status              text,                     -- 'confirmed' / 'tentative' / 'cancelled'
  synced_at           timestamptz not null default now(),
  unique (user_id, google_event_id)
);

create index if not exists gw_google_events_user_time_idx
  on public.gw_google_events (user_id, start_at);

create or replace function public.gw_google_events_set_tenant_id()
returns trigger language plpgsql as $$
begin
  if new.tenant_id is null then new.tenant_id := public.current_tenant_id(); end if;
  return new;
end; $$;

drop trigger if exists gw_google_events_tenant_id_trigger on public.gw_google_events;
create trigger gw_google_events_tenant_id_trigger
  before insert on public.gw_google_events
  for each row execute function public.gw_google_events_set_tenant_id();

alter table public.gw_google_events enable row level security;

drop policy if exists tenant_isolation_restrict on public.gw_google_events;
drop policy if exists "Users see own google events" on public.gw_google_events;
drop policy if exists "Users write own google events" on public.gw_google_events;

create policy tenant_isolation_restrict
  on public.gw_google_events
  as restrictive
  for all
  using  (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());

create policy "Users see own google events"
  on public.gw_google_events
  for select to authenticated
  using (user_id = auth.uid());

create policy "Users write own google events"
  on public.gw_google_events
  for all to authenticated
  using  (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update, delete on public.gw_google_events to authenticated;

-- ── gw_oauth_states ─────────────────────────────────────────────────────
-- CSRF defense for the redirect roundtrip. The state nonce is generated by
-- google-oauth-start and validated by google-oauth-callback. Rows expire
-- after 10 minutes; a separate cleanup job (or a periodic DELETE) keeps
-- the table small.

create table if not exists public.gw_oauth_states (
  state        text primary key,
  user_id      uuid not null,
  tenant_id    uuid not null default public.current_tenant_id(),
  provider     text not null default 'google',
  redirect_to  text,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null default now() + interval '10 minutes'
);

alter table public.gw_oauth_states enable row level security;

-- This table is service-role only. The OAuth callback function uses
-- service-role to validate state; no end-user ever needs to read it.
drop policy if exists tenant_isolation_restrict on public.gw_oauth_states;
create policy tenant_isolation_restrict
  on public.gw_oauth_states
  as restrictive
  for all
  using  (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());

-- No permissive policies for authenticated role → nothing accessible from PostgREST.
