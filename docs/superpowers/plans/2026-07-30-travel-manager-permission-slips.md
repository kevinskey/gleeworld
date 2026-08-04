# Travel Manager + Parent Permission Slips Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename "Tour Manager" → "Travel Manager" in the UI, and ship a parent electronic permission slip workflow: K–12 tenant flag auto-creates a slip when a student is rostered; teacher sends via email; parent signs on a public tokenized page; teacher sees status in the Travel Manager.

**Architecture:** UI-only rename (no DB/route/module-id changes; `/travel-manager` route alias renders existing Tour components). Two new tables (`gw_guardians`, `gw_permission_slips`) + one column (`gw_branding_settings.k12_ensemble`) + a trigger on `gw_tour_roster`. Three new Deno edge functions on the self-hosted Supabase droplet handle send, verify, and sign. A public unauthenticated React route hosts the parent form and talks only to those edge functions (never the Supabase JS SDK directly).

**Tech Stack:** React SPA + Vite, self-hosted Supabase (Postgres + GoTrue + Storage + Deno edge functions), Resend for email, `npm:jose` for JWT sign/verify, canvas 2D API for signature capture, Vitest for unit tests, manual browser verification via the `verify` skill for E2E flows.

## Global Constraints

- Rename is label-only. Do NOT rename files, components, imports, CSS classes, DB tables (`gw_tour_*`), routes (`/tour-manager` remains), module id (`tour-management`), or permission strings (`access_tour_planner`, `is_current_user_tour_manager()`).
- Every new table has `tenant_id UUID NOT NULL DEFAULT current_tenant_id()` + BEFORE INSERT trigger + RESTRICTIVE per-tenant RLS policies (per GleeWorld multi-tenant model).
- All writes to `gw_branding_settings` MUST use `.upsert({...}, { onConflict: 'tenant_id' })` — bare `.upsert()` hits the legacy singleton row and corrupts other tenants (per the branding-settings upsert trap).
- Parent flow: the parent's browser must NEVER call the Supabase JS SDK. All parent reads/writes go through edge functions using the service role.
- Signature PNGs go in a private Storage bucket `permission-slips`. Never client-readable by students or parents post-sign.
- Migrations run via `supabase migration new` locally, then applied to prod through the droplet Studio (per repo convention).
- Edge functions deploy to `/opt/supabase/volumes/functions/<name>/index.ts` on the droplet; relative imports need `.ts` (per the edge-fn deploy memory).
- All new user-visible copy says "Travel", never "Tour".
- No dedicated notifications table in v1 — bell reads from `gw_permission_slips` filtered by `signed_at > last_seen_at`, with `last_seen_at` in `localStorage`.
- Testing: unit tests use Vitest (`npm run test`); E2E is manual verification via the `verify` skill (Playwright + system Chrome). Every task ends with either a Vitest test that runs green OR a manual verify checklist that was actually walked through in a browser.
- Deploy build sequence per repo memory: build locally, rsync `dist/` (no `--delete`), NEVER work in `/tmp`.

---

## File Structure

**New files:**
- `supabase/migrations/20260730000001_travel_permission_slips.sql` — all schema (tables, trigger, storage bucket, RLS).
- `supabase/functions/send-permission-slip-email/index.ts` — teacher-authenticated. Mints JWT, sends via Resend.
- `supabase/functions/verify-permission-slip-token/index.ts` — public. Verifies JWT, returns slip + trip context.
- `supabase/functions/parent-sign-permission-slip/index.ts` — public. Re-verifies JWT, uploads PNG, marks signed.
- `supabase/functions/permission-slip-reminder-digest/index.ts` — scheduled. Emails teachers about outstanding slips 48h out.
- `supabase/functions/_shared/permissionSlipToken.ts` — shared `signSlipToken()` / `verifySlipToken()` helpers using `npm:jose`.
- `src/pages/ParentPermissionSlip.tsx` — public unauthenticated parent form.
- `src/components/travel-manager/PermissionSlipsTab.tsx` — new tab body inside `TourManagerDashboard`.
- `src/components/travel-manager/SlipStatusBadge.tsx` — badge component used in the roster row + tab.
- `src/components/travel-manager/GuardianList.tsx` — CRUD list of guardians for a student (mounts inside existing StudentDetail).
- `src/components/travel-manager/K12ToggleField.tsx` — small toggle used inside the existing General branding settings form.
- `src/hooks/usePermissionSlips.ts` — data hook (query + mutations) for teacher-side slip management.
- `src/hooks/useGuardians.ts` — data hook for guardian CRUD.
- `tests/unit/permissionSlipToken.test.ts` — Vitest coverage for the shared token helper.

**Modified files (surgical edits, keep component and file names):**
- `src/lib/navigation/navCatalog.ts` — line 80 label swap.
- `src/config/unified-modules.ts` — lines 294–305 title + description swap.
- `src/constants/routes.ts` — add `TRAVEL_MANAGER`, `TRAVEL_PLANNER`, `PARENT_PERMISSION_SLIP` constants.
- `src/App.tsx` — register `/travel-manager`, `/travel-planner`, `/parent/permission-slip` routes (aliases of existing tour routes; parent route bypasses `ProtectedRoute`).
- `src/components/tour-manager/TourManagerDashboard.tsx` — add "Permission Slips" tab + content pane.
- `src/components/tour/TourRosterSection.tsx` — add slip status column and row action menu.
- `src/pages/admin/StudentDetail.tsx` — mount `<GuardianList />`.
- The existing General/Branding settings page (find via search for `k12` or the form that writes to `gw_branding_settings`) — mount `<K12ToggleField />`.

---

## Task 1: Schema migration — tables, trigger, storage, RLS

**Files:**
- Create: `supabase/migrations/20260730000001_travel_permission_slips.sql`

**Interfaces:**
- Consumes: existing `gw_tour_events`, `gw_tour_roster`, `gw_branding_settings`, `auth.users`, `current_tenant_id()`, `is_current_user_tour_manager()`.
- Produces: `gw_guardians` table, `gw_permission_slips` table, `gw_branding_settings.k12_ensemble` column, `permission-slips` storage bucket, `gw_create_permission_slip_for_roster()` trigger function.

