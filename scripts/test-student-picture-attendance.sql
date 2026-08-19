-- Task 4 verification. Runs inside a transaction and ALWAYS rolls back.
-- The student is resolved from a real gw_profiles row at runtime; several
-- attendance sources have FKs to users(id) that reject synthetic uuids.
-- The assertion checks status NORMALIZATION: the source stores 'Absent'
-- (capitalised) and the contract requires lowercase 'absent'.
\set ON_ERROR_STOP on
begin;
do $$
declare
  v_tenant uuid; v_stu uuid;
  c_att uuid := '77777777-7777-7777-7777-777777777777';
  r record;
begin
  select id into v_tenant from public.gw_tenants limit 1;
  select user_id into v_stu from public.gw_profiles
   where user_id is not null order by id limit 1;

  insert into public.gw_course_attendance
      (id, course_id, student_id, attendance_date, status, tenant_id)
    values (c_att, null, v_stu, current_date, 'Absent', v_tenant);

  select * into r from student_picture.v_student_attendance where session_id = c_att;
  if r.user_id is null then
    raise exception 'attendance row did not surface in v_student_attendance';
  end if;
  if r.user_id <> v_stu then
    raise exception 'attendance attributed to wrong user: % (expected %)', r.user_id, v_stu;
  end if;
  if r.status <> 'absent' then
    raise exception 'status not normalized to lowercase: %', r.status;
  end if;

  raise notice 'ALL ASSERTIONS PASSED';
end $$;
rollback;
