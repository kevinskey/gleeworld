// Bridge to GleeWorld's calendar (gw_events). Reads power the period
// pages and Day timeline; createEvent writes THE SAME table the main
// calendar uses — one source of truth, so an event added from Notes is
// instantly on /dashboard/calendar (and mirrored to Google when the
// user has write scope connected).
import { supabase } from '@/integrations/supabase/client';
import { pushEventToGoogle } from '@/hooks/useGoogleConnection';
import { keyRange, type PeriodType } from './dateKeys';

export const EVENT_TYPES = ['rehearsal', 'meeting', 'concert', 'event'] as const;
export type PlannerEventType = (typeof EVENT_TYPES)[number];

export interface PlannerEvent {
  id: string;
  title: string;
  start_date: string;
  end_date: string | null;
  location: string | null;
}

/** Default (or first visible, or freshly created) calendar id. */
async function resolveCalendarId(userId: string): Promise<string> {
  const { data, error } = await supabase
    .from('gw_calendars')
    .select('id, is_default')
    .eq('is_visible', true)
    .order('is_default', { ascending: false })
    .limit(1);
  if (error) throw error;
  if (data?.length) return (data[0] as { id: string }).id;
  const { data: created, error: createErr } = await supabase
    .from('gw_calendars')
    .insert({
      name: 'My Events',
      description: 'Personal event calendar',
      color: '#6366f1',
      is_visible: true,
      is_default: true,
      created_by: userId,
    })
    .select('id')
    .single();
  if (createErr) throw createErr;
  return (created as { id: string }).id;
}

/**
 * Create a real calendar event (mirrors CreateEventDialog's insert
 * shape, minimal fields). RLS decides who may write — same rules as
 * the calendar module.
 */
export async function createEvent(input: {
  title: string;
  startIso: string;
  endIso: string;
  eventType?: PlannerEventType;
  location?: string | null;
  isPublic?: boolean;
}): Promise<PlannerEvent> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth?.user?.id;
  if (!userId) throw new Error('Not signed in');
  const calendarId = await resolveCalendarId(userId);
  const { data, error } = await supabase
    .from('gw_events')
    .insert([{
      title: input.title.trim(),
      description: null,
      event_type: input.eventType ?? 'event',
      start_date: input.startIso,
      end_date: input.endIso,
      location: input.location?.trim() || null,
      is_public: input.isPublic ?? false,
      created_by: userId,
      status: 'scheduled',
      calendar_id: calendarId,
    }])
    .select('id, title, start_date, end_date, location')
    .single();
  if (error) throw error;
  const event = data as PlannerEvent;
  // fire-and-forget Google mirror, same as the calendar module
  pushEventToGoogle(event.id, 'create');
  return event;
}

export async function listEventsForPeriod(dateKey: string, type: PeriodType): Promise<PlannerEvent[]> {
  const range = keyRange(dateKey, type);
  if (!range) return [];
  const startIso = new Date(range.start.getFullYear(), range.start.getMonth(), range.start.getDate()).toISOString();
  const endIso = new Date(range.end.getFullYear(), range.end.getMonth(), range.end.getDate() + 1).toISOString();
  const { data, error } = await supabase
    .from('gw_events')
    .select('id, title, start_date, end_date, location')
    .gte('start_date', startIso)
    .lt('start_date', endIso)
    .order('start_date')
    .limit(100);
  if (error) throw error;
  return (data ?? []) as PlannerEvent[];
}
