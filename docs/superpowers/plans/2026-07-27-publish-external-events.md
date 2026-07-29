# Publish external calendar events — Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use `- [ ]` for tracking.

**Goal:** Let signed-in users publish iOS-sourced events (from `gw_ios_events`) to a shared GleeWorld calendar with the same one-tap flow that already works for Google events. Backend edge fns become source-agnostic; client picker + popover extend to iOS events.

**Architecture:** Rename `google-event-share` / `google-event-unshare` → `event-share` / `event-unshare`, widen the share fn's API to accept a `source` discriminator that gates which per-user personal table it reads from. Both sources continue to write into `gw_events` with `external_source` set to the source name. Propagation from `ios-calendar-sync` mirrors `google-sync`'s already-shipped `propagateUpdates` + `propagateDeletes`. Client hooks + `PublishToCalendarPicker` + `EventPeekPopover` extend to accept both sources; `isSharedFromGoogle` widens to `isSharedFromExternal`.

**Tech Stack:** TypeScript/React 18, Deno edge functions, Vitest.

## Global Constraints

- **Working directory:** `/tmp/gleeworld-p2-30371` (branch `feat/publish-external-events`).
- **Existing shared rows keep working**: `gw_events.external_source='google_calendar'` rows shipped in Phase 1 stay unchanged; iOS-sourced shared rows use `external_source='ios_calendar'`.
- **Old edge fn names stay deployed on the droplet after this branch merges** — `deploy-functions.sh` doesn't delete missing functions. Old cached clients keep working until refresh. Kevin can purge manually later.
- **No new npm dependencies.**
- **Tenant-neutral copy** in every user-visible string.
- Canvas arm64 already installed in this worktree.

## File Structure

**New files:**
- `supabase/functions/event-share/index.ts` (moved + widened)
- `supabase/functions/event-share/runShare.ts`
- `supabase/functions/event-share/__tests__/share.test.ts`
- `supabase/functions/event-unshare/index.ts` (moved + widened)
- `supabase/functions/event-unshare/runUnshare.ts`
- `supabase/functions/event-unshare/__tests__/unshare.test.ts`
- `supabase/functions/ios-calendar-sync/propagate.ts` (mirrors `google-sync/propagate.ts` for `external_source='ios_calendar'`)
- `supabase/functions/ios-calendar-sync/__tests__/propagate.test.ts`

**Deleted files:**
- `supabase/functions/google-event-share/` (entire directory)
- `supabase/functions/google-event-unshare/` (entire directory)

**Modified files:**
- `supabase/functions/ios-calendar-sync/runSync.ts` — call new propagate helpers.
- `src/hooks/useEventSharing.ts` — rename `useShareGoogleEvent` → `useShareEvent(source)`, `useUnshareGoogleEvent` → `useUnshareEvent`; invoke `event-share` / `event-unshare` fns.
- `src/components/calendar/command-center/PublishToCalendarPicker.tsx` — props `source` + `sourceEventId` replace `googleEventId`.
- `src/components/calendar/command-center/PublishToCalendarPicker.test.tsx` — update mocks + one new iOS test.
- `src/utils/googleCalendarEvents.ts` — add `isIosSyncedEvent` + `isSharedFromExternal`. Keep `isSharedFromGoogle` as `@deprecated` alias.
- `src/utils/__tests__/googleCalendarEvents.test.ts` — new cases.
- `src/components/calendar/command-center/EventPeekPopover.tsx` — publish button also visible for iOS events; unshare button uses `isSharedFromExternal`; picker receives new props.

---

## Task 1: Rename & widen `event-share` edge fn

**Files:**
- Create: `supabase/functions/event-share/{index.ts, runShare.ts, __tests__/share.test.ts}` — content mostly moved from the old fn, widened per spec.
- Delete: `supabase/functions/google-event-share/` (directory).

**Interfaces:**
- Produces: POST `/functions/v1/event-share` accepting `{ source: 'google_calendar' | 'ios_calendar', source_event_id: string, calendar_id: string }` returning `{ ok: true, shared_event_id } | { error, detail? }`. `runShare` reads from `gw_google_events` or `gw_ios_events` based on `source`.

- [ ] **Step 1: Rewrite `runShare.ts`**

