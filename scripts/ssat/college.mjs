// scripts/ssat/college.mjs
// The complete 15-week college-level "Sight Singing and Aural Skills" course
// content, emitted in the seed-script JSON shape. Every notated exercise is
// generated deterministically by engine.mjs (no Date.now / Math.random), so
// buildCollegeCourse() is a pure function. Exercises are flat objects
// `{ type, ...data }`, matching the seed script's `const { type, ...data } = e`.
import { makeMelody, makeRhythm, irFromDegrees, concatIrs, hashSeed, note, KEY_TO_MIDI } from './engine.mjs';

export const SSAT_RUBRIC = [
  { criterion: 'Pitch Accuracy', percent: 30 },
  { criterion: 'Rhythmic Accuracy', percent: 30 },
  { criterion: 'Solfège and Music-Reading Accuracy', percent: 15 },
  { criterion: 'Steady Tempo and Conducting', percent: 10 },
  { criterion: 'Tone, Intonation, and Musicianship', percent: 10 },
  { criterion: 'Submission Quality and Reflection', percent: 5 },
];
export const PREP_CHECKLIST = [
  'Identify the key and establish tonic.',
  'Sing the scale and tonic triad.',
  'Identify the meter and conduct the beat pattern.',
  'Scan the rhythm without singing.',
  'Locate difficult intervals and altered pitches.',
  'Examine the opening and closing pitch.',
  'Audiate the first phrase.',
  'Begin at a steady, manageable tempo.',
  'Continue through minor errors without stopping.',
  'Evaluate the performance after completion.',
];

// --- rhythm palettes ---
const Q = [[1], [1, 1], [2]];
const E = [[1], [0.5, 0.5], [1, 1], [1.5, 0.5], [2]];
const SYNC = [[0.5, 1, 0.5], [0.5, 0.5, 0.5, 0.5], [0.75, 0.25], [1, 0.5, 0.5], [2]];
const C68 = [[3], [1, 1, 1], [2, 1], [1.5, 0.5, 1]];
const M78 = [[2, 2, 3], [3, 2, 2], [2, 3, 2]]; // whole-bar cells filling 7 eighths
const M58 = [[2, 3], [3, 2]]; // whole-bar cells filling 5 eighths

// --- meters ---
const M24 = { beats: 2, beatType: 4 };
const M34 = { beats: 3, beatType: 4 };
const M44 = { beats: 4, beatType: 4 };
const M68 = { beats: 6, beatType: 8 };
const M98 = { beats: 9, beatType: 8 };
const M58m = { beats: 5, beatType: 8 };
const M78m = { beats: 7, beatType: 8 };

// --- seed + generator helpers ---
const seed = (tag) => hashSeed(`ssat-college-${tag}`);
const ones = (n) => Array(n).fill(1);

// Generate a diatonic melody IR with course defaults; override anything via `over`.
const gen = (tag, over = {}) => makeMelody({
  key: 'C', mode: 'major', meter: M44, tempo: 88, bars: 8,
  range: [57, 76], leaps: [], rhythmPalette: Q, seed: seed(tag), ...over,
});

// A pitched IR authored directly from scale degrees.
const degIr = ({ key = 'C', mode = 'major', meter = M44, tempo = 80, degrees, durations, octave = 0 }) =>
  irFromDegrees({ key, mode, tempo, meter, degrees, durations, octave });

// A rhythm exercise: makeRhythm cells laid as repeated-tonic notes (rests stay rests).
function rhythmIr(tag, { meter, bars, palette, tempo = 76, key = 'C' }) {
  const { cells } = makeRhythm({ meter, bars, palette, seed: seed(tag) });
  const tonicMidi = KEY_TO_MIDI[key];
  const notes = [];
  let pos = 0;
  for (const c of cells) {
    if (!c.rest) notes.push(note(tonicMidi, pos, c.d, tonicMidi));
    pos += c.d;
  }
  return { key, mode: 'major', tonicMidi, meter, tempo, notes, phrases: 1, difficulty: 1 };
}

// Shift every note of an IR later in time by `beatOffset` beats (whole bars only,
// so bar alignment is preserved). Leading silence renders downstream as rests.
const offsetIr = (ir, beatOffset) => ({
  ...ir,
  notes: ir.notes.map((n) => ({ ...n, beatPos: n.beatPos + beatOffset })),
});

// --- reusable drill builders (shared across weeks) ---
const cMajorScaleDrill = () => degIr({ tempo: 80, degrees: [0, 2, 4, 5, 7, 9, 11, 12, 12, 11, 9, 7, 5, 4, 2, 0], durations: ones(16) });
const chromaticDrill = () => degIr({ tempo: 80, degrees: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], durations: ones(13) });
const tonicArpDrill = () => degIr({ tempo: 80, degrees: [0, 4, 7, 4, 0], durations: [1, 1, 1, 1, 2] });

// --- exercise constructors (flat { type, ...data }) ---
const solf = (ir, extra = {}) => ({ type: 'solfege_drill', ir, ...extra });
const mel = (ir, extra = {}) => (ir ? { type: 'melody', ir, ...extra } : { type: 'melody', ...extra });
const rhy = (ir, extra = {}) => (ir ? { type: 'rhythm', ir, ...extra } : { type: 'rhythm', ...extra });
const ear = (prompt, items) => ({ type: 'ear_training', prompt, items });
const dict = (prompt, ir, playLimit) => ({ type: 'dictation', prompt, ir, playLimit });
const ens = (instructions, parts) => ({ type: 'ensemble', instructions, parts });
const asg = (instructions, deliverables) => ({ type: 'assignment', instructions, deliverables, rubric: SSAT_RUBRIC });

const lesson = (title, content, objectives, exercises) => ({ title, content, objectives, exercises });
const week = (n, title, concepts, guided, assignment) => ({ title: `Week ${n}: ${title}`, lessons: [concepts, guided, assignment] });

// Interval-ID ear item helper (two-note degree pair over the C-major tonic).
const INTERVAL_CHOICES = ['m2', 'M2', 'm3', 'M3', 'P4', 'P5', 'P8'];
const intItem = (degrees, answer, explanation, octave = 0) => ({
  ir: degIr({ tempo: 84, degrees, durations: [2, 2], octave }),
  choices: INTERVAL_CHOICES,
  answer,
  explanation,
});

