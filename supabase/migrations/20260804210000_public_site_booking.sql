-- Public-site appointment booking: a visitor picks a service, a day and a time
-- and the booking is created without ever leaving the tenant's public page.
--
-- Where the schedule comes from. gw_appointment_services and
-- gw_appointment_availability are empty for every tenant today, so this flow
-- reads its services and weekly windows out of the appointment-booking block's
-- own config inside gw_public_sites.published_blocks. That is also the security
-- story: the config is the PUBLISHED snapshot, read server-side, so a visitor
-- can ask for any timestamp they like and still only ever get one the site
-- owner actually opened. The client sends a service index and a start instant;
-- everything else is recomputed here.
--
-- Bookings land in gw_appointments with status 'pending' (the value the admin
-- Appointments views already filter on) and appointment_type 'public_booking'.

-- ---------------------------------------------------------------------------
-- Conflict trigger: scope to the tenant.
-- ---------------------------------------------------------------------------
-- The original compared a new appointment against EVERY row in gw_appointments
-- regardless of tenant, so one choir's 10am lesson blocked every other choir on
-- the platform from booking 10am. Harmless while appointments were a handful of
-- internal rows; a hard blocker once anonymous visitors book from public sites.
-- Rows with a null tenant_id (pre-multi-tenant leftovers) only collide with
-- other null-tenant rows.
create or replace function public.check_appointment_conflict()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  if exists (
    select 1
      from gw_appointments a
     where a.id is distinct from NEW.id
       and a.status <> 'cancelled'
       and a.tenant_id is not distinct from NEW.tenant_id
       and NEW.appointment_date < a.appointment_date + make_interval(mins => a.duration_minutes)
       and NEW.appointment_date + make_interval(mins => NEW.duration_minutes) > a.appointment_date
  ) then
    raise exception 'Appointment conflict: This time slot is already booked. Please select a different time.';
  end if;

  return NEW;
end;
$$;

-- ---------------------------------------------------------------------------
-- Config lookup
-- ---------------------------------------------------------------------------
-- Returns the tenant and the published appointment-booking config for a slug,
-- or no rows when the site is unpublished / has no visible booking block.
create or replace function public._gw_booking_config(p_slug text)
returns table (tenant_id uuid, config jsonb)
language sql
stable
security definer
set search_path = public
as $$
  select s.tenant_id, coalesce(b->'config', '{}'::jsonb)
    from gw_public_sites s
    cross join lateral jsonb_array_elements(coalesce(s.published_blocks, '[]'::jsonb)) b
   where s.slug = p_slug
     and s.is_published = true
     and b->>'block_type' = 'appointment-booking'
     and coalesce((b->>'is_visible')::boolean, true)
   limit 1;
$$;

-- Weekly windows, falling back to Mon–Fri 9–5 so blocks published before this
-- migration (which have no `availability` key at all) still take bookings.
create or replace function public._gw_booking_windows(p_config jsonb)
returns jsonb
language sql
immutable
set search_path = public
as $$
  select case
    when jsonb_typeof(p_config->'availability') = 'array'
         and jsonb_array_length(p_config->'availability') > 0
      then p_config->'availability'
    else '[{"day":1,"start":"09:00","end":"17:00"},
           {"day":2,"start":"09:00","end":"17:00"},
           {"day":3,"start":"09:00","end":"17:00"},
           {"day":4,"start":"09:00","end":"17:00"},
           {"day":5,"start":"09:00","end":"17:00"}]'::jsonb
  end;
$$;

-- Duration of one service, in minutes. Before this block could schedule
-- anything, duration was free text beside the service name and tenants wrote it
-- however they liked — "30 min", "45 min", "1 hour" all appear in live configs.
-- Parse hours and minutes separately: stripping non-digits would read "1 hour"
-- as 1 and silently book an hour-long session as a 30-minute one.
-- parseDurationMinutes() in the block parses identically; the two must agree or
-- a visitor is offered times the server then refuses.
create or replace function public._gw_booking_duration(p_service jsonb, p_fallback int)
returns int
language plpgsql
immutable
set search_path = public
as $$
declare
  v_raw   text := lower(coalesce(p_service->>'duration', ''));
  v_hours text[];
  v_mins  text[];
  v_bare  text[];
  v_total numeric := 0;
  v_set   int;
begin
  begin
    v_set := (p_service->>'durationMinutes')::int;
  exception when others then
    v_set := null;
  end;

  if v_set is not null then
    return least(greatest(v_set, 5), 480);
  end if;

  v_hours := regexp_match(v_raw, '(\d+(?:\.\d+)?)\s*(?:h\y|hr|hour)');
  v_mins  := regexp_match(v_raw, '(\d+)\s*(?:m\y|min|minute)');

  if v_hours is not null then v_total := v_total + v_hours[1]::numeric * 60; end if;
  if v_mins  is not null then v_total := v_total + v_mins[1]::numeric; end if;

  if v_hours is null and v_mins is null then
    v_bare := regexp_match(v_raw, '(\d+)');
    if v_bare is not null then v_total := v_bare[1]::numeric; end if;
  end if;

  v_total := round(v_total);
  if v_total >= 5 and v_total <= 480 then
    return v_total::int;
  end if;

  return least(greatest(p_fallback, 5), 480);
