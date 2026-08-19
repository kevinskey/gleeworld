# Studio Recording Sharing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Teachers share Studio recordings to a class media library, attach them to standard assignments, or email them to a class/individual — while the owner's private Studio-folder copy and device download stay untouched.

**Architecture:** "Share = class copy": sharing to a class inserts a new `gw_media_library` row pointing at the same storage object (`course_id` set, `folder` NULL, `source_media_id` → original); existing RLS already scopes such rows to course members. Individual email shares grant access via a new `gw_media_item_shares` table (exact mirror of the shipped `gw_media_folder_shares`). Email goes through the existing `gw-send-email` edge fn (it already BCC-chunks multi-recipient sends); in-app notifications through the existing `create_notification_with_delivery` RPC. A new `/listen/:id` page is the sign-in-gated landing target.

**Tech Stack:** Vite 7 + React + TS + shadcn + TanStack Query + self-hosted Supabase (RESTRICTIVE tenant RLS). Tests: vitest (`npm test` = `vitest run`); DB assertions via rolled-back psql test scripts in `supabase/migrations/tests/`.

**Spec:** `docs/superpowers/specs/2026-08-17-studio-recording-sharing-design.md`

## Global Constraints

- Work ONLY in the worktree `/private/tmp/claude-501/-Users-kevinjohnson/25c22a78-8e09-4c55-a037-28615b4843e8/scratchpad/gw-share`, branch `feat/studio-recording-sharing`. NEVER commit from `~/Documents/GitHub/gleeworld` (other sessions use it).
- Node modules in the worktree: `npm ci --legacy-peer-deps` (plain `npm ci` fails on react-pdf-viewer peer deps). Never pipe install output to `tail` (hides failure). If `package.json` is unchanged vs main, symlinking the main checkout's `node_modules` also works.
- `gw_media_library` inserts must use ONLY these columns: `title, file_url, file_path, file_type, file_size, folder, category, is_public, is_featured, is_deleted, course_id, uploaded_by, download_count, view_count, source_media_id` — the live table lacks `filename/original_filename/mime_type/bucket_name`; one wrong column rejects the whole insert with PostgREST 400.
- Demo-tenant writes silently match 0 rows with NO error: every INSERT/UPDATE in new code chains `.select(...)` and treats an empty result as failure.
- `gw_course_assignments` live columns (from generated types): `course_id, title, description, instructions, assignment_type, points, due_date, available_from, available_until, is_published, allow_late_submissions, late_penalty_percent, rubric_id, display_order, created_by` (+ `tenant_id`, and `media_id` added by this plan). There is NO `category`, `due_at`, `is_active`, or free-text `rubric` column.
- Tenant model: new tables get `tenant_id uuid NOT NULL DEFAULT public.current_tenant_id()`, a `trg_set_tenant_id`-style BEFORE INSERT trigger calling `public.set_tenant_id_default()`, and a RESTRICTIVE `tenant_isolation_restrict` policy (copy shapes from `supabase/migrations/20260708010000_media_folder_shares.sql`).
- Commit after every green test cycle. Do not push or deploy until the final task.

---

### Task 1: Migration + DB assert test

**Files:**
- Create: `supabase/migrations/20260817300000_studio_recording_sharing.sql`
- Create: `supabase/migrations/tests/studio_recording_sharing_test.sql`

**Interfaces:**
- Produces: `gw_media_library.source_media_id uuid`, `gw_course_assignments.media_id uuid`, table `public.gw_media_item_shares`, policies `media_library_item_shared_select`, `course_write_media_library`, `course_write_media_library_upd`, function `public.user_can_manage_course(uuid)`. Later tasks insert/select against exactly these names.

- [ ] **Step 1: Write the migration**

```sql
-- Studio recording sharing (spec: docs/superpowers/specs/2026-08-17-studio-recording-sharing-design.md)
--
-- 1) source_media_id: a "class copy" media row points back at the private
--    Studio-folder original it was shared from (idempotency + provenance).
-- 2) gw_course_assignments.media_id: a standard assignment can carry a
--    playable recording (the class copy, so enrolled students pass RLS).
-- 3) gw_media_item_shares: per-item email grant, mirroring the shipped
--    gw_media_folder_shares (within-tenant only — RESTRICTIVE tenant
--    isolation still ANDs on top).
-- 4) Write-side course gate: only someone who can MANAGE a course may
--    create/point media rows at it (pre-existing gap: course_access_*
--    policies were SELECT-only).

ALTER TABLE public.gw_media_library
  ADD COLUMN IF NOT EXISTS source_media_id uuid
  REFERENCES public.gw_media_library(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS gw_media_library_source_idx
  ON public.gw_media_library (source_media_id)
  WHERE source_media_id IS NOT NULL;

ALTER TABLE public.gw_course_assignments
  ADD COLUMN IF NOT EXISTS media_id uuid
  REFERENCES public.gw_media_library(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.gw_media_item_shares (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL DEFAULT public.current_tenant_id(),
  media_id      uuid NOT NULL REFERENCES public.gw_media_library(id) ON DELETE CASCADE,
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_email text NOT NULL,
  permission    text NOT NULL DEFAULT 'view' CHECK (permission IN ('view')),
  created_by    uuid DEFAULT auth.uid(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  revoked_at    timestamptz,
  UNIQUE (media_id, invited_email)
);

CREATE OR REPLACE FUNCTION public.gw_media_item_shares_norm()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.invited_email := lower(trim(NEW.invited_email));
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_gw_media_item_shares_norm ON public.gw_media_item_shares;
CREATE TRIGGER trg_gw_media_item_shares_norm
  BEFORE INSERT OR UPDATE ON public.gw_media_item_shares
  FOR EACH ROW EXECUTE FUNCTION public.gw_media_item_shares_norm();

DROP TRIGGER IF EXISTS trg_gw_media_item_shares_set_tenant ON public.gw_media_item_shares;
CREATE TRIGGER trg_gw_media_item_shares_set_tenant
  BEFORE INSERT ON public.gw_media_item_shares
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_default();

CREATE INDEX IF NOT EXISTS gw_media_item_shares_grantee_idx
  ON public.gw_media_item_shares (invited_email) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS gw_media_item_shares_media_idx
  ON public.gw_media_item_shares (media_id);

ALTER TABLE public.gw_media_item_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_restrict ON public.gw_media_item_shares
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY media_item_shares_owner_all ON public.gw_media_item_shares
  FOR ALL TO authenticated
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY media_item_shares_grantee_read ON public.gw_media_item_shares
  FOR SELECT TO authenticated
  USING (lower(invited_email) = lower(auth.jwt() ->> 'email'));

DROP POLICY IF EXISTS media_library_item_shared_select ON public.gw_media_library;
CREATE POLICY media_library_item_shared_select ON public.gw_media_library
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.gw_media_item_shares s
    WHERE s.media_id = gw_media_library.id
      AND s.revoked_at IS NULL
      AND lower(s.invited_email) = lower(auth.jwt() ->> 'email')
  ));

-- Manage-course check: admins or the course instructor. TAs deliberately
-- excluded in v1 (their model keys on course_code strings).
CREATE OR REPLACE FUNCTION public.user_can_manage_course(p_course_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE user_id = auth.uid() AND (is_admin OR is_super_admin)
  ) OR EXISTS (
    SELECT 1 FROM public.gw_courses
    WHERE id = p_course_id AND instructor_id = auth.uid()
  );
$$;
GRANT EXECUTE ON FUNCTION public.user_can_manage_course(uuid) TO authenticated;

-- Write-side gate. Rows without a course tag are unaffected, so every
-- existing upload/update path (course_id NULL) keeps working.
DROP POLICY IF EXISTS course_write_media_library ON public.gw_media_library;
CREATE POLICY course_write_media_library ON public.gw_media_library
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (course_id IS NULL OR public.user_can_manage_course(course_id));

DROP POLICY IF EXISTS course_write_media_library_upd ON public.gw_media_library;
CREATE POLICY course_write_media_library_upd ON public.gw_media_library
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (course_id IS NULL OR public.user_can_manage_course(course_id));
```

Note the UPDATE policy: `USING (true)` so it never hides rows from an update's row-selection (other policies decide that); the `WITH CHECK` alone enforces that the row *as written* can't carry a course_id the caller doesn't manage.

- [ ] **Step 2: Write the assert test**

Pattern: rolled-back transaction, simulated JWTs via `set_config('request.jwt.claims', ...)`, skip-with-NOTICE when prod data lacks fixtures (same defensive style as `supabase/migrations/tests/academy_roll_call_test.sql`). Fixture rows need a REAL `uploaded_by` (FK to auth.users); the JWT identities can reuse those users' ids/emails.

