# Google-event → in-house calendar sharing

**Date:** 2026-07-27
**Status:** Approved (Kevin, all defaults locked)

## Problem

Users can pull their personal Google Calendar events into GleeWorld (private per user via existing RLS). They have no way to publish a chosen Google event so the rest of the tenant sees it on a shared in-house calendar. Today, doing this requires manually re-creating the event as a GleeWorld event, then keeping both copies in sync by hand.

## Non-goals

- Sharing a whole Google calendar (only individual events).
- Cross-tenant sharing.
- Sharing to a per-user private GleeWorld calendar (no-op — the event is already private on `gw_google_events`).
- Editing the Google event from inside GleeWorld (out of scope; this is a one-way lift).

## Locked decisions

1. **Live-updated**: subsequent Google edits (title, time, location) flow into the published GleeWorld copy on next sync.
2. **Delete on un-share and delete on Google-delete**: consistent, matches the linked mental model.
3. **No attribution badge**: published events blend in as regular GleeWorld events.
4. **No calendar restriction**: user picks any `gw_calendars` row in the current tenant.
5. **Any tenant member** can share.

## Architecture

Simplest possible shape: reuse `gw_events` as the canonical shared-event table. Add one nullable column so we know who to allow un-share. Reuse the two existing `external_source` + `external_id` columns to link back to Google. No new tables.

### Data model

**One-column migration** on `gw_events`:

```sql
ALTER TABLE public.gw_events
  ADD COLUMN IF NOT EXISTS origin_user_id uuid REFERENCES auth.users(id);

-- Republish idempotency: same user re-sharing the same Google event lands on
-- the same row instead of creating duplicates. Partial index because most
-- gw_events rows are not google-sourced.
CREATE UNIQUE INDEX IF NOT EXISTS gw_events_google_origin_uniq
  ON public.gw_events (tenant_id, external_id, origin_user_id)
  WHERE external_source = 'google_calendar';
```

Existing columns used:
- `gw_events.external_source` set to `'google_calendar'` on shared copies.
- `gw_events.external_id` set to the source `gw_google_events.google_event_id`.
- `gw_events.calendar_id` set to the user's picked target calendar.
- `gw_events.tenant_id` inherited from the caller.
- `gw_events.created_by` = `auth.uid()`.

`gw_google_events` untouched — source of truth stays private per user.

### Edge functions

**`google-event-share`** (new)

Input: `{ google_event_id: string, calendar_id: string }`.

Flow:
1. Verify caller is authenticated.
2. RLS-scoped read: `SELECT * FROM gw_google_events WHERE user_id = auth.uid() AND google_event_id = $1 LIMIT 1`. Bail if missing.
3. RLS-scoped read: `SELECT id FROM gw_calendars WHERE id = $1 LIMIT 1` (tenant RLS on `gw_calendars` gates cross-tenant misuse). Bail if missing.
4. Upsert into `gw_events` with `onConflict='tenant_id,external_id,origin_user_id' where external_source='google_calendar'`. Copy title / description / start_at / end_at / location / all_day from the Google event; set `external_source='google_calendar'`, `external_id=<google_event_id>`, `origin_user_id=auth.uid()`, `calendar_id=<picked>`, `event_type='shared_from_google'`, `is_private=false`, `status='scheduled'`.
5. Return `{ ok: true, shared_event_id: <gw_events.id> }`.

**`google-event-unshare`** (new)

Input: `{ shared_event_id: string }`.

Flow:
1. Verify caller is authenticated.
2. Delete `gw_events WHERE id = $1 AND origin_user_id = auth.uid() AND external_source = 'google_calendar'`. Return `{ ok: true, deleted: <count> }`.

Deleting via the caller's JWT means RLS naturally scopes to their tenant.

**`google-sync`** (existing, modified)

Today it fetches Google events and upserts into `gw_google_events`. Add propagation:

1. **Update propagation** — after each `gw_google_events` upsert, run a matching `UPDATE gw_events SET title=..., description=..., location=..., start_date=..., end_date=..., all_day=..., updated_at=now() WHERE origin_user_id = <caller> AND external_source = 'google_calendar' AND external_id = <google_event_id> AND tenant_id = <current tenant>`. Silent no-op when no matching row exists.
2. **Delete propagation** — after processing the full Google response for the current sync window, delete `gw_events` rows where `origin_user_id = <caller> AND external_source = 'google_calendar' AND external_id NOT IN (<google event ids from this sync>) AND tenant_id = <current tenant> AND start_date >= <sync window start> AND start_date <= <sync window end>`. The date bounds are important: sync only pulls a rolling window (say 60 days back / 90 days forward), so we can't tell "not returned" from "outside window" without them.

