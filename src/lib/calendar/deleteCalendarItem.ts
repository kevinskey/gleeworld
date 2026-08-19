// One delete path for everything the calendar grid renders.
//
// The grid merges three different sources into a single stream:
//   'event'       → gw_events (things created in GleeWorld)
//   'appointment' → gw_appointments (Studio Hours bookings)
//   'google'      → gw_google_events (read-only mirror of the user's calendar)
//
// Every delete button used to run `DELETE FROM gw_events WHERE id = <id>`
// regardless of source. For an appointment that matches zero rows, so the UI
// reported "Failed to delete event" while the booking sat there untouched —
// and for a Google row the id isn't even a gw_events uuid ('gcal-…').

import { supabase } from '@/integrations/supabase/client';

export type CalendarItemSource = 'event' | 'appointment' | 'google';

export interface DeletableCalendarItem {
  id: string;
  source?: CalendarItemSource | string;
  is_appointment?: boolean;
}

export interface DeleteResult {
  ok: boolean;
  /** Message suitable for a toast. */
  message: string;
}

function resolveSource(item: DeletableCalendarItem): CalendarItemSource {
  if (item.source === 'appointment' || item.is_appointment) return 'appointment';
  if (item.source === 'google' || item.id.startsWith('gcal-')) return 'google';
  return 'event';
}

export async function deleteCalendarItem(item: DeletableCalendarItem): Promise<DeleteResult> {
  const source = resolveSource(item);

  // ── Google mirror rows ────────────────────────────────────────────────
  // Nothing local to delete: the next sync would just pull the event back.
  // Say so plainly instead of failing with a generic error.
  if (source === 'google') {
    return {
      ok: false,
      message: 'This event lives on your Google Calendar — delete it there and it will disappear here on the next sync.',
    };
  }

  // ── Studio Hours bookings ─────────────────────────────────────────────
  // Cancelled, not destroyed: someone booked this time and the record of it
  // matters. The calendar query filters out cancelled rows, so it disappears
  // from the grid either way.
  if (source === 'appointment') {
    // Best-effort: pull the event off both Google calendars first, while the
    // row still carries its google_event_id.
    try {
      await supabase.functions.invoke('google-push-appointment', {
        body: { appointment_id: item.id, op: 'delete' },
      });
    } catch (e) {
      console.warn('google-push-appointment delete failed (continuing)', e);
    }

    const { data, error } = await supabase
      .from('gw_appointments')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
      })
      .eq('id', item.id)
      .select('id');

    if (error) throw error;
    if (!data || data.length === 0) {
      return { ok: false, message: 'Not permitted to cancel this appointment' };
    }
    return { ok: true, message: 'Appointment cancelled' };
  }

  // ── GleeWorld events ──────────────────────────────────────────────────
  // Tell Google first — once the row is gone we can't read its
  // google_event_id anymore.
  const { pushEventToGoogle } = await import('@/hooks/useGoogleConnection');
  await pushEventToGoogle(item.id, 'delete');

  const { data, error } = await supabase
    .from('gw_events')
    .delete()
    .eq('id', item.id)
    .select('id');

  if (error) throw error;
  if (!data || data.length === 0) {
    return { ok: false, message: 'Not permitted to delete this event' };
  }
  return { ok: true, message: 'Event deleted successfully' };
}