```sql
-- studio_recording_sharing_test.sql — run AFTER the migration; rolls back.
BEGIN;

-- Schema landed.
DO $$
BEGIN
  ASSERT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gw_media_library' AND column_name = 'source_media_id'),
    'gw_media_library.source_media_id missing';
  ASSERT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gw_course_assignments' AND column_name = 'media_id'),
    'gw_course_assignments.media_id missing';
  ASSERT to_regclass('public.gw_media_item_shares') IS NOT NULL,
    'gw_media_item_shares missing';
END $$;

-- RLS behavior with simulated users. Uses two real same-tenant users
-- (teacher = a course instructor, student = an enrollee of that course,
-- outsider = same-tenant user not in the course).
DO $$
DECLARE
  v_course   record;  -- id, tenant_id, instructor_id
  v_student  record;  -- user_id, email
  v_outsider record;  -- user_id, email
  v_orig     uuid; v_copy uuid;
  v_cnt int;
BEGIN
  SELECT c.id, c.tenant_id, c.instructor_id INTO v_course
  FROM gw_courses c
  JOIN gw_course_enrollments e ON e.course_id = c.id
  WHERE c.instructor_id IS NOT NULL AND c.tenant_id IS NOT NULL
  LIMIT 1;
  IF v_course IS NULL THEN RAISE NOTICE 'no instructed+enrolled course, skipping RLS sim'; RETURN; END IF;

  SELECT e.user_id, u.email INTO v_student
  FROM gw_course_enrollments e JOIN auth.users u ON u.id = e.user_id
  WHERE e.course_id = v_course.id AND e.user_id <> v_course.instructor_id
  LIMIT 1;

  SELECT m.user_id, u.email INTO v_outsider
  FROM gw_tenant_members m JOIN auth.users u ON u.id = m.user_id
  WHERE m.tenant_id = v_course.tenant_id
    AND m.user_id <> v_course.instructor_id
    AND NOT EXISTS (SELECT 1 FROM gw_course_enrollments e
                    WHERE e.course_id = v_course.id AND e.user_id = m.user_id)
  LIMIT 1;
  IF v_student IS NULL OR v_outsider IS NULL THEN
    RAISE NOTICE 'insufficient users for sim, skipping'; RETURN;
  END IF;

  -- Fixture: private Studio original + class copy, owned by the instructor.
  INSERT INTO gw_media_library (title, file_url, file_path, file_type, file_size,
    folder, category, is_public, is_featured, is_deleted, course_id, uploaded_by,
    download_count, view_count, tenant_id)
  VALUES ('rls-test-orig', 'https://x/orig.wav', 'media/t/orig.wav', 'audio/wav', 1,
    'Studio', 'studio', false, false, false, NULL, v_course.instructor_id, 0, 0, v_course.tenant_id)
  RETURNING id INTO v_orig;

  INSERT INTO gw_media_library (title, file_url, file_path, file_type, file_size,
    folder, category, is_public, is_featured, is_deleted, course_id, uploaded_by,
    download_count, view_count, tenant_id, source_media_id)
  VALUES ('rls-test-copy', 'https://x/orig.wav', 'media/t/orig.wav', 'audio/wav', 1,
    NULL, 'studio', false, false, false, v_course.id, v_course.instructor_id, 0, 0,
    v_course.tenant_id, v_orig)
  RETURNING id INTO v_copy;

  -- Item share of the ORIGINAL to the outsider's email.
  INSERT INTO gw_media_item_shares (media_id, owner_user_id, invited_email, tenant_id)
  VALUES (v_orig, v_course.instructor_id, v_outsider.email, v_course.tenant_id);

  -- Simulate the enrolled student.
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_student.user_id, 'role', 'authenticated',
                      'email', v_student.email, 'tenant_id', v_course.tenant_id)::text, true);
  SET LOCAL ROLE authenticated;

  SELECT count(*) INTO v_cnt FROM gw_media_library WHERE id = v_copy;
  ASSERT v_cnt = 1, 'enrolled student must see the class copy';
  SELECT count(*) INTO v_cnt FROM gw_media_library WHERE id = v_orig;
  ASSERT v_cnt = 0, 'student must NOT see the private original';

  -- Student cannot forge a course-tagged insert (write-side gate).
  BEGIN
    INSERT INTO gw_media_library (title, file_url, file_path, file_type, file_size,
      folder, category, is_public, is_featured, is_deleted, course_id, uploaded_by,
      download_count, view_count, tenant_id)
    VALUES ('forged', 'https://x/f.wav', 'media/t/f.wav', 'audio/wav', 1,
      NULL, 'general', false, false, false, v_course.id, v_student.user_id, 0, 0, v_course.tenant_id);
    RAISE EXCEPTION 'student insert with course_id must be rejected';
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN NULL;
  END;

  -- Simulate the outsider (same tenant, not enrolled): sees the shared
  -- original via the item share, but not the class copy.
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_outsider.user_id, 'role', 'authenticated',
                      'email', v_outsider.email, 'tenant_id', v_course.tenant_id)::text, true);

  SELECT count(*) INTO v_cnt FROM gw_media_library WHERE id = v_orig;
  ASSERT v_cnt = 1, 'item-share grantee must see the shared original';
  SELECT count(*) INTO v_cnt FROM gw_media_library WHERE id = v_copy;
  ASSERT v_cnt = 0, 'non-enrolled member must NOT see the class copy';

  -- Revocation kills access.
  RESET ROLE;
  UPDATE gw_media_item_shares SET revoked_at = now() WHERE media_id = v_orig;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_outsider.user_id, 'role', 'authenticated',
                      'email', v_outsider.email, 'tenant_id', v_course.tenant_id)::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_cnt FROM gw_media_library WHERE id = v_orig;
  ASSERT v_cnt = 0, 'revoked share must remove access';
  RESET ROLE;
END $$;

ROLLBACK;
```

- [ ] **Step 3: Syntax-check both files** — `psql` isn't available locally against this schema, so validate SQL syntax only: read both files back for balanced `$$` quoting and statement terminators; real execution happens at deploy (Task 9). If a local `psql` binary exists, `psql --set ON_ERROR_STOP=1 -f <file> --echo-errors` against a scratch DB is NOT possible (no schema) — skip; do not fake a pass.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260817300000_studio_recording_sharing.sql supabase/migrations/tests/studio_recording_sharing_test.sql
git commit -m "feat(media): sharing schema — item shares, class-copy link, assignment media, course write gate"
```

---

### Task 2: Share library (`src/lib/media/shareRecording.ts`) with unit tests

**Files:**
- Create: `src/lib/media/shareRecording.ts`
- Test: `src/lib/media/__tests__/shareRecording.test.ts`

**Interfaces:**
- Consumes: table/column names from Task 1.
- Produces (later tasks import these exact names):
  - `interface ShareableMedia { id: string; title: string; file_url: string; file_path: string; file_type: string; file_size: number; uploaded_by: string }`
  - `listenPath(id: string): string` → `/listen/<id>`
  - `ensureClassCopy(sb, media: ShareableMedia, courseId: string): Promise<{ id: string }>`
  - `createItemShares(sb, mediaId: string, ownerUserId: string, emails: string[]): Promise<void>`
  - `fetchCourseRecipients(sb, courseId: string): Promise<Array<{ user_id: string; full_name: string | null; email: string }>>`
  - `buildShareEmailHtml(o: { title: string; sharerName: string; message: string; url: string }): string`
  - `sendShareEmail(sb, o: { to: string[]; subject: string; html: string }): Promise<void>`
  - `notifyRecipients(sb, userIds: string[], o: { title: string; message: string; actionUrl: string }): Promise<void>`
  - `fetchManagedCourses(sb, userId: string, privileged: boolean): Promise<Array<{ id: string; course_code: string; title: string }>>`

First run `npm ci --legacy-peer-deps` in the worktree if `node_modules` is absent (see Global Constraints).

- [ ] **Step 1: Write the failing tests**

Use a chainable fake supabase. Full test file:

```ts
import { describe, it, expect, vi } from 'vitest';
import {
  ensureClassCopy, createItemShares, buildShareEmailHtml, listenPath,
  fetchCourseRecipients, notifyRecipients, fetchManagedCourses,
  type ShareableMedia,
} from '../shareRecording';

/** Chainable fake: every method returns the builder; awaiting resolves
 *  the queued results in call order. insert/upsert/select args recorded. */
function fakeSb(results: Array<{ data?: any; error?: any }>) {
  const calls: Array<{ table?: string; method: string; args: any[] }> = [];
  let i = 0;
  const builder: any = {};
  const record = (method: string) => (...args: any[]) => {
    calls.push({ method, args });
    return builder;
  };
  for (const m of ['select', 'insert', 'upsert', 'update', 'eq', 'is', 'in',
                   'not', 'order', 'limit', 'maybeSingle', 'single']) {
    builder[m] = record(m);
  }
  builder.then = (resolve: any, reject: any) => {
    const r = results[i++] ?? { data: null, error: null };
    return Promise.resolve({ data: r.data ?? null, error: r.error ?? null }).then(resolve, reject);
  };
  const sb: any = {
    from: (table: string) => { calls.push({ table, method: 'from', args: [] }); return builder; },
    rpc: vi.fn(async () => ({ data: 1, error: null })),
    functions: { invoke: vi.fn(async () => ({ data: { ok: true }, error: null })) },
  };
  return { sb, calls };
}

