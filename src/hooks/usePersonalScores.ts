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
  // imslp/external rows (Repertoire "Add to My Music",
  // 20260727180000_repertoire_add_to_library.sql) carry no PDF of their
  // own — storage_path is NULL and external_url points at the source site.
  source: 'upload' | 'cpdl' | 'purchase' | 'imslp' | 'external';
  pd_work_id: string | null;
  entitlement_id: string | null;
  storage_path: string | null;
  thumbnail_path: string | null;
  ext_catalog_item_id: string | null;
  external_url: string | null;
  // Organization (20260803170000_my_music_organization.sql).
  tags: string[];
  is_favorite: boolean;
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
      // `.select()` after insert: demo tenants silently swallow writes, so a
      // missing row must surface as a real failure, not a lying success.
      const { data: inserted, error: insErr } = await (supabase as any)
        .from('gw_personal_scores')
        .insert({
          user_id: user.id,
          title: meta.title.trim(),
          composer: meta.composer?.trim() || null,
          voicing: meta.voicing?.trim() || null,
          source: 'upload',
          storage_path: path,
        })
        .select('id')
        .maybeSingle();
      if (insErr || !inserted) {
        // don't strand the object if the row failed
        await supabase.storage.from(PERSONAL_SCORES_BUCKET).remove([path]);
        throw new Error(insErr?.message ?? 'Could not save the score.');
      }
      qc.invalidateQueries({ queryKey: ['personal-scores', user.id] });
    },
    [user, qc],
  );

  const updateScore = useCallback(
    async (
      score: PersonalScore,
      patch: {
        title?: string;
        composer?: string | null;
        voicing?: string | null;
        tags?: string[];
        is_favorite?: boolean;
      },
    ) => {
      const updates: Record<string, string | string[] | boolean | null> = {};
      if (patch.title !== undefined) updates.title = patch.title.trim() || score.title;
      if (patch.composer !== undefined) updates.composer = patch.composer?.trim() || null;
      if (patch.voicing !== undefined) updates.voicing = patch.voicing?.trim() || null;
      if (patch.tags !== undefined) {
        updates.tags = [...new Set(patch.tags.map((t) => t.trim()).filter(Boolean))];
      }
      if (patch.is_favorite !== undefined) updates.is_favorite = patch.is_favorite;
      // `.select()` so an RLS/demo-tenant silent no-op fails loudly.
      const { data, error } = await (supabase as any)
        .from('gw_personal_scores')
        .update(updates)
        .eq('id', score.id)
        .select('id')
        .maybeSingle();
      if (error || !data) throw new Error(error?.message ?? 'Could not update the score.');
      qc.invalidateQueries({ queryKey: ['personal-scores', user?.id] });
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
      if (score.source === 'upload' && score.storage_path) {
        await supabase.storage.from(PERSONAL_SCORES_BUCKET).remove([score.storage_path]);
      }
      qc.invalidateQueries({ queryKey: ['personal-scores', user?.id] });
    },
    [user, qc],
  );

  return { scores, isLoading, uploadScore, updateScore, removeScore };
}
