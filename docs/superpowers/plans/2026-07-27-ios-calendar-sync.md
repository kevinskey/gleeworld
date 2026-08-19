# iOS Calendar → GleeWorld Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Ship phase 1 of iOS Calendar sync — a signed-in iOS-app user taps "Pull from iPhone", grants Calendar permission, and their local device events (including iCloud) appear on GleeWorld's calendar view as private, user-scoped events. Auto-pull re-fires on every app foreground.

**Architecture:** Native Swift plugin reads `EKEventStore`; TypeScript shim registers the bridge; the app posts events to a new `ios-calendar-sync` edge function that upserts into `gw_ios_events` and sweeps stale rows within the sync window. Table shape and RLS mirror `gw_google_events` exactly (2-layer RLS: RESTRICTIVE tenant + PERMISSIVE user). Client-side, iOS events synthesize into the existing calendar render the same way Google events already do.

**Tech Stack:** Swift 5.9 + Capacitor 7 + EventKit (iOS 17 fallback to 15), TypeScript/React 18, Deno edge functions, Postgres RLS, Vitest.

**Phase 2 (follow-up, NOT this plan):** Generalize `google-event-share` to accept `source: 'google_calendar' | 'ios_calendar'` so iOS events can be published to shared GleeWorld calendars. Deferred so phase 1 ships fast.

## Global Constraints

- **Working directory:** `/tmp/gleeworld-ios-cal-20204` (isolated worktree, branch `feat/ios-calendar-sync`).
- **Multi-tenant safety**: `gw_ios_events` RLS mirrors `gw_google_events` exactly (RESTRICTIVE tenant, PERMISSIVE user, service_role rw).
- **Tenant-neutral copy** in every string.
- **Light theme + shadcn tokens** for new UI.
- **iOS build considerations**: iOS 17+ uses `EKEventStore.requestFullAccessToEvents`; earlier versions use `.requestAccess(to: .event)`. Support both via `#available`.
- **Registration**: custom Capacitor plugins MUST be registered in `MainViewController.capacitorDidLoad` (memory: dead-stripping in release removes unregistered plugins).
- **Info.plist**: BOTH `NSCalendarsUsageDescription` (iOS ≤16) AND `NSCalendarsFullAccessUsageDescription` (iOS 17+).
- **No new npm dependencies.**

## File Structure

**New files (backend):**
- `supabase/migrations/20260727040000_gw_ios_events.sql`
- `supabase/functions/ios-calendar-sync/index.ts`
- `supabase/functions/ios-calendar-sync/runSync.ts` — pure helper for unit tests.
- `supabase/functions/ios-calendar-sync/__tests__/sync.test.ts`

**New files (iOS native):**
- `ios/App/App/GWCalendarPlugin.swift`

**New files (client TS):**
- `src/plugins/gwCalendar.ts` — plugin shim.
- `src/hooks/useIosCalendar.ts` — hooks: `useIosEvents`, `useIosCalendarAccess`, `useIosCalendarSync`.
- `src/components/calendar/command-center/IosCalendarPanel.tsx` — the Sync-tab panel.
- `src/components/calendar/command-center/IosCalendarPanel.test.tsx`
- `src/components/app/IosCalendarAutoPull.tsx` — top-level effect that fires the pull on mount + `appStateChange`.

**Modified files:**
- `ios/App/App/MainViewController.swift` — one line to register the new plugin.
- `ios/App/App/Info.plist` — two calendar usage-description strings.
- `src/components/calendar/command-center/CalendarSettingsDialog.tsx` — mount `IosCalendarPanel` in Sync tab.
- `src/components/calendar/command-center/CommandCenterCalendar.tsx` — synthesize iOS events into calendar render.
- `src/App.tsx` — mount `IosCalendarAutoPull` (single instance, top-level).

---

## Task 1: Migration — `gw_ios_events` table

**Files:**
- Create: `supabase/migrations/20260727040000_gw_ios_events.sql`

**Interfaces:**
- Produces: `gw_ios_events(id, tenant_id, user_id, apple_event_id, calendar_title, title, description, location, start_at, end_at, all_day, is_private, synced_at)` with `UNIQUE (user_id, apple_event_id)`. Trigger stamps `tenant_id`. RLS layers: RESTRICTIVE tenant + PERMISSIVE user + service_role rw. Index on `(user_id, start_at)`.

- [ ] **Step 1: Write the migration**

```sql
-- Personal iPhone-calendar events, pulled by the iOS app via EventKit.
-- Mirrors gw_google_events: 2-layer RLS (tenant RESTRICTIVE + user
-- PERMISSIVE), user-scoped by apple_event_id.

CREATE TABLE public.gw_ios_events (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL DEFAULT current_tenant_id(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  apple_event_id    text NOT NULL,
  calendar_title    text,
  title             text,
  description       text,
  location          text,
  start_at          timestamptz,
  end_at            timestamptz,
  all_day           boolean NOT NULL DEFAULT false,
  is_private        boolean NOT NULL DEFAULT false,
  synced_at         timestamptz NOT NULL DEFAULT now(),
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, apple_event_id)
);

CREATE OR REPLACE FUNCTION public.gw_ios_events_set_tenant()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN NEW.tenant_id := current_tenant_id(); END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER gw_ios_events_set_tenant_trg
BEFORE INSERT ON public.gw_ios_events
FOR EACH ROW EXECUTE FUNCTION public.gw_ios_events_set_tenant();

ALTER TABLE public.gw_ios_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_restrict ON public.gw_ios_events
  AS RESTRICTIVE FOR ALL
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY "Users see own ios events" ON public.gw_ios_events
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users write own ios events" ON public.gw_ios_events
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY ios_events_service_role_rw ON public.gw_ios_events
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX gw_ios_events_user_start_idx
  ON public.gw_ios_events (user_id, start_at);
```