// ============================ WEEK 1 ============================
const W1 = week(1, 'Foundations of Tonal Reading',
  lesson('Concepts & Warm-ups',
    'Sight singing begins with a firm tonal anchor. Before singing a single note, establish tonic: hear the key, sing the major scale, and arpeggiate the tonic triad. This course uses movable-do solfège, in which do is always the tonic. This week covers the major scale, stepwise motion, whole/half/quarter notes and rests, and the basic 2-, 3-, and 4-beat conducting patterns.',
    ['Establish tonic by ear before singing.', 'Sing an ascending and descending major scale on movable-do solfège.', 'Recognize stepwise (conjunct) melodic motion.', 'Conduct a steady 4-beat pattern.'],
    [
      solf(cMajorScaleDrill(), { instructions: 'Sing the C-major scale up and down on solfège; keep an even quarter-note pulse.' }),
      solf(degIr({ tempo: 80, degrees: [0, 7, 0], durations: [2, 2, 4] }), { instructions: 'Sing do–sol–do to fix the tonic and dominant in your ear.' }),
    ]),
  lesson('Guided Practice',
    'Apply the tonal anchor to a real melody. This stepwise, diatonic line moves only by step, so every pitch is a neighbor of the last — use solfège and audiation to find each note before you sing it. Work through the preparation checklist first, then sing in tempo without stopping for small errors.',
    ['Sight-sing an 8-bar stepwise diatonic melody.', 'Apply the full preparation checklist.', 'Recognize the closing re–do or ti–do cadence by ear.'],
    [
      mel(gen('w1-melody-v2', { tempo: 84, leaps: [] }), { instructions: 'Sing on solfège; every move is a step.', prepChecklist: PREP_CHECKLIST }),
      ear('Which scale degree ends this fragment?', [
        { ir: degIr({ tempo: 84, degrees: [0, 7], durations: [2, 2] }), choices: ['do', 'mi', 'sol'], answer: 2, explanation: 'do rises a perfect fifth to sol.' },
        { ir: degIr({ tempo: 84, degrees: [0, 4], durations: [2, 2] }), choices: ['do', 'mi', 'sol'], answer: 1, explanation: 'do rises a major third to mi.' },
        { ir: degIr({ tempo: 84, degrees: [7, 0], durations: [2, 2] }), choices: ['do', 'mi', 'sol'], answer: 0, explanation: 'sol falls to do.' },
        { ir: degIr({ tempo: 84, degrees: [4, 0], durations: [2, 2] }), choices: ['do', 'mi', 'sol'], answer: 0, explanation: 'mi falls to do.' },
      ]),
    ]),
  lesson('Module Assignment 1: Tonal Foundations',
    'Demonstrate the foundational reading skills of Week 1 in a single continuous recording, then reflect on your process. This assignment establishes the recording-and-reflection workflow you will use in every module.',
    ['Record scale, arpeggio, and melody accurately.', 'Self-assess strengths and growth areas.', 'Apply the rubric to your own performance.'],
    [asg(
      ['Sing and record the C-major scale ascending and descending on solfège.', 'Sing and record do–sol–do, establishing the tonic clearly.', 'Sight-sing and record the 8-bar stepwise melody in one continuous take.', 'Write a short reflection naming two strengths and two areas for improvement.'],
      ['One continuous video/audio recording of scale, do–sol–do, and the melody.', 'A written reflection (two strengths + two improvements).'])]));

// ============================ WEEK 2 ============================
const W2 = week(2, 'The Tonic Triad and Skips',
  lesson('Concepts & Warm-ups',
    'The tonic triad (do–mi–sol) is the melodic skeleton of tonal music. Learning to skip confidently between chord tones lets you read leaps as easily as steps. This week introduces the tonic-triad arpeggio, third and fourth skips within the triad, and simple-meter conducting in 2/4, 3/4, and 4/4.',
    ['Arpeggiate the tonic triad fluently in both directions.', 'Sing melodic skips of a third and a fourth in tune.', 'Distinguish 2/4, 3/4, and 4/4 conducting patterns.'],
    [
      solf(degIr({ tempo: 80, degrees: [0, 4, 7, 12, 7, 4, 0], durations: ones(7) }), { instructions: 'Arpeggiate do–mi–sol–do′ and back; tune each chord tone against the tonic.' }),
      rhy(rhythmIr('w2-rhythm', { meter: M34, bars: 4, palette: Q, tempo: 76 }), { instructions: 'Clap the rhythm while conducting a 3-beat pattern.' }),
    ]),
  lesson('Guided Practice',
    'Read three triad-outlining melodies, one in each simple meter. Each line favors chord-tone skips (thirds and fourths) balanced by stepwise motion, so keep the tonic triad ringing in your ear as a reference frame. Conduct the correct beat pattern for each meter as you sing.',
    ['Sight-sing melodies that outline the tonic triad.', 'Maintain intonation across melodic skips.', 'Match the conducting pattern to 2/4, 3/4, and 4/4.'],
    [
      mel(gen('w2-24', { key: 'C', meter: M24, leaps: [3, 4] }), { instructions: 'In 2/4 — conduct the down-up pattern.', prepChecklist: PREP_CHECKLIST }),
      mel(gen('w2-34', { key: 'G', meter: M34, leaps: [3, 4] }), { instructions: 'In 3/4 — conduct the three-beat pattern.' }),
      mel(gen('w2-44', { key: 'F', meter: M44, leaps: [3, 4] }), { instructions: 'In 4/4 — conduct the four-beat pattern.' }),
    ]),
  lesson('Module Assignment 2: Triads and Skips',
    'Perform three triad-based melodies, one in each simple meter, in a single continuous video with visible conducting. Demonstrate that you can read chord-tone skips accurately while keeping a steady beat.',
    ['Perform three metered melodies accurately.', 'Show correct conducting patterns on camera.', 'Sustain steady tempo across meter changes.'],
    [asg(
      ['Prepare the three triad melodies (2/4, 3/4, 4/4) using the checklist.', 'Record all three in one continuous video, conducting each beat pattern.', 'Name the conducting pattern aloud before each melody.'],
      ['One continuous video of all three melodies with visible conducting.'])]));