end;
$$;

-- ---------------------------------------------------------------------------
-- Slot generation — the single source of truth for "is this time bookable"
-- ---------------------------------------------------------------------------
-- Walks each weekly window that covers p_date, steps it by the slot interval,
-- and emits starts that (a) clear the lead time, (b) fit inside the window and
-- (c) don't overlap an existing non-cancelled appointment for this tenant.
-- Both the slot list and the submit path call this, so they can never disagree.
create or replace function public._gw_booking_slots(
  p_tenant uuid,
  p_config jsonb,
  p_service_idx int,
  p_date date
)
returns setof timestamptz
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_tz       text := coalesce(nullif(p_config->>'timezone', ''), 'America/New_York');
  v_lead     int  := least(greatest(coalesce((p_config->>'leadHours')::int, 12), 0), 24 * 365);
  v_horizon  int  := least(greatest(coalesce((p_config->>'horizonDays')::int, 30), 1), 365);
  v_step     int  := least(greatest(coalesce((p_config->>'slotMinutes')::int, 30), 5), 480);
  v_service  jsonb := coalesce(p_config->'services', '[]'::jsonb) -> p_service_idx;
  v_duration int;
  v_today    date;
  v_window   record;
  v_end      timestamptz;
  v_cursor   timestamptz;
begin
  if p_service_idx is null or p_service_idx < 0
     or v_service is null or jsonb_typeof(v_service) <> 'object' then
    return;
  end if;

  v_duration := _gw_booking_duration(v_service, v_step);
  v_today := (now() at time zone v_tz)::date;

  if p_date is null or p_date < v_today or p_date > v_today + v_horizon then
    return;
  end if;

  for v_window in
    select (w->>'start')::time as starts, (w->>'end')::time as ends
      from jsonb_array_elements(_gw_booking_windows(p_config)) w
     where (w->>'day')::int = extract(dow from p_date)::int
  loop
    continue when v_window.ends <= v_window.starts;

    -- Local wall-clock -> instant. A window written as 09:00 means 09:00 where
    -- the choir is, on that date, DST included.
    v_cursor := (p_date + v_window.starts) at time zone v_tz;
    v_end    := (p_date + v_window.ends) at time zone v_tz;

    while v_cursor + make_interval(mins => v_duration) <= v_end loop
      if v_cursor >= now() + make_interval(hours => v_lead)
         and not exists (
           select 1
             from gw_appointments a
            where a.tenant_id = p_tenant
              and a.status <> 'cancelled'
              and a.appointment_date < v_cursor + make_interval(mins => v_duration)
              and a.appointment_date + make_interval(mins => a.duration_minutes) > v_cursor
         )
      then
        return next v_cursor;
      end if;
      v_cursor := v_cursor + make_interval(mins => v_step);
    end loop;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Anon-callable API