const MEDIA: ShareableMedia = {
  id: 'm1', title: 'Warm-up take', file_url: 'https://x/f.wav',
  file_path: 'media/u1/studio/f.wav', file_type: 'audio/wav',
  file_size: 123, uploaded_by: 'u1',
};

describe('listenPath', () => {
  it('builds the in-app route', () => {
    expect(listenPath('abc')).toBe('/listen/abc');
  });
});

describe('ensureClassCopy', () => {
  it('returns the existing copy without inserting', async () => {
    const { sb, calls } = fakeSb([{ data: [{ id: 'copy1' }] }]);
    const out = await ensureClassCopy(sb, MEDIA, 'c1');
    expect(out.id).toBe('copy1');
    expect(calls.some((c) => c.method === 'insert')).toBe(false);
  });

  it('inserts a class copy with course_id, folder null, source link', async () => {
    const { sb, calls } = fakeSb([{ data: [] }, { data: [{ id: 'copy2' }] }]);
    const out = await ensureClassCopy(sb, MEDIA, 'c1');
    expect(out.id).toBe('copy2');
    const ins = calls.find((c) => c.method === 'insert')!;
    expect(ins.args[0]).toMatchObject({
      course_id: 'c1', folder: null, source_media_id: 'm1',
      uploaded_by: 'u1', file_path: MEDIA.file_path, is_public: false,
    });
    // live-schema guard: no forbidden columns
    for (const bad of ['filename', 'original_filename', 'mime_type', 'bucket_name']) {
      expect(ins.args[0]).not.toHaveProperty(bad);
    }
  });

  it('treats an empty insert result as failure (demo-tenant trap)', async () => {
    const { sb } = fakeSb([{ data: [] }, { data: [] }]);
    await expect(ensureClassCopy(sb, MEDIA, 'c1')).rejects.toThrow(/could not/i);
  });
});

describe('createItemShares', () => {
  it('upserts one active share per email with conflict target', async () => {
    const { sb, calls } = fakeSb([{ data: [{ id: 's1' }, { id: 's2' }] }]);
    await createItemShares(sb, 'm1', 'u1', ['A@x.com', 'b@y.com']);
    const up = calls.find((c) => c.method === 'upsert')!;
    expect(up.args[0]).toEqual([
      { media_id: 'm1', owner_user_id: 'u1', invited_email: 'a@x.com', permission: 'view', revoked_at: null },
      { media_id: 'm1', owner_user_id: 'u1', invited_email: 'b@y.com', permission: 'view', revoked_at: null },
    ]);
    expect(up.args[1]).toMatchObject({ onConflict: 'media_id,invited_email' });
  });

  it('fails on empty upsert result (demo-tenant trap)', async () => {
    const { sb } = fakeSb([{ data: [] }]);
    await expect(createItemShares(sb, 'm1', 'u1', ['a@x.com'])).rejects.toThrow();
  });
});

describe('fetchCourseRecipients', () => {
  it('joins enrollments to the directory and drops empty emails', async () => {
    const { sb } = fakeSb([
      { data: [{ user_id: 'u2' }, { user_id: 'u3' }, { user_id: null }] },
      { data: [{ user_id: 'u2', full_name: 'Ana', email: 'ana@x.com' }] },
    ]);
    const out = await fetchCourseRecipients(sb, 'c1');
    expect(out).toEqual([{ user_id: 'u2', full_name: 'Ana', email: 'ana@x.com' }]);
  });

  it('returns [] for an empty roster without a directory query', async () => {
    const { sb, calls } = fakeSb([{ data: [] }]);
    expect(await fetchCourseRecipients(sb, 'c1')).toEqual([]);
    expect(calls.filter((c) => c.method === 'from' && c.table === 'gw_profiles_directory')).toHaveLength(0);
  });
});

describe('buildShareEmailHtml', () => {
  it('escapes user-controlled text and links the listen URL', () => {
    const html = buildShareEmailHtml({
      title: 'A <b>take</b>', sharerName: 'Kevin & co', message: '<script>x</script>',
      url: 'https://t.gleeworld.org/listen/m1',
    });
    expect(html).toContain('https://t.gleeworld.org/listen/m1');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;b&gt;take&lt;/b&gt;');
    expect(html).toContain('Kevin &amp; co');
  });
});

describe('notifyRecipients', () => {
  it('calls the RPC once per user and never throws on RPC error', async () => {
    const { sb } = fakeSb([]);
    (sb.rpc as any).mockResolvedValueOnce({ data: null, error: { message: 'boom' } });
    await notifyRecipients(sb, ['u2', 'u3'], { title: 't', message: 'm', actionUrl: '/listen/m1' });
    expect(sb.rpc).toHaveBeenCalledTimes(2);
    expect((sb.rpc as any).mock.calls[0][0]).toBe('create_notification_with_delivery');
    expect((sb.rpc as any).mock.calls[0][1]).toMatchObject({
      p_user_id: 'u2', p_action_url: '/listen/m1', p_send_email: false, p_send_sms: false,
    });
  });
});