- [ ] **Step 2: Commit**

```bash
cd /tmp/gleeworld-ios-cal-20204
git add supabase/migrations/20260727040000_gw_ios_events.sql
git commit -m "gw_ios_events: table + 2-layer RLS mirroring gw_google_events"
```

(Prod apply handled by controller after all code tasks.)

---

## Task 2: iOS native plugin `GWCalendarPlugin.swift`

**Files:**
- Create: `ios/App/App/GWCalendarPlugin.swift`
- Modify: `ios/App/App/MainViewController.swift` — register the plugin.
- Modify: `ios/App/App/Info.plist` — two usage-description strings.

**Interfaces:**
- Consumes: EventKit (`EKEventStore`, `EKEvent`, `EKCalendar`).
- Produces: Capacitor plugin named `GWCalendar` with methods `requestAccess`, `checkAccess`, `readEvents({ fromIso, toIso })`.

- [ ] **Step 1: Create the Swift file**

```swift
// GWCalendarPlugin — bridge to iOS EventKit so the app can read the
// user's local Calendar (iCloud, work, subscribed calendars) and post
// events to ios-calendar-sync. iOS 17 uses .requestFullAccessToEvents;
// earlier versions use the deprecated .requestAccess(to:) path.
//
// Registration lives in MainViewController.capacitorDidLoad — release
// dead-stripping removes unregistered plugins.

import Foundation
import Capacitor
import EventKit

@objc(GWCalendarPlugin)
public class GWCalendarPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "GWCalendarPlugin"
    public let jsName = "GWCalendar"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "requestAccess", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "checkAccess",   returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "readEvents",    returnType: CAPPluginReturnPromise),
    ]

    private let store = EKEventStore()

    private func statusString(_ s: EKAuthorizationStatus) -> String {
        switch s {
        case .notDetermined: return "notDetermined"
        case .restricted:    return "restricted"
        case .denied:        return "denied"
        case .authorized:    return "authorized"
        @unknown default:
            if #available(iOS 17.0, *) {
                if s == .fullAccess { return "authorized" }
                if s == .writeOnly  { return "writeOnly"  }
            }
            return "unknown"
        }
    }

    private func isGranted(_ s: EKAuthorizationStatus) -> Bool {
        if s == .authorized { return true }
        if #available(iOS 17.0, *) { return s == .fullAccess }
        return false
    }

    @objc func checkAccess(_ call: CAPPluginCall) {
        let s = EKEventStore.authorizationStatus(for: .event)
        call.resolve(["granted": isGranted(s), "status": statusString(s)])
    }

    @objc func requestAccess(_ call: CAPPluginCall) {
        if #available(iOS 17.0, *) {
            store.requestFullAccessToEvents { [weak self] granted, _ in
                DispatchQueue.main.async {
                    let s = EKEventStore.authorizationStatus(for: .event)
                    call.resolve(["granted": self?.isGranted(s) ?? granted, "status": self?.statusString(s) ?? (granted ? "authorized" : "denied")])
                }
            }
        } else {
            store.requestAccess(to: .event) { [weak self] granted, _ in
                DispatchQueue.main.async {
                    let s = EKEventStore.authorizationStatus(for: .event)
                    call.resolve(["granted": granted, "status": self?.statusString(s) ?? (granted ? "authorized" : "denied")])
                }
            }
        }
    }

    @objc func readEvents(_ call: CAPPluginCall) {
        guard let fromIso = call.getString("fromIso"),
              let toIso   = call.getString("toIso"),
              let from    = ISO8601DateFormatter().date(from: fromIso),
              let to      = ISO8601DateFormatter().date(from: toIso)
        else {
            call.reject("bad_window")
            return
        }
        let s = EKEventStore.authorizationStatus(for: .event)
        if !isGranted(s) {
            call.reject("not_authorized")
            return
        }

        // Enumerate calendars, skipping the built-in Birthdays source
        // (noisy, no useful title/notes).
        let allCalendars = store.calendars(for: .event).filter { cal in
            cal.source.sourceType != .birthdays
        }
        let predicate = store.predicateForEvents(withStart: from, end: to, calendars: allCalendars)
        let events = store.events(matching: predicate)

        let iso = ISO8601DateFormatter()
        let formatted: [[String: Any]] = events.compactMap { ev in
            // Skip pure clutter (no title, no notes, no attendees).
            let title = ev.title ?? ""
            let hasNotes = (ev.notes ?? "").isEmpty == false
            let hasAttendees = (ev.attendees?.isEmpty == false)
            if title.isEmpty && !hasNotes && !hasAttendees { return nil }

            let isPrivate: Bool = {
                if ev.availability == .busy && (ev.calendar.title.lowercased().contains("personal")) { return true }
                return false
            }()

            var row: [String: Any] = [
                "ekId":          ev.eventIdentifier ?? UUID().uuidString,
                "calendarTitle": ev.calendar.title,
                "title":         title,
                "description":   ev.notes ?? NSNull(),
                "location":      ev.location ?? NSNull(),
                "startAt":       iso.string(from: ev.startDate),
                "endAt":         iso.string(from: ev.endDate),
                "allDay":        ev.isAllDay,
                "isPrivate":     isPrivate,
            ]
            // Prune NSNull for JSON cleanliness.
            row = row.compactMapValues { ($0 is NSNull) ? nil : $0 }
            return row
        }

        call.resolve(["events": formatted])
    }
}
```

