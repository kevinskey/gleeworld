-- record_fee_payment() has always read gw_student_fees.paid_amount, but the
-- column was only ever added to gw_fee_plan_installments. Recording any fee
-- payment therefore failed with `column "paid_amount" does not exist`.
-- Zero fees exist today, so no data is at risk; the backfill below is written
-- to be correct if that changes before this is applied.
alter table public.gw_student_fees
  add column if not exists paid_amount numeric(10,2) not null default 0;

-- A fee already marked paid is fully paid; make the new column agree with the
-- status column that has been the source of truth until now.
update public.gw_student_fees
   set paid_amount = amount
 where paid_amount = 0
   and (lower(coalesce(status,'')) = 'paid' or paid_at is not null or paid_date is not null);

comment on column public.gw_student_fees.paid_amount is
  'Running total paid against this fee. Maintained by record_fee_payment(). status stays the coarse indicator; this is the exact figure.';
