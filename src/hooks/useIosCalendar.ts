// Personal iPhone-calendar sync — iOS app only.

import { useCallback, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { GWCalendar, isNativeCalendarAvailable, type GWCalendarStatus } from '@/plugins/gwCalendar';

export interface IosEventRow {
  id: string;
  apple_event_id: string;
  calendar_title: string | null;
  title: string | null;
  description: string | null;
  location: string | null;
  start_at: string;
  end_at:   string;
  all_day: boolean;
  is_private: boolean;
}

const IOS_EVENTS_KEY = ['ios-events'];

export function useIosEvents() {
  return useQuery<IosEventRow[]>({
    queryKey: IOS_EVENTS_KEY,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_ios_events')
        .select('id, apple_event_id, calendar_title, title, description, location, start_at, end_at, all_day, is_private')
        .order('start_at');
      if (error) throw error;
      return (data as IosEventRow[]) || [];
    },
  });
}

export function useIosCalendarAccess() {
  const [status, setStatus] = useState<GWCalendarStatus | null>(null);
  const refresh = useCallback(async () => {
    if (!isNativeCalendarAvailable()) { setStatus({ granted: false, status: 'restricted' }); return; }
    try { setStatus(await GWCalendar.checkAccess()); }
    catch { setStatus({ granted: false, status: 'denied' }); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  const request = useCallback(async () => {
    if (!isNativeCalendarAvailable()) return { granted: false, status: 'restricted' as const };
    const s = await GWCalendar.requestAccess();
    setStatus(s);
    return s;
  }, []);
  return { status, refresh, request };
}

export function useIosCalendarSync() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!isNativeCalendarAvailable()) throw new Error('not_on_ios');
      const from = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
      const to   = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
      const { events } = await GWCalendar.readEvents({ fromIso: from.toISOString(), toIso: to.toISOString() });
      const { data, error } = await supabase.functions.invoke('ios-calendar-sync', {
        body: { events, fromIso: from.toISOString(), toIso: to.toISOString() },
      });
      if (error) throw error;
      const body = data as { ok?: boolean; upserted?: number; deleted?: number; error?: string };
      if (body?.error) throw new Error(body.error);
      return { upserted: body.upserted ?? 0, deleted: body.deleted ?? 0 };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: IOS_EVENTS_KEY });
      qc.invalidateQueries({ queryKey: ['events'] });
    },
  });
}
