# Google-event Sharing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a signed-in user publish an event from their private Google Calendar mirror onto a shared in-house GleeWorld calendar. The published copy stays linked so future Google edits propagate; deleting the Google event (or un-sharing) removes it.

**Architecture:** Reuse the existing `gw_events` table + its `external_source` / `external_id` columns. Add one nullable `origin_user_id` column so we can gate un-share to the user who published. Two new edge functions handle share/unshare via RLS-scoped user JWT writes. `google-sync` gains two propagation steps: mirror updates to linked `gw_events` rows and delete linked rows whose Google source vanished. Client adds a picker component + two dropdown items in `EventPeekPopover`.

**Tech Stack:** Deno edge functions on self-hosted Supabase, Postgres RLS, TypeScript/React 18 + Vite front-end, Vitest, TanStack Query.

## Global Constraints

- **Working directory:** `/tmp/gleeworld-share-98772` (isolated worktree on branch `feat/google-event-sharing`). Absolute paths in every subagent dispatch.
- **Multi-tenant safety:** every server-side read/write must respect existing RLS. Where the edge function needs the service-role client, it must manually re-impose `origin_user_id = user.id` and `tenant_id = <resolved>` in the WHERE clause.
- **Migration convention:** timestamp AFTER `20260727020000_google_connections_cross_tenant.sql`. Use `20260727030000_gw_events_origin_user_id.sql`.
- **Tenant-neutral copy** in any user-visible strings.
- **Light theme + shadcn tokens** for new UI.
- **No new dependencies** — reuse React Query, Radix Dialog, lucide-react icons already in the tree.
- **Existing test infrastructure**: `canvas` arm64 binary is already installed in this worktree's `node_modules` (per `npm install canvas --no-save`).
- **`gw_events` client select** already uses `select('*')` so new columns flow through automatically.

## File Structure

**New files:**
- `supabase/migrations/20260727030000_gw_events_origin_user_id.sql` — the `origin_user_id` column + partial unique index.
- `supabase/functions/google-event-share/index.ts` — share edge function.
- `supabase/functions/google-event-share/__tests__/share.test.ts` — unit tests for share.
- `supabase/functions/google-event-unshare/index.ts` — unshare edge function.
- `supabase/functions/google-event-unshare/__tests__/unshare.test.ts` — unit tests for unshare.
- `supabase/functions/google-sync/__tests__/propagate.test.ts` — unit tests for the new propagation code paths (mock-supabase, no live Google).
- `src/hooks/useEventSharing.ts` — client hooks for share, unshare, tenant-calendars-list.
- `src/components/calendar/command-center/PublishToCalendarPicker.tsx` — modal picker component.
- `src/components/calendar/command-center/PublishToCalendarPicker.test.tsx` — component test.

**Modified files:**
- `supabase/functions/google-sync/index.ts` — add update + delete propagation after the existing per-calendar upserts.
- `src/components/calendar/command-center/EventPeekPopover.tsx` — add "Publish to calendar…" (for Google events) and "Unshare" (for own shared events) menu items.
- `src/utils/googleCalendarEvents.ts` — add small helper `isSharedFromGoogle(event, currentUserId)` for the Unshare-gate check.

**Types:**
- No shared TS type file needed; the two edge functions and their clients share simple shapes described inline in each task.

---

## Task 1: Migration — `origin_user_id` column + republish idempotency index

**Files:**
- Create: `supabase/migrations/20260727030000_gw_events_origin_user_id.sql`

**Interfaces:**
- Produces: `gw_events.origin_user_id uuid REFERENCES auth.users(id)` (nullable) and a partial unique index `gw_events_google_origin_uniq` on `(tenant_id, external_id, origin_user_id) WHERE external_source = 'google_calendar'`.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260727030000_gw_events_origin_user_id.sql`:

```sql
-- gw_events.origin_user_id — the user who published this event. Non-null
-- ONLY for rows created via google-event-share (external_source =
-- 'google_calendar'). Used by google-event-unshare to gate deletion and
-- by google-sync to know whose Google response to compare against.
--
-- Partial unique index enforces republish idempotency: the same user
-- re-sharing the same Google event to any calendar in the same tenant
-- lands on the same row instead of duplicating.

ALTER TABLE public.gw_events
  ADD COLUMN IF NOT EXISTS origin_user_id uuid REFERENCES auth.users(id);

CREATE UNIQUE INDEX IF NOT EXISTS gw_events_google_origin_uniq
  ON public.gw_events (tenant_id, external_id, origin_user_id)
  WHERE external_source = 'google_calendar';
```

- [ ] **Step 2: Kevin applies to prod DB**

Kevin runs from his Terminal (no leading `!`):

```bash
psql "$SUPABASE_DB_URL" -f supabase/migrations/20260727030000_gw_events_origin_user_id.sql
```

Or the controller pipes via droplet-docker after explicit user OK (matches recent working pattern).

Expected: `ALTER TABLE` + `CREATE INDEX`, no errors.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260727030000_gw_events_origin_user_id.sql
git commit -m "gw_events: origin_user_id + partial unique index for google shares"
```

---

## Task 2: `google-event-share` edge function

**Files:**
- Create: `supabase/functions/google-event-share/index.ts`
- Create: `supabase/functions/google-event-share/__tests__/share.test.ts`

**Interfaces:**
- Consumes: caller's JWT + `origin_user_id` column from Task 1.
- Produces: HTTP POST endpoint `/functions/v1/google-event-share` accepting `{ google_event_id: string, calendar_id: string }` and returning `{ ok: true, shared_event_id: string }` or `{ error: 'source_not_found' | 'calendar_not_found' | 'unauthorized' | 'save_failed', detail?: string }`.

- [ ] **Step 1: Write the failing test**

