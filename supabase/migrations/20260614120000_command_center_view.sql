-- Command Center feed view.
--
-- Single read-only VIEW that the /test-dashboard page reads. Aggregates four
-- sources into one unioned shape so the frontend pulls everything in one
-- round-trip without writing four queries:
--
--   • urgent_task  / missing_attendance — class sessions in the last 14 days
--     where attendance_required = true but no attendance was recorded.
--   • urgent_task  / unread_messages    — DMs in dm_messages addressed to the
--     caller and not yet read.
--   • schedule     / event               — events from gw_events happening
--     today (start_date::date = current_date).
--   • schedule     / session             — course class sessions whose
--     session_date is today.
--   • announcement / announcement        — gw_announcements published in the
--     last 14 days.
--
-- ── MULTI-TENANT SAFETY ──────────────────────────────────────────────────
-- This view is APPEND-ONLY (CREATE OR REPLACE — no source table altered).
-- Three layers enforce tenant isolation:
--
--   1. `security_invoker = on` (PG 15+) — the view runs with the CALLER's
--      privileges, so the existing RESTRICTIVE RLS policies on every
--      underlying table fire against the caller's JWT claims.
--   2. Every sub-SELECT explicitly filters by
--      `tenant_id = current_tenant_id()` as defense in depth.
--   3. User-specific rows (unread messages, missing-attendance for the
--      instructor's own classes) additionally filter by `auth.uid()`.
--
-- No SELECT, INSERT, UPDATE, DELETE is granted on any underlying table by
-- this migration — only SELECT on the view itself to the `authenticated`
-- role. Anon traffic gets nothing.

create or replace view public.v_command_center_feed
with (security_invoker = on)
as
-- ─── Urgent tasks: missing attendance ───────────────────────────────────
-- Sessions in the last 14 days that REQUIRED attendance but have no
-- attendance rows joined. Scoped to the caller's tenant. For instructors,
-- only their own courses; for admins/super-admins, every course in the
-- tenant (the existing RLS policies on gw_courses already handle that).
select
  'urgent_task'::text                                          as section,
  'missing_attendance'::text                                   as subtype,
  ('miss-att-' || s.id::text)                                  as id,
  'Attendance not taken'::text                                 as title,
  (c.course_code || ' \u2014 ' || coalesce(s.title, c.title)
    || ' on ' || to_char(s.session_date, 'Mon DD'))::text       as detail,
  ((s.session_date + coalesce(s.start_time, '00:00'::time))
    at time zone 'UTC')::timestamptz                            as event_at,
  case
    when s.session_date < (current_date - 7) then 'high'
    when s.session_date < (current_date - 2) then 'medium'
    else 'low'
  end::text                                                    as severity,
  jsonb_build_object(
    'course_id', s.course_id,
    'session_id', s.id,
    'session_date', s.session_date,
    'location', s.location
  )                                                            as meta
from public.gw_course_class_sessions s
join public.gw_courses c on c.id = s.course_id
where s.tenant_id = public.current_tenant_id()
  and s.attendance_required = true
  and s.session_date <= current_date
  and s.session_date >= (current_date - 14)
  and not exists (
    -- gw_course_attendance keys on (course_id, attendance_date), not
    -- session_id. A session is considered "covered" if any attendance row
    -- exists for the same course on the same calendar date.
    select 1 from public.gw_course_attendance a
    where a.course_id = s.course_id
      and a.attendance_date = s.session_date
      and a.tenant_id = public.current_tenant_id()
  )

union all

-- ─── Urgent tasks: unread DMs ───────────────────────────────────────────
-- Count of unread messages per conversation that the caller is a
-- participant of and did NOT send. One row per conversation rather than
-- per message so the column stays glanceable.
select
  'urgent_task'::text                                          as section,
  'unread_messages'::text                                      as subtype,
  ('unread-' || conv.id::text)                                 as id,
  (case when count(m.*) = 1 then '1 unread message'
        else count(m.*)::text || ' unread messages' end)::text as title,
  ('Conversation with ' ||
    coalesce(
      (select full_name from public.gw_profiles p
        where p.user_id = case when conv.participant_1 = auth.uid()
                               then conv.participant_2
                               else conv.participant_1 end
        limit 1),
      'a teammate'))::text                                     as detail,
  max(m.created_at)                                            as event_at,
  case when count(m.*) >= 5 then 'high'
       when count(m.*) >= 2 then 'medium'
       else 'low' end::text                                    as severity,
  jsonb_build_object(
    'conversation_id', conv.id,
    'unread_count', count(m.*)
  )                                                            as meta
from public.dm_conversations conv
join public.dm_messages m
  on m.conversation_id = conv.id
 and m.tenant_id = public.current_tenant_id()
 and m.read = false
 and m.sender_id <> auth.uid()
where conv.tenant_id = public.current_tenant_id()
  and (conv.participant_1 = auth.uid() or conv.participant_2 = auth.uid())
group by conv.id, conv.participant_1, conv.participant_2

union all

-- ─── Today's schedule: events ──────────────────────────────────────────
select
  'schedule'::text                                             as section,
  'event'::text                                                as subtype,
  ('event-' || e.id::text)                                     as id,
  e.title                                                      as title,
  (to_char(e.start_date at time zone 'UTC', 'HH:MI AM')
    || coalesce(' \u2014 ' || nullif(e.location, ''), ''))::text as detail,
  e.start_date                                                 as event_at,
  null::text                                                   as severity,
  jsonb_build_object(
    'event_id', e.id,
    'event_type', e.event_type,
    'all_day', e.all_day,
    'location', e.location,
    'venue_name', e.venue_name,
    'end_date', e.end_date
  )                                                            as meta
from public.gw_events e
where e.tenant_id = public.current_tenant_id()
  and (e.start_date at time zone 'UTC')::date = current_date

union all

-- ─── Today's schedule: course class sessions ───────────────────────────
select
  'schedule'::text                                             as section,
  'session'::text                                              as subtype,
  ('session-' || s.id::text)                                   as id,
  (c.course_code || ' \u2014 '
    || coalesce(s.title, c.title))::text                       as title,
  (to_char(s.start_time, 'HH:MI AM')
    || coalesce(' \u2014 ' || nullif(s.location, ''), ''))::text as detail,
  ((s.session_date + coalesce(s.start_time, '00:00'::time))
    at time zone 'UTC')::timestamptz                            as event_at,
  null::text                                                   as severity,
  jsonb_build_object(
    'course_id', s.course_id,
    'session_id', s.id,
    'session_type', s.session_type,
    'location', s.location,
    'end_time', s.end_time
  )                                                            as meta
from public.gw_course_class_sessions s
join public.gw_courses c on c.id = s.course_id
where s.tenant_id = public.current_tenant_id()
  and s.session_date = current_date

union all

-- ─── Recent announcements ──────────────────────────────────────────────
select
  'announcement'::text                                         as section,
  'announcement'::text                                         as subtype,
  ('ann-' || a.id::text)                                       as id,
  a.title                                                      as title,
  coalesce(left(a.content, 240), '')                           as detail,
  a.publish_date                                               as event_at,
  null::text                                                   as severity,
  jsonb_build_object(
    'announcement_id', a.id,
    'author_id', a.created_by,
    'author_name', (
      select coalesce(full_name, email) from public.gw_profiles p
      where p.user_id = a.created_by limit 1
    ),
    'is_featured', a.is_featured,
    'target_audience', a.target_audience
  )                                                            as meta
from public.gw_announcements a
where a.tenant_id = public.current_tenant_id()
  and a.publish_date >= (now() - interval '14 days')
  and a.publish_date <= now()
  and (a.expire_date is null or a.expire_date > now());

-- Only the authenticated role gets to read the feed. Anon stays out so the
-- view can never be hit without a JWT (and therefore without a tenant).
revoke all on public.v_command_center_feed from public;
grant select on public.v_command_center_feed to authenticated;
