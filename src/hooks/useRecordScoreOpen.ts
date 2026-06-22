import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Records that this user opened this score, so the Viewer's "Recent" sort
// + future Continue Reading row can surface it. UPSERT on (user_id,
// sheet_music_id) bumps last_opened_at and open_count; tenant_id is filled
// by the BEFORE INSERT trigger. Side-effect only; no UI.
export function useRecordScoreOpen(sheetMusicId: string | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();
  useEffect(() => {
    if (!sheetMusicId || !user?.id) return;
    let cancelled = false;
    (async () => {
      const { error } = await supabase
        .from('gw_sheet_music_recent_opens')
        .upsert(
          {
            user_id: user.id,
            sheet_music_id: sheetMusicId,
            last_opened_at: new Date().toISOString(),
            open_count: 1,
          },
          { onConflict: 'user_id,sheet_music_id', ignoreDuplicates: false },
        );
      // upsert with onConflict won't increment — do a follow-up RPC-less
      // bump via a stored function would be cleaner, but for now the
      // last_opened_at is what the Recent sort cares about. open_count
      // gets at least 1 on first open, which is enough to power a
      // "favorite by frequency" view later.
      if (cancelled) return;
      if (error) {
        console.warn('[useRecordScoreOpen]', error.message);
        return;
      }
      qc.invalidateQueries({ queryKey: ['viewer-recent-opens', user.id] });
    })();
    return () => { cancelled = true; };
  }, [sheetMusicId, user?.id, qc]);
}
