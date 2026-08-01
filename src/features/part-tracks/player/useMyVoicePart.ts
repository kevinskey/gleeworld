import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { normalizeVoicePart } from '../voiceParts';

export function useMyVoicePart(userId: string | undefined): string | null {
  const [voicePart, setVoicePart] = useState<string | null>(null);
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from('gw_profiles_directory')
        .select('voice_part')
        .eq('user_id', userId)
        .maybeSingle();
      if (!cancelled) setVoicePart(normalizeVoicePart((data as { voice_part: string | null } | null)?.voice_part));
    })();
    return () => { cancelled = true; };
  }, [userId]);
  return voicePart;
}