- [ ] **Step 1: Write the migration SQL**

```sql
-- supabase/migrations/20260730000001_travel_permission_slips.sql

-- 1. gw_branding_settings K-12 flag
ALTER TABLE gw_branding_settings
  ADD COLUMN IF NOT EXISTS k12_ensemble BOOLEAN NOT NULL DEFAULT false;

-- 2. gw_guardians
CREATE TABLE gw_guardians (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL DEFAULT current_tenant_id(),
  student_user_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  email            TEXT NOT NULL,
  phone            TEXT,
  relationship     TEXT NOT NULL CHECK (relationship IN ('mother','father','guardian','other')),
  is_primary       BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX gw_guardians_one_primary
  ON gw_guardians(student_user_id) WHERE is_primary = true;
CREATE INDEX gw_guardians_student ON gw_guardians(student_user_id);
CREATE INDEX gw_guardians_tenant  ON gw_guardians(tenant_id);
ALTER TABLE gw_guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE gw_guardians FORCE ROW LEVEL SECURITY;

CREATE POLICY guardians_tenant_isolation ON gw_guardians
  AS RESTRICTIVE FOR ALL
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY guardians_teacher_manage ON gw_guardians
  FOR ALL
  USING (is_current_user_tour_manager() OR EXISTS (
    SELECT 1 FROM gw_user_roles r
    WHERE r.user_id = auth.uid()
      AND r.role IN ('super_admin','super-admin','admin')
  ))
  WITH CHECK (true);

CREATE POLICY guardians_student_read ON gw_guardians
  FOR SELECT USING (student_user_id = auth.uid());

CREATE POLICY guardians_student_update ON gw_guardians
  FOR UPDATE USING (student_user_id = auth.uid())
  WITH CHECK (student_user_id = auth.uid());

CREATE TRIGGER gw_guardians_set_updated_at
  BEFORE UPDATE ON gw_guardians
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. gw_permission_slips
CREATE TABLE gw_permission_slips (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID NOT NULL DEFAULT current_tenant_id(),
  tour_id                 UUID NOT NULL REFERENCES gw_tour_events(id) ON DELETE CASCADE,
  student_user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status                  TEXT NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','sent','signed','expired','revoked')),
  slip_token_jti          UUID,
  sent_to_guardian_id     UUID REFERENCES gw_guardians(id) ON DELETE SET NULL,
  sent_at                 TIMESTAMPTZ,
  signed_by_guardian_id   UUID REFERENCES gw_guardians(id) ON DELETE SET NULL,
  signed_at               TIMESTAMPTZ,
  signature_storage_path  TEXT,
  signature_audit         JSONB,
  expires_at              TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tour_id, student_user_id)
);
CREATE INDEX perm_slips_tenant_tour ON gw_permission_slips(tenant_id, tour_id);
CREATE INDEX perm_slips_status ON gw_permission_slips(status);
CREATE INDEX perm_slips_signed_at ON gw_permission_slips(signed_at DESC) WHERE status='signed';

ALTER TABLE gw_permission_slips ENABLE ROW LEVEL SECURITY;
ALTER TABLE gw_permission_slips FORCE ROW LEVEL SECURITY;

CREATE POLICY slips_tenant_isolation ON gw_permission_slips
  AS RESTRICTIVE FOR ALL
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY slips_teacher_manage ON gw_permission_slips
  FOR ALL
  USING (is_current_user_tour_manager() OR EXISTS (
    SELECT 1 FROM gw_user_roles r
    WHERE r.user_id = auth.uid()
      AND r.role IN ('super_admin','super-admin','admin')
  ))
  WITH CHECK (true);

CREATE POLICY slips_student_read ON gw_permission_slips
  FOR SELECT USING (student_user_id = auth.uid());

CREATE TRIGGER gw_permission_slips_set_updated_at
  BEFORE UPDATE ON gw_permission_slips
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. Auto-create slip on roster insert (K-12 tenants only)
CREATE OR REPLACE FUNCTION gw_create_permission_slip_for_roster()
RETURNS TRIGGER AS $$
DECLARE
  is_k12 BOOLEAN;
BEGIN
  SELECT COALESCE(k12_ensemble, false) INTO is_k12
  FROM gw_branding_settings
  WHERE tenant_id = current_tenant_id();
  IF is_k12 THEN
    INSERT INTO gw_permission_slips (tour_id, student_user_id)
    VALUES (NEW.tour_id, NEW.user_id)
    ON CONFLICT (tour_id, student_user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER gw_tour_roster_create_slip
  AFTER INSERT ON gw_tour_roster
  FOR EACH ROW EXECUTE FUNCTION gw_create_permission_slip_for_roster();

-- 5. Private storage bucket for signature PNGs
INSERT INTO storage.buckets (id, name, public)
VALUES ('permission-slips','permission-slips',false)
ON CONFLICT (id) DO NOTHING;
```

- [ ] **Step 2: Apply the migration locally**

Run: `npx supabase db push` (or use Studio SQL runner if the local Supabase CLI is not wired up — per repo memory, migrations often go through droplet Studio as `postgres` superuser).
Expected: no errors. Confirm with `\d gw_guardians` and `\d gw_permission_slips` in psql or Studio.

- [ ] **Step 3: Smoke-test the trigger**

In Studio SQL runner (as authenticated user in a K-12 tenant):
```sql
UPDATE gw_branding_settings SET k12_ensemble = true WHERE tenant_id = current_tenant_id();
-- pick a real tour and student in your test tenant
INSERT INTO gw_tour_roster (tour_id, user_id, status) VALUES ('<tour>','<student>','pending');
SELECT status, tour_id, student_user_id FROM gw_permission_slips
  WHERE tour_id = '<tour>' AND student_user_id = '<student>';
```
Expected: one row with `status='pending'`.

- [ ] **Step 4: Verify RLS**