- [ ] **Step 2: Register in `MainViewController.capacitorDidLoad`**

Locate the block in `ios/App/App/MainViewController.swift` where other plugins are registered (near `bridge?.registerPluginInstance(GWSpeechPlugin())`). Add:

```swift
bridge?.registerPluginInstance(GWCalendarPlugin())
```

- [ ] **Step 3: Add Info.plist strings**

Add these two keys inside the `<dict>` of `ios/App/App/Info.plist`:

```xml
<key>NSCalendarsUsageDescription</key>
<string>GleeWorld shows your iPhone Calendar events alongside your choir schedule.</string>
<key>NSCalendarsFullAccessUsageDescription</key>
<string>GleeWorld shows your iPhone Calendar events alongside your choir schedule.</string>
```

- [ ] **Step 4: Update pbxproj to include GWCalendarPlugin.swift**

Find the existing `GWSpeechPlugin.swift` entries in `ios/App/App.xcodeproj/project.pbxproj` and add matching lines for `GWCalendarPlugin.swift`. Follow the same 3-place pattern (PBXBuildFile, PBXFileReference, sources group + build phase). Use a fresh unique ID pair like `6A1D00000000000000000005` / `6A1D00000000000000000006`.

- [ ] **Step 5: Commit**

```bash
git add ios/App/App/GWCalendarPlugin.swift ios/App/App/MainViewController.swift ios/App/App/Info.plist ios/App/App.xcodeproj/project.pbxproj
git commit -m "ios: GWCalendarPlugin (EventKit bridge) + Info.plist strings"
```

---

## Task 3: TypeScript plugin shim

**Files:**
- Create: `src/plugins/gwCalendar.ts`

**Interfaces:**
- Produces: `GWCalendar` (registered plugin) with typed methods, `GWCalendarEvent` interface, `isNativeCalendarAvailable()` boolean.

- [ ] **Step 1: Create the file**

```ts
import { Capacitor, registerPlugin } from '@capacitor/core';

export interface GWCalendarEvent {
  ekId: string;
  calendarTitle: string | null;
  title: string | null;
  description: string | null;
  location: string | null;
  startAt: string; // ISO
  endAt:   string; // ISO
  allDay: boolean;
  isPrivate: boolean;
}

export interface GWCalendarStatus {
  granted: boolean;
  status: 'notDetermined' | 'restricted' | 'denied' | 'authorized' | 'writeOnly' | 'unknown';
}

export interface GWCalendarPluginShape {
  requestAccess(): Promise<GWCalendarStatus>;
  checkAccess():   Promise<GWCalendarStatus>;
  readEvents(opts: { fromIso: string; toIso: string }): Promise<{ events: GWCalendarEvent[] }>;
}

export const GWCalendar = registerPlugin<GWCalendarPluginShape>('GWCalendar');

export function isNativeCalendarAvailable(): boolean {
  return Capacitor.getPlatform() === 'ios';
}
```

- [ ] **Step 2: Type-check**

```bash
cd /tmp/gleeworld-ios-cal-20204 && npx tsc --noEmit 2>&1 | grep gwCalendar | head
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/plugins/gwCalendar.ts
git commit -m "plugin: gwCalendar TS shim"
```

---

## Task 4: Edge function `ios-calendar-sync`

**Files:**
- Create: `supabase/functions/ios-calendar-sync/index.ts`
- Create: `supabase/functions/ios-calendar-sync/runSync.ts`
- Create: `supabase/functions/ios-calendar-sync/__tests__/sync.test.ts`

**Interfaces:**
- Consumes: `gw_ios_events` (Task 1).
- Produces: POST `/functions/v1/ios-calendar-sync` accepting `{ events: GWCalendarEvent[], fromIso, toIso }` and returning `{ ok: true, upserted, deleted } | { error, detail? }`.

- [ ] **Step 1: Write the failing tests**

