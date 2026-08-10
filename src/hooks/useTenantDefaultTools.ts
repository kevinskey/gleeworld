// Per-role default shelves for this tenant. Read by the first-run sheet and
// by My World's "Defaults for members" mode; written only by tenant admins.
//
// Writes go by direct upsert (NOT the save_nav_item_order RPC) because
// gw_tenant_nav_prefs has its own BEFORE INSERT trigger filling tenant_id
// and its own RESTRICTIVE isolation policy — the same path the existing
// hidden_items editor in WorkspaceSettingsPage uses.
// Spec: docs/superpowers/specs/2026-08-08-my-space-nav-design.md §6.2
import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
// decodeJwtClaims lives in demoSession.ts (it's the only decoder in the
// repo, shared with the demo-role check) — WorkspaceSettingsPage's
// NavigationTabPanel imports it from here too. There is no '@/lib/jwt'
// module; do not add a second decoder.
import { decodeJwtClaims } from '@/lib/demoSession';
import { sanitizeTools } from '@/lib/navigation/myTools';
import type { NavRole } from '@/lib/navigation/navCatalog';

export type DefaultsByRole = Record<NavRole, string[]>;

const EMPTY: DefaultsByRole = { admin: [], student: [], member: [] };

export function useTenantDefaultTools() {
  const queryClient = useQueryClient();
  const key = ['tenant-default-tools'];

  const { data: defaultsByRole = EMPTY, isLoading } = useQuery<DefaultsByRole>({
    queryKey: key,
    staleTime: 60 * 1000,
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('gw_tenant_nav_prefs')
          .select('role, default_tools');
        if (error) {
          console.warn('[useTenantDefaultTools] load failed:', error.message);
          return EMPTY;
        }
        const rows = (data as Array<{ role: string; default_tools: string[] | null }>) ?? [];
        const out: DefaultsByRole = { admin: [], student: [], member: [] };
        for (const r of rows) {
          // sanitizeTools (resolve + dedupe), not the raw column: a tenant
          // that saved 'merch' into a role's defaults before it retired into
          // 'shop' would otherwise hand MyWorldEditor a dead key — same bug
          // class as the personal My Tools record, different table
          // (Phase 5 review, 2026-08-09).
          if (r.role in out) out[r.role as NavRole] = sanitizeTools(r.default_tools ?? []);
        }
        return out;
      } catch (err) {
        console.warn('[useTenantDefaultTools] load failed:', err);
        return EMPTY;
      }
    },
  });

  const saveDefaults = useCallback(async (role: NavRole, tools: string[]): Promise<boolean> => {
    // Rolled back on any failure below; null means "nothing written yet".
    let previous: DefaultsByRole | null = null;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      // tenant_id lives in the TOKEN PAYLOAD (GoTrue custom-claims hook),
      // not app_metadata — accounts created outside the invite flow have no
      // tenant_id there. Same fallback chain the hidden_items editor uses.
      const claims = decodeJwtClaims(session?.access_token ?? '');
      const tenantId = (claims?.tenant_id as string | undefined)
        ?? (session?.user?.app_metadata as Record<string, unknown> | undefined)?.tenant_id as string | undefined
        ?? (session?.user?.user_metadata as Record<string, unknown> | undefined)?.tenant_id as string | undefined;
      if (!tenantId) throw new Error('No tenant in session');

      const nextTools = sanitizeTools(tools);
      // Optimistic write BEFORE the round-trip, exactly as the personal
      // path does (useMyTools.saveMyTools). This editor is controlled by
      // the query's value: without this, MyWorldEditor's `tools` prop stays
      // at the pre-save list for the whole ~200-500ms upsert, so the row
      // visibly snaps back, and a second tap in that window computes its
      // next list from the STALE one — silently discarding the first edit.
      previous = queryClient.getQueryData<DefaultsByRole>(key) ?? EMPTY;
      queryClient.setQueryData<DefaultsByRole>(key, { ...previous, [role]: nextTools });

      const { error } = await supabase
        .from('gw_tenant_nav_prefs')
        .upsert({
          tenant_id: tenantId,
          role,
          default_tools: nextTools,
          updated_by: session?.user?.id,
        }, { onConflict: 'tenant_id,role' });
      if (error) {
        console.warn('[useTenantDefaultTools] save failed:', error.message);
        queryClient.setQueryData<DefaultsByRole>(key, previous);
        return false;
      }
      await queryClient.invalidateQueries({ queryKey: key });
      return true;
    } catch (err) {
      console.warn('[useTenantDefaultTools] save failed:', err);
      if (previous) queryClient.setQueryData<DefaultsByRole>(key, previous);
      return false;
    }
  }, [queryClient]);

  return { defaultsByRole, loading: isLoading, saveDefaults };
}