describe('fetchManagedCourses', () => {
  it('filters by instructor for non-privileged users', async () => {
    const { sb, calls } = fakeSb([{ data: [{ id: 'c1', course_code: 'GW101', title: 'Choir' }] }]);
    const out = await fetchManagedCourses(sb, 'u1', false);
    expect(out).toHaveLength(1);
    expect(calls.some((c) => c.method === 'eq' && c.args[0] === 'instructor_id' && c.args[1] === 'u1')).toBe(true);
  });

  it('skips the instructor filter for admins', async () => {
    const { sb, calls } = fakeSb([{ data: [] }]);
    await fetchManagedCourses(sb, 'u1', true);
    expect(calls.some((c) => c.method === 'eq' && c.args[0] === 'instructor_id')).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL (module not found)**

Run: `npx vitest run src/lib/media`
Expected: FAIL — cannot resolve `../shareRecording`.

- [ ] **Step 3: Implement `src/lib/media/shareRecording.ts`**

```ts
// Share a Studio recording (a gw_media_library row the user owns) to a
// class, an assignment, or people by email. "Share = class copy": class
// visibility comes from a NEW row with course_id set and folder NULL,
// pointing at the SAME storage object; the private Studio-folder original
// is never mutated. Spec:
// docs/superpowers/specs/2026-08-17-studio-recording-sharing-design.md
import type { SupabaseClient } from '@supabase/supabase-js';

// Loosely typed on purpose: generated DB types don't know the new
// columns until the next types regen.
type Sb = Pick<SupabaseClient, 'from' | 'rpc' | 'functions'> | any;

export interface ShareableMedia {
  id: string;
  title: string;
  file_url: string;
  file_path: string;
  file_type: string;
  file_size: number;
  uploaded_by: string;
}

export const listenPath = (id: string) => `/listen/${id}`;

/** Find or create the class copy of a recording. Idempotent on
 *  (source_media_id, course_id) among non-deleted rows. */
export async function ensureClassCopy(
  sb: Sb, media: ShareableMedia, courseId: string,
): Promise<{ id: string }> {
  const { data: existing, error: exErr } = await sb
    .from('gw_media_library')
    .select('id')
    .eq('source_media_id', media.id)
    .eq('course_id', courseId)
    .eq('is_deleted', false)
    .limit(1);
  if (exErr) throw new Error(exErr.message);
  if (existing && existing.length > 0) return existing[0];

  // Column list MUST match the live schema (see plan Global Constraints).
  const { data, error } = await sb.from('gw_media_library').insert({
    title: media.title,
    file_url: media.file_url,
    file_path: media.file_path,
    file_type: media.file_type,
    file_size: media.file_size,
    folder: null,
    category: 'studio',
    is_public: false,
    is_featured: false,
    is_deleted: false,
    course_id: courseId,
    uploaded_by: media.uploaded_by,
    download_count: 0,
    view_count: 0,
    source_media_id: media.id,
  }).select('id');
  if (error) throw new Error(error.message);
  // Demo-tenant writes match 0 rows silently — empty result = failure.
  if (!data || data.length === 0) throw new Error('Share could not be saved (read-only workspace?).');
  return data[0];
}

/** Grant view access on one media row to a list of emails. Re-sharing a
 *  previously revoked email reactivates it (revoked_at cleared). */
export async function createItemShares(
  sb: Sb, mediaId: string, ownerUserId: string, emails: string[],
): Promise<void> {
  const rows = [...new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean))]
    .map((invited_email) => ({
      media_id: mediaId, owner_user_id: ownerUserId, invited_email,
      permission: 'view', revoked_at: null,
    }));
  if (rows.length === 0) return;
  const { data, error } = await sb
    .from('gw_media_item_shares')
    .upsert(rows, { onConflict: 'media_id,invited_email' })
    .select('id');
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error('Share could not be saved (read-only workspace?).');
}

export async function fetchCourseRecipients(
  sb: Sb, courseId: string,
): Promise<Array<{ user_id: string; full_name: string | null; email: string }>> {
  const { data: enr, error } = await sb
    .from('gw_course_enrollments').select('user_id').eq('course_id', courseId);
  if (error) throw new Error(error.message);
  const ids = [...new Set((enr ?? []).map((e: any) => e.user_id).filter(Boolean))];
  if (ids.length === 0) return [];
  const { data: profs, error: pErr } = await sb
    .from('gw_profiles_directory')
    .select('user_id, full_name, email')
    .in('user_id', ids)
    .not('email', 'is', null);
  if (pErr) throw new Error(pErr.message);
  return (profs ?? []).filter((p: any) => !!p.email);
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function buildShareEmailHtml(o: {
  title: string; sharerName: string; message: string; url: string;
}): string {
  const msg = o.message.trim()
    ? `<p style="margin:16px 0;color:#334155;font-size:15px;line-height:1.6">${esc(o.message)}</p>`
    : '';
  return `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px">
    <p style="color:#64748b;font-size:13px;margin:0 0 8px">${esc(o.sharerName)} shared a recording with you</p>
    <h2 style="color:#0f172a;font-size:20px;margin:0 0 4px">${esc(o.title)}</h2>
    ${msg}
    <p style="margin:24px 0">
      <a href="${o.url}" style="background:#0f172a;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;font-size:15px">Listen in GleeWorld</a>
    </p>
    <p style="color:#94a3b8;font-size:12px;line-height:1.5">You'll be asked to sign in. This link is for members of your organization.</p>
  </div>`;
}

/** Send via the existing gw-send-email edge fn. Multi-recipient sends are
 *  BCC-chunked server-side (recipients never see each other). Throws on
 *  invoke error so the dialog can report it. */
export async function sendShareEmail(
  sb: Sb, o: { to: string[]; subject: string; html: string },
): Promise<void> {
  const { data, error } = await sb.functions.invoke('gw-send-email', {
    body: { to: o.to, subject: o.subject, html: o.html },
  });
  if (error) throw new Error(error.message ?? 'Email send failed');
  if (data && data.error) throw new Error(String(data.error));
}

/** Best-effort in-app notifications; RPC errors are logged, never thrown
 *  (email is the primary channel — a bell failure must not fail the share). */
export async function notifyRecipients(
  sb: Sb, userIds: string[], o: { title: string; message: string; actionUrl: string },
): Promise<void> {
  for (const uid of [...new Set(userIds)].filter(Boolean)) {
    const { error } = await sb.rpc('create_notification_with_delivery', {
      p_user_id: uid,
      p_title: o.title,
      p_message: o.message,
      p_type: 'info',
      p_category: 'general',
      p_action_url: o.actionUrl,
      p_action_label: 'Listen',
      p_metadata: {},
      p_priority: 0,
      p_expires_at: null,
      p_send_email: false,
      p_send_sms: false,
    });
    if (error) console.error('[shareRecording] notification failed', uid, error);
  }
}

/** Courses the user can share into: admins → all active real courses,
 *  others → courses they instruct. Mirrors user_can_manage_course (DB). */
export async function fetchManagedCourses(
  sb: Sb, userId: string, privileged: boolean,
): Promise<Array<{ id: string; course_code: string; title: string }>> {
  let q = sb.from('gw_courses')
    .select('id, course_code, title')
    .eq('is_active', true)
    .eq('is_template', false)
    .order('course_code');
  if (!privileged) q = q.eq('instructor_id', userId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data ?? [];
}
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `npx vitest run src/lib/media`
Expected: all tests pass. If the fake-builder chaining fights any implementation detail, fix the TEST harness only if the implementation matches the documented supabase-js API; never contort the implementation to satisfy the fake.

- [ ] **Step 5: Commit**

```bash
git add src/lib/media/shareRecording.ts src/lib/media/__tests__/shareRecording.test.ts
git commit -m "feat(media): share-recording core library (class copy, item shares, email, notifications)"
```

---

### Task 3: `useManagedCourses` hook + `ShareRecordingDialog`

**Files:**
- Create: `src/hooks/useManagedCourses.ts`
- Create: `src/components/media/ShareRecordingDialog.tsx`

**Interfaces:**
- Consumes: everything exported from `src/lib/media/shareRecording.ts` (Task 2), `CreateAssignmentDialog` new props (Task 4 — see below; implement Task 4 before wiring the assignment tab if executing out of order, otherwise pass through and let Task 4 land the props).
- Produces:
  - `useManagedCourses(): { data: Array<{id: string; course_code: string; title: string}> | undefined, isLoading: boolean }` (TanStack useQuery result)
  - `<ShareRecordingDialog media={ShareableMedia | null} onOpenChange={(open: boolean) => void} />` — open when `media !== null`. Later tasks mount it from MediaLibraryPage and StudioEditor.

- [ ] **Step 1: Write the hook**

```ts
// useManagedCourses — courses the signed-in user may share into
// (admin: all active real courses; otherwise: courses they instruct).
// Client-side twin of the DB-side user_can_manage_course() gate.
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from './useUserRole';
import { fetchManagedCourses } from '@/lib/media/shareRecording';

export function useManagedCourses() {
  const { user } = useAuth();
  const { isAdmin, isSuperAdmin } = useUserRole();
  const privileged = isAdmin() || isSuperAdmin();
  return useQuery({
    queryKey: ['managed-courses', user?.id, privileged],
    enabled: !!user?.id,
    queryFn: () => fetchManagedCourses(supabase, user!.id, privileged),
  });
}
```

- [ ] **Step 2: Write the dialog**

Three sections via a segmented control (follow the button-pill idiom used by RegionExportSheet's Destination picker, not shadcn Tabs — matches Studio styling and MediaLibraryPage chips). Full component:

```tsx
// ShareRecordingDialog — share one owned audio recording to (a) a class
// media library, (b) a standard assignment, (c) people by email.
// Teacher/admin-gated: renders nothing useful without managed courses or
// admin role; callers also hide their Share affordances (defense in
// depth — RLS enforces regardless).
import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useManagedCourses } from '@/hooks/useManagedCourses';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2, Share2, Users, ClipboardList, Mail } from 'lucide-react';
import { toast } from 'sonner';
import {
  ensureClassCopy, createItemShares, fetchCourseRecipients, buildShareEmailHtml,
  sendShareEmail, notifyRecipients, listenPath, type ShareableMedia,
} from '@/lib/media/shareRecording';
import { CreateAssignmentDialog } from '@/components/grading/instructor/CreateAssignmentDialog';

type ShareTab = 'class' | 'assignment' | 'email';

export function ShareRecordingDialog({
  media, onOpenChange,
}: {
  media: ShareableMedia | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { user } = useAuth();
  const open = media !== null;
  const { data: courses = [], isLoading: coursesLoading } = useManagedCourses();
  const [tab, setTab] = useState<ShareTab>('class');
  const [courseId, setCourseId] = useState<string>('');
  const [notifyClass, setNotifyClass] = useState(true);
  const [message, setMessage] = useState('');
  const [emailMode, setEmailMode] = useState<'class' | 'people'>('class');
  const [manualEmails, setManualEmails] = useState('');
  // Assignment flow: the class copy id once created; opens the creator.
  const [assignmentCopy, setAssignmentCopy] = useState<{ courseId: string; mediaId: string } | null>(null);

  const sharerName = (user?.user_metadata as any)?.full_name || user?.email || 'Your director';
  const absoluteListenUrl = (id: string) => `${window.location.origin}${listenPath(id)}`;

  const reset = () => {
    setTab('class'); setCourseId(''); setNotifyClass(true); setMessage('');
    setEmailMode('class'); setManualEmails(''); setAssignmentCopy(null);
  };

  const shareToClass = useMutation({
    mutationFn: async () => {
      if (!media || !courseId) throw new Error('Pick a class first.');
      const copy = await ensureClassCopy(supabase, media, courseId);
      if (notifyClass) {
        const recipients = await fetchCourseRecipients(supabase, courseId);
        if (recipients.length > 0) {
          await sendShareEmail(supabase, {
            to: recipients.map((r) => r.email),
            subject: `New recording: ${media.title}`,
            html: buildShareEmailHtml({
              title: media.title, sharerName, message,
              url: absoluteListenUrl(copy.id),
            }),
          });
          await notifyRecipients(supabase, recipients.map((r) => r.user_id), {
            title: 'New recording shared',
            message: `${sharerName} shared "${media.title}" with your class.`,
            actionUrl: listenPath(copy.id),
          });
        }
      }
      return copy;
    },
    onSuccess: () => {
      toast.success(notifyClass ? 'Shared with the class and notified everyone.' : 'Added to the class library.');
      reset(); onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.message || 'Share failed.'),
  });

  const startAssignment = useMutation({
    mutationFn: async () => {
      if (!media || !courseId) throw new Error('Pick a class first.');
      const copy = await ensureClassCopy(supabase, media, courseId);
      return { courseId, mediaId: copy.id };
    },
    onSuccess: (v) => setAssignmentCopy(v),
    onError: (e: any) => toast.error(e?.message || 'Could not prepare the assignment.'),
  });

  const sendEmails = useMutation({
    mutationFn: async () => {
      if (!media) throw new Error('Nothing to share.');
      if (emailMode === 'class') {
        if (!courseId) throw new Error('Pick a class first.');
        // Class email always shares via the class copy so every enrolled
        // student passes RLS on the listen page.
        const copy = await ensureClassCopy(supabase, media, courseId);
        const recipients = await fetchCourseRecipients(supabase, courseId);
        if (recipients.length === 0) throw new Error('That class has no members with email addresses.');
        await sendShareEmail(supabase, {
          to: recipients.map((r) => r.email),
          subject: `${sharerName} shared a recording: ${media.title}`,
          html: buildShareEmailHtml({
            title: media.title, sharerName, message, url: absoluteListenUrl(copy.id),
          }),
        });
        await notifyRecipients(supabase, recipients.map((r) => r.user_id), {
          title: 'Recording shared with you',
          message: `${sharerName} shared "${media.title}".`,
          actionUrl: listenPath(copy.id),
        });
        return recipients.length;
      }
      // People mode: item shares on the ORIGINAL row, then email.
      const emails = manualEmails.split(/[\s,;]+/).map((e) => e.trim()).filter(Boolean);
      const invalid = emails.filter((e) => !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e));
      if (emails.length === 0) throw new Error('Enter at least one email.');
      if (invalid.length > 0) throw new Error(`Not a valid email: ${invalid[0]}`);
      await createItemShares(supabase, media.id, media.uploaded_by, emails);
      await sendShareEmail(supabase, {
        to: emails,
        subject: `${sharerName} shared a recording: ${media.title}`,
        html: buildShareEmailHtml({
          title: media.title, sharerName, message, url: absoluteListenUrl(media.id),
        }),
      });
      // Bell notifications for recipients who have accounts here.
      const { data: known } = await supabase
        .from('gw_profiles_directory')
        .select('user_id, email')
        .in('email', emails.map((e) => e.toLowerCase()));
      await notifyRecipients(supabase, (known ?? []).map((k: any) => k.user_id), {
        title: 'Recording shared with you',
        message: `${sharerName} shared "${media.title}".`,
        actionUrl: listenPath(media.id),
      });
      return emails.length;
    },
    onSuccess: (n) => {
      toast.success(`Sent to ${n} recipient${n === 1 ? '' : 's'}.`);
      reset(); onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.message || 'Email failed.'),
  });

  // Existing per-item shares (people mode) — listed with revoke, mirroring
  // ShareFolderDialog. Spec requires shares to be revocable.
  const { data: itemShares = [], refetch: refetchShares } = useQuery<Array<{ id: string; invited_email: string }>>({
    queryKey: ['media-item-shares', media?.id],
    enabled: open && tab === 'email' && emailMode === 'people' && !!media?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_media_item_shares')
        .select('id, invited_email')
        .eq('media_id', media!.id)
        .is('revoked_at', null)
        .order('created_at', { ascending: false });
      return (data ?? []) as any;
    },
  });

  const revokeShare = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('gw_media_item_shares')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', id)
        .select('id');
      if (error) throw new Error(error.message);
      if (!data || data.length === 0) throw new Error('Could not revoke (read-only workspace?).');
    },
    onSuccess: () => { toast.success('Access revoked.'); refetchShares(); },
    onError: (e: any) => toast.error(e?.message || 'Could not revoke.'),
  });

  const busy = shareToClass.isPending || startAssignment.isPending || sendEmails.isPending;
  const canShare = courses.length > 0;

  const TABS: Array<{ key: ShareTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { key: 'class', label: 'Class library', icon: Users },
    { key: 'assignment', label: 'Assignment', icon: ClipboardList },
    { key: 'email', label: 'Email', icon: Mail },
  ];

  const coursePicker = (
    <div>
      <Label className="text-sm">Class</Label>
      <Select value={courseId} onValueChange={setCourseId}>
        <SelectTrigger><SelectValue placeholder="Pick a class…" /></SelectTrigger>
        <SelectContent>
          {courses.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.title?.trim() || c.course_code}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <>
      <Dialog open={open && !assignmentCopy} onOpenChange={(v) => { if (!busy) { if (!v) reset(); onOpenChange(v); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="inline-flex items-center gap-2">
              <Share2 className="w-4 h-4" /> Share "{media?.title ?? ''}"
            </DialogTitle>
            <DialogDescription>
              Your original stays in your own Studio folder — sharing never moves it.
            </DialogDescription>
          </DialogHeader>

          {coursesLoading ? (
            <div className="py-8 text-center"><Loader2 className="w-5 h-5 animate-spin inline text-muted-foreground" /></div>
          ) : !canShare ? (
            <p className="text-sm text-muted-foreground py-4">
              Sharing is available to instructors and admins. You don't manage any classes yet.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="flex gap-1.5">
                {TABS.map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setTab(t.key)}
                      className={tab === t.key
                        ? 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-semibold bg-primary/10 text-primary'
                        : 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:bg-muted transition-colors'}
                    >
                      <Icon className="w-4 h-4" /> {t.label}
                    </button>
                  );
                })}
              </div>

              {tab === 'class' && (
                <div className="space-y-3">
                  {coursePicker}
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={notifyClass} onCheckedChange={(v) => setNotifyClass(v === true)} />
                    Notify the class by email
                  </label>
                  {notifyClass && (
                    <div>
                      <Label className="text-sm">Message (optional)</Label>
                      <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3}
                        placeholder="Listen before Thursday's rehearsal…" />
                    </div>
                  )}
                  <Button className="w-full" disabled={!courseId || busy} onClick={() => shareToClass.mutate()}>
                    {shareToClass.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Users className="w-4 h-4 mr-2" />}
                    Add to class library
                  </Button>
                </div>
              )}

              {tab === 'assignment' && (
                <div className="space-y-3">
                  {coursePicker}
                  <p className="text-xs text-muted-foreground">
                    The recording is added to the class library and attached to a new
                    assignment — you'll set the title, points, and due date next.
                  </p>
                  <Button className="w-full" disabled={!courseId || busy} onClick={() => startAssignment.mutate()}>
                    {startAssignment.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ClipboardList className="w-4 h-4 mr-2" />}
                    Create assignment…
                  </Button>
                </div>
              )}

              {tab === 'email' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-1.5">
                    <button type="button" onClick={() => setEmailMode('class')}
                      className={`h-10 rounded border text-sm font-semibold ${emailMode === 'class' ? 'bg-primary/15 border-primary/50 text-primary' : 'border-border bg-background text-muted-foreground'}`}
                    >Whole class</button>
                    <button type="button" onClick={() => setEmailMode('people')}
                      className={`h-10 rounded border text-sm font-semibold ${emailMode === 'people' ? 'bg-primary/15 border-primary/50 text-primary' : 'border-border bg-background text-muted-foreground'}`}
                    >Specific people</button>
                  </div>
                  {emailMode === 'class' ? coursePicker : (
                    <div>
                      <Label className="text-sm">Email addresses</Label>
                      <Input value={manualEmails} onChange={(e) => setManualEmails(e.target.value)}
                        placeholder="ana@school.edu, ben@school.edu" />
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Recipients must have a GleeWorld account in your organization to listen.
                      </p>
                      {itemShares.length > 0 && (
                        <div className="space-y-1.5 max-h-40 overflow-y-auto mt-2">
                          <p className="text-xs text-muted-foreground font-semibold">Already shared with</p>
                          {itemShares.map((s) => (
                            <div key={s.id} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded border border-border text-sm">
                              <span className="truncate">{s.invited_email}</span>
                              <button
                                type="button"
                                onClick={() => revokeShare.mutate(s.id)}
                                className="text-xs text-rose-500 hover:underline shrink-0"
                              >Revoke</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <div>
                    <Label className="text-sm">Message (optional)</Label>
                    <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} />
                  </div>
                  <Button className="w-full" disabled={busy || (emailMode === 'class' ? !courseId : !manualEmails.trim())}
                    onClick={() => sendEmails.mutate()}>
                    {sendEmails.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
                    Send email
                  </Button>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }} disabled={busy}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {assignmentCopy && (
        <CreateAssignmentDialog
          courseId={assignmentCopy.courseId}
          mediaId={assignmentCopy.mediaId}
          defaultTitle={media?.title}
          open
          onOpenChange={(v) => {
            if (!v) { setAssignmentCopy(null); reset(); onOpenChange(false); }
          }}
        />
      )}
    </>
  );
}
```

- [ ] **Step 3: Typecheck the two new files compile in context**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "shareRecording|ShareRecordingDialog|useManagedCourses" || echo CLEAN`
Expected: `CLEAN` — pre-existing errors elsewhere in the repo are out of scope; only lines mentioning these files matter. (`mediaId`/`defaultTitle` on CreateAssignmentDialog will error until Task 4 — acceptable ONLY if Task 4 runs next; otherwise do Task 4 first.)

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useManagedCourses.ts src/components/media/ShareRecordingDialog.tsx
git commit -m "feat(media): ShareRecordingDialog + useManagedCourses (class/assignment/email share flows)"
```

---

### Task 4: CreateAssignmentDialog — media attachment + live-schema insert fix

**Files:**
- Modify: `src/components/grading/instructor/CreateAssignmentDialog.tsx`

**Interfaces:**
- Produces: new optional props `mediaId?: string; defaultTitle?: string` on `CreateAssignmentDialogProps`. Existing consumer (`src/components/grading/instructor/InstructorCourseView.tsx`) passes neither — must keep compiling unchanged.

**Context — pre-existing bug being fixed here:** the current mutation spreads the whole form (`...data`) into the insert, sending `due_at`, `is_active`, `category`, and free-text `rubric` — none of which exist on live `gw_course_assignments` (see Global Constraints). PostgREST rejects inserts with unknown columns, so this dialog cannot successfully create assignments today. The fix (explicit column list, matching the proven insert in `src/components/course/CourseAssignmentManager.tsx:159`) is required for the share flow and repairs the existing consumer.

- [ ] **Step 1: Update props and insert**

In `CreateAssignmentDialogProps` add:

```ts
interface CreateAssignmentDialogProps {
  courseId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Attach a Media Library recording (a class-copy row) to the new assignment. */
  mediaId?: string;
  /** Pre-fill the title (e.g. the shared recording's name). */
  defaultTitle?: string;
}
```

Component signature gains `mediaId, defaultTitle`; `useForm` defaults become:

```ts
defaultValues: {
  title: defaultTitle ?? '',
  assignment_type: 'other',
  is_active: true,
}
```

Replace the mutationFn's insert (currently `insert({ course_id, created_by, is_published, due_date, ...data })`) with an explicit live-column list:

```ts
const { data: inserted, error } = await supabase.from('gw_course_assignments').insert({
  course_id: courseId,
  created_by: user.id,
  title: data.title,
  description: data.description || null,
  instructions: data.instructions || null,
  assignment_type: data.assignment_type,
  points: data.points,
  due_date: data.due_at || null,
  is_published: data.is_active,
  media_id: mediaId ?? null,
} as never).select('id');
if (error) throw error;
// Demo-tenant writes match 0 rows silently — treat empty as failure.
if (!inserted || inserted.length === 0) throw new Error('Assignment was not saved (read-only workspace?)');
```

Remove the now-unpersisted `category` Input and `rubric` Textarea form fields (they were silently discarded — worse, they broke the whole insert; deleting them is the honest UI). Keep `AssignmentFormData` fields `category`/`rubric` removed too.

When `mediaId` is set, show a small confirmation row above the form (after `<DialogHeader>`):

```tsx
{mediaId && (
  <p className="text-xs rounded-md bg-primary/5 text-primary px-3 py-2">
    A recording is attached — students will see a player on this assignment.
  </p>
)}
```

- [ ] **Step 2: Verify the untouched consumer still compiles**

Run: `npx tsc --noEmit 2>&1 | grep -E "InstructorCourseView|CreateAssignmentDialog" || echo CLEAN`
Expected: `CLEAN`.

- [ ] **Step 3: Run the full unit suite (regression)**

Run: `npx vitest run`
Expected: PASS (same pass/fail set as before this task — no new failures).

- [ ] **Step 4: Commit**

```bash
git add src/components/grading/instructor/CreateAssignmentDialog.tsx
git commit -m "feat(academy): assignment media attachment + fix insert to live gw_course_assignments columns"
```

---

### Task 5: Student-side player in CourseAssignments

**Files:**
- Modify: `src/components/academy/CourseAssignments.tsx`

**Interfaces:**
- Consumes: `gw_course_assignments.media_id` (Task 1). The fetch already uses `select('*')`, so `media_id` arrives without query changes.

- [ ] **Step 1: Fetch attached media after assignments load**

In `fetchAssignments` (src/components/academy/CourseAssignments.tsx:87), after `allAssignments` is built and before the submissions block, resolve media rows in ONE query:

```ts
// Attached recordings (assignments created from a Studio share carry
// media_id → a class-copy gw_media_library row every enrollee can read).
const mediaIds = (courseData || []).map((a: any) => a.media_id).filter(Boolean);
let mediaById: Record<string, { id: string; title: string; file_url: string }> = {};
if (mediaIds.length > 0) {
  const { data: mediaRows } = await supabase
    .from('gw_media_library')
    .select('id, title, file_url')
    .in('id', mediaIds)
    .eq('is_deleted', false);
  mediaById = Object.fromEntries((mediaRows ?? []).map((m: any) => [m.id, m]));
}
```

Attach onto each assignment when mapping `courseData`: change the existing
`...(courseData || []).map(a => ({ ...a, source: 'course' as const }))` to

```ts
...(courseData || []).map(a => ({
  ...a,
  source: 'course' as const,
  attachedMedia: (a as any).media_id ? mediaById[(a as any).media_id] ?? null : null,
})),
```

Add to the local `Assignment` interface (top of file): `attachedMedia?: { id: string; title: string; file_url: string } | null;`

- [ ] **Step 2: Render the player**

In the assignment card JSX, directly after the `{assignment.description && (...)}` block (around src/components/academy/CourseAssignments.tsx:295-299), add:

```tsx
{assignment.attachedMedia && (
  <audio
    controls
    preload="none"
    src={assignment.attachedMedia.file_url}
    className="w-full max-w-sm mt-2"
    aria-label={`Recording: ${assignment.attachedMedia.title}`}
  />
)}
```

`preload="none"` matters: the assignments list can hold many rows; don't fetch audio until the student presses play.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep CourseAssignments || echo CLEAN`
Expected: `CLEAN`.

- [ ] **Step 4: Commit**

```bash
git add src/components/academy/CourseAssignments.tsx
git commit -m "feat(academy): render attached recording player on assignments"
```

---

### Task 6: Listen page + route

**Files:**
- Create: `src/pages/ListenPage.tsx`
- Modify: `src/App.tsx` (one lazy import + one Route)

**Interfaces:**
- Consumes: `listenPath` semantics from Task 2 (`/listen/:id`); RLS decides row visibility.
- Produces: route `/listen/:id` used by emails and notifications.

- [ ] **Step 1: Write the page**

```tsx
// /listen/:id — sign-in-gated landing page for shared recordings (email
// links and bell notifications point here). Access = whatever RLS lets
// the signed-in caller SELECT: owner, class member (course_id copy),
// item-share grantee, or admin. A row we can't see renders the friendly
// no-access state — never a crash, never a distinction between "missing"
// and "not yours" (don't leak existence).
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Music, Loader2, Lock } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { UniversalLayout } from '@/components/layout/UniversalLayout';

interface ListenRow {
  id: string; title: string; file_url: string; file_type: string;
  created_at: string; uploaded_by: string;
}

export default function ListenPage() {
  const { id } = useParams<{ id: string }>();

  const { data: row, isLoading } = useQuery<ListenRow | null>({
    queryKey: ['listen', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_media_library')
        .select('id, title, file_url, file_type, created_at, uploaded_by')
        .eq('id', id!)
        .eq('is_deleted', false)
        .maybeSingle();
      if (error) throw error;
      return (data as ListenRow) ?? null;
    },
  });

  const { data: sharer } = useQuery<string | null>({
    queryKey: ['listen-sharer', row?.uploaded_by],
    enabled: !!row?.uploaded_by,
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_profiles_directory')
        .select('full_name')
        .eq('user_id', row!.uploaded_by)
        .maybeSingle();
      return (data as any)?.full_name ?? null;
    },
  });

  return (
    <UniversalLayout>
      <div className="max-w-lg mx-auto px-4 py-12">
        {isLoading ? (
          <div className="text-center py-16">
            <Loader2 className="w-6 h-6 animate-spin inline text-muted-foreground" />
          </div>
        ) : !row ? (
          <Card>
            <CardContent className="p-10 text-center">
              <Lock className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-base font-semibold">This recording isn't available.</p>
              <p className="text-sm text-muted-foreground mt-1">
                It may have been removed, or it hasn't been shared with your account.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-8 flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <Music className="w-8 h-8" />
              </div>
              <div className="text-center">
                <h1 className="text-lg font-semibold">{row.title || 'Untitled recording'}</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {sharer ? `Shared by ${sharer}` : 'Shared with you'}
                  {row.created_at ? ` · ${format(parseISO(row.created_at), 'MMM d, yyyy')}` : ''}
                </p>
              </div>
              {row.file_type?.startsWith('audio/') ? (
                <audio controls src={row.file_url} className="w-full" aria-label={row.title} />
              ) : row.file_type?.startsWith('video/') ? (
                <video controls src={row.file_url} className="w-full rounded-lg bg-black" />
              ) : (
                <p className="text-sm text-muted-foreground">Preview isn't available for this file type.</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </UniversalLayout>
  );
}
```

- [ ] **Step 2: Register the route**

In `src/App.tsx`: add with the other page lazy imports (near line 54):

```ts
const ListenPage = lazy(() => import("./pages/ListenPage"));
```

Add the route alongside the other `ProtectedRoute`-wrapped routes (the block starting ~line 608 — match surrounding formatting exactly):

```tsx
<Route path="/listen/:id" element={
  <ProtectedRoute>
    <ListenPage />
  </ProtectedRoute>
} />
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep -E "ListenPage|App.tsx" || echo CLEAN`
Expected: `CLEAN`.

- [ ] **Step 4: Commit**

```bash
git add src/pages/ListenPage.tsx src/App.tsx
git commit -m "feat(media): /listen/:id sign-in-gated shared-recording page"
```

---

### Task 7: Media Library entry point

**Files:**
- Modify: `src/pages/dashboard/MediaLibraryPage.tsx`

**Interfaces:**
- Consumes: `ShareRecordingDialog`, `useManagedCourses`, `ShareableMedia` (Tasks 2-3).

- [ ] **Step 1: Widen the row query and type**

`MediaRow` (src/pages/dashboard/MediaLibraryPage.tsx:42) gains `uploaded_by: string;` and the list query select (line 90) becomes:

```ts
.select('id, title, file_url, file_path, file_type, file_size, course_id, created_at, folder, uploaded_by')
```

- [ ] **Step 2: Add Share state + gating + dialog mount**

In `MediaLibraryPage()`:

```ts
const { data: managedCourses = [] } = useManagedCourses();
const canShareRecordings = managedCourses.length > 0;
const [shareMedia, setShareMedia] = useState<MediaRow | null>(null);
```

(imports: `import { ShareRecordingDialog } from '@/components/media/ShareRecordingDialog';` and `import { useManagedCourses } from '@/hooks/useManagedCourses';`)

Mount next to the existing `<ShareFolderDialog …/>` (line 299):

```tsx
<ShareRecordingDialog
  media={shareMedia}
  onOpenChange={(v) => { if (!v) setShareMedia(null); }}
/>
```

Pass a new optional `onShare` to `MediaCard`:

```tsx
onShare={
  canShareRecordings && r.uploaded_by === user?.id && kindOf(r.file_type) === 'audio'
    ? () => setShareMedia(r)
    : undefined
}
```

- [ ] **Step 3: Render the Share action in MediaCard**

`MediaCard` props gain `onShare?: () => void`. In the non-editing action row (next to the Rename button, src/pages/dashboard/MediaLibraryPage.tsx:483), add before Rename:

```tsx
{onShare && (
  <Button
    variant="ghost"
    size="sm"
    onClick={(e) => { e.stopPropagation(); onShare(); }}
    title="Share recording"
  >
    <Share2 className="w-4 h-4 text-muted-foreground" />
  </Button>
)}
```

(`Share2` is already imported in this file.)

- [ ] **Step 4: Typecheck + unit suite**

Run: `npx tsc --noEmit 2>&1 | grep MediaLibraryPage || echo CLEAN` then `npx vitest run`
Expected: CLEAN; suite unchanged.

- [ ] **Step 5: Commit**

```bash
git add src/pages/dashboard/MediaLibraryPage.tsx
git commit -m "feat(media): Share action on owned audio in Media Library"
```

---

### Task 8: Studio entry points (shared save util + Share follow-up + full-session library destination)

**Files:**
- Create: `src/lib/media/studioLibrarySave.ts`
- Test: `src/lib/media/__tests__/studioLibrarySave.test.ts`
- Modify: `src/pages/studio/StudioEditor.tsx` (three surgical regions: clip export ~887, RegionExportSheet ~4650, ExportSheet ~4832; plus dialog mount)

**Interfaces:**
- Consumes: `ShareRecordingDialog`, `ShareableMedia` (Tasks 2-3).
- Produces: `saveStudioBlobToLibrary(sb, userId: string, o: { filename: string; blob: Blob; contentType: 'audio/wav' | 'audio/mpeg' }): Promise<ShareableMedia>`

- [ ] **Step 1: Write the failing util test**

```ts
import { describe, it, expect } from 'vitest';
import { saveStudioBlobToLibrary } from '../studioLibrarySave';

function fakeSb(uploadError: any, insertResult: { data?: any; error?: any }) {
  const inserted: any[] = [];
  const builder: any = {
    insert: (row: any) => { inserted.push(row); return builder; },
    select: () => builder,
    then: (res: any, rej: any) =>
      Promise.resolve({ data: insertResult.data ?? null, error: insertResult.error ?? null }).then(res, rej),
  };
  return {
    inserted,
    storage: {
      from: () => ({
        upload: async () => ({ error: uploadError }),
        getPublicUrl: (p: string) => ({ data: { publicUrl: `https://cdn/${p}` } }),
      }),
    },
    from: () => builder,
  } as any;
}

describe('saveStudioBlobToLibrary', () => {
  const blob = new Blob([new Uint8Array(4)], { type: 'audio/wav' });

  it('uploads under media/<uid>/studio/ and returns a ShareableMedia', async () => {
    const sb = fakeSb(null, { data: [{ id: 'row1' }] });
    const out = await saveStudioBlobToLibrary(sb, 'u1', {
      filename: 'take.wav', blob, contentType: 'audio/wav',
    });
    expect(out.id).toBe('row1');
    expect(out.uploaded_by).toBe('u1');
    expect(out.file_path).toMatch(/^media\/u1\/studio\/\d+-take\.wav$/);
    expect(out.title).toBe('take');
    const row = sb.inserted[0];
    expect(row).toMatchObject({ folder: 'Studio', category: 'studio', course_id: null, is_public: false });
    for (const bad of ['filename', 'original_filename', 'mime_type', 'bucket_name']) {
      expect(row).not.toHaveProperty(bad);
    }
  });

  it('fails loudly when the insert matches zero rows (demo trap)', async () => {
    const sb = fakeSb(null, { data: [] });
    await expect(saveStudioBlobToLibrary(sb, 'u1', {
      filename: 'take.wav', blob, contentType: 'audio/wav',
    })).rejects.toThrow(/not saved|read-only/i);
  });

  it('surfaces upload errors', async () => {
    const sb = fakeSb({ message: 'quota' }, { data: [{ id: 'x' }] });
    await expect(saveStudioBlobToLibrary(sb, 'u1', {
      filename: 'take.wav', blob, contentType: 'audio/wav',
    })).rejects.toThrow(/quota/);
  });
});
```

Run: `npx vitest run src/lib/media` — expect FAIL (module not found).

- [ ] **Step 2: Implement the util**

```ts
// One canonical "save a Studio bounce to the Media Library" path,
// replacing the two hand-copied versions in StudioEditor (sendToLibrary
// WAV + saveClipMp3ToLibrary MP3). Bucket media-library, path
// media/<uid>/studio/<ts>-<name>, row folder='Studio' (private to the
// owner under the foldered-privacy RLS). Column list MUST match the live
// gw_media_library schema — see the plan's Global Constraints.
import type { ShareableMedia } from './shareRecording';

export async function saveStudioBlobToLibrary(
  sb: any,
  userId: string,
  o: { filename: string; blob: Blob; contentType: 'audio/wav' | 'audio/mpeg' },
): Promise<ShareableMedia> {
  const path = `media/${userId}/studio/${Date.now()}-${o.filename}`;
  const { error: upErr } = await sb.storage
    .from('media-library')
    .upload(path, o.blob, { contentType: o.contentType, upsert: true });
  if (upErr) throw new Error(`Upload failed: ${upErr.message}`);
  const fileUrl = sb.storage.from('media-library').getPublicUrl(path).data.publicUrl;
  const title = o.filename.replace(/\.(wav|mp3)$/i, '');
  const { data, error } = await sb.from('gw_media_library').insert({
    title,
    file_url: fileUrl,
    file_path: path,
    file_type: o.contentType,
    file_size: o.blob.size,
    folder: 'Studio',
    category: 'studio',
    is_public: false,
    is_featured: false,
    is_deleted: false,
    course_id: null,
    uploaded_by: userId,
    download_count: 0,
    view_count: 0,
  } as never).select('id');
  if (error) throw new Error(`Library save failed: ${error.message}`);
  if (!data || data.length === 0) throw new Error('Library save failed — row not saved (read-only workspace?).');
  return {
    id: data[0].id, title, file_url: fileUrl, file_path: path,
    file_type: o.contentType, file_size: o.blob.size, uploaded_by: userId,
  };
}
```

Run: `npx vitest run src/lib/media` — expect PASS. Commit:

```bash
git add src/lib/media/studioLibrarySave.ts src/lib/media/__tests__/studioLibrarySave.test.ts
git commit -m "refactor(studio): canonical save-to-library util with demo-safe insert"
```

- [ ] **Step 3: Swap StudioEditor's two copies onto the util + add Share follow-up**

In `src/pages/studio/StudioEditor.tsx`:

1. Top-level imports: `import { saveStudioBlobToLibrary } from '@/lib/media/studioLibrarySave';`, `import { ShareRecordingDialog } from '@/components/media/ShareRecordingDialog';`, `import type { ShareableMedia } from '@/lib/media/shareRecording';`
2. In the main editor component (near the `clipExportPrompt` state, ~line 871) add shared state, and mount the dialog next to the other sheets/dialogs at the bottom of the editor's JSX:

```ts
const [shareMedia, setShareMedia] = useState<ShareableMedia | null>(null);
```

```tsx
<ShareRecordingDialog media={shareMedia} onOpenChange={(v) => { if (!v) setShareMedia(null); }} />
```

3. Replace the body of `saveClipMp3ToLibrary` (~line 887) with a call that keeps the toast + adds a Share follow-up action:

```ts
const saveClipMp3ToLibrary = async (filename: string, blob: Blob) => {
  if (!authUser?.id) throw new Error('Not signed in.');
  const saved = await saveStudioBlobToLibrary(supabase, authUser.id, {
    filename, blob, contentType: 'audio/mpeg',
  });
  return saved;
};
```

and in `deliverClipMp3` change the library branch to:

```ts
if (dest === 'library') {
  const saved = await saveClipMp3ToLibrary(filename, blob);
  toast.success(`Saved to Media Library (Studio): ${filename}`, {
    action: { label: 'Share…', onClick: () => setShareMedia(saved) },
  });
  return;
}
```

4. `RegionExportSheet` is a separate function component — it can't reach the editor's `setShareMedia`. Give it a prop: add `onShareSaved?: (m: ShareableMedia) => void` to its props, pass `onShareSaved={setShareMedia}` at its call site, replace its local `sendToLibrary` (~4650) with:

```ts
const sendToLibrary = async (blob: Blob, filename: string) => {
  if (!user?.id) throw new Error('Not signed in.');
  return saveStudioBlobToLibrary(supabase, user.id, {
    filename, blob, contentType: 'audio/wav',
  });
};
```

and in `run()`'s library branch (~4706):

```ts
if (dest === 'library') {
  const saved: ShareableMedia[] = [];
  for (const f of files) saved.push(await sendToLibrary(f.blob, f.name));
  toast.success(`Saved ${files.length} file${files.length === 1 ? '' : 's'} to your Media Library (Studio).`, {
    action: saved.length === 1 && onShareSaved
      ? { label: 'Share…', onClick: () => onShareSaved(saved[0]) }
      : undefined,
  });
}
```

(Multi-file sends get no one-click share — sharing is per-recording; the user shares from the Media Library instead. Delete the stale "(Send-to-Media-Library lands in a follow-up phase.)" line from the RegionExportSheet doc comment while there.)

- [ ] **Step 4: Full-session ExportSheet gains the library destination**

`ExportSheet` (~4832): add props `user` is not in scope there — it takes `session/open/onOpenChange/engineState`. Add `onShareSaved?: (m: ShareableMedia) => void` prop and use `useAuth()` inside (already imported in the file's module scope). Add state `const [dest, setDest] = useState<'download' | 'library'>('download');` and in `runExport`, replace the unconditional download loop with:

```ts
if (dest === 'library') {
  if (!user?.id) throw new Error('Not signed in.');
  const saved: ShareableMedia[] = [];
  for (const { filename, blob } of files) {
    saved.push(await saveStudioBlobToLibrary(supabase, user.id, {
      filename, blob,
      contentType: /\.mp3$/i.test(filename) ? 'audio/mpeg' : 'audio/wav',
    }));
  }
  toast.success(
    files.length > 1 ? `Saved ${files.length} stems to your Media Library (Studio).` : 'Saved to your Media Library (Studio).',
    { action: saved.length === 1 && onShareSaved ? { label: 'Share…', onClick: () => onShareSaved(saved[0]) } : undefined },
  );
} else {
  /* existing download loop, unchanged */
}
```

Add the destination toggle to its JSX between the preset picker and the export button, copying RegionExportSheet's Destination block verbatim (two pill buttons, Download / Media Library). Pass `onShareSaved={setShareMedia}` at the ExportSheet call site.

- [ ] **Step 5: Typecheck + unit suite + build**

Run: `npx tsc --noEmit 2>&1 | grep -E "StudioEditor|studioLibrarySave" || echo CLEAN` then `npx vitest run` then `bun x vite build` (or `npx vite build`).
Expected: CLEAN, suite green, build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/pages/studio/StudioEditor.tsx
git commit -m "feat(studio): share follow-up on library sends + full-session export to Media Library"
```

---

### Task 9: Spec sync, rebase, PR, deploy + QA

**Files:**
- Modify: `docs/superpowers/specs/2026-08-17-studio-recording-sharing-design.md` (one line)

- [ ] **Step 1: Amend the spec's email-sender line** — it names `send-branded-email`; implementation uses `gw-send-email` because that fn already BCC-chunks multi-recipient sends (recipients can't see each other's addresses) while `send-branded-email` puts the whole batch in `To:`. Update the spec sentence and commit:

```bash
git add docs/superpowers/specs/2026-08-17-studio-recording-sharing-design.md
git commit -m "docs: spec sync — email via gw-send-email (BCC-chunked), not send-branded-email"
```

- [ ] **Step 2: Rebase onto latest origin/main** (main moves fast; #728 merged mid-build):

```bash
git fetch origin main && git rebase origin/main
npx vitest run && npx tsc --noEmit 2>&1 | grep -E "media|Listen|StudioEditor|CourseAssignments|CreateAssignmentDialog" || echo CLEAN
```

Resolve conflicts favoring main's structure; re-run the suite after any resolution.

- [ ] **Step 3: Push + PR**

```bash
git push -u origin feat/studio-recording-sharing
gh pr create --title "Studio recording sharing: class library, assignments, email" --body "$(cat <<'EOF'
Teachers share Studio recordings in-app: to a class media library, attached to a standard assignment (player renders for students), or by email to a whole class / individuals (BCC-chunked via gw-send-email + bell notifications + sign-in-gated /listen/:id page). The owner's private Studio-folder copy and device download are untouched.

DB: gw_media_item_shares (mirrors folder shares), gw_media_library.source_media_id, gw_course_assignments.media_id, write-side RESTRICTIVE course gate on media rows (closes a pre-existing gap), + rolled-back RLS assert test.

Also fixes CreateAssignmentDialog inserting non-existent columns (every insert 400'd).

Spec: docs/superpowers/specs/2026-08-17-studio-recording-sharing-design.md
Plan: docs/superpowers/plans/2026-08-17-studio-recording-sharing.md

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 4: Request code review** (superpowers:requesting-code-review) before merge; fix findings.

- [ ] **Step 5: Deploy — migration FIRST, then frontend.** RLS DDL applies are classifier-gated for autonomous runs: surface the commands and get Kevin's go-ahead if blocked.

1. Migration + test on the droplet (per [[project_pr380_migrations]]: self-hosted DB has NO schema_migrations; DDL runs as `supabase_admin`):

```bash
scp supabase/migrations/20260817300000_studio_recording_sharing.sql supabase/migrations/tests/studio_recording_sharing_test.sql root@198.211.113.144:/tmp/
ssh root@198.211.113.144 'docker exec -i $(docker ps --format "{{.Names}}" | grep -m1 supabase.*db) psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1 -f /tmp/20260817300000_studio_recording_sharing.sql'
ssh root@198.211.113.144 'docker exec -i $(docker ps --format "{{.Names}}" | grep -m1 supabase.*db) psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1 -f /tmp/studio_recording_sharing_test.sql'
```

Expected: migration applies clean; test prints NOTICEs/passes and ends with ROLLBACK. (Verify the container name with `docker ps` first if the grep misses.)

2. Frontend (after PR merge to main, from a fresh worktree at origin/main): `scripts/deploy-frontend.sh` ONLY (never raw rsync `--delete`; `tenants/` + `superadmin/` excludes are load-bearing). Verify `CACHE_VERSION` in the live bundle equals the main tip.

- [ ] **Step 6: Live QA on the demo tenant** (real clicks, per the spec's QA list):
1. Studio → region export → Media Library → toast "Share…" → class library → student account sees it in the class scope + `/listen/:id` plays.
2. Share → Assignment → creator prefilled → student sees the assignment with a working player.
3. Email to an individual (a test address on an account in the tenant) → email arrives, link signs in and plays; then Revoke in the dialog's "Already shared with" list → the recipient's `/listen/:id` shows the no-access state.
4. Negative: a non-teacher account sees no Share buttons; a student's crafted insert with `course_id` fails (only if easily testable via console; the DB assert test already covers it).
