// Data layer for PartTrack. All writes chain .select() and check the row —
// demo-tenant writes fail silently otherwise.
import { supabase } from '@/integrations/supabase/client';
import type {
  PartTrackPart,
  PartTrackRender,
  PartTrackRights,
  PartTrackRightsBasis,
  PartTrackScore,
  PartTrackSourceType,
} from './types';

const EXT: Record<PartTrackSourceType, string> = { musicxml: 'musicxml', mxl: 'mxl', midi: 'mid' };

export async function getScoreForSheetMusic(sheetMusicId: string): Promise<PartTrackScore | null> {
  const { data, error } = await supabase
    .from('gw_parttrack_scores')
    .select('*')
    .eq('sheet_music_id', sheetMusicId)
    .maybeSingle();
  if (error) throw error;
  return data as PartTrackScore | null;
}

export async function createScore(
  sheetMusicId: string,
  file: File,
  sourceType: PartTrackSourceType,
  userId: string,
): Promise<PartTrackScore> {
  const id = crypto.randomUUID();
  const path = `uploads/${id}/source.${EXT[sourceType]}`;
  const up = await supabase.storage.from('parttrack').upload(path, file, { upsert: true });
  if (up.error) throw up.error;
  const { data, error } = await supabase
    .from('gw_parttrack_scores')
    .upsert(
      {
        id,
        sheet_music_id: sheetMusicId,
        source_type: sourceType,
        source_path: path,
        status: 'queued',
        created_by: userId,
      },
      { onConflict: 'tenant_id,sheet_music_id' },
    )
    .select()
    .single();
  if (error || !data) throw error ?? new Error('Score row was not created');
  const job = await supabase
    .from('gw_parttrack_jobs')
    .insert({ score_id: (data as PartTrackScore).id, kind: 'analyze' })
    .select()
    .single();
  if (job.error || !job.data) throw job.error ?? new Error('Analyze job was not created');
  return data as PartTrackScore;
}

export async function retryAnalyze(scoreId: string): Promise<void> {
  const upd = await supabase
    .from('gw_parttrack_scores')
    .update({ status: 'queued', error_message: null })
    .eq('id', scoreId)
    .select()
    .single();
  if (upd.error || !upd.data) throw upd.error ?? new Error('Score reset did not persist');
  const { data, error } = await supabase
    .from('gw_parttrack_jobs')
    .insert({ score_id: scoreId, kind: 'analyze' })
    .select()
    .single();
  if (error || !data) throw error ?? new Error('Analyze job was not created');
}

export async function listParts(scoreId: string): Promise<PartTrackPart[]> {
  const { data, error } = await supabase
    .from('gw_parttrack_parts')
    .select('*')
    .eq('score_id', scoreId)
    .order('source_part_index')
    .order('source_voice', { nullsFirst: true });
  if (error) throw error;
  return (data ?? []) as PartTrackPart[];
}

export async function updateParts(
  parts: Array<Pick<PartTrackPart, 'id' | 'role' | 'label' | 'include'>>,
): Promise<void> {
  for (const p of parts) {
    const { data, error } = await supabase
      .from('gw_parttrack_parts')
      .update({ role: p.role, label: p.label, include: p.include, confirmed: true })
      .eq('id', p.id)
      .select()
      .single();
    if (error || !data) throw error ?? new Error('Part update did not persist');
  }
}

export async function getRights(scoreId: string): Promise<PartTrackRights | null> {
  const { data, error } = await supabase
    .from('gw_parttrack_rights')
    .select('*')
    .eq('score_id', scoreId)
    .maybeSingle();
  if (error) throw error;
  return data as PartTrackRights | null;
}

export async function attestRights(
  scoreId: string,
  basis: PartTrackRightsBasis,
  licenseNumber: string | null,
  userId: string,
): Promise<void> {
  const { data, error } = await supabase
    .from('gw_parttrack_rights')
    .upsert(
      { score_id: scoreId, basis, license_number: licenseNumber, attested_by: userId },
      { onConflict: 'tenant_id,score_id' },
    )
    .select()
    .single();
  if (error || !data) throw error ?? new Error('Rights attestation did not persist');
}

export async function getLatestLicenseNumber(basis: PartTrackRightsBasis): Promise<string | null> {
  const { data } = await supabase
    .from('gw_parttrack_rights')
    .select('license_number')
    .eq('basis', basis)
    .not('license_number', 'is', null)
    .order('attested_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as { license_number: string | null } | null)?.license_number ?? null;
}

export async function enqueueRender(scoreId: string): Promise<void> {
  const { data, error } = await supabase
    .from('gw_parttrack_jobs')
    .insert({ score_id: scoreId, kind: 'render' })
    .select()
    .single();
  if (error || !data) throw error ?? new Error('Render job was not created');
  const upd = await supabase
    .from('gw_parttrack_scores')
    .update({ status: 'rendering' })
    .eq('id', scoreId)
    .select()
    .single();
  if (upd.error) throw upd.error;
}

export async function recordListen(
  scoreId: string,
  userId: string,
  batch: { partRole: string | null; tempoPct: number; seconds: number },
): Promise<void> {
  const { data, error } = await supabase
    .from('gw_parttrack_listens')
    .insert({
      score_id: scoreId,
      user_id: userId,
      part_role: batch.partRole,
      mode: 'player',
      seconds_listened: batch.seconds,
      tempo_pct: batch.tempoPct,
    })
    .select()
    .single();
  if (error || !data) throw error ?? new Error('Listen row was not recorded');
}

export async function logDownload(
  scoreId: string,
  userId: string,
  partRole: string | null,
  tempoPct: number | null,
): Promise<void> {
  const { data, error } = await supabase
    .from('gw_parttrack_listens')
    .insert({
      score_id: scoreId,
      user_id: userId,
      part_role: partRole,
      mode: 'download',
      seconds_listened: null,
      tempo_pct: tempoPct,
    })
    .select()
    .single();
  if (error || !data) throw error ?? new Error('Download row was not recorded');
}

export async function listRenders(scoreId: string): Promise<PartTrackRender[]> {
  const { data, error } = await supabase
    .from('gw_parttrack_renders')
    .select('*')
    .eq('score_id', scoreId)
    .order('kind');
  if (error) throw error;
  return (data ?? []) as PartTrackRender[];
}
