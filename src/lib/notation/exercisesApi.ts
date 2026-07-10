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
    },
  };
}

export async function saveExercise(score: EditorScore, existingId?: string): Promise<{ id: string }> {
  const row = scoreToRow(score);
  if (existingId) {
    const { error } = await supabase.from('gw_sight_reading_exercises').update(row).eq('id', existingId);
    if (error) throw error;
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
  const { data, error } = await supabase.from('gw_sight_reading_exercises').select('musicxml').eq('id', id).single();
  if (error) throw error;
  return musicXmlToEditorScore(data!.musicxml as string);
}