Create `supabase/functions/google-event-share/__tests__/share.test.ts`. This test targets a pure `runShare()` helper we'll export from the module so it stays testable without Deno's `serve`.

```ts
import { describe, it, expect, vi } from 'vitest';
import { runShare } from '../runShare';

function stubSupabase(opts: {
  googleRow?: any;
  calendarRow?: any;
  upsertResult?: { data: any; error: any };
}) {
  const from = (table: string) => {
    if (table === 'gw_google_events') {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: opts.googleRow ?? null, error: null }),
            }),
          }),
        }),
      };
    }
    if (table === 'gw_calendars') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: opts.calendarRow ?? null, error: null }),
          }),
        }),
      };
    }
    if (table === 'gw_events') {
      return {
        upsert: () => ({
          select: () => ({
            single: async () => opts.upsertResult ?? { data: null, error: { message: 'no stub' } },
          }),
        }),
      };
    }
    return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) };
  };
  return { from } as any;
}

describe('runShare', () => {
  const uid = 'user-1';
  const src = {
    tenant_id: 'tenant-a',
    title: 'Rehearsal',
    description: 'weekly rehearsal',
    location: 'Sisters Chapel',
    start_at: '2026-08-01T18:00:00Z',
    end_at: '2026-08-01T20:00:00Z',
    all_day: false,
  };

  it('happy path: creates gw_events row with fields copied from source', async () => {
    const supabase = stubSupabase({
      googleRow: src,
      calendarRow: { id: 'cal-1' },
      upsertResult: { data: { id: 'ev-1' }, error: null },
    });
    const res = await runShare({ user_id: uid, google_event_id: 'g-1', calendar_id: 'cal-1', supabase });
    expect(res).toEqual({ ok: true, shared_event_id: 'ev-1' });
  });

  it('returns source_not_found when the Google event does not exist for the caller', async () => {
    const supabase = stubSupabase({ googleRow: null, calendarRow: { id: 'cal-1' } });
    const res = await runShare({ user_id: uid, google_event_id: 'nope', calendar_id: 'cal-1', supabase });
    expect(res).toEqual({ error: 'source_not_found' });
  });

  it('returns calendar_not_found when the target calendar is not in the caller tenant', async () => {
    const supabase = stubSupabase({ googleRow: src, calendarRow: null });
    const res = await runShare({ user_id: uid, google_event_id: 'g-1', calendar_id: 'nope', supabase });
    expect(res).toEqual({ error: 'calendar_not_found' });
  });

  it('returns save_failed with detail when upsert errors', async () => {
    const supabase = stubSupabase({
      googleRow: src,
      calendarRow: { id: 'cal-1' },
      upsertResult: { data: null, error: { message: 'unique violation' } },
    });
    const res = await runShare({ user_id: uid, google_event_id: 'g-1', calendar_id: 'cal-1', supabase });
    expect(res).toMatchObject({ error: 'save_failed' });
  });
});
```

- [ ] **Step 2: Run to verify FAIL**

```bash
cd /tmp/gleeworld-share-98772 && npx vitest run supabase/functions/google-event-share/__tests__/share.test.ts
```

Expected: file-not-found on `../runShare`.

- [ ] **Step 3: Create the runShare helper**

Create `supabase/functions/google-event-share/runShare.ts`:

```ts
export interface RunShareInput {
  user_id: string;
  google_event_id: string;
  calendar_id: string;
  supabase: any; // Supabase-JS client instance (JWT-scoped)
}

export type RunShareResult =
  | { ok: true; shared_event_id: string }
  | { error: 'source_not_found' | 'calendar_not_found' | 'save_failed'; detail?: string };

export async function runShare(input: RunShareInput): Promise<RunShareResult> {
  const { user_id, google_event_id, calendar_id, supabase } = input;

  // 1. Read the source Google event via the caller's JWT — RLS scopes to
  //    the caller's own row + current tenant, so a bad google_event_id
  //    (or a cross-tenant probe) yields null.
  const { data: src } = await supabase
    .from('gw_google_events')
    .select('tenant_id, title, description, location, start_at, end_at, all_day')
    .eq('user_id', user_id)
    .eq('google_event_id', google_event_id)
    .maybeSingle();
  if (!src) return { error: 'source_not_found' };

  // 2. Verify the target calendar is in the caller's current tenant.
  const { data: cal } = await supabase
    .from('gw_calendars')
    .select('id')
    .eq('id', calendar_id)
    .maybeSingle();
  if (!cal) return { error: 'calendar_not_found' };

  // 3. Upsert with the partial-unique-index conflict target. Re-sharing
  //    the same Google event lands on the same row.
  const { data, error } = await supabase
    .from('gw_events')
    .upsert(
      {
        tenant_id:       src.tenant_id,
        title:           src.title ?? '(untitled)',
        description:     src.description,
        location:        src.location,
        start_date:      src.start_at,
        end_date:        src.end_at,
        calendar_id,
        external_source: 'google_calendar',
        external_id:     google_event_id,
        origin_user_id:  user_id,
        created_by:      user_id,
        event_type:      'personal_google',
        is_public:       true,
        is_private:      false,
        status:          'scheduled',
      },
      { onConflict: 'tenant_id,external_id,origin_user_id' },
    )
    .select('id')
    .single();

  if (error || !data) return { error: 'save_failed', detail: error?.message ?? 'no row returned' };
  return { ok: true, shared_event_id: data.id };
}
```

- [ ] **Step 4: Create the edge fn handler**

Create `supabase/functions/google-event-share/index.ts`:

```ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { runShare } from './runShare.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  const jwt = authHeader.replace('Bearer ', '');
  if (!jwt) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // The user client runs under the caller's JWT so RLS scopes every
  // read + write. Same pattern as the other assistant tools.
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } },
  );

  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  );
  const { data: { user } } = await admin.auth.getUser(jwt);
  if (!user) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: { google_event_id?: string; calendar_id?: string };
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: 'bad_request' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const google_event_id = String(body.google_event_id ?? '').trim();
  const calendar_id     = String(body.calendar_id ?? '').trim();
  if (!google_event_id || !calendar_id) {
    return new Response(JSON.stringify({ error: 'bad_request' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const result = await runShare({ user_id: user.id, google_event_id, calendar_id, supabase });
  const status = 'ok' in result ? 200 : (result.error === 'save_failed' ? 500 : 404);
  return new Response(JSON.stringify(result), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
```

- [ ] **Step 5: Run tests to verify PASS**

```bash
cd /tmp/gleeworld-share-98772 && npx vitest run supabase/functions/google-event-share/__tests__/share.test.ts
```

Expected: 4 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/google-event-share/
git commit -m "google-event-share: RLS-scoped edge fn to publish a Google event"
```

---

## Task 3: `google-event-unshare` edge function

**Files:**
- Create: `supabase/functions/google-event-unshare/index.ts`
- Create: `supabase/functions/google-event-unshare/runUnshare.ts`
- Create: `supabase/functions/google-event-unshare/__tests__/unshare.test.ts`

**Interfaces:**
- Consumes: caller's JWT + `origin_user_id` from Task 1.
- Produces: HTTP POST `/functions/v1/google-event-unshare` accepting `{ shared_event_id: string }` and returning `{ ok: true, deleted: number }` or `{ error: 'bad_request' | 'unauthorized' }`.

- [ ] **Step 1: Write the failing test**

Create `supabase/functions/google-event-unshare/__tests__/unshare.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { runUnshare } from '../runUnshare';

function stubSupabaseDelete(result: { data: any[] | null; error: any }) {
  const chain: any = {
    delete: () => chain,
    eq: () => chain,
    select: () => Promise.resolve(result),
  };
  return { from: () => chain } as any;
}

describe('runUnshare', () => {
  it('happy path: deletes the caller\'s own shared event', async () => {
    const supabase = stubSupabaseDelete({ data: [{ id: 'ev-1' }], error: null });
    const res = await runUnshare({ user_id: 'user-1', shared_event_id: 'ev-1', supabase });
    expect(res).toEqual({ ok: true, deleted: 1 });
  });

  it('reports 0 deleted when the caller is not the origin_user_id (no error, no leak)', async () => {
    const supabase = stubSupabaseDelete({ data: [], error: null });
    const res = await runUnshare({ user_id: 'other', shared_event_id: 'ev-1', supabase });
    expect(res).toEqual({ ok: true, deleted: 0 });
  });

  it('propagates DB errors as save_failed', async () => {
    const supabase = stubSupabaseDelete({ data: null, error: { message: 'perm denied' } });
    const res = await runUnshare({ user_id: 'user-1', shared_event_id: 'ev-1', supabase });
    expect(res).toMatchObject({ error: 'save_failed' });
  });
});
```

- [ ] **Step 2: Run to verify FAIL**

```bash
cd /tmp/gleeworld-share-98772 && npx vitest run supabase/functions/google-event-unshare/__tests__/unshare.test.ts
```

Expected: file-not-found.

- [ ] **Step 3: Create the runUnshare helper**

Create `supabase/functions/google-event-unshare/runUnshare.ts`:

```ts
export interface RunUnshareInput {
  user_id: string;
  shared_event_id: string;
  supabase: any;
}

export type RunUnshareResult =
  | { ok: true; deleted: number }
  | { error: 'save_failed'; detail?: string };