-- ---------------------------------------------------------------------------
-- What the block needs to render its picker: the services on offer and which
-- weekdays are worth showing. Deliberately free of anything private — no
-- existing appointments, no client names.
create or replace function public.gw_booking_public_options(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_tenant uuid;
  v_config jsonb;
  v_step   int;
begin
  select c.tenant_id, c.config into v_tenant, v_config from _gw_booking_config(p_slug) c;

  if v_tenant is null then
    return jsonb_build_object('available', false);
  end if;

  v_step := least(greatest(coalesce((v_config->>'slotMinutes')::int, 30), 5), 480);

  return jsonb_build_object(
    'available', true,
    'timezone', coalesce(nullif(v_config->>'timezone', ''), 'America/New_York'),
    'horizonDays', least(greatest(coalesce((v_config->>'horizonDays')::int, 30), 1), 365),
    'leadHours', least(greatest(coalesce((v_config->>'leadHours')::int, 12), 0), 24 * 365),
    'collectPhone', coalesce((v_config->>'collectPhone')::boolean, true),
    'weekdays', coalesce(
      (select jsonb_agg(distinct (w->>'day')::int)
         from jsonb_array_elements(_gw_booking_windows(v_config)) w),
      '[]'::jsonb),
    'services', coalesce(
      (select jsonb_agg(jsonb_build_object(
                'idx', (s.ord - 1),
                'name', s.item->>'name',
                'description', nullif(s.item->>'description', ''),
                'duration', nullif(s.item->>'duration', ''),
                'price', nullif(s.item->>'price', ''),
                'durationMinutes', _gw_booking_duration(s.item, v_step))
              order by s.ord)
         from jsonb_array_elements(coalesce(v_config->'services', '[]'::jsonb))
              with ordinality as s(item, ord)
        where nullif(trim(coalesce(s.item->>'name', '')), '') is not null),
      '[]'::jsonb)
  );
end;
$$;

-- Open start times for one service on one day.
create or replace function public.gw_booking_public_slots(
  p_slug text,
  p_service_idx int,
  p_date date
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_tenant uuid;
  v_config jsonb;
begin
  select c.tenant_id, c.config into v_tenant, v_config from _gw_booking_config(p_slug) c;

  if v_tenant is null then
    return jsonb_build_object('slots', '[]'::jsonb);
  end if;

  return jsonb_build_object(
    'slots', coalesce(
      (select jsonb_agg(to_jsonb(s.ts) order by s.ts)
         from _gw_booking_slots(v_tenant, v_config, p_service_idx, p_date) as s(ts)),
      '[]'::jsonb)
  );
end;
$$;

-- Create the booking. Re-derives the legal slot set and refuses anything that
-- isn't in it, so the only thing the client actually gets to choose is which
-- open slot it wants.
create or replace function public.gw_booking_public_submit(
  p_slug text,
  p_service_idx int,
  p_service_name text,
  p_start timestamptz,
  p_name text,
  p_email text,
  p_phone text default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant   uuid;
  v_config   jsonb;
  v_tz       text;
  v_service  jsonb;
  v_duration int;
  v_step     int;
  v_name     text := nullif(trim(coalesce(p_name, '')), '');
  v_email    text := lower(trim(coalesce(p_email, '')));
  v_recent   int;
  v_id       uuid;
begin
  select c.tenant_id, c.config into v_tenant, v_config from _gw_booking_config(p_slug) c;

  if v_tenant is null then
    raise exception 'Bookings are not open for this site.' using errcode = '42P01';
  end if;

  if v_name is null then
    raise exception 'Please enter your name.' using errcode = '22023';
  end if;

  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Please enter a valid email address.' using errcode = '22023';
  end if;

  v_tz := coalesce(nullif(v_config->>'timezone', ''), 'America/New_York');
  v_step := least(greatest(coalesce((v_config->>'slotMinutes')::int, 30), 5), 480);
  v_service := coalesce(v_config->'services', '[]'::jsonb) -> p_service_idx;

  if v_service is null or jsonb_typeof(v_service) <> 'object' then
    raise exception 'That service is no longer offered.' using errcode = '22023';
  end if;

  -- The client sends the name it displayed alongside the index. If the owner
  -- republished with a reordered list in the meantime, the two disagree and we
  -- would otherwise silently book the wrong thing.
  if lower(trim(coalesce(p_service_name, ''))) is distinct from lower(trim(coalesce(v_service->>'name', ''))) then
    raise exception 'This schedule was just updated. Please pick your appointment again.' using errcode = '22023';
  end if;

  v_duration := _gw_booking_duration(v_service, v_step);

  -- The whole validation, in one line: is the requested instant one this site
  -- is currently offering?
  if not exists (
    select 1
      from _gw_booking_slots(v_tenant, v_config, p_service_idx, (p_start at time zone v_tz)::date) as s(ts)
     where s.ts = p_start
  ) then
    raise exception 'That time is no longer available. Please choose another.' using errcode = '22023';
  end if;

  -- Light abuse brake: an anonymous form that writes rows needs some ceiling.
  select count(*) into v_recent
    from gw_appointments a
   where a.tenant_id = v_tenant
     and a.appointment_type = 'public_booking'
     and lower(a.client_email) = v_email
     and a.status = 'pending'
     and a.created_at > now() - interval '24 hours';

  if v_recent >= 3 then
    raise exception 'You already have several pending requests. Please wait to hear back before booking more.'
      using errcode = '22023';
  end if;

  insert into gw_appointments (
    tenant_id, title, appointment_type, appointment_date, duration_minutes,
    status, client_name, client_email, client_phone, description, notes
  ) values (
    v_tenant,
    coalesce(nullif(trim(v_service->>'name'), ''), 'Appointment'),
    'public_booking',
    p_start,
    v_duration,
    'pending',
    v_name,
    v_email,
    nullif(trim(coalesce(p_phone, '')), ''),
    nullif(trim(coalesce(v_service->>'description', '')), ''),
    nullif(trim(coalesce(p_notes, '')), '')
  )
  returning id into v_id;

  return jsonb_build_object(
    'ok', true,
    'id', v_id,
    'startsAt', p_start,
    'durationMinutes', v_duration,
    'service', v_service->>'name',
    'timezone', v_tz
  );
end;
$$;

revoke all on function public._gw_booking_config(text) from public, anon, authenticated;
revoke all on function public._gw_booking_duration(jsonb, int) from public, anon, authenticated;
revoke all on function public._gw_booking_windows(jsonb) from public, anon, authenticated;
revoke all on function public._gw_booking_slots(uuid, jsonb, int, date) from public, anon, authenticated;

grant execute on function public.gw_booking_public_options(text) to anon, authenticated;
grant execute on function public.gw_booking_public_slots(text, int, date) to anon, authenticated;
grant execute on function public.gw_booking_public_submit(text, int, text, timestamptz, text, text, text, text) to anon, authenticated;
