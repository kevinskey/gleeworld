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

// ── Teacher-facing class progress ──────────────────────────────────────────

// Per-student roll-up for the admin/teacher Class view.
export interface StudentProgress {
  userId: string;
  name: string;
  takes: number;
  best: number;
  avg: number;
  lastTs: number;
}

interface ClassTakeRow { user_id: string; overall: number; created_at: string }
interface ProfileRow {
  user_id: string;
  full_name: string | null;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

function profileName(p: ProfileRow | undefined): string {
  if (p) {
    const named =
      p.display_name?.trim() ||
      p.full_name?.trim() ||
      [p.first_name, p.last_name].filter(Boolean).join(' ').trim();
    if (named) return named;
    if (p.email) return p.email;
  }
  return 'Student';
}

// Group raw takes by student and roll each up (count/best/avg/last), attaching a
// display name. Most-recently-active student first. Pure, so it's unit-tested
// without the network.
export function aggregateClassProgress(takes: ClassTakeRow[], profiles: ProfileRow[]): StudentProgress[] {
  const nameOf = new Map(profiles.map((p) => [p.user_id, p]));
  const groups = new Map<string, ClassTakeRow[]>();
  for (const t of takes) {
    const g = groups.get(t.user_id);
    if (g) g.push(t);
    else groups.set(t.user_id, [t]);
  }
  const out: StudentProgress[] = [];
  for (const [userId, rows] of groups) {
    const overalls = rows.map((r) => r.overall);
    out.push({
      userId,
      name: profileName(nameOf.get(userId)),
      takes: rows.length,
      best: overalls.reduce((m, x) => Math.max(m, x), 0),
      avg: Math.round(overalls.reduce((s, x) => s + x, 0) / overalls.length),
      lastTs: rows.reduce((m, r) => Math.max(m, new Date(r.created_at).getTime()), 0),
    });
  }
  return out.sort((a, b) => b.lastTs - a.lastTs);
}

// Every student's take history in the caller's tenant, rolled up per student.
// Relies on the srt_admin_read RLS policy — a non-admin's query returns only
// their own rows, which the Class tab is gated against showing anyway. Returns
// null on failure so the view can distinguish "error" from "no takes yet".
export async function fetchClassProgress(limit = 1000): Promise<StudentProgress[] | null> {
  try {
    const { data: takeData, error } = await takesTable()
      .select('user_id, overall, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error || !takeData) return null;
    const takes = takeData as ClassTakeRow[];
    if (takes.length === 0) return [];
    const ids = [...new Set(takes.map((t) => t.user_id))];
    const { data: profData } = await supabase
      .from('gw_profiles')
      .select('user_id, full_name, display_name, first_name, last_name, email')
      .in('user_id', ids);
    return aggregateClassProgress(takes, (profData ?? []) as ProfileRow[]);
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