export async function runUnshare(input: RunUnshareInput): Promise<RunUnshareResult> {
  const { user_id, shared_event_id, supabase } = input;
  // Filter on origin_user_id so a member can't un-share someone else's
  // published event. Filter on external_source so an accidental id
  // collision with a native gw_events row can't wipe it out.
  const { data, error } = await supabase
    .from('gw_events')
    .delete()
    .eq('id', shared_event_id)
    .eq('origin_user_id', user_id)
    .eq('external_source', 'google_calendar')
    .select('id');
  if (error) return { error: 'save_failed', detail: error.message };
  return { ok: true, deleted: (data ?? []).length };
}
```

- [ ] **Step 4: Create the edge fn handler**

Create `supabase/functions/google-event-unshare/index.ts`:

```ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { runUnshare } from './runUnshare.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  const jwt = authHeader.replace('Bearer ', '');
  if (!jwt) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } },
  );
  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  );
  const { data: { user } } = await admin.auth.getUser(jwt);
  if (!user) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: { shared_event_id?: string };
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: 'bad_request' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const shared_event_id = String(body.shared_event_id ?? '').trim();
  if (!shared_event_id) {
    return new Response(JSON.stringify({ error: 'bad_request' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const result = await runUnshare({ user_id: user.id, shared_event_id, supabase });
  const status = 'ok' in result ? 200 : 500;
  return new Response(JSON.stringify(result), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
```

- [ ] **Step 5: Run tests to verify PASS**

```bash
cd /tmp/gleeworld-share-98772 && npx vitest run supabase/functions/google-event-unshare/__tests__/unshare.test.ts
```

Expected: 3 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/google-event-unshare/
git commit -m "google-event-unshare: RLS-scoped edge fn to remove a published copy"
```

---

## Task 4: `google-sync` update + delete propagation

Add two new steps AFTER the existing per-calendar Google-event upsert loop and BEFORE the outer `last_synced_at` update in `supabase/functions/google-sync/index.ts`.

**Files:**
- Modify: `supabase/functions/google-sync/index.ts`
- Create: `supabase/functions/google-sync/propagate.ts` — extract the propagation logic so it's testable without a real HTTP request.
- Create: `supabase/functions/google-sync/__tests__/propagate.test.ts`

**Interfaces:**
- Consumes: the service-role `admin` client already constructed in `google-sync/index.ts`.
- Produces: two functions `propagateUpdates(admin, user_id, tenant_id, googleEvents)` (updates linked gw_events fields) and `propagateDeletes(admin, user_id, tenant_id, seenEventIds, syncWindow)` (deletes linked gw_events rows whose google_event_id is not in `seenEventIds` and whose start_date falls inside `syncWindow`).

- [ ] **Step 1: Write the failing tests**

Create `supabase/functions/google-sync/__tests__/propagate.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { propagateUpdates, propagateDeletes } from '../propagate';

function stubAdmin() {
  const calls: Array<{ table: string; op: string; body?: any; filters: any[] }> = [];
  const mkChain = (table: string, op: string, body?: any) => {
    const filters: any[] = [];
    const chain: any = {
      eq: (col: string, val: any) => { filters.push({ eq: [col, val] }); return chain; },
      gte: (col: string, val: any) => { filters.push({ gte: [col, val] }); return chain; },
      lte: (col: string, val: any) => { filters.push({ lte: [col, val] }); return chain; },
      not: (col: string, op2: string, val: any) => { filters.push({ not: [col, op2, val] }); return chain; },
      then: (resolve: (v: any) => void) => { calls.push({ table, op, body, filters }); resolve({ data: [], error: null }); },
    };
    return chain;
  };
  const admin: any = {
    from: (table: string) => ({
      update: (body: any) => mkChain(table, 'update', body),
      delete: () => mkChain(table, 'delete'),
    }),
  };
  return { admin, calls };
}

describe('propagateUpdates', () => {
  it('issues one UPDATE per Google event with mirrored fields', async () => {
    const { admin, calls } = stubAdmin();
    await propagateUpdates(admin, 'user-1', 'tenant-a', [
      { google_event_id: 'g1', title: 'A', description: 'x', location: 'L', start_at: '2026-08-01T00:00:00Z', end_at: '2026-08-01T01:00:00Z', all_day: false },
      { google_event_id: 'g2', title: 'B', description: null, location: null, start_at: '2026-08-02T00:00:00Z', end_at: '2026-08-02T01:00:00Z', all_day: true },
    ]);
    const updates = calls.filter(c => c.op === 'update');
    expect(updates.length).toBe(2);
    expect(updates[0].body).toMatchObject({ title: 'A', location: 'L', start_date: '2026-08-01T00:00:00Z' });
    expect(updates[0].filters).toEqual(expect.arrayContaining([
      { eq: ['origin_user_id', 'user-1'] },
      { eq: ['tenant_id', 'tenant-a'] },
      { eq: ['external_source', 'google_calendar'] },
      { eq: ['external_id', 'g1'] },
    ]));
  });
});

describe('propagateDeletes', () => {
  it('deletes gw_events rows whose external_id is NOT in the seen list, inside window', async () => {
    const { admin, calls } = stubAdmin();
    await propagateDeletes(admin, 'user-1', 'tenant-a', ['g1', 'g2'], {
      start: '2026-07-01T00:00:00Z',
      end:   '2026-10-01T00:00:00Z',
    });
    const del = calls.find(c => c.op === 'delete');
    expect(del).toBeDefined();
    expect(del!.filters).toEqual(expect.arrayContaining([
      { eq: ['origin_user_id', 'user-1'] },
      { eq: ['tenant_id', 'tenant-a'] },
      { eq: ['external_source', 'google_calendar'] },
      { gte: ['start_date', '2026-07-01T00:00:00Z'] },
      { lte: ['start_date', '2026-10-01T00:00:00Z'] },
    ]));
    // The "not in" filter should be present.
    expect(del!.filters.some((f: any) => f.not && f.not[0] === 'external_id')).toBe(true);
  });

  it('with an empty seen list, still runs the delete (removes everything in-window)', async () => {
    const { admin, calls } = stubAdmin();
    await propagateDeletes(admin, 'user-1', 'tenant-a', [], {
      start: '2026-07-01T00:00:00Z', end: '2026-10-01T00:00:00Z',
    });
    expect(calls.find(c => c.op === 'delete')).toBeDefined();
  });
});
```

- [ ] **Step 2: Run to verify FAIL**

```bash
cd /tmp/gleeworld-share-98772 && npx vitest run supabase/functions/google-sync/__tests__/propagate.test.ts
```

Expected: file-not-found.

- [ ] **Step 3: Create `propagate.ts`**

```ts
export interface PropagatedGoogleEvent {
  google_event_id: string;
  title: string | null;
  description: string | null;
  location: string | null;
  start_at: string | null;
  end_at: string | null;
  all_day: boolean;
}

export async function propagateUpdates(
  admin: any,
  user_id: string,
  tenant_id: string,
  events: PropagatedGoogleEvent[],
): Promise<void> {
  for (const ev of events) {
    await admin
      .from('gw_events')
      .update({
        title:        ev.title ?? '(untitled)',
        description:  ev.description,
        location:     ev.location,
        start_date:   ev.start_at,
        end_date:     ev.end_at,
        updated_at:   new Date().toISOString(),
      })
      .eq('origin_user_id', user_id)
      .eq('tenant_id', tenant_id)
      .eq('external_source', 'google_calendar')
      .eq('external_id', ev.google_event_id);
  }
}

export async function propagateDeletes(
  admin: any,
  user_id: string,
  tenant_id: string,
  seenExternalIds: string[],
  window: { start: string; end: string },
): Promise<void> {
  // If nothing was seen, the "not in ()" filter is invalid — construct
  // a placeholder that still matches (i.e. non-empty list) to keep the
  // filter well-formed while causing every candidate row to fail the
  // "in" test. A single sentinel like '__none__' works because Google
  // event ids never contain '__'.
  const idList = seenExternalIds.length ? seenExternalIds : ['__none__'];
  await admin
    .from('gw_events')
    .delete()
    .eq('origin_user_id', user_id)
    .eq('tenant_id', tenant_id)
    .eq('external_source', 'google_calendar')
    .gte('start_date', window.start)
    .lte('start_date', window.end)
    .not('external_id', 'in', `(${idList.map(id => `"${id}"`).join(',')})`);
}
```

- [ ] **Step 4: Wire propagation into `google-sync/index.ts`**

Two edits inside `supabase/functions/google-sync/index.ts`:

Add the import near the top with the other imports:

```ts
import { propagateUpdates, propagateDeletes, type PropagatedGoogleEvent } from './propagate.ts';
```

Collect seen events across all calendars — add before the per-calendar loop:

```ts
const seenForPropagation: PropagatedGoogleEvent[] = [];
```

Inside the per-calendar loop, RIGHT BEFORE `if (rows.length) {`, append normalized events:

```ts
for (const r of rows) {
  seenForPropagation.push({
    google_event_id: r.google_event_id!,
    title:           r.title,
    description:     r.description,
    location:        r.location,
    start_at:        r.start_at,
    end_at:          r.end_at,
    all_day:         r.all_day,
  });
}
```

After the existing "Sweep events whose source calendar is no longer enabled…" block (near the end of the function, before the final `last_synced_at` update), add:

```ts
// Propagate to any gw_events rows the caller has published via
// google-event-share. Updates happen first so the row reflects the
// latest Google state; deletes then wipe rows whose Google source
// vanished from THIS sync's response.
await propagateUpdates(admin, user.id, conn.tenant_id, seenForPropagation);
await propagateDeletes(
  admin,
  user.id,
  conn.tenant_id,
  seenForPropagation.map(e => e.google_event_id),
  { start: timeMin, end: timeMax },
);
```

- [ ] **Step 5: Run tests to verify PASS**

```bash
cd /tmp/gleeworld-share-98772 && npx vitest run supabase/functions/google-sync/__tests__/propagate.test.ts
```

Expected: 3 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/google-sync/
git commit -m "google-sync: propagate update+delete to shared gw_events copies"
```

---

## Task 5: Client hooks — share, unshare, tenant-calendars list

**Files:**
- Create: `src/hooks/useEventSharing.ts`

**Interfaces:**
- Consumes: `supabase` client, `useQueryClient` from TanStack.
- Produces:
  - `useTenantCalendars()` returns `{ data: Array<{ id: string; name: string; color: string | null; is_default: boolean }> | undefined; isLoading }`.
  - `useShareGoogleEvent()` returns `{ mutateAsync: (input: { google_event_id: string; calendar_id: string }) => Promise<{ shared_event_id: string }>; isPending }`.
  - `useUnshareGoogleEvent()` returns `{ mutateAsync: (input: { shared_event_id: string }) => Promise<{ deleted: number }>; isPending }`.

- [ ] **Step 1: Write the hook file**

```ts
// Client hooks for publishing a Google event onto a shared GleeWorld
// calendar and un-publishing it later. Backed by two edge functions
// (google-event-share, google-event-unshare) that scope every write to
// the caller's JWT.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const CAL_KEY = ['tenant-calendars'];
const EVENTS_KEYS = [['events'], ['google-events']];

export interface TenantCalendar {
  id: string;
  name: string;
  color: string | null;
  is_default: boolean;
}

export function useTenantCalendars() {
  return useQuery<TenantCalendar[]>({
    queryKey: CAL_KEY,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_calendars')
        .select('id, name, color, is_default')
        .order('is_default', { ascending: false })
        .order('name', { ascending: true });
      if (error) throw error;
      return (data as TenantCalendar[]) || [];
    },
  });
}

export function useShareGoogleEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { google_event_id: string; calendar_id: string }) => {
      const { data, error } = await supabase.functions.invoke('google-event-share', { body: input });
      if (error) throw error;
      const body = data as { ok?: boolean; shared_event_id?: string; error?: string };
      if (body?.error) throw new Error(body.error);
      if (!body?.shared_event_id) throw new Error('no_shared_id');
      return { shared_event_id: body.shared_event_id };
    },
    onSuccess: () => {
      EVENTS_KEYS.forEach(k => qc.invalidateQueries({ queryKey: k }));
    },
  });
}

