// Lightweight chord-symbol parser. Handles the common cases songwriters
// reach for: triads, sevenths, sus, add9, slash bass. It returns the chord
// notes as MIDI note names (e.g. 'C4', 'E4') ready for Tone.js.
//
// Examples it understands:
//   C, Cm, Cmaj7, C7, Cm7, Cdim, Caug, Csus2, Csus4, Cadd9, C/E, F#m7b5

const NOTE_TO_PC: Record<string, number> = {
  C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5,
  'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11,
};

const PC_TO_NOTE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function parseRoot(s: string): { pc: number; rest: string } | null {
  const m = s.match(/^([A-G])(b|#)?(.*)$/);
  if (!m) return null;
  const key = m[2] ? m[1] + m[2] : m[1];
  const pc = NOTE_TO_PC[key];
  if (pc == null) return null;
  return { pc, rest: m[3] };
}

// Build interval list (semitones above root) from quality string.
function intervalsFor(quality: string): number[] {
  const q = quality;
  // Look for explicit sus first to avoid confusion with "sus" in the middle.
  if (/^sus2/.test(q)) return [0, 2, 7, ...sevenIfPresent(q)];
  if (/^sus4|^sus/.test(q)) return [0, 5, 7, ...sevenIfPresent(q)];

  // Diminished / half-diminished
  if (/^dim7/.test(q)) return [0, 3, 6, 9];
  if (/^dim/.test(q)) return [0, 3, 6];
  if (/^m7b5|^ø/.test(q)) return [0, 3, 6, 10];

  // Augmented
  if (/^aug7/.test(q)) return [0, 4, 8, 10];
  if (/^aug|^\+/.test(q)) return [0, 4, 8];

  // Major sevenths and ninths
  if (/^maj9|^M9/.test(q)) return [0, 4, 7, 11, 14];
  if (/^maj7|^M7|^Δ/.test(q)) return [0, 4, 7, 11];
  if (/^maj/.test(q)) return [0, 4, 7];

  // Minor variants
  if (/^m9/.test(q)) return [0, 3, 7, 10, 14];
  if (/^m7/.test(q)) return [0, 3, 7, 10];
  if (/^m6/.test(q)) return [0, 3, 7, 9];
  if (/^mM7|^m\(maj7\)/.test(q)) return [0, 3, 7, 11];
  if (/^m/.test(q)) return [0, 3, 7];

  // Dominant family
  if (/^13/.test(q)) return [0, 4, 7, 10, 14, 21];
  if (/^11/.test(q)) return [0, 4, 7, 10, 14, 17];
  if (/^9/.test(q)) return [0, 4, 7, 10, 14];
  if (/^7/.test(q)) return [0, 4, 7, 10];
  if (/^6/.test(q)) return [0, 4, 7, 9];
  if (/^add9/.test(q)) return [0, 4, 7, 14];

  // Default: major triad
  return [0, 4, 7];
}

function sevenIfPresent(q: string): number[] {
  if (/7/.test(q)) return [10];
  return [];
}

export function parseChord(symbol: string): { notes: string[]; bass?: string } | null {
  const trimmed = (symbol || '').trim();
  if (!trimmed) return null;

  const [main, bassRaw] = trimmed.split('/');
  const root = parseRoot(main);
  if (!root) return null;

  const intervals = intervalsFor(root.rest);
  const baseOctave = 4;

  // Default (no slash) — chord at baseOctave, bass synth one octave below root.
  if (!bassRaw) {
    const notes = intervals.map((iv) => {
      const total = root.pc + iv;
      const octave = baseOctave + Math.floor(total / 12);
      const pc = ((total % 12) + 12) % 12;
      return `${PC_TO_NOTE[pc]}${octave}`;
    });
    return { notes, bass: `${PC_TO_NOTE[root.pc]}${baseOctave - 1}` };
  }

  // Slash chord — voice as an inversion so the slash bass is the lowest
  // note of the chord, and the bass synth sits a full octave below that.
  const b = parseRoot(bassRaw);
  if (!b) {
    // Bass token didn't parse — fall back to plain root-position chord.
    const notes = intervals.map((iv) => {
      const total = root.pc + iv;
      const octave = baseOctave + Math.floor(total / 12);
      const pc = ((total % 12) + 12) % 12;
      return `${PC_TO_NOTE[pc]}${octave}`;
    });
    return { notes };
  }

  const slashPc = b.pc;
  const startOctave = baseOctave - 1; // slash chord sits one octave lower so it stays balanced
  const chordPcs = intervals.map((iv) => ((root.pc + iv) % 12 + 12) % 12);

  // Bass note first; remaining chord notes ascend above it.
  const slashInChord = chordPcs.includes(slashPc);
  const others = chordPcs.filter((pc) => pc !== slashPc);
  others.sort((a, c) => {
    const ar = (a - slashPc + 12) % 12;
    const cr = (c - slashPc + 12) % 12;
    return ar - cr;
  });
  // If the slash note isn't part of the chord (e.g. C/B), add the original
  // root back so the triad's identity isn't lost.
  if (!slashInChord) {
    others.sort();
  }
  const ordered = [slashPc, ...others];

  const notes: string[] = [];
  let prevSemitone = -Infinity;
  let octaveCursor = startOctave;
  for (const pc of ordered) {
    let semitone = octaveCursor * 12 + pc;
    while (semitone <= prevSemitone) {
      octaveCursor++;
      semitone = octaveCursor * 12 + pc;
    }
    notes.push(`${PC_TO_NOTE[pc]}${octaveCursor}`);
    prevSemitone = semitone;
  }

  // Bass synth: one octave below the lowest chord note.
  const bass = `${PC_TO_NOTE[slashPc]}${startOctave - 1}`;

  return { notes, bass };
}
