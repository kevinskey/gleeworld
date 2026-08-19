# iOS Calendar → GleeWorld sync

**Date:** 2026-07-27
**Status:** Approved (Kevin, all defaults locked)

## Problem

Users create events in the iPhone Calendar app (iCloud, work accounts, subscribed calendars) and expect them to appear on GleeWorld's calendar view alongside Google-synced and native events. Today, only Google Calendar events flow in through the existing OAuth pull. Events living in iCloud or any device-only calendar are invisible.

## Non-goals

- Two-way sync. GleeWorld reads iOS events; changes originate in the iPhone Calendar app.
- Background/silent sync. Requires a separate iOS entitlement — deferred.
- Web/desktop sync. This feature only ships on the iOS app; the sync button and iOS-sourced events are hidden elsewhere.
- CalDAV-based server-side pull. Different architecture — parked.

## Locked decisions

1. **All device-enabled calendars** pull; no per-calendar picker in v1.
2. **Sync window**: 14 days back, 90 days forward — mirrors Google sync.
3. **Sync trigger**: manual "Pull from iPhone" button + auto-pull on app foreground. No background sync.
4. **Same "Publish to shared calendar" affordance** on iOS events as on Google events (via the existing `PublishToCalendarPicker`, reusing the `google-event-share` code path once widened).
5. **Storage table** `gw_ios_events` mirroring `gw_google_events`, with `apple_event_id` unique per user.
6. **Sensitive-event filter**: skip events where `EKEvent.isDetached && title == nil`, events marked as `.confidential`, and the built-in "Birthdays" calendar (source type `.birthdays`).

## Architecture

Different from Google: the sync is **client-initiated**, not server-scheduled. The native iOS plugin reads EventKit, the app POSTs the event set to a new edge function, the edge function upserts + sweeps within the sync window. No OAuth, no stored tokens — the device permission is the only credential.

### iOS Native (Swift)

**New plugin** `GWCalendarPlugin.swift` (mirrors `GWSpeechPlugin` pattern):

```swift
@objc(GWCalendarPlugin)
public class GWCalendarPlugin: CAPPlugin, CAPBridgedPlugin {
  public let identifier = "GWCalendarPlugin"
  public let jsName = "GWCalendar"
  public let pluginMethods: [CAPPluginMethod] = [
    CAPPluginMethod(name: "requestAccess", returnType: CAPPluginReturnPromise),
    CAPPluginMethod(name: "checkAccess",   returnType: CAPPluginReturnPromise),
    CAPPluginMethod(name: "readEvents",    returnType: CAPPluginReturnPromise),
  ]
  // ...
}
```

Methods:
- `requestAccess()` → prompts iOS permission if needed; returns `{ granted: bool, status: 'authorized' | 'denied' | 'notDetermined' | 'restricted' }`. Uses `EKEventStore.requestFullAccessToEvents` (iOS 17+) with fallback to `.requestAccess(to: .event)` for earlier iOS.
- `checkAccess()` → returns current authorization status without prompting.
- `readEvents({ fromIso, toIso })` → returns `{ events: [{ ekId, calendarTitle, title, description, location, startAt, endAt, allDay, isPrivate }] }` in the given window. Filters:
  - Skip events whose calendar `source.sourceType == .birthdays`.
  - Skip events where `availability == .free` AND title is empty (junk from imported webcal calendars).
  - Skip events with `EKEventAvailability.free` if the user has explicitly opted them out — no toggle in v1, so keep all non-birthday, non-empty events.
  - Skip events whose `hasNotes == false && hasAttendees == false && title == nil` (pure clutter).
  - Emit `isPrivate = true` when the underlying `EKEvent.availability` is `.busy` and the source has a "private" flag OR calendar's title contains "Personal" (defensive filter; the server sync itself never leaks — this just gives the model a signal).

**Info.plist entry** — `NSCalendarsUsageDescription = "GleeWorld shows your iPhone Calendar events alongside your choir schedule."` and (iOS 17+) `NSCalendarsFullAccessUsageDescription` with the same copy.

