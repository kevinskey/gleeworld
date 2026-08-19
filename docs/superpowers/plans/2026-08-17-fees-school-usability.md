# Fees for Schools Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Student Fees add-on usable by a school teacher: parent-payable links, roster-scale admin tools, working installments, waive/refund/one-off UI, fee settings, school categories — and close the RPC role-gate hole.

**Architecture:** One migration carries all schema + RPC changes. A new unauthenticated edge function (`guest-fee-checkout`) powers a public `/pay/fee/:feeId` page using the fee row's `guest_pay_token` as a capability. Admin/student UI changes stay inside the existing `FeesAdminPage` / `MyFeesPage` component families. Pure list/CSV logic is extracted to `src/lib/fees/` for unit testing.

**Tech Stack:** React 18 + TS, shadcn, Supabase JS, Deno edge functions, Stripe Connect direct charges, Resend, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-17-fees-school-usability.md`

## Global Constraints

- Migrations: new file only, never edit historical ones. Droplet apply = psql as `supabase_admin` (no schema_migrations).
- All new SECURITY DEFINER paths must filter `tenant_id = current_tenant_id()` (project rule from PR #375 review).
- RPC role gate must allow `auth.role() = 'service_role'` (webhook calls `record_fee_payment`).
- Never re-enable `application_fee_amount > 0` (Kevin's standing rule).
- `gw_tenant_fee_settings` has **no tenant_id auto-fill trigger** — inserts must supply `tenant_id` explicitly; upserts use `onConflict: 'tenant_id'`.
- Tenant-neutral, school-friendly copy: "students", never "singers"/"members"; avoid "treasurer" in student-facing copy.
- Typecheck gate is `npm run typecheck:guard` (baseline diff); tests via `npx vitest run <file>`.
- Frontend deploy only via `scripts/deploy-frontend.sh`; no `rsync --delete`.

---

### Task 1: Migration — categories, guest token, RPC role gates, settings write policy

**Files:**
- Create: `supabase/migrations/20260817090000_fees_school_usability.sql`

**Interfaces:**
- Produces: `gw_student_fees.guest_pay_token uuid` (later tasks read it); categories `participation`, `fundraiser` valid on both tables; `record_fee_payment`/`waive_fee`/`refund_fee`/`assign_fee_template` now RAISE for non-admin, non-service-role callers.

- [ ] **Step 1: Write the migration**

```sql
-- Fees for schools: categories, guest pay token, RPC role gates.
-- Spec: docs/superpowers/specs/2026-08-17-fees-school-usability.md

-- 1. Categories: add 'participation' and 'fundraiser'.
ALTER TABLE gw_student_fees  DROP CONSTRAINT IF EXISTS gw_student_fees_category_check;
ALTER TABLE gw_student_fees  ADD CONSTRAINT gw_student_fees_category_check
  CHECK (category IN ('dues','participation','fundraiser','wardrobe','trip','travel','other'));
ALTER TABLE gw_fee_templates DROP CONSTRAINT IF EXISTS gw_fee_templates_category_check;
ALTER TABLE gw_fee_templates ADD CONSTRAINT gw_fee_templates_category_check
  CHECK (category IN ('dues','participation','fundraiser','wardrobe','trip','travel','other'));

-- 2. Guest pay token (capability for the parent-payable link). Volatile
--    default → per-row distinct values on backfill.
ALTER TABLE gw_student_fees
  ADD COLUMN IF NOT EXISTS guest_pay_token uuid NOT NULL DEFAULT gen_random_uuid();

-- 3. Role-gate the fee RPCs. They were granted to `authenticated` with no
--    role check — any student could mark their own fee paid or waive it.
--    Service role must stay allowed: verify-fee-payment calls
--    record_fee_payment with the service key.
CREATE OR REPLACE FUNCTION fee_rpc_caller_allowed() RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT auth.role() = 'service_role' OR public.current_user_is_tenant_admin();
$$;
```

then re-declare `record_fee_payment`, `refund_fee`, `waive_fee` exactly as in `20260730160000_fee_payment_rpcs.sql` and `assign_fee_template` as in `20260730130000_assign_fee_template_rpc.sql`, each with this prologue as the first statement in BEGIN:

```sql
  IF NOT fee_rpc_caller_allowed() THEN
    RAISE EXCEPTION 'admin role required';
  END IF;