As a member of a DIFFERENT tenant, `SELECT * FROM gw_permission_slips` — expect zero rows even though other tenants have rows.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260730000001_travel_permission_slips.sql
git commit -m "feat(travel-manager): add gw_guardians, gw_permission_slips, K-12 auto-create trigger"
```

---

## Task 2: Shared JWT helper (`_shared/permissionSlipToken.ts`)

**Files:**
- Create: `supabase/functions/_shared/permissionSlipToken.ts`
- Test: `tests/unit/permissionSlipToken.test.ts`

**Interfaces:**
- Produces:
  - `signSlipToken({ slipId, guardianId, tenantId, jti, ttlDays? }): Promise<string>` — returns JWS compact.
  - `verifySlipToken(token: string): Promise<{ slipId: string; guardianId: string; tenantId: string; jti: string; exp: number }>` — throws on invalid/expired.
  - Reads `SLIP_SIGNING_KEY` env var (HS256 secret).

- [ ] **Step 1: Write the failing Vitest**

```ts
// tests/unit/permissionSlipToken.test.ts
import { describe, it, expect } from 'vitest';
import { signSlipToken, verifySlipToken } from '../../supabase/functions/_shared/permissionSlipToken.ts';

process.env.SLIP_SIGNING_KEY = 'test-secret-32-chars-long-xxxxxxxxxx';

describe('permissionSlipToken', () => {
  it('roundtrips a signed token', async () => {
    const t = await signSlipToken({ slipId: 's1', guardianId: 'g1', tenantId: 't1', jti: 'j1' });
    const claims = await verifySlipToken(t);
    expect(claims.slipId).toBe('s1');
    expect(claims.jti).toBe('j1');
  });
  it('rejects a tampered token', async () => {
    const t = await signSlipToken({ slipId: 's1', guardianId: 'g1', tenantId: 't1', jti: 'j1' });
    const bad = t.slice(0, -4) + 'AAAA';
    await expect(verifySlipToken(bad)).rejects.toThrow();
  });
  it('rejects an expired token', async () => {
    const t = await signSlipToken({ slipId: 's1', guardianId: 'g1', tenantId: 't1', jti: 'j1', ttlDays: -1 });
    await expect(verifySlipToken(t)).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run — expect FAIL** (`npm run test -- permissionSlipToken`).

- [ ] **Step 3: Implement**

```ts
// supabase/functions/_shared/permissionSlipToken.ts
import { SignJWT, jwtVerify } from 'npm:jose@5';

const enc = new TextEncoder();
function key() {
  const raw = Deno.env.get('SLIP_SIGNING_KEY');
  if (!raw || raw.length < 32) throw new Error('SLIP_SIGNING_KEY missing or too short');
  return enc.encode(raw);
}

export async function signSlipToken(p: {
  slipId: string; guardianId: string; tenantId: string; jti: string; ttlDays?: number;
}): Promise<string> {
  const ttl = p.ttlDays ?? 14;
  return await new SignJWT({ slipId: p.slipId, guardianId: p.guardianId, tenantId: p.tenantId })
    .setProtectedHeader({ alg: 'HS256' })
    .setJti(p.jti)
    .setIssuedAt()
    .setExpirationTime(`${ttl}d`)
    .sign(key());
}

export async function verifySlipToken(token: string) {
  const { payload } = await jwtVerify(token, key());
  return {
    slipId: String(payload.slipId),
    guardianId: String(payload.guardianId),
    tenantId: String(payload.tenantId),
    jti: String(payload.jti),
    exp: Number(payload.exp),
  };
}
```

Note: for Vitest to import a `.ts` file under `supabase/functions`, add a vitest config alias or configure resolution to treat `npm:jose@5` as an alias to `jose`. If that's fragile, move the test to run inside `deno test` — but the recon shows the project uses Vitest, so prefer resolving the alias in `vitest.config.ts`.

- [ ] **Step 4: Run — expect PASS.**

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/_shared/permissionSlipToken.ts tests/unit/permissionSlipToken.test.ts
git commit -m "feat(travel-manager): shared JWT helper for permission slip tokens"
```

---

## Task 3: Edge fn — `send-permission-slip-email`

**Files:**
- Create: `supabase/functions/send-permission-slip-email/index.ts`

**Interfaces:**
- Consumes: `signSlipToken` from `_shared/permissionSlipToken.ts`; existing `gw-send-email` edge fn.
- Produces: `POST /functions/v1/send-permission-slip-email` body `{ slip_id: string }` → 200 `{ ok: true, sent_to: string }` or 400 `{ error: 'missing_guardian' | 'unauthorized' | ... }`.

- [ ] **Step 1: Write the fn**

```ts
// supabase/functions/send-permission-slip-email/index.ts
import { createClient } from 'npm:@supabase/supabase-js@2';
import { signSlipToken } from '../_shared/permissionSlipToken.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors() });
  const auth = req.headers.get('authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return json(401, { error: 'unauthorized' });

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const userClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: auth } },
  });

  const { slip_id } = await req.json();
  if (!slip_id) return json(400, { error: 'slip_id required' });

  // RLS on gw_permission_slips will reject if caller is not a teacher.
  const { data: slip, error } = await userClient
    .from('gw_permission_slips').select('*, tour:gw_tour_events(title, start_date), student:student_user_id(email, raw_user_meta_data)')
    .eq('id', slip_id).single();
  if (error || !slip) return json(403, { error: 'unauthorized' });

  const { data: guardians } = await admin
    .from('gw_guardians').select('*')
    .eq('student_user_id', slip.student_user_id)
    .eq('tenant_id', slip.tenant_id)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: true });

  const primary = guardians?.[0];
  if (!primary) return json(400, { error: 'missing_guardian' });
  const cc = (guardians ?? []).slice(1).map(g => g.email);

  const jti = crypto.randomUUID();
  const token = await signSlipToken({
    slipId: slip.id, guardianId: primary.id, tenantId: slip.tenant_id, jti,
  });
  const link = `${new URL(req.url).origin.replace(/\/functions.*/, '')}/parent/permission-slip?token=${token}`;

  await admin.from('gw_permission_slips').update({
    slip_token_jti: jti,
    sent_to_guardian_id: primary.id,
    sent_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 14 * 864e5).toISOString(),
    status: 'sent',
  }).eq('id', slip.id);

  const subject = `Permission slip: ${slip.tour.title}`;
  const html = permissionSlipEmailHtml({
    guardianName: primary.name,
    studentName: (slip.student as any)?.raw_user_meta_data?.full_name ?? 'your student',
    tripTitle: slip.tour.title, link,
  });

  const emailRes = await fetch(`${SUPABASE_URL}/functions/v1/gw-send-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SERVICE_KEY}` },
    body: JSON.stringify({ to: primary.email, cc, subject, html }),
  });
  if (!emailRes.ok) return json(502, { error: 'email_failed' });

  return json(200, { ok: true, sent_to: primary.email });
});

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}
function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...cors() } });
}
function permissionSlipEmailHtml(p: { guardianName: string; studentName: string; tripTitle: string; link: string; }) {
  return `<p>Hi ${escape(p.guardianName)},</p>
<p>${escape(p.studentName)} has been added to <strong>${escape(p.tripTitle)}</strong>. Please review the trip details and sign the permission slip below.</p>
<p><a href="${p.link}" style="background:#111;color:#fff;padding:12px 18px;border-radius:6px;text-decoration:none;">Open permission slip</a></p>
<p style="color:#666;font-size:12px;">This link expires in 14 days. If it stops working, contact your teacher for a new one.</p>`;
}
function escape(s: string) { return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!)); }
```

- [ ] **Step 2: Deploy to the droplet**

```bash
scp supabase/functions/send-permission-slip-email/index.ts \
  root@supabase.gleeworld.org:/opt/supabase/volumes/functions/send-permission-slip-email/index.ts