Create `supabase/functions/ios-calendar-sync/__tests__/sync.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { runSync } from '../runSync';

function stubSupabase(opts: {
  upsertResult?: { data: any; count: number | null; error: any };
  deleteResult?: { data: any[] | null; error: any };
}) {
  const upsertResult = opts.upsertResult ?? { data: [], count: 0, error: null };
  const deleteResult = opts.deleteResult ?? { data: [], error: null };
  const calls: Array<{ table: string; op: string; body?: any; filters: any[] }> = [];
  const mkDeleteChain = (table: string) => {
    const filters: any[] = [];
    const chain: any = {
      eq:  (c: string, v: any) => { filters.push({ eq: [c, v] });  return chain; },
      gte: (c: string, v: any) => { filters.push({ gte: [c, v] }); return chain; },
      lte: (c: string, v: any) => { filters.push({ lte: [c, v] }); return chain; },
      not: (c: string, op: string, v: any) => { filters.push({ not: [c, op, v] }); return chain; },
      select: () => { calls.push({ table, op: 'delete', filters }); return Promise.resolve(deleteResult); },
    };
    return chain;
  };
  const supabase: any = {
    from: (table: string) => ({
      upsert: (body: any, _opts: any) => {
        calls.push({ table, op: 'upsert', body, filters: [] });
        return Promise.resolve(upsertResult);
      },
      delete: () => mkDeleteChain(table),
    }),
  };
  return { supabase, calls };
}

const win = { fromIso: '2026-07-13T00:00:00Z', toIso: '2026-10-25T00:00:00Z' };
const uid = 'user-1';

describe('runSync', () => {
  it('upserts every event and returns count', async () => {
    const { supabase, calls } = stubSupabase({ upsertResult: { data: [], count: 2, error: null } });
    const res = await runSync({
      supabase, user_id: uid, tenant_id: 'tenant-a',
      events: [
        { ekId: 'e1', calendarTitle: 'Personal', title: 'A', description: null, location: null, startAt: '2026-07-15T10:00:00Z', endAt: '2026-07-15T11:00:00Z', allDay: false, isPrivate: false },
        { ekId: 'e2', calendarTitle: 'Work',     title: 'B', description: null, location: null, startAt: '2026-07-16T10:00:00Z', endAt: '2026-07-16T11:00:00Z', allDay: false, isPrivate: true  },
      ],
      ...win,
    });
    expect(res).toMatchObject({ ok: true, upserted: 2 });
    const up = calls.find(c => c.op === 'upsert');
    expect(up).toBeDefined();
    expect(up!.body).toHaveLength(2);
    expect(up!.body[0]).toMatchObject({ user_id: uid, apple_event_id: 'e1', title: 'A', is_private: false });
  });

  it('sweeps rows within window not in the seen list', async () => {
    const { supabase, calls } = stubSupabase({ upsertResult: { data: [], count: 1, error: null }, deleteResult: { data: [{ id: 'd1' }], error: null } });
    const res = await runSync({
      supabase, user_id: uid, tenant_id: 'tenant-a',
      events: [{ ekId: 'e1', calendarTitle: 'p', title: 'A', description: null, location: null, startAt: '2026-07-15T10:00:00Z', endAt: '2026-07-15T11:00:00Z', allDay: false, isPrivate: false }],
      ...win,
    });
    expect(res.deleted).toBe(1);
    const del = calls.find(c => c.op === 'delete');
    expect(del).toBeDefined();
    expect(del!.filters).toEqual(expect.arrayContaining([
      { eq: ['user_id', uid] },
      { gte: ['start_at', win.fromIso] },
      { lte: ['start_at', win.toIso] },
    ]));
    expect(del!.filters.some((f: any) => f.not?.[0] === 'apple_event_id')).toBe(true);
  });

  it('with empty events, still runs the delete-in-window (sentinel)', async () => {
    const { supabase, calls } = stubSupabase();
    await runSync({ supabase, user_id: uid, tenant_id: 'tenant-a', events: [], ...win });
    expect(calls.find(c => c.op === 'delete')).toBeDefined();
  });

  it('rejects oversize event lists', async () => {
    const { supabase } = stubSupabase();
    const events = Array.from({ length: 501 }, (_, i) => ({ ekId: `e${i}`, calendarTitle: 'p', title: 'x', description: null, location: null, startAt: '2026-07-15T10:00:00Z', endAt: '2026-07-15T11:00:00Z', allDay: false, isPrivate: false }));
    const res = await runSync({ supabase, user_id: uid, tenant_id: 'tenant-a', events, ...win });
    expect((res as any).error).toBe('too_many_events');
  });

  it('rejects oversized sync windows', async () => {
    const { supabase } = stubSupabase();
    const res = await runSync({ supabase, user_id: uid, tenant_id: 'tenant-a', events: [], fromIso: '2020-01-01T00:00:00Z', toIso: '2027-01-01T00:00:00Z' });
    expect((res as any).error).toBe('window_too_large');
  });
});
```

- [ ] **Step 2: Run to verify FAIL**

```bash
cd /tmp/gleeworld-ios-cal-20204 && npx vitest run supabase/functions/ios-calendar-sync/__tests__/sync.test.ts
```

Expected: file-not-found on `../runSync`.

- [ ] **Step 3: Implement `runSync.ts`**

