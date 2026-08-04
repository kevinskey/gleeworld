// Rhythm Machine pattern model. All timing math is in PULSE units — the unit
// the metronome clicks. Simple meters: pulse = notated beat. Compound (6/8):
// pulse = dotted quarter (eighth = 1/3 pulse). Odd x/8 (5/8, 7/8): pulse =
// eighth. This keeps clickSchedule() (bpm = pulses/min) usable everywhere.

export interface Meter { beats: number; beatType: number }
export type NoteValue = 'w' | 'h' | 'h.' | 'q' | 'q.' | 'e' | 'e.' | 's';
export interface RhythmEvent { startPulse: number; durPulses: number; value: NoteValue; rest: boolean }
export interface RhythmPattern {
  meter: Meter;
  pulsesPerMeasure: number;
  measures: number;
  events: RhythmEvent[];
  totalPulses: number;
}
export interface RhythmCellEvent { value: NoteValue; rest?: boolean }
export interface RhythmCell { pulses: number; events: RhythmCellEvent[] }
export interface RhythmLevel {
  id: number;
  label: string;
  meters: Meter[];
  cells: RhythmCell[];
  measures: number;
  defaultBpm: number;
}

export function isCompound(m: Meter): boolean {
  return m.beatType === 8 && m.beats > 3 && m.beats % 3 === 0;
}

export function pulsesPerMeasure(m: Meter): number {
  if (isCompound(m)) return m.beats / 3;
  return m.beats;
}

// Quarter-note-relative lengths; scaled by what one pulse means in this meter.
const QUARTER_LEN: Record<NoteValue, number> = {
  w: 4, h: 2, 'h.': 3, q: 1, 'q.': 1.5, e: 0.5, 'e.': 0.75, s: 0.25,
};

export function valuePulses(value: NoteValue, meter: Meter): number {
  const pulseQuarters = isCompound(meter) ? 1.5 : meter.beatType === 8 ? 0.5 : 1;
  return QUARTER_LEN[value] / pulseQuarters;
}

const C = (pulses: number, ...events: RhythmCellEvent[]): RhythmCell => ({ pulses, events });
const S44: Meter = { beats: 4, beatType: 4 };
const S34: Meter = { beats: 3, beatType: 4 };
const S24: Meter = { beats: 2, beatType: 4 };
const C68: Meter = { beats: 6, beatType: 8 };
const O58: Meter = { beats: 5, beatType: 8 };
const O78: Meter = { beats: 7, beatType: 8 };

// 8 rhythm levels mapped onto the suite's 16-level progression. Compound
// meter is level 5, NOT last — parent-spec mandate.
export const RHYTHM_LEVELS: RhythmLevel[] = [
  { id: 1, label: 'Steady Beat', meters: [S44], measures: 4, defaultBpm: 80,
    cells: [C(1, { value: 'q' })] },
  { id: 2, label: 'Quarters & Eighths', meters: [S44, S24], measures: 2, defaultBpm: 84,
    cells: [C(1, { value: 'q' }), C(1, { value: 'e' }, { value: 'e' }), C(2, { value: 'h' })] },
  { id: 3, label: 'Rests', meters: [S44, S34], measures: 2, defaultBpm: 84,
    cells: [C(1, { value: 'q' }), C(1, { value: 'e' }, { value: 'e' }), C(1, { value: 'q', rest: true }),
            C(1, { value: 'e', rest: true }, { value: 'e' })] },
  { id: 4, label: 'Dotted Rhythms', meters: [S44, S34], measures: 2, defaultBpm: 80,
    cells: [C(1, { value: 'q' }), C(1, { value: 'e' }, { value: 'e' }), C(1, { value: 'q', rest: true }),
            C(1.5, { value: 'q.' }), C(1, { value: 'e.' }, { value: 's' }),
            C(1, { value: 's' }, { value: 's' }, { value: 'e' }), C(1, { value: 'e' }, { value: 's' }, { value: 's' })] },
  { id: 5, label: 'Compound 6/8', meters: [C68], measures: 2, defaultBpm: 60,
    cells: [C(1, { value: 'q.' }), C(1, { value: 'e' }, { value: 'e' }, { value: 'e' }),
            C(1, { value: 'q' }, { value: 'e' }), C(1, { value: 'e' }, { value: 'q' }),
            C(1, { value: 'e', rest: true }, { value: 'e' }, { value: 'e' })] },
  { id: 6, label: 'Syncopation', meters: [S44], measures: 2, defaultBpm: 88,
    cells: [C(1, { value: 'q' }), C(1, { value: 'e' }, { value: 'e' }),
            C(2, { value: 'e' }, { value: 'q' }, { value: 'e' }),
            C(1, { value: 'e', rest: true }, { value: 'e' }),
            C(1, { value: 's' }, { value: 'e' }, { value: 's' })] },
  { id: 7, label: 'Ties & Longer Syncopes', meters: [S44], measures: 2, defaultBpm: 88,
    cells: [C(1, { value: 'q' }), C(2, { value: 'e' }, { value: 'q' }, { value: 'e' }),
            C(3, { value: 'e' }, { value: 'h' }, { value: 'e' }),
            C(2, { value: 'q.' }, { value: 'e' }), C(2, { value: 'e' }, { value: 'q.' })] },
  { id: 8, label: 'Odd Meters', meters: [O58, O78], measures: 2, defaultBpm: 160,
    cells: [C(1, { value: 'e' }), C(2, { value: 'q' }), C(3, { value: 'q.' }),
            C(2, { value: 'e' }, { value: 'e' }), C(1, { value: 'e', rest: true })] },
];
