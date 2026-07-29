// Read/write the per-user sidebar nav order (drag-to-reorder). Mirrors
// useHomeTileLayout: load failures fall back to null (= catalog order)
// with a console.warn; one upsert per drop.
import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface NavOrder {
  v: 3;
  /** flat display order of catalog keys */
  order: string[];
  /** per-item section override: catalog key → section key */
  sections: Record<string, string>;
  /** user-preferred order of the section columns themselves (e.g.
   *  ['music','today','teach']). Any section not in this list falls
   *  back to catalog order after the ranked ones. */
  sectionOrder: string[];
}

export function parseNavOrder(raw: unknown): NavOrder | null {
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as { v?: unknown; order?: unknown; sections?: unknown; sectionOrder?: unknown };
  const version = candidate.v;
  if (version !== 1 && version !== 2 && version !== 3) return null;
  if (!Array.isArray(candidate.order)) return null;
  const order = candidate.order.filter((k): k is string => typeof k === 'string');
  if (!order.length) return null;
  const sections: Record<string, string> = {};
  if ((version === 2 || version === 3) && candidate.sections && typeof candidate.sections === 'object') {
    for (const [k, v] of Object.entries(candidate.sections as Record<string, unknown>)) {
      if (typeof v === 'string') sections[k] = v;
    }
  }
  const sectionOrder: string[] = [];
  if (version === 3 && Array.isArray(candidate.sectionOrder)) {
    for (const s of candidate.sectionOrder) if (typeof s === 'string') sectionOrder.push(s);
  }
  return { v: 3, order, sections, sectionOrder };
}

export function useNavItemOrder() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const uid = user?.id;

  const { data: navOrder = null } = useQuery<NavOrder | null>({
    queryKey: ['nav-item-order', uid ?? 'anon'],
    enabled: !!uid,
    staleTime: 60 * 1000,
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('user_preferences')
          .select('nav_item_order')
          .eq('user_id', uid!)
          .maybeSingle();
        if (error) {
          console.warn('[useNavItemOrder] load failed:', error.message);
          return null;
        }
        return parseNavOrder(data?.nav_item_order ?? null);
      } catch (err) {
        console.warn('[useNavItemOrder] load failed:', err);
        return null;
      }
    },
  });

  const saveNavOrder = useCallback(async (
    order: string[],
    sections: Record<string, string> = {},
    sectionOrder: string[] = [],
  ): Promise<boolean> => {
    if (!uid) return false;
    try {
      const next: NavOrder = { v: 3, order, sections, sectionOrder };
      // save_nav_item_order is a SECURITY DEFINER RPC that bypasses the
      // RESTRICTIVE tenant_isolation_restrict policy on user_preferences
      // and RESYNCS tenant_id to current_tenant_id() on every save. This
      // is needed because a direct upsert failed with 403 whenever the
      // caller's subdomain-derived current_tenant_id() didn't match the
      // tenant_id stored on the existing row — a common state now that
      // current_tenant_id() is subdomain-aware. See migration
      // 20260729180000_save_nav_item_order_rpc.sql.
      const { error } = await supabase.rpc('save_nav_item_order' as never, {
        p_nav_item_order: next,
      });
      if (error) {
        console.warn('[useNavItemOrder] save failed:', error.message);
        return false;
      }
      queryClient.setQueryData(['nav-item-order', uid], next);
      return true;
    } catch (err) {
      console.warn('[useNavItemOrder] save failed:', err);
      return false;
    }
  }, [uid, queryClient]);

  return { navOrder, saveNavOrder };
}
