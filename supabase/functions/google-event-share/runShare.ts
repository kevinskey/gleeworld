export interface RunShareInput {
  user_id: string;
  google_event_id: string;
  calendar_id: string;
  supabase: any; // Supabase-JS client instance (JWT-scoped)
}

export type RunShareResult =
  | { ok: true; shared_event_id: string }
  | { error: 'source_not_found' | 'calendar_not_found' | 'save_failed'; detail?: string };

export async function runShare(input: RunShareInput): Promise<RunShareResult> {
  const { user_id, google_event_id, calendar_id, supabase } = input;

  // 1. Read the source Google event via the caller's JWT — RLS scopes to
  //    the caller's own row + current tenant, so a bad google_event_id
  //    (or a cross-tenant probe) yields null.
  const { data: src } = await supabase
    .from('gw_google_events')
    .select('tenant_id, title, description, location, start_at, end_at, all_day')
    .eq('user_id', user_id)
    .eq('google_event_id', google_event_id)
    .maybeSingle();
  if (!src) return { error: 'source_not_found' };

  // 2. Verify the target calendar is in the caller's current tenant.
  const { data: cal } = await supabase
    .from('gw_calendars')
    .select('id')
    .eq('id', calendar_id)
    .maybeSingle();
  if (!cal) return { error: 'calendar_not_found' };

  // 3. Upsert with the partial-unique-index conflict target. Re-sharing
  //    the same Google event lands on the same row.
  const { data, error } = await supabase
    .from('gw_events')
    .upsert(
      {
        tenant_id:       src.tenant_id,
        title:           src.title ?? '(untitled)',
        description:     src.description,
        location:        src.location,
        start_date:      src.start_at,
        end_date:        src.end_at,
        calendar_id,
        external_source: 'google_calendar',
        external_id:     google_event_id,
        origin_user_id:  user_id,
        created_by:      user_id,
        event_type:      'shared_from_google',
        is_public:       true,
        is_private:      false,
        status:          'scheduled',
      },
      { onConflict: 'tenant_id,external_id,origin_user_id' },
    )
    .select('id')
    .single();

  if (error || !data) return { error: 'save_failed', detail: error?.message ?? 'no row returned' };
  return { ok: true, shared_event_id: data.id };
}
