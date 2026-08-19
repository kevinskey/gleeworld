\set ON_ERROR_STOP on
do $$ declare j jsonb; begin
  j := public.sp_assignments(null, 'week', null);
  if not (j ? 'has_data' and j ? 'scope' and j ? 'rows') then
    raise exception 'contract missing keys: %', j; end if;
  if j->>'scope' <> 'self' then
    raise exception 'null p_user_id must be scope=self, got %', j->>'scope'; end if;
  j := public.sp_assignments('99999999-9999-9999-9999-999999999999','week',null);
  if j->>'scope' <> 'other' then
    raise exception 'explicit other user must be scope=other, got %', j->>'scope'; end if;
end $$;

-- Trend windowing. Seeded with known values so the arithmetic is checked,
-- not just the envelope shape. Runs in a transaction and always rolls back.
-- Case 1: 10 graded items — the 5 most recent score 70, the 5 before 90.
--         Expect recent=70, prior=90, delta=-20, has_trend=true.
-- Case 2: 9 graded items — one short of the 2x window.
--         Expect has_data=true but has_trend=false, so the assistant says it
--         does not have enough graded work rather than inventing a direction.
begin;
do $$
declare
  v_tenant uuid; v_stu uuid; c_course uuid := gen_random_uuid();
  a uuid; i int; pct numeric; j jsonb;
begin
  select id into v_tenant from public.gw_tenants limit 1;
  select user_id into v_stu from public.gw_profiles
   where user_id is not null order by id limit 1;

  insert into public.gw_courses (id, code, title, tenant_id)
    values (c_course, 'TREND1', 'Trend Course', v_tenant);
  for i in 1..10 loop
    a := gen_random_uuid();
    insert into public.gw_assignments
        (id, course_id, title, points, due_at, is_active, tenant_id, created_by)
      values (a, c_course, 'Item '||i, 100, now(), true, v_tenant, v_stu);
    pct := case when i <= 5 then 70 else 90 end;
    insert into public.gw_grades
        (id, assignment_id, student_id, total_score, max_points, graded_at, tenant_id)
      values (gen_random_uuid(), a, v_stu, pct, 100, now() - (i || ' days')::interval, v_tenant);
  end loop;

  j := public.sp_grade_trend(v_stu, c_course, 5);
  if not (j->>'has_trend')::boolean then
    raise exception '10 graded items must produce a trend, got has_trend=%', j->>'has_trend';
  end if;
  if (j->>'recent_average')::numeric <> 70 then
    raise exception 'recent_average should be 70, got %', j->>'recent_average';
  end if;
  if (j->>'prior_average')::numeric <> 90 then
    raise exception 'prior_average should be 90, got %', j->>'prior_average';
  end if;
  if (j->>'delta')::numeric <> -20 then
    raise exception 'delta should be -20, got %', j->>'delta';
  end if;
  raise notice 'TREND MATH CORRECT (10 items)';
end $$;
rollback;

begin;
do $$
declare
  v_tenant uuid; v_stu uuid; c_course uuid := gen_random_uuid();
  a uuid; i int; j jsonb;
begin
  select id into v_tenant from public.gw_tenants limit 1;
  select user_id into v_stu from public.gw_profiles
   where user_id is not null order by id limit 1;

  insert into public.gw_courses (id, code, title, tenant_id)
    values (c_course, 'TREND2', 'Nine Items', v_tenant);
  for i in 1..9 loop
    a := gen_random_uuid();
    insert into public.gw_assignments
        (id, course_id, title, points, due_at, is_active, tenant_id, created_by)
      values (a, c_course, 'Item '||i, 100, now(), true, v_tenant, v_stu);
    insert into public.gw_grades
        (id, assignment_id, student_id, total_score, max_points, graded_at, tenant_id)
      values (gen_random_uuid(), a, v_stu, 80, 100, now() - (i || ' days')::interval, v_tenant);
  end loop;

  j := public.sp_grade_trend(v_stu, c_course, 5);
  if (j->>'has_trend')::boolean then
    raise exception '9 graded items must NOT report a trend (needs 10)';
  end if;
  if not (j->>'has_data')::boolean then
    raise exception '9 graded items is still data, has_data was false';
  end if;
  raise notice 'BOUNDARY CORRECT (9 items = data, no trend)';
end $$;
rollback;
