// Per-user Command Center background color, persisted in the
// gw_user_preferences key/value table (owner-RLS, caller-JWT access) under
// BG_PREF_KEY. null = default token background.
//
// Writes are update-then-insert rather than upsert: two migrations shaped
// this table (20260723 UNIQUE(user_id,key); 20260805 tenant-scoped unique),
// and an `onConflict` that names the wrong index 42P10s. Updating the
// existing row (found via the same RLS-scoped read the query uses) and
// inserting only when none exists works against either shape.
import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { BG_PREF_KEY, isValidBgColor } from '@/lib/home/commandCenterBackground';

export function useCommandCenterBackground() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const uid = user?.id;
  const queryKey = ['command-center-bg', uid];

  const { data: background = null } = useQuery<string | null>({
    queryKey,
    enabled: !!uid,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('gw_user_preferences')
        .select('value')
        .eq('key', BG_PREF_KEY)
        .maybeSingle();
      // A missing table or transient error must never break the home page —
      // the default background is always a safe answer.
      if (error) return null;
      const v = data?.value ?? null;
      return isValidBgColor(v) ? v : null;
    },
  });

  const setBackground = useCallback(
    async (color: string | null) => {
      if (!uid) return;
      if (color !== null && !isValidBgColor(color)) return;
      const previous = qc.getQueryData<string | null>(queryKey);
      qc.setQueryData(queryKey, color); // optimistic — color swap should feel instant
      try {
        if (color === null) {
          const { error } = await (supabase as any)
            .from('gw_user_preferences')
            .delete()
            .eq('user_id', uid)
            .eq('key', BG_PREF_KEY);
          if (error) throw error;
          return;
        }
        const { data: updated, error: upErr } = await (supabase as any)
          .from('gw_user_preferences')
          .update({ value: color })
          .eq('user_id', uid)
          .eq('key', BG_PREF_KEY)
          .select('id');
        if (upErr) throw upErr;
        if (!updated || updated.length === 0) {
          const { error: insErr } = await (supabase as any)
            .from('gw_user_preferences')
            .insert({ user_id: uid, key: BG_PREF_KEY, value: color });
          if (insErr) throw insErr;
        }
      } catch (e) {
        qc.setQueryData(queryKey, previous ?? null); // roll back the optimistic swap
        throw e;
      }
    },
    [uid, qc, queryKey],
  );

  return { background, setBackground };
}
