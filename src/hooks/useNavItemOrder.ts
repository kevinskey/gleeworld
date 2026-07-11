// Read/write the per-user sidebar nav order (drag-to-reorder). Mirrors
// useHomeTileLayout: load failures fall back to null (= catalog order)
// with a console.warn; one upsert per drop.
import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface NavOrder { v: 1; order: string[] }

export function parseNavOrder(raw: unknown): NavOrder | null {
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as { v?: unknown; order?: unknown };
  if (candidate.v !== 1 || !Array.isArray(candidate.order)) return null;
  const order = candidate.order.filter((k): k is string => typeof k === 'string');
  return order.length ? { v: 1, order } : null;
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

  const saveNavOrder = useCallback(async (order: string[]): Promise<boolean> => {
    if (!uid) return false;
    try {
      const next: NavOrder = { v: 1, order };
      const { error } = await supabase
        .from('user_preferences')
        .upsert({ user_id: uid, nav_item_order: next }, { onConflict: 'user_id' });
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
