# Attendance-Linked Stipends Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tie a student's semester stipend to their attendance record, so that missed services reduce the stipend automatically and visibly.

**Architecture:** A pure TypeScript calculation core (no DB) holds the pro-rata math and is unit-tested in isolation. Three new tenant-scoped tables (`gw_stipend_policies`, `gw_stipend_periods`, `gw_stipend_awards`) hold the agreement, and a SQL view (`v_stipend_standing`) derives live earned/forfeited amounts by joining awards to `gw_event_attendance` through a configurable status-weight map. The view is the single source of truth while a period is active; closing a period snapshots it.

**Tech Stack:** React 18 + TypeScript, Vite, Vitest, shadcn/ui, TanStack Query, self-hosted Supabase (Postgres + RLS).

## Global Constraints

- Work in the worktree `~/Documents/GitHub/gleeworld-stipend` on branch `feat/stipend-attendance`. Never build from the shared checkout.
- Every new table: `tenant_id UUID NOT NULL DEFAULT public.current_tenant_id()`, a `BEFORE INSERT` trigger running `public.set_tenant_id_default()`, `ENABLE ROW LEVEL SECURITY`, and a `RESTRICTIVE` policy `tenant_isolation_restrict`.
- Admin write access uses `public.is_current_user_admin_or_super_admin()`.
- `updated_at` maintained by `public.update_updated_at_column()`.
- `src/integrations/supabase/types.ts` is stale and does **not** list `tenant_id` on `gw_events` / `gw_event_attendance`. Both columns exist in the live database. Do not "fix" the schema based on that file; cast where TypeScript objects.
- Tenant-neutral copy throughout. Say "students", never "singers" or "members". Never hardcode a tenant name.
- Light theme tokens only — white cards, dark text. Never dark-navy cards.
- Money is `NUMERIC(10,2)` in SQL and a `number` of dollars in TypeScript.
- Run `npm test` (vitest) for unit tests. Deps are already installed in the worktree.
- Round one stops before payout. Do not write to `gw_stipend_payments` or `gw_running_ledger`.

## File Structure

| File | Responsibility |
|---|---|
| `src/features/stipends/policy.ts` | Status-weight types, defaults, weight lookup |
| `src/features/stipends/calculate.ts` | Pro-rata math — pure, no I/O |
| `src/features/stipends/__tests__/calculate.test.ts` | Unit tests for the math |
| `supabase/migrations/20260806160000_attendance_linked_stipends.sql` | Tables, RLS, indexes |
| `supabase/migrations/20260806160100_stipend_standing_view.sql` | `v_stipend_standing` |
| `supabase/migrations/tests/attendance_linked_stipends_test.sql` | Schema/RLS assertions |
| `src/features/stipends/useStipendPeriods.ts` | Period + award CRUD hooks |
| `src/features/stipends/useStipendStanding.ts` | Reads the standing view |
| `src/features/stipends/components/StipendPeriodForm.tsx` | Create/edit a period |
| `src/features/stipends/components/StipendPeriodsPanel.tsx` | Period list + roster entry |
| `src/features/stipends/components/StipendRoster.tsx` | Standing table + overrides |
| `src/features/stipends/components/EnrollStudentsDialog.tsx` | Adds students to a period |
| `src/features/stipends/components/StipendPolicyEditor.tsx` | Edits the status-weight map |
| `src/features/stipends/components/MyStipendCard.tsx` | Student-facing card |
| `src/components/modules/FinanceHub.tsx` | Mount point (Stipends tab) |
| `src/components/admin/FinancialSystem.tsx:115` | Retires the contract-driven stipend tab |

---

### Task 1: Calculation core

The math lives on its own so it can be tested without a database, and so the
view and the UI cannot disagree about what a stipend is worth.

**Files:**
- Create: `src/features/stipends/policy.ts`
- Create: `src/features/stipends/calculate.ts`
- Test: `src/features/stipends/__tests__/calculate.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `DEFAULT_STATUS_WEIGHTS`, `StatusWeights`, `Rounding`, `weightFor(status, weights): number | null`, `calculateStanding(input: StipendInput): StipendStanding`.

- [ ] **Step 1: Write the failing test**

Create `src/features/stipends/__tests__/calculate.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { DEFAULT_STATUS_WEIGHTS } from '../policy';
import { calculateStanding } from '../calculate';

const marks = (...statuses: string[]) =>
  statuses.map((status, i) => ({ eventId: `e${i}`, status }));

