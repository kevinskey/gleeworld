export type DomainId =
  | 'pitch_intervals'
  | 'rhythm'
  | 'sight_singing'
  | 'dictation'
  | 'harmony'
  | 'scales_theory';

export interface Domain {
  id: DomainId;
  label: string;
  blurb: string;
  status: 'live' | 'placeholder';
}

export const DOMAINS: Domain[] = [
  { id: 'pitch_intervals', label: 'Pitch & Intervals', blurb: 'Match pitches, sing and identify intervals, chord qualities.', status: 'live' },
  { id: 'rhythm',          label: 'Rhythm',            blurb: 'Clap-back, read-and-clap, steady beat — with Takadimi, Kodály, or counting.', status: 'live' },
  { id: 'sight_singing',   label: 'Sight-Singing',     blurb: 'Sing generated lines with real-time pitch feedback.', status: 'live' },
  { id: 'dictation',       label: 'Dictation',         blurb: 'Hear it, notate it. Melodic and harmonic dictation. Ships Phase 2.', status: 'placeholder' },
  { id: 'harmony',         label: 'Harmony & Chords',  blurb: 'Chord ID, cadence ID, Roman numerals. Ships Phase 2.', status: 'placeholder' },
  { id: 'scales_theory',   label: 'Scales & Theory',   blurb: 'Key signatures, scales, modes, notation literacy. Ships Phase 3.', status: 'placeholder' },
];

export interface Level {
  id: number; // 1..16
  name: string;
  ageBand: string;
  focus: string;
}

export const LEVELS: Level[] = [
  { id: 1,  name: 'Beat & Voice',           ageBand: 'K–1',    focus: 'Steady beat, high/low, echo 3-note.' },
  { id: 2,  name: 'Pentatonic Play',        ageBand: '2–3',    focus: 's-m-l-d-r, ta/ti-ti, quarter+eighth.' },
  { id: 3,  name: 'Diatonic Doorway',       ageBand: '3–4',    focus: 'Full major scale, fa/ti, half notes/rests.' },
  { id: 4,  name: 'Staff & Key',            ageBand: '4–5',    focus: 'Treble/bass literacy, C/G/F key sigs.' },
  { id: 5,  name: 'Intervals I',            ageBand: '5–6',    focus: '2nds/3rds/P5/P8; natural minor.' },
  { id: 6,  name: 'Rhythm Depth',           ageBand: '6–7',    focus: 'Dotted rhythms, 6/8, syncopation basics.' },
  { id: 7,  name: 'Chord Colors',           ageBand: '7–8',    focus: 'Triad ID; 2-bar melodic dictation.' },
  { id: 8,  name: 'Key Fluency',            ageBand: 'HS 9',   focus: 'All 15 key sigs, all intervals + inversions.' },
  { id: 9,  name: 'Cadences & Function',    ageBand: 'HS 10',  focus: 'PAC/IAC/HC/Deceptive; 4-chord dictation.' },
  { id: 10, name: 'Chromatic Sight-Sing',   ageBand: 'HS 11',  focus: 'di/ri/fi/si/li; tonicization.' },
  { id: 11, name: 'Seventh Chords',         ageBand: 'HS–AP',  focus: 'Seventh-chord ID, figured bass.' },
  { id: 12, name: 'AP Aural Prep',          ageBand: 'AP',     focus: 'Harmonic + melodic dictation with modulation.' },
  { id: 13, name: 'AP Written Prep',        ageBand: 'AP',     focus: 'SATB voice-leading, Roman numerals.' },
  { id: 14, name: 'Modes & Modal Ear',      ageBand: 'Col 1',  focus: 'Church modes; C-clef reading.' },
  { id: 15, name: 'Modulation & Chromaticism', ageBand: 'Col 2', focus: 'Secondary dominants, borrowed chords.' },
  { id: 16, name: 'Post-Tonal Literacy',    ageBand: 'Col 3–4', focus: 'Atonal sight-sing, mixed meter, set-class ID.' },
];

// Deterministic placement scorer. Maps # correct out of 5 diagnostic
// questions to a starting level. Curved conservative so students land
// somewhere they can succeed rather than somewhere too hard.
export function scoreToLevel(correct: number, total: number): number {
  if (total !== 5) throw new Error('placement diagnostic must be exactly 5 questions');
  switch (correct) {
    case 0: case 1: return 1;
    case 2:         return 3;
    case 3:         return 5;
    case 4:         return 8;
    case 5:         return 11;
    default:        return 1;
  }
}
