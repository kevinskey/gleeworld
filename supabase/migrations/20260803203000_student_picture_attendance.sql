-- v_student_attendance: unified view of attendance across 5 source systems.
-- See student_picture schema (Task 1) for student_picture.person_user_id().
-- The pre-aggregated course attendance rollup table is deliberately excluded
-- as a source here — adapting it would double-count every absence.

-- Source vocabularies vary in case and wording. One mapper, used everywhere.
create or replace function student_picture.attendance_status(raw text)
returns text language sql immutable as $$
  select case lower(coalesce(raw,''))
    when 'present' then 'present'
    when 'checked_in' then 'present'
    when 'here' then 'present'
    when 'late' then 'late'
    when 'tardy' then 'late'
    when 'excused' then 'excused'
    when 'excused_absence' then 'excused'
    when 'absent' then 'absent'
    when 'unexcused' then 'absent'
    else 'absent'
  end;
$$;

create or replace view student_picture.att_records
  (user_id, tenant_id, source, session_id, occurred_at, status, title, course_id, excuse_status)
with (security_invoker = on) as
select student_picture.person_user_id(r.student_profile_id), r.tenant_id,
       'session'::text, r.attendance_session_id, r.marked_at,
       student_picture.attendance_status(r.status),
       coalesce(s.title,'Attendance')::text, s.course_id,
       e.status
from public.gw_attendance_records r
left join public.gw_attendance_sessions s on s.id = r.attendance_session_id
left join public.gw_attendance_excuses e on e.attendance_id = r.id
where student_picture.person_user_id(r.student_profile_id) is not null;

create or replace view student_picture.att_course
  (user_id, tenant_id, source, session_id, occurred_at, status, title, course_id, excuse_status)
with (security_invoker = on) as
select a.student_id, a.tenant_id, 'course'::text, a.id,
       a.attendance_date::timestamptz,
       student_picture.attendance_status(a.status),
       coalesce(c.title,'Class')::text, a.course_id, null::text
from public.gw_course_attendance a
left join public.gw_courses c on c.id = a.course_id
where a.student_id is not null;

create or replace view student_picture.att_event
  (user_id, tenant_id, source, session_id, occurred_at, status, title, course_id, excuse_status)
with (security_invoker = on) as
select a.user_id, a.tenant_id, 'event'::text, a.event_id,
       coalesce(a.check_in_time, ev.start_date),
       student_picture.attendance_status(a.attendance_status),
       coalesce(ev.title,'Event')::text, ev.course_id, null::text
from public.gw_event_attendance a
left join public.gw_events ev on ev.id = a.event_id
where a.user_id is not null;

create or replace view student_picture.att_legacy
  (user_id, tenant_id, source, session_id, occurred_at, status, title, course_id, excuse_status)
with (security_invoker = on) as
select a.user_id, a.tenant_id, 'event_legacy'::text, a.event_id,
       coalesce(a.recorded_at, ev.start_date),
       student_picture.attendance_status(a.status),
       coalesce(ev.title,'Event')::text, ev.course_id, null::text
from public.attendance a
left join public.gw_events ev on ev.id = a.event_id
where a.user_id is not null;

-- gw_performance_grades carries a status, not a score — it belongs here, not in grades.
create or replace view student_picture.att_performance
  (user_id, tenant_id, source, session_id, occurred_at, status, title, course_id, excuse_status)
with (security_invoker = on) as
select student_picture.person_user_id(g.student_profile_id), g.tenant_id,
       'performance'::text, g.id, g.performance_date::timestamptz,
       student_picture.attendance_status(g.status),
       coalesce(g.performance_name,'Performance')::text, g.course_id, null::text
from public.gw_performance_grades g
where student_picture.person_user_id(g.student_profile_id) is not null;

create or replace view student_picture.v_student_attendance
  (user_id, tenant_id, source, session_id, occurred_at, status, title, course_id, excuse_status)
with (security_invoker = on) as
  select * from student_picture.att_records
  union all select * from student_picture.att_course
  union all select * from student_picture.att_event
  union all select * from student_picture.att_legacy
  union all select * from student_picture.att_performance;

grant select on all tables in schema student_picture to authenticated;
