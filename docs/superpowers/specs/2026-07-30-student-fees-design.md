# Student Fees — Design

**Date:** 2026-07-30
**Status:** Implemented (pending deploy) — 2026-07-30
**Author:** Claude + Kevin

## Problem

GleeWorld tenants need to collect money from their students for dues, wardrobe fees, trip fees, and travel fees. Each student's account must hold their fee data (what they owe, what they've paid, what's overdue). Today the platform can only:

- Track dues (admin-only surface, no student self-pay in production)
- Sell tickets via Box Office (Stripe Connect works)
- Sell platform-owned merch (not tenant-scoped)

Everything else — dues collection, wardrobe fees, trip deposits, travel fees — is manual (Venmo / check) with admins marking rows paid by hand. There is no student-facing "here is what I owe" surface.

## Goals

1. One ledger per student showing every fee they owe across all categories.
2. Admins create fees in the context where the fee is defined (Wardrobe screen → wardrobe fee; Tour Manager trip → trip fee; generalized Fees admin → dues + one-offs).
3. Students self-pay via Stripe Connect (money goes to the tenant's Stripe account, not GleeWorld's) when the tenant has Connect enabled.
4. Manual payment tracking (cash / check / Venmo) always available so tenants without Connect can still use the ledger day one.
5. Admin-defined installment schedules for trip fees (cash-flow-critical) plus self-serve 2/5/10-way splits for dues.
6. Bulk assignment to a subset of members (trip attendees, wardrobe recipients), not just "all members" like the current dues code.

## Non-goals (v1)

