import { supabase } from '@/integrations/supabase/client';
import type { Song, SongSummary } from './types';

export type SongRow = {
  id: string; user_id: string; title: string;
  sections: unknown; notes: string | null;
  tempo_bpm: number | null; key_signature: string | null;
  graveyard: unknown; chord_chart: unknown;
  visibility: 'private' | 'tenant';
  created_at: string; updated_at: string;
};

export function rowToSong(row: SongRow): Song {
  return {
    id: row.id,
    user_id: row.user_id,
    title: row.title,
    sections: (row.sections as Song['sections']) ?? [],
    notes: row.notes ?? '',
    tempo_bpm: row.tempo_bpm,
    key_signature: row.key_signature,
    graveyard: (row.graveyard as Song['graveyard']) ?? [],
    chord_chart: (row.chord_chart as Song['chord_chart']) ?? null,
    visibility: row.visibility,
    created_at: row.created_at,
    updated_at: row.updated_at,
  } as Song;
}

const SUMMARY_COLS =
  'id, user_id, title, tempo_bpm, key_signature, visibility, created_at, updated_at, sections';

function rowToSummary(row: SongRow): SongSummary {
  const sections = (row.sections as unknown[]) ?? [];
  const { sections: _s, ...rest } = rowToSong(row);
  const { notes: _n, graveyard: _g, chord_chart: _c, ...summary } = rest as Song;
  return { ...(summary as Omit<SongSummary, 'section_count'>), section_count: sections.length };
}

export async function listMySongs(): Promise<SongSummary[]> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth?.user?.id;
  const { data, error } = await supabase
    .from('gw_songs').select(SUMMARY_COLS)
    .eq('user_id', uid).order('updated_at', { ascending: false });
  if (error) throw error;
  return (data as SongRow[]).map(rowToSummary);
}

export async function listSharedSongs(): Promise<SongSummary[]> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth?.user?.id;
  const { data, error } = await supabase
    .from('gw_songs').select(SUMMARY_COLS)
    .eq('visibility', 'tenant').neq('user_id', uid)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data as SongRow[]).map(rowToSummary);
}

export async function getSong(id: string): Promise<Song> {
  const { data, error } = await supabase.from('gw_songs').select('*').eq('id', id).single();
  if (error) throw error;
  return rowToSong(data as SongRow);
}

export async function createSong(partial: Partial<Song> = {}): Promise<Song> {
  const { data: auth } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('gw_songs')
    .insert({
      user_id: auth?.user?.id,
      title: partial.title ?? 'Untitled song',
      sections: partial.sections ?? [],
      graveyard: partial.graveyard ?? [],
    })
    .select('*').single();
  if (error) throw error;
  return rowToSong(data as SongRow);
}

export async function updateSong(id: string, patch: Partial<Song>): Promise<Song> {
  const { id: _i, user_id: _u, created_at: _c, updated_at: _t, ...cols } = patch as Record<string, unknown>;
  const { data, error } = await supabase
    .from('gw_songs').update(cols).eq('id', id).select('*').single();
  if (error) throw error;
  return rowToSong(data as SongRow);
}

export async function deleteSong(id: string): Promise<void> {
  const { error } = await supabase.from('gw_songs').delete().eq('id', id);
  if (error) throw error;
}

export async function setVisibility(id: string, visibility: 'private' | 'tenant'): Promise<void> {
  const { error } = await supabase.from('gw_songs').update({ visibility }).eq('id', id);
  if (error) throw error;
}