```ts
export interface GWCalendarEvent {
  ekId: string;
  calendarTitle: string | null;
  title: string | null;
  description: string | null;
  location: string | null;
  startAt: string;
  endAt:   string;
  allDay: boolean;
  isPrivate: boolean;
}

export interface RunSyncInput {
  supabase: any;
  user_id: string;
  tenant_id: string;
  events: GWCalendarEvent[];
  fromIso: string;
  toIso:   string;
}

export type RunSyncResult =
  | { ok: true; upserted: number; deleted: number }
  | { error: 'too_many_events' | 'window_too_large' | 'save_failed'; detail?: string };

const MAX_EVENTS = 500;
const MAX_WINDOW_MS = 180 * 24 * 60 * 60 * 1000;

export async function runSync(input: RunSyncInput): Promise<RunSyncResult> {
  const { supabase, user_id, tenant_id, events, fromIso, toIso } = input;

  if (events.length > MAX_EVENTS) return { error: 'too_many_events' };
  const from = new Date(fromIso).getTime();
  const to   = new Date(toIso).getTime();
  if (!Number.isFinite(from) || !Number.isFinite(to) || to - from > MAX_WINDOW_MS) {
    return { error: 'window_too_large' };
  }

  const rows = events.map((e) => ({
    user_id,
    tenant_id,
    apple_event_id: e.ekId,
    calendar_title: e.calendarTitle,
    title:          e.title,
    description:    e.description,
    location:       e.location,
    start_at:       e.startAt,
    end_at:         e.endAt,
    all_day:        e.allDay,
    is_private:     e.isPrivate,
    synced_at:      new Date().toISOString(),
  }));

  let upserted = 0;
  if (rows.length > 0) {
    const { count, error } = await supabase
      .from('gw_ios_events')
      .upsert(rows, { onConflict: 'user_id,apple_event_id', count: 'exact' });
    if (error) return { error: 'save_failed', detail: error.message };
    upserted = count ?? rows.length;
  }

  // Sweep any prior rows in the window that Google didn't return.
  // Empty list → __none__ sentinel so the "not in" filter stays well-formed.
  const idList = events.length ? events.map(e => e.ekId) : ['__none__'];
  const { data: deletedRows, error: delErr } = await supabase
    .from('gw_ios_events')
    .delete()
    .eq('user_id', user_id)
    .gte('start_at', fromIso)
    .lte('start_at', toIso)
    .not('apple_event_id', 'in', `(${idList.map(id => `"${id}"`).join(',')})`)
    .select('id');
  if (delErr) return { error: 'save_failed', detail: delErr.message };

  return { ok: true, upserted, deleted: (deletedRows ?? []).length };
}
```

- [ ] **Step 4: Implement `index.ts`**

```ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { runSync, type GWCalendarEvent } from './runSync.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

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

  // Resolve tenant_id via profile so the row gets stamped correctly even
  // if the RPC trigger's current_tenant_id() misses (e.g. header-less
  // sync from a fresh install).
  const { data: profile } = await admin.from('gw_profiles').select('tenant_id').eq('user_id', user.id).maybeSingle();
  const tenant_id = (profile as any)?.tenant_id ?? null;
  if (!tenant_id) {
    return new Response(JSON.stringify({ error: 'no_tenant' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  let body: { events?: GWCalendarEvent[]; fromIso?: string; toIso?: string };
  try { body = await req.json(); } catch { return new Response(JSON.stringify({ error: 'bad_request' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }

  const events = Array.isArray(body.events) ? body.events : [];
  const fromIso = String(body.fromIso ?? '');
  const toIso   = String(body.toIso ?? '');
  if (!fromIso || !toIso) {
    return new Response(JSON.stringify({ error: 'bad_request' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const result = await runSync({ supabase, user_id: user.id, tenant_id, events, fromIso, toIso });
  const status = 'ok' in result ? 200 : (result.error === 'save_failed' ? 500 : 400);
  return new Response(JSON.stringify(result), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
```

- [ ] **Step 5: Run tests to verify PASS**

```bash
cd /tmp/gleeworld-ios-cal-20204 && npx vitest run supabase/functions/ios-calendar-sync/__tests__/sync.test.ts
```

Expected: 5 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/ios-calendar-sync/
git commit -m "ios-calendar-sync: edge fn with upsert + sweep"
```

---

## Task 5: Client hooks — useIosEvents, useIosCalendarAccess, useIosCalendarSync

**Files:**
- Create: `src/hooks/useIosCalendar.ts`

**Interfaces:**
- Consumes: `GWCalendar`, `isNativeCalendarAvailable` (Task 3), edge fn `ios-calendar-sync` (Task 4).
- Produces:
  - `IosEventRow` interface.
  - `useIosEvents()` → TanStack `useQuery` on `gw_ios_events`.
  - `useIosCalendarAccess()` → refreshable status.
  - `useIosCalendarSync()` → mutation that reads native events + posts to edge fn.

- [ ] **Step 1: Write the hook file**

```ts
// Personal iPhone-calendar sync — iOS app only.