// ============================ WEEK 3 ============================
const W3 = week(3, 'Melodic Intervals',
  lesson('Concepts & Warm-ups',
    'Every melody is a chain of intervals. This week builds an interval vocabulary from the tonic outward — seconds, thirds, fourths, and fifths — and pairs each with its solfège. The interval ladder (do–re, do–mi, do–fa, do–sol) trains you to hear and produce each distance on demand, ascending and descending.',
    ['Sing ascending intervals from do through the fifth.', 'Sing the same intervals descending from do′.', 'Name intervals by solfège pair and quality.'],
    [
      solf(degIr({ tempo: 80, degrees: [0, 2, 0, 4, 0, 5, 0, 7], durations: ones(8) }), { instructions: 'Ascending interval ladder: do–re, do–mi, do–fa, do–sol.' }),
      solf(degIr({ tempo: 80, degrees: [12, 11, 12, 9, 12, 7, 12, 5], durations: ones(8) }), { instructions: 'Descending interval ladder from do′: do′–ti, do′–la, do′–sol, do′–fa.' }),
    ]),
  lesson('Guided Practice',
    'Test your interval recognition by ear, then apply it in a leaping melody. The ear-training set covers seconds through the octave in both qualities; identify each by its solfège and interval name. The melody uses thirds, fourths, and fifths, so let the tonic triad and interval ladder guide your tuning.',
    ['Identify melodic intervals by ear.', 'Sight-sing a melody with thirds, fourths, and fifths.', 'Connect interval names to their solfège pairs.'],
    [
      ear('Identify the melodic interval.', [
        intItem([0, 2], 1, 'do–re is a major second.'),
        intItem([0, 4], 3, 'do–mi is a major third.'),
        intItem([0, 3], 2, 'do–me is a minor third.'),
        intItem([0, 5], 4, 'do–fa is a perfect fourth.'),
        intItem([0, 7], 5, 'do–sol is a perfect fifth.'),
        intItem([2, 3], 0, 're–me is a minor second.'),
        intItem([4, 7], 2, 'mi–sol is a minor third.'),
        intItem([0, 12], 6, 'do–do′ is a perfect octave.'),
        intItem([7, 12], 4, 'sol–do′ is a perfect fourth.'),
        intItem([5, 9], 3, 'fa–la is a major third.'),
      ]),
      mel(gen('w3-melody', { key: 'F', leaps: [3, 4, 5, 7] }), { instructions: 'Tune each leap against the tonic triad.', prepChecklist: PREP_CHECKLIST }),
    ]),
  lesson('Module Assignment 3: Interval Mastery',
    'Combine performance and analysis: sing an interval-rich melody, identify ten intervals by ear, and submit a marked score with written solfège analysis of the intervals you sang.',
    ['Sing leaping intervals accurately in context.', 'Identify ten melodic intervals by ear.', 'Analyze and label intervals in written solfège.'],
    [asg(
      ['Sight-sing and record the interval melody.', 'Complete the 10-item interval-identification listening set.', 'Mark the score, labeling each interval and its solfège pair.', 'Write a short analysis of the intervals used in the melody.'],
      ['Recording of the interval melody.', 'Marked score with written solfège interval analysis.'])]));

// ============================ WEEK 4 ============================
const W4 = week(4, 'Rhythmic Reading in Simple Meter',
  lesson('Concepts & Warm-ups',
    'Rhythm is read independently of pitch. This week isolates rhythm in simple meters, adding eighth notes and the dotted-quarter/eighth figure to the quarter-and-half vocabulary. Clap, count, or speak on a neutral syllable while conducting, keeping subdivision steady beneath the beat.',
    ['Read eighth notes and dotted rhythms in simple meter.', 'Maintain steady subdivision while conducting.', 'Perform rhythms on a neutral syllable.'],
    [
      rhy(rhythmIr('w4-c1', { meter: M44, bars: 8, palette: E, tempo: 80 }), { instructions: 'Clap and count in 4/4; keep the eighth-note subdivision even.' }),
      rhy(rhythmIr('w4-c2', { meter: M24, bars: 8, palette: E, tempo: 80 }), { instructions: 'Clap and count in 2/4.' }),
    ]),
  lesson('Guided Practice',
    'Build a five-exercise rhythm portfolio across 4/4, 3/4, and 2/4, then transfer the same rhythmic vocabulary to a pitched melody. Conduct throughout; the goal is rhythmic independence and a rock-steady internal subdivision.',
    ['Perform rhythms in three simple meters.', 'Transfer rhythmic reading to a melody.', 'Conduct accurately while performing eighth-note rhythms.'],
    [
      rhy(rhythmIr('w4-g1', { meter: M44, bars: 8, palette: E, tempo: 80 }), { instructions: '4/4 — conduct and speak on a neutral syllable.' }),
      rhy(rhythmIr('w4-g2', { meter: M34, bars: 8, palette: E, tempo: 80 }), { instructions: '3/4 — conduct the three-beat pattern.' }),
      rhy(rhythmIr('w4-g3', { meter: M24, bars: 8, palette: E, tempo: 80 }), { instructions: '2/4 — conduct the two-beat pattern.' }),
      mel(gen('w4-melody', { key: 'G', leaps: [3, 4], rhythmPalette: E }), { instructions: 'Read pitch and eighth-note rhythm together.', prepChecklist: PREP_CHECKLIST }),
    ]),
  lesson('Module Assignment 4: Rhythm Portfolio',
    'Submit your five-exercise rhythm portfolio, clapped or spoken and conducted, with one exercise performed on a neutral syllable. Begin with a metronome count-in and correct an error-laden rhythm to demonstrate diagnostic listening.',
    ['Perform five conducted rhythm exercises.', 'Use a metronome count-in for steady tempo.', 'Diagnose and correct rhythmic errors.'],
    [asg(
      ['Perform and record the five rhythm exercises, conducting each.', 'Perform at least one exercise on a neutral syllable.', 'Use a metronome count-in before each exercise.', 'Correct the five-error rhythm provided by your instructor.'],
      ['Recording of the five conducted rhythm exercises.', 'Your corrected version of the five-error rhythm.'])]));