- Late fees / interest accrual
- Multi-currency (USD only)
- Partial refunds (full refunds only)
- Fee waiver approval workflow (v1: admin sets `status='waived'` with a note)
- Auto-debit / stored payment methods
- Donations / fundraising (separate feature — InvoiceMaker's domain)
- Family / household billing (one member = one payer)

## Existing groundwork we reuse

- `gw_dues_records`, `gw_dues_payment_plans`, `gw_payment_plan_installments`, `gw_dues_reminders` — real schema, real data
- `create-dues-payment` / `verify-dues-payment` edge functions — real Stripe checkout logic (currently platform Stripe, will move to Connect)
- `useDuesManagement` hook — bulk create, mark paid, reminders, notification integration
- `/dues-management` page + `DuesManager` + `CreateDuesRecord` components — admin surface
- Box Office Stripe Connect infrastructure — `stripe_account_id`, `stripe_charges_enabled`, `stripe_payouts_enabled` on `gw_tenants`
- `WardrobeCheckoutSystem` — existing wardrobe issue flow
- Tour Manager trip detail pages + attendee lists

## Architecture

### Data model

All tables tenant-scoped: `tenant_id uuid NOT NULL DEFAULT current_tenant_id()` + BEFORE INSERT trigger + RESTRICTIVE RLS policy. This matches the platform standard (per `reference_gleeworld_multitenant.md`).

**`gw_fee_templates`** — the reusable "this fee exists" definition.
```
id                     uuid PK
tenant_id              uuid NOT NULL DEFAULT current_tenant_id()
category               text NOT NULL CHECK (category IN ('dues','wardrobe','trip','travel','other'))
name                   text NOT NULL
description            text
total_amount           numeric(10,2) NOT NULL
currency               text NOT NULL DEFAULT 'USD'
due_date               date
allow_self_serve_split boolean NOT NULL DEFAULT true
context_type           text CHECK (context_type IN ('trip','wardrobe_item','semester') OR context_type IS NULL)
context_id             uuid                          -- FK-in-spirit: trip id, wardrobe item id, etc.
created_by             uuid NOT NULL
created_at             timestamptz NOT NULL DEFAULT now()
updated_at             timestamptz NOT NULL DEFAULT now()
archived_at            timestamptz
```

**`gw_fee_template_installments`** — present only when admin defines a required schedule.
```
id             uuid PK
template_id    uuid NOT NULL REFERENCES gw_fee_templates(id) ON DELETE CASCADE
tenant_id      uuid NOT NULL DEFAULT current_tenant_id()
sequence       int  NOT NULL              -- 1, 2, 3…
amount         numeric(10,2) NOT NULL
due_date       date NOT NULL
UNIQUE (template_id, sequence)
```

**`gw_student_fees`** — the per-student ledger row. Renamed from `gw_dues_records` with new columns.
```
id                        uuid PK
tenant_id                 uuid NOT NULL DEFAULT current_tenant_id()
user_id                   uuid NOT NULL
template_id               uuid REFERENCES gw_fee_templates(id) ON DELETE SET NULL  -- nullable for one-offs
category                  text NOT NULL CHECK (category IN ('dues','wardrobe','trip','travel','other'))
name                      text NOT NULL                                             -- denormalized from template
amount                    numeric(10,2) NOT NULL
paid_amount               numeric(10,2) NOT NULL DEFAULT 0
due_date                  date
status                    text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','partial','paid','overdue','refunded','waived'))
payment_method            text CHECK (payment_method IN ('stripe','cash','check','venmo','other') OR payment_method IS NULL)
payment_reference         text                                                      -- check #, venmo handle, etc.
stripe_payment_intent_id  text
notes                     text
context_type              text
context_id                uuid
created_by                uuid NOT NULL
created_at                timestamptz NOT NULL DEFAULT now()
updated_at                timestamptz NOT NULL DEFAULT now()
paid_at                   timestamptz
```

**`gw_fee_payment_plans`** — renamed from `gw_dues_payment_plans`, FK repointed.
```
id                  uuid PK
tenant_id           uuid NOT NULL DEFAULT current_tenant_id()
student_fee_id      uuid NOT NULL REFERENCES gw_student_fees(id) ON DELETE CASCADE   -- renamed from dues_record_id
user_id             uuid NOT NULL
total_amount        numeric(10,2) NOT NULL
installments        int NOT NULL
installment_amount  numeric(10,2) NOT NULL
frequency           text NOT NULL
start_date          date NOT NULL
end_date            date NOT NULL
status              text NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','cancelled'))
source              text NOT NULL DEFAULT 'self_serve' CHECK (source IN ('self_serve','admin_defined'))
created_at          timestamptz NOT NULL DEFAULT now()
updated_at          timestamptz NOT NULL DEFAULT now()
```

**`gw_fee_plan_installments`** — renamed from `gw_payment_plan_installments`.
```
id                        uuid PK
tenant_id                 uuid NOT NULL DEFAULT current_tenant_id()
payment_plan_id           uuid NOT NULL REFERENCES gw_fee_payment_plans(id) ON DELETE CASCADE
installment_number        int NOT NULL
amount                    numeric(10,2) NOT NULL
due_date                  date NOT NULL
status                    text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','overdue'))
paid_amount               numeric(10,2) NOT NULL DEFAULT 0
paid_at                   timestamptz
stripe_payment_intent_id  text
created_at                timestamptz NOT NULL DEFAULT now()
updated_at                timestamptz NOT NULL DEFAULT now()
UNIQUE (payment_plan_id, installment_number)
```

**`gw_fee_reminders`** — renamed from `gw_dues_reminders`. Schema unchanged except FK column renamed `dues_record_id` → `student_fee_id`.

**`gw_tenant_fee_settings`** — one row per tenant, holds fee-collection preferences.
```
tenant_id                  uuid PK REFERENCES gw_tenants(id) ON DELETE CASCADE
accepted_manual_methods    text[] NOT NULL DEFAULT ARRAY['cash','check']
treasurer_contact_name     text
treasurer_contact_email    text
treasurer_contact_phone    text
statement_descriptor       text                            -- optional Stripe override (follow-up work)
created_at                 timestamptz NOT NULL DEFAULT now()
updated_at                 timestamptz NOT NULL DEFAULT now()
```
Shown to students on `/dashboard/my-fees` when the tenant does NOT have Stripe Connect enabled.

### Template edit rules

Editing a template only propagates changes to `gw_student_fees` rows where `status='pending'`. Rows with `status IN ('partial','paid','refunded','waived')` are frozen — their denormalized `name`/`amount`/`due_date` stay as they were. Enforced in the update RPC, not at the DB level (so admins can still hand-edit a paid row if they need to).

### Money flow

**Two paths, one row.** Every fee row can be paid either way. The distinction is captured in `payment_method`.

**Stripe Connect path (student self-pay):**
1. Student on `/dashboard/my-fees` clicks "Pay $500" on a fee.
2. Frontend calls new `create-fee-payment` edge function with `{ studentFeeId, paymentType: 'full' | 'installment', installmentId? }`.
3. Edge function loads the fee, verifies `user_id` matches, loads the tenant, verifies `stripe_charges_enabled=true`, then creates a Stripe Checkout Session with:
   - `payment_intent_data.application_fee_amount = 0` (matches Box Office 0% policy per `reference_stripe_account.md`)
   - `payment_intent_data.transfer_data.destination = tenant.stripe_account_id`
   - Metadata: `student_fee_id`, `tenant_id`, `user_id`, `payment_type`, `installment_id?`
4. Student completes checkout. Stripe fires `checkout.session.completed` webhook.
5. `verify-fee-payment` webhook handler (new function, wired into the platform Stripe Connect webhook endpoint alongside Box Office) marks the fee `status='paid'`, records `payment_method='stripe'`, `stripe_payment_intent_id`, `paid_amount`, `paid_at`. If it was an installment, marks the plan installment paid + advances plan status.

**Manual path (admin records offline payment):**
1. Admin on `/dashboard/fees` clicks "Mark paid" on a row.
2. Dialog: method (cash / check / venmo / other), reference (optional), amount (defaults to full).
3. RPC updates the row: `status='paid'` (or `'partial'` if amount < remaining), `payment_method='cash'|'check'|…`, `payment_reference`, `paid_amount += amount`, `paid_at=now()`.

**Refunds (v1, full only):**
- **Stripe:** admin action calls Stripe `refunds.create({ payment_intent })`, then flips row to `refunded`.
- **Manual:** admin flips row to `refunded` with a note (no Stripe call).

### Access to Stripe Connect status

New helper hook `useTenantStripeConnect()` returns `{ enabled: boolean, accountId: string | null, chargesEnabled: boolean, payoutsEnabled: boolean }` by reading the current tenant's columns on `gw_tenants`. Existing Box Office code already reads these; we just factor into a shared hook.

## Surfaces

### Student — `/dashboard/my-fees`

**Layout:** DashboardPageShell with three sections:
1. **"You owe $X"** — big card at top. Sum of unpaid + partial. If tenant has Connect: "Pay now" button. If not: shows tenant contact info + accepted payment methods (from a new `gw_tenant_fee_settings.accepted_manual_methods` field, defaults to "cash, check").
2. **Unpaid list** — sorted by due date ascending. Each row: name, category badge, amount, due date, "Pay" button (Stripe) OR "Awaiting recording" tag (no Connect). Rows with an active payment plan show inline installment schedule with pay-per-installment buttons.
3. **History** — paid + refunded rows, most recent first.

**Home card (HouseHome):** conditionally rendered when `unpaid_balance > 0`. Compact: "You owe $X across N items · Pay now →". Deep-links to `/dashboard/my-fees`.

### Admin — `/dashboard/fees` (renamed from `/dues-management`)

**Tabs:** `All | Dues | Wardrobe | Trips | Travel | Other`.

Each tab shows:
- Top: templates (list of "fee definitions" with rollup — `$12,500 / $20,000 collected · 25/40 paid`).
- Bottom: instances (individual `gw_student_fees` rows across all students for that category).

**Actions:**
- Create template (opens shared `CreateFeeTemplateDialog`)
- Assign template to members (bulk multi-select, filter by section/role/tag/attendance list)
- Mark paid (manual)
- Refund
- Waive
- Send reminder

**Old route `/dues-management` → 301 to `/dashboard/fees`.**

### Wardrobe — inline fee creation

Existing `WardrobeCheckoutSystem` gets a new "Charge fee for this item" section. When checked, admin picks a fee template (category=wardrobe, filtered to non-archived) OR creates one inline (amount + due date + name). On submit, wardrobe item is issued + a `gw_student_fees` row is created with `template_id`, `context_type='wardrobe_item'`, `context_id=<wardrobe_item_id>`.

### Tour Manager — trip Fees tab

New Fees tab on the trip detail page. Shows:
- Templates linked to this trip (`context_type='trip'`, `context_id=<trip_id>`)
- Rollup per template
- "Create trip fee" button — pre-fills `context_type='trip'`, `context_id`, category=`trip`, and offers admin-defined installment schedule editor
- "Assign to attendees" — multi-select from the trip's attendee list (only members who are already trip attendees)

## Notifications

Generalize the existing dues reminder machinery:
- `gw_notifications.type` values `dues_reminder` continue to work; add `fee_reminder` alias
- Reuse `gw_fee_reminders` (renamed) for scheduled reminders
- Auto-create reminders on fee row creation: 7 days before due, on due date, 3 days overdue
- Reminders link to `/dashboard/my-fees` deep-linked to the specific fee row

## Migration path

One migration file, done in one shot (no shim — feature isn't yet exposed):

1. **Rename tables:**
   - `gw_dues_records` → `gw_student_fees`
   - `gw_dues_payment_plans` → `gw_fee_payment_plans`
   - `gw_payment_plan_installments` → `gw_fee_plan_installments`
   - `gw_dues_reminders` → `gw_fee_reminders`
2. **Add new columns to `gw_student_fees`:** `template_id`, `category` (default `'dues'`), `name` (default `'Dues'`), `paid_amount` (default 0), `payment_reference`, `stripe_payment_intent_id`, `context_type`, `context_id`, `created_by`. Backfill `name` from `semester`+`academic_year` where present.
3. **Rename FK columns:**
   - `gw_fee_payment_plans.dues_record_id` → `student_fee_id`
   - `gw_fee_reminders.dues_record_id` → `student_fee_id`
4. **Add `source` column to `gw_fee_payment_plans`** (default `'self_serve'` for existing rows).
5. **Create new tables:** `gw_fee_templates`, `gw_fee_template_installments`, `gw_tenant_fee_settings`.
6. **Add RLS policies + BEFORE INSERT triggers** on new tables (using the platform standard).
7. **Update all existing hooks and components** to reference the new table names — `useDuesManagement` → `useFeesManagement`, `DuesManager` → `FeesManager`, etc. Keep dues-specific bulk helper (`createDuesForSemester`) but move it under the Dues tab of the Fees admin surface.
8. **Rename edge functions:**
   - `create-dues-payment` → `create-fee-payment`
   - `verify-dues-payment` → `verify-fee-payment`
9. **Rewrite edge functions** to use Stripe Connect destination charges instead of platform Stripe.
10. **Add route redirect** `/dues-management` → `/dashboard/fees`.

## Testing strategy

- **DB migration:** run migration on a scratch DB, verify existing dues records still readable, verify RLS blocks cross-tenant access.
- **Stripe Connect path:** end-to-end test on a test tenant with Stripe test-mode Connect account. Create fee → student pays → webhook flips row → verify state.
- **Manual path:** unit tests on the RPC — full mark-paid, partial payment (row goes to `'partial'`), overpayment rejection, refund flow.
- **Template edit propagation:** test that editing a template updates pending rows only, leaves paid rows frozen.
- **Bulk assignment:** admin creates template + assigns to 40 test users, verify 40 rows created with correct tenant_id / user_id / template_id.
- **Tenant isolation:** create fee on tenant A, verify tenant B cannot see it via any surface (student page, admin page, RPC).
- **Playwright E2E** (per `reference_gleeworld_e2e_harness.md`): student flow — log in as `demo@`, navigate to `/dashboard/my-fees`, see the owed balance, click Pay, complete Stripe test checkout, verify row flips to paid.

## Open questions

None blocking. Deferred:
- Whether `gw_tenant_fee_settings` should also hold Stripe statement descriptor override (probably yes but tackle in a follow-up).
- Whether admin can "un-refund" (probably no — refund is terminal, use waive instead).