```

finally:

```sql
-- 4. Admin write policy for gw_tenant_fee_settings (read policy exists;
--    without a write policy the settings card cannot save).
DROP POLICY IF EXISTS admin_write_fee_settings ON gw_tenant_fee_settings;
CREATE POLICY admin_write_fee_settings ON gw_tenant_fee_settings
  FOR ALL TO authenticated
  USING (tenant_id = current_tenant_id() AND public.current_user_is_tenant_admin())
  WITH CHECK (tenant_id = current_tenant_id() AND public.current_user_is_tenant_admin());
```

(Verify first whether a write policy already exists in `20260730120000_student_fees.sql` lines ~180-210; skip §4 if so.)

- [ ] **Step 2: Syntax-check** `psql --no-psqlrc -f` against a scratch local db is unavailable — instead review + `grep -c 'CREATE OR REPLACE FUNCTION'` = 5.
- [ ] **Step 3: Commit** `git commit -m "feat(fees): school categories, guest pay token, RPC role gates"`

### Task 2: Category vocabulary in UI + types

**Files:**
- Modify: `src/hooks/useFeeTemplates.ts` (FeeTemplate['category'] union)
- Modify: `src/pages/dashboard/FeesAdminPage.tsx` (CATS + CAT_LABELS)
- Modify: `src/components/fees/CreateFeeTemplateDialog.tsx` (SelectItems)
- Test: `src/pages/dashboard/FeesAdminPage.test.tsx`

**Interfaces:**
- Produces: category union `'dues' | 'participation' | 'fundraiser' | 'wardrobe' | 'trip' | 'travel' | 'other'`; labels Participation, Fundraisers.

- [ ] Add failing test: FeesAdminPage renders tabs Participation and Fundraisers.
- [ ] Extend union + CATS `['all','dues','participation','fundraiser','wardrobe','trip','travel','other']`, labels `participation: 'Participation'`, `fundraiser: 'Fundraisers'`; SelectItems to match.
- [ ] `npx vitest run src/pages/dashboard/FeesAdminPage.test.tsx` → PASS. Commit.

### Task 3: List utils — search/filter + CSV (pure, tested)

**Files:**
- Create: `src/lib/fees/feeListUtils.ts`
- Test: `src/lib/fees/feeListUtils.test.ts`

**Interfaces:**
- Produces:
  - `filterFees(fees: StudentFee[], opts: { query: string; status: 'all' | 'open' | 'paid' }): StudentFee[]` — query matches fee name OR student full_name, case-insensitive; `'open'` = status pending/partial/overdue; `'paid'` = paid.
  - `buildFeesCsv(fees: StudentFee[]): string` — header `Student,Email,Fee,Category,Amount,Paid,Remaining,Status,Due date`; RFC-4180 quoting (wrap in quotes when the value contains `,`, `"`, or newline; double embedded quotes).
  - `filterAssignableMembers(members: {role: string | null}[], studentsOnly: boolean)` — when studentsOnly, exclude roles in `['admin','super_admin','super-admin','director','owner','treasurer']` (null role passes).

- [ ] Write failing tests covering: name match, student match, open filter, csv quoting (name with comma), studentsOnly excludes admin + keeps null role.
- [ ] Implement; run `npx vitest run src/lib/fees/feeListUtils.test.ts` → PASS. Commit.

### Task 4: FeesAdminPage — search, status filter, bulk mark-paid, CSV export

**Files:**
- Modify: `src/pages/dashboard/FeesAdminPage.tsx`
- Modify: `src/components/fees/MarkPaidDialog.tsx` (add optional bulk mode)
- Test: `src/pages/dashboard/FeesAdminPage.test.tsx`

**Interfaces:**
- Consumes: `filterFees`, `buildFeesCsv`; `useFeesManagement.recordPayment(feeId, method, amount, ref?)`.
- Produces: MarkPaidDialog new optional prop `bulkFees?: { id: string; remaining: number }[]` — when set, dialog hides the amount input, labels the button `Record ${n} payments`, and calls `recordPayment` per fee with each fee's full remaining.

- [ ] Above the Individual fees list add: search Input, status Select (All/Unpaid/Paid), `Export CSV` button (Blob download `fees-YYYY-MM-DD.csv`), rows now have a leading Checkbox + a header "Select all shown" checkbox; a sticky bar appears when selection > 0 with `Mark N paid…`.
- [ ] Component test: filter hides non-matching row; bulk bar appears on selection.
- [ ] `npx vitest run src/pages/dashboard/FeesAdminPage.test.tsx` → PASS. Commit.

### Task 5: FeeAssignDialog — select all + students-only

**Files:**
- Modify: `src/components/fees/FeeAssignDialog.tsx`

**Interfaces:**
- Consumes: `filterAssignableMembers`.

