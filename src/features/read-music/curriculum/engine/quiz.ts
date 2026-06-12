import type { Clef } from '../../components/Staff';
import { POOLS } from '../../lib/notes';
import {
  KEYS_BASIC, KEYS_FULL, RELATIVE_MINOR, INTERVAL_FULL, TRIAD_QUALITIES,
  transposeUp, pick, type MajorKey,
} from '../../lib/theory';
import type { Question, BankQ, RhythmDur } from './types';
import { BANKS } from './banks';

export const QUIZ_LENGTH = 10;
export const PASS_PCT = 80;

function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function sample<T>(arr: readonly T[], n: number): T[] {
  return shuffle(arr).slice(0, n);
}

function bankToMc(q: BankQ): Question {
  const choices = shuffle([q.c, ...q.w]);
  return { kind: 'mc', prompt: q.p, notation: q.n, choices, answerIndex: choices.indexOf(q.c), explain: q.e };
}

// ─── Procedural generators ───

function genNoteId(clef: Clef): Question {
  const pool = POOLS[clef];
  const entry = pick(pool);
  const letters = [...new Set(pool.map((e) => e.letter))];
  const wrong = sample(letters.filter((l) => l !== entry.letter), 3);
  const choices = shuffle([entry.letter, ...wrong]);
  return {
    kind: 'mc',
    prompt: `Name this note (${clef} clef):`,
    notation: { clef, keys: [entry.key] },
    choices,
    answerIndex: choices.indexOf(entry.letter),
  };
}

function genStaffPlace(clef: Clef): Question {
  const entry = pick(POOLS[clef]);
  return { kind: 'staff', prompt: `Place ${entry.letter} on the staff (${clef} clef).`, clef, targetKey: entry.key };
}

const NATURAL_PCS = [
  { label: 'C', pc: 0 }, { label: 'D', pc: 2 }, { label: 'E', pc: 4 }, { label: 'F', pc: 5 },
  { label: 'G', pc: 7 }, { label: 'A', pc: 9 }, { label: 'B', pc: 11 },
];
const BLACK_PCS = [
  { label: 'C♯ / D♭', pc: 1 }, { label: 'D♯ / E♭', pc: 3 }, { label: 'F♯ / G♭', pc: 6 },
  { label: 'G♯ / A♭', pc: 8 }, { label: 'A♯ / B♭', pc: 10 },
];

function genKeyboard(includeBlack: boolean): Question {
  const target = pick(includeBlack ? [...NATURAL_PCS, ...BLACK_PCS] : NATURAL_PCS);
  return { kind: 'keyboard', prompt: `Tap ${target.label} on the keyboard.`, targetPc: target.pc };
}

const KEY_SIG: Record<MajorKey, { n: number; acc: 'sharps' | 'flats' }> = {
  C: { n: 0, acc: 'sharps' }, G: { n: 1, acc: 'sharps' }, D: { n: 2, acc: 'sharps' },
  A: { n: 3, acc: 'sharps' }, E: { n: 4, acc: 'sharps' }, B: { n: 5, acc: 'sharps' },
  'F#': { n: 6, acc: 'sharps' }, 'C#': { n: 7, acc: 'sharps' },
  F: { n: 1, acc: 'flats' }, Bb: { n: 2, acc: 'flats' }, Eb: { n: 3, acc: 'flats' },
  Ab: { n: 4, acc: 'flats' }, Db: { n: 5, acc: 'flats' }, Gb: { n: 6, acc: 'flats' }, Cb: { n: 7, acc: 'flats' },
};

function sigLabel(k: MajorKey): string {
  const s = KEY_SIG[k];
  if (s.n === 0) return 'no sharps or flats';
  return `${s.n} ${s.n === 1 ? s.acc.slice(0, -1) : s.acc}`;
}

function genKeySig(keys: readonly MajorKey[]): Question {
  const key = pick(keys);
  if (Math.random() < 0.5) {
    const correct = sigLabel(key);
    const wrong = sample([...new Set(keys.filter((k) => sigLabel(k) !== correct).map(sigLabel))], 3);
    const choices = shuffle([correct, ...wrong]);
    return { kind: 'mc', prompt: `How many sharps or flats are in ${key} major?`, choices, answerIndex: choices.indexOf(correct) };
  }
  const correct = `${key} major`;
  const wrong = sample(keys.filter((k) => sigLabel(k) !== sigLabel(key)), 3).map((k) => `${k} major`);
  const choices = shuffle([correct, ...wrong]);
  return { kind: 'mc', prompt: `Which major key has ${sigLabel(key)}?`, choices, answerIndex: choices.indexOf(correct) };
}

function genRelativeMinor(keys: readonly MajorKey[]): Question {
  const key = pick(keys);
  const correct = `${RELATIVE_MINOR[key].toUpperCase()} minor`;
  const wrong = sample(keys.filter((k) => k !== key), 3).map((k) => `${RELATIVE_MINOR[k].toUpperCase()} minor`);
  const choices = shuffle([correct, ...wrong]);
  return { kind: 'mc', prompt: `What is the relative minor of ${key} major?`, choices, answerIndex: choices.indexOf(correct) };
}

