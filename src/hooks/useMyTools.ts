// Read/write the member's My Tools set — the single ordered list rendered
// as both the sidebar shelf and the home keycap grid. Supersedes
// useNavItemOrder and useHomeTileLayout.
//
// Reads BOTH legacy columns so a member who customized either one keeps
// their layout; migrateToMyTools resolves the precedence. Writes go only to
// nav_item_order, and only through the RPC.
// Spec: docs/superpowers/specs/2026-08-08-my-space-nav-design.md §6
import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { migrateToMyTools, sanitizeTools, type MyTools } from '@/lib/navigation/myTools';

export function useMyTools(role: 'student' | 'faculty') {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const uid = user?.id;

  const { data: myTools = null, isLoading } = useQuery<MyTools | null>({
    // role is part of the key, not just an argument to queryFn: the caller
    // (DashboardShell) computes `role` from a profile that starts null and
    // fills in async, so the first fetch for an admin/instructor can fire
    // with a guessed 'student' before the real role is known. Without role
    // in the key, that wrong-guess result would sit in the ['my-tools', uid]
    // cache slot for staleTime and the real 'faculty' call would just read
    // the stale student defaults back out. Keying by role means the two
    // guesses get separate cache entries and can never cross-contaminate;
    // DashboardShell also gates rendering on useUserRole's loading flag so
    // the wrong-guess fetch's result is never shown even before it resolves.
    queryKey: ['my-tools', uid ?? 'anon', role],
    enabled: !!uid,
    staleTime: 60 * 1000,
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('user_preferences')
          .select('nav_item_order, home_tile_layout')
          .eq('user_id', uid!)
          .maybeSingle();
        if (error) {
          console.warn('[useMyTools] load failed:', error.message);
          return migrateToMyTools(null, null, role);
        }
        return migrateToMyTools(data?.nav_item_order ?? null, data?.home_tile_layout ?? null, role);
      } catch (err) {
        console.warn('[useMyTools] load failed:', err);
        return migrateToMyTools(null, null, role);
      }
    },
  });

  const saveTools = useCallback(async (tools: string[]): Promise<boolean> => {
    if (!uid) return false;
    const next: MyTools = {
      v: 4,
      tools: sanitizeTools(tools),
      widgets: myTools?.widgets ?? [],
      // Any deliberate save is, by definition, a completed setup.
      setupComplete: true,
    };
    // Optimistic write BEFORE the round-trip. Without it the shelf and grid
    // re-render from the stale cache for the ~200-500ms the RPC takes,
    // snapping every moved tile back and then forward again — reads as a
    // whole-screen blink. (Same reasoning as the old useNavItemOrder.)
    // Must match the read side's key exactly (uid + role) — the two keys
    // drifting apart was the I3 bug: an optimistic write to the role-less
    // key silently missed the role-keyed query entirely.
    const queryKey = ['my-tools', uid ?? 'anon', role];
    const previous = queryClient.getQueryData<MyTools | null>(queryKey) ?? null;
    queryClient.setQueryData(queryKey, next);
    try {
      // save_nav_item_order is SECURITY DEFINER: it bypasses the RESTRICTIVE
      // tenant_isolation_restrict policy on user_preferences and resyncs
      // tenant_id to current_tenant_id() on every save. A direct upsert 403s
      // whenever the caller's subdomain-derived tenant disagrees with the
      // stored row. Do not replace it.
      const { error } = await supabase.rpc('save_nav_item_order' as never, {
        p_nav_item_order: next,
      });
      if (error) {
        console.warn('[useMyTools] save failed:', error.message);
        queryClient.setQueryData(queryKey, previous);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('[useMyTools] save failed:', err);
      queryClient.setQueryData(queryKey, previous);
      return false;
    }
  }, [uid, role, myTools?.widgets, queryClient]);

  return { myTools, loading: isLoading, saveTools };
}