- [ ] Add "Students only" Checkbox (default checked) applying `filterAssignableMembers`; add header Checkbox "Select all (N)" toggling every currently-filtered member; keep per-row toggles. Selected count already shown.
- [ ] Manual check via existing FeesAdminPage test render (no new test file — logic is in tested util). Commit.

### Task 6: Row action menu — waive, refund, one-off fee

**Files:**
- Modify: `src/pages/dashboard/FeesAdminPage.tsx`
- Create: `src/components/fees/FeeNoteActionDialog.tsx` (shared waive/refund note dialog)
- Create: `src/components/fees/NewIndividualFeeDialog.tsx`

**Interfaces:**
- Consumes: `useFeesManagement.waiveFee(feeId, note)`, `.refundFee(feeId, note)` (both exist), member directory query pattern from FeeAssignDialog.
- Produces: `FeeNoteActionDialog({ open, onClose, title, actionLabel, onSubmit(note) })`; `NewIndividualFeeDialog({ open, onClose, onCreated })` inserting into `gw_student_fees` with the same column shape `useFeesManagement.createFeesForSemester` uses (copy exactly — includes name, category, amount, user_id, status 'pending', due_date).

- [ ] Replace the row's bare Delete button with a shadcn DropdownMenu (trigger: MoreVertical icon, h-11 w-11): Mark paid, Waive…, Refund… (only when `paid_amount > 0`), Copy pay link (Task 8 wires the URL; hidden until then), Delete (destructive, keeps existing confirm dialog).
- [ ] Header gains `+ Individual fee` button next to `+ New template`.
- [ ] Waive/refund set busy state; refresh via existing `refetch()`.
- [ ] Run FeesAdminPage tests → PASS. Commit.

### Task 7: guest-fee-checkout edge function

**Files:**
- Create: `supabase/functions/guest-fee-checkout/index.ts`

**Interfaces:**
- Produces: POST JSON `{ feeId, token, action: 'summary' | 'checkout' }`, **no Authorization header required**.
  - summary → `{ fee: { name, category, amount, paid_amount, remaining, due_date, status, student_first_name }, org: { name }, online: boolean, offline: { methods: string[], contact_name?, contact_email?, contact_phone? } | null }`
  - checkout → `{ url }` (Stripe session URL)
  - 404 on bad id/token pair; 400 when fee not payable.