export function useUnshareGoogleEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { shared_event_id: string }) => {
      const { data, error } = await supabase.functions.invoke('google-event-unshare', { body: input });
      if (error) throw error;
      const body = data as { ok?: boolean; deleted?: number; error?: string };
      if (body?.error) throw new Error(body.error);
      return { deleted: body?.deleted ?? 0 };
    },
    onSuccess: () => {
      EVENTS_KEYS.forEach(k => qc.invalidateQueries({ queryKey: k }));
    },
  });
}
```

- [ ] **Step 2: Type-check the new hook**

```bash
cd /tmp/gleeworld-share-98772 && npx tsc --noEmit 2>&1 | grep useEventSharing | head
```

Expected: no output (no errors).

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useEventSharing.ts
git commit -m "hooks: useTenantCalendars + share/unshare mutations"
```

---

## Task 6: `PublishToCalendarPicker` modal component

**Files:**
- Create: `src/components/calendar/command-center/PublishToCalendarPicker.tsx`
- Create: `src/components/calendar/command-center/PublishToCalendarPicker.test.tsx`

**Interfaces:**
- Consumes: `useTenantCalendars` and `useShareGoogleEvent` from Task 5.
- Produces: default export `PublishToCalendarPicker` accepting `{ open: boolean; onOpenChange: (open: boolean) => void; googleEventId: string; onPublished?: (sharedEventId: string) => void }`.

