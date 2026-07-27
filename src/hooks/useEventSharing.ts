import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const CAL_KEY = ['tenant-calendars'];
const EVENTS_KEYS: readonly (readonly string[])[] = [['events'], ['google-events'], ['ios-events']];

export interface TenantCalendar {
  id: string;
  name: string;
  color: string | null;
  is_default: boolean;
}

export function useTenantCalendars() {
  return useQuery<TenantCalendar[]>({
    queryKey: CAL_KEY,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_calendars')
        .select('id, name, color, is_default')
        .order('is_default', { ascending: false })
        .order('name', { ascending: true });
      if (error) throw error;
      return (data as TenantCalendar[]) || [];
    },
  });
}

export type ShareableSource = 'google_calendar' | 'ios_calendar';

export function useShareEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { source: ShareableSource; source_event_id: string; calendar_id: string }) => {
      const { data, error } = await supabase.functions.invoke('event-share', { body: input });
      if (error) throw error;
      const body = data as { ok?: boolean; shared_event_id?: string; error?: string };
      if (body?.error) throw new Error(body.error);
      if (!body?.shared_event_id) throw new Error('no_shared_id');
      return { shared_event_id: body.shared_event_id };
    },
    onSuccess: () => { EVENTS_KEYS.forEach(k => qc.invalidateQueries({ queryKey: [...k] })); },
  });
}

export function useUnshareEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { shared_event_id: string }) => {
      const { data, error } = await supabase.functions.invoke('event-unshare', { body: input });
      if (error) throw error;
      const body = data as { ok?: boolean; deleted?: number; error?: string };
      if (body?.error) throw new Error(body.error);
      return { deleted: body?.deleted ?? 0 };
    },
    onSuccess: () => { EVENTS_KEYS.forEach(k => qc.invalidateQueries({ queryKey: [...k] })); },
  });
}

// Deprecated aliases — kept for one branch; delete in a follow-up.
export const useShareGoogleEvent = useShareEvent;
export const useUnshareGoogleEvent = useUnshareEvent;