const GENERIC_INTERVALS = [
  { n: 2, label: '2nd' }, { n: 3, label: '3rd' }, { n: 4, label: '4th' },
  { n: 5, label: '5th' }, { n: 6, label: '6th' }, { n: 8, label: 'Octave' },
];

function genIntervalNumber(): Question {
  const pool = POOLS.treble;
  const iv = pick(GENERIC_INTERVALS.filter((i) => i.n <= pool.length));
  const rootIdx = Math.floor(Math.random() * (pool.length - iv.n + 1));
  const keys = [pool[rootIdx].key, pool[rootIdx + iv.n - 1].key];
  const wrong = sample(GENERIC_INTERVALS.filter((i) => i.n !== iv.n), 3).map((i) => i.label);
  const choices = shuffle([iv.label, ...wrong]);
  return {
    kind: 'mc',
    prompt: 'What is the interval between these two notes (by number)?',
    notation: { clef: 'treble', keys, duration: 'w' },
    choices,
    answerIndex: choices.indexOf(iv.label),
  };
}

const NATURAL_ROOTS = ['c/4', 'd/4', 'e/4', 'f/4', 'g/4', 'a/4', 'b/4'];

function genIntervalQuality(): Question {
  const iv = pick(INTERVAL_FULL);
  const root = pick(NATURAL_ROOTS);
  const upper = transposeUp(root, iv.semitones, Math.random() < 0.5);
  const wrong = sample(INTERVAL_FULL.filter((i) => i.value !== iv.value), 3).map((i) => i.label);
  const choices = shuffle([iv.label, ...wrong]);
  return {
    kind: 'mc',
    prompt: 'Identify this interval (with quality):',
    notation: { clef: 'treble', keys: [root, upper], duration: 'w' },
    choices,
    answerIndex: choices.indexOf(iv.label),
  };
}

function genTriadQuality(values: readonly string[]): Question {
  const opts = TRIAD_QUALITIES.filter((t) => values.includes(t.value));
  const tq = pick(opts);
  const root = pick(NATURAL_ROOTS);
  const keys = tq.intervals.map((s) => transposeUp(root, s, tq.value === 'm' || tq.value === 'd'));
  const correct = tq.label;
  const wrong = TRIAD_QUALITIES.filter((t) => t.value !== tq.value).map((t) => t.label).slice(0, 3);
  const choices = shuffle([correct, ...wrong]);
  return {
    kind: 'mc',
    prompt: 'Identify this triad quality:',
    notation: { clef: 'treble', keys, duration: 'w' },
    choices,
    answerIndex: choices.indexOf(correct),
  };
}

// ─── Ear-training generators (Phase 3) ───

const EAR_BASIC = INTERVAL_FULL.filter((i) => ['M2', 'M3', 'P4', 'P5', 'P8'].includes(i.value));

function genEarInterval(opts: readonly typeof INTERVAL_FULL[number][], harmonic = false): Question {
  const iv = pick(opts);
  const root = pick(NATURAL_ROOTS);
  const keys = [root, transposeUp(root, iv.semitones)];
  const wrong = sample(opts.filter((i) => i.value !== iv.value), 3).map((i) => i.label);
  const choices = shuffle([iv.label, ...wrong]);
  return {
    kind: 'audio',
    prompt: `Listen to this ${harmonic ? 'harmonic' : 'melodic'} interval. What is it?`,
    playKeys: keys,
    playMode: harmonic ? 'harmonic' : 'melodic',
    choices,
    answerIndex: choices.indexOf(iv.label),
  };
}

function genEarTriad(values: readonly string[]): Question {
  const opts = TRIAD_QUALITIES.filter((t) => values.includes(t.value));
  const tq = pick(opts);
  const root = pick(NATURAL_ROOTS);
  const keys = tq.intervals.map((s) => transposeUp(root, s));
  const choices = shuffle(opts.map((t) => t.label));
  return {
    kind: 'audio',
    prompt: 'Listen to this chord. What quality is it?',
    playKeys: keys,
    playMode: 'harmonic',
    choices,
    answerIndex: choices.indexOf(tq.label),
  };
}

const MAJOR_STEPS = [0, 2, 4, 5, 7, 9, 11, 12];
const NAT_MINOR_STEPS = [0, 2, 3, 5, 7, 8, 10, 12];

function genEarScale(): Question {
  const isMajor = Math.random() < 0.5;
  const root = pick(['c/4', 'd/4', 'e/4', 'f/4', 'g/4']);
  const steps = isMajor ? MAJOR_STEPS : NAT_MINOR_STEPS;
  const keys = steps.map((s) => transposeUp(root, s, !isMajor));
  const correct = isMajor ? 'Major' : 'Minor';
  const choices = shuffle(['Major', 'Minor']);
  return {
    kind: 'audio',
    prompt: 'Listen to this scale. Is it major or minor?',
    playKeys: keys,
    playMode: 'scale',
    choices,
    answerIndex: choices.indexOf(correct),
    explain: isMajor ? undefined : 'The lowered 3rd gives minor its darker color.',
  };
}

