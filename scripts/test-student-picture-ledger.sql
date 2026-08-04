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

  -- A refunded fee must NOT be reported as owed. This is the regression guard
  -- for the bug where 'refunded' fell through to overdue.
  insert into public.gw_student_fees
      (id, user_id, amount, due_date, status, semester, academic_year, tenant_id)
    values ('99999999-9999-9999-9999-999999999999', v_stu, 75.00, current_date - 60,
            'refunded', 'Fall 2026', '2026-2027', v_tenant);
  select * into r from student_picture.v_student_ledger
   where source_id = '99999999-9999-9999-9999-999999999999';
  if r.status <> 'waived' then
    raise exception 'a refunded fee must map to waived, got % (it would be counted as owed)', r.status;
  end if;

  -- A negative finance_records amount is money paid TO the person (a stipend,
  -- a reimbursement) and must never be reported as a charge they owe.
  insert into public.finance_records
      (id, user_id, date, type, category, description, amount, tenant_id)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', v_stu, current_date,
            'debit', 'Performance Stipends', 'Stipend paid to student',
            -100.00, v_tenant);
  select * into r from student_picture.v_student_ledger
   where source_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  if r.direction <> 'credit' then
    raise exception 'a negative finance amount must be a credit, got direction % (this would tell the student they OWE money paid TO them)', r.direction;
  end if;
  if r.status <> 'paid' then
    raise exception 'a negative finance amount must be settled, got status %', r.status;
  end if;

  raise notice 'ALL ASSERTIONS PASSED';
end $$;
rollback;