// ============================ WEEK 5 ============================
const W5 = week(5, 'The Minor Mode',
  lesson('Concepts & Warm-ups',
    'Minor introduces three scale forms that share a tonic but differ in their sixth and seventh degrees. Natural minor lowers three, six, and seven; harmonic minor raises seven for a leading tone (creating the le–ti augmented second); melodic minor raises six and seven ascending and reverts to natural descending. Sing all three on solfège to internalize their altered degrees.',
    ['Sing natural, harmonic, and melodic minor scales.', 'Locate the altered sixth and seventh degrees by ear.', 'Distinguish the three minor forms aurally.'],
    [
      solf(degIr({ key: 'A', mode: 'minor', tempo: 80, degrees: [0, 2, 3, 5, 7, 8, 10, 12, 12, 10, 8, 7, 5, 3, 2, 0], durations: ones(16) }), { instructions: 'A natural minor, up and down — note the lowered 6 (le) and 7 (te).' }),
      solf(degIr({ key: 'A', mode: 'minor', tempo: 80, degrees: [0, 2, 3, 5, 7, 8, 11, 12, 12, 11, 8, 7, 5, 3, 2, 0], durations: ones(16) }), { instructions: 'A harmonic minor — the raised 7 (ti) creates the le–ti augmented second.' }),
      solf(degIr({ key: 'A', mode: 'minor', tempo: 80, degrees: [0, 2, 3, 5, 7, 9, 11, 12, 12, 10, 8, 7, 5, 3, 2, 0], durations: ones(16) }), { instructions: 'A melodic minor — raised 6 and 7 ascending (la, ti), natural descending.' }),
    ]),
  lesson('Guided Practice',
    'Sing two minor melodies and learn to hear which form is in play. The natural-minor line stays modal; the harmonic-minor line features the leading tone and its expressive augmented second. Remember that in movable-do minor, tonic is do and the mode color comes from me, le, and te versus the raised la and ti.',
    ['Sight-sing melodies in natural and harmonic minor.', 'Navigate the le–ti augmented second in tune.', 'Identify the minor form by ear.'],
    [
      mel(gen('w5-nat', { key: 'A', mode: 'minor', scale: 'natural', leaps: [3, 4] }), { instructions: 'A natural minor — modal, no leading tone.' }),
      mel(gen('w5-harm', { key: 'A', mode: 'minor', scale: 'harmonic', leaps: [3, 4] }), { instructions: 'A harmonic minor — sing the raised leading tone in tune.', prepChecklist: PREP_CHECKLIST }),
      ear('Natural, harmonic, or melodic minor?', [
        { ir: degIr({ key: 'A', mode: 'minor', tempo: 80, degrees: [0, 2, 3, 5, 7, 8, 10, 12, 12, 10, 8, 7, 5, 3, 2, 0], durations: ones(16) }), choices: ['natural', 'harmonic', 'melodic'], answer: 0, explanation: 'Lowered 6 and 7 both directions.' },
        { ir: degIr({ key: 'A', mode: 'minor', tempo: 80, degrees: [0, 2, 3, 5, 7, 8, 11, 12, 12, 11, 8, 7, 5, 3, 2, 0], durations: ones(16) }), choices: ['natural', 'harmonic', 'melodic'], answer: 1, explanation: 'Raised 7 throughout; augmented second on 6–7.' },
        { ir: degIr({ key: 'A', mode: 'minor', tempo: 80, degrees: [0, 2, 3, 5, 7, 9, 11, 12, 12, 10, 8, 7, 5, 3, 2, 0], durations: ones(16) }), choices: ['natural', 'harmonic', 'melodic'], answer: 2, explanation: 'Raised 6 and 7 ascending, natural descending.' },
      ]),
    ]),
  lesson('Module Assignment 5: Minor Modes',
    'Perform all three minor scale forms and two minor melodies, identify altered degrees, and explain the difference between la-based and do-based minor solfège in a short written response.',
    ['Perform the three minor scale forms accurately.', 'Sing melodies in natural and harmonic minor.', 'Explain minor solfège systems in writing.'],
    [asg(
      ['Record the three minor scale forms on solfège.', 'Record the natural-minor and harmonic/melodic melodies.', 'Identify the altered degrees in each melody.', 'Write a short comparison of la-based versus do-based minor solfège.'],
      ['Recording of the three scale forms and two melodies.', 'Written explanation of la-based vs do-based minor.'])]));

// ============================ WEEK 6 ============================
const W6 = week(6, 'Compound Meter',
  lesson('Concepts & Warm-ups',
    'In compound meter the beat divides into three. The dotted quarter is the beat in 6/8 and 9/8, subdividing into three eighths. Feel the lilting two- or three-large-beat pattern rather than counting every eighth, and conduct in dotted-quarter beats.',
    ['Feel the dotted-quarter beat in compound meter.', 'Read 6/8 and 9/8 rhythms accurately.', 'Conduct compound-meter beat patterns.'],
    [
      rhy(rhythmIr('w6-68', { meter: M68, bars: 4, palette: C68, tempo: 180, key: 'C' }), { instructions: '6/8 — feel two dotted-quarter beats per bar (eighth = 180).' }),
      rhy(rhythmIr('w6-98', { meter: M98, bars: 4, palette: C68, tempo: 180, key: 'C' }), { instructions: '9/8 — feel three dotted-quarter beats per bar.' }),
    ]),
  lesson('Guided Practice',
    'Sing a 16-bar melody in 6/8 that flows in dotted-quarter beats, then train your ear to tell simple from compound division. Let the compound lilt carry the phrase; audiate the three-part subdivision without hammering every eighth.',
    ['Sight-sing an extended 6/8 melody.', 'Hear whether the beat divides in two or three.', 'Sustain the compound lilt across long phrases.'],
    [
      mel(gen('w6-melody', { key: 'C', meter: M68, tempo: 180, bars: 16, leaps: [3, 4], rhythmPalette: C68 }), { instructions: 'Flow in dotted-quarter beats; do not count every eighth.', prepChecklist: PREP_CHECKLIST }),
      ear('Does the beat divide in 2 or 3?', [
        { ir: rhythmIr('w6-e1', { meter: M24, bars: 1, palette: E, tempo: 80 }), choices: ['simple (2)', 'compound (3)'], answer: 0, explanation: 'Duple subdivision — the beat splits into two.' },
        { ir: rhythmIr('w6-e2', { meter: M68, bars: 1, palette: C68, tempo: 180 }), choices: ['simple (2)', 'compound (3)'], answer: 1, explanation: 'Triple subdivision — the beat splits into three.' },
        { ir: rhythmIr('w6-e3', { meter: M24, bars: 1, palette: E, tempo: 80 }), choices: ['simple (2)', 'compound (3)'], answer: 0, explanation: 'Duple subdivision.' },
        { ir: rhythmIr('w6-e4', { meter: M68, bars: 1, palette: C68, tempo: 180 }), choices: ['simple (2)', 'compound (3)'], answer: 1, explanation: 'Triple subdivision.' },
      ]),
    ]),
  lesson('Module Assignment 6: Compound Meter',
    'Clap 6/8 and 9/8 rhythms, sing a 16-bar compound melody with conducting, identify beat division by ear, and submit a written count analysis of one compound rhythm.',
    ['Perform compound-meter rhythms accurately.', 'Conduct a 16-bar compound melody.', 'Analyze compound counting in writing.'],
    [asg(
      ['Clap and record the 6/8 and 9/8 rhythm exercises.', 'Sing and record the 16-bar compound melody, conducting throughout.', 'Complete the beat-division listening set.', 'Write a count analysis (e.g. 1-2-3 / 4-5-6) of one compound rhythm.'],
      ['Recording of the compound rhythms and melody.', 'Written count analysis of a compound rhythm.'])]));

