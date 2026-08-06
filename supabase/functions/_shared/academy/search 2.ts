// Pure lexical scorer over the Academy corpus. No I/O, no Deno/browser APIs —
// the corpus is passed in, so tests run against fixtures.
import type { AcademyChunk, AcademyHit, AcademyIndex } from './types.ts';

const STOPWORDS = new Set([
  'a', 'an', 'the', 'of', 'in', 'on', 'for', 'to', 'and', 'or', 'but', 'is',
  'are', 'was', 'were', 'be', 'been', 'what', 'which', 'who', 'whom', 'how',
  'why', 'when', 'where', 'do', 'does', 'did', 'can', 'could', 'should',
  'would', 'i', 'you', 'it', 'its', 'that', 'this', 'these', 'those', 'with',
  'about', 'me', 'my', 'tell', 'explain', 'give', 'some', 'any', 'there',
  'their', 'from', 'by', 'as', 'at', 'if', 'so', 'than', 'then',
]);

/** Lowercase, strip punctuation, drop stopwords and 1-character tokens. */
export function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/\s+/)
    .map((t) => t.replace(/^-+|-+$/g, ''))
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

export function buildIndex(chunks: AcademyChunk[]): AcademyIndex {
  const postings = new Map<string, Map<number, number>>();
  const titlePostings = new Map<string, Set<number>>();

  chunks.forEach((chunk, i) => {
    for (const token of tokenize(`${chunk.title} ${chunk.text}`)) {
      let byChunk = postings.get(token);
      if (!byChunk) { byChunk = new Map(); postings.set(token, byChunk); }
      byChunk.set(i, (byChunk.get(i) ?? 0) + 1);
    }
    for (const token of tokenize(`${chunk.title} ${chunk.pageTitle}`)) {
      let set = titlePostings.get(token);
      if (!set) { set = new Set(); titlePostings.set(token, set); }
      set.add(i);
    }
  });

  return { chunks, postings, titlePostings };
}

const TITLE_WEIGHT = 3;
const PHRASE_BONUS = 4;

export function searchAcademy(
  query: string,
  index: AcademyIndex,
  opts: { limit?: number; maxChars?: number } = {},
): AcademyHit[] {
  const limit = opts.limit ?? 6;
  const maxChars = opts.maxChars ?? 10_000; // ~2,500 tokens
  const terms = [...new Set(tokenize(query))];
  if (terms.length === 0) return [];

  const total = index.chunks.length;
  const scores = new Map<number, number>();

  for (const term of terms) {
    const byChunk = index.postings.get(term);
    if (!byChunk) continue;
    const idf = Math.log(1 + total / byChunk.size);
    const titled = index.titlePostings.get(term);
    for (const [i, tf] of byChunk) {
      const weight = (1 + Math.log(tf)) * idf * (titled?.has(i) ? TITLE_WEIGHT : 1);
      scores.set(i, (scores.get(i) ?? 0) + weight);
    }
  }

  // Exact-phrase bonus for multi-word queries.
  const phrase = terms.length > 1 ? tokenize(query).join(' ') : '';
  if (phrase) {
    index.chunks.forEach((chunk, i) => {
      if (!scores.has(i)) return;
      const hay = tokenize(`${chunk.title} ${chunk.text}`).join(' ');
      if (hay.includes(phrase)) scores.set(i, (scores.get(i) ?? 0) + PHRASE_BONUS);
    });
  }

  const ranked = [...scores.entries()]
    .sort((a, b) => b[1] - a[1] || a[0] - b[0])
    .slice(0, limit);

  const hits: AcademyHit[] = [];
  let used = 0;
  for (const [i, score] of ranked) {
    const chunk = index.chunks[i];
    const remaining = maxChars - used;
    if (remaining <= 0) break;
    const text = chunk.text.length <= remaining
      ? chunk.text
      : `${chunk.text.slice(0, Math.max(1, remaining - 1))}…`;
    hits.push({ chunk, score, text });
    used += text.length;
  }
  return hits;
}
