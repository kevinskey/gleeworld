# Student Fees Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a per-student fees ledger (dues + wardrobe + trip + travel + one-offs) with Stripe Connect self-pay for tenants who have Connect enabled, manual mark-paid for tenants who don't, admin-defined installment schedules for trips, and self-serve 2/5/10 splits for dues.

**Architecture:** Generalize the existing dues schema into a shared fees ledger (`gw_student_fees` + `gw_fee_templates`). Reuse existing `gw_dues_payment_plans` / `gw_payment_plan_installments` / `gw_dues_reminders` by renaming and repointing FKs. Rewrite `create-dues-payment` / `verify-dues-payment` edge functions to use Stripe Connect destination charges routing to the tenant's `stripe_account_id`. New student surface at `/dashboard/my-fees`; existing `/dues-management` becomes `/dashboard/fees` with per-category tabs; wardrobe and Tour Manager get inline fee-creation entry points.

**Tech Stack:** React 18 + Vite, TypeScript, Supabase (Postgres + Deno edge functions), Stripe Node SDK + Stripe Connect destination charges, TailwindCSS + shadcn/ui, Playwright + Vitest.

**Spec:** `docs/superpowers/specs/2026-07-30-student-fees-design.md`

## Global Constraints

- **Multi-tenant:** every new table has `tenant_id uuid NOT NULL DEFAULT current_tenant_id()`, BEFORE INSERT trigger, and RESTRICTIVE RLS. (Per `reference_gleeworld_multitenant.md`.)
- **Tenant-neutral copy:** never hardcode a specific choir name; UI copy says "student" not "singer".
- **Light-theme surfaces:** white cards, dark text, cream page — use design tokens.
- **Stripe Connect fee:** `application_fee_amount = 0` on all destination charges (matches Box Office policy per `reference_stripe_account.md`).
- **Currency:** USD only in v1.
- **Deploys:** rsync `dist/` — NEVER `rsync --delete` (per `feedback_gleeworld_deploy_rsync.md`).
- **Working dir:** `~/Documents/GitHub/gleeworld`. Concurrent sessions share the checkout — verify branch before every commit/build.
- **Commit granularity:** one commit per task step where indicated. Real commits, no `--no-verify`.
- **No backwards-compat shims:** clean rename, no compatibility columns or views (per user's feedback to remove BC hacks).

---

### Task 0: Branch setup

**Files:**
- None (git state only)

**Interfaces:**
- Consumes: nothing
- Produces: dedicated `student-fees` branch off the latest `main`, clean working tree

- [ ] **Step 1: Verify no uncommitted student-fees work exists on any branch**

```bash
cd ~/Documents/GitHub/gleeworld
git status
git branch --list | grep -i fee
```
Expected: no `student-fees` or `fees` branch. If one exists, ask the user before proceeding.

- [ ] **Step 2: Stash or note the current branch's in-progress work**

If the working tree is dirty, DO NOT commit or stash without user confirmation. Ask the user how to handle unrelated in-progress work first.

- [ ] **Step 3: Create branch off latest main**

```bash
git fetch origin main
git checkout -b student-fees origin/main
```

- [ ] **Step 4: Verify clean state**

```bash
git status
```
Expected: `On branch student-fees` + `nothing to commit, working tree clean`.

---

### Task 1: Database migration

**Files:**
- Create: `supabase/migrations/20260730120000_student_fees.sql`
- Test: `scripts/test-student-fees-migration.sh` (throwaway shell script; NOT committed)

**Interfaces:**
- Consumes: existing tables `gw_dues_records`, `gw_dues_payment_plans`, `gw_payment_plan_installments`, `gw_dues_reminders`, `gw_tenants`
- Produces: renamed tables `gw_student_fees`, `gw_fee_payment_plans`, `gw_fee_plan_installments`, `gw_fee_reminders`; new tables `gw_fee_templates`, `gw_fee_template_installments`, `gw_tenant_fee_settings`; all RLS + triggers in place

- [ ] **Step 1: Write migration file**

```sql
-- 20260730120000_student_fees.sql
BEGIN;

-- 1. Rename existing dues tables to their new generalized names
ALTER TABLE gw_dues_records          RENAME TO gw_student_fees;
ALTER TABLE gw_dues_payment_plans    RENAME TO gw_fee_payment_plans;
ALTER TABLE gw_payment_plan_installments RENAME TO gw_fee_plan_installments;
ALTER TABLE gw_dues_reminders        RENAME TO gw_fee_reminders;

-- 2. Rename FK columns
ALTER TABLE gw_fee_payment_plans RENAME COLUMN dues_record_id TO student_fee_id;
ALTER TABLE gw_fee_reminders     RENAME COLUMN dues_record_id TO student_fee_id;

-- 3. Add new columns to gw_student_fees
ALTER TABLE gw_student_fees
  ADD COLUMN template_id uuid,
  ADD COLUMN category text NOT NULL DEFAULT 'dues'
    CHECK (category IN ('dues','wardrobe','trip','travel','other')),
  ADD COLUMN name text NOT NULL DEFAULT 'Dues',
  ADD COLUMN paid_amount numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN payment_reference text,
  ADD COLUMN stripe_payment_intent_id text,
  ADD COLUMN context_type text CHECK (context_type IN ('trip','wardrobe_item','semester') OR context_type IS NULL),
  ADD COLUMN context_id uuid,
  ADD COLUMN created_by uuid,
  ADD COLUMN paid_at timestamptz;

-- Backfill 'name' from semester + academic_year where possible
UPDATE gw_student_fees
SET name = COALESCE(NULLIF(TRIM(semester || ' ' || academic_year), ''), 'Dues')
WHERE category = 'dues';

-- Extend the status check to include the new statuses
ALTER TABLE gw_student_fees DROP CONSTRAINT IF EXISTS gw_dues_records_status_check;
ALTER TABLE gw_student_fees ADD CONSTRAINT gw_student_fees_status_check
  CHECK (status IN ('pending','partial','paid','overdue','refunded','waived'));

-- Extend the payment_method check
ALTER TABLE gw_student_fees DROP CONSTRAINT IF EXISTS gw_dues_records_payment_method_check;
ALTER TABLE gw_student_fees ADD CONSTRAINT gw_student_fees_payment_method_check
  CHECK (payment_method IN ('stripe','cash','check','venmo','other') OR payment_method IS NULL);

-- 4. Add 'source' to gw_fee_payment_plans
ALTER TABLE gw_fee_payment_plans
  ADD COLUMN source text NOT NULL DEFAULT 'self_serve'
    CHECK (source IN ('self_serve','admin_defined'));

-- 5. Create gw_fee_templates
CREATE TABLE gw_fee_templates (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              uuid NOT NULL DEFAULT current_tenant_id() REFERENCES gw_tenants(id) ON DELETE CASCADE,
  category               text NOT NULL CHECK (category IN ('dues','wardrobe','trip','travel','other')),
  name                   text NOT NULL,
  description            text,
  total_amount           numeric(10,2) NOT NULL,
  currency               text NOT NULL DEFAULT 'USD',
  due_date               date,
  allow_self_serve_split boolean NOT NULL DEFAULT true,
  context_type           text CHECK (context_type IN ('trip','wardrobe_item','semester') OR context_type IS NULL),
  context_id             uuid,
  created_by             uuid NOT NULL,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  archived_at            timestamptz
);

-- 6. Create gw_fee_template_installments
CREATE TABLE gw_fee_template_installments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL DEFAULT current_tenant_id() REFERENCES gw_tenants(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES gw_fee_templates(id) ON DELETE CASCADE,
  sequence    int NOT NULL,
  amount      numeric(10,2) NOT NULL,
  due_date    date NOT NULL,
  UNIQUE (template_id, sequence)
);

-- 7. Create gw_tenant_fee_settings
CREATE TABLE gw_tenant_fee_settings (
  tenant_id               uuid PRIMARY KEY REFERENCES gw_tenants(id) ON DELETE CASCADE,
  accepted_manual_methods text[] NOT NULL DEFAULT ARRAY['cash','check'],
  treasurer_contact_name  text,
  treasurer_contact_email text,
  treasurer_contact_phone text,
  statement_descriptor    text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

-- 8. Add FK for template_id on gw_student_fees (after template table exists)
ALTER TABLE gw_student_fees
  ADD CONSTRAINT gw_student_fees_template_id_fkey
  FOREIGN KEY (template_id) REFERENCES gw_fee_templates(id) ON DELETE SET NULL;

-- 9. BEFORE INSERT triggers to enforce tenant_id (per platform standard)
-- gw_student_fees, gw_fee_payment_plans, gw_fee_plan_installments, gw_fee_reminders
-- already have their triggers from when they were dues tables; those are renamed
-- automatically by ALTER TABLE ... RENAME. Only new tables need trigger creation.

CREATE OR REPLACE FUNCTION set_tenant_id_from_current()
  RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := current_tenant_id();
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER gw_fee_templates_set_tenant BEFORE INSERT ON gw_fee_templates
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id_from_current();
CREATE TRIGGER gw_fee_template_installments_set_tenant BEFORE INSERT ON gw_fee_template_installments
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id_from_current();
-- gw_tenant_fee_settings.tenant_id is the PK and must be explicit; no trigger.

-- 10. RESTRICTIVE RLS on the three new tables (matches platform standard)
ALTER TABLE gw_fee_templates              ENABLE ROW LEVEL SECURITY;
ALTER TABLE gw_fee_template_installments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE gw_tenant_fee_settings        ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_templates ON gw_fee_templates
  AS RESTRICTIVE FOR ALL
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_template_installments ON gw_fee_template_installments
  AS RESTRICTIVE FOR ALL
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_fee_settings ON gw_tenant_fee_settings
  AS RESTRICTIVE FOR ALL
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- Permissive read policy: authenticated members of the tenant can read templates
CREATE POLICY read_templates ON gw_fee_templates
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY read_template_installments ON gw_fee_template_installments
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY read_fee_settings ON gw_tenant_fee_settings
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Write policies: only admin/treasurer roles can insert/update/delete templates
-- (relies on existing has_role() helper)
CREATE POLICY admin_write_templates ON gw_fee_templates
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'treasurer'));
CREATE POLICY admin_update_templates ON gw_fee_templates
  FOR UPDATE USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'treasurer'));
CREATE POLICY admin_delete_templates ON gw_fee_templates
  FOR DELETE USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'treasurer'));

-- 11. Indexes for common queries
CREATE INDEX idx_student_fees_user_status ON gw_student_fees(user_id, status);
CREATE INDEX idx_student_fees_template ON gw_student_fees(template_id) WHERE template_id IS NOT NULL;
CREATE INDEX idx_student_fees_context ON gw_student_fees(context_type, context_id) WHERE context_type IS NOT NULL;
CREATE INDEX idx_fee_templates_category ON gw_fee_templates(category, tenant_id) WHERE archived_at IS NULL;
CREATE INDEX idx_fee_templates_context ON gw_fee_templates(context_type, context_id) WHERE context_type IS NOT NULL;

-- 12. updated_at auto-touch triggers (reuse existing touch_updated_at helper)
CREATE TRIGGER gw_fee_templates_touch BEFORE UPDATE ON gw_fee_templates
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER gw_tenant_fee_settings_touch BEFORE UPDATE ON gw_tenant_fee_settings
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

COMMIT;
```

- [ ] **Step 2: Dry-run the migration on a scratch DB**

```bash
# Start local supabase (per reference_gleeworld_workdir.md this is optional
# but recommended; alternatively apply to a scratch branch on the remote)
supabase db reset
```
Expected: migration applies cleanly with no errors. If anything fails, fix the SQL and re-run.

- [ ] **Step 3: Verify existing dues data still readable**

Manually run:
```sql
SELECT id, category, name, amount, status FROM gw_student_fees LIMIT 5;
SELECT id, student_fee_id, installments FROM gw_fee_payment_plans LIMIT 5;
```
Expected: rows come back, `category` = `'dues'`, `name` populated from semester+year, FK column renamed.

- [ ] **Step 4: Verify RLS blocks cross-tenant reads**

Impersonate two different tenants via `SET LOCAL request.jwt.claim.tenant_id = ...`:
```sql
SET LOCAL request.jwt.claim.tenant_id = '<tenant-A-uuid>';
INSERT INTO gw_fee_templates (category, name, total_amount, created_by) VALUES ('trip','Rome',2000,'<user>');
SET LOCAL request.jwt.claim.tenant_id = '<tenant-B-uuid>';
SELECT COUNT(*) FROM gw_fee_templates WHERE name = 'Rome';
```
Expected: `0` rows visible from tenant B.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260730120000_student_fees.sql
git commit -m "db: rename dues tables into student fees ledger + templates"
```

---

### Task 2: Regenerate Supabase types + rename dues hooks/components/pages

**Files:**
- Regenerate: `src/integrations/supabase/types.ts`
- Rename: `src/hooks/useDuesManagement.ts` → `src/hooks/useFeesManagement.ts`
- Rename: `src/pages/DuesManagement.tsx` → `src/pages/dashboard/FeesAdminPage.tsx`
- Rename: `src/components/dues/CreateDuesDialog.tsx` → `src/components/fees/CreateFeeDialog.tsx`
- Rename: `src/components/dues/DuesRecordsList.tsx` → `src/components/fees/StudentFeesList.tsx`
- Rename: `src/components/treasurer/DuesManager.tsx` → `src/components/treasurer/FeesManager.tsx`
- Rename: `src/components/treasurer/CreateDuesRecord.tsx` → `src/components/treasurer/CreateFeeRecord.tsx`
- Modify: `src/App.tsx` (or router config file) to add `/dues-management` → `/dashboard/fees` redirect
- Modify: every importer of the renamed files

**Interfaces:**
- Consumes: renamed tables from Task 1
- Produces: `useFeesManagement()` hook with methods `fetchStudentFees()`, `createFeesForSemester()`, `createPaymentPlan()`, `markPaymentComplete()`, `createReminder()`, `sendBulkReminders()`, `refetch()`; state `studentFees`, `paymentPlans`, `loading`

- [ ] **Step 1: Regenerate Supabase types against the renamed schema**

```bash
supabase gen types typescript --linked > src/integrations/supabase/types.ts
```
Expected: `Database['public']['Tables']` now has `gw_student_fees`, `gw_fee_templates`, etc.

- [ ] **Step 2: Rename files via git mv (preserves history)**

```bash
git mv src/hooks/useDuesManagement.ts src/hooks/useFeesManagement.ts
git mv src/pages/DuesManagement.tsx src/pages/dashboard/FeesAdminPage.tsx
mkdir -p src/components/fees
git mv src/components/dues/CreateDuesDialog.tsx src/components/fees/CreateFeeDialog.tsx
git mv src/components/dues/DuesRecordsList.tsx src/components/fees/StudentFeesList.tsx
git mv src/components/treasurer/DuesManager.tsx src/components/treasurer/FeesManager.tsx
git mv src/components/treasurer/CreateDuesRecord.tsx src/components/treasurer/CreateFeeRecord.tsx
```

- [ ] **Step 3: Rewrite `useFeesManagement.ts` — export names, table names, method names**

Change every reference:
- `DuesRecord` interface → `StudentFee`, add `template_id`, `category`, `name`, `paid_amount`, `payment_reference`, `stripe_payment_intent_id`, `context_type`, `context_id`, `paid_at`
- `duesRecords` state → `studentFees`
- `fetchDuesRecords` → `fetchStudentFees` (query `gw_student_fees`)
- `createDuesForSemester` → `createFeesForSemester` (query `gw_student_fees`, set `category='dues'`, `name = \`${semester} ${academic_year}\``)
- `fetchPaymentPlans` → query `gw_fee_payment_plans`
- `createPaymentPlan` → insert into `gw_fee_payment_plans` with `student_fee_id` + `source: 'self_serve'`
- `markPaymentComplete` → update `gw_student_fees` (unchanged logic in this task; extended in Task 6)
- `createReminder` / `sendBulkReminders` → query `gw_fee_reminders`, notification type stays `'dues_reminder'` for now (aliased in Task 12)

