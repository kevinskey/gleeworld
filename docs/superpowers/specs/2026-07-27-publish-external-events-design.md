# Publish external calendar events to shared GleeWorld calendars — Phase 2

**Date:** 2026-07-27
**Status:** Approved (follows through on the iOS-calendar-sync spec's locked decision #4)

## Problem

Phase 1 shipped both Google Calendar sync and iPhone Calendar sync, so signed-in users see their personal external events on their own calendar view. Phase 1 also shipped the ability to publish **Google-sourced** events to a shared GleeWorld calendar. iOS-sourced events cannot yet be published — the `PublishToCalendarPicker` UI and the underlying `google-event-share` edge fn are hard-coded to the Google source.

## Non-goals

- Rename churn on `gw_events.external_source` values already in production. Existing `external_source='google_calendar'` rows stay; iOS-sourced rows use `external_source='ios_calendar'`.
- Any change to the `google-sync` propagation logic (already generalized enough to update its own tenant's shared copies).
- Support for arbitrary future external sources beyond these two. If a third source ever ships, the pattern extends the same way.

## Locked decisions

1. **Generalize the edge fn** — rename `google-event-share` → `event-share`, `google-event-unshare` → `event-unshare`. The API accepts `{ source: 'google_calendar' | 'ios_calendar', source_event_id, calendar_id }` for share, `{ shared_event_id }` for unshare (no change).
2. **Legacy edge fn cleanup** — the deployed droplet still serves `google-event-share` / `google-event-unshare` after this branch lands. `deploy-functions.sh` doesn't delete missing functions. Kevin can manually purge them from the droplet on his next cleanup pass; until then they just sit unused.
3. **`gw_ios_events` propagation** — extend `ios-calendar-sync` with the same update+delete propagation `google-sync` uses, so when a shared iOS event's source changes or vanishes, the shared copy updates or gets deleted.
4. **Unshare shape unchanged** — `event-unshare` still takes `{ shared_event_id }`; the `gw_events` row's `external_source` alone tells the fn which sweep pass to run. The origin_user_id gate is source-agnostic.
5. **Client hook rename** — `useShareGoogleEvent` → `useShareEvent(source)`, `useUnshareGoogleEvent` → `useUnshareEvent`. Same query invalidation keys.
6. **Client utility rename** — `isSharedFromGoogle(event, uid)` → `isSharedFromExternal(event, uid)`. Returns true when `external_source` is either `'google_calendar'` or `'ios_calendar'` AND `origin_user_id === uid`.
7. **Picker prop rename** — `PublishToCalendarPicker` prop changes from `googleEventId: string` → `sourceEventId: string; source: 'google_calendar' | 'ios_calendar'`.

## Architecture

Reuse the exact same `gw_events` shape from Phase 1. Reuse the exact same `origin_user_id` column + partial unique index (already covers both sources — the unique constraint is `(tenant_id, external_id, origin_user_id)` which is source-agnostic).

### Edge functions

**`event-share`** (formerly `google-event-share`)

Input: `{ source: 'google_calendar' | 'ios_calendar', source_event_id: string, calendar_id: string }`.

Flow:
1. Verify caller is authenticated.
2. Read the source event via the caller's JWT — RLS scopes to their own row:
   - `source === 'google_calendar'`: `SELECT ... FROM gw_google_events WHERE user_id = auth.uid() AND google_event_id = $source_event_id`.
   - `source === 'ios_calendar'`: `SELECT ... FROM gw_ios_events WHERE user_id = auth.uid() AND apple_event_id = $source_event_id`.
3. Verify the target calendar exists (RLS-scoped, tenant safe).
4. Upsert into `gw_events` with `onConflict='tenant_id,external_id,origin_user_id'`. Fields copied verbatim from the source; `external_source = <source>`, `external_id = <source_event_id>`, `origin_user_id = auth.uid()`.
5. Return `{ ok: true, shared_event_id }`.

**`event-unshare`** — no signature change. Still `{ shared_event_id }` in, `{ ok: true, deleted: <count> }` out. The DELETE filter widens from `external_source = 'google_calendar'` to `external_source IN ('google_calendar','ios_calendar')`.

**`ios-calendar-sync` propagation** — mirrors what `google-sync` already does:
1. After the per-sync upsert into `gw_ios_events`, iterate the events and run an UPDATE against `gw_events` where `origin_user_id = <caller>, external_source = 'ios_calendar', external_id = <apple_event_id>`. Mirrors `propagateUpdates`.
2. After sweep-delete on `gw_ios_events`, sweep `gw_events` where `external_id NOT IN (<seen list>)` within the sync window. Mirrors `propagateDeletes`.
3. Both guarded on there being no per-payload errors (Phase 1's `propagateDeletes` guard is `google-sync`-only; we replicate the pattern in `runSync.ts`).

Extract the propagation to a shared helper `supabase/functions/_shared/eventPropagation.ts` that both `google-sync` and `ios-calendar-sync` import — DRY the code, keep the semantic contract identical.

### Client

**Hooks (`src/hooks/useEventSharing.ts`, renamed exports):**

- `useShareEvent()` — signature: `mutateAsync({ source, source_event_id, calendar_id })`.
- `useUnshareEvent()` — unchanged: `mutateAsync({ shared_event_id })`.

Old names re-exported as aliases for one branch so the diff stays reviewable; deleted at the end of the plan.

**`PublishToCalendarPicker` — API change:**

```tsx
interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source: 'google_calendar' | 'ios_calendar';
  sourceEventId: string;
  onPublished?: (sharedEventId: string) => void;
}
```

Internal: mutation call becomes `mutateAsync({ source, source_event_id: sourceEventId, calendar_id: c.id })`.

**`isSharedFromExternal` in `src/utils/googleCalendarEvents.ts` (renamed):**

```ts
export function isSharedFromExternal(event, currentUserId): boolean {
  if (!event || !currentUserId) return false;
  const src = event.external_source;
  return (src === 'google_calendar' || src === 'ios_calendar') && event.origin_user_id === currentUserId;
}
```

Old `isSharedFromGoogle` kept as an alias for one branch, deleted at the end of the plan.

**`EventPeekPopover` — extend to iOS events:**

- New helper: `isIosSyncedEvent(event)` (mirror of `isGoogleSyncedEvent`) checks `event.source === 'ios'` or `id` starts with `ios-`.
- The "Publish to calendar…" button now shows for `isGoogleEvent OR isIosEvent`. The picker is called with:
  - `source = 'google_calendar'` and `sourceEventId = event.google_event_id` for Google events.
  - `source = 'ios_calendar'` and `sourceEventId = event.apple_event_id` for iOS events.
- The "Unshare from Google" button becomes "Unshare from personal calendar" and gates on `isSharedFromExternal(event, currentUserId)`.

**`CommandCenterCalendar` synthetic mapper** — Phase 1's iOS synthetic mapper already carries `apple_event_id`. No further change needed for the render; the popover reads it.

### Data flow

```
User taps "Publish to calendar…" on an iOS event
  → PublishToCalendarPicker(source='ios_calendar', sourceEventId=<apple_event_id>)
  → useShareEvent → event-share({ source, source_event_id, calendar_id })
  → server reads gw_ios_events → upserts gw_events (external_source='ios_calendar')
  → shared copy appears for tenant members

User edits event in iPhone Calendar
  → next foreground fires ios-calendar-sync
  → propagateUpdates runs on gw_events where external_source='ios_calendar'
  → shared copy updates

User deletes iPhone event
  → next foreground sync no longer returns the event
  → propagateDeletes removes gw_events shared copy

User taps Unshare on any external shared copy (Google OR iOS)
  → event-unshare({ shared_event_id })
  → server DELETE with source-agnostic filter
  → row disappears
```

## Security

- All reads under RLS via the caller's JWT — same as Phase 1's `runShare`.
- The source-lookup step is protected by the source's own user-scoped RLS: a Google event owned by user A cannot be published by user B, and same for iOS.
- Unshare is gated by `origin_user_id = auth.uid()` (unchanged).
- Cross-tenant safety: unchanged from Phase 1 — everything runs under the caller's tenant context.

## Testing

**Backend:**
- Rename existing runShare tests to point at the new file (verbatim). Add one new test per case (iOS-source path).
- Extract propagation to shared helper; adjust `google-sync/__tests__/propagate.test.ts` to import from the shared module.
- New `ios-calendar-sync/__tests__/propagate.test.ts` — same shape, iOS source.

**Client:**
- `PublishToCalendarPicker.test.tsx` gets one new test: iOS source path.
- `googleCalendarEvents.test.ts` gets `isSharedFromExternal` cases (both sources).
- `EventPeekPopover` integration flows tested manually per Phase 1 pattern.

**Manual QA:**
- Publish an iOS event → verify tenant members see it.
- Edit in iPhone Calendar → foreground → verify shared copy updates.
- Delete in iPhone Calendar → foreground → verify shared copy disappears.
- Unshare an iOS-shared event → verify row disappears.
- Old Google-shared events keep working (no regression).

## Open questions (none)

All locked.
