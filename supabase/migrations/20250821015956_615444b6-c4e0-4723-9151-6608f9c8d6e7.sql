
-- 1) Ensure a dedicated calendar exists
insert into public.gw_calendars (name, description, color, is_visible, is_default)
select 'Doc''s Schedule', 'Personal schedule for Dr. Kevin Phillip Johnson', '#D97706', true, false
where not exists (select 1 from public.gw_calendars where name = 'Doc''s Schedule');

-- Helper CTEs
with
cal as (
  select id from public.gw_calendars where name = 'Doc''s Schedule' limit 1
),
-- Generate a date series for 12 months
series as (
  select generate_series(date_trunc('day', now())::date, (now() + interval '12 months')::date, interval '1 day') as day
)

-- 2) Survey of African American Music (MWF 1–2 PM)
insert into public.gw_events (id, calendar_id, title, event_type, start_date, end_date, is_public, is_private, created_at)
select gen_random_uuid(), cal.id, 'Survey of African American Music', 'teaching',
       (day::timestamp + time '13:00') at time zone 'America/New_York',
       (day::timestamp + time '14:00') at time zone 'America/New_York',
       false, true, now()
from series, cal
where extract(isodow from day) in (1,3,5)
  and not exists (
    select 1 from public.gw_events e
    where e.calendar_id = cal.id
      and e.title = 'Survey of African American Music'
      and e.start_date = (day::timestamp + time '13:00') at time zone 'America/New_York'
  );

-- 3) Music Theory (Tue/Thu 3–4 PM)
insert into public.gw_events (id, calendar_id, title, event_type, start_date, end_date, is_public, is_private, created_at)
select gen_random_uuid(), cal.id, 'Music Theory', 'teaching',
       (day::timestamp + time '15:00') at time zone 'America/New_York',
       (day::timestamp + time '16:00') at time zone 'America/New_York',
       false, true, now()
from series, cal
where extract(isodow from day) in (2,4)
  and not exists (
    select 1 from public.gw_events e
    where e.calendar_id = cal.id
      and e.title = 'Music Theory'
      and e.start_date = (day::timestamp + time '15:00') at time zone 'America/New_York'
  );

-- 4) Glee Club (MWF 5–6:15 PM)
insert into public.gw_events (id, calendar_id, title, event_type, start_date, end_date, is_public, is_private, created_at)
select gen_random_uuid(), cal.id, 'Glee Club', 'busy',
       (day::timestamp + time '17:00') at time zone 'America/New_York',
       (day::timestamp + time '18:15') at time zone 'America/New_York',
       false, true, now()
from series, cal
where extract(isodow from day) in (1,3,5)
  and not exists (
    select 1 from public.gw_events e
    where e.calendar_id = cal.id
      and e.title = 'Glee Club'
      and e.start_date = (day::timestamp + time '17:00') at time zone 'America/New_York'
  );

-- 5) Lyke House (Thu 7–10 PM)
insert into public.gw_events (id, calendar_id, title, event_type, start_date, end_date, is_public, is_private, created_at)
select gen_random_uuid(), cal.id, 'Lyke House', 'busy',
       (day::timestamp + time '19:00') at time zone 'America/New_York',
       (day::timestamp + time '22:00') at time zone 'America/New_York',
       false, true, now()
from series, cal
where extract(isodow from day) in (4)
  and not exists (
    select 1 from public.gw_events e
    where e.calendar_id = cal.id
      and e.title = 'Lyke House'
      and e.start_date = (day::timestamp + time '19:00') at time zone 'America/New_York'
  );

-- 6) Lyke House Mass (Sun 9 AM–12 PM)
insert into public.gw_events (id, calendar_id, title, event_type, start_date, end_date, is_public, is_private, created_at)
select gen_random_uuid(), cal.id, 'Lyke House Mass', 'busy',
       (day::timestamp + time '09:00') at time zone 'America/New_York',
       (day::timestamp + time '12:00') at time zone 'America/New_York',
       false, true, now()
from series, cal
where extract(isodow from day) in (7)
  and not exists (
    select 1 from public.gw_events e
    where e.calendar_id = cal.id
      and e.title = 'Lyke House Mass'
      and e.start_date = (day::timestamp + time '09:00') at time zone 'America/New_York'
  );
