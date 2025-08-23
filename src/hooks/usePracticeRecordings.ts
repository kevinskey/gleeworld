import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { toast } from 'sonner';

export interface PracticeRecording {
  id: string;
  title: string;
  url: string;
  notes?: string;
  voice_part?: string;
  target_section?: string;
  visibility: string;
  created_at: string;
  updated_at: string;
  owner_id: string;
  music_id: string;
  owner_name?: string;
  sheet_music_title?: string;
}

export const usePracticeRecordings = () => {
  const { user } = useAuth();
  const { userProfile } = useUserProfile(user);
  const [recordings, setRecordings] = useState<PracticeRecording[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchPracticeRecordings = useCallback(async () => {
    if (!user || !userProfile) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('gw_practice_links')
        .select(`
          *,
          owner_profile:gw_profiles(full_name),
          sheet_music:gw_sheet_music(title)
        `)
        .or(`voice_part.is.null,voice_part.eq.${userProfile.voice_part || 'none'}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedRecordings: PracticeRecording[] = (data || []).map(recording => ({
        id: recording.id,
        title: recording.title,
        url: recording.url,
        notes: recording.notes,
        voice_part: recording.voice_part,
        target_section: recording.target_section,
        visibility: recording.visibility,
        created_at: recording.created_at,
        updated_at: recording.updated_at,
        owner_id: recording.owner_id,
        music_id: recording.music_id,
        owner_name: (recording.owner_profile as any)?.full_name || 'Unknown',
        sheet_music_title: (recording.sheet_music as any)?.title || 'Unknown'
      }));

      setRecordings(formattedRecordings);
    } catch (error) {
      console.error('Error fetching practice recordings:', error);
      toast.error('Failed to load practice recordings');
    } finally {
      setLoading(false);
    }
  }, [user, userProfile]);

  const createPracticeRecording = useCallback(async (
    musicId: string,
    title: string,
    url: string,
    voicePart?: string,
    notes?: string
  ) => {
    if (!user) {
      toast.error('Please sign in to create practice recordings');
      return false;
    }

    // Check if user is section leader or admin
    const isAuthorized = userProfile?.is_admin || userProfile?.is_super_admin || 
      (userProfile as any)?.is_section_leader;
    
    if (!isAuthorized) {
      toast.error('Only section leaders and admins can create practice recordings');
      return false;
    }

    setUploading(true);
    try {
      const { data, error } = await supabase
        .from('gw_practice_links')
        .insert({
          music_id: musicId,
          owner_id: user.id,
          title,
          url,
          voice_part: voicePart || userProfile.voice_part,
          visibility: 'public',
          notes
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Practice recording created successfully');
      await fetchPracticeRecordings();
      return true;
    } catch (error) {
      console.error('Error creating practice recording:', error);
      toast.error('Failed to create practice recording');
      return false;
    } finally {
      setUploading(false);
    }
  }, [user, userProfile, fetchPracticeRecordings]);

  const deletePracticeRecording = useCallback(async (recordingId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('gw_practice_links')
        .delete()
        .eq('id', recordingId);

      if (error) throw error;

      toast.success('Practice recording deleted');
      await fetchPracticeRecordings();
      return true;
    } catch (error) {
      console.error('Error deleting practice recording:', error);
      toast.error('Failed to delete practice recording');
      return false;
    }
  }, [user, fetchPracticeRecordings]);

  useEffect(() => {
    fetchPracticeRecordings();
  }, [fetchPracticeRecordings]);

  return {
    recordings,
    loading,
    uploading,
    fetchPracticeRecordings,
    createPracticeRecording,
    deletePracticeRecording,
    canCreateRecordings: userProfile?.is_admin || userProfile?.is_super_admin || 
      (userProfile as any)?.is_section_leader
  };
};