// ============================ WEEK 7 ============================
const romanItem = (degrees, answer, choices, mode = 'major') => ({
  ir: degIr({ key: mode === 'minor' ? 'A' : 'C', mode, tempo: 84, degrees, durations: ones(degrees.length) }),
  choices,
  answer,
});
const W7 = week(7, 'Harmonic Function',
  lesson('Concepts & Warm-ups',
    'Melodies imply harmony. The three primary triads — tonic (I), subdominant (IV), and dominant (V) — supply the functional framework of tonal music: stability, departure, and return. Arpeggiate each chord on solfège so you can recognize its outline inside a melodic line.',
    ['Arpeggiate the I, IV, and V triads on solfège.', 'Associate each triad with its harmonic function.', 'Hear chord tones inside a melody.'],
    [
      solf(degIr({ tempo: 80, degrees: [0, 4, 7, 4, 0], durations: [1, 1, 1, 1, 2] }), { instructions: 'I — do–mi–sol: tonic, the point of rest.' }),
      solf(degIr({ tempo: 80, degrees: [5, 9, 12, 9, 5], durations: [1, 1, 1, 1, 2] }), { instructions: 'IV — fa–la–do′: subdominant, departure.' }),
      solf(degIr({ tempo: 80, degrees: [7, 11, 14, 11, 7], durations: [1, 1, 1, 1, 2] }), { instructions: 'V — sol–ti–re′: dominant, tension seeking resolution.' }),
    ]),
  lesson('Guided Practice',
    'Identify chord progressions by ear from their root motion, then sing a melody that outlines I, IV, and V. Listen for the functional logic — how V pulls back to I, how IV colors the departure — and label the implied harmony under each measure of the melody.',
    ['Identify progressions by root motion.', 'Sing a melody that outlines primary triads.', 'Label harmonic function under a melodic line.'],
    [
      ear('Identify the progression.', [
        romanItem([0, 5, 7, 0], 0, ['I–IV–V–I', 'I–V–IV–I', 'I–IV–I']),
        romanItem([0, 7, 9, 5], 0, ['I–V–vi–IV', 'I–vi–V–IV', 'vi–V–I–IV']),
        romanItem([0, 5, 0], 0, ['I–IV–I', 'I–V–I', 'IV–I–IV']),
        romanItem([2, 7, 0], 0, ['ii–V–I', 'IV–V–I', 'vi–V–I']),
        romanItem([0, 9, 5, 7], 0, ['I–vi–IV–V', 'I–IV–vi–V', 'vi–IV–I–V']),
        romanItem([0, 7, 0], 0, ['I–V–I', 'I–IV–I', 'V–I–V']),
        romanItem([9, 5, 0, 7], 0, ['vi–IV–I–V', 'I–IV–vi–V', 'vi–I–IV–V']),
        romanItem([0, 5, 7], 0, ['I–IV–V', 'I–V–IV', 'ii–IV–V']),
      ]),
      mel(gen('w7-melody', { key: 'C', leaps: [3, 4, 5, 7] }), { instructions: 'Melody outlines I, IV, and V — label the function under each measure.', prepChecklist: PREP_CHECKLIST }),
    ]),
  lesson('Module Assignment 7: Harmonic Hearing',
    'Sing chord-tone arpeggios, identify eight progressions by ear, label harmonic function under a melody, and identify its closing cadence.',
    ['Sing primary-triad arpeggios accurately.', 'Identify eight progressions by ear.', 'Label function and identify the cadence.'],
    [asg(
      ['Record the I, IV, and V arpeggios on solfège.', 'Complete the 8-item progression-identification set.', 'Sing the function-outlining melody and label I, IV, V under each measure.', 'Identify the cadence type that closes the melody.'],
      ['Recording of arpeggios and melody.', 'Marked score with function labels and cadence identification.'])]));

// ============================ WEEK 8 ============================
const W8 = week(8, 'Midterm Review and Preparation',
  lesson('Concepts & Warm-ups',
    'The midterm gathers the first seven weeks: major and minor scales, intervals, simple and compound rhythm, and harmonic hearing. Prepared items are practiced in advance; unprepared items — a cold-read melody, interval and progression identification, and short dictation — are administered live by the instructor. Review by re-establishing tonic quickly and applying the full preparation checklist under time pressure.',
    ['Review all Weeks 1–7 skills for the midterm.', 'Distinguish prepared from unprepared exam tasks.', 'Establish tonic and scan a melody quickly.'],
    [solf(cMajorScaleDrill(), { instructions: 'Warm up: re-establish tonic and sing the major scale fluently.' })]),
  lesson('Guided Practice',
    'Rehearse the midterm formats. Prepare the assigned melody thoroughly, sharpen interval recognition with a focused review set, and practice notating a short melody from repeated hearings. Dictation is a listening-and-writing skill: hold the tonic, count the meter, and notate rhythm and contour before exact pitches.',
    ['Prepare a midterm melody to performance standard.', 'Review interval identification.', 'Practice 4-bar melodic dictation.'],
    [
      mel(gen('w8-midterm', { key: 'D', leaps: [3, 4, 5], rhythmPalette: E }), { instructions: 'Prepared midterm melody — polish it to performance standard.', prepChecklist: PREP_CHECKLIST }),
      ear('Interval review — identify each interval.', [
        intItem([0, 2], 1, 'do–re, major second.'),
        intItem([0, 4], 3, 'do–mi, major third.'),
        intItem([0, 7], 5, 'do–sol, perfect fifth.'),
        intItem([0, 5], 4, 'do–fa, perfect fourth.'),
        intItem([0, 3], 2, 'do–me, minor third.'),
      ]),
      dict('Notate this 4-bar melody. Play limit 4.', gen('w8-dictation', { key: 'C', bars: 4, leaps: [] }), 4),
    ]),
  lesson('Module Assignment 8: Midterm Examination',
    'Complete the six-component midterm: a prepared melody, a cold-read melody, interval identification, progression identification, minor-scale performance, and short melodic dictation. Prepared items are submitted; unprepared items are administered live.',
    ['Perform prepared and unprepared melodies.', 'Identify intervals and progressions by ear.', 'Notate a short melody from dictation.'],
    [asg(
      ['Submit a polished recording of the prepared melody.', 'Perform the cold-read melody administered live by the instructor.', 'Complete live interval- and progression-identification.', 'Sing an assigned minor scale form and take the short dictation.'],
      ['Prepared-melody recording plus completed live exam components.'])]));