describe('calculateStanding', () => {
  it('pays the full stipend for perfect attendance', () => {
    const r = calculateStanding({
      baseAmount: 500,
      requiredServices: 20,
      marks: marks(...Array(20).fill('present')),
      weights: DEFAULT_STATUS_WEIGHTS,
    });
    expect(r.earned).toBe(500);
    expect(r.forfeited).toBe(0);
    expect(r.perServiceValue).toBe(25);
  });

  it('deducts one service share per absence', () => {
    const r = calculateStanding({
      baseAmount: 500,
      requiredServices: 20,
      marks: marks(...Array(18).fill('present'), 'absent', 'absent'),
      weights: DEFAULT_STATUS_WEIGHTS,
    });
    expect(r.creditedServices).toBe(18);
    expect(r.absences).toBe(2);
    expect(r.earned).toBe(450);
    expect(r.forfeited).toBe(50);
  });

  it('gives late arrivals half credit', () => {
    const r = calculateStanding({
      baseAmount: 500,
      requiredServices: 20,
      marks: marks(...Array(19).fill('present'), 'late'),
      weights: DEFAULT_STATUS_WEIGHTS,
    });
    expect(r.creditedServices).toBe(19.5);
    expect(r.earned).toBe(487.5);
  });

  it('treats tardy the same as late', () => {
    const r = calculateStanding({
      baseAmount: 500,
      requiredServices: 20,
      marks: marks('tardy'),
      weights: DEFAULT_STATUS_WEIGHTS,
    });
    expect(r.creditedServices).toBe(0.5);
  });

  it('holds approved excuses harmless by default', () => {
    const r = calculateStanding({
      baseAmount: 500,
      requiredServices: 20,
      marks: marks(...Array(19).fill('present'), 'excused'),
      weights: DEFAULT_STATUS_WEIGHTS,
    });
    expect(r.earned).toBe(500);
    expect(r.absences).toBe(0);
  });

  it('rounds to cents', () => {
    const r = calculateStanding({
      baseAmount: 500,
      requiredServices: 3,
      marks: marks('present', 'present'),
      weights: DEFAULT_STATUS_WEIGHTS,
    });
    expect(r.earned).toBe(333.33);
  });

  it('rounds to whole dollars when the policy says so', () => {
    const r = calculateStanding({
      baseAmount: 500,
      requiredServices: 3,
      marks: marks('present', 'present'),
      weights: DEFAULT_STATUS_WEIGHTS,
      rounding: 'dollar',
    });
    expect(r.earned).toBe(333);
  });

  it('clamps at the full stipend when a student attends extra services', () => {
    const r = calculateStanding({
      baseAmount: 500,
      requiredServices: 20,
      marks: marks(...Array(22).fill('present')),
      weights: DEFAULT_STATUS_WEIGHTS,
    });
    expect(r.earned).toBe(500);
    expect(r.forfeited).toBe(0);
  });

  it('pays nothing when every service is missed', () => {
    const r = calculateStanding({
      baseAmount: 500,
      requiredServices: 20,
      marks: marks(...Array(20).fill('absent')),
      weights: DEFAULT_STATUS_WEIGHTS,
    });
    expect(r.earned).toBe(0);
    expect(r.forfeited).toBe(500);
  });

  it('counts an unmapped status as zero credit and flags it', () => {
    const r = calculateStanding({
      baseAmount: 500,
      requiredServices: 20,
      marks: marks('present', 'sabbatical'),
      weights: DEFAULT_STATUS_WEIGHTS,
    });
    expect(r.creditedServices).toBe(1);
    expect(r.unmappedCount).toBe(1);
    expect(r.absences).toBe(0);
  });

  it('returns a zeroed standing rather than dividing by zero', () => {
    const r = calculateStanding({
      baseAmount: 500,
      requiredServices: 0,
      marks: marks('present'),
      weights: DEFAULT_STATUS_WEIGHTS,
    });
    expect(r.earned).toBe(0);
    expect(r.perServiceValue).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/features/stipends`
Expected: FAIL — cannot resolve `../policy` and `../calculate`.

- [ ] **Step 3: Write the implementation**

Create `src/features/stipends/policy.ts`:

```ts
/** Credit a given attendance status earns toward a stipend, 0..1. */
export type StatusWeights = Record<string, number>;

export type Rounding = 'cent' | 'dollar';

/**
 * Tenant-editable defaults. `tardy` and `late` both appear in existing
 * attendance data and mean the same thing.
 */
export const DEFAULT_STATUS_WEIGHTS: StatusWeights = {
  present: 1,
  late: 0.5,
  tardy: 0.5,
  excused: 1,
  absent: 0,
};

/**
 * Returns the weight for a status, or null when the status is not in the
 * map. Null is deliberately distinct from 0: an unmapped status is a
 * configuration problem to surface, not a silent deduction.
 */
export function weightFor(status: string, weights: StatusWeights): number | null {
  const w = weights[status];
  return typeof w === 'number' && Number.isFinite(w) ? w : null;
}
```

Create `src/features/stipends/calculate.ts`:

```ts
import { Rounding, StatusWeights, weightFor } from './policy';

export interface AttendanceMark {
  eventId: string;
  status: string;
}

export interface StipendInput {
  baseAmount: number;
  requiredServices: number;
  marks: AttendanceMark[];
  weights: StatusWeights;
  rounding?: Rounding;
}

export interface StipendStanding {
  baseAmount: number;
  requiredServices: number;
  perServiceValue: number;
  creditedServices: number;
  absences: number;
  unmappedCount: number;
  earned: number;
  forfeited: number;
}

function roundMoney(value: number, rounding: Rounding): number {
  if (rounding === 'dollar') return Math.round(value);
  return Math.round(value * 100) / 100;
}

/**
 * Pro-rata stipend math. One service is worth `baseAmount / requiredServices`;
 * a student earns the share of the stipend matching their credited services,
 * clamped to [0, baseAmount].
 *
 * `requiredServices` is the number an admin agreed with the student, not a
 * count of calendar events, so it is never derived here.
 */
export function calculateStanding(input: StipendInput): StipendStanding {
  const { baseAmount, requiredServices, marks, weights } = input;
  const rounding = input.rounding ?? 'cent';

  let creditedServices = 0;
  let absences = 0;
  let unmappedCount = 0;

  for (const mark of marks) {
    const weight = weightFor(mark.status, weights);
    if (weight === null) {
      unmappedCount += 1;
      continue;
    }
    creditedServices += weight;
    if (weight === 0) absences += 1;
  }

  // Guard the misconfiguration rather than dividing by zero. The table also
  // carries CHECK (required_services > 0), so this should be unreachable.
  if (!(requiredServices > 0) || !(baseAmount >= 0)) {
    return {
      baseAmount,
      requiredServices,
      perServiceValue: 0,
      creditedServices,
      absences,
      unmappedCount,
      earned: 0,
      forfeited: 0,
    };
  }

  const perServiceValue = roundMoney(baseAmount / requiredServices, rounding);
  const raw = (baseAmount * creditedServices) / requiredServices;
  const earned = roundMoney(Math.min(Math.max(raw, 0), baseAmount), rounding);

  return {
    baseAmount,
    requiredServices,
    perServiceValue,
    creditedServices,
    absences,
    unmappedCount,
    earned,
    forfeited: roundMoney(baseAmount - earned, rounding),
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/features/stipends`
Expected: PASS, 11 tests.

- [ ] **Step 5: Commit**

```bash
git add src/features/stipends
git commit -m "feat(stipends): pro-rata calculation core with configurable status weights"
```

---

### Task 2: Schema

**Files:**
- Create: `supabase/migrations/20260806160000_attendance_linked_stipends.sql`
- Test: `supabase/migrations/tests/attendance_linked_stipends_test.sql`

**Interfaces:**
- Consumes: `public.current_tenant_id()`, `public.set_tenant_id_default()`, `public.update_updated_at_column()`, `public.is_current_user_admin_or_super_admin()`.
- Produces: tables `gw_stipend_policies`, `gw_stipend_periods`, `gw_stipend_awards`.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260806160000_attendance_linked_stipends.sql`:

```sql
-- Attendance-linked stipends: policy, period, and per-student award.
-- Earned amounts are NOT stored here; they are derived by v_stipend_standing
-- until a period closes, at which point final_amount is snapshotted.

CREATE TABLE IF NOT EXISTS public.gw_stipend_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT public.current_tenant_id(),
  name TEXT NOT NULL DEFAULT 'Default',
  -- status -> credit weight. Statuses absent from this map earn no credit
  -- and are reported separately as unmapped.
  weights JSONB NOT NULL DEFAULT
    '{"present":1,"late":0.5,"tardy":0.5,"excused":1,"absent":0}'::jsonb,
  rounding TEXT NOT NULL DEFAULT 'cent' CHECK (rounding IN ('cent','dollar')),
  version INT NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

CREATE TABLE IF NOT EXISTS public.gw_stipend_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT public.current_tenant_id(),
  name TEXT NOT NULL,
  starts_on DATE NOT NULL,
  ends_on DATE NOT NULL,
  default_amount NUMERIC(10,2) NOT NULL CHECK (default_amount >= 0),
  -- The agreed denominator, typed by an admin. Never derived from the calendar.
  required_services INT NOT NULL CHECK (required_services > 0),
  -- {"event_types":["rehearsal","service"]}; empty or absent means all
  -- attendance-required events in range.
  event_filter JSONB NOT NULL DEFAULT '{}'::jsonb,
  policy_id UUID REFERENCES public.gw_stipend_policies(id),
  -- Weights pinned at close so a closed period reproduces its own numbers
  -- even after the tenant edits the live policy.
  policy_weights JSONB,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','active','closed','paid')),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  CONSTRAINT stipend_period_dates CHECK (ends_on >= starts_on)
);

CREATE TABLE IF NOT EXISTS public.gw_stipend_awards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT public.current_tenant_id(),
  period_id UUID NOT NULL
    REFERENCES public.gw_stipend_periods(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  base_amount NUMERIC(10,2) NOT NULL CHECK (base_amount >= 0),
  -- Mid-period joiners are measured against fewer services.
  required_services_override INT CHECK (required_services_override > 0),
  enrolled_on DATE,
  final_amount NUMERIC(10,2),
  override_amount NUMERIC(10,2) CHECK (override_amount >= 0),
  override_reason TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','closed','paid')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  CONSTRAINT stipend_award_unique_per_period UNIQUE (period_id, user_id),
  -- An override moves money by hand; it must leave a reason on the record.
  CONSTRAINT stipend_override_needs_reason CHECK (
    override_amount IS NULL
    OR (override_reason IS NOT NULL AND length(btrim(override_reason)) > 0)
  )
);

CREATE INDEX IF NOT EXISTS gw_stipend_policies_tenant_idx
  ON public.gw_stipend_policies (tenant_id, is_active);
CREATE INDEX IF NOT EXISTS gw_stipend_periods_tenant_idx
  ON public.gw_stipend_periods (tenant_id, status, starts_on DESC);
CREATE INDEX IF NOT EXISTS gw_stipend_awards_period_idx
  ON public.gw_stipend_awards (tenant_id, period_id);
CREATE INDEX IF NOT EXISTS gw_stipend_awards_user_idx
  ON public.gw_stipend_awards (tenant_id, user_id);

-- Tenant defaulting + updated_at
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['gw_stipend_policies','gw_stipend_periods','gw_stipend_awards']
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS set_tenant_id_default ON public.%I', t);
    EXECUTE format(
      'CREATE TRIGGER set_tenant_id_default BEFORE INSERT ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_default()', t);
    EXECUTE format(
      'DROP TRIGGER IF EXISTS update_%s_updated_at ON public.%I', t, t);
    EXECUTE format(
      'CREATE TRIGGER update_%s_updated_at BEFORE UPDATE ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', t, t);
  END LOOP;
END $$;

ALTER TABLE public.gw_stipend_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_stipend_periods  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_stipend_awards   ENABLE ROW LEVEL SECURITY;

-- RESTRICTIVE tenant isolation: applies on top of every permissive policy.
DROP POLICY IF EXISTS tenant_isolation_restrict ON public.gw_stipend_policies;
CREATE POLICY tenant_isolation_restrict ON public.gw_stipend_policies AS RESTRICTIVE
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_restrict ON public.gw_stipend_periods;
CREATE POLICY tenant_isolation_restrict ON public.gw_stipend_periods AS RESTRICTIVE
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_restrict ON public.gw_stipend_awards;
CREATE POLICY tenant_isolation_restrict ON public.gw_stipend_awards AS RESTRICTIVE
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

-- Admins manage everything.
DROP POLICY IF EXISTS stipend_policies_admin ON public.gw_stipend_policies;
CREATE POLICY stipend_policies_admin ON public.gw_stipend_policies FOR ALL
  USING (public.is_current_user_admin_or_super_admin())
  WITH CHECK (public.is_current_user_admin_or_super_admin());

DROP POLICY IF EXISTS stipend_periods_admin ON public.gw_stipend_periods;
CREATE POLICY stipend_periods_admin ON public.gw_stipend_periods FOR ALL
  USING (public.is_current_user_admin_or_super_admin())
  WITH CHECK (public.is_current_user_admin_or_super_admin());

DROP POLICY IF EXISTS stipend_awards_admin ON public.gw_stipend_awards;
CREATE POLICY stipend_awards_admin ON public.gw_stipend_awards FOR ALL
  USING (public.is_current_user_admin_or_super_admin())
  WITH CHECK (public.is_current_user_admin_or_super_admin());

-- Students read their own award, and the period it belongs to.
DROP POLICY IF EXISTS stipend_awards_own_read ON public.gw_stipend_awards;
CREATE POLICY stipend_awards_own_read ON public.gw_stipend_awards FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS stipend_periods_own_read ON public.gw_stipend_periods;
CREATE POLICY stipend_periods_own_read ON public.gw_stipend_periods FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.gw_stipend_awards a
    WHERE a.period_id = gw_stipend_periods.id AND a.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS stipend_policies_read ON public.gw_stipend_policies;
CREATE POLICY stipend_policies_read ON public.gw_stipend_policies FOR SELECT
  USING (true);
```

- [ ] **Step 2: Write the schema assertion test**

Create `supabase/migrations/tests/attendance_linked_stipends_test.sql`:

```sql
-- Asserts the tenant-isolation boilerplate is actually wired on all three
-- stipend tables. Run inside a transaction and roll back.
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['gw_stipend_policies','gw_stipend_periods','gw_stipend_awards']
  LOOP
    ASSERT (SELECT column_default LIKE '%current_tenant_id%'
            FROM information_schema.columns
            WHERE table_name = t AND column_name = 'tenant_id'),
      format('%s.tenant_id default is not current_tenant_id()', t);

    ASSERT EXISTS (SELECT 1 FROM information_schema.triggers
                   WHERE event_object_table = t
                     AND action_statement ILIKE '%set_tenant_id_default%'
                     AND event_manipulation = 'INSERT'),
      format('%s missing set_tenant_id_default INSERT trigger', t);

    ASSERT (SELECT relrowsecurity FROM pg_class
            WHERE oid = format('public.%I', t)::regclass),
      format('%s does not have RLS enabled', t);

    ASSERT EXISTS (SELECT 1 FROM pg_policies
                   WHERE tablename = t
                     AND policyname = 'tenant_isolation_restrict'
                     AND permissive = 'RESTRICTIVE'),
      format('%s missing RESTRICTIVE tenant_isolation_restrict policy', t);
  END LOOP;

  ASSERT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conname = 'stipend_override_needs_reason'),
    'override without a reason is not blocked';

  ASSERT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conname = 'stipend_award_unique_per_period'),
    'a student can be awarded twice in one period';

  RAISE NOTICE 'attendance_linked_stipends schema assertions passed';
END $$;
```

- [ ] **Step 3: Verify the migration parses**

Run: `npx sql-formatter --version >/dev/null 2>&1; grep -c "CREATE TABLE" supabase/migrations/20260806160000_attendance_linked_stipends.sql`
Expected: `3`.

Do **not** apply to production. Kevin applies DDL on the self-hosted droplet as `-U supabase_admin`; that happens at review time, not during implementation.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations
git commit -m "feat(stipends): period, policy, and award tables with tenant isolation"
```

---

### Task 3: The standing view

**Files:**
- Create: `supabase/migrations/20260806160100_stipend_standing_view.sql`

**Interfaces:**
- Consumes: tables from Task 2, `public.gw_events`, `public.gw_event_attendance`.
- Produces: view `public.v_stipend_standing` with columns `award_id, period_id, tenant_id, user_id, base_amount, required_services, per_service_value, credited_services, absences, unmarked_count, unmapped_count, earned, forfeited, countable_events`.

- [ ] **Step 1: Write the view**

Create `supabase/migrations/20260806160100_stipend_standing_view.sql`:

```sql
-- Live stipend standing. Derived on read so it can never drift out of sync
-- with attendance. Mirrors src/features/stipends/calculate.ts exactly.

CREATE OR REPLACE VIEW public.v_stipend_countable_events AS
SELECT
  per.id         AS period_id,
  per.tenant_id  AS tenant_id,
  e.id           AS event_id,
  e.start_date::date AS event_date
FROM public.gw_stipend_periods per
JOIN public.gw_events e
  ON e.tenant_id = per.tenant_id
 AND e.start_date::date BETWEEN per.starts_on AND per.ends_on
 -- Only events the tenant actually takes attendance for.
 AND COALESCE(e.attendance_required, false) = true
 -- A cancelled service is nobody's absence.
 AND COALESCE(e.status, 'scheduled') <> 'cancelled'
 AND (
   NOT (per.event_filter ? 'event_types')
   OR jsonb_array_length(per.event_filter -> 'event_types') = 0
   OR e.event_type IN (
        SELECT jsonb_array_elements_text(per.event_filter -> 'event_types'))
 )
-- The rule that matters most: if roll was never taken, the event does not
-- count at all. Nobody is marked absent for a service the tenant forgot to
-- record.
WHERE EXISTS (
  SELECT 1 FROM public.gw_event_attendance a WHERE a.event_id = e.id
);

CREATE OR REPLACE VIEW public.v_stipend_standing AS
WITH award_events AS (
  SELECT
    aw.id AS award_id,
    aw.tenant_id,
    aw.period_id,
    aw.user_id,
    aw.base_amount,
    COALESCE(aw.required_services_override, per.required_services)
      AS required_services,
    COALESCE(per.policy_weights, pol.weights,
             '{"present":1,"late":0.5,"tardy":0.5,"excused":1,"absent":0}'::jsonb)
      AS weights,
    COALESCE(pol.rounding, 'cent') AS rounding,
    ce.event_id,
    att.attendance_status
  FROM public.gw_stipend_awards aw
  JOIN public.gw_stipend_periods per ON per.id = aw.period_id
  LEFT JOIN public.gw_stipend_policies pol ON pol.id = per.policy_id
  LEFT JOIN public.v_stipend_countable_events ce
    ON ce.period_id = per.id
   -- Mid-period joiners are only measured from their enrollment date.
   AND (aw.enrolled_on IS NULL OR ce.event_date >= aw.enrolled_on)
  LEFT JOIN public.gw_event_attendance att
    ON att.event_id = ce.event_id AND att.user_id = aw.user_id
),
scored AS (
  SELECT
    ae.*,
    CASE
      WHEN ae.event_id IS NULL THEN NULL
      -- Roll was taken but this student has no row: treated as an absence,
      -- and surfaced separately as unmarked so an admin can audit it.
      WHEN ae.attendance_status IS NULL THEN 0::numeric
      ELSE (ae.weights ->> ae.attendance_status)::numeric
    END AS weight
  FROM award_events ae
)
SELECT
  s.award_id,
  s.period_id,
  s.tenant_id,
  s.user_id,
  s.base_amount,
  s.required_services,
  ROUND(s.base_amount / NULLIF(s.required_services, 0), 2) AS per_service_value,
  COALESCE(SUM(s.weight), 0) AS credited_services,
  COUNT(*) FILTER (
    WHERE s.attendance_status IS NOT NULL AND s.weight = 0) AS absences,
  COUNT(*) FILTER (
    WHERE s.event_id IS NOT NULL AND s.attendance_status IS NULL) AS unmarked_count,
  COUNT(*) FILTER (
    WHERE s.attendance_status IS NOT NULL AND s.weight IS NULL) AS unmapped_count,
  COUNT(s.event_id) AS countable_events,
  ROUND(
    LEAST(
      GREATEST(
        s.base_amount * COALESCE(SUM(s.weight), 0)
          / NULLIF(s.required_services, 0), 0),
      s.base_amount), 2) AS earned,
  s.base_amount - ROUND(
    LEAST(
      GREATEST(
        s.base_amount * COALESCE(SUM(s.weight), 0)
          / NULLIF(s.required_services, 0), 0),
      s.base_amount), 2) AS forfeited
FROM scored s
GROUP BY s.award_id, s.period_id, s.tenant_id, s.user_id,
         s.base_amount, s.required_services;

-- Views run with the definer's rights by default; force them to respect the
-- querying user's RLS on the underlying tables.
ALTER VIEW public.v_stipend_countable_events SET (security_invoker = true);
ALTER VIEW public.v_stipend_standing SET (security_invoker = true);
```

- [ ] **Step 2: Sanity-check the SQL shape**

Run: `grep -c "security_invoker" supabase/migrations/20260806160100_stipend_standing_view.sql`
Expected: `2` — both views must be security_invoker, or a student could read another tenant's rows.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260806160100_stipend_standing_view.sql
git commit -m "feat(stipends): derived standing view with roll-not-taken exclusion"
```

---

### Task 4: Data hooks

**Files:**
- Create: `src/features/stipends/useStipendPeriods.ts`
- Create: `src/features/stipends/useStipendStanding.ts`

**Interfaces:**
- Consumes: `supabase` from `@/integrations/supabase/client`; tables and views from Tasks 2–3.
- Produces:
  - `useStipendPeriods(): { periods: StipendPeriod[]; loading: boolean; error: string | null; createPeriod(input: NewPeriod): Promise<StipendPeriod>; updatePeriod(id: string, patch: Partial<NewPeriod>): Promise<void>; closePeriod(id: string): Promise<void>; refetch(): void }`
  - `useStipendStanding(periodId: string | null): { rows: StandingRow[]; loading: boolean; error: string | null; refetch(): void }`
  - `useMyStipend(): { standing: StandingRow | null; period: StipendPeriod | null; loading: boolean }`
  - Types `StipendPeriod`, `NewPeriod`, `StandingRow` exported from `useStipendPeriods.ts` / `useStipendStanding.ts`.

- [ ] **Step 1: Write the period hook**

Create `src/features/stipends/useStipendPeriods.ts`:

```ts
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface StipendPeriod {
  id: string;
  name: string;
  starts_on: string;
  ends_on: string;
  default_amount: number;
  required_services: number;
  event_filter: { event_types?: string[] };
  policy_id: string | null;
  status: 'draft' | 'active' | 'closed' | 'paid';
  closed_at: string | null;
}

export interface NewPeriod {
  name: string;
  starts_on: string;
  ends_on: string;
  default_amount: number;
  required_services: number;
  event_filter?: { event_types?: string[] };
}

// types.ts predates these tables; cast at the client boundary only.
const db = supabase as any;

export function useStipendPeriods() {
  const [periods, setPeriods] = useState<StipendPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await db
      .from('gw_stipend_periods')
      .select('*')
      .order('starts_on', { ascending: false });
    if (err) setError(err.message);
    setPeriods((data ?? []) as StipendPeriod[]);
    setLoading(false);
  }, []);

  useEffect(() => { void refetch(); }, [refetch]);

  const createPeriod = useCallback(async (input: NewPeriod) => {
    // Always .select() back — a silent RLS rejection returns no error.
    const { data, error: err } = await db
      .from('gw_stipend_periods')
      .insert({ ...input, event_filter: input.event_filter ?? {} })
      .select()
      .single();
    if (err) throw new Error(err.message);
    if (!data) throw new Error('Period was not created — check your permissions.');
    await refetch();
    return data as StipendPeriod;
  }, [refetch]);

  const updatePeriod = useCallback(async (
    id: string,
    patch: Partial<NewPeriod> & { status?: StipendPeriod['status'] },
  ) => {
    const { data, error: err } = await db
      .from('gw_stipend_periods').update(patch).eq('id', id).select();
    if (err) throw new Error(err.message);
    if (!data?.length) throw new Error('Nothing was updated — check your permissions.');
    await refetch();
  }, [refetch]);

  const closePeriod = useCallback(async (id: string) => {
    // Snapshot the derived amounts, then freeze the period.
    const { data: standing, error: sErr } = await db
      .from('v_stipend_standing').select('award_id, earned').eq('period_id', id);
    if (sErr) throw new Error(sErr.message);

    for (const row of standing ?? []) {
      const { error: uErr } = await db
        .from('gw_stipend_awards')
        .update({ final_amount: row.earned, status: 'closed' })
        .eq('id', row.award_id);
      if (uErr) throw new Error(uErr.message);
    }

    const { data: pol } = await db
      .from('gw_stipend_periods')
      .select('policy_id, gw_stipend_policies(weights)')
      .eq('id', id).maybeSingle();

    const { error: pErr } = await db
      .from('gw_stipend_periods')
      .update({
        status: 'closed',
        closed_at: new Date().toISOString(),
        policy_weights: pol?.gw_stipend_policies?.weights ?? null,
      })
      .eq('id', id);
    if (pErr) throw new Error(pErr.message);
    await refetch();
  }, [refetch]);

  return { periods, loading, error, createPeriod, updatePeriod, closePeriod, refetch };
}
```

- [ ] **Step 2: Write the standing hook**

Create `src/features/stipends/useStipendStanding.ts`:

```ts
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { StipendPeriod } from './useStipendPeriods';

export interface StandingRow {
  award_id: string;
  period_id: string;
  user_id: string;
  base_amount: number;
  required_services: number;
  per_service_value: number;
  credited_services: number;
  absences: number;
  unmarked_count: number;
  unmapped_count: number;
  countable_events: number;
  earned: number;
  forfeited: number;
  full_name?: string | null;
  email?: string | null;
}

const db = supabase as any;

export function useStipendStanding(periodId: string | null) {
  const [rows, setRows] = useState<StandingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!periodId) { setRows([]); return; }
    setLoading(true);
    setError(null);

    const { data, error: err } = await db
      .from('v_stipend_standing').select('*').eq('period_id', periodId);
    if (err) { setError(err.message); setLoading(false); return; }

    const standing = (data ?? []) as StandingRow[];
    const ids = standing.map((r) => r.user_id);

    // Names live in the directory view, not on the standing view.
    const { data: people } = ids.length
      ? await db.from('gw_profiles_directory')
          .select('user_id, full_name, email').in('user_id', ids)
      : { data: [] };

    const byId = new Map((people ?? []).map((p: any) => [p.user_id, p]));
    setRows(standing.map((r) => ({
      ...r,
      full_name: byId.get(r.user_id)?.full_name ?? null,
      email: byId.get(r.user_id)?.email ?? null,
    })));
    setLoading(false);
  }, [periodId]);

  useEffect(() => { void refetch(); }, [refetch]);

  return { rows, loading, error, refetch };
}

export function useMyStipend() {
  const [standing, setStanding] = useState<StandingRow | null>(null);
  const [period, setPeriod] = useState<StipendPeriod | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      if (!uid) { if (!cancelled) setLoading(false); return; }

      const { data: periods } = await db
        .from('gw_stipend_periods')
        .select('*')
        .in('status', ['active', 'closed'])
        .order('starts_on', { ascending: false })
        .limit(1);
      const p = (periods ?? [])[0] as StipendPeriod | undefined;

      if (p) {
        const { data } = await db.from('v_stipend_standing')
          .select('*').eq('period_id', p.id).eq('user_id', uid).maybeSingle();
        if (!cancelled) setStanding((data ?? null) as StandingRow | null);
      }
      if (!cancelled) { setPeriod(p ?? null); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  return { standing, period, loading };
}
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "features/stipends" || echo "clean"`
Expected: `clean`. The project has pre-existing type errors elsewhere; only stipend files must be clean.

- [ ] **Step 4: Commit**

```bash
git add src/features/stipends
git commit -m "feat(stipends): period, standing, and my-stipend data hooks"
```

---

### Task 5: Period configuration UI

**Files:**
- Create: `src/features/stipends/components/StipendPeriodForm.tsx`
- Create: `src/features/stipends/components/StipendPeriodsPanel.tsx`

**Interfaces:**
- Consumes: `useStipendPeriods`, `StipendPeriod`, `NewPeriod` from Task 4.
- Produces: `<StipendPeriodsPanel />` (default admin entry point), `<StipendPeriodForm open onOpenChange onSubmit initial? />`.

- [ ] **Step 1: Write the form**

Create `src/features/stipends/components/StipendPeriodForm.tsx`:

```tsx
import { useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { NewPeriod } from '../useStipendPeriods';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: NewPeriod) => Promise<void>;
}

export function StipendPeriodForm({ open, onOpenChange, onSubmit }: Props) {
  const [form, setForm] = useState<NewPeriod>({
    name: '', starts_on: '', ends_on: '',
    default_amount: 0, required_services: 1,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const perService = form.required_services > 0
    ? form.default_amount / form.required_services : 0;

  const submit = async () => {
    setSaving(true); setError(null);
    try {
      await onSubmit(form);
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the period.');
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>New stipend period</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="sp-name" className="text-xs">Name</Label>
            <Input id="sp-name" placeholder="Fall 2026" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="sp-start" className="text-xs">Starts</Label>
              <Input id="sp-start" type="date" value={form.starts_on}
                onChange={(e) => setForm({ ...form, starts_on: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="sp-end" className="text-xs">Ends</Label>
              <Input id="sp-end" type="date" value={form.ends_on}
                onChange={(e) => setForm({ ...form, ends_on: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="sp-amount" className="text-xs">Stipend per student</Label>
              <Input id="sp-amount" type="number" min={0} step="0.01"
                value={form.default_amount}
                onChange={(e) => setForm({ ...form, default_amount: Number(e.target.value) })} />
            </div>
            <div>
              <Label htmlFor="sp-services" className="text-xs">Required services</Label>
              <Input id="sp-services" type="number" min={1}
                value={form.required_services}
                onChange={(e) => setForm({ ...form, required_services: Number(e.target.value) })} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Each service is worth{' '}
            <span className="font-medium text-foreground">
              ${perService.toFixed(2)}
            </span>. Missing one reduces the stipend by that amount.
          </p>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={submit}
            disabled={saving || !form.name || !form.starts_on || !form.ends_on
                      || form.required_services < 1}>
            {saving ? 'Saving…' : 'Create period'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Write the panel**

Create `src/features/stipends/components/StipendPeriodsPanel.tsx`:

```tsx
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, ChevronLeft } from 'lucide-react';
import { useStipendPeriods } from '../useStipendPeriods';
import { StipendPeriodForm } from './StipendPeriodForm';
import { StipendRoster } from './StipendRoster';

const money = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

export function StipendPeriodsPanel() {
  const { periods, loading, error, createPeriod, updatePeriod, closePeriod } = useStipendPeriods();
  const [formOpen, setFormOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const current = periods.find((p) => p.id === selected) ?? null;

  if (current) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
          <ChevronLeft className="h-4 w-4 mr-1" /> All periods
        </Button>
        <StipendRoster
          period={current}
          onClose={() => closePeriod(current.id)}
          onActivate={() => updatePeriod(current.id, { status: 'active' })}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Stipend periods</h3>
          <p className="text-sm text-muted-foreground">
            Set the stipend and how many services earn it. Attendance does the rest.
          </p>
        </div>
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> New period
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

      {!loading && periods.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-sm text-muted-foreground">
              No stipend periods yet. Create one to link attendance to stipends.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 auto-rows-max">
        {periods.map((p) => (
          <Card key={p.id} className="cursor-pointer hover:border-primary/40"
            onClick={() => setSelected(p.id)}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="!text-sm">{p.name}</CardTitle>
                <Badge variant={p.status === 'active' ? 'default' : 'secondary'}>
                  {p.status}
                </Badge>
              </div>
              <CardDescription className="text-xs">
                {p.starts_on} – {p.ends_on}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              {money(p.default_amount)} over {p.required_services} services ·{' '}
              {money(p.default_amount / Math.max(p.required_services, 1))} each
            </CardContent>
          </Card>
        ))}
      </div>

      <StipendPeriodForm open={formOpen} onOpenChange={setFormOpen}
        onSubmit={async (input) => { await createPeriod(input); }} />
    </div>
  );
}
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "features/stipends" || echo "clean"`
Expected: `clean` once Task 6 supplies `StipendRoster`. If run before Task 6, expect exactly one unresolved-import error for `./StipendRoster`.

- [ ] **Step 4: Commit**

```bash
git add src/features/stipends/components
git commit -m "feat(stipends): period configuration UI"
```

---

### Task 6: Roster with live standing and overrides

**Files:**
- Create: `src/features/stipends/components/StipendRoster.tsx`

**Interfaces:**
- Consumes: `useStipendStanding`, `StandingRow` (Task 4), `StipendPeriod` (Task 4).
- Produces: `<StipendRoster period={StipendPeriod} onClose={() => Promise<void>} />`.

- [ ] **Step 1: Write the roster**

Create `src/features/stipends/components/StipendRoster.tsx`:

```tsx
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useStipendStanding } from '../useStipendStanding';
import type { StipendPeriod } from '../useStipendPeriods';

const money = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n ?? 0);

const db = supabase as any;

interface Props {
  period: StipendPeriod;
  onClose: () => Promise<void>;
  onActivate: () => Promise<void>;
}

export function StipendRoster({ period, onClose, onActivate }: Props) {
  const { rows, loading, error, refetch } = useStipendStanding(period.id);
  const [closing, setClosing] = useState(false);

  const totalEarned = rows.reduce((s, r) => s + Number(r.earned ?? 0), 0);
  const totalForfeited = rows.reduce((s, r) => s + Number(r.forfeited ?? 0), 0);
  const anyUnmarked = rows.some((r) => Number(r.unmarked_count) > 0);
  const anyUnmapped = rows.some((r) => Number(r.unmapped_count) > 0);

  const applyOverride = async (awardId: string) => {
    const raw = window.prompt('Override amount (dollars):');
    if (raw === null) return;
    const amount = Number(raw);
    if (!Number.isFinite(amount) || amount < 0) return;
    const reason = window.prompt('Reason for the override (required):');
    if (!reason || !reason.trim()) return;

    const { data, error: err } = await db
      .from('gw_stipend_awards')
      .update({ override_amount: amount, override_reason: reason.trim() })
      .eq('id', awardId).select();
    if (err || !data?.length) {
      window.alert(err?.message ?? 'Override was not saved — check your permissions.');
      return;
    }
    refetch();
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3 auto-rows-max">
        <Card>
          <CardHeader className="pb-1"><CardTitle className="!text-xs text-muted-foreground">Earned to date</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{money(totalEarned)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1"><CardTitle className="!text-xs text-muted-foreground">Forfeited</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{money(totalForfeited)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1"><CardTitle className="!text-xs text-muted-foreground">Students</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{rows.length}</CardContent>
        </Card>
      </div>

      {(anyUnmarked || anyUnmapped) && (
        <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
          <div>
            {anyUnmarked && (
              <p>Some students have no attendance row for services where roll was taken. Those count as absences — check the roster before closing.</p>
            )}
            {anyUnmapped && (
              <p>Some attendance statuses are missing from the stipend policy and earn no credit. Add them to the policy weights.</p>
            )}
          </div>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
      {loading && <p className="text-sm text-muted-foreground">Loading standing…</p>}

      {!loading && rows.length === 0 && (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
          No students are enrolled in this period yet.
        </CardContent></Card>
      )}

      {rows.length > 0 && (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Student</TableHead>
                  <TableHead className="text-xs text-right">Credited</TableHead>
                  <TableHead className="text-xs text-right">Absences</TableHead>
                  <TableHead className="text-xs text-right">Earned</TableHead>
                  <TableHead className="text-xs text-right">Forfeited</TableHead>
                  <TableHead className="text-xs" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.award_id}>
                    <TableCell className="text-sm">
                      {r.full_name ?? r.email ?? 'Unknown student'}
                      {Number(r.unmarked_count) > 0 && (
                        <Badge variant="outline" className="ml-2 text-[10px]">
                          {r.unmarked_count} unmarked
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-right">
                      {Number(r.credited_services)} / {r.required_services}
                    </TableCell>
                    <TableCell className="text-sm text-right">{r.absences}</TableCell>
                    <TableCell className="text-sm text-right font-medium">{money(Number(r.earned))}</TableCell>
                    <TableCell className="text-sm text-right text-muted-foreground">{money(Number(r.forfeited))}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="text-xs"
                        onClick={() => applyOverride(r.award_id)}>
                        Override
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {period.status === 'draft' && rows.length > 0 && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => onActivate()}>
            Activate period
          </Button>
        </div>
      )}

      {period.status === 'active' && rows.length > 0 && (
        <div className="flex justify-end">
          <Button size="sm" disabled={closing}
            onClick={async () => {
              if (!window.confirm(
                'Close this period? Earned amounts are frozen and later attendance edits will no longer change them.')) return;
              setClosing(true);
              try { await onClose(); } finally { setClosing(false); }
            }}>
            {closing ? 'Closing…' : 'Close period'}
          </Button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "features/stipends" || echo "clean"`
Expected: `clean`.

- [ ] **Step 3: Commit**

```bash
git add src/features/stipends/components/StipendRoster.tsx
git commit -m "feat(stipends): roster with live standing, warnings, and overrides"
```

---

### Task 7: Enroll students into a period

Without this, `gw_stipend_awards` is never populated and the roster is always
empty. Enrollment is what turns a period into a set of individual agreements.

**Files:**
- Create: `src/features/stipends/components/EnrollStudentsDialog.tsx`
- Modify: `src/features/stipends/useStipendPeriods.ts` (append the awards hook)
- Modify: `src/features/stipends/components/StipendRoster.tsx` (add the button)

**Interfaces:**
- Consumes: `StipendPeriod` (Task 4), `useStipendStanding` (Task 4).
- Produces: `useStipendAwards(periodId): { enroll(userIds: string[], baseAmount: number, enrolledOn?: string): Promise<number>; remove(awardId: string): Promise<void> }`, `<EnrollStudentsDialog period open onOpenChange onEnrolled />`.

- [ ] **Step 1: Add the awards hook**

Append to `src/features/stipends/useStipendPeriods.ts`:

```ts
export function useStipendAwards(periodId: string | null) {
  const enroll = useCallback(async (
    userIds: string[], baseAmount: number, enrolledOn?: string,
  ) => {
    if (!periodId || userIds.length === 0) return 0;
    const rows = userIds.map((user_id) => ({
      period_id: periodId,
      user_id,
      base_amount: baseAmount,
      enrolled_on: enrolledOn ?? null,
    }));
    // Re-enrolling an existing student is a no-op, not an error.
    const { data, error: err } = await db
      .from('gw_stipend_awards')
      .upsert(rows, { onConflict: 'period_id,user_id', ignoreDuplicates: true })
      .select();
    if (err) throw new Error(err.message);
    return (data ?? []).length;
  }, [periodId]);

  const remove = useCallback(async (awardId: string) => {
    const { error: err } = await db
      .from('gw_stipend_awards').delete().eq('id', awardId);
    if (err) throw new Error(err.message);
  }, []);

  return { enroll, remove };
}
```

- [ ] **Step 2: Write the enrollment dialog**

Create `src/features/stipends/components/EnrollStudentsDialog.tsx`:

```tsx
import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useStipendAwards, type StipendPeriod } from '../useStipendPeriods';

const db = supabase as any;

interface Person { user_id: string; full_name: string | null; email: string | null }

interface Props {
  period: StipendPeriod;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEnrolled: () => void;
}

export function EnrollStudentsDialog({ period, open, onOpenChange, onEnrolled }: Props) {
  const { enroll } = useStipendAwards(period.id);
  const [people, setPeople] = useState<Person[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await db
        .from('gw_profiles_directory')
        .select('user_id, full_name, email')
        .eq('disabled', false)
        .order('full_name');
      setPeople((data ?? []).filter((p: Person) => p.user_id) as Person[]);
    })();
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return people;
    return people.filter((p) =>
      (p.full_name ?? '').toLowerCase().includes(q) ||
      (p.email ?? '').toLowerCase().includes(q));
  }, [people, query]);

  const toggle = (id: string) => {
    const next = new Set(picked);
    if (next.has(id)) next.delete(id); else next.add(id);
    setPicked(next);
  };

  const submit = async () => {
    setSaving(true); setError(null);
    try {
      await enroll([...picked], period.default_amount);
      setPicked(new Set());
      onEnrolled();
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not enroll students.');
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Add students to {period.name}</DialogTitle></DialogHeader>
        <Input placeholder="Search students…" value={query}
          onChange={(e) => setQuery(e.target.value)} className="text-sm" />
        <ScrollArea className="h-64 rounded-md border">
          <div className="p-2 space-y-1">
            {filtered.map((p) => (
              <label key={p.user_id}
                className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-muted cursor-pointer">
                <Checkbox checked={picked.has(p.user_id)}
                  onCheckedChange={() => toggle(p.user_id)} />
                <span className="text-sm">{p.full_name ?? p.email ?? 'Unknown'}</span>
              </label>
            ))}
            {filtered.length === 0 && (
              <p className="p-3 text-xs text-muted-foreground">No students match.</p>
            )}
          </div>
        </ScrollArea>
        <p className="text-xs text-muted-foreground">
          Each student starts at the period amount and can be adjusted individually.
        </p>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={submit} disabled={saving || picked.size === 0}>
            {saving ? 'Adding…' : `Add ${picked.size} student${picked.size === 1 ? '' : 's'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Wire the button into the roster**

In `src/features/stipends/components/StipendRoster.tsx`, add these imports:

```tsx
import { EnrollStudentsDialog } from './EnrollStudentsDialog';
import { UserPlus } from 'lucide-react';
```

Add state beside the existing `closing` state:

```tsx
const [enrollOpen, setEnrollOpen] = useState(false);
```

Insert an "Add students" button above the summary cards, and render the dialog
at the end of the returned fragment:

```tsx
<div className="flex justify-end">
  <Button variant="outline" size="sm" onClick={() => setEnrollOpen(true)}>
    <UserPlus className="h-4 w-4 mr-1" /> Add students
  </Button>
</div>
```

```tsx
<EnrollStudentsDialog period={period} open={enrollOpen}
  onOpenChange={setEnrollOpen} onEnrolled={refetch} />
```

Also replace the empty-roster copy so it points at the new action:

```tsx
No students in this period yet. Use "Add students" to enroll them.
```

- [ ] **Step 4: Verify it compiles**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "features/stipends" || echo "clean"`
Expected: `clean`.

- [ ] **Step 5: Commit**

```bash
git add src/features/stipends
git commit -m "feat(stipends): enroll students into a stipend period"
```

---

### Task 8: Policy weights editor

The weights are the tenant's attendance rules. They are configurable in the
schema, so they need a place to be configured.

**Files:**
- Create: `src/features/stipends/components/StipendPolicyEditor.tsx`
- Modify: `src/features/stipends/components/StipendPeriodsPanel.tsx`

**Interfaces:**
- Consumes: `DEFAULT_STATUS_WEIGHTS`, `StatusWeights` (Task 1).
- Produces: `<StipendPolicyEditor />`.

- [ ] **Step 1: Write the editor**

Create `src/features/stipends/components/StipendPolicyEditor.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { DEFAULT_STATUS_WEIGHTS, type StatusWeights } from '../policy';

const db = supabase as any;

const LABELS: Record<string, string> = {
  present: 'Present', late: 'Late', tardy: 'Tardy',
  excused: 'Excused absence', absent: 'Absent',
};

export function StipendPolicyEditor() {
  const [policyId, setPolicyId] = useState<string | null>(null);
  const [weights, setWeights] = useState<StatusWeights>(DEFAULT_STATUS_WEIGHTS);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await db.from('gw_stipend_policies')
        .select('id, weights').eq('is_active', true).limit(1);
      const row = (data ?? [])[0];
      if (row) { setPolicyId(row.id); setWeights(row.weights as StatusWeights); }
    })();
  }, []);

  const save = async () => {
    setSaving(true); setMessage(null);
    try {
      if (policyId) {
        const { data, error } = await db.from('gw_stipend_policies')
          .update({ weights }).eq('id', policyId).select();
        if (error) throw new Error(error.message);
        if (!data?.length) throw new Error('Nothing saved — check your permissions.');
      } else {
        const { data, error } = await db.from('gw_stipend_policies')
          .insert({ weights }).select().single();
        if (error) throw new Error(error.message);
        if (!data) throw new Error('Nothing saved — check your permissions.');
        setPolicyId(data.id);
      }
      setMessage('Saved. New amounts apply to open periods immediately.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Could not save.');
    } finally { setSaving(false); }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="!text-sm">Attendance credit</CardTitle>
        <CardDescription className="text-xs">
          How much of a service each attendance status earns. 1 is full credit,
          0 earns nothing.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-5">
          {Object.keys(DEFAULT_STATUS_WEIGHTS).map((status) => (
            <div key={status}>
              <Label htmlFor={`w-${status}`} className="text-xs">
                {LABELS[status] ?? status}
              </Label>
              <Input id={`w-${status}`} type="number" min={0} max={1} step="0.1"
                value={weights[status] ?? 0}
                onChange={(e) =>
                  setWeights({ ...weights, [status]: Number(e.target.value) })} />
            </div>
          ))}
        </div>
        {message && <p className="text-xs text-muted-foreground">{message}</p>}
        <Button size="sm" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save credit rules'}
        </Button>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Mount it in the panel**

In `src/features/stipends/components/StipendPeriodsPanel.tsx`, add the import:

```tsx
import { StipendPolicyEditor } from './StipendPolicyEditor';
```

Render it below the period grid, before the `StipendPeriodForm`:

```tsx
<StipendPolicyEditor />
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "features/stipends" || echo "clean"`
Expected: `clean`.

- [ ] **Step 4: Commit**

```bash
git add src/features/stipends
git commit -m "feat(stipends): attendance credit policy editor"
```

---

### Task 9: Student card and Finance mount

**Files:**
- Create: `src/features/stipends/components/MyStipendCard.tsx`
- Modify: `src/components/modules/FinanceHub.tsx` (Stipends tab, around lines 8 and 60–80)

**Interfaces:**
- Consumes: `useMyStipend` (Task 4), `StipendPeriodsPanel` (Task 5).
- Produces: `<MyStipendCard />`.

- [ ] **Step 1: Write the student card**

Create `src/features/stipends/components/MyStipendCard.tsx`:

```tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useMyStipend } from '../useStipendStanding';

const money = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n ?? 0);

export function MyStipendCard() {
  const { standing, period, loading } = useMyStipend();

  if (loading || !standing || !period) return null;

  const earned = Number(standing.earned);
  const base = Number(standing.base_amount);
  const pct = base > 0 ? Math.round((earned / base) * 100) : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="!text-sm">My stipend — {period.name}</CardTitle>
        <CardDescription className="text-xs">
          Attend every service to earn the full amount.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold">{money(earned)}</span>
          <span className="text-sm text-muted-foreground">of {money(base)}</span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted">
          <div className="h-2 rounded-full bg-primary transition-all"
            style={{ width: `${Math.min(pct, 100)}%` }} />
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div>
            <p className="text-muted-foreground">Attended</p>
            <p className="font-medium">
              {Number(standing.credited_services)} / {standing.required_services}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Absences</p>
            <p className="font-medium">{standing.absences}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Each service</p>
            <p className="font-medium">{money(Number(standing.per_service_value))}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Mount the admin panel in the Stipends tab**

In `src/components/modules/FinanceHub.tsx`, add the import beside the existing
module imports near line 8:

```tsx
import { StipendPeriodsPanel } from '@/features/stipends/components/StipendPeriodsPanel';
```

Then replace the existing stipends `TabsContent` body so the period tool sits
above the existing payment tool. The payout module stays — round one does not
replace it:

```tsx
<TabsContent value="stipends" className="m-0 space-y-6">
  <StipendPeriodsPanel />
  <StipendPaymentModule />
</TabsContent>
```

- [ ] **Step 3: Verify the build**

Run: `npm run build 2>&1 | tail -5`
Expected: build succeeds.

Run: `npm test -- src/features/stipends`
Expected: PASS, 11 tests.

- [ ] **Step 4: Commit**

```bash
git add src/features/stipends src/components/modules/FinanceHub.tsx
git commit -m "feat(stipends): student stipend card and Finance hub mount"
```

---

### Task 10: Retire the contract-driven stipend flow

The spec makes the period model the single source of truth. Leaving
`StipendManagement` mounted would show a second, contradictory stipend number
for the same student — and it auto-syncs contract amounts into finance records
on every load, which would keep fighting the new model.

**Files:**
- Modify: `src/components/admin/FinancialSystem.tsx:10,115`
- Delete: `src/components/admin/financial/StipendManagement.tsx`
- Delete: `src/hooks/useAdminStipends.ts`
- Modify: `src/constants/granularPermissions.ts:175`

**Interfaces:**
- Consumes: `StipendPeriodsPanel` (Task 5).
- Produces: nothing new.

- [ ] **Step 1: Swap the mount**

In `src/components/admin/FinancialSystem.tsx`, replace the import on line 10:

```tsx
import { StipendPeriodsPanel } from '@/features/stipends/components/StipendPeriodsPanel';
```

and the tab body at line 115:

```tsx
<TabsContent value="stipends" className="space-y-4 md:space-y-6">
  <StipendPeriodsPanel />
</TabsContent>
```

- [ ] **Step 2: Delete the superseded files**

```bash
git rm src/components/admin/financial/StipendManagement.tsx src/hooks/useAdminStipends.ts
```

- [ ] **Step 3: Fix the dangling permission reference**

`src/constants/granularPermissions.ts:175` has `location: 'useAdminStipends'`.
That string names a hook that no longer exists. Change it to:

```ts
    location: 'useStipendPeriods',
```

- [ ] **Step 4: Verify nothing still imports the deleted modules**

Run: `grep -rn "useAdminStipends\|StipendManagement" src; echo "exit=$?"`
Expected: no matches (`exit=1`).

Run: `npm run build 2>&1 | tail -5`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add -A src
git commit -m "refactor(stipends): retire contract-driven stipend flow in favor of periods"
```

---

## Notes for the reviewer

Two rules are deliberate and worth confirming against how the tenant actually
runs their program:

1. **An event with no attendance rows at all is excluded entirely.** If nobody
   ran roll call, no student is marked absent for it and it does not consume a
   required service.
2. **An event where roll *was* taken but a given student has no row counts as
   an absence for that student**, surfaced in the roster as `unmarked` so an
   admin can catch a roster gap before closing. This is the more aggressive of
   the two reasonable readings; the alternative is to ignore it, which would
   let a missing row quietly pay a full stipend.

Payout is out of scope. A closed period holds authoritative `final_amount`
values ready for a second pass to write into `gw_stipend_payments` and
`gw_running_ledger`.
