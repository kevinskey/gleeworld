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
