-- v_student_assignments: unified view of assignments across 7 source systems,
-- expanded across the course roster where the source table is course-wide
-- rather than per-student. See student_picture schema (Task 1) for
-- student_picture.person_user_id().

-- Shared status derivation for an assignment/submission pair.
create or replace function student_picture.assignment_status(
  p_submitted_at timestamptz, p_graded_at timestamptz, p_due_at timestamptz)
returns text language sql immutable as $$
  select case
    when p_graded_at is not null then 'graded'
    when p_submitted_at is not null then 'submitted'
    when p_due_at is not null and p_due_at < now() then 'missing'
    else 'not_started'
  end;
$$;

-- 1. gw_assignments — the unified table. student_id null = course-wide.
create or replace view student_picture.asg_gw_assignments
with (security_invoker = on) as
select
  coalesce(a.student_id, e.user_id)              as user_id,
  a.tenant_id,
  'assignments'::text                            as source,
  a.id                                           as source_id,
  a.title,
  a.course_id,
  c.title                                        as course_name,
  a.due_at,
  a.points::numeric                              as points_possible,
  student_picture.assignment_status(s.submitted_at, g.graded_at, a.due_at) as status,
  s.submitted_at
from public.gw_assignments a
left join public.gw_courses c on c.id = a.course_id
left join public.gw_course_enrollments e
       on a.student_id is null
      and e.course_id = a.course_id
      and e.enrollment_status = 'enrolled'
left join public.gw_submissions s
       on s.assignment_id = a.id
      and s.student_id = coalesce(a.student_id, e.user_id)
left join public.gw_grades g
       on g.assignment_id = a.id
      and g.student_id = coalesce(a.student_id, e.user_id)
where a.is_active is not false
  and coalesce(a.student_id, e.user_id) is not null;

-- 2. gw_course_assignments — always course-wide; due_date not due_at.
create or replace view student_picture.asg_course_assignments
with (security_invoker = on) as
select
  e.user_id, a.tenant_id, 'course_assignment'::text, a.id, a.title::text,
  a.course_id, c.title,
  a.due_date, a.points::numeric,
  student_picture.assignment_status(s.submitted_at, s.graded_at, a.due_date),
  s.submitted_at
from public.gw_course_assignments a
left join public.gw_courses c on c.id = a.course_id
join public.gw_course_enrollments e
     on e.course_id = a.course_id and e.enrollment_status = 'enrolled'
left join public.gw_course_submissions s
     on s.assignment_id = a.id and s.student_id = e.user_id
where a.is_published is not false;

-- 3. gw_sight_reading_assignments — points_possible, due_date, course-wide.
create or replace view student_picture.asg_sight_reading
with (security_invoker = on) as
select
  e.user_id, a.tenant_id, 'sight_reading'::text, a.id, a.title,
  a.course_id, c.title,
  a.due_date, a.points_possible::numeric,
  student_picture.assignment_status(s.submitted_at, s.graded_at, a.due_date),
  s.submitted_at
from public.gw_sight_reading_assignments a
left join public.gw_courses c on c.id = a.course_id
join public.gw_course_enrollments e
     on e.course_id = a.course_id and e.enrollment_status = 'enrolled'
left join public.gw_assignment_submissions s
     on s.assignment_id = a.id and s.user_id = e.user_id
where a.is_active is not false;

-- 4. gw_parttrack_assignments — assigned by ensemble/voice_part, no points, no course.
--    Roster comes from profiles matching the voice part in that tenant.
create or replace view student_picture.asg_parttrack
with (security_invoker = on) as
select
  p.user_id, a.tenant_id, 'parttrack'::text, a.id,
  coalesce(sm.title, 'Part track')::text,
  null::uuid, null::text,
  a.due_date::timestamptz, null::numeric,
  student_picture.assignment_status(null, null, a.due_date::timestamptz),
  null::timestamptz
from public.gw_parttrack_assignments a
left join public.gw_sheet_music sm on sm.id = a.score_id
join public.gw_profiles p
     on p.tenant_id = a.tenant_id
    and (a.voice_part is null or p.voice_part = a.voice_part)
where p.user_id is not null;

-- 5. music_fundamentals_assignments — tenant-wide, max_score.
create or replace view student_picture.asg_music_fundamentals
with (security_invoker = on) as
select
  s.student_id, a.tenant_id, 'music_fundamentals'::text, a.id, a.title,
  null::uuid, null::text,
  a.due_date, a.max_score::numeric,
  student_picture.assignment_status(s.submitted_at, s.graded_at, a.due_date),
  s.submitted_at
from public.music_fundamentals_assignments a
join public.music_fundamentals_submissions s on s.assignment_id = a.id
where a.is_active is not false and s.student_id is not null;

-- 6. gw_course_tests — no due date column; available_until is the deadline.
create or replace view student_picture.asg_course_tests
with (security_invoker = on) as
select
  e.user_id, t.tenant_id, 'course_test'::text, t.id, t.title::text,
  t.course_id, c.title,
  t.available_until, t.total_points::numeric,
  student_picture.assignment_status(at.submitted_at,
    case when at.is_graded then at.submitted_at end, t.available_until),
  at.submitted_at
from public.gw_course_tests t
left join public.gw_courses c on c.id = t.course_id
join public.gw_course_enrollments e
     on e.course_id = t.course_id and e.enrollment_status = 'enrolled'
left join public.gw_course_test_attempts at
     on at.test_id = t.id and at.user_id = e.user_id
where t.is_published is not false;

-- 7. glee_academy_tests — course_id is TEXT here, not uuid.
create or replace view student_picture.asg_academy_tests
with (security_invoker = on) as
select
  s.student_id, t.tenant_id, 'academy_test'::text, t.id, t.title,
  null::uuid, null::text,
  t.due_date, t.total_points::numeric,
  student_picture.assignment_status(s.submitted_at, null, t.due_date),
  s.submitted_at
from public.glee_academy_tests t
join public.test_submissions s on s.test_id = t.id
where t.is_published is not false and s.student_id is not null;

-- Union
create or replace view student_picture.v_student_assignments
with (security_invoker = on) as
  select * from student_picture.asg_gw_assignments
  union all select * from student_picture.asg_course_assignments
  union all select * from student_picture.asg_sight_reading
  union all select * from student_picture.asg_parttrack
  union all select * from student_picture.asg_music_fundamentals
  union all select * from student_picture.asg_course_tests
  union all select * from student_picture.asg_academy_tests;

grant select on all tables in schema student_picture to authenticated;