import { useCallback, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { GWCalendar, isNativeCalendarAvailable, type GWCalendarStatus } from '@/plugins/gwCalendar';

export interface IosEventRow {
  id: string;
  apple_event_id: string;
  calendar_title: string | null;
  title: string | null;
  description: string | null;
  location: string | null;
  start_at: string;
  end_at:   string;
  all_day: boolean;
  is_private: boolean;
}

const IOS_EVENTS_KEY = ['ios-events'];

export function useIosEvents() {
  return useQuery<IosEventRow[]>({
    queryKey: IOS_EVENTS_KEY,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_ios_events')
        .select('id, apple_event_id, calendar_title, title, description, location, start_at, end_at, all_day, is_private')
        .order('start_at');
      if (error) throw error;
      return (data as IosEventRow[]) || [];
    },
  });
}

export function useIosCalendarAccess() {
  const [status, setStatus] = useState<GWCalendarStatus | null>(null);
  const refresh = useCallback(async () => {
    if (!isNativeCalendarAvailable()) { setStatus({ granted: false, status: 'restricted' }); return; }
    try { setStatus(await GWCalendar.checkAccess()); }
    catch { setStatus({ granted: false, status: 'denied' }); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  const request = useCallback(async () => {
    if (!isNativeCalendarAvailable()) return { granted: false, status: 'restricted' as const };
    const s = await GWCalendar.requestAccess();
    setStatus(s);
    return s;
  }, []);
  return { status, refresh, request };
}

export function useIosCalendarSync() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!isNativeCalendarAvailable()) throw new Error('not_on_ios');
      const from = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
      const to   = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
      const { events } = await GWCalendar.readEvents({ fromIso: from.toISOString(), toIso: to.toISOString() });
      const { data, error } = await supabase.functions.invoke('ios-calendar-sync', {
        body: { events, fromIso: from.toISOString(), toIso: to.toISOString() },
      });
      if (error) throw error;
      const body = data as { ok?: boolean; upserted?: number; deleted?: number; error?: string };
      if (body?.error) throw new Error(body.error);
      return { upserted: body.upserted ?? 0, deleted: body.deleted ?? 0 };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: IOS_EVENTS_KEY });
      qc.invalidateQueries({ queryKey: ['events'] });
    },
  });
}
```

- [ ] **Step 2: Type-check**

```bash
cd /tmp/gleeworld-ios-cal-20204 && npx tsc --noEmit 2>&1 | grep useIosCalendar | head
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useIosCalendar.ts
git commit -m "hooks: useIosEvents + useIosCalendarAccess + useIosCalendarSync"
```

---

## Task 6: IosCalendarPanel — Sync-tab UI

**Files:**
- Create: `src/components/calendar/command-center/IosCalendarPanel.tsx`
- Create: `src/components/calendar/command-center/IosCalendarPanel.test.tsx`
- Modify: `src/components/calendar/command-center/CalendarSettingsDialog.tsx` — mount the panel in the Sync tab.

**Interfaces:**
- Consumes: hooks from Task 5.
- Produces: default export `IosCalendarPanel` (no props). Renders only when `isNativeCalendarAvailable()`.

- [ ] **Step 1: Write failing test**

Create `IosCalendarPanel.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { IosCalendarPanel } from './IosCalendarPanel';

const mockPlatform = vi.fn(() => 'ios');
const mockRequest = vi.fn(async () => ({ granted: true, status: 'authorized' }));
const mockSync    = vi.fn(async () => ({ upserted: 4, deleted: 1 }));

vi.mock('@/plugins/gwCalendar', () => ({
  isNativeCalendarAvailable: () => mockPlatform() === 'ios',
  GWCalendar: {},
}));
vi.mock('@/hooks/useIosCalendar', () => ({
  useIosCalendarAccess: () => ({ status: { granted: true, status: 'authorized' }, refresh: vi.fn(), request: mockRequest }),
  useIosCalendarSync:   () => ({ mutateAsync: mockSync, isPending: false }),
}));

afterEach(() => { cleanup(); mockPlatform.mockReturnValue('ios'); mockRequest.mockClear(); mockSync.mockClear(); });

