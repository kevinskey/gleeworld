// Client hooks for publishing a Google event onto a shared GleeWorld
// calendar and un-publishing it later. Backed by two edge functions
// (google-event-share, google-event-unshare) that scope every write to
// the caller's JWT.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const CAL_KEY = ['tenant-calendars'];
const EVENTS_KEYS = [['events'], ['google-events']];

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

export function useShareGoogleEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { google_event_id: string; calendar_id: string }) => {
      const { data, error } = await supabase.functions.invoke('google-event-share', { body: input });
      if (error) throw error;
      const body = data as { ok?: boolean; shared_event_id?: string; error?: string };
      if (body?.error) throw new Error(body.error);
      if (!body?.shared_event_id) throw new Error('no_shared_id');
      return { shared_event_id: body.shared_event_id };
    },
    onSuccess: () => {
      EVENTS_KEYS.forEach(k => qc.invalidateQueries({ queryKey: k }));
    },
  });
}

export function useUnshareGoogleEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { shared_event_id: string }) => {
      const { data, error } = await supabase.functions.invoke('google-event-unshare', { body: input });
      if (error) throw error;
      const body = data as { ok?: boolean; deleted?: number; error?: string };
      if (body?.error) throw new Error(body.error);
      return { deleted: body?.deleted ?? 0 };
    },
    onSuccess: () => {
      EVENTS_KEYS.forEach(k => qc.invalidateQueries({ queryKey: k }));
    },
  });
}
