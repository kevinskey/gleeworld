create or replace function public.sp_assignments(
  p_user_id uuid default null, p_window text default 'week', p_course_id uuid default null)
returns jsonb language plpgsql stable security invoker as $$
declare target uuid := coalesce(p_user_id, auth.uid()); rows jsonb;
begin
  select coalesce(jsonb_agg(to_jsonb(t) order by t.due_at nulls last), '[]'::jsonb)
    into rows from (
    select * from student_picture.v_student_assignments a
     where a.user_id = target
       and (p_course_id is null or a.course_id = p_course_id)
       and case p_window
             when 'week'    then a.due_at between now() and now() + interval '7 days'
             when 'overdue' then a.status = 'missing'
             else true
           end
     limit 200) t;
  return jsonb_build_object(
    'has_data', jsonb_array_length(rows) > 0,
    'scope', case when p_user_id is null or p_user_id = auth.uid() then 'self' else 'other' end,
    'rows', rows);
end $$;

create or replace function public.sp_grades(
  p_user_id uuid default null, p_course_id uuid default null, p_detail text default 'summary')
returns jsonb language plpgsql stable security invoker as $$
declare target uuid := coalesce(p_user_id, auth.uid()); rows jsonb;
begin
  if p_detail = 'all' then
    select coalesce(jsonb_agg(to_jsonb(t) order by t.graded_at desc), '[]'::jsonb) into rows
      from (select * from student_picture.v_student_grades g
             where g.user_id = target
               and (p_course_id is null or g.course_id = p_course_id)
             limit 500) t;
  else
    select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) into rows from (
      select course_id, coalesce(course_name,'Ungrouped') as course_name,
             round(avg(percent), 1) as average_percent, count(*) as graded_items,
             max(graded_at) as last_graded
        from student_picture.v_student_grades g
       where g.user_id = target and g.percent is not null
         and (p_course_id is null or g.course_id = p_course_id)
       group by course_id, course_name) t;
  end if;
  return jsonb_build_object(
    'has_data', jsonb_array_length(rows) > 0,
    'scope', case when p_user_id is null or p_user_id = auth.uid() then 'self' else 'other' end,
    'rows', rows);
end $$;

-- Trend: last N graded items vs the N before. Fewer than 2N items => has_trend false.
create or replace function public.sp_grade_trend(
  p_user_id uuid default null, p_course_id uuid default null, p_window int default 5)
returns jsonb language plpgsql stable security invoker as $$
declare target uuid := coalesce(p_user_id, auth.uid());
        recent numeric; prior numeric; total int;
begin
  with ordered as (
    select percent, row_number() over (order by graded_at desc) as rn
      from student_picture.v_student_grades
     where user_id = target and percent is not null and graded_at is not null
       and (p_course_id is null or course_id = p_course_id))
  select count(*),
         round(avg(percent) filter (where rn <= p_window), 1),
         round(avg(percent) filter (where rn > p_window and rn <= p_window * 2), 1)
    into total, recent, prior from ordered;
  return jsonb_build_object(
    'has_data', total > 0,
    'has_trend', total >= p_window * 2,
    'scope', case when p_user_id is null or p_user_id = auth.uid() then 'self' else 'other' end,
    'graded_items', total, 'window', p_window,
    'recent_average', recent, 'prior_average', prior,
    'delta', case when recent is not null and prior is not null then recent - prior end);
end $$;

create or replace function public.sp_attendance(
  p_user_id uuid default null, p_days int default 120)
returns jsonb language plpgsql stable security invoker as $$
declare target uuid := coalesce(p_user_id, auth.uid()); counts jsonb; recent jsonb;
begin
  select coalesce(jsonb_object_agg(status, n), '{}'::jsonb) into counts from (
    select status, count(*) as n from student_picture.v_student_attendance
     where user_id = target and occurred_at > now() - (p_days || ' days')::interval
     group by status) s;
  select coalesce(jsonb_agg(to_jsonb(t) order by t.occurred_at desc), '[]'::jsonb) into recent
    from (select occurred_at, status, title from student_picture.v_student_attendance
           where user_id = target and status in ('absent','late')
             and occurred_at > now() - (p_days || ' days')::interval
           order by occurred_at desc limit 10) t;
  return jsonb_build_object(
    'has_data', counts <> '{}'::jsonb,
    'scope', case when p_user_id is null or p_user_id = auth.uid() then 'self' else 'other' end,
    'counts', counts, 'recent_misses', recent);
end $$;

create or replace function public.sp_balance(p_user_id uuid default null)
returns jsonb language plpgsql stable security invoker as $$
declare target uuid := coalesce(p_user_id, auth.uid());
        owed bigint; rows jsonb;