### Client (React)

Two touch points on the calendar view:

**1. Google-event card menu — "Publish to calendar…"**

- The calendar view already renders Google events differently (they come from `useGoogleEvents()` and land in `gw_google_events`). Add a dropdown item / long-press action "Publish to calendar…" on those cards only.
- Opens a small picker modal: header "Publish to a shared calendar", a list of the tenant's `gw_calendars` rows (name + color dot). Tapping a calendar confirms.
- On confirm, calls `google-event-share`. On success, closes the picker, toasts "Published to <calendar name>", and invalidates the events query so the published copy appears on the calendar view.

**2. Shared-copy card menu — "Unshare"**

- On any `gw_events` card where `external_source === 'google_calendar' && origin_user_id === current_user.id`, show an **"Unshare"** dropdown item (only visible to the origin user).
- On tap, calls `google-event-unshare`. On success, toasts "Unshared", invalidates the events query, and the row disappears.
- Non-origin users never see the button (RLS lets them read the event, not delete it — but hiding the affordance keeps the UI honest).

### Data flow

```
User picks "Publish to calendar…" on a Google event
  → picker shows tenant gw_calendars
  → confirm → google-event-share({ google_event_id, calendar_id })
  → server: read source event → upsert gw_events → return shared_event_id
  → client: invalidate events query → the shared copy appears

Later, user edits event in Google
  → next google-sync fetches change → upserts gw_google_events
  → propagation UPDATE hits gw_events → shared copy updates
  → any tenant member viewing the calendar sees the new title/time

Later, user deletes event in Google
  → next google-sync no longer returns that event
  → propagation DELETE removes gw_events → shared copy disappears

User taps "Unshare" on a published copy
  → google-event-unshare({ shared_event_id })
  → server: DELETE gw_events WHERE id AND origin_user_id
  → client: invalidate events → row disappears
```

## Error handling

- **Missing source Google event** (someone shares an event that's already been deleted from Google): `google-event-share` returns `{ error: 'source_not_found' }`. Client toasts "Couldn't find that event — it may have been deleted in Google".
- **Calendar not in current tenant**: RLS returns empty from the calendar read → `{ error: 'calendar_not_found' }`. Client toasts "Calendar not available".
- **Republish**: the partial unique index guarantees the upsert lands on the same row; the client re-renders with the (possibly updated) shared copy.
- **Un-share by non-origin user**: DELETE returns 0 rows affected; server returns `{ ok: true, deleted: 0 }`. Client treats 0 as "nothing to do" without alarming the user.
- **Sync propagation** (a shared copy whose Google source now points to a different calendar_id): out of scope — the shared copy stays on whichever calendar the user picked at share time. Calendar reassignment is a manual edit.

## Security

- **Sharing scope**: every share operation runs under the user's JWT; RLS gates every read + write.
- **Cross-tenant abuse**: RLS on `gw_google_events`, `gw_calendars`, and `gw_events` all enforce `tenant_id = current_tenant_id()`. The share function does no service-role writes.
- **Un-share auth**: `WHERE origin_user_id = auth.uid()` in the DELETE means a member can't un-share someone else's published event even if they know the row id.
- **Deleted-from-Google leak**: covered by the sync-time delete propagation.

## Testing

**Backend (Deno + Vitest):**
- `google-event-share`: happy path (creates row with expected fields), missing source (bails cleanly), missing calendar (bails), republish (updates existing row not duplicating).
- `google-event-unshare`: happy path (deletes own row), non-origin user (deletes 0 rows).
- `google-sync` propagation: shared copy updates when source updates; shared copy deletes when source disappears from Google response.

**Client:**
- Google-event card renders the "Publish to calendar…" item.
- Calendar picker lists rows sorted by is_default DESC, name ASC.
- Shared-copy card renders "Unshare" only when `external_source === 'google_calendar' && origin_user_id === current_user.id`.

**Manual QA:**
- Publish a Google event to the default calendar — verify it appears for another member of the tenant.
- Edit the event in Google — hit "Pull from Google" — verify the shared copy updates.
- Delete the event in Google — hit "Pull from Google" — verify the shared copy disappears.
- Un-share — verify the copy disappears for other members.

## Open questions (none)

All five design questions locked by user before spec was written.
