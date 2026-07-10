// Heuristic rhyme key for internal-rhyme highlighting.
// Not a phonetic dictionary — collapses common English vowel digraphs to a
// single sound code, then keys on the last 2 sound-units. Catches most
// "beat / feet / street" cases without dragging in CMUdict.

const VOWEL_RULES: [RegExp, string][] = [
  [/ee|ea|ie|ei/g, 'i'],
  [/oo|ou|ue|ew/g, 'u'],
  [/oa|ow|oe/g, 'o'],
  [/ai|ay|ey/g, 'a'],
  [/au|aw/g, 'a'],
];

export function rhymeKey(word: string): string | null {
  let s = word.toLowerCase().replace(/[^a-z]/g, '');
  if (s.length < 2) return null;
  for (const [re, sub] of VOWEL_RULES) s = s.replace(re, sub);
  // Strip silent trailing 'e' (cake → cak, here → her); if it leaves a 2-char tail, use that.
  if (s.endsWith('e') && s.length > 2 && /[bcdfghjklmnpqrstvwxz]/.test(s[s.length - 2])) {
    s = s.slice(0, -1);
  }
  return s.slice(-2);
}

export type RhymeMap = {
  // word index in the original tokenization → group id (1+) if this word participates in an internal rhyme
  groups: Record<number, number>;
  // total number of distinct rhyme groups detected
  groupCount: number;
};

export function analyzeInternalRhymes(words: string[]): RhymeMap {
  const keyToIndices = new Map<string, number[]>();
  words.forEach((w, i) => {
    const k = rhymeKey(w);
    if (!k) return;
    if (!keyToIndices.has(k)) keyToIndices.set(k, []);
    keyToIndices.get(k)!.push(i);
  });

  const groups: Record<number, number> = {};
  let groupCount = 0;
  for (const indices of keyToIndices.values()) {
    if (indices.length < 2) continue;
    groupCount += 1;
    for (const i of indices) groups[i] = groupCount;
  }
  return { groups, groupCount };
}

// Subtle pastel tints — cycled by group number.
export const RHYME_TINTS = [
  'bg-amber-100 text-amber-900',
  'bg-sky-100 text-sky-900',
  'bg-rose-100 text-rose-900',
  'bg-emerald-100 text-emerald-900',
  'bg-violet-100 text-violet-900',
  'bg-orange-100 text-orange-900',
];

export function tintFor(group: number): string {
  return RHYME_TINTS[(group - 1) % RHYME_TINTS.length];
}

// Tokenize while preserving non-word separators so we can re-join cleanly.
export function tokenize(line: string): { tokens: string[]; isWord: boolean[] } {
  const tokens: string[] = [];
  const isWord: boolean[] = [];
  const re = /([A-Za-z'\-]+)|([^A-Za-z'\-]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    if (m[1]) { tokens.push(m[1]); isWord.push(true); }
    else if (m[2]) { tokens.push(m[2]); isWord.push(false); }
  }
  return { tokens, isWord };
}