- [ ] Implement by cloning `create-fee-payment`'s structure minus JWT auth:
  - service-role client; load fee joined to `gw_tenants(id, name, stripe_account_id, stripe_charges_enabled)` by `.eq('id', feeId)`.
  - Token check: `fee.guest_pay_token === token` else 404 (same body as bad id — don't leak row existence).
  - summary also loads `gw_tenant_fee_settings` by `tenant_id` and the student's first name from `gw_profiles` (`full_name` → first word).
  - checkout: only `paymentType 'full'` semantics — amount = remaining; metadata identical shape to create-fee-payment (`student_fee_id`, `tenant_id`, `user_id: fee.user_id`, `payment_type: 'full'`, empty installment fields) so `verify-fee-payment` needs **zero changes**; `success_url` = `${origin}/pay/fee/${feeId}?token=${token}&status=success`, cancel same with `status=cancelled`; session created with `{ stripeAccount: tenant.stripe_account_id }`, **no application fee**.
- [ ] Commit.

### Task 8: Public PayFeePage + admin Copy pay link

**Files:**
- Create: `src/pages/PayFeePage.tsx`
- Modify: `src/App.tsx` (public route `/pay/fee/:feeId`, lazy, `UniversalLayout` with header/footer like other public pages)
- Modify: `src/hooks/useFeesManagement.ts` (select `guest_pay_token` in fetchStudentFees)
- Modify: `src/pages/dashboard/FeesAdminPage.tsx` (unhide Copy pay link → `navigator.clipboard.writeText(`${window.location.origin}/pay/fee/${f.id}?token=${f.guest_pay_token}`)` + toast)
- Test: `src/pages/PayFeePage.test.tsx`

**Interfaces:**
- Consumes: Task 7 API via `fetch(`${functionsUrl}/guest-fee-checkout`)` (same functions-url access pattern as `PayFeeButton`).

- [ ] Page states: loading skeleton → summary card (org name, fee name, student first name, remaining, due date) → primary `Pay $X now` when `online`, else "How to pay" offline card (methods + contact); `status=success` query → green confirmation ("Payment received — thank you!"), `cancelled` → notice. Copy is parent-facing: "You're paying **{fee}** for {first name}."
- [ ] Test: renders summary + Pay button from mocked fetch; renders offline card when `online: false`.
- [ ] `npx vitest run src/pages/PayFeePage.test.tsx` → PASS. Commit.

### Task 9: Reminder emails with pay link

**Files:**
- Modify: `supabase/functions/schedule-fee-reminders/index.ts`

**Interfaces:**
- Consumes: existing 20h-dedupe + notification insert; Resend pattern from `send-payment-notification` (`new Resend(Deno.env.get("RESEND_API_KEY"))`, same `from:` address string that function uses).

- [ ] Extend the per-fee query to also select `guest_pay_token` and join tenant slug + member email (follow how the function already resolves the member for the notification; add what's missing).
- [ ] After a successful notification insert (i.e., inside the same dedupe gate), send one email: subject `Payment reminder: {fee.name}`, HTML body with remaining amount, due date phrase (due in 7 days / due today / 3 days overdue — reuse the window the function already computed), button link `https://${slug}.gleeworld.org/pay/fee/${fee.id}?token=${guest_pay_token}`, and the line "Parents and guardians can pay directly from this link — no account needed." Email failures are logged into the existing `errors` array, never thrown.
- [ ] Commit.

### Task 10: Student side — installment pay + self-serve split + wording

**Files:**
- Modify: `src/hooks/useMyFees.ts` (select `template:gw_fee_templates(allow_self_serve_split)`; add `splitIntoInstallments(feeId, count: 2 | 3 | 4)`)
- Modify: `src/components/fees/PayFeeButton.tsx` (optional `installmentId` prop → body `{ studentFeeId, paymentType: 'installment', installmentId }`)
- Modify: `src/components/fees/StudentFeeCard.tsx` (per-installment Pay buttons; `Split into payments` control)
- Modify: `src/pages/dashboard/MyFeesPage.tsx` ("Contact your treasurer" → "How to pay"; "treasurer" removed from student copy)
- Test: `src/hooks/__tests__/useMyFees.test.ts` (extend)

**Interfaces:**
- Consumes: `create-fee-payment` installment branch (already deployed); RLS "Users can create their own payment plans" (client-side inserts allowed).
- Produces: `MyFee.allow_self_serve_split: boolean`; `splitIntoInstallments` inserts one `gw_fee_payment_plans` row + N `gw_fee_plan_installments` rows, monthly from next month, amounts = remaining/N rounded to cents with the last installment absorbing the remainder — copy the exact insert column shape from `useFeesManagement.createPaymentPlan`.

- [ ] Failing test: split of $100 into 3 → 33.33/33.33/33.34; installments monthly.
- [ ] Implement; unpaid installments each render amount + due date + `Pay` (PayFeeButton with installmentId, disabled when fee not payable); paid ones show ✓. Split control renders only when `allow_self_serve_split && !plan && remaining > 0 && canPay`.
- [ ] `npx vitest run src/hooks/__tests__/useMyFees.test.ts` → PASS. Commit.

### Task 11: Fee settings card

**Files:**
- Create: `src/components/fees/FeeSettingsCard.tsx`
- Modify: `src/pages/dashboard/FeesAdminPage.tsx` (render below StoreConnectPrompt)

**Interfaces:**
- Consumes: `gw_tenant_fee_settings` (read via maybeSingle; write via upsert `onConflict: 'tenant_id'` with explicit `tenant_id` — resolve it the same way the branding settings writer does; check `TenantThemeRoot`/branding upsert for the canonical tenant-id lookup and reuse it).

- [ ] Collapsible Card "Payment instructions shown to students": contact name / email / phone inputs, accepted-methods checkboxes (cash, check, venmo, other), Save button with saving state + toast. Explain inline: "Shown on My Fees when online payment isn't set up, and on the parent pay page."
- [ ] Run FeesAdminPage tests → PASS. Commit.

### Task 12: Gates, PR, deploy, live verification

- [ ] `npm run lint` (changed files clean), `npm run typecheck:guard` → no new errors, `npm run test` → green.
- [ ] Push branch `fees-school-usability`, open PR with summary + spec link, merge per Kevin's usual flow (this session: create PR; merge after checks).
- [ ] Apply migration on droplet as `supabase_admin` (PR #380 pattern), copy `guest-fee-checkout` + updated `schedule-fee-reminders` to `/opt/supabase/volumes/functions/`, restart functions container (compose-safety memory: never `docker compose down`; use the restart pattern from the edge-fn deploy memory).
- [ ] `bash scripts/deploy-frontend.sh`.
- [ ] Live verify: (a) `/pay/fee/<real id>?token=<token>` renders summary on demo tenant; (b) wrong token → 404 message; (c) admin page shows new tabs + actions; (d) student RPC gate: calling `waive_fee` as non-admin errors.