- [ ] **Step 1: Write the failing test**

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PublishToCalendarPicker } from './PublishToCalendarPicker';

vi.mock('@/hooks/useEventSharing', () => ({
  useTenantCalendars: () => ({
    data: [
      { id: 'cal-a', name: 'Choir Main', color: '#a855f7', is_default: true },
      { id: 'cal-b', name: 'Rehearsals', color: '#0ea5e9', is_default: false },
    ],
    isLoading: false,
  }),
  useShareGoogleEvent: () => ({ mutateAsync: shareMock, isPending: false }),
}));

const shareMock = vi.fn(async (input: any) => ({ shared_event_id: 'ev-99' }));

afterEach(() => { cleanup(); shareMock.mockClear(); });

function wrap(children: React.ReactNode) {
  const qc = new QueryClient();
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('PublishToCalendarPicker', () => {
  it('lists tenant calendars sorted by is_default DESC, name ASC', () => {
    render(wrap(<PublishToCalendarPicker open={true} onOpenChange={() => {}} googleEventId="g-1" />));
    const buttons = screen.getAllByRole('button', { name: /Choir Main|Rehearsals/ });
    expect(buttons[0]).toHaveTextContent('Choir Main');
    expect(buttons[1]).toHaveTextContent('Rehearsals');
  });

  it('shares the event with the picked calendar_id and fires onPublished with the returned id', async () => {
    const onPublished = vi.fn();
    render(wrap(<PublishToCalendarPicker open={true} onOpenChange={() => {}} googleEventId="g-1" onPublished={onPublished} />));
    fireEvent.click(screen.getByRole('button', { name: /Rehearsals/ }));
    await waitFor(() => expect(shareMock).toHaveBeenCalledWith({ google_event_id: 'g-1', calendar_id: 'cal-b' }));
    await waitFor(() => expect(onPublished).toHaveBeenCalledWith('ev-99'));
  });
});
```

- [ ] **Step 2: Run to verify FAIL**

```bash
cd /tmp/gleeworld-share-98772 && npx vitest run src/components/calendar/command-center/PublishToCalendarPicker.test.tsx
```

Expected: file-not-found on the component.

- [ ] **Step 3: Implement the component**

```tsx
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTenantCalendars, useShareGoogleEvent } from '@/hooks/useEventSharing';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  googleEventId: string;
  onPublished?: (sharedEventId: string) => void;
}

