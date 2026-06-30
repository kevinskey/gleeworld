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

// One row per Google calendar the user can see. `is_enabled` controls
// whether google-sync pulls events from it.
export interface GoogleCalendarSubscription {
  id: string;
  google_calendar_id: string;
  summary: string | null;
  background_color: string | null;
  access_role: string | null;
  is_primary: boolean;
  is_enabled: boolean;
  last_listed_at: string;
}

const SUBS_KEY = ['google-calendar-subscriptions'];

export function useGoogleCalendarSubscriptions() {
  return useQuery<GoogleCalendarSubscription[]>({
    queryKey: SUBS_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_google_calendar_subscriptions')
        .select('id, google_calendar_id, summary, background_color, access_role, is_primary, is_enabled, last_listed_at')
        // Primary first, then alphabetical so the picker reads naturally.
        .order('is_primary', { ascending: false })
        .order('summary', { ascending: true });
      if (error) throw error;
      return (data as GoogleCalendarSubscription[]) || [];
    },
  });
}

// Asks the server to refresh the calendar list from Google. Returns
// the upserted rows.
export function useRefreshGoogleCalendars() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('google-list-calendars', {});
      if (error) throw error;
      return data as { ok: boolean; found: number };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SUBS_KEY });
    },
  });
}

// Flips is_enabled on a single subscription row. Optimistic update so
// the toggle feels instant.
export function useToggleGoogleCalendar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase
        .from('gw_google_calendar_subscriptions')
        .update({ is_enabled: enabled })
        .eq('id', id);
      if (error) throw error;
    },
    onMutate: async ({ id, enabled }) => {
      await qc.cancelQueries({ queryKey: SUBS_KEY });
      const prev = qc.getQueryData<GoogleCalendarSubscription[]>(SUBS_KEY);
      if (prev) {
        qc.setQueryData<GoogleCalendarSubscription[]>(
          SUBS_KEY,
          prev.map(s => s.id === id ? { ...s, is_enabled: enabled } : s),
        );
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(SUBS_KEY, ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: SUBS_KEY });
    },
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