ssh root@supabase.gleeworld.org 'cd /opt/supabase && docker compose restart functions'
```

Set env: `SLIP_SIGNING_KEY` (32+ char random string) in `/opt/supabase/.env`.

- [ ] **Step 3: Smoke-test**

From a teacher-authenticated browser session (copy access token from devtools):
```bash
curl -X POST https://supabase.gleeworld.org/functions/v1/send-permission-slip-email \
  -H "Authorization: Bearer <teacher access token>" \
  -H "Content-Type: application/json" \
  -d '{"slip_id":"<real slip id>"}'
```
Expected: `{ "ok": true, "sent_to": "guardian@example.com" }`. Confirm the email arrives (Resend dashboard + inbox).

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/send-permission-slip-email/index.ts
git commit -m "feat(travel-manager): edge fn to send permission slip magic-link email"
```

---

## Task 4: Edge fn — `verify-permission-slip-token` (public read)

**Files:**
- Create: `supabase/functions/verify-permission-slip-token/index.ts`

**Interfaces:**
- Consumes: `verifySlipToken` from `_shared/permissionSlipToken.ts`.
- Produces: `POST` body `{ token: string }` → `{ ok: true, slip: { id, status }, student: { name }, guardian: { name, email }, trip: { title, destination, start_date, end_date, cost, notes } }` or `{ ok: false, reason: 'expired'|'invalid'|'revoked'|'already_signed' }`.

- [ ] **Step 1: Write the fn**

```ts
import { createClient } from 'npm:@supabase/supabase-js@2';
import { verifySlipToken } from '../_shared/permissionSlipToken.ts';

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors() });
  const { token } = await req.json();
  let claims;
  try { claims = await verifySlipToken(token); }
  catch { return json({ ok: false, reason: 'invalid' }); }

  const { data: slip } = await admin.from('gw_permission_slips')
    .select('id, status, slip_token_jti, tour_id, student_user_id')
    .eq('id', claims.slipId).single();
  if (!slip) return json({ ok: false, reason: 'invalid' });
  if (slip.slip_token_jti !== claims.jti) return json({ ok: false, reason: 'revoked' });
  if (slip.status === 'signed') return json({ ok: false, reason: 'already_signed' });
  if (slip.status === 'revoked' || slip.status === 'expired') return json({ ok: false, reason: slip.status });

  const [{ data: guardian }, { data: student }, { data: tour }] = await Promise.all([
    admin.from('gw_guardians').select('name,email').eq('id', claims.guardianId).single(),
    admin.from('gw_profiles').select('full_name').eq('user_id', slip.student_user_id).single(),
    admin.from('gw_tour_events').select('title,destination,start_date,end_date,cost,description').eq('id', slip.tour_id).single(),
  ]);
  return json({ ok: true, slip: { id: slip.id, status: slip.status }, student, guardian, trip: tour });
});

function cors() { return { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }; }
function json(body: unknown) { return new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json', ...cors() } }); }
```

- [ ] **Step 2: Deploy + smoke-test with the token minted in Task 3.**