export function PublishToCalendarPicker({ open, onOpenChange, googleEventId, onPublished }: Props) {
  const { data: calendars, isLoading } = useTenantCalendars();
  const { mutateAsync, isPending } = useShareGoogleEvent();
  const [pickingId, setPickingId] = useState<string | null>(null);

  const pick = async (calendarId: string) => {
    setPickingId(calendarId);
    try {
      const res = await mutateAsync({ google_event_id: googleEventId, calendar_id: calendarId });
      onPublished?.(res.shared_event_id);
      onOpenChange(false);
    } finally {
      setPickingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Publish to a shared calendar</DialogTitle>
        </DialogHeader>
        <div className="space-y-1">
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground p-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading calendars…
            </div>
          )}
          {!isLoading && (calendars ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground p-2">No calendars in this workspace yet.</p>
          )}
          {(calendars ?? []).map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => pick(c.id)}
              disabled={isPending}
              className={cn(
                'w-full flex items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-accent transition-colors',
                pickingId === c.id && 'opacity-60',
              )}
            >
              <span
                className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                style={{ background: c.color ?? '#a855f7' }}
                aria-hidden
              />
              <span className="flex-1 truncate">{c.name}</span>
              {c.is_default && <span className="text-[10px] text-muted-foreground">default</span>}
              {pickingId === c.id && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: Run tests to verify PASS**

```bash
cd /tmp/gleeworld-share-98772 && npx vitest run src/components/calendar/command-center/PublishToCalendarPicker.test.tsx
```

Expected: 2 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/calendar/command-center/PublishToCalendarPicker.tsx src/components/calendar/command-center/PublishToCalendarPicker.test.tsx
git commit -m "PublishToCalendarPicker: modal to pick a shared calendar target"
```

---

## Task 7: `isSharedFromGoogle` utility

**Files:**
- Modify: `src/utils/googleCalendarEvents.ts`
- Modify: `src/utils/__tests__/googleCalendarEvents.test.ts`

**Interfaces:**
- Produces: named export `isSharedFromGoogle(event, currentUserId)` returning boolean.

- [ ] **Step 1: Write the failing test**

Append to `src/utils/__tests__/googleCalendarEvents.test.ts`:

```ts
import { isSharedFromGoogle } from '../googleCalendarEvents';

describe('isSharedFromGoogle', () => {
  it('returns true when external_source=google_calendar AND origin_user_id matches', () => {
    expect(isSharedFromGoogle({ external_source: 'google_calendar', origin_user_id: 'u1' } as any, 'u1')).toBe(true);
  });
  it('returns false for a different user_id', () => {
    expect(isSharedFromGoogle({ external_source: 'google_calendar', origin_user_id: 'u2' } as any, 'u1')).toBe(false);
  });
  it('returns false for non-google external_source', () => {
    expect(isSharedFromGoogle({ external_source: 'ical', origin_user_id: 'u1' } as any, 'u1')).toBe(false);
  });
  it('returns false for null/undefined event or user_id', () => {
    expect(isSharedFromGoogle(null, 'u1')).toBe(false);
    expect(isSharedFromGoogle({ external_source: 'google_calendar', origin_user_id: 'u1' } as any, null)).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify FAIL**

```bash
cd /tmp/gleeworld-share-98772 && npx vitest run src/utils/__tests__/googleCalendarEvents.test.ts
```

Expected: 4 new tests FAIL — `isSharedFromGoogle is not defined`.

- [ ] **Step 3: Add the export**

Append to `src/utils/googleCalendarEvents.ts`:

```ts
export function isSharedFromGoogle(
  event: { external_source?: string | null; origin_user_id?: string | null } | null | undefined,
  currentUserId: string | null | undefined,
): boolean {
  if (!event || !currentUserId) return false;
  return event.external_source === 'google_calendar' && event.origin_user_id === currentUserId;
}
```

- [ ] **Step 4: Run tests to verify PASS**

```bash
cd /tmp/gleeworld-share-98772 && npx vitest run src/utils/__tests__/googleCalendarEvents.test.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/googleCalendarEvents.ts src/utils/__tests__/googleCalendarEvents.test.ts
git commit -m "utils: isSharedFromGoogle(event, uid) for the Unshare-menu gate"
```

---

## Task 8: `EventPeekPopover` — add "Publish to calendar…" and "Unshare"

**Files:**
- Modify: `src/components/calendar/command-center/EventPeekPopover.tsx`

**Interfaces:**
- Consumes: `PublishToCalendarPicker` (Task 6), `useUnshareGoogleEvent` (Task 5), `isGoogleSyncedEvent` (existing) + `isSharedFromGoogle` (Task 7).
- Produces: no new exports; adds two menu items to the existing popover.

- [ ] **Step 1: Read the current popover to find the menu region**

Look at `EventPeekPopover.tsx` for the existing action buttons (Edit, Delete, etc.). Locate the block where `isGoogleEvent` gates hiding those actions — the new "Publish to calendar…" button goes right there. Also identify where a native event card lays out its buttons — the new "Unshare" goes at the tail.

- [ ] **Step 2: Add imports at the top of `EventPeekPopover.tsx`**

```ts
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useCurrentUserId } from '@/hooks/useCurrentUserId';
import { isSharedFromGoogle } from '@/utils/googleCalendarEvents';
import { useUnshareGoogleEvent } from '@/hooks/useEventSharing';
import { PublishToCalendarPicker } from './PublishToCalendarPicker';
```

If `useCurrentUserId` does not exist, use whichever hook the file already imports to get the current user's id (e.g. `useAuth()` — check the file's existing imports and reuse the same hook that gates its native Edit/Delete buttons).

- [ ] **Step 3: Add local state + handlers inside the component body**

```ts
const { toast } = useToast();
const currentUserId = useCurrentUserId();
const [pickerOpen, setPickerOpen] = useState(false);
const unshare = useUnshareGoogleEvent();

const canUnshare = isSharedFromGoogle(event as any, currentUserId);

const doUnshare = async () => {
  try {
    const r = await unshare.mutateAsync({ shared_event_id: event.id });
    toast({ title: r.deleted > 0 ? 'Unshared' : 'Nothing to un-share', description: r.deleted > 0 ? 'The published copy was removed.' : undefined });
  } catch (e: any) {
    toast({ title: 'Un-share failed', description: e?.message ?? String(e), variant: 'destructive' });
  }
};
```

- [ ] **Step 4: Insert the "Publish to calendar…" button inside the `isGoogleEvent` branch**

Somewhere the file already has a block like `{isGoogleEvent ? (...) : (...)}`. In the `isGoogleEvent` branch (which currently disables Edit/Delete), add:

```tsx
<button
  type="button"
  onClick={() => setPickerOpen(true)}
  className="w-full text-left rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors"
>
  Publish to calendar…
</button>
```

- [ ] **Step 5: Insert the "Unshare" button inside the native-event branch**

In the `else` (native gw_events) branch, right after (or beside) the existing Edit/Delete actions, add:

```tsx
{canUnshare && (
  <button
    type="button"
    onClick={doUnshare}
    disabled={unshare.isPending}
    className="w-full text-left rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors text-rose-600"
  >
    Unshare from Google
  </button>
)}
```

- [ ] **Step 6: Mount the picker at the bottom of the return**

Just before the closing tag of the popover root, add:

```tsx
{pickerOpen && (
  <PublishToCalendarPicker
    open={pickerOpen}
    onOpenChange={setPickerOpen}
    googleEventId={(event as any).google_event_id ?? String(event.id).replace(/^gcal-/, '')}
    onPublished={() => toast({ title: 'Published', description: 'The event is now on the shared calendar.' })}
  />
)}
```

The synthetic Google-event card has `id = 'gcal-<uuid>'` and NOT a direct `google_event_id` field — the strip-prefix fallback lands on the underlying `gw_google_events.id`, which is what `google-event-share` expects.

Wait — the share edge fn queries `.eq('google_event_id', google_event_id)`. That means we need Google's `google_event_id`, not our internal row id. Fix the synthetic-event mapper in `CommandCenterCalendar.tsx` to carry the real `google_event_id` field on the synthetic row (see Step 7).

- [ ] **Step 7: Extend the synthetic Google-event object in `CommandCenterCalendar.tsx` to carry `google_event_id`**

In `src/components/calendar/command-center/CommandCenterCalendar.tsx` inside the `googleRows.map(...)` block, add one field:

```ts
// Before the closing brace of the object literal
google_event_id: g.google_event_id,
```

Then in Step 6 above, update the picker line to use it directly:

```tsx
googleEventId={(event as any).google_event_id}
```

- [ ] **Step 8: Type-check + build**

```bash
cd /tmp/gleeworld-share-98772 && npx tsc --noEmit 2>&1 | grep -E "EventPeekPopover|PublishToCalendarPicker|CommandCenterCalendar" | head
```

Expected: no output.

```bash
cd /tmp/gleeworld-share-98772 && npm run build 2>&1 | tail -6
```

Expected: clean build.

- [ ] **Step 9: Commit**

```bash
git add src/components/calendar/command-center/EventPeekPopover.tsx src/components/calendar/command-center/CommandCenterCalendar.tsx
git commit -m "EventPeekPopover: Publish to calendar / Unshare actions"
```

---

## Task 9: Deploy + E2E verification

**Files:** none (deploy only).

- [ ] **Step 1: Verify branch state**

```bash
cd /tmp/gleeworld-share-98772
git log --oneline main..HEAD
git status --short
```

Expected: clean tree, ~7-8 commits ahead of main.

- [ ] **Step 2: Apply the migration to prod** (Kevin runs or explicitly OKs)

```bash
cat supabase/migrations/20260727030000_gw_events_origin_user_id.sql \
 | ssh root@198.211.113.144 'docker exec -i supabase-db psql -U postgres -d postgres -v ON_ERROR_STOP=1'
```

Expected: `ALTER TABLE`, `CREATE INDEX`.

- [ ] **Step 3: Deploy edge functions**

```bash
cd /tmp/gleeworld-share-98772 && bash scripts/deploy-functions.sh google-event-share google-event-unshare google-sync
```

Expected: three functions rsynced, `supabase-edge-functions` container restarted, "Done."

- [ ] **Step 4: Deploy the front-end**

```bash
cd /tmp/gleeworld-share-98772 && bash scripts/deploy-frontend.sh
```

Expected: `Live: index-*.js` matches the local hash.

- [ ] **Step 5: Live smoke — share a real Google event via curl**

Uses the demo user's JWT (or your own) to hit the fn end-to-end.

```bash
ANON=$(ssh root@198.211.113.144 'grep ^ANON_KEY /opt/supabase/.env | cut -d= -f2')
AUTH_RESP=$(curl -sS -X POST "https://supabase.gleeworld.org/auth/v1/token?grant_type=password" \
  -H "Content-Type: application/json" -H "apikey: $ANON" -H "x-tenant-slug: demo" \
  -d '{"email":"demo@gleeworld.org","password":"GleeDemo2026!"}')
ACCESS=$(echo "$AUTH_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# First pick a real google_event_id + calendar_id from the demo tenant
# (query gw_google_events, gw_calendars via psql or the app).

curl -sS -X POST "https://supabase.gleeworld.org/functions/v1/google-event-share" \
  -H "Authorization: Bearer $ACCESS" -H "apikey: $ANON" -H "x-tenant-slug: demo" \
  -H "Content-Type: application/json" \
  -d '{"google_event_id":"<real-id>","calendar_id":"<real-cal-uuid>"}'
```

Expected: `{"ok":true,"shared_event_id":"<uuid>"}`.

- [ ] **Step 6: Browser QA**

1. Open a calendar view on any tenant with your Google connection.
2. Click a Google event → popover shows "Publish to calendar…" → picker lists calendars → pick one → toast "Published".
3. The event now appears on the calendar for OTHER members of the tenant (open a different session/incognito with another user).
4. Edit the event title in Google → "Pull from Google" → shared copy title updates.
5. Delete the event in Google → "Pull from Google" → shared copy disappears.
6. Publish again → "Unshare from Google" appears on the shared copy → tap → toast "Unshared" → row disappears.

- [ ] **Step 7: Open the PR**

```bash
gh pr create --title "Google event sharing: publish personal Google events to shared calendars" --body "$(cat <<'EOF'
## Summary
- Users can publish a Google Calendar event onto a shared in-house GleeWorld calendar
- Published copy stays linked: Google edits propagate on next sync; Google-delete removes the copy
- "Unshare from Google" reverses the share; only the origin user sees the action

## Backend
- Migration: `gw_events.origin_user_id` + partial unique index
- `google-event-share` / `google-event-unshare` edge functions (RLS-scoped)
- `google-sync` now propagates title/time updates and deletes vanished sources

## Test plan
- [ ] Publish a Google event; verify it renders for another tenant member
- [ ] Edit in Google → Pull → verify shared copy updates
- [ ] Delete in Google → Pull → verify shared copy disappears
- [ ] Unshare → verify copy vanishes for other members

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-Review

**Spec coverage checked against `docs/superpowers/specs/2026-07-27-google-event-sharing-design.md`:**

- ✓ Migration adds `origin_user_id` + partial unique index → Task 1
- ✓ `google-event-share` edge fn with fields copied from `gw_google_events` + republish idempotency → Task 2
- ✓ `google-event-unshare` edge fn gated by `origin_user_id = auth.uid()` → Task 3
- ✓ `google-sync` update propagation → Task 4
- ✓ `google-sync` delete propagation with sync-window bounds → Task 4
- ✓ Client hooks: `useTenantCalendars`, `useShareGoogleEvent`, `useUnshareGoogleEvent` → Task 5
- ✓ `PublishToCalendarPicker` modal → Task 6
- ✓ `isSharedFromGoogle` gate helper → Task 7
- ✓ `EventPeekPopover` "Publish to calendar…" (Google events) + "Unshare from Google" (own shared copies) → Task 8
- ✓ Synthetic Google-event mapper carries `google_event_id` (was missing; added in Task 8 Step 7)
- ✓ Deploy + manual QA → Task 9

**Placeholder scan:** no TBD, no "add validation." Every code block is runnable.

**Type consistency:**
- `runShare` returns `{ ok: true; shared_event_id } | { error, detail? }` — matches both the client hook `useShareGoogleEvent` and the popover's `onPublished` callback.
- `runUnshare` returns `{ ok: true; deleted } | { error, detail? }` — matches `useUnshareGoogleEvent`.
- `PropagatedGoogleEvent` shape (Task 4) matches the shape assembled from `google-sync`'s existing row builder.
- `isSharedFromGoogle` (Task 7) reads `external_source` + `origin_user_id` — both landed on `gw_events` via the migration and its `select('*')` client query.

Nothing to fix.
