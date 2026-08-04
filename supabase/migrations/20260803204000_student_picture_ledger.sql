-- v_student_ledger: unified view of money owed/paid across 3 source adapters.
-- Money is stored as `numeric` dollars in every source. The contract is
-- `bigint` cents — convert with round(amount * 100), never float arithmetic.
-- gw_invoices (donor invoices), gw_payments (store orders), receipts, and
-- gw_fee_templates are NOT adapted here — none is money a student owes.
-- gw_fee_payment_plans is joined onto the fee row as plan_id enrichment only,
-- never emitted as its own row.

create or replace view student_picture.led_fees
  (user_id, tenant_id, source, source_id, description, amount_cents, direction,
   due_at, paid_at, status, plan_id)
with (security_invoker = on) as
select f.user_id, f.tenant_id, 'fee'::text, f.id,
       coalesce(f.name, f.category, 'Fee')::text,
       round(f.amount * 100)::bigint, 'charge'::text,
       f.due_date::timestamptz,
       coalesce(f.paid_at, f.paid_date::timestamptz),
       -- gw_student_fees.status is CHECK-constrained to exactly:
       --   pending | partial | paid | overdue | refunded | waived
       -- 'refunded' MUST map to waived. If it fell through to 'outstanding'
       -- the assistant would tell a student they owe money that was refunded.
       -- Waived/refunded is tested FIRST so a refunded-but-past-due fee is
       -- not reported as overdue.
       case
         when lower(coalesce(f.status,'')) in ('waived','refunded') then 'waived'
         when lower(coalesce(f.status,'')) = 'paid'
           or coalesce(f.paid_at, f.paid_date::timestamptz) is not null then 'paid'
         when lower(coalesce(f.status,'')) = 'partial' then 'partial'
         when f.due_date is not null and f.due_date < current_date then 'overdue'
         else 'outstanding'
       end,
       pp.id
from public.gw_student_fees f
left join public.gw_fee_payment_plans pp on pp.student_fee_id = f.id
where f.user_id is not null;

create or replace view student_picture.led_payments
  (user_id, tenant_id, source, source_id, description, amount_cents, direction,
   due_at, paid_at, status, plan_id)
with (security_invoker = on) as
select p.user_id, p.tenant_id, 'payment'::text, p.id,
       coalesce(p.notes, p.payment_method, 'Payment')::text,
       round(p.amount * 100)::bigint, 'credit'::text,
       null::timestamptz, p.payment_date::timestamptz, 'paid'::text, null::uuid
from public.user_payments p where p.user_id is not null;

-- finance_records carries both directions in `type`.
create or replace view student_picture.led_finance
  (user_id, tenant_id, source, source_id, description, amount_cents, direction,
   due_at, paid_at, status, plan_id)
with (security_invoker = on) as
select r.user_id, r.tenant_id, 'finance'::text, r.id,
       coalesce(r.description, r.category, 'Ledger entry')::text,
       round(abs(r.amount) * 100)::bigint,
       case when lower(coalesce(r.type,'')) in ('payment','credit','refund')
            then 'credit' else 'charge' end,
       r.date::timestamptz, null::timestamptz,
       case when lower(coalesce(r.type,'')) in ('payment','credit','refund')
            then 'paid' else 'outstanding' end,
       null::uuid
from public.finance_records r where r.user_id is not null;

create or replace view student_picture.v_student_ledger
  (user_id, tenant_id, source, source_id, description, amount_cents, direction,
   due_at, paid_at, status, plan_id)
with (security_invoker = on) as
  select * from student_picture.led_fees
  union all select * from student_picture.led_payments
  union all select * from student_picture.led_finance;

grant select on all tables in schema student_picture to authenticated;
