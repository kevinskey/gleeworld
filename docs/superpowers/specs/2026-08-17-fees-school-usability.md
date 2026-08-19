# Fees for Schools — Usability Spec

**Date:** 2026-08-17
**Origin:** Assessment of the Student Fees add-on through the lens of a middle
school teacher collecting participation fees, fundraiser money, and trip fees.

## Problem

The fees feature assumes the payer is the student, logged in, with a card.
In schools the payer is a parent with neither. Several flows the UI points at
(waive, refund, one-off fees, offline payment instructions) have backend
support but no UI. Admin surfaces don't scale to a class roster.

**Security finding (must fix):** `record_fee_payment`, `waive_fee`,
`refund_fee`, and `assign_fee_template` are SECURITY DEFINER, granted to
`authenticated`, tenant-filtered but **not role-gated** — any student can mark
their own fee paid or waive it. The fix must keep the Stripe webhook working
(it calls `record_fee_payment` with the service-role key).

## Requirements

1. **Parent-payable link.** Each fee row gets a `guest_pay_token`. A public
   page `/pay/fee/:feeId?token=…` shows the fee and either a Stripe checkout
   button (tenant has Connect) or offline payment instructions. Admin rows get
   "Copy pay link". Daily reminder cron additionally emails the member (via
   Resend, same dedupe window as in-app notifications) with the link, noting
   parents can pay from it directly.
2. **Roster-scale admin.** Assign dialog: select-all-filtered + students-only
   default filter. Individual fees list: name search, status filter,
   multi-select with bulk mark-paid, CSV export (who owes what).
3. **Installments that work.** Per-installment Pay buttons (backend already
   supports `paymentType: 'installment'`). Students can self-split an eligible
   fee into 2/3/4 monthly installments (honoring `allow_self_serve_split`).
4. **Waive / refund / one-off fee UI.** Row action menu with Mark paid, Waive
   (note), Refund (note), Copy pay link, Delete. "+ Individual fee" button for
   one-off charges (lost folder, etc.).
5. **Fee settings card + wording.** Admin UI writing `gw_tenant_fee_settings`
   (contact info, accepted offline methods). Student-facing "Contact your
   treasurer" becomes school-neutral "How to pay" wording.
6. **School categories.** Add `participation` and `fundraiser` to the category
   CHECK constraints on `gw_student_fees` and `gw_fee_templates` and to all
   category UI.

## Non-goals

- Fundraiser pledge/per-item-sale mechanics (separate feature).
- Parent accounts. The tokenized link is the parent channel.
- Materializing template-defined installment schedules per student.

## Deployment reality (self-hosted)

- Migrations applied manually via psql as `supabase_admin` (no
  `schema_migrations` table on the droplet).
- Edge functions live in `/opt/supabase/volumes/functions/` on the droplet.
- Frontend deploys ONLY via `scripts/deploy-frontend.sh`.