**Registration** — one line in `MainViewController.capacitorDidLoad`:

```swift
bridge?.registerPluginInstance(GWCalendarPlugin())
```

### TS plugin shim

`src/plugins/gwCalendar.ts` — mirrors `gwSpeech.ts`:

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

export interface GWCalendarPluginShape {
  requestAccess(): Promise<{ granted: boolean; status: string }>;
  checkAccess():   Promise<{ granted: boolean; status: string }>;
  readEvents(opts: { fromIso: string; toIso: string }): Promise<{ events: GWCalendarEvent[] }>;
}

export const GWCalendar = registerPlugin<GWCalendarPluginShape>('GWCalendar');
export function isNativeCalendarAvailable(): boolean {
  return Capacitor.getPlatform() === 'ios';
}
```

### Migration

`supabase/migrations/20260727040000_gw_ios_events.sql` — mirror `gw_google_events`:

```sql
CREATE TABLE public.gw_ios_events (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL DEFAULT current_tenant_id(),
  user_id           uuid NOT NULL REFERENCES auth.users(id),
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
  UNIQUE (user_id, apple_event_id)
);

-- Multi-tenant guard: DEFAULT + trigger + RESTRICTIVE RLS + user-scoped
-- PERMISSIVE, matches gw_google_events precisely.
CREATE OR REPLACE FUNCTION public.gw_ios_events_set_tenant()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN NEW.tenant_id := current_tenant_id(); END IF;
  RETURN NEW;
END $$;

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

CREATE INDEX gw_ios_events_user_start_idx ON public.gw_ios_events (user_id, start_at);
```

### Edge function `ios-calendar-sync`

POST `/functions/v1/ios-calendar-sync` accepting:

```json
{
  "events": [{ "ekId": "...", "calendarTitle": "...", "title": "...", ... }],
  "fromIso": "2026-07-13T...",
  "toIso":   "2026-10-25T..."
}
```

Flow (all under caller JWT via user client):

1. Validate: caller authenticated (via admin JWT check), body shape ok, sync window bounded (reject > 180 days).
2. Upsert every event into `gw_ios_events` with `onConflict: 'user_id,apple_event_id'`, marking `synced_at = now()`.
3. Sweep: `DELETE FROM gw_ios_events WHERE user_id=auth.uid() AND start_at BETWEEN fromIso AND toIso AND apple_event_id NOT IN (<posted set>)` — mirrors google-sync's calendar-not-in-set sweep.
4. Propagate updates + deletes to shared `gw_events` copies (mirrors `google-sync/propagate.ts`, extended to accept `external_source='ios_calendar'`).
5. Return `{ ok: true, upserted, deleted }`.

### Client hooks

`src/hooks/useIosCalendarSync.ts` (new):

- `useIosEvents()` — mirrors `useGoogleEvents`; queries `gw_ios_events` under caller JWT.
- `useIosCalendarAccess()` — checks native permission status.
- `useIosCalendarSync()` — mutation: reads via `GWCalendar.readEvents({ from, to })`, posts to `ios-calendar-sync` edge fn, invalidates `['events']` + `['ios-events']`.

### Client UI

**Calendar Settings → Sync tab** — new panel below Google Calendar (iOS-app only, hidden elsewhere):

```
┌────────────────────────────────────────────┐
│ iPhone Calendar (iOS app only)             │
│                                            │
│ Pull events from your iPhone into GleeWorld│
│ so they appear alongside choir events.     │
│                                            │
│ [Grant Access] / [Pull from iPhone]        │
│                                            │
│ Last sync: 3 min ago (17 events)           │
└────────────────────────────────────────────┘
```

**CommandCenterCalendar** — extends the synthetic Google-event mapping to also include iOS events:

```ts
const iosSynthetic = iosRows.map(g => ({
  id: 'ios-' + g.id,
  title: g.title || '(iPhone event)',
  event_type: 'personal_ios',
  category: 'personal_ios',
  start_date: g.start_at,
  end_date: g.end_at,
  location: g.location,
  is_public: false,
  calendar_id: null,
  source: 'ios' as any,
  apple_event_id: g.apple_event_id,
  ios_row_id: g.id,
}));
```

**Auto-pull on app foreground** — subscribe to Capacitor `App.addListener('appStateChange', ...)` in a top-level effect that also fires the pull on mount. Guarded on `Capacitor.getPlatform() === 'ios'` and permission-granted.

**Publish-to-shared-calendar for iOS events** — extend `google-event-share` to accept a source discriminator, OR ship a new `ios-event-share` with the same shape. Simpler: **generalize** the existing edge function into `event-share` accepting `{ source: 'google_calendar' | 'ios_calendar', source_event_id, calendar_id }`. Same for unshare. Rename in the same commit for consistency.

Widen `PublishToCalendarPicker` prop from `googleEventId` → `sourceEventId` + `source` and `EventPeekPopover` gates on both `isGoogleEvent` and `isIosEvent` (both open the same picker). Unshare's `isSharedFromGoogle` becomes `isSharedFromExternal`, matching `external_source IN ('google_calendar', 'ios_calendar')`.

Alternatively, ship a duplicate `ios-event-share` in v1 and refactor to a single fn later. Simpler but leaves debt. **Recommendation: generalize now.**

### Data flow

```
User taps "Pull from iPhone" on Calendar Settings
  → useIosCalendarSync.mutate
  → GWCalendar.readEvents({ from: T-14d, to: T+90d })
  → POST /functions/v1/ios-calendar-sync with { events, fromIso, toIso }
  → server upserts gw_ios_events, sweeps deletes, propagates shared copies
  → client invalidates ['events', 'ios-events']
  → CommandCenterCalendar re-renders with iOS events mixed in

