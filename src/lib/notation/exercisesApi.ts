import { supabase } from '@/integrations/supabase/client';
import { EditorScore } from './model';
import { editorScoreToMusicXML } from './musicxmlWrite';
import { musicXmlToEditorScore } from './musicxmlRead';
import { editorScoreToIR } from './toIR';

export function scoreToRow(score: EditorScore) {
  return {
    title: score.title,
    musicxml: editorScoreToMusicXML(score),
    params: {
      key: score.keyFifths, mode: score.mode, timeSig: score.timeSig,
      clef: score.clef, tempo: score.tempo, ir: editorScoreToIR(score),
      // MusicXML round-trip drops layout hints like user-forced system
      // breaks, so we mirror them in params.systemBreaks. Load merges
      // them back onto the parsed score.
      systemBreaks: score.systemBreaks ?? [],
    },
  };
}

export async function saveExercise(score: EditorScore, existingId?: string): Promise<{ id: string }> {
  const row = scoreToRow(score);
  if (existingId) {
    const { data, error } = await supabase.from('gw_sight_reading_exercises')
      .update(row).eq('id', existingId).select('id').single();
    if (error) throw error;
    if (!data) throw new Error('notation: exercise not found or not editable');
    return { id: existingId };
  }
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth?.user?.id;
  if (!userId) throw new Error('notation: must be signed in to save an exercise');
  const { data, error } = await supabase.from('gw_sight_reading_exercises')
    .insert({ ...row, user_id: userId }).select('id').single();
  if (error) throw error;
  return { id: data!.id as string };
}

export async function loadExercise(id: string): Promise<EditorScore> {
  const { data, error } = await supabase
    .from('gw_sight_reading_exercises')
    .select('musicxml, params')
    .eq('id', id)
    .single();
  if (error) throw error;
  const score = musicXmlToEditorScore(data!.musicxml as string);
  // Merge layout hints back in — MusicXML dropped them on save.
  const paramsBreaks = (data as any)?.params?.systemBreaks;
  if (Array.isArray(paramsBreaks)) {
    score.systemBreaks = paramsBreaks.filter((n: unknown): n is number => typeof n === 'number');
  }
  return score;
}
