type Source = 'google_calendar' | 'ios_calendar';

const SOURCE_TABLES: Record<Source, { table: string; idColumn: string; startColumn: string; endColumn: string; }> = {
  google_calendar: { table: 'gw_google_events', idColumn: 'google_event_id', startColumn: 'start_at', endColumn: 'end_at' },
  ios_calendar:    { table: 'gw_ios_events',    idColumn: 'apple_event_id',  startColumn: 'start_at', endColumn: 'end_at' },
};

export interface RunShareInput {
  user_id: string;
  source: Source;
  source_event_id: string;
  calendar_id: string;
  supabase: any;
}

export type RunShareResult =
  | { ok: true; shared_event_id: string }
  | { error: 'source_not_found' | 'calendar_not_found' | 'save_failed' | 'bad_source'; detail?: string };

export async function runShare(input: RunShareInput): Promise<RunShareResult> {
  const { user_id, source, source_event_id, calendar_id, supabase } = input;
  const cfg = SOURCE_TABLES[source];
  if (!cfg) return { error: 'bad_source' };

  const { data: src } = await supabase
    .from(cfg.table)
    .select(`tenant_id, title, description, location, ${cfg.startColumn}, ${cfg.endColumn}, all_day`)
    .eq('user_id', user_id)
    .eq(cfg.idColumn, source_event_id)
    .maybeSingle();
  if (!src) return { error: 'source_not_found' };

  const { data: cal } = await supabase
    .from('gw_calendars').select('id').eq('id', calendar_id).maybeSingle();
  if (!cal) return { error: 'calendar_not_found' };

  const { data, error } = await supabase
    .from('gw_events')
    .upsert({
      tenant_id:       src.tenant_id,
      title:           src.title ?? '(untitled)',
      description:     src.description,
      location:        src.location,
      start_date:      src[cfg.startColumn],
      end_date:        src[cfg.endColumn],
      calendar_id,
      external_source: source,
      external_id:     source_event_id,
      origin_user_id:  user_id,
      created_by:      user_id,
      event_type:      'shared_from_google',   // same event_type across sources — the calendar renderer treats it the same
      is_public:       true,
      is_private:      false,
      status:          'scheduled',
    }, { onConflict: 'tenant_id,external_id,origin_user_id' })
    .select('id')
    .single();

  if (error || !data) return { error: 'save_failed', detail: error?.message ?? 'no row returned' };
  return { ok: true, shared_event_id: data.id };
}
