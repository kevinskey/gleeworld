-- Task 5 verification. Runs inside a transaction and ALWAYS rolls back.
-- Production constraints that shape this seed, all verified by execution:
--   * user_id has an FK to users(id), so the student is resolved at runtime.
--   * semester and academic_year are both NOT NULL.
--   * semester is CHECK-constrained to a fixed list ending at 'Fall 2026'.
--   * status is CHECK-constrained to
--     pending|partial|paid|overdue|refunded|waived — 'unpaid' is rejected.
--   * finance_records.type is CHECK-constrained to
--     stipend|receipt|payment|debit|credit — 'refund' is rejected.
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

  -- finance_records must never reach the ledger — see the comment in the
  -- migration. A stipend PAID TO a student must not become money they owe.
  -- finance_records.balance is NOT NULL with no default (running balance).
  insert into public.finance_records
      (id, user_id, date, type, category, description, amount, balance, tenant_id)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', v_stu, current_date,
            'stipend', 'Performance Stipends', 'Stipend paid to student',
            250.00, 0, v_tenant);
  if exists (select 1 from student_picture.v_student_ledger
              where source_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') then
    raise exception 'finance_records must not appear in the ledger';
  end if;
  if (public.sp_balance(v_stu)->>'balance_cents')::bigint <> 12050 then
    raise exception 'a stipend must not change the balance; expected 12050, got %',
      public.sp_balance(v_stu)->>'balance_cents';
  end if;

  raise notice 'ALL ASSERTIONS PASSED';
end $$;
rollback;
