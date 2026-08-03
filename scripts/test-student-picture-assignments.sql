-- Task 2 verification. Runs inside a transaction and ALWAYS rolls back.
-- Student ids are resolved from real gw_profiles rows because
-- gw_assignments.student_id has a foreign key to users(id) — fake uuids are rejected.
-- gw_courses.code and gw_assignments.created_by are required by BEFORE/AFTER
-- INSERT triggers (calendar creation and event sync respectively).
\set ON_ERROR_STOP on
begin;
do $$
declare
  v_tenant uuid; v_stu1 uuid; v_stu2 uuid; v_author uuid;
  c_course uuid := '11111111-1111-1111-1111-111111111111';
  c_wide   uuid := '44444444-4444-4444-4444-444444444444';
  c_target uuid := '55555555-5555-5555-5555-555555555555';
  n int; r record;
begin
  select id into v_tenant from public.gw_tenants limit 1;
  select user_id into v_stu1 from public.gw_profiles
   where user_id is not null order by id limit 1;
  select user_id into v_stu2 from public.gw_profiles
   where user_id is not null and user_id <> v_stu1 order by id limit 1;
  v_author := v_stu1;

  insert into public.gw_courses (id, code, title, tenant_id)
    values (c_course, 'TEST101', 'Test Choir', v_tenant);
  insert into public.gw_course_enrollments (course_id, user_id, enrollment_status, tenant_id)
    values (c_course, v_stu1, 'enrolled', v_tenant),
           (c_course, v_stu2, 'enrolled', v_tenant);
  insert into public.gw_assignments
      (id, course_id, title, points, due_at, is_active, tenant_id, student_id, created_by)
    values (c_wide,   c_course, 'Course-wide piece',    100, now() + interval '3 days', true, v_tenant, null,   v_author),
           (c_target, c_course, 'Just for student two',  50, now() - interval '1 day',  true, v_tenant, v_stu2, v_author);

  -- A course-wide assignment (student_id null) must fan out to BOTH enrolled students.
  select count(*) into n from student_picture.v_student_assignments where source_id = c_wide;
  if n <> 2 then
    raise exception 'expected 2 rows for course-wide assignment, got %', n;
  end if;

  -- A targeted assignment must reach exactly its one student, and be missing (past due, unsubmitted).
  select count(*) into n from student_picture.v_student_assignments where source_id = c_target;
  if n <> 1 then
    raise exception 'expected 1 row for targeted assignment, got %', n;
  end if;
  select user_id, status into r from student_picture.v_student_assignments where source_id = c_target;
  if r.user_id <> v_stu2 then
    raise exception 'targeted assignment leaked to wrong student: % (expected %)', r.user_id, v_stu2;
  end if;
  if r.status <> 'missing' then
    raise exception 'expected status missing, got %', r.status;
  end if;

  raise notice 'ALL ASSERTIONS PASSED';
end $$;
rollback;
