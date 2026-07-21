import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type TrackKind = 'accompaniment' | 'soprano' | 'alto' | 'tenor' | 'bass' | 'solo' | 'piano' | 'custom';

export interface PartTrack {
  id: string;
  project_id: string;
  kind: TrackKind;
  label: string;
  color: string;
  sort_order: number;
  volume: number;
  pan: number;
  muted: boolean;
  solo: boolean;
  audio_url: string | null;
  duration_sec: number | null;
  waveform_peaks: number[] | null;
  assigned_user_id: string | null;
  /** Master-timeline position the take was recorded at — used to align
   *  the vocal with the backing on subsequent plays. 0 for first-takes
   *  and accompaniment. */
  record_offset_sec: number;
}

export interface PartTracksProject {
  id: string;
  sheet_music_id: string;
  title: string;
  voicing: string | null;
  tempo_bpm: number | null;
  key_signature: string | null;
  accompaniment_url: string | null;
  accompaniment_title: string | null;
  created_at: string;
  /** Owner (created_by). Only the owner can write; other tenant members see
   *  the project only when is_shared = true. Enforced by RLS on
   *  gw_part_tracks_projects (see 20260720170000_part_tracks_private.sql). */
  created_by: string | null;
  is_shared: boolean;
}

// Voicing → default voice parts. Drives the "Create project" template
// so a SATB score auto-spawns S/A/T/B tracks, an SSA spawns S1/S2/A, etc.
export const VOICING_TEMPLATES: Record<string, Array<{ kind: TrackKind; label: string; color: string }>> = {
  SATB:  [{ kind: 'soprano', label: 'Soprano', color: '#fbbf24' },
          { kind: 'alto',    label: 'Alto',    color: '#f97316' },
          { kind: 'tenor',   label: 'Tenor',   color: '#3b82f6' },
          { kind: 'bass',    label: 'Bass',    color: '#9333ea' }],
  SSA:   [{ kind: 'soprano', label: 'Soprano 1', color: '#fbbf24' },
          { kind: 'soprano', label: 'Soprano 2', color: '#f59e0b' },
          { kind: 'alto',    label: 'Alto',      color: '#f97316' }],
  TTBB:  [{ kind: 'tenor',   label: 'Tenor 1',   color: '#60a5fa' },
          { kind: 'tenor',   label: 'Tenor 2',   color: '#3b82f6' },
          { kind: 'bass',    label: 'Baritone',  color: '#7c3aed' },
          { kind: 'bass',    label: 'Bass',      color: '#9333ea' }],
  SAB:   [{ kind: 'soprano', label: 'Soprano',   color: '#fbbf24' },
          { kind: 'alto',    label: 'Alto',      color: '#f97316' },
          { kind: 'bass',    label: 'Bass',      color: '#9333ea' }],
  Unison:[{ kind: 'custom',  label: 'Melody',    color: '#fbbf24' }],
};

export function usePartTracksProjectsForScore(sheetMusicId: string | undefined) {
  return useQuery<PartTracksProject[]>({
    queryKey: ['part-tracks-projects', sheetMusicId],
    enabled: !!sheetMusicId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_part_tracks_projects')
        .select('*')
        .eq('sheet_music_id', sheetMusicId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as PartTracksProject[];
    },
  });
}

export function usePartTracksProject(projectId: string | undefined) {
  const qc = useQueryClient();
  const { user } = useAuth();

  const { data: project } = useQuery<PartTracksProject | null>({
    queryKey: ['part-tracks-project', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_part_tracks_projects')
        .select('*')
        .eq('id', projectId!)
        .maybeSingle();
      if (error) throw error;
      return data as PartTracksProject | null;
    },
  });

  const { data: tracks = [] } = useQuery<PartTrack[]>({
    queryKey: ['part-tracks-tracks', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_part_tracks_tracks')
        .select('*')
        .eq('project_id', projectId!)
        .order('sort_order');
      if (error) throw error;
      return (data ?? []) as PartTrack[];
    },
  });

  const updateTrack = useMutation({
    mutationFn: async (input: { id: string; patch: Partial<PartTrack> }) => {
      const { error } = await supabase
        .from('gw_part_tracks_tracks')
        .update({ ...input.patch, updated_at: new Date().toISOString() })
        .eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['part-tracks-tracks', projectId] }),
  });

  const updateProject = useMutation({
    mutationFn: async (patch: Partial<PartTracksProject>) => {
      if (!projectId) throw new Error('Missing projectId');
      const { error } = await supabase
        .from('gw_part_tracks_projects')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', projectId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['part-tracks-project', projectId] }),
  });

  const addTrack = useMutation({
    mutationFn: async (input: { kind: TrackKind; label: string; color?: string }) => {
      if (!projectId) throw new Error('Missing projectId');
      const { error } = await supabase
        .from('gw_part_tracks_tracks')
        .insert({
          project_id: projectId,
          kind: input.kind,
          label: input.label,
          color: input.color ?? '#fbbf24',
          sort_order: tracks.length,
        });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['part-tracks-tracks', projectId] }),
  });

  const deleteTrack = useMutation({
    mutationFn: async (trackId: string) => {
      const { error } = await supabase
        .from('gw_part_tracks_tracks').delete().eq('id', trackId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['part-tracks-tracks', projectId] }),
  });

  return { project, tracks, updateTrack, updateProject, addTrack, deleteTrack };
}

export async function createPartTracksProject(input: {
  // null = no score linked. Optional since 2026-07-10 (migration
  // 20260710210000) — a project can be just a backing track + voices.
  sheetMusicId: string | null;
  title: string;
  voicing: string | null;
  tempoBpm?: number | null;
  keySignature?: string | null;
  userId?: string | null;
}): Promise<string | null> {
  const { data, error } = await supabase
    .from('gw_part_tracks_projects')
    .insert({
      sheet_music_id: input.sheetMusicId,
      title: input.title,
      voicing: input.voicing,
      tempo_bpm: input.tempoBpm ?? null,
      key_signature: input.keySignature ?? null,
      created_by: input.userId ?? null,
    })
    .select()
    .single();
  if (error || !data) return null;

  // Only seed the Accompaniment track. Voicing-based auto-population
  // (Soprano/Alto/Tenor/Bass for SATB, etc.) was removed 2026-06-17 —
  // teachers asked to start with an empty roster and add parts one by
  // one so the project reflects only what they actually intend to
  // record. The voicing field is still stored on the project so the
  // "Add part" dropdown can suggest the right default labels.
  await supabase.from('gw_part_tracks_tracks').insert([
    { project_id: data.id, kind: 'accompaniment' as TrackKind, label: 'Accompaniment', color: '#94a3b8', sort_order: 0 },
  ]);

  return data.id;
}

// Hard-delete a Part Tracks project. The CASCADE on
// gw_part_tracks_tracks.project_id removes every track + recording
// linked to it in one statement.
export async function deletePartTracksProject(id: string): Promise<{ error?: string }> {
  const { error } = await supabase
    .from('gw_part_tracks_projects')
    .delete()
    .eq('id', id);
  if (error) return { error: error.message };
  return {};
}