const RHYTHM_EASY: RhythmDur[][] = [
  ['q', 'q', 'q', 'q'], ['h', 'h'], ['h', 'q', 'q'], ['q', 'q', 'h'], ['w'], ['q', 'h', 'q'],
];
const RHYTHM_MEDIUM: RhythmDur[][] = [
  ['q', '8', '8', 'q', 'q'], ['8', '8', '8', '8', 'h'], ['h', '8', '8', 'q'],
  ['8', '8', 'q', 'q', 'q'], ['q', 'q', '8', '8', 'q'],
];
const RHYTHM_HARD: RhythmDur[][] = [
  ['8', 'q', '8', 'q', 'q'], ['8', '8', 'q', '8', '8', 'q'], ['q', '8', 'q', '8', 'q'],
  ['8', 'q', 'q', '8', 'q'], ['8', '8', 'h', '8', '8'],
];

function genRhythm(pool: RhythmDur[][], bpm: number): Question {
  return {
    kind: 'rhythm',
    prompt: 'Tap this rhythm along with the beat (4 count-in clicks first).',
    durations: pick(pool),
    bpm,
  };
}

// ─── Per-unit quiz blueprints ───

type Gen = () => Question;

function gens(n: number, g: Gen): Question[] {
  return Array.from({ length: n }, g);
}

function bank(key: string, n: number): Question[] {
  return sample(BANKS[key] ?? [], n).map(bankToMc);
}

/** Builders for units that mix authored + generated questions. Default: bank only. */
const BLUEPRINTS: Record<string, () => Question[]> = {
  '1.2': () => [...bank('1.2', 7), ...gens(3, () => genRhythm(RHYTHM_EASY, 70))],
  '1.3': () => [...bank('1.3', 7), ...gens(3, () => genStaffPlace('treble'))],
  '1.4': () => [...bank('1.4', 3), ...gens(4, () => genNoteId('treble')), ...gens(3, () => genStaffPlace('treble'))],
  '2.1': () => [...bank('2.1', 5), ...gens(3, () => genNoteId('bass')), ...gens(2, () => genStaffPlace('bass'))],
  '2.2': () => [...bank('2.2', 7), ...gens(3, () => genRhythm(RHYTHM_MEDIUM, 80))],
  '2.3': () => [...bank('2.3', 7), ...gens(3, () => genKeyboard(true))],
  '2.4': () => [...bank('2.4', 6), ...gens(4, () => genKeySig(KEYS_BASIC))],
  '2.5': () => [...bank('2.5', 4), ...gens(3, () => genRelativeMinor(KEYS_BASIC)), ...gens(3, genEarScale)],
  '2.6': () => [...bank('2.6', 4), ...gens(3, genIntervalNumber), ...gens(3, () => genEarInterval(EAR_BASIC))],
  '2.7': () => [...bank('2.7', 5), ...gens(2, () => genTriadQuality(['M', 'm'])), ...gens(3, () => genEarTriad(['M', 'm']))],
  '3.1': () => [...bank('3.1', 4), ...gens(3, () => genKeySig(KEYS_FULL)), ...gens(2, () => genNoteId('alto')), genNoteId('tenor')],
  '3.2': () => [...bank('3.2', 8), ...gens(2, genEarScale)],
  '3.3': () => [...bank('3.3', 4), ...gens(3, genIntervalQuality), ...gens(3, () => genEarInterval(INTERVAL_FULL))],
  '3.4': () => [...bank('3.4', 5), ...gens(2, () => genTriadQuality(['M', 'm', 'd', 'A'])), ...gens(3, () => genEarTriad(['M', 'm', 'd', 'A']))],
  '3.9': () => [...bank('3.9', 7), ...gens(3, () => genRhythm(RHYTHM_HARD, 88))],
  '3.11': () => [...bank('3.11', 5), ...gens(2, () => genEarInterval(INTERVAL_FULL)), ...gens(2, () => genEarTriad(['M', 'm', 'd', 'A'])), genEarScale()],
  '4.10': () => [...bank('4.10', 6), ...gens(4, () => genEarInterval(INTERVAL_FULL, true))],
};

export function buildUnitQuiz(levelId: number, unitSortOrder: number): Question[] {
  const key = `${levelId}.${unitSortOrder}`;
  const builder = BLUEPRINTS[key];
  const questions = builder ? builder() : bank(key, QUIZ_LENGTH);
  if (questions.length === 0) {
    // unauthored unit — fall back to a general note-reading quiz so the gate is still passable
    return [...gens(5, () => genNoteId('treble')), ...gens(5, () => genNoteId('bass'))];
  }
  return shuffle(questions).slice(0, QUIZ_LENGTH);
}
