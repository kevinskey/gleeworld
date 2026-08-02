import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface RhythmAttemptPayload {
  bpm: number;
  input: 'tap' | 'mic';
  syllables: string;
  tolerancePct: number;
  expected: number[];
  actual: number[];
  verdicts: string[];
  meter: { beats: number; beatType: number };
  seed: number;
  no_input?: boolean;
}

export interface AttemptInsert {
  domain: string;
  drill: string;
  mode: 'practice' | 'assessment';
  level: number;
  score: number;
  passed: boolean;
  payload: RhythmAttemptPayload;
}

export interface AssessmentRow {
  id: string;
  user_id: string;
  drill: string;
  level: number;
  score: number;
  override_score: number | null;
  payload: RhythmAttemptPayload;
  created_at: string;
}

// gw_reading_music_attempts is not in the generated types yet (regen happens
// at deploy); the `as never` casts follow the repo's pre-regen convention.
export async function insertAttempt(a: AttemptInsert): Promise<boolean> {
  const { data, error } = await (supabase.from('gw_reading_music_attempts' as never) as ReturnType<typeof supabase.from>)
    .insert(a as never)
    .select()
    .single();
  if (error || !data) {
    toast.error('Attempt not saved', { description: error?.message ?? 'No row returned — are you on a demo tenant?' });
    return false;
  }
  return true;
}

export async function listAssessmentAttempts(limit = 50): Promise<AssessmentRow[]> {
  const { data, error } = await (supabase.from('gw_reading_music_attempts' as never) as ReturnType<typeof supabase.from>)
    .select('id, user_id, drill, level, score, override_score, payload, created_at')
    .eq('mode', 'assessment')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    toast.error('Could not load attempts', { description: error.message });
    return [];
  }
  return (data ?? []) as unknown as AssessmentRow[];
}

export async function overrideAttempt(id: string, newScore: number): Promise<boolean> {
  const { error } = await supabase.rpc('override_reading_music_attempt' as never, {
    p_attempt_id: id,
    p_new_score: newScore,
  } as never);
  if (error) {
    toast.error('Override failed', { description: error.message });
    return false;
  }
  toast.success('Score updated');
  return true;
}