Expected valid token → `ok: true`. Tamper one char → `ok: false, reason: 'invalid'`.

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/verify-permission-slip-token/index.ts
git commit -m "feat(travel-manager): edge fn to verify parent permission slip tokens (public)"
```

---

## Task 5: Edge fn — `parent-sign-permission-slip` (public write)

**Files:**
- Create: `supabase/functions/parent-sign-permission-slip/index.ts`

**Interfaces:**
- Consumes: `verifySlipToken`.
- Produces: `POST` body `{ token: string, signature_png_base64: string, typed_name: string }` → `{ ok: true }` or `{ ok: false, reason }`.

- [ ] **Step 1: Write the fn**

```ts
import { createClient } from 'npm:@supabase/supabase-js@2';
import { verifySlipToken } from '../_shared/permissionSlipToken.ts';

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors() });
  const ip = req.headers.get('x-forwarded-for') ?? '';
  const ua = req.headers.get('user-agent') ?? '';
  const { token, signature_png_base64, typed_name } = await req.json();
  if (!token || !signature_png_base64 || !typed_name) return json({ ok: false, reason: 'bad_request' });

  let claims;
  try { claims = await verifySlipToken(token); }
  catch { return json({ ok: false, reason: 'invalid' }); }

  const { data: slip } = await admin.from('gw_permission_slips')
    .select('id, status, slip_token_jti, tenant_id')
    .eq('id', claims.slipId).single();
  if (!slip || slip.slip_token_jti !== claims.jti) return json({ ok: false, reason: 'revoked' });
  if (slip.status !== 'sent') return json({ ok: false, reason: 'already_signed' });

  const bytes = Uint8Array.from(atob(signature_png_base64.replace(/^data:image\/png;base64,/, '')), c => c.charCodeAt(0));
  const path = `${slip.tenant_id}/${slip.id}.png`;
  const up = await admin.storage.from('permission-slips').upload(path, bytes, { contentType: 'image/png', upsert: true });
  if (up.error) return json({ ok: false, reason: 'upload_failed' });

  const { error } = await admin.from('gw_permission_slips').update({
    status: 'signed',
    signed_by_guardian_id: claims.guardianId,
    signed_at: new Date().toISOString(),
    signature_storage_path: path,
    signature_audit: { ip, user_agent: ua, typed_name, ts: new Date().toISOString() },
  }).eq('id', slip.id).eq('slip_token_jti', claims.jti);
  if (error) return json({ ok: false, reason: 'update_failed' });
  return json({ ok: true });
});
function cors() { return { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }; }
function json(body: unknown) { return new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json', ...cors() } }); }
```

- [ ] **Step 2: Deploy + smoke-test**

Expected: first sign → `ok:true`, storage bucket has PNG, slip row updated. Second sign attempt → `ok:false, reason:'already_signed'`.

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/parent-sign-permission-slip/index.ts
git commit -m "feat(travel-manager): edge fn to accept parent signature and mark slip signed"
```

---

## Task 6: Parent-facing route `/parent/permission-slip`

**Files:**
- Create: `src/pages/ParentPermissionSlip.tsx`
- Modify: `src/App.tsx` (register route OUTSIDE `<ProtectedRoute>`)
- Modify: `src/constants/routes.ts` (add `PARENT_PERMISSION_SLIP: '/parent/permission-slip'`)

**Interfaces:**
- Consumes: `verify-permission-slip-token`, `parent-sign-permission-slip` edge fns.
- Produces: single React page component, no props.

- [ ] **Step 1: Add route constant + register the route**

In `src/constants/routes.ts`, add: `PARENT_PERMISSION_SLIP: '/parent/permission-slip'` beside existing constants.

In `src/App.tsx`, register OUTSIDE `<ProtectedRoute>` (this is the whole point — parents don't have accounts):

```tsx
<Route path="/parent/permission-slip" element={<ParentPermissionSlip />} />
```

- [ ] **Step 2: Build the page**

```tsx
// src/pages/ParentPermissionSlip.tsx
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabaseFunctionsUrl } from '@/lib/supabase'; // or hardcode the URL

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error'; reason: string }
  | { kind: 'ready'; slip: any; student: any; guardian: any; trip: any }
  | { kind: 'submitted' };

export default function ParentPermissionSlip() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [typedName, setTypedName] = useState('');
  const [agreed, setAgreed] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drewSomething = useRef(false);

  useEffect(() => {
    if (!token) { setState({ kind: 'error', reason: 'invalid' }); return; }
    fetch(`${supabaseFunctionsUrl}/verify-permission-slip-token`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    }).then(r => r.json()).then(d => {
      if (!d.ok) setState({ kind: 'error', reason: d.reason });
      else setState({ kind: 'ready', ...d });
    });
  }, [token]);

  useEffect(() => { attachCanvas(canvasRef.current, () => { drewSomething.current = true; }); }, [state.kind]);

  if (state.kind === 'loading') return <p style={{ padding: 24 }}>Loading…</p>;
  if (state.kind === 'error') return <ErrorScreen reason={state.reason} />;
  if (state.kind === 'submitted') return <p style={{ padding: 24 }}>Thanks — your child's teacher has been notified.</p>;

  const canSubmit = drewSomething.current && typedName.trim().length > 1 && agreed;

  async function submit() {
    const png = canvasRef.current!.toDataURL('image/png');
    const res = await fetch(`${supabaseFunctionsUrl}/parent-sign-permission-slip`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, signature_png_base64: png, typed_name: typedName }),
    }).then(r => r.json());
    if (res.ok) setState({ kind: 'submitted' });
    else alert(`Sign failed: ${res.reason ?? 'unknown'}`);
  }

  const { student, trip, guardian } = state;
  return (
    <main style={{ maxWidth: 480, margin: '0 auto', padding: 16, fontFamily: 'system-ui' }}>
      <h1 style={{ fontSize: 20 }}>Permission slip for {student?.full_name}</h1>
      <section style={{ background: '#f8f5ee', padding: 12, borderRadius: 8, marginTop: 12 }}>
        <p style={{ margin: 0 }}><strong>{trip?.title}</strong></p>
        <p style={{ margin: '4px 0' }}>{trip?.destination}</p>
        <p style={{ margin: '4px 0' }}>{trip?.start_date} – {trip?.end_date}</p>
        {trip?.cost && <p style={{ margin: '4px 0' }}>Cost: ${trip.cost}</p>}
        {trip?.description && <p style={{ margin: '8px 0 0', whiteSpace: 'pre-wrap' }}>{trip.description}</p>}
      </section>
      <h2 style={{ fontSize: 16, marginTop: 20 }}>Sign below</h2>
      <canvas ref={canvasRef} width={448} height={160} style={{ border: '1px solid #ccc', width: '100%', touchAction: 'none' }} />
      <button type="button" onClick={() => clearCanvas(canvasRef.current!)}>Clear signature</button>
      <label style={{ display: 'block', marginTop: 12 }}>Your full name
        <input value={typedName} onChange={e => setTypedName(e.target.value)} style={{ display: 'block', width: '100%', padding: 8, marginTop: 4 }} />
      </label>
      <label style={{ display: 'block', marginTop: 12 }}>
        <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} />
        {' '}I am {guardian?.name} and I authorize {student?.full_name} to travel on this trip.
      </label>
      <button disabled={!canSubmit} onClick={submit}
        style={{ marginTop: 16, padding: '12px 20px', background: canSubmit ? '#111' : '#999', color: '#fff', border: 0, borderRadius: 6, width: '100%' }}>
        Submit permission slip
      </button>
    </main>
  );
}

function ErrorScreen({ reason }: { reason: string }) {
  const msg = reason === 'expired' ? 'This link has expired. Contact your teacher for a new one.'
            : reason === 'already_signed' ? 'This permission slip is already signed. Thank you.'
            : reason === 'revoked' ? 'This link is no longer valid. Contact your teacher.'
            : 'This link is not valid.';
  return <p style={{ padding: 24 }}>{msg}</p>;
}
function attachCanvas(c: HTMLCanvasElement | null, onDraw: () => void) {
  if (!c) return;
  const ctx = c.getContext('2d')!; ctx.lineWidth = 2; ctx.strokeStyle = '#111'; ctx.lineCap = 'round';
  let drawing = false; let last: { x: number; y: number } | null = null;
  const pos = (e: PointerEvent) => { const r = c.getBoundingClientRect(); return { x: (e.clientX - r.left) * (c.width / r.width), y: (e.clientY - r.top) * (c.height / r.height) }; };
  c.onpointerdown = e => { drawing = true; last = pos(e); c.setPointerCapture(e.pointerId); onDraw(); };
  c.onpointermove = e => { if (!drawing) return; const p = pos(e); ctx.beginPath(); ctx.moveTo(last!.x, last!.y); ctx.lineTo(p.x, p.y); ctx.stroke(); last = p; };
  c.onpointerup = () => { drawing = false; last = null; };
}
function clearCanvas(c: HTMLCanvasElement) { c.getContext('2d')!.clearRect(0, 0, c.width, c.height); }
```

Styling above is intentionally minimal inline styles to avoid dragging in `DashboardShell` or tenant-branding hooks that assume auth context. After the flow works end-to-end, revisit with the `gleeworld-design` skill to apply light theme + tenant tint.

- [ ] **Step 3: Manual browser verify** (per `verify` skill)

Open a signed link, complete the flow at 390px viewport (iPhone-size) and desktop. Confirm: signature captures cleanly, submit succeeds, DB row flips to `status='signed'`, PNG appears in the Storage bucket.

- [ ] **Step 4: Commit**

```bash
git add src/pages/ParentPermissionSlip.tsx src/App.tsx src/constants/routes.ts
git commit -m "feat(travel-manager): public /parent/permission-slip page with canvas signature"
```

---

## Task 7: Rename "Tour Manager" → "Travel Manager" (labels only)

**Files:**
- Modify: `src/lib/navigation/navCatalog.ts:80` — `label: 'Travel Manager'`.
- Modify: `src/config/unified-modules.ts:294–305` — `title: "Travel Manager"`, description swap "tour" → "travel".
- Modify: `src/components/tour-manager/TourManagerDashboard.tsx` — any headings, subtitles, empty-state copy: "Tour" → "Travel".
- Modify: `src/components/tour-manager/TourManagerLanding.tsx` — same.
- Modify: `src/pages/TourPlanner.tsx` — same.
- Modify: `src/constants/routes.ts` — add `TRAVEL_MANAGER: '/travel-manager'`, `TRAVEL_PLANNER: '/travel-planner'`.
- Modify: `src/App.tsx` — add alias `<Route path="/travel-manager" ... />` rendering the same element as `/tour-manager`; same for `/travel-planner`.

**Interfaces:** none — pure UI rename.

- [ ] **Step 1: grep for all user-visible "Tour" strings inside the tour-manager surface**

```bash
grep -rn "Tour" src/lib/navigation/navCatalog.ts src/config/unified-modules.ts src/components/tour-manager src/components/tour src/pages/TourPlanner.tsx
```
Distinguish user-visible strings (JSX text, `label:`, `title:`, `description:`, toast messages) from component/prop/import names (leave those alone).

- [ ] **Step 2: Change every user-visible occurrence to "Travel". Do NOT rename files, components, imports, CSS classes, or anything with `tour-management` / `tour-manager` as an identifier.**

- [ ] **Step 3: Register alias routes in `src/App.tsx`**

Duplicate the existing `<Route path="/tour-manager" ...>` block twice (once for `/travel-manager`, once for `/travel-planner`) with the same element tree. Add the constants to `routes.ts`.

- [ ] **Step 4: Manual verify**

Load `/travel-manager` and `/tour-manager` — both render the same page. Sidebar reads "Travel Manager". Confirm nothing internally broke (no missing icons, no console errors).

- [ ] **Step 5: Commit**

```bash
git add src/lib/navigation src/config/unified-modules.ts src/components/tour-manager src/components/tour src/pages/TourPlanner.tsx src/constants/routes.ts src/App.tsx
git commit -m "refactor(travel-manager): rename user-visible Tour → Travel; add /travel-manager route alias"
```

---

## Task 8: K–12 toggle in General settings

**Files:**
- Create: `src/components/travel-manager/K12ToggleField.tsx`
- Modify: the existing General/Branding settings page (find via `grep -rn "gw_branding_settings" src/`; likely `src/pages/admin/BrandingSettings.tsx` or similar). Mount `<K12ToggleField />`.

**Interfaces:** self-contained — reads/writes `gw_branding_settings.k12_ensemble` for `current_tenant_id()`.

- [ ] **Step 1: Build the component**

```tsx
// src/components/travel-manager/K12ToggleField.tsx
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function K12ToggleField() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  useEffect(() => { (async () => {
    const { data } = await supabase.from('gw_branding_settings').select('k12_ensemble').maybeSingle();
    setEnabled(!!data?.k12_ensemble);
  })(); }, []);
  if (enabled === null) return null;
  async function toggle(next: boolean) {
    setEnabled(next);
    const { data: existing } = await supabase.from('gw_branding_settings').select('tenant_id').maybeSingle();
    if (!existing?.tenant_id) return;
    // IMPORTANT: onConflict:'tenant_id' — bare .upsert() would hit the legacy singleton row.
    await supabase.from('gw_branding_settings')
      .upsert({ tenant_id: existing.tenant_id, k12_ensemble: next }, { onConflict: 'tenant_id' });
  }
  return (
    <label className="flex items-center gap-3 text-sm">
      <input type="checkbox" checked={enabled} onChange={e => toggle(e.target.checked)} />
      <span>This is a K–12 ensemble — auto-send permission slips when students are added to travel rosters.</span>
    </label>
  );
}
```

- [ ] **Step 2: Mount it in the General settings page.** Import and drop it near other tenant toggles.

- [ ] **Step 3: Manual verify** — toggle on/off in one tenant, confirm it doesn't affect other tenants' `k12_ensemble` values (SQL: `SELECT tenant_id, k12_ensemble FROM gw_branding_settings ORDER BY tenant_id;`).

- [ ] **Step 4: Commit**

```bash
git add src/components/travel-manager/K12ToggleField.tsx src/pages/admin
git commit -m "feat(travel-manager): K-12 ensemble toggle in tenant settings"
```

---

## Task 9: Guardian CRUD UI on student detail

**Files:**
- Create: `src/components/travel-manager/GuardianList.tsx`
- Create: `src/hooks/useGuardians.ts`
- Modify: `src/pages/admin/StudentDetail.tsx` — mount `<GuardianList studentUserId={student.user_id} />`.

**Interfaces:**
- `useGuardians(studentUserId): { guardians, add(fields), update(id, fields), remove(id), setPrimary(id) }`.

- [ ] **Step 1: Hook**

```ts
// src/hooks/useGuardians.ts
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type Guardian = {
  id: string; name: string; email: string; phone: string | null;
  relationship: 'mother'|'father'|'guardian'|'other'; is_primary: boolean;
};

export function useGuardians(studentUserId: string) {
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const reload = useCallback(async () => {
    const { data } = await supabase.from('gw_guardians').select('*')
      .eq('student_user_id', studentUserId)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: true });
    setGuardians((data ?? []) as Guardian[]);
  }, [studentUserId]);
  useEffect(() => { void reload(); }, [reload]);

  async function add(fields: Omit<Guardian,'id'|'is_primary'> & { is_primary?: boolean }) {
    await supabase.from('gw_guardians').insert({ student_user_id: studentUserId, ...fields });
    await reload();
  }
  async function update(id: string, fields: Partial<Guardian>) {
    await supabase.from('gw_guardians').update(fields).eq('id', id); await reload();
  }
  async function remove(id: string) {
    await supabase.from('gw_guardians').delete().eq('id', id); await reload();
  }
  async function setPrimary(id: string) {
    await supabase.from('gw_guardians').update({ is_primary: false }).eq('student_user_id', studentUserId);
    await supabase.from('gw_guardians').update({ is_primary: true }).eq('id', id);
    await reload();
  }
  return { guardians, add, update, remove, setPrimary };
}
```

- [ ] **Step 2: `GuardianList` component** — table of guardians with add form and per-row edit/delete/set-primary. Follow existing patterns in `src/components/admin/` for form styling and dialog structure.

- [ ] **Step 3: Mount in `StudentDetail.tsx`.**

- [ ] **Step 4: Manual verify** — add two guardians, promote each to primary in turn, delete one, confirm the unique-primary constraint doesn't error (the hook clears others before setting).

- [ ] **Step 5: Commit**

```bash
git add src/components/travel-manager/GuardianList.tsx src/hooks/useGuardians.ts src/pages/admin/StudentDetail.tsx
git commit -m "feat(travel-manager): guardian CRUD on student detail"
```

---

## Task 10: Slip status badge on the roster row

**Files:**
- Create: `src/components/travel-manager/SlipStatusBadge.tsx`
- Create: `src/hooks/usePermissionSlips.ts`
- Modify: `src/components/tour/TourRosterSection.tsx` — add a column that renders `<SlipStatusBadge slip={...} onResend={...} onRevoke={...} />`.

**Interfaces:**
- `usePermissionSlips(tourId): { slips, byStudent, send(slipId), resend(slipId), revoke(slipId), refresh() }`.
- `SlipStatusBadge` props: `{ slip: PermissionSlip | null, guardianCount: number, onSend(), onRevoke(), onViewSigned() }`.

- [ ] **Step 1: Hook**

```ts
// src/hooks/usePermissionSlips.ts
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type PermissionSlip = {
  id: string; tour_id: string; student_user_id: string;
  status: 'pending'|'sent'|'signed'|'expired'|'revoked';
  sent_at: string | null; signed_at: string | null;
  signature_storage_path: string | null;
};

export function usePermissionSlips(tourId: string) {
  const [slips, setSlips] = useState<PermissionSlip[]>([]);
  const reload = useCallback(async () => {
    const { data } = await supabase.from('gw_permission_slips').select('*').eq('tour_id', tourId);
    setSlips((data ?? []) as PermissionSlip[]);
  }, [tourId]);
  useEffect(() => { void reload(); }, [reload]);

  const byStudent = new Map(slips.map(s => [s.student_user_id, s]));

  async function callFn(name: string, body: unknown) {
    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    return fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${name}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    }).then(r => r.json());
  }
  async function send(slipId: string) { await callFn('send-permission-slip-email', { slip_id: slipId }); await reload(); }
  async function revoke(slipId: string) {
    await supabase.from('gw_permission_slips').update({ status: 'revoked', slip_token_jti: null }).eq('id', slipId);
    await reload();
  }
  async function viewSignedUrl(slipId: string) {
    const s = slips.find(x => x.id === slipId);
    if (!s?.signature_storage_path) return null;
    const { data } = await supabase.storage.from('permission-slips').createSignedUrl(s.signature_storage_path, 300);
    return data?.signedUrl ?? null;
  }
  return { slips, byStudent, send, resend: send, revoke, viewSignedUrl, refresh: reload };
}
```

- [ ] **Step 2: `SlipStatusBadge`** — pill + row-action menu (Send / Resend / Revoke / View signed). Handle "no slip yet" (K–12 flag off), "missing guardian" (guardianCount === 0), and the five statuses.

- [ ] **Step 3: Integrate into `TourRosterSection.tsx`.** Fetch guardian counts (map of student → guardian count) alongside slips. Render the badge column right of the roster status column.

- [ ] **Step 4: Manual verify** — every badge state renders. Send flow triggers the email. Resend rotates the JWT (old link stops working). Revoke shows the strike-through pill.

- [ ] **Step 5: Commit**

```bash
git add src/components/travel-manager/SlipStatusBadge.tsx src/hooks/usePermissionSlips.ts src/components/tour/TourRosterSection.tsx
git commit -m "feat(travel-manager): permission slip status badge + row actions on roster"
```

---

## Task 11: Permission Slips tab in Travel Manager Dashboard

**Files:**
- Create: `src/components/travel-manager/PermissionSlipsTab.tsx`
- Modify: `src/components/tour-manager/TourManagerDashboard.tsx` — insert tab entry `{ value: 'permission-slips', label: 'Permission Slips', icon: FileCheck }` into `navItems`, and a matching entry in `contentConfig` that renders `<PermissionSlipsTab />`.

**Interfaces:** self-contained; consumes `usePermissionSlips` and `useGuardians`.

- [ ] **Step 1: Build the tab**

Table with filters (All / Pending / Sent / Signed / Missing guardian / Expired / Revoked), bulk actions (Send all pending, Remind all sent-but-unsigned, Download signed PDFs zip — zip out of scope for v1; instead, "Download signed PNGs" as individual signed URLs). "Missing guardian" callout at the top listing affected students.

- [ ] **Step 2: Register the tab.**

- [ ] **Step 3: Manual verify** — every filter narrows correctly; bulk send hits the edge fn once per slip.

- [ ] **Step 4: Commit**

```bash
git add src/components/travel-manager/PermissionSlipsTab.tsx src/components/tour-manager/TourManagerDashboard.tsx
git commit -m "feat(travel-manager): Permission Slips tab in Travel Manager dashboard"
```

---

## Task 12: In-app notification bell for signed slips

**Files:**
- Modify: the existing `DashboardShell` topbar (find via `grep -rn "topbar\|TopBar\|Bell" src/components/dashboard/`). If a bell surface exists, extend it; otherwise add a minimal `<PermissionSlipBell />` beside the user menu.

**Interfaces:** self-contained; polls `gw_permission_slips` filtered by tenant + `signed_at > last_seen_at`.

- [ ] **Step 1: Implement**

```tsx
// keeps last_seen_at in localStorage; polls every 60s; shows a red dot + count.
// On click, opens a small dropdown of "N slips signed since <ts>" with a "Mark all seen" button that writes now() to localStorage.
```

- [ ] **Step 2: Fire a toast** on the same event when the teacher is actively in-app (use the existing toast system — `useToast` or equivalent).

- [ ] **Step 3: Manual verify** — sign a slip in a second browser as the parent; the teacher's bell increments within ~60s. Toast fires when in-app.

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard
git commit -m "feat(travel-manager): notification bell + toast for signed permission slips"
```

---

## Task 13: Scheduled 48h reminder digest edge fn

**Files:**
- Create: `supabase/functions/permission-slip-reminder-digest/index.ts`

**Interfaces:** runs on cron (see droplet cron section). Produces one email per teacher per K–12 tenant that has trips starting in ≤48h with any `pending` or `sent` (not `signed`) slips.

- [ ] **Step 1: Write the fn**

Query `gw_permission_slips` joined with `gw_tour_events` where `start_date` is between now and now+48h and status ∈ (pending, sent). Group by tenant, group by teacher (tour managers per tenant), call `gw-send-email` with an outstanding-list table.

- [ ] **Step 2: Add a systemd timer or cron entry on the droplet** invoking:

```
curl -X POST https://supabase.gleeworld.org/functions/v1/permission-slip-reminder-digest \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}"
```
Run daily at 09:00 America/New_York. (Follow the existing storage-flatten cron pattern in the droplet reference.)

- [ ] **Step 3: Manual verify** — seed a tour starting 24h from now with an unsigned slip; invoke the fn manually; confirm the digest email arrives.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/permission-slip-reminder-digest/index.ts
git commit -m "feat(travel-manager): 48h reminder digest for outstanding permission slips"
```

---

## Task 14: End-to-end verify + deploy

**Files:** no code — verification and rollout.

- [ ] **Step 1: Full E2E in a browser (per the `verify` skill)**

Golden path: enable K–12 on a test tenant → add a guardian to a test student → add student to a tour roster → confirm slip auto-created → click Send → open the emailed magic link in a second browser context → sign on canvas at 390px viewport → submit → confirm teacher sees `Signed ✓` and the bell within 60s.

Failure paths: expired token (edit `expires_at` back), revoked (click Revoke then reuse old link), missing guardian (remove guardian rows, add student to roster, confirm "Missing guardian" badge blocks Send).

- [ ] **Step 2: Verify RLS on a second tenant** — SQL check that a teacher in tenant B can't read slips or guardians from tenant A.

- [ ] **Step 3: Build and deploy web**

```bash
cd ~/Documents/GitHub/gleeworld
git checkout main && git pull
npm ci
npm run build
# rsync without --delete (per gleeworld deploy memory)
rsync -av dist/ root@app.gleeworld.org:/var/www/gleeworld/
```

- [ ] **Step 4: Deploy edge functions to the droplet** (all four new fns + shared helper). Set `SLIP_SIGNING_KEY` in `/opt/supabase/.env` if not already set. Restart the functions container.

- [ ] **Step 5: Post-deploy smoke** on prod — repeat the golden-path E2E in a real browser on the live domain.

- [ ] **Step 6: Commit any doc changes and tag**

```bash
git commit --allow-empty -m "chore(travel-manager): v1 deploy checkpoint"
```

---

## Post-implementation follow-ups (NOT in this plan)

- Resend bounce webhook → auto-flag slips whose delivery bounced.
- Multi-guardian all-must-sign quorum.
- Paper-fallback: teacher uploads a scanned paper slip and marks signed offline.
- Real notifications table + push.
- Signed-PDFs zip download (currently individual signed URLs).
- Deep DB rename (`gw_tour_*` → `gw_travel_*`) if desired later.
