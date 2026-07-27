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
    .in('external_source', ['google_calendar', 'ios_calendar'])
    .select('id');
  if (error) return { error: 'save_failed', detail: error.message };
  return { ok: true, deleted: (data ?? []).length };
}