```ts
type Source = 'google_calendar' | 'ios_calendar';

const SOURCE_TABLES: Record<Source, { table: string; idColumn: string; startColumn: string; endColumn: string; }> = {
  google_calendar: { table: 'gw_google_events', idColumn: 'google_event_id', startColumn: 'start_at', endColumn: 'end_at' },
  ios_calendar:    { table: 'gw_ios_events',    idColumn: 'apple_event_id',  startColumn: 'start_at', endColumn: 'end_at' },
};

export interface RunShareInput {
  user_id: string;
  source: Source;
  source_event_id: string;
  calendar_id: string;
  supabase: any;
}

export type RunShareResult =
  | { ok: true; shared_event_id: string }
  | { error: 'source_not_found' | 'calendar_not_found' | 'save_failed' | 'bad_source'; detail?: string };

export async function runShare(input: RunShareInput): Promise<RunShareResult> {
  const { user_id, source, source_event_id, calendar_id, supabase } = input;
  const cfg = SOURCE_TABLES[source];
  if (!cfg) return { error: 'bad_source' };

  const { data: src } = await supabase
    .from(cfg.table)
    .select(`tenant_id, title, description, location, ${cfg.startColumn}, ${cfg.endColumn}, all_day`)
    .eq('user_id', user_id)
    .eq(cfg.idColumn, source_event_id)
    .maybeSingle();
  if (!src) return { error: 'source_not_found' };

  const { data: cal } = await supabase
    .from('gw_calendars').select('id').eq('id', calendar_id).maybeSingle();
  if (!cal) return { error: 'calendar_not_found' };

  const { data, error } = await supabase
    .from('gw_events')
    .upsert({
      tenant_id:       src.tenant_id,
      title:           src.title ?? '(untitled)',
      description:     src.description,
      location:        src.location,
      start_date:      src[cfg.startColumn],
      end_date:        src[cfg.endColumn],
      calendar_id,
      external_source: source,
      external_id:     source_event_id,
      origin_user_id:  user_id,
      created_by:      user_id,
      event_type:      'shared_from_google',   // same event_type across sources — the calendar renderer treats it the same
      is_public:       true,
      is_private:      false,
      status:          'scheduled',
    }, { onConflict: 'tenant_id,external_id,origin_user_id' })
    .select('id')
    .single();

  if (error || !data) return { error: 'save_failed', detail: error?.message ?? 'no row returned' };
  return { ok: true, shared_event_id: data.id };
}
```

