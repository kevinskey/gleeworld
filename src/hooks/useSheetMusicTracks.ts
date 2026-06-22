import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type AudioTrackKind = 'file' | 'media_library' | 'youtube' | 'apple_music';

export interface AudioTrack {
  id: string;
  sheet_music_id: string;
  label: string;
  kind: AudioTrackKind;
  audio_url: string | null;
  audio_title: string | null;
  apple_music_id: string | null;
  apple_music_storefront: string | null;
  apple_music_title: string | null;
  apple_music_artist: string | null;
  apple_music_artwork_url: string | null;
  sort_order: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

// All audio tracks bound to one score. Sorted by sort_order then
// created_at — newly added tracks land at the end.
export function useSheetMusicTracks(sheetMusicId: string | undefined) {
  const qc = useQueryClient();
  const queryKey = ['sheet-music-audio-tracks', sheetMusicId];

  const { data: tracks = [], isLoading } = useQuery<AudioTrack[]>({
    queryKey,
    enabled: !!sheetMusicId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_sheet_music_audio_tracks')
        .select('*')
        .eq('sheet_music_id', sheetMusicId!)
        .order('sort_order')
        .order('created_at');
      if (error) throw error;
      return (data ?? []) as AudioTrack[];
    },
  });

  const defaultTrack = tracks.find((t) => t.is_default) ?? tracks[0] ?? null;

  // Insert a new track. If this is the first track for the score it
  // becomes default automatically. Caller passes only the source-relevant
  // fields; the rest are derived.
  const addTrack = useMutation({
    mutationFn: async (input: Omit<Partial<AudioTrack>, 'id' | 'created_at' | 'updated_at'> & { label: string; kind: AudioTrackKind }) => {
      if (!sheetMusicId) throw new Error('Missing sheet_music_id');
      const isFirst = tracks.length === 0;
      const row = {
        sheet_music_id: sheetMusicId,
        label: input.label.trim(),
        kind: input.kind,
        audio_url: input.audio_url ?? null,
        audio_title: input.audio_title ?? null,
        apple_music_id: input.apple_music_id ?? null,
        apple_music_storefront: input.apple_music_storefront ?? null,
        apple_music_title: input.apple_music_title ?? null,
        apple_music_artist: input.apple_music_artist ?? null,
        apple_music_artwork_url: input.apple_music_artwork_url ?? null,
        sort_order: tracks.length,
        is_default: isFirst,
      };
      const { data, error } = await supabase
        .from('gw_sheet_music_audio_tracks')
        .insert(row)
        .select()
        .single();
      if (error) throw error;
      return data as AudioTrack;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey }); },
  });

  const renameTrack = useMutation({
    mutationFn: async (input: { id: string; label: string }) => {
      const { error } = await supabase
        .from('gw_sheet_music_audio_tracks')
        .update({ label: input.label.trim(), updated_at: new Date().toISOString() })
        .eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey }); },
  });

  // Promote a track to default. Clears the previous default first to
  // satisfy the partial unique index.
  const setDefaultTrack = useMutation({
    mutationFn: async (id: string) => {
      if (!sheetMusicId) throw new Error('Missing sheet_music_id');
      const current = tracks.find((t) => t.is_default);
      if (current && current.id !== id) {
        const { error: clearErr } = await supabase
          .from('gw_sheet_music_audio_tracks')
          .update({ is_default: false })
          .eq('id', current.id);
        if (clearErr) throw clearErr;
      }
      const { error } = await supabase
        .from('gw_sheet_music_audio_tracks')
        .update({ is_default: true, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey }); },
  });

  const deleteTrack = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('gw_sheet_music_audio_tracks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey }); },
  });

  return { tracks, defaultTrack, isLoading, addTrack, renameTrack, setDefaultTrack, deleteTrack };
}
