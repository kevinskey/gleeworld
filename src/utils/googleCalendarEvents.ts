// Synthetic rows merged into the calendar from the user's personal Google
// Calendar (CommandCenterCalendar builds them from gw_google_events with a
// 'gcal-' id prefix and source: 'google'). They are NOT gw_events rows:
// editing or deleting them against gw_events 400s (non-UUID id), and even a
// local gw_google_events delete would be resurrected by the next google-sync
// upsert. Treat them as read-only everywhere — changes belong in Google.
export const GOOGLE_EVENT_ID_PREFIX = 'gcal-';

export function isGoogleSyncedEvent(
  event: { id?: string | null; source?: string | null } | null | undefined
): boolean {
  if (!event) return false;
  if (event.source === 'google') return true;
  return typeof event.id === 'string' && event.id.startsWith(GOOGLE_EVENT_ID_PREFIX);
}

export function isSharedFromGoogle(
  event: { external_source?: string | null; origin_user_id?: string | null } | null | undefined,
  currentUserId: string | null | undefined,
): boolean {
  if (!event || !currentUserId) return false;
  return event.external_source === 'google_calendar' && event.origin_user_id === currentUserId;
}
