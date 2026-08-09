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
import {
  migrateToMyTools, sanitizeTools, resolveKey, MY_TOOLS_CAP, WIDGETS_CAP, type MyTools,
} from '@/lib/navigation/myTools';

/** The two user_preferences columns this hook reads, exactly as stored. */
interface StoredNavPrefs {
  nav_item_order: unknown;
  home_tile_layout: unknown;
}

/**
 * What the query caches: the raw row, plus whether it was GENUINELY fetched.
 *
 * The distinction is the whole point. A failed load deliberately still
 * renders (Phase 2: the shelf must never blank, so migrateToMyTools runs
 * over an empty row and produces the role defaults) — but those defaults are
 * fabricated, not the member's record, and writing them back would overwrite
 * a real curated set with role-defaults-plus-whatever-was-just-pinned. So the
 * READ path treats `{ ok: false }` as an empty row and carries on; the WRITE
 * path (pinTool) refuses unless `ok === true`. Making the queryFn throw
 * instead would have regressed the render fallback, which is why it doesn't.
 */
type NavPrefsLoad = { ok: true; row: StoredNavPrefs } | { ok: false };

const EMPTY_ROW: StoredNavPrefs = { nav_item_order: null, home_tile_layout: null };

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
  const queryKey = useMemo(() => ['my-tools', uid ?? 'anon'], [uid]);

  const { data: load = null, isLoading } = useQuery<NavPrefsLoad>({
    queryKey,
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
          return { ok: false };
        }
        return {
          ok: true,
          row: {
            nav_item_order: data?.nav_item_order ?? null,
            home_tile_layout: data?.home_tile_layout ?? null,
          },
        };
      } catch (err) {
        console.warn('[useMyTools] load failed:', err);
        return { ok: false };
      }
    },
  });

  // Render path — UNCHANGED behaviour: a failed load still yields the role
  // defaults so the shelf renders. Only `load === null` (nothing fetched
  // yet at all) reads as "no record".
  const myTools = useMemo<MyTools | null>(() => {
    if (!load) return null;
    const row = load.ok ? load.row : EMPTY_ROW;
    return migrateToMyTools(row.nav_item_order, row.home_tile_layout, role);
  }, [load, role]);

  /** True only when the member's real row came back. Gates the write path. */
  const loaded = load?.ok === true;

  /**
   * The freshest genuinely-loaded record, read from the query CACHE at call
   * time — never from a render-time closure. Two bugs live in that
   * distinction: an append computed before the query resolved (which
   * persisted a one-key record over the member's eight tools and widgets),
   * and two appends in one tick (the optimistic setQueryData below doesn't
   * reach a closure captured last render, so the second append dropped the
   * first). Returns null when no row was genuinely fetched.
   */
  const readLoadedRecord = useCallback((): MyTools | null => {
    const cached = queryClient.getQueryData<NavPrefsLoad>(queryKey);
    if (!cached || !cached.ok) return null;
    return migrateToMyTools(cached.row.nav_item_order, cached.row.home_tile_layout, role);
  }, [queryClient, queryKey, role]);

  // General patch saver: tools, widgets, and setupComplete can each be
  // updated independently, defaulting to whatever is already on the
  // member's record when omitted from the patch.
  const saveMyTools = useCallback(async (patch: {
    tools?: string[]; widgets?: string[]; setupComplete?: boolean;
  }): Promise<boolean> => {
    if (!uid) return false;
    // Defaults for OMITTED fields come from the cache-fresh record when one
    // genuinely loaded, falling back to the render-derived `myTools` so a
    // widgets-only patch after a failed load still behaves exactly as it did
    // before (role defaults, not a blanked list).
    const base = readLoadedRecord() ?? myTools;
    const next: MyTools = {
      v: 4,
      tools: patch.tools !== undefined ? sanitizeTools(patch.tools) : (base?.tools ?? []),
      widgets: patch.widgets !== undefined
        ? patch.widgets.slice(0, WIDGETS_CAP)
        : (base?.widgets ?? []),
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
    // useMemo, so setQueryData MUST write that same NavPrefsLoad-wrapped raw
    // row shape — writing `next` (a MyTools) directly here would be discarded
    // by the derive step and the UI would flicker back to the pre-save state.
    // The optimistic entry is `ok: true` on purpose: a deliberate save that
    // has been accepted locally IS a genuine record, so a pin landing in the
    // window before the RPC returns appends to it rather than refusing.
    const previous = queryClient.getQueryData<NavPrefsLoad>(queryKey) ?? null;
    queryClient.setQueryData<NavPrefsLoad>(queryKey, {
      ok: true,
      row: {
        nav_item_order: next,
        home_tile_layout: previous?.ok ? previous.row.home_tile_layout : null,
      },
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
  }, [uid, myTools, readLoadedRecord, queryKey, queryClient]);

  const saveTools = useCallback(
    (tools: string[]) => saveMyTools({ tools }),
    [saveMyTools],
  );

  /**
   * Append ONE key to the stored set. The only supported way to pin: the
   * append happens here, over the cache-fresh record, so no caller can
   * compute it from a stale render-time snapshot (or from a rendered,
   * gate-filtered, capped projection of the record — a stored-but-gated key
   * must survive a pin).
   *
   * Resolves false — which AllToolsSheet surfaces as a toast — rather than
   * writing, whenever the write would be wrong or would change nothing:
   * no genuinely loaded record, already at the cap, or 'home' (which
   * sanitizeTools strips, so the RPC would succeed and do nothing).
   */
  const pinTool = useCallback(async (key: string): Promise<boolean> => {
    const record = readLoadedRecord();
    if (!record) return false;
    const resolved = resolveKey(key);
    if (resolved === 'home') return false;
    if (record.tools.includes(resolved)) return true;
    if (record.tools.length >= MY_TOOLS_CAP) return false;
    return saveMyTools({ tools: [...record.tools, resolved] });
  }, [readLoadedRecord, saveMyTools]);

  return { myTools, loading: isLoading, loaded, saveTools, saveMyTools, pinTool };
}
