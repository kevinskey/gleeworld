\set ON_ERROR_STOP on
begin;
-- Two students in one course; one course-wide assignment, one targeted.
insert into public.gw_courses (id, title, tenant_id)
  values ('11111111-1111-1111-1111-111111111111','Test Choir',
          (select id from public.gw_tenants limit 1));
insert into public.gw_course_enrollments (course_id, user_id, enrollment_status, tenant_id)
  values ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','enrolled',
          (select id from public.gw_tenants limit 1)),
         ('11111111-1111-1111-1111-111111111111','33333333-3333-3333-3333-333333333333','enrolled',
          (select id from public.gw_tenants limit 1));
insert into public.gw_assignments (id, course_id, title, points, due_at, is_active, tenant_id, student_id)
  values ('44444444-4444-4444-4444-444444444444','11111111-1111-1111-1111-111111111111',
          'Course-wide piece', 100, now() + interval '3 days', true,
          (select id from public.gw_tenants limit 1), null),
         ('55555555-5555-5555-5555-555555555555','11111111-1111-1111-1111-111111111111',
          'Just for student two', 50, now() - interval '1 day', true,
          (select id from public.gw_tenants limit 1),'33333333-3333-3333-3333-333333333333');

-- Course-wide assignment must appear for BOTH students.
do $$ declare n int; begin
  select count(*) into n from student_picture.v_student_assignments
   where source_id = '44444444-4444-4444-4444-444444444444';
  if n <> 2 then raise exception 'expected 2 rows for course-wide assignment, got %', n; end if;
end $$;

-- Targeted assignment must appear for exactly one student, and be 'missing' (past due, no submission).
do $$ declare r record; begin
  select user_id, status into r from student_picture.v_student_assignments
   where source_id = '55555555-5555-5555-5555-555555555555';
  if r.user_id <> '33333333-3333-3333-3333-333333333333' then
    raise exception 'targeted assignment leaked to wrong student: %', r.user_id; end if;
  if r.status <> 'missing' then
    raise exception 'expected status missing, got %', r.status; end if;
end $$;
rollback;