function wrap(children: React.ReactNode) {
  const qc = new QueryClient();
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('IosCalendarPanel', () => {
  it('renders nothing on non-iOS platforms', () => {
    mockPlatform.mockReturnValue('web');
    const { container } = render(wrap(<IosCalendarPanel />));
    expect(container.firstChild).toBeNull();
  });

  it('shows "Pull from iPhone" and calls sync on click when granted', async () => {
    render(wrap(<IosCalendarPanel />));
    const btn = screen.getByRole('button', { name: /Pull from iPhone/i });
    fireEvent.click(btn);
    await waitFor(() => expect(mockSync).toHaveBeenCalled());
  });
});
```

- [ ] **Step 2: Run to verify FAIL**

```bash
cd /tmp/gleeworld-ios-cal-20204 && npx vitest run src/components/calendar/command-center/IosCalendarPanel.test.tsx
```

Expected: FAIL — component not found.

- [ ] **Step 3: Implement `IosCalendarPanel.tsx`**

```tsx
import { useState } from 'react';
import { Loader2, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { isNativeCalendarAvailable } from '@/plugins/gwCalendar';
import { useIosCalendarAccess, useIosCalendarSync } from '@/hooks/useIosCalendar';

export function IosCalendarPanel() {
  if (!isNativeCalendarAvailable()) return null;
  const { status, request } = useIosCalendarAccess();
  const sync = useIosCalendarSync();
  const [pulling, setPulling] = useState(false);

  const runPull = async () => {
    setPulling(true);
    try {
      const r = await sync.mutateAsync();
      toast.success(`Pulled ${r.upserted} events${r.deleted ? `, removed ${r.deleted} stale` : ''}.`);
    } catch (e: any) {
      toast.error('iPhone sync failed — ' + (e?.message ?? String(e)));
    } finally {
      setPulling(false);
    }
  };

  const grantAndPull = async () => {
    const s = await request();
    if (s.granted) void runPull();
    else toast.error('Calendar access denied. Enable it in Settings → GleeWorld → Calendars.');
  };

  const granted = status?.granted === true;

  return (
    <section className="rounded-lg border border-border p-4 space-y-3">
      <header className="flex items-center gap-2 text-sm font-semibold">
        <Smartphone className="w-4 h-4 text-muted-foreground" />
        iPhone Calendar (iOS app only)
      </header>
      <p className="text-sm text-muted-foreground">
        Pull events from your iPhone Calendar so they appear alongside choir events.
      </p>
      {!granted && (
        <button
          type="button"
          onClick={grantAndPull}
          className="h-9 px-4 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          Grant Access
        </button>
      )}
      {granted && (
        <button
          type="button"
          onClick={runPull}
          disabled={pulling}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 transition-colors"
        >
          {pulling && <Loader2 className="w-4 h-4 animate-spin" />}
          Pull from iPhone
        </button>
      )}
    </section>
  );
}
```

- [ ] **Step 4: Mount in the Sync tab of `CalendarSettingsDialog.tsx`**

Locate the Sync tab body where `GoogleConnectionPanel` is rendered. Import `IosCalendarPanel` and mount it BELOW the Google panel:

```tsx
import { IosCalendarPanel } from './IosCalendarPanel';
// ... inside the sync-tab body ...
<GoogleConnectionPanel />
<IosCalendarPanel />
```

- [ ] **Step 5: Run tests to verify PASS**

```bash
cd /tmp/gleeworld-ios-cal-20204 && npx vitest run src/components/calendar/command-center/IosCalendarPanel.test.tsx
```

Expected: 2 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/calendar/command-center/IosCalendarPanel.tsx src/components/calendar/command-center/IosCalendarPanel.test.tsx src/components/calendar/command-center/CalendarSettingsDialog.tsx
git commit -m "IosCalendarPanel: Sync-tab entry to grant access + pull events"
```

---

## Task 7: Auto-pull on app foreground

**Files:**
- Create: `src/components/app/IosCalendarAutoPull.tsx`
- Modify: `src/App.tsx` — mount at the top-level (inside AuthProvider so the sync only fires for signed-in users).

**Interfaces:**
- Consumes: `useIosCalendarSync`, `useIosCalendarAccess`, `Capacitor.App` foreground listener.
- Produces: no visible UI; a mount-and-forget effect.

- [ ] **Step 1: Implement `IosCalendarAutoPull.tsx`**

```tsx
import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { isNativeCalendarAvailable } from '@/plugins/gwCalendar';
import { useIosCalendarAccess, useIosCalendarSync } from '@/hooks/useIosCalendar';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Fires a silent iOS Calendar pull on:
 *   - initial mount (once, only when signed in + permission granted)
 *   - every subsequent app foreground (`App.addListener('appStateChange')`)
 *
 * Guarded on platform, auth, and permission — no-op elsewhere.
 * No user-visible UI. Failures land in the console; the manual
 * "Pull from iPhone" button surfaces errors to the user.
 */
export function IosCalendarAutoPull() {
  const { user } = useAuth();
  const { status } = useIosCalendarAccess();
  const sync = useIosCalendarSync();
  const lastFireRef = useRef<number>(0);

  useEffect(() => {
    if (!isNativeCalendarAvailable()) return;
    if (!user) return;
    if (!status?.granted) return;

    // 30-second cooldown to avoid firing multiple times when
    // foreground events fire in bursts (iOS occasionally does).
    const maybeFire = () => {
      const now = Date.now();
      if (now - lastFireRef.current < 30_000) return;
      lastFireRef.current = now;
      sync.mutateAsync().catch((e) => console.warn('[ios-cal] auto-pull failed', e));
    };

    // Initial pull on mount.
    maybeFire();

    let handle: { remove?: () => void } | null = null;
    (async () => {
      handle = await CapApp.addListener('appStateChange', (s) => {
        if (s.isActive) maybeFire();
      });
    })();
    return () => { handle?.remove?.(); };
  // sync.mutateAsync is stable per-hook; we intentionally exclude it.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, status?.granted, Capacitor.getPlatform()]);

  return null;
}
```

- [ ] **Step 2: Mount in `App.tsx`**

Locate the top-level component tree in `src/App.tsx` where `AuthProvider` and other top-level providers live. Add `<IosCalendarAutoPull />` inside the AuthProvider tree (must be inside so `useAuth()` works). One import + one component tag.

- [ ] **Step 3: Type-check + build**

```bash
cd /tmp/gleeworld-ios-cal-20204 && npx tsc --noEmit 2>&1 | grep -E "IosCalendarAutoPull|App\.tsx" | head
```

Expected: no new errors.

```bash
cd /tmp/gleeworld-ios-cal-20204 && npm run build 2>&1 | tail -5
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/components/app/IosCalendarAutoPull.tsx src/App.tsx
git commit -m "IosCalendarAutoPull: silent pull on app foreground"
```

---

## Task 8: CommandCenterCalendar — synthesize iOS events into render

**Files:**
- Modify: `src/components/calendar/command-center/CommandCenterCalendar.tsx`

**Interfaces:**
- Consumes: `useIosEvents` (Task 5).
- Produces: additional synthetic entries in the events list that the calendar grid already renders. Mirror the existing `googleRows` pattern.

- [ ] **Step 1: Import + subscribe**

Near the existing `import { useGoogleEvents }...` and `const { data: googleRows }` in `CommandCenterCalendar.tsx`, add:

```ts
import { useIosEvents } from '@/hooks/useIosCalendar';
// ...
const { data: iosRows = [] } = useIosEvents();
```

- [ ] **Step 2: Synthesize iOS events into the calendar data**

Locate the block that builds `synthetic` from `googleRows`. Add a parallel block for `iosRows`:

```ts
const iosSynthetic = iosRows
  .filter((g) => g.start_at)
  .map<GleeWorldEvent>((g) => ({
    id: 'ios-' + g.id,
    title: g.title || '(iPhone event)',
    description: g.description,
    event_type: 'personal_ios',
    category: 'personal_ios',
    start_date: g.start_at,
    end_date: g.end_at,
    location: g.location,
    venue_name: null,
    address: null,
    max_attendees: null,
    registration_required: false,
    is_public: false,
    status: null,
    calendar_id: null,
    course_id: null,
    created_by: null,
    created_at: null,
    updated_at: null,
    source: 'ios' as any,
    apple_event_id: g.apple_event_id,
  } as any));
return [...rawEvents, ...synthetic, ...iosSynthetic];
```

- [ ] **Step 3: Update the `useMemo` deps array**

The `useMemo` that builds the merged list already lists `[rawEvents, googleRows]`. Add `iosRows`.

- [ ] **Step 4: Build**

```bash
cd /tmp/gleeworld-ios-cal-20204 && npm run build 2>&1 | tail -5
```

Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/components/calendar/command-center/CommandCenterCalendar.tsx
git commit -m "CommandCenterCalendar: render iOS events alongside Google + native"
```

---

## Task 9: Deploy

**Files:** none — deploy only.

- [ ] **Step 1: Apply the migration to prod**

Controller: `cat supabase/migrations/20260727040000_gw_ios_events.sql | ssh root@198.211.113.144 'docker exec -i supabase-db psql -U postgres -d postgres -v ON_ERROR_STOP=1'`

- [ ] **Step 2: Deploy edge function**

```bash
cd /tmp/gleeworld-ios-cal-20204 && bash scripts/deploy-functions.sh ios-calendar-sync
```

- [ ] **Step 3: Deploy front-end**

```bash
cd /tmp/gleeworld-ios-cal-20204 && bash scripts/deploy-frontend.sh
```

- [ ] **Step 4: Kevin builds and uploads the iOS app**

Native plugin only takes effect after a fresh build:

```bash
cd /tmp/gleeworld-ios-cal-20204 && npx cap sync ios
```

Then Kevin archives + uploads to TestFlight from Xcode. Verify on device: open GleeWorld → Calendar Settings → Sync → iPhone Calendar → Grant Access → pull → verify events appear on the calendar view.

- [ ] **Step 5: Manual QA**

- Fresh install → prompt fires; grant → pull button works.
- Create a new event in iPhone Calendar → open GleeWorld → event appears within a few seconds of foreground.
- Delete the event → foreground GleeWorld → event disappears.
- Revoke Calendar access in Settings → open GleeWorld → panel returns to "Grant Access" state.

---

## Self-Review

**Spec coverage:**
- ✓ Migration → Task 1
- ✓ Native plugin (requestAccess/checkAccess/readEvents) → Task 2
- ✓ Info.plist strings → Task 2 Step 3
- ✓ Plugin registration → Task 2 Step 2
- ✓ TS shim → Task 3
- ✓ Edge function with upsert + sweep + size caps → Task 4
- ✓ Client hooks (`useIosEvents`, `useIosCalendarAccess`, `useIosCalendarSync`) → Task 5
- ✓ Sync-tab UI (grant/pull) → Task 6
- ✓ Auto-pull on foreground → Task 7
- ✓ Render iOS events in calendar → Task 8
- ✓ Deploy → Task 9

Phase 2 (Publish iOS events to shared calendars) explicitly deferred at the top of the plan.

**Placeholder scan:** none.

**Type consistency:** `GWCalendarEvent` shape identical across Swift plugin JSON output, TS shim, edge fn `runSync` input, `IosEventRow` DB projection. `RunSyncResult` matches client hook's mutation return.

Nothing to fix.