begin
  -- Balance is the sum of charges still OPEN. It deliberately does NOT
  -- subtract credit rows: gw_student_fees.status already encodes whether a
  -- charge was settled, and paying a fee does not reliably create a
  -- user_payments row. Netting credits against charges here would
  -- double-count every Stripe-paid fee and overstate the balance.
  -- Known limitation: a 'partial' charge contributes its FULL amount,
  -- because gw_student_fees has no amount-paid column to subtract.
  select coalesce(sum(amount_cents), 0)
    into owed from student_picture.v_student_ledger
   where user_id = target
     and direction = 'charge'
     and status in ('outstanding','overdue','partial');
  select coalesce(jsonb_agg(to_jsonb(t) order by t.due_at nulls last), '[]'::jsonb) into rows
    from (select * from student_picture.v_student_ledger
           where user_id = target and status in ('outstanding','overdue','partial')
           limit 100) t;
  return jsonb_build_object(
    'has_data', jsonb_array_length(rows) > 0 or owed <> 0,
    'scope', case when p_user_id is null or p_user_id = auth.uid() then 'self' else 'other' end,
    'balance_cents', owed, 'open_items', rows);
end $$;

-- Roster flags. RLS decides which students are visible; a member sees only themselves.
create or replace function public.sp_roster_flags(p_flag text)
returns jsonb language plpgsql stable security invoker as $$
declare rows jsonb;
begin
  if p_flag = 'absences' then
    select coalesce(jsonb_agg(to_jsonb(t) order by t.absences desc), '[]'::jsonb) into rows
      from (select user_id, count(*) as absences
              from student_picture.v_student_attendance
             where status = 'absent' and occurred_at > now() - interval '120 days'
             group by user_id having count(*) >= 3 limit 200) t;
  elsif p_flag = 'failing' then
    select coalesce(jsonb_agg(to_jsonb(t) order by t.average_percent), '[]'::jsonb) into rows
      from (select user_id, course_id, round(avg(percent),1) as average_percent
              from student_picture.v_student_grades where percent is not null
             group by user_id, course_id having avg(percent) < 70 limit 200) t;
  elsif p_flag = 'missing_work' then
    select coalesce(jsonb_agg(to_jsonb(t) order by t.missing desc), '[]'::jsonb) into rows
      from (select user_id, count(*) as missing
              from student_picture.v_student_assignments
             where status = 'missing' group by user_id limit 200) t;
  elsif p_flag = 'owes' then
    select coalesce(jsonb_agg(to_jsonb(t) order by t.balance_cents desc), '[]'::jsonb) into rows
      -- Same rule as sp_balance: open charges only, no credit netting.
      -- See the comment there for why subtracting credits double-counts.
      from (select user_id, sum(amount_cents) as balance_cents
              from student_picture.v_student_ledger
             where direction = 'charge'
               and status in ('outstanding','overdue','partial')
             group by user_id
            having sum(amount_cents) > 0 limit 200) t;
  else
    return jsonb_build_object('error', format('unknown flag: %s', p_flag));
  end if;
  return jsonb_build_object('has_data', jsonb_array_length(rows) > 0,
                            'scope','roster','flag',p_flag,'rows',rows);
end $$;

create index if not exists idx_gw_grades_student on public.gw_grades (tenant_id, student_id);
create index if not exists idx_gw_assignments_student on public.gw_assignments (tenant_id, student_id);
create index if not exists idx_gw_assignments_course_due on public.gw_assignments (tenant_id, course_id, due_at);
create index if not exists idx_gw_course_attendance_student on public.gw_course_attendance (tenant_id, student_id);
create index if not exists idx_gw_event_attendance_user on public.gw_event_attendance (tenant_id, user_id);
create index if not exists idx_gw_attendance_records_profile on public.gw_attendance_records (tenant_id, student_profile_id);
create index if not exists idx_gw_student_fees_user on public.gw_student_fees (tenant_id, user_id, status);
create index if not exists idx_gw_course_enrollments_course on public.gw_course_enrollments (course_id, enrollment_status);

grant execute on function public.sp_assignments(uuid,text,uuid) to authenticated;
grant execute on function public.sp_grades(uuid,uuid,text) to authenticated;
grant execute on function public.sp_grade_trend(uuid,uuid,int) to authenticated;
grant execute on function public.sp_attendance(uuid,int) to authenticated;
grant execute on function public.sp_balance(uuid) to authenticated;
grant execute on function public.sp_roster_flags(text) to authenticated;