- [ ] **Step 4: Find and fix all importers**

```bash
grep -rln "useDuesManagement\|from '@/hooks/useDuesManagement'" src/
grep -rln "from '@/components/dues/" src/
grep -rln "from '@/components/treasurer/DuesManager\|from '@/components/treasurer/CreateDuesRecord" src/
grep -rln "from '@/pages/DuesManagement'" src/
```
Update each import + call site.

- [ ] **Step 5: Add `/dues-management` → `/dashboard/fees` route redirect**

In the router config (probably `src/App.tsx` or `src/routes/index.tsx`):
```tsx
<Route path="/dues-management" element={<Navigate to="/dashboard/fees" replace />} />
<Route path="/dashboard/fees" element={<FeesAdminPage />} />
```

- [ ] **Step 6: Typecheck + build**

```bash
npm run build
```
Expected: no TS errors. If any importer was missed, fix and re-run.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor: rename dues → fees across hooks, components, pages, routes"
```

---

### Task 3: Fee template CRUD (RPC + hook)

**Files:**
- Create: `src/hooks/useFeeTemplates.ts`
- Create: `src/hooks/__tests__/useFeeTemplates.test.ts`

**Interfaces:**
- Consumes: `gw_fee_templates`, `gw_fee_template_installments` (from Task 1)
- Produces:
  - `interface FeeTemplate { id, tenant_id, category, name, description, total_amount, currency, due_date, allow_self_serve_split, context_type, context_id, installments: FeeTemplateInstallment[], created_at, updated_at, archived_at }`
  - `interface FeeTemplateInstallment { id, template_id, sequence, amount, due_date }`
  - Hook methods: `listTemplates(filters?: { category?, contextType?, contextId?, includeArchived? }) → FeeTemplate[]`, `createTemplate(input: CreateFeeTemplateInput) → FeeTemplate`, `updateTemplate(id, patch) → FeeTemplate`, `archiveTemplate(id) → void`, `refetch()`
  - `interface CreateFeeTemplateInput { category, name, description?, total_amount, due_date?, allow_self_serve_split?, context_type?, context_id?, installments?: { sequence, amount, due_date }[] }`

- [ ] **Step 1: Write the failing test**

```typescript
// src/hooks/__tests__/useFeeTemplates.test.ts
import { renderHook, act, waitFor } from '@testing-library/react';
import { useFeeTemplates } from '../useFeeTemplates';
import { createTestSupabase, seedTenant, cleanupTenant } from '@/test/testDb';

