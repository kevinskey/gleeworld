// Read this user's personal Google calendar events.
//
// gw_google_events RLS is two-layer: the RESTRICTIVE tenant policy gates
// to the caller's tenant, and the permissive policy further requires
// user_id = auth.uid(). Net result: this query can only ever return rows
// belonging to the caller. Other tenant members querying the same table
// see *their* events, never yours. No additional client-side filtering
// is required for privacy.

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface GoogleEventRow {
  id: string;
  google_event_id: string;
  title: string | null;
  description: string | null;
  location: string | null;
  start_at: string;
  end_at: string | null;
  all_day: boolean;
  html_link: string | null;
  status: string | null;
}

export function useGoogleEvents() {
  return useQuery<GoogleEventRow[]>({
    queryKey: ['google-events'],
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_google_events')
        .select('id, google_event_id, title, description, location, start_at, end_at, all_day, html_link, status')
        .order('start_at');
      if (error) throw error;
      return (data as GoogleEventRow[]) || [];
    },
  });
}
