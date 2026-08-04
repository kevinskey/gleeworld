-- Task 3 verification. Runs inside a transaction and ALWAYS rolls back.
-- Three production constraints shape this seed, all verified by execution:
--   1. gw_grades.student_id has an FK to users(id) — fake uuids are rejected,
--      so the student is resolved from a real gw_profiles row at runtime.
--   2. gw_grades.percentage is a GENERATED column — it cannot be inserted into.
--      It computes from total_score/max_points; the assertion below reads it back.
--   3. gw_grades.assignment_id is NOT NULL, so a real course + assignment must
--      exist first. gw_courses.code and gw_assignments.created_by are required by
--      BEFORE/AFTER INSERT triggers (calendar creation and event sync).
\set ON_ERROR_STOP on
begin;
do $$
declare
  v_tenant uuid; v_stu uuid;
  c_course uuid := '11111111-1111-1111-1111-111111111111';
  c_asg    uuid := '44444444-4444-4444-4444-444444444444';
  c_grade  uuid := '66666666-6666-6666-6666-666666666666';
  r record;
begin
  select id into v_tenant from public.gw_tenants limit 1;
  select user_id into v_stu from public.gw_profiles
   where user_id is not null order by id limit 1;

  insert into public.gw_courses (id, code, title, tenant_id)
    values (c_course, 'TEST101', 'Test Choir', v_tenant);
  insert into public.gw_assignments
      (id, course_id, title, points, due_at, is_active, tenant_id, created_by)
    values (c_asg, c_course, 'Graded piece', 100, now(), true, v_tenant, v_stu);
  insert into public.gw_grades
      (id, assignment_id, student_id, total_score, max_points, letter_grade, graded_at, tenant_id)
    values (c_grade, c_asg, v_stu, 85, 100, 'B', now(), v_tenant);

  select * into r from student_picture.v_student_grades where source_id = c_grade;
  if r.user_id is null then
    raise exception 'grade did not surface in v_student_grades at all';
  end if;
  if r.user_id <> v_stu then
    raise exception 'grade attributed to wrong user: % (expected %)', r.user_id, v_stu;
  end if;
  if round(r.percent) <> 85 then
    raise exception 'expected percent 85, got %', r.percent;
  end if;
  if r.is_final then
    raise exception 'gw_grades rows are not final grades, but is_final was true';
  end if;
  if r.title <> 'Graded piece' then
    raise exception 'expected assignment title to carry through, got %', r.title;
  end if;

  raise notice 'ALL ASSERTIONS PASSED';
end $$;
rollback;