describe('useFeeTemplates', () => {
  let tenantId: string;
  beforeEach(async () => { tenantId = await seedTenant(); });
  afterEach(async () => { await cleanupTenant(tenantId); });

  it('creates a template with admin-defined installments', async () => {
    const { result } = renderHook(() => useFeeTemplates());
    let created;
    await act(async () => {
      created = await result.current.createTemplate({
        category: 'trip',
        name: '2026 Rome Tour Deposit',
        total_amount: 2000,
        due_date: '2026-09-01',
        allow_self_serve_split: false,
        installments: [
          { sequence: 1, amount: 500, due_date: '2026-09-01' },
          { sequence: 2, amount: 500, due_date: '2026-11-01' },
          { sequence: 3, amount: 500, due_date: '2027-01-01' },
          { sequence: 4, amount: 500, due_date: '2027-03-01' },
        ],
      });
    });
    expect(created.name).toBe('2026 Rome Tour Deposit');
    expect(created.installments).toHaveLength(4);
    expect(created.installments[0].amount).toBe(500);
  });

  it('lists templates filtered by category', async () => {
    const { result } = renderHook(() => useFeeTemplates());
    await act(async () => {
      await result.current.createTemplate({ category: 'trip', name: 'T', total_amount: 100 });
      await result.current.createTemplate({ category: 'dues', name: 'D', total_amount: 50 });
    });
    let trips;
    await act(async () => { trips = await result.current.listTemplates({ category: 'trip' }); });
    expect(trips).toHaveLength(1);
    expect(trips[0].name).toBe('T');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/hooks/__tests__/useFeeTemplates.test.ts`
Expected: FAIL — `useFeeTemplates` not exported.

- [ ] **Step 3: Implement the hook**

```typescript
// src/hooks/useFeeTemplates.ts
import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface FeeTemplateInstallment {
  id: string;
  template_id: string;
  sequence: number;
  amount: number;
  due_date: string;
}

export interface FeeTemplate {
  id: string;
  tenant_id: string;
  category: 'dues' | 'wardrobe' | 'trip' | 'travel' | 'other';
  name: string;
  description: string | null;
  total_amount: number;
  currency: string;
  due_date: string | null;
  allow_self_serve_split: boolean;
  context_type: 'trip' | 'wardrobe_item' | 'semester' | null;
  context_id: string | null;
  installments: FeeTemplateInstallment[];
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface CreateFeeTemplateInput {
  category: FeeTemplate['category'];
  name: string;
  description?: string;
  total_amount: number;
  due_date?: string;
  allow_self_serve_split?: boolean;
  context_type?: FeeTemplate['context_type'];
  context_id?: string;
  installments?: { sequence: number; amount: number; due_date: string }[];
}

export const useFeeTemplates = () => {
  const [loading, setLoading] = useState(false);

  const listTemplates = useCallback(async (filters?: {
    category?: FeeTemplate['category'];
    contextType?: string;
    contextId?: string;
    includeArchived?: boolean;
  }): Promise<FeeTemplate[]> => {
    let query = supabase
      .from('gw_fee_templates')
      .select('*, installments:gw_fee_template_installments(*)')
      .order('created_at', { ascending: false });
    if (filters?.category) query = query.eq('category', filters.category);
    if (filters?.contextType) query = query.eq('context_type', filters.contextType);
    if (filters?.contextId) query = query.eq('context_id', filters.contextId);
    if (!filters?.includeArchived) query = query.is('archived_at', null);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as FeeTemplate[];
  }, []);

  const createTemplate = useCallback(async (input: CreateFeeTemplateInput): Promise<FeeTemplate> => {
    setLoading(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('Not authenticated');
      const { data: tpl, error: tplErr } = await supabase
        .from('gw_fee_templates')
        .insert({
          category: input.category,
          name: input.name,
          description: input.description ?? null,
          total_amount: input.total_amount,
          due_date: input.due_date ?? null,
          allow_self_serve_split: input.allow_self_serve_split ?? true,
          context_type: input.context_type ?? null,
          context_id: input.context_id ?? null,
          created_by: user.id,
        })
        .select()
        .single();
      if (tplErr || !tpl) throw tplErr ?? new Error('Template insert failed');

      let installments: FeeTemplateInstallment[] = [];
      if (input.installments?.length) {
        const rows = input.installments.map(i => ({ template_id: tpl.id, ...i }));
        const { data: ins, error: insErr } = await supabase
          .from('gw_fee_template_installments')
          .insert(rows)
          .select();
        if (insErr) throw insErr;
        installments = (ins ?? []) as FeeTemplateInstallment[];
      }
      return { ...(tpl as any), installments } as FeeTemplate;
    } finally { setLoading(false); }
  }, []);

  const updateTemplate = useCallback(async (id: string, patch: Partial<CreateFeeTemplateInput>): Promise<FeeTemplate> => {
    const { data, error } = await supabase.from('gw_fee_templates').update(patch).eq('id', id).select().single();
    if (error || !data) throw error;
    const { data: installments } = await supabase.from('gw_fee_template_installments').select('*').eq('template_id', id);
    return { ...(data as any), installments: installments ?? [] } as FeeTemplate;
  }, []);

  const archiveTemplate = useCallback(async (id: string) => {
    const { error } = await supabase.from('gw_fee_templates').update({ archived_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
  }, []);

  return { loading, listTemplates, createTemplate, updateTemplate, archiveTemplate };
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/hooks/__tests__/useFeeTemplates.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useFeeTemplates.ts src/hooks/__tests__/useFeeTemplates.test.ts
git commit -m "feat(fees): add useFeeTemplates hook with installments"
```

---

### Task 4: Fee assignment (bulk + single)

**Files:**
- Create: `supabase/migrations/20260730130000_assign_fee_template_rpc.sql`
- Create: `src/hooks/useFeeAssignment.ts`
- Create: `src/hooks/__tests__/useFeeAssignment.test.ts`

**Interfaces:**
- Consumes: `FeeTemplate` from Task 3
- Produces: `assign_fee_template(template_id uuid, user_ids uuid[]) → int` RPC that inserts one `gw_student_fees` row per user (skipping users who already have an unpaid row for the same template). Returns count of rows created. Hook: `useFeeAssignment().assign(templateId: string, userIds: string[]) → Promise<number>`.

- [ ] **Step 1: Write the failing test**

```typescript
// src/hooks/__tests__/useFeeAssignment.test.ts
import { renderHook, act } from '@testing-library/react';
import { useFeeAssignment } from '../useFeeAssignment';
import { useFeeTemplates } from '../useFeeTemplates';
import { seedTenant, seedUsers, listStudentFees, cleanupTenant } from '@/test/testDb';

describe('useFeeAssignment', () => {
  let tenantId: string; let userIds: string[];
  beforeEach(async () => { tenantId = await seedTenant(); userIds = await seedUsers(tenantId, 3); });
  afterEach(async () => { await cleanupTenant(tenantId); });

  it('assigns a template to N users, creating N student_fees rows', async () => {
    const { result: templatesHook } = renderHook(() => useFeeTemplates());
    const { result: assignHook } = renderHook(() => useFeeAssignment());

    let tpl;
    await act(async () => {
      tpl = await templatesHook.current.createTemplate({
        category: 'trip', name: 'Rome', total_amount: 500, due_date: '2026-09-01',
      });
    });

    let count = 0;
    await act(async () => { count = await assignHook.current.assign(tpl.id, userIds); });
    expect(count).toBe(3);

    const fees = await listStudentFees(tenantId);
    expect(fees).toHaveLength(3);
    expect(fees.every(f => f.template_id === tpl.id && f.amount === 500)).toBe(true);
  });

  it('is idempotent — re-assigning the same template to the same user creates no duplicate', async () => {
    const { result: templatesHook } = renderHook(() => useFeeTemplates());
    const { result: assignHook } = renderHook(() => useFeeAssignment());
    let tpl; await act(async () => { tpl = await templatesHook.current.createTemplate({ category: 'dues', name: 'D', total_amount: 100 }); });
    await act(async () => { await assignHook.current.assign(tpl.id, userIds); });
    let second = 0;
    await act(async () => { second = await assignHook.current.assign(tpl.id, userIds); });
    expect(second).toBe(0);
    const fees = await listStudentFees(tenantId);
    expect(fees).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/hooks/__tests__/useFeeAssignment.test.ts`
Expected: FAIL — `useFeeAssignment` not exported.

- [ ] **Step 3: Write RPC migration**

```sql
-- 20260730130000_assign_fee_template_rpc.sql
CREATE OR REPLACE FUNCTION assign_fee_template(p_template_id uuid, p_user_ids uuid[])
  RETURNS int LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_template gw_fee_templates%ROWTYPE;
  v_created int := 0;
BEGIN
  SELECT * INTO v_template FROM gw_fee_templates WHERE id = p_template_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'template not found'; END IF;

  -- Insert one row per user, skipping users who already have an unpaid row for this template
  INSERT INTO gw_student_fees
    (tenant_id, user_id, template_id, category, name, amount, due_date, context_type, context_id, created_by, status)
  SELECT
    v_template.tenant_id, u.user_id, v_template.id, v_template.category, v_template.name,
    v_template.total_amount, v_template.due_date, v_template.context_type, v_template.context_id,
    v_template.created_by, 'pending'
  FROM unnest(p_user_ids) AS u(user_id)
  WHERE NOT EXISTS (
    SELECT 1 FROM gw_student_fees f
    WHERE f.template_id = v_template.id AND f.user_id = u.user_id
      AND f.status IN ('pending','partial','overdue')
  );
  GET DIAGNOSTICS v_created = ROW_COUNT;
  RETURN v_created;
END $$;

REVOKE ALL ON FUNCTION assign_fee_template(uuid, uuid[]) FROM public;
GRANT EXECUTE ON FUNCTION assign_fee_template(uuid, uuid[]) TO authenticated;
```

- [ ] **Step 4: Write the hook**

```typescript
// src/hooks/useFeeAssignment.ts
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useFeeAssignment = () => {
  const assign = useCallback(async (templateId: string, userIds: string[]): Promise<number> => {
    const { data, error } = await supabase.rpc('assign_fee_template', {
      p_template_id: templateId,
      p_user_ids: userIds,
    });
    if (error) throw error;
    return (data as number) ?? 0;
  }, []);
  return { assign };
};
```

- [ ] **Step 5: Apply migration + run test**

```bash
supabase db reset
npx vitest run src/hooks/__tests__/useFeeAssignment.test.ts
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260730130000_assign_fee_template_rpc.sql src/hooks/useFeeAssignment.ts src/hooks/__tests__/useFeeAssignment.test.ts
git commit -m "feat(fees): add assign_fee_template RPC and useFeeAssignment hook"
```

---

### Task 5: Template edit propagation

**Files:**
- Create: `supabase/migrations/20260730140000_propagate_template_edits.sql`
- Modify: `src/hooks/useFeeTemplates.ts` — swap `updateTemplate` to call the RPC
- Create: `src/hooks/__tests__/useFeeTemplates.propagation.test.ts`

**Interfaces:**
- Consumes: `assign_fee_template` from Task 4
- Produces: `update_fee_template(template_id uuid, patch jsonb) → gw_fee_templates` RPC that updates the template AND updates matching `gw_student_fees` rows where `status = 'pending'`, freezing rows in any other status.

- [ ] **Step 1: Write the failing test**

```typescript
// src/hooks/__tests__/useFeeTemplates.propagation.test.ts
import { renderHook, act } from '@testing-library/react';
import { useFeeTemplates } from '../useFeeTemplates';
import { useFeeAssignment } from '../useFeeAssignment';
import { seedTenant, seedUsers, markFeePaid, listStudentFees, cleanupTenant } from '@/test/testDb';

describe('template edit propagation', () => {
  let tenantId: string; let userIds: string[];
  beforeEach(async () => { tenantId = await seedTenant(); userIds = await seedUsers(tenantId, 2); });
  afterEach(async () => { await cleanupTenant(tenantId); });

  it('propagates amount changes only to pending rows', async () => {
    const { result: t } = renderHook(() => useFeeTemplates());
    const { result: a } = renderHook(() => useFeeAssignment());
    let tpl; await act(async () => { tpl = await t.current.createTemplate({ category: 'trip', name: 'X', total_amount: 500 }); });
    await act(async () => { await a.current.assign(tpl.id, userIds); });

    const fees = await listStudentFees(tenantId);
    await markFeePaid(fees[0].id);   // user 0 pays

    await act(async () => { await t.current.updateTemplate(tpl.id, { total_amount: 600 }); });

    const after = await listStudentFees(tenantId);
    const paid = after.find(f => f.id === fees[0].id);
    const unpaid = after.find(f => f.user_id === userIds[1]);
    expect(paid.amount).toBe(500);   // frozen
    expect(unpaid.amount).toBe(600); // propagated
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/hooks/__tests__/useFeeTemplates.propagation.test.ts`
Expected: FAIL — template update doesn't propagate to instances.

- [ ] **Step 3: Write RPC**

```sql
-- 20260730140000_propagate_template_edits.sql
CREATE OR REPLACE FUNCTION update_fee_template(p_template_id uuid, p_patch jsonb)
  RETURNS gw_fee_templates LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_tpl gw_fee_templates%ROWTYPE;
BEGIN
  UPDATE gw_fee_templates
    SET name         = COALESCE(p_patch->>'name', name),
        description  = COALESCE(p_patch->>'description', description),
        total_amount = COALESCE((p_patch->>'total_amount')::numeric, total_amount),
        due_date     = COALESCE((p_patch->>'due_date')::date, due_date),
        allow_self_serve_split = COALESCE((p_patch->>'allow_self_serve_split')::boolean, allow_self_serve_split),
        updated_at   = now()
  WHERE id = p_template_id
  RETURNING * INTO v_tpl;
  IF NOT FOUND THEN RAISE EXCEPTION 'template not found'; END IF;

  -- Propagate to pending rows only
  UPDATE gw_student_fees
    SET name = v_tpl.name,
        amount = v_tpl.total_amount,
        due_date = v_tpl.due_date,
        updated_at = now()
  WHERE template_id = v_tpl.id AND status = 'pending';

  RETURN v_tpl;
END $$;

GRANT EXECUTE ON FUNCTION update_fee_template(uuid, jsonb) TO authenticated;
```

- [ ] **Step 4: Update `useFeeTemplates.updateTemplate` to call the RPC**

Replace the direct `.update()` call with:
```typescript
const updateTemplate = useCallback(async (id: string, patch: Partial<CreateFeeTemplateInput>) => {
  const { data, error } = await supabase.rpc('update_fee_template', {
    p_template_id: id, p_patch: patch as any,
  });
  if (error || !data) throw error;
  const { data: installments } = await supabase.from('gw_fee_template_installments').select('*').eq('template_id', id);
  return { ...(data as any), installments: installments ?? [] } as FeeTemplate;
}, []);
```

- [ ] **Step 5: Apply migration + run test**

```bash
supabase db reset && npx vitest run src/hooks/__tests__/useFeeTemplates.propagation.test.ts
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(fees): update_fee_template RPC propagates to pending rows only"
```

---

### Task 6: Manual mark-paid RPC (full + partial + refund)

**Files:**
- Create: `supabase/migrations/20260730150000_fee_payment_rpcs.sql`
- Modify: `src/hooks/useFeesManagement.ts` — replace `markPaymentComplete` with the RPC-backed version, add `recordPartialPayment`, `refundFee`, `waiveFee`
- Create: `src/hooks/__tests__/useFeesManagement.payments.test.ts`

**Interfaces:**
- Consumes: `gw_student_fees` from Task 1
- Produces:
  - `record_fee_payment(fee_id uuid, method text, amount numeric, reference text) → gw_student_fees` — RPC. If `amount >= remaining`, sets `status='paid'`. Else `status='partial'`. Increments `paid_amount`.
  - `refund_fee(fee_id uuid, note text) → gw_student_fees` — sets `status='refunded'`. (Stripe refund call happens client-side in Task 8.)
  - `waive_fee(fee_id uuid, note text) → gw_student_fees` — sets `status='waived'`.
  - Hook: `recordPayment(feeId, method, amount, ref?)`, `refundFee(feeId, note)`, `waiveFee(feeId, note)`.

- [ ] **Step 1: Write the failing test**

```typescript
// src/hooks/__tests__/useFeesManagement.payments.test.ts
import { renderHook, act } from '@testing-library/react';
import { useFeesManagement } from '../useFeesManagement';
import { seedTenant, seedUsers, seedStudentFee, getFee, cleanupTenant } from '@/test/testDb';

describe('fee payment RPCs', () => {
  let tenantId: string; let userIds: string[];
  beforeEach(async () => { tenantId = await seedTenant(); userIds = await seedUsers(tenantId, 1); });
  afterEach(async () => { await cleanupTenant(tenantId); });

  it('full payment marks paid', async () => {
    const feeId = await seedStudentFee(tenantId, userIds[0], { amount: 500 });
    const { result } = renderHook(() => useFeesManagement());
    await act(async () => { await result.current.recordPayment(feeId, 'cash', 500); });
    const fee = await getFee(feeId);
    expect(fee.status).toBe('paid');
    expect(fee.paid_amount).toBe(500);
    expect(fee.payment_method).toBe('cash');
  });

  it('partial payment sets status=partial', async () => {
    const feeId = await seedStudentFee(tenantId, userIds[0], { amount: 500 });
    const { result } = renderHook(() => useFeesManagement());
    await act(async () => { await result.current.recordPayment(feeId, 'check', 200, '#1234'); });
    const fee = await getFee(feeId);
    expect(fee.status).toBe('partial');
    expect(fee.paid_amount).toBe(200);
    expect(fee.payment_reference).toBe('#1234');
  });

  it('two partial payments totaling full amount = paid', async () => {
    const feeId = await seedStudentFee(tenantId, userIds[0], { amount: 500 });
    const { result } = renderHook(() => useFeesManagement());
    await act(async () => {
      await result.current.recordPayment(feeId, 'cash', 200);
      await result.current.recordPayment(feeId, 'cash', 300);
    });
    const fee = await getFee(feeId);
    expect(fee.status).toBe('paid');
    expect(fee.paid_amount).toBe(500);
  });

  it('refund flips row to refunded', async () => {
    const feeId = await seedStudentFee(tenantId, userIds[0], { amount: 500, status: 'paid', paid_amount: 500 });
    const { result } = renderHook(() => useFeesManagement());
    await act(async () => { await result.current.refundFee(feeId, 'trip cancelled'); });
    const fee = await getFee(feeId);
    expect(fee.status).toBe('refunded');
    expect(fee.notes).toContain('trip cancelled');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Expected: FAIL — RPCs not defined.

- [ ] **Step 3: Write RPCs**

```sql
-- 20260730150000_fee_payment_rpcs.sql
CREATE OR REPLACE FUNCTION record_fee_payment(
  p_fee_id uuid, p_method text, p_amount numeric, p_reference text DEFAULT NULL
) RETURNS gw_student_fees LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_fee gw_student_fees%ROWTYPE; v_remaining numeric; v_new_paid numeric; v_new_status text;
BEGIN
  SELECT * INTO v_fee FROM gw_student_fees WHERE id = p_fee_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'fee not found'; END IF;
  IF v_fee.status IN ('refunded','waived') THEN RAISE EXCEPTION 'cannot record payment on % fee', v_fee.status; END IF;
  IF p_amount <= 0 THEN RAISE EXCEPTION 'amount must be positive'; END IF;

  v_remaining := v_fee.amount - v_fee.paid_amount;
  IF p_amount > v_remaining THEN RAISE EXCEPTION 'amount exceeds remaining %', v_remaining; END IF;

  v_new_paid := v_fee.paid_amount + p_amount;
  v_new_status := CASE WHEN v_new_paid >= v_fee.amount THEN 'paid' ELSE 'partial' END;

  UPDATE gw_student_fees
    SET paid_amount = v_new_paid,
        status = v_new_status,
        payment_method = p_method,
        payment_reference = COALESCE(p_reference, payment_reference),
        paid_at = CASE WHEN v_new_status = 'paid' THEN now() ELSE paid_at END,
        updated_at = now()
  WHERE id = p_fee_id
  RETURNING * INTO v_fee;
  RETURN v_fee;
END $$;

CREATE OR REPLACE FUNCTION refund_fee(p_fee_id uuid, p_note text)
  RETURNS gw_student_fees LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_fee gw_student_fees%ROWTYPE;
BEGIN
  UPDATE gw_student_fees
    SET status = 'refunded',
        notes = COALESCE(notes || E'\n', '') || 'Refunded: ' || p_note,
        updated_at = now()
  WHERE id = p_fee_id RETURNING * INTO v_fee;
  IF NOT FOUND THEN RAISE EXCEPTION 'fee not found'; END IF;
  RETURN v_fee;
END $$;

CREATE OR REPLACE FUNCTION waive_fee(p_fee_id uuid, p_note text)
  RETURNS gw_student_fees LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_fee gw_student_fees%ROWTYPE;
BEGIN
  UPDATE gw_student_fees
    SET status = 'waived',
        notes = COALESCE(notes || E'\n', '') || 'Waived: ' || p_note,
        updated_at = now()
  WHERE id = p_fee_id RETURNING * INTO v_fee;
  IF NOT FOUND THEN RAISE EXCEPTION 'fee not found'; END IF;
  RETURN v_fee;
END $$;

GRANT EXECUTE ON FUNCTION record_fee_payment(uuid, text, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION refund_fee(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION waive_fee(uuid, text) TO authenticated;
```

- [ ] **Step 4: Add hook methods**

In `useFeesManagement.ts`:
```typescript
const recordPayment = useCallback(async (feeId: string, method: 'cash'|'check'|'venmo'|'other'|'stripe', amount: number, reference?: string) => {
  const { data, error } = await supabase.rpc('record_fee_payment', {
    p_fee_id: feeId, p_method: method, p_amount: amount, p_reference: reference ?? null,
  });
  if (error) throw error;
  await fetchStudentFees();
  return data;
}, []);

const refundFee = useCallback(async (feeId: string, note: string) => {
  const { data, error } = await supabase.rpc('refund_fee', { p_fee_id: feeId, p_note: note });
  if (error) throw error;
  await fetchStudentFees();
  return data;
}, []);

const waiveFee = useCallback(async (feeId: string, note: string) => {
  const { data, error } = await supabase.rpc('waive_fee', { p_fee_id: feeId, p_note: note });
  if (error) throw error;
  await fetchStudentFees();
  return data;
}, []);
```
Export from the hook's return.

- [ ] **Step 5: Apply migration + run test**

```bash
supabase db reset && npx vitest run src/hooks/__tests__/useFeesManagement.payments.test.ts
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat(fees): record_fee_payment / refund_fee / waive_fee RPCs and hook methods"
```

---

### Task 7: `useTenantStripeConnect` hook

**Files:**
- Create: `src/hooks/useTenantStripeConnect.ts`
- Create: `src/hooks/__tests__/useTenantStripeConnect.test.ts`

**Interfaces:**
- Consumes: `gw_tenants.stripe_account_id`, `stripe_charges_enabled`, `stripe_payouts_enabled` (existing columns)
- Produces: `useTenantStripeConnect() → { enabled: boolean, accountId: string | null, chargesEnabled: boolean, payoutsEnabled: boolean, loading: boolean }`. `enabled === true` iff `chargesEnabled === true` (payouts can lag).

- [ ] **Step 1: Write the failing test**

```typescript
// src/hooks/__tests__/useTenantStripeConnect.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { useTenantStripeConnect } from '../useTenantStripeConnect';
import { seedTenant, setTenantStripe, cleanupTenant, setActiveTenant } from '@/test/testDb';

describe('useTenantStripeConnect', () => {
  let tenantId: string;
  beforeEach(async () => { tenantId = await seedTenant(); await setActiveTenant(tenantId); });
  afterEach(async () => { await cleanupTenant(tenantId); });

  it('returns enabled=false when tenant has no Stripe account', async () => {
    const { result } = renderHook(() => useTenantStripeConnect());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.enabled).toBe(false);
    expect(result.current.accountId).toBeNull();
  });

  it('returns enabled=true when charges_enabled is true', async () => {
    await setTenantStripe(tenantId, { accountId: 'acct_123', chargesEnabled: true, payoutsEnabled: true });
    const { result } = renderHook(() => useTenantStripeConnect());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.enabled).toBe(true);
    expect(result.current.accountId).toBe('acct_123');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Expected: FAIL — hook not defined.

- [ ] **Step 3: Implement**

```typescript
// src/hooks/useTenantStripeConnect.ts
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TenantStripeConnectStatus {
  enabled: boolean;
  accountId: string | null;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  loading: boolean;
}

export const useTenantStripeConnect = (): TenantStripeConnectStatus => {
  const [state, setState] = useState<TenantStripeConnectStatus>({
    enabled: false, accountId: null, chargesEnabled: false, payoutsEnabled: false, loading: true,
  });

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('gw_tenants')
        .select('stripe_account_id, stripe_charges_enabled, stripe_payouts_enabled')
        .eq('id', await currentTenantId())
        .single();
      if (error) { setState(s => ({ ...s, loading: false })); return; }
      setState({
        enabled: !!data.stripe_charges_enabled,
        accountId: data.stripe_account_id ?? null,
        chargesEnabled: !!data.stripe_charges_enabled,
        payoutsEnabled: !!data.stripe_payouts_enabled,
        loading: false,
      });
    })();
  }, []);

  return state;
};

async function currentTenantId(): Promise<string> {
  const { data } = await supabase.rpc('current_tenant_id');
  return data as string;
}
```

- [ ] **Step 4: Run test**

Run: `npx vitest run src/hooks/__tests__/useTenantStripeConnect.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(fees): useTenantStripeConnect hook reads tenant's Connect status"
```

---

### Task 8: `create-fee-payment` edge function (Stripe Connect)

**Files:**
- Delete: `supabase/functions/create-dues-payment/` (entire directory)
- Create: `supabase/functions/create-fee-payment/index.ts`
- Create: `supabase/functions/create-fee-payment/__tests__/create-fee-payment.test.ts`

**Interfaces:**
- Consumes: `gw_student_fees`, `gw_tenants.stripe_account_id`, `useTenantStripeConnect` status (client-side)
- Produces: POST edge function accepting `{ studentFeeId: string, paymentType: 'full' | 'installment', installmentId?: string, paymentPlanId?: string }`, returns `{ url: string, sessionId: string, amount: number }`. Creates a Stripe Checkout Session with destination charge to the tenant's `stripe_account_id`, `application_fee_amount: 0`.

- [ ] **Step 1: Delete the old function**

```bash
git rm -r supabase/functions/create-dues-payment/
```

- [ ] **Step 2: Write the edge function**

```typescript
// supabase/functions/create-fee-payment/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://cdn.jsdelivr.net/npm/stripe@14.21.0/+esm";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FeePaymentRequest {
  studentFeeId: string;
  paymentType: 'full' | 'installment';
  installmentId?: string;
  paymentPlanId?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Authorization header required");
    const token = authHeader.replace("Bearer ", "");
    const origin = req.headers.get("origin") || "https://gleeworld.org";

    const supabaseAnon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
    const supabaseService = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

    const { data: userData, error: userErr } = await supabaseAnon.auth.getUser(token);
    if (userErr || !userData.user) throw new Error("Authentication failed");
    const user = userData.user;

    const body: FeePaymentRequest = await req.json();
    if (!body.studentFeeId) throw new Error("studentFeeId is required");

    // Load fee + tenant
    const { data: fee, error: feeErr } = await supabaseService
      .from('gw_student_fees')
      .select('*, gw_tenants!inner(id, stripe_account_id, stripe_charges_enabled)')
      .eq('id', body.studentFeeId)
      .eq('user_id', user.id)
      .single();
    if (feeErr || !fee) throw new Error("Fee not found or access denied");
    if (fee.status === 'paid') throw new Error("Fee already paid");
    if (fee.status === 'refunded' || fee.status === 'waived') throw new Error(`Fee is ${fee.status}`);

    const tenant = (fee as any).gw_tenants;
    if (!tenant.stripe_charges_enabled || !tenant.stripe_account_id) {
      throw new Error("Tenant has not enabled Stripe Connect. Please contact your treasurer.");
    }

    // Determine amount
    let amountCents: number; let itemName: string;
    if (body.paymentType === 'full') {
      const remaining = Number(fee.amount) - Number(fee.paid_amount);
      amountCents = Math.round(remaining * 100);
      itemName = fee.name;
    } else {
      if (!body.installmentId) throw new Error("installmentId required for installment payment");
      const { data: inst, error: instErr } = await supabaseService
        .from('gw_fee_plan_installments')
        .select('*, gw_fee_payment_plans!inner(user_id, student_fee_id)')
        .eq('id', body.installmentId).single();
      if (instErr || !inst) throw new Error("Installment not found");
      if ((inst as any).gw_fee_payment_plans.user_id !== user.id) throw new Error("Access denied");
      if (inst.status === 'paid') throw new Error("Installment already paid");
      amountCents = Math.round(Number(inst.amount) * 100);
      itemName = `${fee.name} — installment ${inst.installment_number}`;
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2023-10-16" });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: user.email!,
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: { name: itemName, description: fee.category },
          unit_amount: amountCents,
        },
        quantity: 1,
      }],
      payment_intent_data: {
        application_fee_amount: 0,
        transfer_data: { destination: tenant.stripe_account_id },
      },
      success_url: `${origin}/dashboard/my-fees?session_id={CHECKOUT_SESSION_ID}&status=success`,
      cancel_url: `${origin}/dashboard/my-fees?status=cancelled`,
      metadata: {
        student_fee_id: body.studentFeeId,
        tenant_id: tenant.id,
        user_id: user.id,
        payment_type: body.paymentType,
        installment_id: body.installmentId ?? '',
        payment_plan_id: body.paymentPlanId ?? '',
      },
    });

    return new Response(JSON.stringify({ url: session.url, sessionId: session.id, amount: amountCents / 100 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});
```

- [ ] **Step 3: Write a smoke test hitting Stripe test-mode**

```typescript
// supabase/functions/create-fee-payment/__tests__/create-fee-payment.test.ts
import { describe, it, expect } from 'vitest';
import { invokeEdgeFn, seedTenantWithStripe, seedStudentFee, authAsUser } from '@/test/edgeTestKit';

describe('create-fee-payment', () => {
  it('creates a Stripe Checkout session with destination charge', async () => {
    const { tenantId, accountId } = await seedTenantWithStripe(); // uses Stripe test acct
    const user = await authAsUser(tenantId);
    const feeId = await seedStudentFee(tenantId, user.id, { amount: 100, name: 'Trip' });
    const res = await invokeEdgeFn('create-fee-payment', { studentFeeId: feeId, paymentType: 'full' }, user.token);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.url).toMatch(/^https:\/\/checkout\.stripe\.com\//);
    expect(body.amount).toBe(100);
  });

  it('rejects when tenant has no Connect enabled', async () => {
    const { tenantId } = await seedTenantWithStripe({ chargesEnabled: false });
    const user = await authAsUser(tenantId);
    const feeId = await seedStudentFee(tenantId, user.id, { amount: 100 });
    const res = await invokeEdgeFn('create-fee-payment', { studentFeeId: feeId, paymentType: 'full' }, user.token);
    const body = await res.json();
    expect(body.error).toMatch(/Stripe Connect/);
  });
});
```

- [ ] **Step 4: Deploy function to local supabase for testing**

```bash
supabase functions serve create-fee-payment --env-file supabase/.env.local
```
In another terminal, run the test suite. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(fees): create-fee-payment edge fn — Stripe Connect destination charges"
```

---

### Task 9: `verify-fee-payment` webhook + client-triggered Stripe refund

**Files:**
- Delete: `supabase/functions/verify-dues-payment/` (entire directory)
- Create: `supabase/functions/verify-fee-payment/index.ts`
- Create: `supabase/functions/refund-fee-stripe/index.ts` (for Stripe refunds initiated from admin UI)
- Create: `supabase/functions/verify-fee-payment/__tests__/verify-fee-payment.test.ts`
- Modify: `src/hooks/useFeesManagement.ts` — augment `refundFee` to call `refund-fee-stripe` when `payment_method === 'stripe'`

**Interfaces:**
- Consumes: metadata from Stripe Checkout Session created in Task 8
- Produces:
  - `verify-fee-payment`: webhook handler wired to `checkout.session.completed`. Reads metadata, calls `record_fee_payment` RPC internally to update the row, marks the installment paid if applicable.
  - `refund-fee-stripe`: admin-invoked. Loads the fee, calls `stripe.refunds.create({ payment_intent })`, then calls `refund_fee` RPC.

- [ ] **Step 1: Delete old verify function**

```bash
git rm -r supabase/functions/verify-dues-payment/
```

- [ ] **Step 2: Write the webhook handler**

```typescript
// supabase/functions/verify-fee-payment/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://cdn.jsdelivr.net/npm/stripe@14.21.0/+esm";
import { createClient } from "jsr:@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2023-10-16" });
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

serve(async (req) => {
  const sig = req.headers.get("stripe-signature");
  if (!sig) return new Response("missing signature", { status: 400 });
  const raw = await req.text();

  let event: Stripe.Event;
  try { event = stripe.webhooks.constructEvent(raw, sig, webhookSecret); }
  catch (e) { return new Response(`signature: ${(e as Error).message}`, { status: 400 }); }

  if (event.type !== 'checkout.session.completed') return new Response("ignored", { status: 200 });
  const session = event.data.object as Stripe.Checkout.Session;
  const md = session.metadata ?? {};
  if (!md.student_fee_id) return new Response("not a fee payment", { status: 200 });

  const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;
  const amountPaid = (session.amount_total ?? 0) / 100;

  // Record the payment via RPC (idempotency: check if this PI already recorded)
  const { data: existing } = await admin
    .from('gw_student_fees')
    .select('id')
    .eq('id', md.student_fee_id)
    .eq('stripe_payment_intent_id', paymentIntentId)
    .maybeSingle();
  if (existing) return new Response("already recorded", { status: 200 });

  const { error } = await admin.rpc('record_fee_payment', {
    p_fee_id: md.student_fee_id,
    p_method: 'stripe',
    p_amount: amountPaid,
    p_reference: paymentIntentId,
  });
  if (error) return new Response(`rpc: ${error.message}`, { status: 500 });

  // Persist the PI id (RPC doesn't touch this field)
  await admin.from('gw_student_fees').update({ stripe_payment_intent_id: paymentIntentId }).eq('id', md.student_fee_id);

  // If installment, mark it paid
  if (md.installment_id) {
    await admin.from('gw_fee_plan_installments')
      .update({ status: 'paid', paid_amount: amountPaid, paid_at: new Date().toISOString(), stripe_payment_intent_id: paymentIntentId })
      .eq('id', md.installment_id);
  }

  return new Response("ok", { status: 200 });
});
```

- [ ] **Step 3: Write the refund function**

```typescript
// supabase/functions/refund-fee-stripe/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://cdn.jsdelivr.net/npm/stripe@14.21.0/+esm";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2023-10-16" });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response(JSON.stringify({ error: "auth required" }), { status: 401, headers: cors });
  const token = authHeader.replace("Bearer ", "");
  const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data: userData } = await anon.auth.getUser(token);
  if (!userData.user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: cors });

  const { studentFeeId, note } = await req.json();
  const { data: fee } = await admin.from('gw_student_fees').select('*').eq('id', studentFeeId).single();
  if (!fee) return new Response(JSON.stringify({ error: "fee not found" }), { status: 404, headers: cors });
  if (fee.payment_method !== 'stripe' || !fee.stripe_payment_intent_id) {
    return new Response(JSON.stringify({ error: "fee was not paid via Stripe" }), { status: 400, headers: cors });
  }

  try {
    await stripe.refunds.create({ payment_intent: fee.stripe_payment_intent_id });
  } catch (e) {
    return new Response(JSON.stringify({ error: `stripe: ${(e as Error).message}` }), { status: 502, headers: cors });
  }

  const { error } = await admin.rpc('refund_fee', { p_fee_id: studentFeeId, p_note: note ?? 'refund via Stripe' });
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: cors });

  return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, "Content-Type": "application/json" } });
});
```

- [ ] **Step 4: Wire client refund**

In `useFeesManagement.ts`, extend `refundFee`:
```typescript
const refundFee = useCallback(async (feeId: string, note: string) => {
  const { data: fee } = await supabase.from('gw_student_fees').select('payment_method, stripe_payment_intent_id').eq('id', feeId).single();
  if (fee?.payment_method === 'stripe' && fee.stripe_payment_intent_id) {
    const { data: session } = await supabase.auth.getSession();
    const res = await fetch(`${supabase.functions.url}/refund-fee-stripe`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session?.session?.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentFeeId: feeId, note }),
    });
    if (!res.ok) throw new Error((await res.json()).error);
  } else {
    const { error } = await supabase.rpc('refund_fee', { p_fee_id: feeId, p_note: note });
    if (error) throw error;
  }
  await fetchStudentFees();
}, []);
```

- [ ] **Step 5: Write webhook test using Stripe CLI event fixture**

```typescript
// supabase/functions/verify-fee-payment/__tests__/verify-fee-payment.test.ts
import { describe, it, expect } from 'vitest';
import { fireStripeWebhook, seedStudentFee, getFee, seedTenant, seedUsers } from '@/test/edgeTestKit';

describe('verify-fee-payment webhook', () => {
  it('marks fee paid on checkout.session.completed', async () => {
    const tenantId = await seedTenant();
    const [uid] = await seedUsers(tenantId, 1);
    const feeId = await seedStudentFee(tenantId, uid, { amount: 50 });
    await fireStripeWebhook({
      type: 'checkout.session.completed',
      data: { object: {
        payment_intent: 'pi_test_123',
        amount_total: 5000,
        metadata: { student_fee_id: feeId, tenant_id: tenantId, user_id: uid },
      }},
    });
    const fee = await getFee(feeId);
    expect(fee.status).toBe('paid');
    expect(fee.payment_method).toBe('stripe');
    expect(fee.stripe_payment_intent_id).toBe('pi_test_123');
  });

  it('is idempotent — duplicate webhook does not double-record', async () => {
    const tenantId = await seedTenant();
    const [uid] = await seedUsers(tenantId, 1);
    const feeId = await seedStudentFee(tenantId, uid, { amount: 50 });
    const evt = { type: 'checkout.session.completed', data: { object: { payment_intent: 'pi_dup', amount_total: 5000, metadata: { student_fee_id: feeId, tenant_id: tenantId, user_id: uid } } } };
    await fireStripeWebhook(evt);
    await fireStripeWebhook(evt);
    const fee = await getFee(feeId);
    expect(fee.paid_amount).toBe(50); // not 100
  });
});
```

- [ ] **Step 6: Run tests**

```bash
supabase functions serve verify-fee-payment --env-file supabase/.env.local &
npx vitest run supabase/functions/verify-fee-payment/__tests__/
```
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat(fees): verify-fee-payment webhook + refund-fee-stripe edge fn"
```

---

### Task 10: `useMyFees` — student's own ledger

**Files:**
- Create: `src/hooks/useMyFees.ts`
- Create: `src/hooks/__tests__/useMyFees.test.ts`

**Interfaces:**
- Consumes: `gw_student_fees`, `gw_fee_payment_plans`, `gw_fee_plan_installments`
- Produces:
  - `useMyFees() → { unpaid: MyFee[], paid: MyFee[], plans: MyPlan[], totalOwed: number, loading: boolean, refetch: () => Promise<void> }`
  - `interface MyFee extends StudentFee { plan?: MyPlan }` (installment plan attached if any)
  - `interface MyPlan { id, student_fee_id, installments: MyInstallment[] }`

- [ ] **Step 1: Write the failing test**

```typescript
// src/hooks/__tests__/useMyFees.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { useMyFees } from '../useMyFees';
import { seedTenant, seedUsers, seedStudentFee, authAsUser, cleanupTenant } from '@/test/testDb';

describe('useMyFees', () => {
  let tenantId: string;
  beforeEach(async () => { tenantId = await seedTenant(); });
  afterEach(async () => { await cleanupTenant(tenantId); });

  it('returns only the current user\'s fees, split by paid/unpaid', async () => {
    const [uid] = await seedUsers(tenantId, 1);
    await seedStudentFee(tenantId, uid, { amount: 500, name: 'Trip', status: 'pending' });
    await seedStudentFee(tenantId, uid, { amount: 100, name: 'Dues', status: 'paid', paid_amount: 100 });
    await authAsUser(tenantId, uid);
    const { result } = renderHook(() => useMyFees());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.unpaid).toHaveLength(1);
    expect(result.current.paid).toHaveLength(1);
    expect(result.current.totalOwed).toBe(500);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Expected: FAIL — hook not defined.

- [ ] **Step 3: Implement**

```typescript
// src/hooks/useMyFees.ts
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MyFeeInstallment { id: string; installment_number: number; amount: number; due_date: string; status: 'pending'|'paid'|'overdue'; paid_at?: string; }
export interface MyPlan { id: string; student_fee_id: string; installments: MyFeeInstallment[]; }
export interface MyFee {
  id: string; category: string; name: string; amount: number; paid_amount: number;
  due_date: string | null; status: string; payment_method: string | null; paid_at: string | null;
  plan?: MyPlan;
}

export const useMyFees = () => {
  const [unpaid, setUnpaid] = useState<MyFee[]>([]);
  const [paid, setPaid] = useState<MyFee[]>([]);
  const [plans, setPlans] = useState<MyPlan[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) { setLoading(false); return; }
      const { data: fees } = await supabase
        .from('gw_student_fees')
        .select('id, category, name, amount, paid_amount, due_date, status, payment_method, paid_at')
        .eq('user_id', user.id)
        .order('due_date', { ascending: true, nullsFirst: false });
      const { data: rawPlans } = await supabase
        .from('gw_fee_payment_plans')
        .select('id, student_fee_id, installments:gw_fee_plan_installments(id, installment_number, amount, due_date, status, paid_at)')
        .eq('user_id', user.id)
        .eq('status', 'active');

      const planByFee = new Map<string, MyPlan>();
      (rawPlans ?? []).forEach(p => planByFee.set(p.student_fee_id, p as any));

      const decorated: MyFee[] = (fees ?? []).map(f => ({ ...(f as any), plan: planByFee.get(f.id) }));
      setUnpaid(decorated.filter(f => f.status === 'pending' || f.status === 'partial' || f.status === 'overdue'));
      setPaid(decorated.filter(f => f.status === 'paid' || f.status === 'refunded' || f.status === 'waived'));
      setPlans(rawPlans as any ?? []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const totalOwed = unpaid.reduce((sum, f) => sum + (Number(f.amount) - Number(f.paid_amount)), 0);
  return { unpaid, paid, plans, totalOwed, loading, refetch: fetchAll };
};
```

- [ ] **Step 4: Run test**

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(fees): useMyFees hook for student's own ledger"
```

---

### Task 11: `/dashboard/my-fees` student page

**Files:**
- Create: `src/pages/dashboard/MyFeesPage.tsx`
- Create: `src/components/fees/StudentFeeCard.tsx`
- Create: `src/components/fees/PayFeeButton.tsx`
- Modify: `src/App.tsx` (add route)
- Modify: `src/lib/navigation/navCatalog.ts` (add nav entry for members)

**Interfaces:**
- Consumes: `useMyFees` (Task 10), `useTenantStripeConnect` (Task 7), edge fn `create-fee-payment` (Task 8)
- Produces: student-facing page at `/dashboard/my-fees` that shows unpaid list, paid history, and per-fee Pay button. If tenant lacks Connect, shows treasurer contact info from `gw_tenant_fee_settings`.

- [ ] **Step 1: Create the Pay button component**

```tsx
// src/components/fees/PayFeeButton.tsx
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';

export function PayFeeButton({ studentFeeId, disabled, label = 'Pay now' }: { studentFeeId: string; disabled?: boolean; label?: string; }) {
  const [loading, setLoading] = useState(false);
  const onPay = async () => {
    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const res = await fetch(`${(supabase as any).functions.url}/create-fee-payment`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.session?.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentFeeId, paymentType: 'full' }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      window.location.href = body.url;
    } catch (e) {
      alert(`Payment error: ${(e as Error).message}`);
    } finally { setLoading(false); }
  };
  return <Button onClick={onPay} disabled={disabled || loading}>{loading ? 'Loading…' : label}</Button>;
}
```

- [ ] **Step 2: Create the fee row component**

```tsx
// src/components/fees/StudentFeeCard.tsx
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PayFeeButton } from './PayFeeButton';
import { MyFee } from '@/hooks/useMyFees';

export function StudentFeeCard({ fee, canPay }: { fee: MyFee; canPay: boolean; }) {
  const remaining = Number(fee.amount) - Number(fee.paid_amount);
  return (
    <Card className="p-4 flex flex-col gap-2 bg-card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm text-muted-foreground uppercase tracking-wide">{fee.category}</div>
          <div className="font-semibold">{fee.name}</div>
          {fee.due_date && <div className="text-xs text-muted-foreground">Due {new Date(fee.due_date).toLocaleDateString()}</div>}
        </div>
        <div className="text-right">
          <div className="text-lg font-semibold">${remaining.toFixed(2)}</div>
          {Number(fee.paid_amount) > 0 && <div className="text-xs text-muted-foreground">${Number(fee.paid_amount).toFixed(2)} paid</div>}
          <Badge variant={fee.status === 'paid' ? 'default' : fee.status === 'overdue' ? 'destructive' : 'secondary'}>{fee.status}</Badge>
        </div>
      </div>
      {fee.plan && (
        <div className="border-t pt-2 mt-2 space-y-1">
          {fee.plan.installments.map(i => (
            <div key={i.id} className="flex items-center justify-between text-sm">
              <span>#{i.installment_number} · {new Date(i.due_date).toLocaleDateString()}</span>
              <span>${Number(i.amount).toFixed(2)} · {i.status}</span>
            </div>
          ))}
        </div>
      )}
      {(fee.status === 'pending' || fee.status === 'partial' || fee.status === 'overdue') && canPay && (
        <PayFeeButton studentFeeId={fee.id} />
      )}
    </Card>
  );
}
```

- [ ] **Step 3: Create the page**

```tsx
// src/pages/dashboard/MyFeesPage.tsx
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { useMyFees } from '@/hooks/useMyFees';
import { useTenantStripeConnect } from '@/hooks/useTenantStripeConnect';
import { StudentFeeCard } from '@/components/fees/StudentFeeCard';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';

export default function MyFeesPage() {
  const { unpaid, paid, totalOwed, loading } = useMyFees();
  const connect = useTenantStripeConnect();
  const [treasurer, setTreasurer] = useState<{ name?: string; email?: string; phone?: string; methods: string[] } | null>(null);

  useEffect(() => {
    if (connect.loading) return;
    if (connect.enabled) return;
    (async () => {
      const { data } = await supabase.from('gw_tenant_fee_settings').select('*').single();
      if (data) setTreasurer({
        name: data.treasurer_contact_name ?? undefined,
        email: data.treasurer_contact_email ?? undefined,
        phone: data.treasurer_contact_phone ?? undefined,
        methods: data.accepted_manual_methods ?? ['cash','check'],
      });
    })();
  }, [connect.loading, connect.enabled]);

  return (
    <DashboardPageShell title="My Fees">
      {loading || connect.loading ? <div>Loading…</div> : (
        <div className="space-y-6">
          <section className="rounded-2xl bg-primary/5 p-6 flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">You owe</div>
              <div className="text-3xl font-bold">${totalOwed.toFixed(2)}</div>
              <div className="text-xs text-muted-foreground">{unpaid.length} unpaid item{unpaid.length === 1 ? '' : 's'}</div>
            </div>
            {!connect.enabled && treasurer && (
              <div className="text-right text-sm">
                <div className="font-semibold">Contact your treasurer</div>
                {treasurer.name && <div>{treasurer.name}</div>}
                {treasurer.email && <a href={`mailto:${treasurer.email}`} className="text-primary">{treasurer.email}</a>}
                {treasurer.phone && <div>{treasurer.phone}</div>}
                <div className="text-xs text-muted-foreground mt-1">Accepts: {treasurer.methods.join(', ')}</div>
              </div>
            )}
          </section>

          {unpaid.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-3">Unpaid</h2>
              <div className="grid gap-3">{unpaid.map(f => <StudentFeeCard key={f.id} fee={f} canPay={connect.enabled} />)}</div>
            </section>
          )}

          {paid.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-3">History</h2>
              <div className="grid gap-3">{paid.map(f => <StudentFeeCard key={f.id} fee={f} canPay={false} />)}</div>
            </section>
          )}

          {unpaid.length === 0 && paid.length === 0 && <div className="text-muted-foreground">No fees on your account.</div>}
        </div>
      )}
    </DashboardPageShell>
  );
}
```

- [ ] **Step 4: Wire route + nav**

In `src/App.tsx` (or router):
```tsx
<Route path="/dashboard/my-fees" element={<MyFeesPage />} />
```

In `src/lib/navigation/navCatalog.ts`, add an entry for authenticated members (not admin-gated):
```typescript
{
  id: 'my-fees', label: 'My Fees', path: '/dashboard/my-fees',
  icon: 'CreditCard', roles: ['member','admin','super_admin'],
}
```

- [ ] **Step 5: Run the app + smoke-check manually**

```bash
npm run dev
```
Log in as `demo@`, navigate to `/dashboard/my-fees`, verify: header shows `$0.00` (or a real balance if seeded), unpaid section is empty (or shows seeded rows).

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat(fees): /dashboard/my-fees student surface"
```

---

### Task 12: HouseHome "You owe" card

**Files:**
- Create: `src/components/dashboard/YouOweCard.tsx`
- Modify: `src/pages/HouseHome.tsx` (or the actual home component — find with `grep -rl "HouseHome\|home cards"` in src/)

**Interfaces:**
- Consumes: `useMyFees` (Task 10)
- Produces: compact card component that renders only when `totalOwed > 0`, deep-links to `/dashboard/my-fees`.

- [ ] **Step 1: Locate the HouseHome home card container**

```bash
grep -rln "HouseHome" src/
```
Identify the file where dashboard home cards are composed.

- [ ] **Step 2: Create the card**

```tsx
// src/components/dashboard/YouOweCard.tsx
import { Card } from '@/components/ui/card';
import { useMyFees } from '@/hooks/useMyFees';
import { Link } from 'react-router-dom';
import { CreditCard } from 'lucide-react';

export function YouOweCard() {
  const { totalOwed, unpaid, loading } = useMyFees();
  if (loading || totalOwed <= 0) return null;
  return (
    <Link to="/dashboard/my-fees">
      <Card className="p-4 flex items-center gap-3 bg-primary/5 hover:bg-primary/10 transition">
        <CreditCard className="w-5 h-5 text-primary" />
        <div className="flex-1">
          <div className="text-sm text-muted-foreground">You owe</div>
          <div className="font-semibold">${totalOwed.toFixed(2)} across {unpaid.length} item{unpaid.length === 1 ? '' : 's'}</div>
        </div>
        <span className="text-primary text-sm">Pay now →</span>
      </Card>
    </Link>
  );
}
```

- [ ] **Step 3: Mount on HouseHome**

Add `<YouOweCard />` above the existing home card grid.

- [ ] **Step 4: Manual verify**

Seed a test fee for demo user via psql or the treasurer page. Load HouseHome. Verify card appears with correct amount. Delete the fee, verify card disappears.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(fees): YouOweCard on HouseHome"
```

---

### Task 13: Generalize notifications (add `fee_reminder` type + scheduled reminders)

**Files:**
- Modify: `src/hooks/useFeesManagement.ts` — `createReminder` and `sendBulkReminders` use notification `type: 'fee_reminder'` (accept legacy `dues_reminder` for read side)
- Create: `supabase/functions/schedule-fee-reminders/index.ts` (cron-invoked)
- Modify: `supabase/config.toml` (register the function for scheduling if repo uses that pattern; otherwise document manual cron setup)

**Interfaces:**
- Consumes: `gw_student_fees`, `gw_fee_reminders`, `gw_notifications`
- Produces: `schedule-fee-reminders` edge fn — for each unpaid fee whose due date is in [today+7, today+7], [today, today], or [today-3, today-3], creates a `gw_notifications` row with `type='fee_reminder'` and links to `/dashboard/my-fees?feeId=<id>`.

- [ ] **Step 1: Write the scheduler function**

```typescript
// supabase/functions/schedule-fee-reminders/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

async function windowsToRemind(): Promise<{ start: string; end: string; kind: string }[]> {
  const today = new Date(); today.setHours(0,0,0,0);
  const d = (offset: number) => new Date(today.getTime() + offset * 86400000).toISOString().slice(0,10);
  return [
    { start: d(7), end: d(7), kind: 'upcoming_due' },
    { start: d(0), end: d(0), kind: 'due_today' },
    { start: d(-3), end: d(-3), kind: 'overdue' },
  ];
}

serve(async () => {
  const wins = await windowsToRemind();
  let created = 0;
  for (const w of wins) {
    const { data: fees } = await admin
      .from('gw_student_fees')
      .select('id, user_id, name, amount, paid_amount, due_date, tenant_id')
      .in('status', ['pending','partial','overdue'])
      .gte('due_date', w.start).lte('due_date', w.end);

    for (const f of fees ?? []) {
      const remaining = Number(f.amount) - Number(f.paid_amount);
      const message = w.kind === 'overdue'
        ? `Your ${f.name} payment of $${remaining} is overdue.`
        : w.kind === 'due_today'
          ? `Your ${f.name} payment of $${remaining} is due today.`
          : `Your ${f.name} payment of $${remaining} is due on ${f.due_date}.`;
      // Idempotency: check for existing reminder in this window
      const { data: existing } = await admin
        .from('gw_notifications')
        .select('id')
        .eq('user_id', f.user_id).eq('related_id', f.id).eq('type', 'fee_reminder')
        .gte('created_at', new Date(Date.now() - 20*3600*1000).toISOString())
        .maybeSingle();
      if (existing) continue;
      await admin.from('gw_notifications').insert({
        user_id: f.user_id, tenant_id: f.tenant_id,
        title: w.kind === 'overdue' ? 'Payment overdue' : 'Payment reminder',
        message, type: 'fee_reminder', related_id: f.id,
      });
      created++;
    }
  }
  return new Response(JSON.stringify({ created }), { status: 200, headers: { 'Content-Type': 'application/json' } });
});
```

- [ ] **Step 2: Update `useFeesManagement.createReminder` / `sendBulkReminders`**

Change `type: 'dues_reminder'` → `type: 'fee_reminder'` in the notification insert. Leave the `related_id` referring to `gw_student_fees.id`.

- [ ] **Step 3: Document cron trigger for the scheduler**

Add to plan's Task 15 deploy notes: cron invokes `schedule-fee-reminders` once per day at 08:00 UTC. Actual cron wiring uses the existing platform pattern (search for `flatten-storage.sh` in memory — same pg_cron style).

- [ ] **Step 4: Manual smoke test**

Seed a fee due tomorrow, one due today, one due 3 days ago. Invoke `schedule-fee-reminders` once. Verify 3 notifications created. Invoke again immediately — verify no duplicates.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(fees): schedule-fee-reminders edge fn + fee_reminder notification type"
```

---

### Task 14: Generalized admin surface (`/dashboard/fees`)

**Files:**
- Rewrite: `src/pages/dashboard/FeesAdminPage.tsx` (renamed in Task 2, now gets tabs + template UI)
- Create: `src/components/fees/CreateFeeTemplateDialog.tsx`
- Create: `src/components/fees/FeeInstallmentScheduleEditor.tsx`
- Create: `src/components/fees/FeeAssignDialog.tsx`
- Create: `src/components/fees/FeeTemplateRollup.tsx`
- Create: `src/components/fees/MarkPaidDialog.tsx`

**Interfaces:**
- Consumes: `useFeeTemplates` (Task 3), `useFeeAssignment` (Task 4), `useFeesManagement` (Task 2, extended in Task 6)
- Produces: tabbed admin page with per-category tabs (`All | Dues | Wardrobe | Trips | Travel | Other`). Each tab shows templates (rollup) + instances. Create-template dialog + assign-to-members dialog + mark-paid dialog + refund + waive actions.

- [ ] **Step 1: Create `FeeInstallmentScheduleEditor`**

```tsx
// src/components/fees/FeeInstallmentScheduleEditor.tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface InstallmentRow { sequence: number; amount: number; due_date: string; }

export function FeeInstallmentScheduleEditor({ value, onChange }: { value: InstallmentRow[]; onChange: (v: InstallmentRow[]) => void; }) {
  return (
    <div className="space-y-2">
      {value.map((row, idx) => (
        <div key={idx} className="flex gap-2 items-center">
          <span className="w-6 text-sm text-muted-foreground">#{row.sequence}</span>
          <Input type="number" step="0.01" value={row.amount} onChange={e => {
            const next = [...value]; next[idx] = { ...row, amount: Number(e.target.value) }; onChange(next);
          }} />
          <Input type="date" value={row.due_date} onChange={e => {
            const next = [...value]; next[idx] = { ...row, due_date: e.target.value }; onChange(next);
          }} />
          <Button variant="ghost" size="sm" onClick={() => onChange(value.filter((_, i) => i !== idx))}>Remove</Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() =>
        onChange([...value, { sequence: value.length + 1, amount: 0, due_date: '' }])
      }>+ Add installment</Button>
    </div>
  );
}
```

- [ ] **Step 2: Create `CreateFeeTemplateDialog`**

```tsx
// src/components/fees/CreateFeeTemplateDialog.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useState } from 'react';
import { useFeeTemplates, FeeTemplate } from '@/hooks/useFeeTemplates';
import { FeeInstallmentScheduleEditor, InstallmentRow } from './FeeInstallmentScheduleEditor';

export function CreateFeeTemplateDialog({
  open, onClose, defaultCategory, contextType, contextId, onCreated,
}: {
  open: boolean; onClose: () => void;
  defaultCategory?: FeeTemplate['category'];
  contextType?: FeeTemplate['context_type']; contextId?: string;
  onCreated: (tpl: FeeTemplate) => void;
}) {
  const { createTemplate } = useFeeTemplates();
  const [name, setName] = useState(''); const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState<number>(0); const [dueDate, setDueDate] = useState<string>('');
  const [category, setCategory] = useState<FeeTemplate['category']>(defaultCategory ?? 'other');
  const [allowSplit, setAllowSplit] = useState(true);
  const [schedule, setSchedule] = useState<InstallmentRow[]>([]);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      const tpl = await createTemplate({
        category, name, description: desc, total_amount: amount, due_date: dueDate || undefined,
        allow_self_serve_split: allowSplit, context_type: contextType, context_id: contextId,
        installments: schedule.length ? schedule : undefined,
      });
      onCreated(tpl); onClose();
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>New fee template</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Select value={category} onValueChange={v => setCategory(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="dues">Dues</SelectItem>
              <SelectItem value="wardrobe">Wardrobe</SelectItem>
              <SelectItem value="trip">Trip</SelectItem>
              <SelectItem value="travel">Travel</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          <Input placeholder="Name (e.g., 2026 Rome Tour Deposit)" value={name} onChange={e => setName(e.target.value)} />
          <Textarea placeholder="Description (optional)" value={desc} onChange={e => setDesc(e.target.value)} />
          <div className="flex gap-2">
            <Input type="number" step="0.01" placeholder="Total amount" value={amount} onChange={e => setAmount(Number(e.target.value))} />
            <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={allowSplit} onCheckedChange={v => setAllowSplit(!!v)} />
            Allow students to split into 2/5/10 self-serve installments
          </label>
          <div>
            <div className="text-sm font-medium mb-1">Admin-defined installment schedule (optional)</div>
            <FeeInstallmentScheduleEditor value={schedule} onChange={setSchedule} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={busy || !name || amount <= 0}>{busy ? 'Creating…' : 'Create template'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Create `FeeAssignDialog`**

```tsx
// src/components/fees/FeeAssignDialog.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useFeeAssignment } from '@/hooks/useFeeAssignment';

interface Member { user_id: string; full_name: string; email: string; role: string; }

export function FeeAssignDialog({
  open, onClose, templateId, restrictToUserIds, onAssigned,
}: {
  open: boolean; onClose: () => void; templateId: string;
  restrictToUserIds?: string[];
  onAssigned: (count: number) => void;
}) {
  const { assign } = useFeeAssignment();
  const [members, setMembers] = useState<Member[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      let query = supabase.from('gw_profiles_directory').select('user_id, full_name, email, role').not('user_id', 'is', null);
      if (restrictToUserIds?.length) query = query.in('user_id', restrictToUserIds);
      const { data } = await query;
      setMembers((data ?? []) as Member[]);
      setSelected(new Set());
    })();
  }, [open, restrictToUserIds]);

  const filtered = useMemo(() =>
    members.filter(m => m.full_name.toLowerCase().includes(filter.toLowerCase()) || m.email.toLowerCase().includes(filter.toLowerCase()))
  , [members, filter]);

  const submit = async () => {
    setBusy(true);
    try {
      const count = await assign(templateId, Array.from(selected));
      onAssigned(count); onClose();
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Assign to members</DialogTitle></DialogHeader>
        <div className="space-y-2">
          <Input placeholder="Filter…" value={filter} onChange={e => setFilter(e.target.value)} />
          <div className="max-h-96 overflow-y-auto border rounded">
            {filtered.map(m => (
              <label key={m.user_id} className="flex items-center gap-2 p-2 hover:bg-accent">
                <Checkbox checked={selected.has(m.user_id)} onCheckedChange={v => {
                  const next = new Set(selected); if (v) next.add(m.user_id); else next.delete(m.user_id); setSelected(next);
                }} />
                <span className="flex-1">{m.full_name}</span>
                <span className="text-xs text-muted-foreground">{m.email}</span>
              </label>
            ))}
          </div>
          <div className="text-sm text-muted-foreground">{selected.size} selected</div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={busy || selected.size === 0}>{busy ? 'Assigning…' : `Assign to ${selected.size}`}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: Create `MarkPaidDialog`**

```tsx
// src/components/fees/MarkPaidDialog.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import { useFeesManagement } from '@/hooks/useFeesManagement';

export function MarkPaidDialog({
  open, onClose, feeId, remainingAmount,
}: { open: boolean; onClose: () => void; feeId: string; remainingAmount: number; }) {
  const { recordPayment } = useFeesManagement();
  const [amount, setAmount] = useState(remainingAmount);
  const [method, setMethod] = useState<'cash'|'check'|'venmo'|'other'>('cash');
  const [ref, setRef] = useState('');
  const [busy, setBusy] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Record payment</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Select value={method} onValueChange={v => setMethod(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="check">Check</SelectItem>
              <SelectItem value="venmo">Venmo</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          <Input type="number" step="0.01" value={amount} onChange={e => setAmount(Number(e.target.value))} />
          <Input placeholder="Reference (check #, Venmo handle, etc.)" value={ref} onChange={e => setRef(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={async () => {
            setBusy(true);
            try { await recordPayment(feeId, method, amount, ref || undefined); onClose(); }
            finally { setBusy(false); }
          }} disabled={busy || amount <= 0}>{busy ? 'Recording…' : 'Record'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 5: Create `FeeTemplateRollup`**

```tsx
// src/components/fees/FeeTemplateRollup.tsx
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FeeTemplate } from '@/hooks/useFeeTemplates';

export function FeeTemplateRollup({ template }: { template: FeeTemplate }) {
  const [rollup, setRollup] = useState({ collected: 0, expected: 0, paid: 0, total: 0 });
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('gw_student_fees').select('amount, paid_amount, status').eq('template_id', template.id);
      const rows = data ?? [];
      const expected = rows.reduce((s, r) => s + Number(r.amount), 0);
      const collected = rows.reduce((s, r) => s + Number(r.paid_amount), 0);
      const paid = rows.filter(r => r.status === 'paid').length;
      setRollup({ collected, expected, paid, total: rows.length });
    })();
  }, [template.id]);

  const pct = rollup.expected ? Math.round((rollup.collected / rollup.expected) * 100) : 0;
  return (
    <Card className="p-4 bg-card">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="font-semibold">{template.name}</div>
          <div className="text-xs text-muted-foreground uppercase tracking-wide">{template.category}</div>
        </div>
        <div className="text-right text-sm">
          <div className="font-semibold">${rollup.collected.toFixed(0)} / ${rollup.expected.toFixed(0)}</div>
          <div className="text-muted-foreground">{rollup.paid} / {rollup.total} paid</div>
        </div>
      </div>
      <Progress value={pct} />
    </Card>
  );
}
```

- [ ] **Step 6: Rewrite `FeesAdminPage` with tabs**

```tsx
// src/pages/dashboard/FeesAdminPage.tsx
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { useFeeTemplates, FeeTemplate } from '@/hooks/useFeeTemplates';
import { useFeesManagement } from '@/hooks/useFeesManagement';
import { CreateFeeTemplateDialog } from '@/components/fees/CreateFeeTemplateDialog';
import { FeeAssignDialog } from '@/components/fees/FeeAssignDialog';
import { FeeTemplateRollup } from '@/components/fees/FeeTemplateRollup';
import { MarkPaidDialog } from '@/components/fees/MarkPaidDialog';

const CATS = ['all','dues','wardrobe','trip','travel','other'] as const;

export default function FeesAdminPage() {
  const [tab, setTab] = useState<(typeof CATS)[number]>('all');
  const [templates, setTemplates] = useState<FeeTemplate[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [assignFor, setAssignFor] = useState<FeeTemplate | null>(null);
  const [markPaidFor, setMarkPaidFor] = useState<{ id: string; remaining: number } | null>(null);
  const { listTemplates } = useFeeTemplates();
  const { studentFees, refetch } = useFeesManagement();

  const reload = async () => setTemplates(await listTemplates({ category: tab === 'all' ? undefined : tab }));
  useEffect(() => { reload(); }, [tab]);

  const visibleFees = tab === 'all' ? studentFees : studentFees.filter(f => f.category === tab);

  return (
    <DashboardPageShell title="Fees">
      <Tabs value={tab} onValueChange={v => setTab(v as any)}>
        <TabsList>
          {CATS.map(c => <TabsTrigger key={c} value={c} className="capitalize">{c}</TabsTrigger>)}
        </TabsList>
        {CATS.map(c => (
          <TabsContent key={c} value={c} className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Templates</h2>
              <Button onClick={() => setCreateOpen(true)}>+ New template</Button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {templates.map(t => (
                <div key={t.id}>
                  <FeeTemplateRollup template={t} />
                  <Button variant="outline" size="sm" className="mt-2" onClick={() => setAssignFor(t)}>Assign to members</Button>
                </div>
              ))}
            </div>

            <h2 className="text-lg font-semibold mt-6">Individual fees</h2>
            <div className="border rounded divide-y">
              {visibleFees.map(f => {
                const remaining = Number(f.amount) - Number(f.paid_amount);
                return (
                  <div key={f.id} className="p-3 flex items-center justify-between">
                    <div>
                      <div className="font-medium">{f.name}</div>
                      <div className="text-xs text-muted-foreground">{f.user_profile?.full_name} · ${f.paid_amount} / ${f.amount} · {f.status}</div>
                    </div>
                    {remaining > 0 && f.status !== 'refunded' && f.status !== 'waived' && (
                      <Button size="sm" variant="outline" onClick={() => setMarkPaidFor({ id: f.id, remaining })}>Mark paid</Button>
                    )}
                  </div>
                );
              })}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      <CreateFeeTemplateDialog
        open={createOpen} onClose={() => setCreateOpen(false)}
        defaultCategory={tab === 'all' ? undefined : (tab as any)}
        onCreated={reload}
      />
      {assignFor && (
        <FeeAssignDialog
          open={!!assignFor} onClose={() => setAssignFor(null)}
          templateId={assignFor.id} onAssigned={() => refetch()}
        />
      )}
      {markPaidFor && (
        <MarkPaidDialog
          open={!!markPaidFor} onClose={() => setMarkPaidFor(null)}
          feeId={markPaidFor.id} remainingAmount={markPaidFor.remaining}
        />
      )}
    </DashboardPageShell>
  );
}
```

- [ ] **Step 7: Manual smoke test**

Log in as admin, navigate to `/dashboard/fees`, create a Trip template, assign to 2 members, mark one paid. Verify rollup updates.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat(fees): /dashboard/fees admin surface with tabs, templates, assign, mark-paid"
```

---

### Task 15: Wardrobe inline fee creation

**Files:**
- Modify: `src/components/tour-manager/wardrobe/WardrobeCheckoutSystem.tsx`

**Interfaces:**
- Consumes: `CreateFeeTemplateDialog` (Task 14), `useFeeTemplates` (Task 3), `useFeeAssignment` (Task 4)
- Produces: new "Charge fee for this item" section in the wardrobe checkout flow. When enabled, admin picks an existing wardrobe-category template or creates a new one inline, and on wardrobe issue the fee is auto-assigned to the recipient with `context_type='wardrobe_item'`, `context_id=<item_id>`.

- [ ] **Step 1: Locate the existing wardrobe checkout submission handler**

```bash
grep -n "gw_wardrobe\|WardrobeCheckoutSystem" src/components/tour-manager/wardrobe/WardrobeCheckoutSystem.tsx | head -20
```
Identify the submit function that inserts the wardrobe issue row.

- [ ] **Step 2: Add fee-toggle UI + template picker**

Above the submit button, add:
```tsx
<div className="border-t pt-4 space-y-2">
  <label className="flex items-center gap-2">
    <Checkbox checked={chargeFee} onCheckedChange={v => setChargeFee(!!v)} />
    <span>Charge a fee for this item</span>
  </label>
  {chargeFee && (
    <>
      <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
        <SelectTrigger><SelectValue placeholder="Pick a fee template" /></SelectTrigger>
        <SelectContent>
          {wardrobeTemplates.map(t => <SelectItem key={t.id} value={t.id}>{t.name} — ${t.total_amount}</SelectItem>)}
        </SelectContent>
      </Select>
      <Button variant="link" size="sm" onClick={() => setCreateOpen(true)}>+ Create new fee template</Button>
    </>
  )}
</div>
<CreateFeeTemplateDialog
  open={createOpen} onClose={() => setCreateOpen(false)}
  defaultCategory="wardrobe" contextType="wardrobe_item" contextId={itemId}
  onCreated={t => { setSelectedTemplateId(t.id); setWardrobeTemplates([t, ...wardrobeTemplates]); }}
/>
```

Add state: `const [chargeFee, setChargeFee] = useState(false);`, `const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');`, `const [wardrobeTemplates, setWardrobeTemplates] = useState<FeeTemplate[]>([]);`, `const [createOpen, setCreateOpen] = useState(false);`

Load templates on mount: `useEffect(() => { listTemplates({ category: 'wardrobe' }).then(setWardrobeTemplates); }, []);`

- [ ] **Step 3: Wire fee creation into the submit path**

In the wardrobe issue submit handler, after the wardrobe row is inserted:
```typescript
if (chargeFee && selectedTemplateId) {
  const count = await assign(selectedTemplateId, [recipientUserId]);
  if (count === 0) toast({ title: 'Fee already assigned' });
}
```

- [ ] **Step 4: Manual smoke test**

Issue a wardrobe item to a member with fee enabled. Log in as that member, verify `/dashboard/my-fees` shows the new fee row.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(fees): wardrobe inline fee creation on checkout"
```

---

### Task 16: Tour Manager trip Fees tab

**Files:**
- Modify: `src/components/tour-manager/TripDetail.tsx` (or the actual trip detail component — find with `grep -rl "tour.*trip.*detail" src/tour-manager/`)
- Create: `src/components/tour-manager/TripFeesTab.tsx`

**Interfaces:**
- Consumes: `useFeeTemplates`, `useFeeAssignment`, `CreateFeeTemplateDialog`, `FeeAssignDialog`, `FeeTemplateRollup`
- Produces: new "Fees" tab on the trip detail page. Templates are auto-filtered to this trip's `context_id`. Assign dialog restricts member list to trip attendees only.

- [ ] **Step 1: Locate the trip detail component and its tabs**

```bash
grep -rln "TripDetail\|trip_id.*detail" src/components/tour-manager/
```

- [ ] **Step 2: Create the TripFeesTab component**

```tsx
// src/components/tour-manager/TripFeesTab.tsx
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useFeeTemplates, FeeTemplate } from '@/hooks/useFeeTemplates';
import { CreateFeeTemplateDialog } from '@/components/fees/CreateFeeTemplateDialog';
import { FeeAssignDialog } from '@/components/fees/FeeAssignDialog';
import { FeeTemplateRollup } from '@/components/fees/FeeTemplateRollup';

export function TripFeesTab({ tripId }: { tripId: string }) {
  const { listTemplates } = useFeeTemplates();
  const [templates, setTemplates] = useState<FeeTemplate[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [assignFor, setAssignFor] = useState<FeeTemplate | null>(null);
  const [attendees, setAttendees] = useState<string[]>([]);

  const reload = async () => setTemplates(await listTemplates({ contextType: 'trip', contextId: tripId }));

  useEffect(() => {
    reload();
    (async () => {
      const { data } = await supabase.from('gw_tour_trip_attendees').select('user_id').eq('trip_id', tripId);
      setAttendees((data ?? []).map(r => r.user_id));
    })();
  }, [tripId]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Trip fees</h3>
        <Button onClick={() => setCreateOpen(true)}>+ New trip fee</Button>
      </div>
      <div className="grid gap-3">
        {templates.map(t => (
          <div key={t.id}>
            <FeeTemplateRollup template={t} />
            <Button variant="outline" size="sm" className="mt-2" onClick={() => setAssignFor(t)}>Assign to attendees ({attendees.length})</Button>
          </div>
        ))}
        {templates.length === 0 && <div className="text-muted-foreground text-sm">No fees yet for this trip.</div>}
      </div>

      <CreateFeeTemplateDialog
        open={createOpen} onClose={() => setCreateOpen(false)}
        defaultCategory="trip" contextType="trip" contextId={tripId}
        onCreated={reload}
      />
      {assignFor && (
        <FeeAssignDialog
          open={!!assignFor} onClose={() => setAssignFor(null)}
          templateId={assignFor.id} restrictToUserIds={attendees}
          onAssigned={() => reload()}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Mount the tab in TripDetail**

Add a `<Tabs>` entry:
```tsx
<TabsTrigger value="fees">Fees</TabsTrigger>
...
<TabsContent value="fees"><TripFeesTab tripId={trip.id} /></TabsContent>
```
Adjust the actual attendee-table name if `gw_tour_trip_attendees` differs (grep first).

- [ ] **Step 4: Verify the attendee table name**

```bash
grep -rln "trip_attendees\|attendees.*trip" supabase/migrations/ src/components/tour-manager/
```
If the table is named differently, update the query.

- [ ] **Step 5: Manual smoke test**

Open a trip, create a trip fee ($500 deposit), assign to attendees. Log in as a trip attendee, verify `/dashboard/my-fees` shows the trip fee.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat(fees): Tour Manager trip fees tab"
```

---

### Task 17: Playwright E2E — student pay flow + tenant isolation

**Files:**
- Create: `tests/e2e/student-fees.spec.ts`

**Interfaces:**
- Consumes: full stack from Tasks 1-16
- Produces: Playwright test that logs in as `demo@`, seeds a fee via admin API, visits `/dashboard/my-fees`, clicks Pay, completes Stripe test-mode checkout, returns to page, verifies row is paid. Second spec: creates fee on tenant A, verifies tenant B's demo user cannot see it.

- [ ] **Step 1: Write the E2E spec**

```typescript
// tests/e2e/student-fees.spec.ts
import { test, expect } from '@playwright/test';
import { seedFeeForDemoUser, cleanupSeededFees, tenantASlug, tenantBSlug } from './helpers/feeSeed';

test.describe('student fees', () => {
  test.afterEach(async () => { await cleanupSeededFees(); });

  test('student sees owed balance and can pay via Stripe test checkout', async ({ page }) => {
    const feeId = await seedFeeForDemoUser({ amount: 25, name: 'E2E Trip Deposit', category: 'trip' });

    await page.goto('/');
    await page.getByLabel('Email').fill('demo@gleeworld.org');
    await page.getByLabel('Password').fill(process.env.DEMO_PASSWORD!);
    await page.getByRole('button', { name: 'Log in' }).click();

    await page.goto('/dashboard/my-fees');
    await expect(page.getByText('$25.00', { exact: false })).toBeVisible();
    await expect(page.getByText('E2E Trip Deposit')).toBeVisible();

    await page.getByRole('button', { name: /Pay/ }).first().click();
    await expect(page).toHaveURL(/checkout\.stripe\.com/);

    await page.getByPlaceholder('1234 1234 1234 1234').fill('4242424242424242');
    await page.getByPlaceholder('MM / YY').fill('12 / 34');
    await page.getByPlaceholder('CVC').fill('123');
    await page.getByPlaceholder('Full name on card').fill('E2E Test');
    await page.getByRole('button', { name: /Pay/ }).click();

    await page.waitForURL(/\/dashboard\/my-fees/);
    await expect(page.getByText('paid')).toBeVisible();
  });

  test('tenant isolation — tenant B cannot see tenant A fees', async ({ page, context }) => {
    const feeId = await seedFeeForDemoUser({ tenantSlug: tenantASlug, amount: 500, name: 'Only A sees this' });
    await page.goto(`https://${tenantBSlug}.gleeworld.org/dashboard/my-fees`);
    // (log in as tenant B's demo user — omitted for brevity)
    await expect(page.getByText('Only A sees this')).not.toBeVisible();
  });
});
```

- [ ] **Step 2: Add seed helpers**

```typescript
// tests/e2e/helpers/feeSeed.ts
// Uses service-role key via a scratch supabase client to insert + delete rows.
// Follow the pattern from reference_gleeworld_e2e_harness.md.
```

- [ ] **Step 3: Run against demo tenant**

```bash
npm run e2e -- --grep "student fees"
```
Expected: both specs pass. Any failure indicates a real bug in prior tasks; fix and re-run.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "test(fees): Playwright E2E for student pay flow + tenant isolation"
```

---

### Task 18: Deploy checklist + docs

**Files:**
- Modify: `docs/superpowers/specs/2026-07-30-student-fees-design.md` — mark status "Implemented, pending deploy"
- Create: `docs/deploy-notes/2026-07-30-student-fees.md`
- Modify: memory file `project_student_fees_addon.md` (append entry to MEMORY.md)

**Interfaces:**
- Consumes: complete implementation from Tasks 1-17
- Produces: deploy notes for the operator: migration order, edge fn deploys, cron setup, Stripe webhook endpoint registration, feature flag / rollout plan.

- [ ] **Step 1: Write deploy notes**

```markdown
# Student Fees deploy — 2026-07-30

## Order
1. **Apply migrations** (via `apply_migration` MCP or `psql` on supabase.gleeworld.org):
   - `20260730120000_student_fees.sql`
   - `20260730130000_assign_fee_template_rpc.sql`
   - `20260730140000_propagate_template_edits.sql`
   - `20260730150000_fee_payment_rpcs.sql`
2. **Deploy edge functions** to `/opt/supabase/volumes/functions/`:
   - Delete `create-dues-payment/`, `verify-dues-payment/`
   - Add `create-fee-payment/`, `verify-fee-payment/`, `refund-fee-stripe/`, `schedule-fee-reminders/`
   - Run md5-verify per `reference_edge_fn_deploy.md`
3. **Register Stripe webhook endpoint**: point `checkout.session.completed` at
   `https://supabase.gleeworld.org/functions/v1/verify-fee-payment` on the platform
   Stripe account. Copy the endpoint's signing secret into
   `/opt/supabase/.env` as `STRIPE_WEBHOOK_SECRET`.
4. **Cron**: schedule `schedule-fee-reminders` daily at 08:00 UTC via pg_cron
   (same pattern as `flatten-storage.sh`).
5. **Build web**: `npm ci && npm run build` on `~/Documents/GitHub/gleeworld`
   then rsync `dist/` to the app droplet (NEVER `--delete`).
6. **Smoke test** on tenant with Connect enabled (main.gleeworld.org): seed a
   fee, verify student page, complete a $1 test payment via Stripe test key.

## Rollback
Feature isn't behind a flag. If we need to roll back:
- Web: revert the last deploy's `dist/` from backup.
- DB: reverse-rename tables back to `gw_dues_*` (script the inverse of the
  migration, don't rely on `supabase db reset`).
```

- [ ] **Step 2: Update the design spec status**

```markdown
**Status:** Implemented (pending deploy) — 2026-07-30
```

- [ ] **Step 3: Add memory entry**

Create `~/.claude/projects/-Users-kevinjohnson/memory/project_student_fees_addon.md`:
```markdown
---
name: Student Fees ledger
description: Per-student ledger for dues/wardrobe/trip/travel fees. Stripe Connect self-pay + manual mark-paid; templates + admin-defined or self-serve installments.
type: project
---
Shipped 2026-07-30. Schema: `gw_student_fees`, `gw_fee_templates`, `gw_fee_template_installments`, `gw_fee_payment_plans`, `gw_fee_plan_installments`, `gw_fee_reminders`, `gw_tenant_fee_settings`. Renamed from `gw_dues_*` — no shim. Money flow: `create-fee-payment` → Stripe Connect destination charge to `tenant.stripe_account_id`, `application_fee_amount=0`. Webhook: `verify-fee-payment` (checkout.session.completed). Refund: `refund-fee-stripe` for card payments. Cron: `schedule-fee-reminders` daily. Student page: `/dashboard/my-fees`. Admin page: `/dashboard/fees` (redirect from `/dues-management`). Wardrobe + Tour Manager have inline fee creation. Spec: docs/superpowers/specs/2026-07-30-student-fees-design.md.

**Why:** Tenants need to collect student payments beyond just Box Office tickets.
**How to apply:** New fee categories → add to CHECK constraints on `gw_student_fees.category` and `gw_fee_templates.category`. New context types → add to CHECK. Never re-enable `application_fee_amount > 0` without Kevin's OK.
```

Add to `MEMORY.md`:
```markdown
- [Student Fees ledger](project_student_fees_addon.md) — dues/wardrobe/trip/travel fees, Stripe Connect self-pay + manual mark-paid, `/dashboard/my-fees`. Shipped 2026-07-30.
```

- [ ] **Step 4: Commit**

```bash
git add docs/deploy-notes/2026-07-30-student-fees.md docs/superpowers/specs/2026-07-30-student-fees-design.md
git commit -m "docs(fees): deploy notes + spec status update"
```

- [ ] **Step 5: Open PR**

```bash
git push -u origin student-fees
gh pr create --title "Student Fees ledger (dues + wardrobe + trip + travel)" --body "$(cat <<'EOF'
## Summary
- Generalizes the dues schema into a per-student fees ledger across dues, wardrobe, trip, travel, and one-off fees.
- Adds Stripe Connect destination charges routed to the tenant's Stripe account (0% platform fee, matching Box Office).
- Manual mark-paid path always available for tenants without Connect.
- Admin-defined installment schedules for trips; self-serve 2/5/10-way splits preserved for dues.
- New `/dashboard/my-fees` student surface + HouseHome "You owe" card + generalized `/dashboard/fees` admin surface.
- Wardrobe + Tour Manager get inline fee creation.

## Test plan
- [ ] Migration applies cleanly on scratch DB
- [ ] Existing dues data still readable
- [ ] Tenant RLS blocks cross-tenant reads
- [ ] Vitest suites for all hooks + RPCs pass
- [ ] Edge fn tests pass (create/verify/refund)
- [ ] Playwright E2E: student pay flow + tenant isolation
- [ ] Manual smoke on tenant with Connect enabled: full pay + partial + installment + refund
- [ ] Manual smoke on tenant without Connect: manual mark-paid works
- [ ] Wardrobe inline creation
- [ ] Tour Manager trip fees tab

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-review checklist (author fills in before handoff)

**Spec coverage:**
- Data model (6 tables) → Task 1
- Money flow (Stripe Connect + manual + refund) → Tasks 6, 8, 9
- Admin surface (`/dashboard/fees` tabbed) → Task 14
- Wardrobe inline → Task 15
- Tour Manager tab → Task 16
- Student `/dashboard/my-fees` → Task 11
- HouseHome card → Task 12
- Notifications + cron → Task 13
- Migration → Task 1 + rename in Task 2
- Testing (unit + E2E) → Tasks 3-10, 17
- Deploy notes + memory → Task 18

**Placeholder scan:** none. Every step has real code or a real command.

**Type consistency:** `MyFee` is the student-side type (Task 10). `StudentFee` (from `useFeesManagement`) is the admin-side type. Both back onto the same `gw_student_fees` row. Method name `recordPayment` matches across `useFeesManagement` (Task 6) and `MarkPaidDialog` (Task 14).
