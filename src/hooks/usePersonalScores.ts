import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  PERSONAL_SCORES_BUCKET, personalScoreUploadPath, validateScoreFile,
} from '@/lib/personalLibrary';

export interface PersonalScore {
  id: string;
  user_id: string;
  title: string;
  composer: string | null;
  voicing: string | null;
  source: 'upload' | 'cpdl' | 'purchase';
  pd_work_id: string | null;
  entitlement_id: string | null;
  storage_path: string;
  thumbnail_path: string | null;
  created_at: string;
}

export function usePersonalScores() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: scores = [], isLoading } = useQuery<PersonalScore[]>({
    queryKey: ['personal-scores', user?.id],
    enabled: !!user,
    queryFn: async () => {
      // gw_personal_scores is not in generated types yet (types regen pending)
      const { data, error } = await (supabase as any)
        .from('gw_personal_scores')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as PersonalScore[];
    },
  });

  const uploadScore = useCallback(
    async (file: File, meta: { title: string; composer?: string; voicing?: string }) => {
      if (!user) throw new Error('Sign in to add music.');
      const invalid = validateScoreFile(file);
      if (invalid) throw new Error(invalid);
      const path = personalScoreUploadPath(user.id, file.name);
      const { error: upErr } = await supabase.storage
        .from(PERSONAL_SCORES_BUCKET)
        .upload(path, file, { contentType: 'application/pdf', upsert: false });
      if (upErr) throw new Error(upErr.message);
      const { error: insErr } = await (supabase as any).from('gw_personal_scores').insert({
        user_id: user.id,
        title: meta.title.trim(),
        composer: meta.composer?.trim() || null,
        voicing: meta.voicing?.trim() || null,
        source: 'upload',
        storage_path: path,
      });
      if (insErr) {
        // don't strand the object if the row failed
        await supabase.storage.from(PERSONAL_SCORES_BUCKET).remove([path]);
        throw new Error(insErr.message);
      }
      qc.invalidateQueries({ queryKey: ['personal-scores', user.id] });
    },
    [user, qc],
  );

  const removeScore = useCallback(
    async (score: PersonalScore) => {
      const { error } = await (supabase as any)
        .from('gw_personal_scores')
        .delete()
        .eq('id', score.id);
      if (error) throw new Error(error.message);
      if (score.source === 'upload') {
        await supabase.storage.from(PERSONAL_SCORES_BUCKET).remove([score.storage_path]);
      }
      qc.invalidateQueries({ queryKey: ['personal-scores', user?.id] });
    },
    [user, qc],
  );

  return { scores, isLoading, uploadScore, removeScore };
}