// ============================ WEEK 9 ============================
const W9 = week(9, 'Syncopation',
  lesson('Concepts & Warm-ups',
    'Syncopation displaces accents off the beat with ties, offbeat entrances, and sixteenth-note pairs. To keep placement precise, maintain a steady subdivision underneath and feel where each note falls against it. This week adds the dotted-eighth/sixteenth figure and offbeat-quarter patterns to your rhythmic vocabulary.',
    ['Read syncopated rhythms with ties and offbeats.', 'Maintain steady subdivision beneath displaced accents.', 'Perform sixteenth-note and dotted-eighth figures.'],
    [
      rhy(rhythmIr('w9-c1', { meter: M44, bars: 8, palette: SYNC, tempo: 76 }), { instructions: '4/4 syncopation — keep the eighth subdivision steady; mark each offbeat.' }),
      rhy(rhythmIr('w9-c2', { meter: M44, bars: 8, palette: SYNC, tempo: 76 }), { instructions: '4/4 syncopation — clap and count, feeling the tied and offbeat accents.' }),
    ]),
  lesson('Guided Practice',
    'Perform syncopated rhythms in 4/4 and 2/4, then sing a syncopated melody. Mark every syncopation before you begin, decide how you will feel the underlying pulse, and commit to it so the offbeats land exactly where they should.',
    ['Perform syncopated rhythms in two meters.', 'Sing a melody with ties and offbeats.', 'Pre-mark syncopations as a reading strategy.'],
    [
      rhy(rhythmIr('w9-g1', { meter: M44, bars: 8, palette: SYNC, tempo: 76 }), { instructions: '4/4 — perform and conduct.' }),
      rhy(rhythmIr('w9-g2', { meter: M24, bars: 8, palette: SYNC, tempo: 76 }), { instructions: '2/4 — perform and conduct.' }),
      mel(gen('w9-melody-s20', { key: 'G', leaps: [3, 4], rhythmPalette: SYNC }), { instructions: 'Mark every syncopation before singing.', prepChecklist: PREP_CHECKLIST }),
    ]),
  lesson('Module Assignment 9: Syncopation',
    'Perform four syncopated rhythms and a syncopated melody, recorded both conducted and unconducted, submit a marked score, and write a short paragraph on your pulse-keeping strategy.',
    ['Perform four syncopated rhythms accurately.', 'Sing a syncopated melody conducted and unconducted.', 'Explain your pulse-keeping strategy in writing.'],
    [asg(
      ['Record the four syncopated rhythm exercises.', 'Record the syncopated melody once conducted and once unconducted.', 'Mark the score, circling every syncopation.', 'Write a paragraph describing how you kept the pulse steady.'],
      ['Conducted and unconducted recordings.', 'Marked score plus a pulse-strategy paragraph.'])]));

// ============================ WEEK 10 ============================
const w10CanonMel = gen('w10-canon', { key: 'C', leaps: [3, 4] });
const w10Part1 = gen('w10-part1', { key: 'C', leaps: [3, 4] });
const w10Part2 = degIr({
  key: 'C', tempo: 88,
  degrees: [0, -3, -5, -3, -5, -8, -5, -3, 0, 2, 0, -3, -5, -3, -1, 0],
  durations: Array(16).fill(2),
});
const W10 = week(10, 'Two-Part Singing',
  lesson('Concepts & Warm-ups',
    'Independent part singing demands that you hold your own line while hearing another. Begin with rhythmic duets, then a canon — one melody performed against a delayed copy of itself. Listen across the texture: keep your entrance, balance your dynamic against your partner, and let the two lines lock into a steady shared pulse.',
    ['Maintain an independent rhythmic part in a duet.', 'Perform a two-voice canon from a single melody.', 'Balance and align with a second performer.'],
    [
      rhy(rhythmIr('w10-duo1', { meter: M44, bars: 8, palette: E, tempo: 80 }), { instructions: 'Two-part rhythm — Performer A. Perform as a duo against Part B.' }),
      rhy(rhythmIr('w10-duo2', { meter: M44, bars: 8, palette: E, tempo: 80 }), { instructions: 'Two-part rhythm — Performer B. Lock in with Part A.' }),
      ens('Canon: both voices sing the same melody; the follower enters two bars later. Balance the entrances and keep a shared pulse.', [
        { label: 'Leader (enter m. 1)', ir: w10CanonMel },
        { label: 'Follower (enter m. 3)', ir: w10CanonMel },
      ]),
    ]),
  lesson('Guided Practice',
    'Sing a two-part tonal exercise: an upper melody against a consonant lower counterline moving mostly in thirds and sixths. Tune the vertical intervals, balance the voices, and stay independent — do not drift toward the other part. Record your own line in isolation to check accuracy.',
    ['Sing one voice of a two-part tonal texture.', 'Tune thirds and sixths vertically.', 'Sustain independence and balance.'],
    [
      ens('Two-part tonal exercise. Tune the vertical thirds and sixths; balance the voices and keep each line independent.', [
        { label: 'Upper voice', ir: w10Part1 },
        { label: 'Lower voice (counterline)', ir: w10Part2 },
      ]),
    ]),
  lesson('Module Assignment 10: Ensemble Independence',
    'Record the two-part exercise as an ensemble and record your own part in isolation, then evaluate balance, tuning, and independence in a short written self-assessment.',
    ['Perform in a two-part ensemble.', 'Record an isolated individual part.', 'Evaluate balance, tuning, and independence.'],
    [asg(
      ['Record the two-part exercise as a duo (or with a recorded second part).', 'Record your own part in isolation.', 'Write a self-assessment of balance, tuning, and independence.'],
      ['Ensemble recording plus isolated individual-part recording.', 'Written balance/tuning/independence evaluation.'])]));

// ============================ WEEK 11 ============================
const W11 = week(11, 'Chromaticism',
  lesson('Concepts & Warm-ups',
    'Chromatic tones sit between diatonic scale degrees and almost always resolve by half step to a neighbor. Ascending chromatic motion traditionally uses sharp syllables (di, ri, fi, si, li) and descending uses flats (te, le, se, me, ra); this app renders chromatic pitches with the flat spellings (ra, me, fi, le, te), so read the syllable as the pitch a half step from its diatonic neighbor. Sing the chromatic scale to fix each inflection.',
    ['Sing an ascending chromatic scale segment.', 'Understand sharp- vs flat-spelled chromatic syllables.', 'Resolve chromatic tones by half step.'],
    [solf(chromaticDrill(), { instructions: 'Ascending chromatic scale. Note: the app renders chromatic pitches with flat syllables (ra/me/fi/le/te) — read each as the half step from its diatonic neighbor.' })]),
  lesson('Guided Practice',
    'Sing a melody containing five chromatic passing tones, each resolving by half step to the following note, then train your ear to flag chromatic insertions in otherwise diatonic lines. Approach each chromatic tone smoothly and let it lean into its resolution.',
    ['Sing a melody with five chromatic passing tones.', 'Resolve each chromatic tone by half step.', 'Distinguish diatonic from chromatic fragments by ear.'],
    [
      mel(gen('w11-melody', { key: 'F', leaps: [3, 4], chromatic: { count: 5 } }), { instructions: 'Five chromatic tones — resolve each by half step.', prepChecklist: PREP_CHECKLIST }),
      ear('Diatonic or chromatic?', [
        { ir: degIr({ tempo: 84, degrees: [0, 2, 4, 5], durations: ones(4) }), choices: ['diatonic', 'chromatic'], answer: 0, explanation: 'do–re–mi–fa: all diatonic.' },
        { ir: degIr({ tempo: 84, degrees: [0, 1, 2, 4], durations: ones(4) }), choices: ['diatonic', 'chromatic'], answer: 1, explanation: 'do–ra–re–mi: ra is a chromatic passing tone.' },
        { ir: degIr({ tempo: 84, degrees: [7, 5, 4, 2], durations: ones(4) }), choices: ['diatonic', 'chromatic'], answer: 0, explanation: 'sol–fa–mi–re: all diatonic.' },
        { ir: degIr({ tempo: 84, degrees: [4, 5, 6, 7], durations: ones(4) }), choices: ['diatonic', 'chromatic'], answer: 1, explanation: 'mi–fa–fi–sol: fi is a chromatic passing tone.' },
      ]),
    ]),
  lesson('Module Assignment 11: Chromatic Reading',
    'Sing a chromatic drill and a five-chromatic melody, identify the altered degrees, and submit an annotated score marking each chromatic tone and its resolution.',
    ['Sing chromatic drills and a chromatic melody.', 'Identify altered degrees by name.', 'Annotate chromatic resolutions on a score.'],
    [asg(
      ['Record the chromatic scale drill.', 'Sight-sing and record the five-chromatic melody.', 'Identify each altered degree and its resolution.', 'Submit an annotated score marking every chromatic tone.'],
      ['Recording of the chromatic drill and melody.', 'Annotated score of chromatic tones and resolutions.'])]));

