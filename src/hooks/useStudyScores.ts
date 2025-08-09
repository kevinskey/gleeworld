import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { uploadFileAndGetUrl, getFileUrl } from '@/utils/storage';

export interface StudyScore {
  id: string;
  title: string;
  pdf_url: string;
  owner_id: string;
  derived_sheet_music_id: string;
  created_at: string;
}

export const useStudyScores = (currentSelected?: { url: string; title: string; id?: string } | null) => {
  const { user } = useAuth();
  const [scores, setScores] = useState<StudyScore[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const fetchScores = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      // Owned study scores
      const { data: owned, error: ownedErr } = await supabase
        .from('gw_study_scores')
        .select('id,title,pdf_url,derived_sheet_music_id,owner_id,created_at')
        .eq('owner_id', user.id)
        .order('updated_at', { ascending: false });
      if (ownedErr) throw ownedErr;

      // Collaborator study scores via collaborators table
      const { data: collabRows, error: collabErr } = await supabase
        .from('gw_study_score_collaborators')
        .select('study_score_id')
        .eq('user_id', user.id)
        .eq('is_active', true);
      if (collabErr) throw collabErr;

      let collabScores: StudyScore[] = [];
      if (collabRows && collabRows.length > 0) {
        const ids = collabRows.map((r) => r.study_score_id);
        const { data, error } = await supabase
          .from('gw_study_scores')
          .select('id,title,pdf_url,derived_sheet_music_id,owner_id,created_at')
          .in('id', ids);
        if (error) throw error;
        collabScores = (data as StudyScore[]) || [];
      }

      const merged = [...(owned as StudyScore[] || []), ...collabScores]
        .reduce<StudyScore[]>((acc, item) => {
          if (!acc.find((a) => a.id === item.id)) acc.push(item);
          return acc;
        }, [])
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

      setScores(merged);
    } catch (e) {
      console.error('Failed to load study scores', e);
      toast.error('Failed to load Study Scores');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const createFromCurrent = useCallback(async () => {
    if (!user?.id) {
      toast.error('Please sign in');
      return null;
    }
    if (!currentSelected?.id || !currentSelected.url) {
      toast.error('Open a score from the library first');
      return null;
    }

    setCreating(true);
    try {
      // Fetch original PDF via signed or direct URL
      const sourceUrl = currentSelected.url;
      const res = await fetch(sourceUrl);
      if (!res.ok) throw new Error('Could not fetch source PDF');
      const blob = await res.blob();
      const file = new File([blob], `${currentSelected.title.replace(/\s+/g, '_')}.pdf`, { type: 'application/pdf' });

      // Upload to study-scores bucket (public)
      const uploaded = await uploadFileAndGetUrl(file, 'study-scores', user.id);
      if (!uploaded) throw new Error('Upload failed');

      // Create a new sheet music row for the study copy
      const title = `${currentSelected.title} (Study Score)`;
      const { data: newMusic, error: musicErr } = await supabase
        .from('gw_sheet_music')
        .insert({ title, pdf_url: uploaded.url, is_public: false, created_by: user.id })
        .select('id')
        .single();
      if (musicErr) throw musicErr;

      // Create study score record
      const { data: study, error: studyErr } = await supabase
        .from('gw_study_scores')
        .insert({
          owner_id: user.id,
          source_sheet_music_id: currentSelected.id,
          derived_sheet_music_id: newMusic.id,
          title,
          pdf_url: uploaded.url,
        })
        .select('*')
        .single();
      if (studyErr) throw studyErr;

      toast.success('Study Score created');
      await fetchScores();
      return study as StudyScore;
    } catch (e: any) {
      console.error('Create Study Score failed', e);
      toast.error(e?.message || 'Failed to create Study Score');
      return null;
    } finally {
      setCreating(false);
    }
  }, [user?.id, currentSelected, fetchScores]);

  const shareStudyScore = useCallback(async (studyScoreId: string, email: string, role: 'viewer' | 'editor' = 'editor') => {
    try {
      const { data, error } = await supabase.rpc('share_study_score', {
        p_study_score_id: studyScoreId,
        p_collaborator_email: email,
        p_role: role,
      });
      if (error) throw error;
      toast.success('Shared successfully');
      await fetchScores();
      return true;
    } catch (e: any) {
      console.error('Share Study Score failed', e);
      toast.error(e?.message || 'Failed to share');
      return false;
    }
  }, [fetchScores]);

  useEffect(() => {
    fetchScores();
  }, [fetchScores]);

  return { scores, loading, creating, fetchScores, createFromCurrent, shareStudyScore };
};
