import type { ExerciseIR } from './ir';

// Defensive gate for IR arriving from the database (gw_academy_exercises.data).
// Rejecting here keeps a malformed row from crashing a lesson page or the studio.
export function isValidIr(x: unknown): x is ExerciseIR {
  if (!x || typeof x !== 'object') return false;
  const ir = x as ExerciseIR;
  if (typeof ir.key !== 'string' || (ir.mode !== 'major' && ir.mode !== 'minor')) return false;
  if (!Number.isFinite(ir.tonicMidi) || !Number.isFinite(ir.tempo) || ir.tempo <= 0) return false;
  if (!ir.meter || !Number.isFinite(ir.meter.beats) || !Number.isFinite(ir.meter.beatType)) return false;
  if (!Array.isArray(ir.notes) || ir.notes.length === 0) return false;
  let cursor = -Infinity;
  for (const n of ir.notes) {
    if (!n || !Number.isFinite(n.midi) || n.midi < 36 || n.midi > 96) return false;
    if (!Number.isFinite(n.beatPos) || n.beatPos < 0) return false;
    if (!Number.isFinite(n.durationBeats) || n.durationBeats <= 0) return false;
    if (n.beatPos < cursor - 1e-6) return false; // overlap with previous note
    cursor = n.beatPos + n.durationBeats;
  }
  return true;
}