// ============================ WEEK 12 ============================
const W12 = week(12, 'Modulation',
  lesson('Concepts & Warm-ups',
    'Modulation moves the tonal center to a new key, most often a closely related one sharing many pitches. A pivot chord or pivot tone belongs to both keys and reframes the listener\'s sense of do. Practice re-hearing a familiar pitch in a new function: sol in C becomes do in G, so the same note carries two solfège meanings depending on the reigning tonic.',
    ['Understand closely related keys and pivots.', 'Re-hear a pitch\'s function in a new key.', 'Analyze a pivot between two tonal centers.'],
    [solf(degIr({ key: 'C', tempo: 80, degrees: [0, 7, 7, 12], durations: [2, 2, 2, 2] }), { instructions: 'Sing do–sol in C; then re-hear sol as the new do of G (dominant becomes tonic). The pivot pitch carries two meanings.' })]),
  lesson('Guided Practice',
    'Sing a modulating melody: four bars firmly in C, then four bars in G. Circle the modulation point and write solfège in both keys — the second half re-reads against G as its own do. Feel the tonal center shift as the leading tone of the new key appears.',
    ['Sight-sing a melody that modulates to the dominant.', 'Locate and mark the modulation point.', 'Write dual solfège in both keys.'],
    [
      mel(concatIrs([gen('w12-segA', { key: 'C', bars: 4, leaps: [3, 4] }), gen('w12-segB', { key: 'G', bars: 4, leaps: [3, 4] })]),
        { modulation: { atBeat: 16, toKey: 'G' }, instructions: 'Circle the modulation point; write solfège in both keys.', prepChecklist: PREP_CHECKLIST }),
    ]),
  lesson('Module Assignment 12: Modulation',
    'Analyze and perform a modulating melody: circle the modulation, identify both keys, write dual solfège, and perform in a way that establishes both tonal centers.',
    ['Analyze a modulation between related keys.', 'Write solfège in both keys.', 'Perform to establish both tonal centers.'],
    [asg(
      ['Analyze the melody and circle the modulation point.', 'Identify both keys and label the pivot.', 'Write the solfège in both keys.', 'Perform the melody, clearly establishing each tonal center.'],
      ['Analyzed score with modulation circled and dual solfège.', 'Recording that establishes both keys.'])]));

// ============================ WEEK 13 ============================
const W13 = week(13, 'Changing and Asymmetrical Meter',
  lesson('Concepts & Warm-ups',
    'Meter can change bar to bar, and asymmetrical meters like 5/8 and 7/8 group unequal beats. In 5/8 the bar divides 2+3 or 3+2; in 7/8, common groupings include 2+2+3. Read the grouping first — bracket each bar\'s subdivision — and conduct the changing patterns so the pulse never lurches.',
    ['Read rhythms in changing simple meters.', 'Group asymmetrical meters (2+3, 3+2, 2+2+3).', 'Conduct shifting beat patterns smoothly.'],
    [
      rhy(null, { segments: [
        rhythmIr('w13-c-a', { meter: M24, bars: 2, palette: Q, tempo: 78 }),
        rhythmIr('w13-c-b', { meter: M34, bars: 2, palette: Q, tempo: 78 }),
        rhythmIr('w13-c-c', { meter: M44, bars: 2, palette: Q, tempo: 78 }),
        rhythmIr('w13-c-d', { meter: M34, bars: 2, palette: Q, tempo: 78 }),
      ], instructions: 'Changing simple meters: 2/4 → 3/4 → 4/4 → 3/4. Conduct each pattern.' }),
      rhy(rhythmIr('w13-78', { meter: M78m, bars: 4, palette: M78, tempo: 160 }), { instructions: '7/8 — bracket each bar\'s grouping (2+2+3, 3+2+2, or 2+3+2) and label it.' }),
    ]),
  lesson('Guided Practice',
    'Sing a melody whose meter changes at least three times, conducting each pattern, then read a 5/8 rhythm and label each bar\'s grouping. Keep the beat unit constant across the meter changes so the tempo stays even.',
    ['Sight-sing a melody with three or more meter changes.', 'Label 5/8 groupings as 2+3 or 3+2.', 'Conduct changing patterns without disrupting the pulse.'],
    [
      mel(null, { segments: [
        gen('w13-g-a', { key: 'C', meter: M44, bars: 2, leaps: [3, 4] }),
        gen('w13-g-b', { key: 'C', meter: M34, bars: 2, leaps: [3, 4] }),
        gen('w13-g-c', { key: 'C', meter: M24, bars: 2, leaps: [3, 4] }),
        gen('w13-g-d', { key: 'C', meter: M34, bars: 2, leaps: [3, 4] }),
      ], instructions: 'Conduct the changing patterns.', prepChecklist: PREP_CHECKLIST }),
      rhy(rhythmIr('w13-58', { meter: M58m, bars: 4, palette: M58, tempo: 160 }), { instructions: 'Label each bar 2+3 or 3+2.' }),
    ]),
  lesson('Module Assignment 13: Meter Mastery',
    'Perform a changing-meter rhythm, a 5/8 or 7/8 rhythm with groupings labeled, and a melody with at least three meter changes, keeping the beat structure visible in your conducting.',
    ['Perform changing- and asymmetrical-meter rhythms.', 'Label asymmetrical groupings.', 'Sing a melody with three or more meter changes.'],
    [asg(
      ['Perform the changing-meter rhythm, conducting each pattern.', 'Perform a 5/8 or 7/8 rhythm and label every bar\'s grouping.', 'Sing the melody with at least three meter changes.', 'Keep the beat structure visible through clear conducting.'],
      ['Recording of the changing-meter and asymmetrical rhythms.', 'Labeled score plus the changing-meter melody.'])]));