- [ ] **Step 2: Rewrite `index.ts`** (mirrors Phase 1's index.ts pattern, body validates `source` and `source_event_id` + `calendar_id`).

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
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'method_not_allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  const authHeader = req.headers.get('Authorization') ?? '';
  const jwt = authHeader.replace('Bearer ', '');
  if (!jwt) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

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
  if (!user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  let body: { source?: string; source_event_id?: string; calendar_id?: string };
  try { body = await req.json(); } catch { return new Response(JSON.stringify({ error: 'bad_request' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }

  const source = String(body.source ?? '').trim() as 'google_calendar' | 'ios_calendar';
  const source_event_id = String(body.source_event_id ?? '').trim();
  const calendar_id = String(body.calendar_id ?? '').trim();
  if (!source_event_id || !calendar_id || (source !== 'google_calendar' && source !== 'ios_calendar')) {
    return new Response(JSON.stringify({ error: 'bad_request' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const result = await runShare({ user_id: user.id, source, source_event_id, calendar_id, supabase });
  const status = 'ok' in result ? 200 : (result.error === 'save_failed' ? 500 : 404);
  return new Response(JSON.stringify(result), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
```

- [ ] **Step 3: Move + widen tests**

Copy the existing 4 tests from `google-event-share/__tests__/share.test.ts` into `event-share/__tests__/share.test.ts`. Update every test to include `source: 'google_calendar'` in the runShare input. Add ONE new test — the iOS-source path:

```ts
it('reads from gw_ios_events when source=ios_calendar', async () => {
  const src = { tenant_id: 'tenant-a', title: 'iOS Ev', description: null, location: null, start_at: '2026-08-01T10:00:00Z', end_at: '2026-08-01T11:00:00Z', all_day: false };
  const supabase = stubSupabase({
    googleRow: null,
    calendarRow: { id: 'cal-1' },
    iosRow: src,
    upsertResult: { data: { id: 'ev-77' }, error: null },
  });
  const res = await runShare({ user_id: 'u1', source: 'ios_calendar', source_event_id: 'ek-77', calendar_id: 'cal-1', supabase });
  expect(res).toEqual({ ok: true, shared_event_id: 'ev-77' });
});
```

Extend `stubSupabase` to route `.from('gw_ios_events')` to `opts.iosRow`.

- [ ] **Step 4: Delete the old `google-event-share/` directory**

```bash
rm -rf supabase/functions/google-event-share
```

- [ ] **Step 5: Run tests**

```bash
cd /tmp/gleeworld-p2-30371 && npx vitest run supabase/functions/event-share/__tests__/share.test.ts
```

Expected: 5 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/event-share/ supabase/functions/google-event-share/
git commit -m "event-share: source-aware share fn (rename from google-event-share)"
```

---

## Task 2: Rename & widen `event-unshare`

**Files:**
- Create: `supabase/functions/event-unshare/{index.ts, runUnshare.ts, __tests__/unshare.test.ts}`.
- Delete: `supabase/functions/google-event-unshare/`.

**Interfaces:**
- Produces: POST `/functions/v1/event-unshare` accepting `{ shared_event_id }` returning `{ ok: true, deleted } | { error }`. Delete filter widens from `external_source = 'google_calendar'` to `external_source IN ('google_calendar','ios_calendar')`.

- [ ] **Step 1: Rewrite `runUnshare.ts`**

Same as Phase 1 but with the widened filter:

```ts
export async function runUnshare(input: RunUnshareInput): Promise<RunUnshareResult> {
  const { user_id, shared_event_id, supabase } = input;
  const { data, error } = await supabase
    .from('gw_events')
    .delete()
    .eq('id', shared_event_id)
    .eq('origin_user_id', user_id)
    .in('external_source', ['google_calendar', 'ios_calendar'])
    .select('id');
  if (error) return { error: 'save_failed', detail: error.message };
  return { ok: true, deleted: (data ?? []).length };
}
```

- [ ] **Step 2: Copy `index.ts` verbatim from `google-event-unshare/index.ts`**, updating only imports (point to `./runUnshare.ts`).

- [ ] **Step 3: Copy the 3 existing tests + update the stub**

Extend the stub's delete chain to record an `.in()` call:

```ts
in: (col: string, values: any[]) => { filters.push({ in: [col, values] }); return chain; },
```

The happy-path test asserts the `in` filter includes both sources:

```ts
expect(del.filters).toEqual(expect.arrayContaining([{ in: ['external_source', ['google_calendar', 'ios_calendar']] }]));
```

- [ ] **Step 4: Delete `google-event-unshare/`**

```bash
rm -rf supabase/functions/google-event-unshare
```

- [ ] **Step 5: Run tests**

```bash
cd /tmp/gleeworld-p2-30371 && npx vitest run supabase/functions/event-unshare/__tests__/unshare.test.ts
```

Expected: 3 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/event-unshare/ supabase/functions/google-event-unshare/
git commit -m "event-unshare: source-agnostic delete (rename from google-event-unshare)"
```

---

## Task 3: iOS propagation helper

**Files:**
- Create: `supabase/functions/ios-calendar-sync/propagate.ts`
- Create: `supabase/functions/ios-calendar-sync/__tests__/propagate.test.ts`

**Interfaces:**
- Consumes: `admin` supabase client, user_id, tenant_id, seen events list, sync window.
- Produces: `propagateIosUpdates(admin, user_id, tenant_id, events)` and `propagateIosDeletes(admin, user_id, tenant_id, seenIds, window)` — identical shape to google-sync/propagate.ts but keyed on `external_source='ios_calendar'`.

- [ ] **Step 1: Create `propagate.ts`** (mirrors `google-sync/propagate.ts` — see that file for exact structure):

```ts
export interface PropagatedIosEvent {
  apple_event_id: string;
  title: string | null;
  description: string | null;
  location: string | null;
  start_at: string | null;
  end_at: string | null;
  all_day: boolean;
}

export async function propagateIosUpdates(
  admin: any, user_id: string, tenant_id: string, events: PropagatedIosEvent[],
): Promise<void> {
  for (const ev of events) {
    await admin
      .from('gw_events')
      .update({
        title:       ev.title ?? '(untitled)',
        description: ev.description,
        location:    ev.location,
        start_date:  ev.start_at,
        end_date:    ev.end_at,
        updated_at:  new Date().toISOString(),
      })
      .eq('origin_user_id', user_id)
      .eq('tenant_id', tenant_id)
      .eq('external_source', 'ios_calendar')
      .eq('external_id', ev.apple_event_id);
  }
}

export async function propagateIosDeletes(
  admin: any, user_id: string, tenant_id: string, seenAppleIds: string[], window: { start: string; end: string },
): Promise<void> {
  const idList = seenAppleIds.length ? seenAppleIds : ['__none__'];
  await admin
    .from('gw_events')
    .delete()
    .eq('origin_user_id', user_id)
    .eq('tenant_id', tenant_id)
    .eq('external_source', 'ios_calendar')
    .gte('start_date', window.start)
    .lte('start_date', window.end)
    .not('external_id', 'in', `(${idList.map(id => `"${id}"`).join(',')})`);
}
```

- [ ] **Step 2: Create the failing test**

Copy the test structure from `google-sync/__tests__/propagate.test.ts` — same stub, same assertions, s/google_calendar/ios_calendar/g, s/google_event_id/apple_event_id/g. 3 tests.

- [ ] **Step 3: Run + commit**

```bash
cd /tmp/gleeworld-p2-30371 && npx vitest run supabase/functions/ios-calendar-sync/__tests__/propagate.test.ts
```

Expected: 3 tests PASS.

```bash
git add supabase/functions/ios-calendar-sync/propagate.ts supabase/functions/ios-calendar-sync/__tests__/propagate.test.ts
git commit -m "ios-calendar-sync: propagate helper for shared gw_events copies"
```

---

## Task 4: Wire propagation into `ios-calendar-sync/runSync.ts`

**Files:**
- Modify: `supabase/functions/ios-calendar-sync/runSync.ts`

**Interfaces:**
- After successful upsert, before returning, run `propagateIosUpdates` on the seen events, then `propagateIosDeletes` sweeping non-seen events within the window. Same pattern as `google-sync/index.ts` uses.

- [ ] **Step 1: Import + call**

Near the top of `runSync.ts`:

```ts
import { propagateIosUpdates, propagateIosDeletes, type PropagatedIosEvent } from './propagate.ts';
```

After the successful upsert block, before the final delete-sweep on `gw_ios_events`:

```ts
const propagatedEvents: PropagatedIosEvent[] = events.map(e => ({
  apple_event_id: e.ekId,
  title:          e.title,
  description:    e.description,
  location:       e.location,
  start_at:       e.startAt,
  end_at:         e.endAt,
  all_day:        e.allDay,
}));
await propagateIosUpdates(supabase, user_id, tenant_id, propagatedEvents);
await propagateIosDeletes(supabase, user_id, tenant_id, propagatedEvents.map(e => e.apple_event_id), { start: fromIso, end: toIso });
```

Only run propagation on the success path (after the upsert and after the sweep-delete both succeed).

- [ ] **Step 2: Verify existing tests still pass**

```bash
cd /tmp/gleeworld-p2-30371 && npx vitest run supabase/functions/ios-calendar-sync/__tests__/
```

Expected: existing 5 sync tests + 3 propagate tests all PASS. The stubSupabase in sync.test.ts may need extending with an `update()` chain — look at it and add if needed.

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/ios-calendar-sync/runSync.ts
git commit -m "ios-calendar-sync: wire propagate helpers into runSync"
```

---

## Task 5: Client hooks — rename to source-aware

**Files:**
- Modify: `src/hooks/useEventSharing.ts`

**Interfaces:**
- Produces: `useShareEvent()` with `mutateAsync({ source, source_event_id, calendar_id })`; `useUnshareEvent()` unchanged input `{ shared_event_id }`. Both invoke the renamed edge fns.
- Old exports `useShareGoogleEvent` and `useUnshareGoogleEvent` re-exported as deprecated aliases (kept for one branch to make the diff reviewable; consumers migrated in later tasks).

- [ ] **Step 1: Update the hook body**

Rewrite the file (verbatim):

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const CAL_KEY = ['tenant-calendars'];
const EVENTS_KEYS: readonly (readonly string[])[] = [['events'], ['google-events'], ['ios-events']];

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

export type ShareableSource = 'google_calendar' | 'ios_calendar';

export function useShareEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { source: ShareableSource; source_event_id: string; calendar_id: string }) => {
      const { data, error } = await supabase.functions.invoke('event-share', { body: input });
      if (error) throw error;
      const body = data as { ok?: boolean; shared_event_id?: string; error?: string };
      if (body?.error) throw new Error(body.error);
      if (!body?.shared_event_id) throw new Error('no_shared_id');
      return { shared_event_id: body.shared_event_id };
    },
    onSuccess: () => { EVENTS_KEYS.forEach(k => qc.invalidateQueries({ queryKey: [...k] })); },
  });
}

export function useUnshareEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { shared_event_id: string }) => {
      const { data, error } = await supabase.functions.invoke('event-unshare', { body: input });
      if (error) throw error;
      const body = data as { ok?: boolean; deleted?: number; error?: string };
      if (body?.error) throw new Error(body.error);
      return { deleted: body?.deleted ?? 0 };
    },
    onSuccess: () => { EVENTS_KEYS.forEach(k => qc.invalidateQueries({ queryKey: [...k] })); },
  });
}

// Deprecated aliases — kept for one branch; delete in a follow-up.
export const useShareGoogleEvent = useShareEvent;
export const useUnshareGoogleEvent = useUnshareEvent;
```

- [ ] **Step 2: Type-check + commit**

```bash
cd /tmp/gleeworld-p2-30371 && npx tsc --noEmit 2>&1 | grep useEventSharing | head
```

Expected: no output.

```bash
git add src/hooks/useEventSharing.ts
git commit -m "hooks: useShareEvent(source) + useUnshareEvent (source-agnostic)"
```

---

## Task 6: `isSharedFromExternal` + `isIosSyncedEvent` utilities

**Files:**
- Modify: `src/utils/googleCalendarEvents.ts`
- Modify: `src/utils/__tests__/googleCalendarEvents.test.ts`

**Interfaces:**
- Produces:
  - `isIosSyncedEvent(event)` — mirrors `isGoogleSyncedEvent`. True when `event.source === 'ios'` OR `event.id` starts with `ios-`.
  - `isSharedFromExternal(event, currentUserId)` — true when `external_source` is either `'google_calendar'` OR `'ios_calendar'` AND `origin_user_id === currentUserId`.
  - `isSharedFromGoogle` kept as an alias of `isSharedFromExternal` (deprecated; deleted in a follow-up).

- [ ] **Step 1: Append**

```ts
export function isIosSyncedEvent(event: any): boolean {
  if (!event) return false;
  if (event.source === 'ios') return true;
  if (typeof event.id === 'string' && event.id.startsWith('ios-')) return true;
  return false;
}

export function isSharedFromExternal(
  event: { external_source?: string | null; origin_user_id?: string | null } | null | undefined,
  currentUserId: string | null | undefined,
): boolean {
  if (!event || !currentUserId) return false;
  const src = event.external_source;
  return (src === 'google_calendar' || src === 'ios_calendar') && event.origin_user_id === currentUserId;
}

// Deprecated alias; delete when consumers migrate.
export const isSharedFromGoogle = isSharedFromExternal;
```

- [ ] **Step 2: Append matching tests** (mirror the 4 Phase-1 tests, add 3 iOS cases):

```ts
describe('isIosSyncedEvent', () => {
  it('detects source=ios', () => expect(isIosSyncedEvent({ source: 'ios' } as any)).toBe(true));
  it('detects id prefix', () => expect(isIosSyncedEvent({ id: 'ios-abc' } as any)).toBe(true));
  it('returns false otherwise', () => expect(isIosSyncedEvent({ id: 'gcal-abc' } as any)).toBe(false));
});

describe('isSharedFromExternal', () => {
  it('true for google_calendar with matching uid', () => expect(isSharedFromExternal({ external_source: 'google_calendar', origin_user_id: 'u1' } as any, 'u1')).toBe(true));
  it('true for ios_calendar with matching uid',    () => expect(isSharedFromExternal({ external_source: 'ios_calendar',    origin_user_id: 'u1' } as any, 'u1')).toBe(true));
  it('false for other external_source',            () => expect(isSharedFromExternal({ external_source: 'ical',           origin_user_id: 'u1' } as any, 'u1')).toBe(false));
  it('false for uid mismatch',                     () => expect(isSharedFromExternal({ external_source: 'ios_calendar',    origin_user_id: 'u2' } as any, 'u1')).toBe(false));
});
```

- [ ] **Step 3: Run tests + commit**

```bash
cd /tmp/gleeworld-p2-30371 && npx vitest run src/utils/__tests__/googleCalendarEvents.test.ts
```

Expected: 11+ tests PASS.

```bash
git add src/utils/googleCalendarEvents.ts src/utils/__tests__/googleCalendarEvents.test.ts
git commit -m "utils: isIosSyncedEvent + isSharedFromExternal (source-agnostic)"
```

---

## Task 7: `PublishToCalendarPicker` — rename props + source-aware mutation

**Files:**
- Modify: `src/components/calendar/command-center/PublishToCalendarPicker.tsx`
- Modify: `src/components/calendar/command-center/PublishToCalendarPicker.test.tsx`

**Interfaces:**
- Produces: `PublishToCalendarPicker` now accepts `{ open, onOpenChange, source, sourceEventId, onPublished? }`. `googleEventId` removed.

- [ ] **Step 1: Update the component**

```tsx
interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source: 'google_calendar' | 'ios_calendar';
  sourceEventId: string;
  onPublished?: (sharedEventId: string) => void;
}

// ...

const pick = async (calendarId: string) => {
  setPickingId(calendarId);
  try {
    const res = await mutateAsync({ source, source_event_id: sourceEventId, calendar_id: calendarId });
    onPublished?.(res.shared_event_id);
    onOpenChange(false);
  } finally {
    setPickingId(null);
  }
};
```

- [ ] **Step 2: Update tests**

The existing 2 tests need updating — replace `googleEventId="g-1"` with `source="google_calendar" sourceEventId="g-1"`. Add ONE new iOS test:

```tsx
it('publishes an iOS-sourced event via the same picker', async () => {
  render(wrap(<PublishToCalendarPicker open={true} onOpenChange={() => {}} source="ios_calendar" sourceEventId="ek-1" onPublished={vi.fn()} />));
  fireEvent.click(screen.getByRole('button', { name: /Choir Main/ }));
  await waitFor(() => expect(shareMock).toHaveBeenCalledWith({ source: 'ios_calendar', source_event_id: 'ek-1', calendar_id: 'cal-a' }));
});
```

Also update the `vi.mock('@/hooks/useEventSharing', ...)` at the top to export `useShareEvent` instead of `useShareGoogleEvent` (or both).

- [ ] **Step 3: Run tests + commit**

```bash
cd /tmp/gleeworld-p2-30371 && npx vitest run src/components/calendar/command-center/PublishToCalendarPicker.test.tsx
```

Expected: 3 tests PASS.

```bash
git add src/components/calendar/command-center/PublishToCalendarPicker.tsx src/components/calendar/command-center/PublishToCalendarPicker.test.tsx
git commit -m "PublishToCalendarPicker: source + sourceEventId props (v2)"
```

---

## Task 8: `EventPeekPopover` — extend to iOS events

**Files:**
- Modify: `src/components/calendar/command-center/EventPeekPopover.tsx`

**Interfaces:**
- Consumes: `isIosSyncedEvent`, `isSharedFromExternal` (Task 6), the renamed picker props (Task 7).

- [ ] **Step 1: Update imports**

```ts
import { isGoogleSyncedEvent, isIosSyncedEvent, isSharedFromExternal } from '@/utils/googleCalendarEvents';
import { useUnshareEvent } from '@/hooks/useEventSharing';
```

- [ ] **Step 2: Update state derivations**

Around the existing `const isGoogleEvent = isGoogleSyncedEvent(event);` add:

```ts
const isIosEvent = isIosSyncedEvent(event);
const isExternalEvent = isGoogleEvent || isIosEvent;
const canUnshare = isSharedFromExternal(event as any, currentUserId);
```

Replace usage of `isSharedFromGoogle` with `isSharedFromExternal`.

- [ ] **Step 3: Update the picker mount**

Guard on `isExternalEvent` and derive `source` + `sourceEventId` from the event:

```tsx
{isExternalEvent && (
  <PublishToCalendarPicker
    open={pickerOpen}
    onOpenChange={setPickerOpen}
    source={isGoogleEvent ? 'google_calendar' : 'ios_calendar'}
    sourceEventId={
      isGoogleEvent
        ? (event as any).google_event_id ?? ''
        : (event as any).apple_event_id ?? ''
    }
    onPublished={() => toast.success('Published — the event is now on the shared calendar.')}
  />
)}
```

- [ ] **Step 4: Update the "Publish to calendar…" button gate**

Change the button visibility from `isGoogleEvent` to `isExternalEvent`.

- [ ] **Step 5: Update the "Unshare" button label**

Rename button text from "Unshare from Google" to "Unshare from personal calendar" (source-agnostic). Copy stays user-facing tenant-neutral.

- [ ] **Step 6: Update the unshare mutation invocation**

Replace `useUnshareGoogleEvent()` with `useUnshareEvent()`.

- [ ] **Step 7: Build + commit**

```bash
cd /tmp/gleeworld-p2-30371 && npm run build 2>&1 | tail -3
```

Expected: clean.

```bash
git add src/components/calendar/command-center/EventPeekPopover.tsx
git commit -m "EventPeekPopover: publish + unshare for both Google and iOS events"
```

---

## Task 9: Deploy

- [ ] **Step 1: Deploy edge functions**

Kevin's controller handles this (SSH access):

```bash
cd /tmp/gleeworld-p2-30371
bash scripts/deploy-functions.sh event-share event-unshare ios-calendar-sync
```

(Old `google-event-share` / `google-event-unshare` stay on the droplet unless manually purged — cached clients keep working.)

- [ ] **Step 2: Deploy front-end**

```bash
cd /tmp/gleeworld-p2-30371 && bash scripts/deploy-frontend.sh
```

- [ ] **Step 3: Live smoke test — publish iOS event via curl**

```bash
ANON=$(ssh root@198.211.113.144 'grep ^ANON_KEY /opt/supabase/.env | cut -d= -f2')
AUTH_RESP=$(curl -sS -X POST "https://supabase.gleeworld.org/auth/v1/token?grant_type=password" \
  -H "Content-Type: application/json" -H "apikey: $ANON" -H "x-tenant-slug: demo" \
  -d '{"email":"demo@gleeworld.org","password":"GleeDemo2026!"}')
ACCESS=$(echo "$AUTH_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# Publish an iOS event (once a real one exists in gw_ios_events):
curl -sS -X POST "https://supabase.gleeworld.org/functions/v1/event-share" \
  -H "Authorization: Bearer $ACCESS" -H "apikey: $ANON" -H "x-tenant-slug: demo" \
  -H "Content-Type: application/json" \
  -d '{"source":"ios_calendar","source_event_id":"<apple_event_id>","calendar_id":"<gw_calendars.id>"}'
```

Expected: `{"ok":true,"shared_event_id":"..."}`.

- [ ] **Step 4: Manual QA**

- Publish a Google event → verify still works (regression check).
- Publish an iOS event → verify it appears for other tenant members.
- Unshare a Google-shared event AND an iOS-shared event → both should work.
- Edit an iOS event in iPhone Calendar → foreground → verify shared copy updates.
- Delete an iOS event → foreground → verify shared copy disappears.

---

## Self-Review

**Spec coverage:**
- ✓ Rename `google-event-share` → `event-share` with source discriminator → Task 1
- ✓ Rename `google-event-unshare` → `event-unshare` with widened filter → Task 2
- ✓ Extend `ios-calendar-sync` with propagation → Tasks 3+4
- ✓ Client hooks renamed to source-aware → Task 5
- ✓ `isSharedFromExternal` + `isIosSyncedEvent` → Task 6
- ✓ `PublishToCalendarPicker` props updated → Task 7
- ✓ `EventPeekPopover` extended for both sources → Task 8
- ✓ Deploy → Task 9

**Placeholder scan:** none.

**Type consistency:** `ShareableSource` in hook matches `source` type in edge fn matches `external_source` values in migration. `PropagatedIosEvent` mirrors `PropagatedGoogleEvent`.

Nothing to fix.
