import { supabase } from '@/integrations/supabase/client';
import type { ScoreResult } from './score';
import type { ExerciseIR } from './ir';

// One practiced take, normalized to a single shape the Progress tab renders —
// whether it came from the server table or the local activity log.
export interface Take {
  ts: number;
  overall: number;
  level?: number;
  musicKey?: string;
}

// gw_sight_reading_takes is net-new and not in the generated Supabase types yet,
// so reach it through an untyped handle. Kept to this file.
const takesTable = () => (supabase as unknown as {
  from: (t: string) => any;
}).from('gw_sight_reading_takes');

interface TakeRow {
  overall: number;
  level: number | null;
  exercise_key: string | null;
  created_at: string;
}

export function rowToTake(row: TakeRow): Take {
  return {
    ts: new Date(row.created_at).getTime(),
    overall: row.overall,
    level: row.level ?? undefined,
    musicKey: row.exercise_key ?? undefined,
  };
}

// Read + normalize the device-local practice log (what SingFlow writes on every
// take). Tolerant of anything malformed — a bad blob yields an empty history,
// never a throw.
export function readLocalTakes(storageKey: string): Take[] {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return [];
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return list
      .filter((e) => e && e.kind === 'practiced' && e.meta && typeof e.meta.overall === 'number')
      .map((e) => ({ ts: e.ts, overall: e.meta.overall, level: e.meta.level, musicKey: e.meta.key }));
  } catch {
    return [];
  }
}

// The signed-in student's most recent takes from the server, newest first. RLS
// scopes rows to the caller, so no explicit user_id filter is needed. Returns
// null (not []) to signal "couldn't load / not available" so the caller can fall
// back to the local log rather than showing an empty history.
export async function fetchServerTakes(limit = 50): Promise<Take[] | null> {
  try {
    const { data, error } = await takesTable()
      .select('overall, level, exercise_key, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error || !data) return null;
    return (data as TakeRow[]).map(rowToTake);
  } catch {
    return null;
  }
}

// Persist one scored take for the signed-in student. Best-effort: a failure here
// (offline, signed out) must never disrupt the post-take UX — the local log is
// still written by SingFlow either way. tenant_id and user_id are filled by
// column defaults + the tenant trigger, so they are not sent from the client.
export async function recordTake(ir: ExerciseIR, r: ScoreResult): Promise<void> {
  const realizedBeats = ir.notes.reduce((s, n) => s + n.durationBeats, 0);
  try {
    const { error } = await takesTable().insert({
      overall: r.overall,
      pitch: r.pitch,
      rhythm: r.rhythm,
      retention: r.retention,
      first_note_ok: r.firstNoteOk,
      exercise_key: ir.key,
      mode: ir.mode,
      level: ir.difficulty,
      bars: Math.max(1, Math.round(realizedBeats / ir.meter.beats)),
    });
    if (error) console.error('sight-reading: recordTake failed', error);
  } catch (err) {
    console.error('sight-reading: recordTake threw', err);
  }
}