// ============================ WEEK 14 ============================
const w14Sop = gen('w14-sop', { key: 'C', bars: 8, leaps: [3, 4], range: [64, 79] });
const w14Alto = offsetIr(gen('w14-alto', { key: 'C', bars: 7, leaps: [3, 4], range: [57, 72] }), 4);
const w14Bass = offsetIr(gen('w14-bass', { key: 'C', bars: 6, leaps: [3, 4], range: [48, 64] }), 8);
const W14 = week(14, 'Open Score and Vertical Tuning',
  lesson('Concepts & Warm-ups',
    'Ensemble sight singing means reading your line from an open score while tuning vertically to the others. Learn to find your part across clefs, hear inner voices, and adjust intonation so chords lock. Begin with a sustained tuning chord — do–mi–sol — building it one voice at a time and listening for the beats to disappear.',
    ['Read an individual line from open score.', 'Tune vertically within a sustained chord.', 'Track inner voices and staggered entrances.'],
    [solf(degIr({ tempo: 80, degrees: [0, 4, 7, 12], durations: [4, 4, 4, 4] }), { instructions: 'Chord-tuning drill: sustain do, add mi, add sol, add do′ as whole notes; tune each entrance until the chord locks.' })]),
  lesson('Guided Practice',
    'Sing one voice of a three-part texture with staggered entrances: the soprano enters in bar 1, the alto in bar 2, and the bass in bar 3, all resolving together. Count your leading rests exactly, place your entrance in tune with the sounding voices, and hold your line independently to the shared cadence.',
    ['Sing one voice of a staggered three-part texture.', 'Count leading rests and enter precisely.', 'Tune your entrance to the sounding voices.'],
    [
      ens('Staggered-entrance ensemble: Soprano enters m. 1, Alto m. 2, Bass m. 3; all end together. Count your rests, enter in tune, and keep your line independent.', [
        { label: 'Soprano (enter m. 1)', ir: w14Sop },
        { label: 'Alto (enter m. 2)', ir: w14Alto },
        { label: 'Bass (enter m. 3)', ir: w14Bass },
      ]),
    ]),
  lesson('Module Assignment 14: Ensemble Performance',
    'Rehearse and perform a small-ensemble piece with limited rehearsal time, submitting a rehearsal plan alongside peer and self-assessments of the performance.',
    ['Perform in a small vocal ensemble.', 'Plan and document efficient rehearsal.', 'Complete peer and self-assessment.'],
    [asg(
      ['Rehearse the staggered-entrance ensemble within the limited rehearsal time.', 'Record the ensemble performance.', 'Submit a written rehearsal plan.', 'Complete peer- and self-assessment of the performance.'],
      ['Ensemble performance recording.', 'Rehearsal plan plus peer and self-assessments.'])]));

// ============================ WEEK 15 ============================
const W15 = week(15, 'Synthesis and Final Portfolio',
  lesson('Concepts & Warm-ups',
    'The final week synthesizes everything: major and minor tonality, chromaticism, modulation, simple, compound, and asymmetrical meter, and ensemble reading. Warm up with a comprehensive routine — major scale, chromatic segment, and tonic arpeggio in one pass — then review the final-exam procedure and the growth-portfolio specification.',
    ['Synthesize the full course skill set.', 'Perform a comprehensive warm-up routine.', 'Understand the final exam and portfolio requirements.'],
    [solf(concatIrs([cMajorScaleDrill(), chromaticDrill(), tonicArpDrill()]), { instructions: 'Comprehensive warm-up: major scale, chromatic segment, and tonic arpeggio in one continuous pass.' })]),
  lesson('Guided Practice',
    'Prepare an advanced 12-bar melody combining syncopation and chromaticism in B-flat, and rehearse the unprepared exam formats — cold-read dictation and cadence identification. Bring the full preparation checklist to bear; this is the level of fluency the final expects.',
    ['Prepare an advanced chromatic, syncopated melody.', 'Practice 4-bar dictation for the final.', 'Review cadence and progression identification.'],
    [
      mel(gen('w15-advanced', { key: 'Bb', bars: 12, leaps: [3, 4, 5, 7], rhythmPalette: SYNC, chromatic: { count: 3 } }), { instructions: 'Prepared advanced melody — syncopation plus three chromatic tones.', prepChecklist: PREP_CHECKLIST }),
      dict('Notate this 4-bar melody. Play limit 3.', gen('w15-dictation', { key: 'F', bars: 4, leaps: [3, 4] }), 3),
      ear('Cadence and progression review.', [
        romanItem([0, 7, 0], 0, ['I–V–I', 'I–IV–I', 'V–I–V']),
        romanItem([0, 5, 7, 0], 0, ['I–IV–V–I', 'I–V–IV–I', 'ii–V–I–IV']),
        romanItem([0, 5, 7, 0], 0, ['i–iv–V–i', 'i–V–iv–i', 'i–iv–i'], 'minor'),
        romanItem([2, 7, 0], 0, ['ii–V–I', 'IV–V–I', 'I–V–I']),
        romanItem([0, 5, 0], 0, ['i–iv–i', 'i–V–i', 'iv–i–iv'], 'minor'),
      ]),
    ]),
  lesson('Module Assignment 15: Final Examination and Growth Portfolio',
    'Complete the seven-component final exam and assemble a four-item growth portfolio documenting your development across the semester.',
    ['Perform the comprehensive final exam.', 'Assemble a reflective growth portfolio.', 'Document semester-long musical growth.'],
    [asg(
      ['Perform the prepared advanced melody and the live cold-read.', 'Complete interval, progression/cadence, and dictation components.', 'Sing an assigned scale form and perform your ensemble part.', 'Assemble the four-item growth portfolio with a written reflection.'],
      ['Final-exam recordings and live components.', 'Growth portfolio: an early and a late recording, a written reflection, and a goals statement.'])]));

const WEEKS = [W1, W2, W3, W4, W5, W6, W7, W8, W9, W10, W11, W12, W13, W14, W15];

export function buildCollegeCourse() {
  return {
    slug: 'sight-singing-college',
    title: 'Sight Singing and Aural Skills — College',
    level: 'college',
    grades: 'College',
    description: 'Read, hear, understand, and perform notated music accurately at sight: movable-do solfège, rhythmic reading, interval recognition, melodic dictation, harmonic hearing, and ensemble sight singing — from stepwise diatonic melodies to chromatic, modulating, and rhythmically advanced examples.',
    units: WEEKS,
  };
}
