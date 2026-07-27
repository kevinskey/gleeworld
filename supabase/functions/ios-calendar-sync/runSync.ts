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
    .lt('start_at', toIso)
    .not('apple_event_id', 'in', `(${idList.map(id => `"${id}"`).join(',')})`)
    .select('id');
  if (delErr) return { error: 'save_failed', detail: delErr.message };

  return { ok: true, upserted, deleted: (deletedRows ?? []).length };
}
