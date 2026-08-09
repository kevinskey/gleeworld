// Read/write the member's My Tools set — the single ordered list rendered
// as both the sidebar shelf and the home keycap grid. Supersedes
// useNavItemOrder and useHomeTileLayout.
//
// Reads both preference columns so a member who curated a keycap grid keeps
// it; migrateToMyTools resolves the precedence (a legacy v1-v3 nav_item_order
// is deliberately not a source — see its comment). Writes go only to
// nav_item_order, and only through the RPC.
// Spec: docs/superpowers/specs/2026-08-08-my-space-nav-design.md §6
import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { migrateToMyTools, sanitizeTools, WIDGETS_CAP, type MyTools } from '@/lib/navigation/myTools';

/** The two user_preferences columns this hook reads, exactly as stored. */
interface StoredNavPrefs {
  nav_item_order: unknown;
  home_tile_layout: unknown;
}

export function useMyTools(role: 'student' | 'faculty') {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const uid = user?.id;

  // The QUERY is keyed by uid alone and caches the RAW row; `role` is
  // applied afterwards, in memory. That split matters both ways:
  //
  //  - Keying the query by role too (an earlier shape) meant two network
  //    reads per navigation for every faculty member: DashboardShell
  //    computes `role` from a profile that starts null on EVERY mount
  //    (useUserRole caches nothing and the shell is per-route), so the
  //    student-keyed query always fired first and the faculty-keyed one
  //    followed once the profile resolved. Same row, fetched twice.
  //  - Caching the DERIVED record under a role-less key would be the old
  //    cross-contamination bug: the wrong-guess 'student' result would sit
  //    in the shared slot for staleTime and the faculty render would read
  //    the student defaults back out.
  //
  // Caching the raw row has neither problem: it is role-independent, and
  // `role` only ever changes what migrateToMyTools derives for a member
  // with NO stored record at all.
  const { data: prefs = null, isLoading } = useQuery<StoredNavPrefs | null>({
    queryKey: ['my-tools', uid ?? 'anon'],
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
          return { nav_item_order: null, home_tile_layout: null };
        }
        return {
          nav_item_order: data?.nav_item_order ?? null,
          home_tile_layout: data?.home_tile_layout ?? null,
        };
      } catch (err) {
        console.warn('[useMyTools] load failed:', err);
        return { nav_item_order: null, home_tile_layout: null };
      }
    },
  });

  const myTools = useMemo<MyTools | null>(
    () => (prefs ? migrateToMyTools(prefs.nav_item_order, prefs.home_tile_layout, role) : null),
    [prefs, role],
  );

  // General patch saver: tools, widgets, and setupComplete can each be
  // updated independently, defaulting to whatever is already on the
  // member's record when omitted from the patch.
  const saveMyTools = useCallback(async (patch: {
    tools?: string[]; widgets?: string[]; setupComplete?: boolean;
  }): Promise<boolean> => {
    if (!uid) return false;
    const next: MyTools = {
      v: 4,
      tools: patch.tools !== undefined ? sanitizeTools(patch.tools) : (myTools?.tools ?? []),
      widgets: patch.widgets !== undefined
        ? patch.widgets.slice(0, WIDGETS_CAP)
        : (myTools?.widgets ?? []),
      // Any deliberate save completes setup unless the caller says otherwise.
      setupComplete: patch.setupComplete ?? true,
    };
    // Optimistic write BEFORE the round-trip. Without it the shelf and grid
    // re-render from the stale cache for the ~200-500ms the RPC takes,
    // snapping every moved tile back and then forward again — reads as a
    // whole-screen blink. (Same reasoning as the old useNavItemOrder.)
    // Writing the raw-row shape (not the derived record) means the one
    // cache entry both roles read updates once, so no role can be left
    // rendering pre-save tools. Read useMyTools' query above before
    // touching this: the query caches the RAW user_preferences row under a
    // role-less key and migrateToMyTools derives MyTools from it in a
    // useMemo, so setQueryData MUST write that same StoredNavPrefs shape —
    // writing `next` (a MyTools) directly here would be discarded by the
    // derive step and the UI would flicker back to the pre-save state.
    const queryKey = ['my-tools', uid ?? 'anon'];
    const previous = queryClient.getQueryData<StoredNavPrefs | null>(queryKey) ?? null;
    queryClient.setQueryData<StoredNavPrefs>(queryKey, {
      nav_item_order: next,
      home_tile_layout: previous?.home_tile_layout ?? null,
    });
    try {
      // save_nav_item_order is SECURITY DEFINER: it bypasses the RESTRICTIVE
      // tenant_isolation_restrict policy on user_preferences and resyncs
      // tenant_id to current_tenant_id() on every save. A direct upsert 403s
      // whenever the caller's subdomain-derived tenant disagrees with the
      // stored row. Do not replace it. This is the ONE call site — saveTools
      // below delegates here rather than duplicating the RPC call.
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
  }, [uid, myTools, queryClient]);

  const saveTools = useCallback(
    (tools: string[]) => saveMyTools({ tools }),
    [saveMyTools],
  );

  return { myTools, loading: isLoading, saveTools, saveMyTools };
}
