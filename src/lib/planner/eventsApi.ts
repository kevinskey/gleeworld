// Read-only bridge to GleeWorld's calendar (gw_events) so period notes
// show the day's rehearsals/concerts/meetings. Planner never writes
// events — the calendar module stays authoritative.
import { supabase } from '@/integrations/supabase/client';
import { keyRange, type PeriodType } from './dateKeys';

export interface PlannerEvent {
  id: string;
  title: string;
  start_date: string;
  end_date: string | null;
  location: string | null;
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