User creates event in iPhone Calendar app
  → next foreground opens GleeWorld
  → auto-pull fires
  → event appears

User deletes iPhone event
  → next foreground pull
  → sweep removes gw_ios_events row + any shared gw_events copy

User taps iOS event → popover → "Publish to calendar…"
  → picker (unchanged UI)
  → event-share({ source: 'ios_calendar', source_event_id: apple_event_id, calendar_id })
  → gw_events row created; tenant sees it
```

## Security

- **Device permission**: native EKEventStore access is the credential; iOS handles the prompt.
- **Server RLS**: `gw_ios_events` uses the same 2-layer (user + tenant) RLS as `gw_google_events`.
- **No token storage**: unlike Google, there's no persisted secret. The user's JWT + device permission is the entire trust chain.
- **Cross-tenant safety**: same as Google — sync writes are tenant-stamped from the JWT claim; RLS gates every read.
- **Payload validation**: server rejects excessive event counts (> 500 per sync) and windows > 180 days.
- **PII**: Apple event ids are stable per-account UUIDs; storing them is required for the sweep to work. `apple_event_id` never leaves the tenant's DB.

## Testing

**iOS native**: manual only. Requires a device (Capacitor plugin behavior can't be fully unit-tested from Xcode simulator without EventKit fixtures). Verify: permission prompt shows once, revoked-permission surfaces gracefully, event count matches native Calendar app.

**Edge function**: unit tests with stubbed Supabase client — upsert happens, sweep filters correctly, oversize payload rejected.

**Client hooks**: `useIosEvents` query test, `useIosCalendarSync` mutation test with mocked plugin.

**Sync tab UI**: render tests for permission-gated state.

**Manual QA**:
- Fresh install → no permission → tap "Grant Access" → prompt → grant → tap "Pull from iPhone" → events appear.
- Create a new event in iPhone Calendar → open GleeWorld → event appears within seconds of foreground.
- Delete the iPhone event → open GleeWorld → event disappears.
- Publish an iOS event to shared calendar → verify tenant members see it.

## Open questions (none)

All 6 design questions locked.

## Deferred to later

- Per-calendar picker (choose which device calendars to sync).
- Background sync (needs iOS entitlement).
- Two-way sync (create/edit in GleeWorld, push to iOS).
- CalDAV server-side path (for non-iOS-app users).
