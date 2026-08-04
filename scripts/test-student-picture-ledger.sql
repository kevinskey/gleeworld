-- Task 5 verification. Runs inside a transaction and ALWAYS rolls back.
-- Production constraints that shape this seed, all verified by execution:
--   * user_id has an FK to users(id), so the student is resolved at runtime.
--   * semester and academic_year are both NOT NULL.
--   * semester is CHECK-constrained to a fixed list ending at 'Fall 2026'.
--   * status is CHECK-constrained to
--     pending|partial|paid|overdue|refunded|waived — 'unpaid' is rejected.
\set ON_ERROR_STOP on
begin;
do $$
declare
  v_tenant uuid; v_stu uuid;
  c_fee uuid := '88888888-8888-8888-8888-888888888888';
  r record;
begin
  select id into v_tenant from public.gw_tenants limit 1;
  select user_id into v_stu from public.gw_profiles
   where user_id is not null order by id limit 1;

  insert into public.gw_student_fees
      (id, user_id, amount, due_date, status, semester, academic_year, tenant_id)
    values (c_fee, v_stu, 120.50, current_date - 30, 'pending',
            'Fall 2026', '2026-2027', v_tenant);

  select * into r from student_picture.v_student_ledger where source_id = c_fee;
  if r.user_id is null then
    raise exception 'fee did not surface in v_student_ledger';
  end if;
  if r.user_id <> v_stu then
    raise exception 'fee attributed to wrong user: % (expected %)', r.user_id, v_stu;
  end if;
  -- Money is numeric dollars at the source and bigint cents in the contract.
  if r.amount_cents <> 12050 then
    raise exception 'expected 12050 cents, got %', r.amount_cents;
  end if;
  if r.status <> 'overdue' then
    raise exception 'a pending fee 30 days past due must be overdue, got %', r.status;
  end if;
  if r.direction <> 'charge' then
    raise exception 'fees are charges, got direction %', r.direction;
  end if;

  raise notice 'ALL ASSERTIONS PASSED';
end $$;
rollback;
