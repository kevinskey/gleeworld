// Google Calendar connection state for the current user.
// Backed by gw_google_connections (RLS scopes reads to the caller's own row).

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface GoogleConnection {
  id: string;
  google_email: string | null;
  expires_at: string | null;
  scope: string | null;
  last_synced_at: string | null;
  last_error: string | null;
  created_at: string;
}

const KEY = ['google-connection'];

export function useGoogleConnection() {
  return useQuery<GoogleConnection | null>({
    queryKey: KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_google_connections')
        .select('id, google_email, expires_at, scope, last_synced_at, last_error, created_at')
        .maybeSingle();
      if (error) throw error;
      return data as GoogleConnection | null;
    },
  });
}

// Kicks off the OAuth flow. Calls google-oauth-start to get the
// authorization URL, then sends the browser to Google's consent screen.
export function useStartGoogleOAuth() {
  return useMutation({
    mutationFn: async (redirectTo?: string) => {
      const { data, error } = await supabase.functions.invoke('google-oauth-start', {
        body: { redirect_to: redirectTo ?? '/dashboard/calendar' },
      });
      if (error) throw error;
      if (!data?.url) throw new Error('No URL returned');
      window.location.href = data.url;
    },
  });
}

// Triggers a sync run. Returns { fetched, upserted }.
export function useSyncGoogle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('google-sync', {});
      if (error) throw error;
      return data as { ok: boolean; fetched: number; upserted: number };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ['google-events'] });
    },
  });
}

// Whether the current connection includes the write scope (calendar.events).
// Existing connections from before Phase 2.5 only have calendar.readonly —
// the UI prompts the user to re-authorize.
export function hasWriteScope(conn: GoogleConnection | null): boolean {
  if (!conn?.scope) return false;
  return conn.scope.includes('https://www.googleapis.com/auth/calendar.events');
}

// Push one GleeWorld event to the user's Google calendar. Called after
// successful create/update/delete of a gw_events row. Silently no-ops if
// the user isn't connected or doesn't have write scope — so it's safe to
// call unconditionally.
export async function pushEventToGoogle(eventId: string, op: 'create' | 'update' | 'delete') {
  try {
    const { error } = await supabase.functions.invoke('google-push-event', {
      body: { event_id: eventId, op },
    });
    if (error) console.warn('[google-push]', error);
  } catch (e) {
    console.warn('[google-push]', e);
  }
}

// One-shot backfill: push every unpushed gw_events row in the tenant.
export function usePushAllToGoogle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('google-push-all', {});
      if (error) throw error;
      return data as { ok: boolean; pushed: number; failed: number; sample_errors: string[] };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['google-connection'] }),
  });
}

export function useDisconnectGoogle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke('google-disconnect', {});
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ['google-events'] });
    },
  });
}
