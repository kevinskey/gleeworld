// Read/write the per-user House home tile layout. Load failures fall
// back to null (= default layout) with a console.warn, matching the
// useUserPreferences silent-warn pattern. Saves are one upsert per edit
// session; the caller owns failure UX.
// Spec: docs/superpowers/specs/2026-07-06-home-tile-customization-design.md
import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { parseTileLayout, type TileLayout } from '@/lib/navigation/appDestinations';

export function useHomeTileLayout() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const uid = user?.id;

  const { data: layout = null, isLoading: layoutLoading } = useQuery<TileLayout | null>({
    queryKey: ['home-tile-layout', uid ?? 'anon'],
    enabled: !!uid,
    staleTime: 60 * 1000,
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('user_preferences')
          .select('home_tile_layout')
          .eq('user_id', uid!)
          .maybeSingle();
        if (error) {
          console.warn('[useHomeTileLayout] load failed:', error.message);
          return null;
        }
        return parseTileLayout(data?.home_tile_layout ?? null);
      } catch (err) {
        console.warn('[useHomeTileLayout] load failed:', err);
        return null;
      }
    },
  });

  const save = useCallback(async (order: string[]): Promise<boolean> => {
    if (!uid) return false;
    try {
      const next: TileLayout = { v: 1, order };
      const { error } = await supabase
        .from('user_preferences')
        .upsert({ user_id: uid, home_tile_layout: next }, { onConflict: 'user_id' });
      if (error) {
        console.warn('[useHomeTileLayout] save failed:', error.message);
        return false;
      }
      queryClient.setQueryData(['home-tile-layout', uid], next);
      return true;
    } catch (err) {
      console.warn('[useHomeTileLayout] save failed:', err);
      return false;
    }
  }, [uid, queryClient]);

  return { layout, layoutLoading, save };
}
