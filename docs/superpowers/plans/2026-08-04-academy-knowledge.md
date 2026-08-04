# Academy Knowledge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the GleeWorld Assistant a `search_academy` tool that answers choral-conducting questions from a generated corpus of the ~70,000-word reference library at kevinphillipjohnson.com/academy.

**Architecture:** A Node script renders the 17 live source pages with Playwright, extracts their underlying data, and generates a typed TypeScript module of ~700 text chunks. A pure, dependency-free scorer ranks those chunks lexically in memory. A new server-side tool in `assistant-chat` calls the scorer and returns the top passages. No database, no migration, no RLS, no frontend deploy.

**Tech Stack:** TypeScript, Deno (edge runtime), Node 22 + Playwright (ingest, run manually on Kevin's Mac), Vitest (tests).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-04-academy-knowledge-design.md`. Read it before Task 1.
- Work in the worktree `~/Documents/GitHub/gw-worktrees/academy-knowledge` on branch `feat/academy-knowledge`. The main checkout has another session's uncommitted work — do not touch it.
- Worktrees need `npm ci --legacy-peer-deps` (a pre-existing `pdfjs-dist` peer conflict). Do not pipe npm output to `tail` — it hides failures.
- Files under `supabase/functions/` are imported by **both** Deno and Vitest. Keep them free of Deno-only and Node-only APIs. Relative imports inside edge functions **must** carry the `.ts` extension (Deno requirement); Vitest resolves them via its config.
- Tests are **Vitest**, not `deno test`. Run with `npx vitest run <path>`.
- The corpus ships as a generated **`corpus.ts`** module, not `corpus.json`. No edge function imports JSON today, and import attributes (`with { type: 'json' }`) behave differently across Deno and Vitest. A `.ts` module imports identically in both. This is a deliberate deviation from the spec.
- `merch.html` is excluded from the corpus (price list, not reference knowledge).
- Never attribute corpus content to a source other than itself. Replies carry no byline (per the reach decision), but the assistant must not invent a citation.
- Deploy is `bash scripts/deploy-functions.sh assistant-chat`. The edge runtime caches ES modules, so the container restart it performs is required.

## File Structure

| File | Responsibility |
| --- | --- |
| `supabase/functions/_shared/academy/types.ts` | `AcademyChunk`, `AcademyHit`, `AcademyIndex` interfaces. No logic. |
| `supabase/functions/_shared/academy/search.ts` | Pure scorer: `buildIndex`, `searchAcademy`, `tokenize`. No I/O, no corpus import — the corpus is passed in, so tests use fixtures. |
| `supabase/functions/_shared/academy/corpus.ts` | **Generated.** Exports `ACADEMY_CORPUS: AcademyChunk[]`. Never hand-edited. |
| `supabase/functions/_shared/academy/__tests__/search.test.ts` | Scorer unit tests against a fixture corpus. |
| `supabase/functions/_shared/academy/__tests__/corpus.test.ts` | Integrity tests against the real generated corpus. |
| `scripts/academy/manifest.mjs` | The 17 sources: URL, mode, globals/selectors, and per-page chunking config. The only file to edit when the site changes. |
| `scripts/academy/normalize.mjs` | Pure: raw record → `AcademyChunk`. Testable without a browser. |
| `scripts/academy/__tests__/normalize.test.ts` | Normalizer unit tests using real records copied from the live pages. |
| `scripts/ingest-academy.mjs` | Playwright runner. Fetches, extracts, normalizes, writes `corpus.ts`. |
| `supabase/functions/assistant-chat/toolCatalog.ts` | + `search_academy` tool definition. |
| `supabase/functions/assistant-chat/executors.ts` | + `searchAcademyTool` executor and its `switch` case. |
| `supabase/functions/assistant-chat/prompt.ts` | + domain guidance block. |

**Task order rationale:** Tasks 1–2 build pure, fully testable units with zero external dependencies. Task 3 adds the browser I/O around them. Task 4 generates real data. Tasks 5–6 wire it into the assistant. Task 7 verifies and ships. A reviewer can reject any one of these without invalidating its neighbors.

---

### Task 1: Chunk types and the pure scorer

**Files:**
- Create: `supabase/functions/_shared/academy/types.ts`
- Create: `supabase/functions/_shared/academy/search.ts`
- Test: `supabase/functions/_shared/academy/__tests__/search.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `interface AcademyChunk { id: string; page: string; pageTitle: string; title: string; text: string; url: string }`
  - `interface AcademyHit { chunk: AcademyChunk; score: number; text: string }` — `text` may be truncated; `chunk.text` is always full.
  - `interface AcademyIndex { chunks: AcademyChunk[]; postings: Map<string, Map<number, number>>; titlePostings: Map<string, Set<number>> }`
  - `function tokenize(input: string): string[]`
  - `function buildIndex(chunks: AcademyChunk[]): AcademyIndex`
  - `function searchAcademy(query: string, index: AcademyIndex, opts?: { limit?: number; maxChars?: number }): AcademyHit[]`

- [ ] **Step 1: Write the failing test**

Create `supabase/functions/_shared/academy/__tests__/search.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { tokenize, buildIndex, searchAcademy } from '../search';
import type { AcademyChunk } from '../types';

const chunk = (id: string, title: string, text: string): AcademyChunk => ({
  id, title, text,
  page: 'terms',
  pageTitle: 'Choral Terminology',
  url: 'https://kevinphillipjohnson.com/academy/terms.html',
});

const CORPUS: AcademyChunk[] = [
  chunk('a', 'Hemiola', 'A hemiola is a rhythmic device where three beats replace two. Common in Baroque choral music.'),
  chunk('b', 'Tempo Markings', 'Largo is very slow and broad. Andante is a walking pace. Presto is very fast.'),
  chunk('c', 'Choir Seating', 'A choir may stand in sections or in mixed formation depending on the ensemble.'),
  chunk('d', 'Baroque Ornamentation', 'Ornamentation in Baroque music includes trills and appoggiaturas sung by the choir.'),
];

describe('tokenize', () => {
  it('lowercases, splits, and drops stopwords and single characters', () => {
    expect(tokenize('What IS the Hemiola?')).toEqual(['hemiola']);
  });

  it('keeps hyphenated and numeric tokens', () => {
    expect(tokenize('19th-century')).toContain('19th-century');
  });

  it('returns an empty array for a query that is all stopwords', () => {
    expect(tokenize('what is the')).toEqual([]);
  });
});

describe('searchAcademy', () => {
  const index = buildIndex(CORPUS);

  it('ranks a title match above a body-only match', () => {
    const hits = searchAcademy('hemiola', index);
    expect(hits[0].chunk.id).toBe('a');
  });

  it('weighs a rare term above a common one', () => {
    // "choir" appears in c and d; "ornamentation" only in d.
    const hits = searchAcademy('choir ornamentation', index);
    expect(hits[0].chunk.id).toBe('d');
  });

  it('returns an empty array when the query is all stopwords', () => {
    expect(searchAcademy('what is the', index)).toEqual([]);
  });

  it('returns an empty array when nothing matches', () => {
    expect(searchAcademy('trombone embouchure', index)).toEqual([]);
  });

  it('respects the limit option', () => {
    const hits = searchAcademy('choir music baroque', index, { limit: 2 });
    expect(hits).toHaveLength(2);
  });

  it('caps total characters and truncates the tail hit', () => {
    const hits = searchAcademy('choir music baroque', index, { maxChars: 120 });
    const total = hits.reduce((n, h) => n + h.text.length, 0);
    expect(total).toBeLessThanOrEqual(120);
    expect(hits.length).toBeGreaterThan(0);
  });

  it('never truncates a chunk to an empty string', () => {
    const hits = searchAcademy('hemiola', index, { maxChars: 10 });
    expect(hits[0].text.length).toBeGreaterThan(0);
  });

  it('leaves chunk.text intact even when the returned text is truncated', () => {
    const hits = searchAcademy('hemiola', index, { maxChars: 30 });
    expect(hits[0].chunk.text).toContain('rhythmic device');
  });

  it('gives an exact phrase match a bonus over scattered terms', () => {
    const hits = searchAcademy('walking pace', index);
    expect(hits[0].chunk.id).toBe('b');
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npx vitest run supabase/functions/_shared/academy/__tests__/search.test.ts`
Expected: FAIL — cannot resolve `../search`.

- [ ] **Step 3: Write the types**

Create `supabase/functions/_shared/academy/types.ts`:

```ts
// Shared by the ingest script (via the generated corpus) and the scorer.
export interface AcademyChunk {
  /** Stable id: "<page>/<slug>". */
  id: string;
  /** Manifest page key, e.g. "conductors". */
  page: string;
  /** Human page name, e.g. "Conductors Directory". */
  pageTitle: string;
  /** Chunk heading, e.g. "Robert Nathaniel Dett". */
  title: string;
  /** Plain text. No HTML. */
  text: string;
  /** Source URL, kept for traceability. Not shown to users. */
  url: string;
}

export interface AcademyHit {
  chunk: AcademyChunk;
  score: number;
  /** Possibly truncated to fit the character cap. */
  text: string;
}

export interface AcademyIndex {
  chunks: AcademyChunk[];
  /** token -> (chunk index -> term frequency in body+title) */
  postings: Map<string, Map<number, number>>;
  /** token -> set of chunk indexes whose title contains it */
  titlePostings: Map<string, Set<number>>;
}
```

- [ ] **Step 4: Write the scorer**

Create `supabase/functions/_shared/academy/search.ts`:

```ts
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
```

- [ ] **Step 5: Run the tests and verify they pass**

Run: `npx vitest run supabase/functions/_shared/academy/__tests__/search.test.ts`
Expected: PASS, 12 tests.

If the "rare term" test fails, check that `idf` uses `byChunk.size` (document frequency), not term frequency.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/_shared/academy/
git commit -m "feat: pure lexical scorer for the Academy corpus"
```

---

### Task 2: Record normalizers

**Files:**
- Create: `scripts/academy/normalize.mjs`
- Test: `scripts/academy/__tests__/normalize.test.ts`

**Interfaces:**
- Consumes: `AcademyChunk` shape from Task 1 (structural only — plain JS here, no type import).
- Produces:
  - `function slugify(input: string): string`
  - `function renderFacets(record: object, fields: string[]): string`
  - `function recordToChunk(record: object, cfg: PageConfig, ctx: { page, pageTitle, url }): AcademyChunk | null`
  - `PageConfig` = `{ titleField: string, fields: string[], idField?: string }`

`recordToChunk` returns `null` for a record that yields no text, so the ingest can count and report skips rather than emitting an empty chunk.

**Chunking rule (refines the spec):** one chunk per top-level record. Nested arrays of small items — the ~150 glossary terms under `TERM_CATEGORIES[].terms`, `developments`, `techniques` — are rendered as labeled lines *inside* the parent chunk rather than becoming their own chunks. A six-word chunk cannot rank against a 400-word one, and the parent supplies the context an answer needs.

- [ ] **Step 1: Write the failing test**

Create `scripts/academy/__tests__/normalize.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { slugify, renderFacets, recordToChunk } from '../normalize.mjs';

const ctx = {
  page: 'conductors',
  pageTitle: 'Conductors Directory',
  url: 'https://kevinphillipjohnson.com/academy/conductors.html',
};

// Copied verbatim from the live conductors.html DATA array.
const conductor = {
  id: 'kevin-p-johnson',
  name: 'Kevin P. Johnson',
  role: 'Composer, conductor, educator, liturgical consultant, publisher',
  affiliation: 'Spelman College (Assoc. Prof.); Lyke House Catholic Center (Dir. of Music)',
  location: 'Atlanta, GA',
  bio: 'Composer-conductor-educator in the Black sacred music tradition.',
  publishers: ['Carl Fischer', 'GIA', 'Colla Voce'],
  photo: '',
  tags: ['black-sacred', 'composer-arranger'],
};

// Shape copied from the live terms.html TERM_CATEGORIES array.
const termCategory = {
  id: 'tempo',
  name: 'Tempo Markings',
  description: 'Speed indications from slowest to fastest',
  terms: [
    { term: 'Largo', pronunciation: 'LAR-go', meaning: 'Very slow and broad', bpm: '40–60' },
    { term: 'Grave', pronunciation: 'GRAH-veh', meaning: 'Very slow and solemn', bpm: '25–45' },
  ],
};

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('Robert Nathaniel Dett')).toBe('robert-nathaniel-dett');
  });

  it('strips punctuation and collapses separators', () => {
    expect(slugify('Old American Songs (Set 1)')).toBe('old-american-songs-set-1');
  });

  it('strips diacritics', () => {
    expect(slugify('Mirga Gražinytė-Tyla')).toBe('mirga-grazinyte-tyla');
  });
});

describe('renderFacets', () => {
  it('labels each field and joins with newlines', () => {
    const out = renderFacets(conductor, ['role', 'location']);
    expect(out).toBe('Role: Composer, conductor, educator, liturgical consultant, publisher\nLocation: Atlanta, GA');
  });

  it('renders a string array as a comma list', () => {
    expect(renderFacets(conductor, ['publishers'])).toBe('Publishers: Carl Fischer, GIA, Colla Voce');
  });

  it('renders an array of objects as one line per item', () => {
    const out = renderFacets(termCategory, ['terms']);
    expect(out).toContain('Largo — LAR-go — Very slow and broad — 40–60');
    expect(out).toContain('Grave');
  });

  it('omits empty, null, and missing fields', () => {
    expect(renderFacets(conductor, ['photo', 'missing'])).toBe('');
  });
});

describe('recordToChunk', () => {
  it('builds a chunk from a flat record', () => {
    const chunk = recordToChunk(conductor, {
      titleField: 'name',
      fields: ['role', 'affiliation', 'location', 'bio', 'publishers'],
    }, ctx);
    expect(chunk.id).toBe('conductors/kevin-p-johnson');
    expect(chunk.title).toBe('Kevin P. Johnson');
    expect(chunk.page).toBe('conductors');
    expect(chunk.pageTitle).toBe('Conductors Directory');
    expect(chunk.url).toBe(ctx.url);
    expect(chunk.text).toContain('Black sacred music tradition');
    expect(chunk.text).toContain('Publishers: Carl Fischer');
  });

  it('prefers the record id over a slugified title when idField is set', () => {
    const chunk = recordToChunk(conductor, {
      titleField: 'name', idField: 'id', fields: ['bio'],
    }, ctx);
    expect(chunk.id).toBe('conductors/kevin-p-johnson');
  });

  it('flattens a nested item array into the parent chunk', () => {
    const chunk = recordToChunk(termCategory, {
      titleField: 'name', fields: ['description', 'terms'],
    }, { page: 'terms', pageTitle: 'Choral Terminology', url: 'https://example.test/terms.html' });
    expect(chunk.id).toBe('terms/tempo-markings');
    expect(chunk.text).toContain('Very slow and broad');
    expect(chunk.text).toContain('Grave');
  });

  it('contains no HTML tags', () => {
    const chunk = recordToChunk(
      { name: 'Test', bio: 'A <em>bold</em> claim &amp; more' },
      { titleField: 'name', fields: ['bio'] }, ctx,
    );
    expect(chunk.text).not.toMatch(/<[^>]+>/);
    expect(chunk.text).toContain('bold');
    expect(chunk.text).toContain('&');
  });

  it('returns null when a record yields no text', () => {
    const chunk = recordToChunk({ name: 'Empty', bio: '' }, { titleField: 'name', fields: ['bio'] }, ctx);
    expect(chunk).toBeNull();
  });

  it('returns null when the title field is missing', () => {
    expect(recordToChunk({ bio: 'orphan' }, { titleField: 'name', fields: ['bio'] }, ctx)).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npx vitest run scripts/academy/__tests__/normalize.test.ts`
Expected: FAIL — cannot resolve `../normalize.mjs`.

- [ ] **Step 3: Write the normalizer**

Create `scripts/academy/normalize.mjs`:

```js
// Pure record -> chunk conversion. No browser, no I/O — unit tested directly.

/** "Robert Nathaniel Dett" -> "robert-nathaniel-dett" */
export function slugify(input) {
  return String(input)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const LABELS = {
  bio: 'Bio', role: 'Role', affiliation: 'Affiliation', location: 'Location',
  history: 'History', developments: 'Key developments', techniques: 'Technique',
  notableConductors: 'Notable conductors', description: 'Description',
  terms: 'Terms', period: 'Period', summary: 'Summary', publishers: 'Publishers',
  composer: 'Composer', arranger: 'Arranger', publisher: 'Publisher',
  voicing: 'Voicing', year: 'Year', difficulty: 'Difficulty', era: 'Era',
  subcategories: 'Subcategories', notes: 'Notes',
};

const label = (field) => LABELS[field] ?? field.replace(/([a-z])([A-Z])/g, '$1 $2')
  .replace(/^./, (c) => c.toUpperCase());

function stripHtml(value) {
  return String(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** One line per item for arrays of objects; a comma list for arrays of strings. */
function renderValue(value) {
  if (value == null) return '';
  if (Array.isArray(value)) {
    if (value.length === 0) return '';
    if (value.every((v) => typeof v !== 'object' || v === null)) {
      return value.map(stripHtml).filter(Boolean).join(', ');
    }
    return value
      .map((item) => Object.values(item)
        .filter((v) => v != null && typeof v !== 'object' && String(v).trim() !== '')
        .map(stripHtml).join(' — '))
      .filter(Boolean)
      .join('\n');
  }
  if (typeof value === 'object') return '';
  return stripHtml(value);
}

export function renderFacets(record, fields) {
  return fields
    .map((field) => {
      const rendered = renderValue(record[field]);
      if (!rendered) return '';
      return `${label(field)}: ${rendered}`;
    })
    .filter(Boolean)
    .join('\n');
}

export function recordToChunk(record, cfg, ctx) {
  const rawTitle = record?.[cfg.titleField];
  if (!rawTitle || !String(rawTitle).trim()) return null;
  const title = stripHtml(rawTitle);

  const text = renderFacets(record, cfg.fields);
  if (!text.trim()) return null;

  const slug = cfg.idField && record[cfg.idField]
    ? slugify(record[cfg.idField])
    : slugify(title);

  return { id: `${ctx.page}/${slug}`, page: ctx.page, pageTitle: ctx.pageTitle, title, text, url: ctx.url };
}
```

- [ ] **Step 4: Run the tests and verify they pass**

Run: `npx vitest run scripts/academy/__tests__/normalize.test.ts`
Expected: PASS, 13 tests.

- [ ] **Step 5: Commit**

```bash
git add scripts/academy/
git commit -m "feat: Academy record normalizers"
```

---

### Task 3: Source manifest and the Playwright ingest runner

**Files:**
- Create: `scripts/academy/manifest.mjs`
- Create: `scripts/ingest-academy.mjs`
- Modify: `package.json` (add the `ingest:academy` script)

**Interfaces:**
- Consumes: `recordToChunk` from Task 2.
- Produces: `SOURCES` array from `manifest.mjs`; a runnable `node scripts/ingest-academy.mjs` that writes `supabase/functions/_shared/academy/corpus.ts`.

Three extraction modes, all verified against the live site:

- `data` (12 pages) — content lives in a top-level `const` in a classic `<script>`, reachable from `page.evaluate`. **Mandatory** for `conductors-guide`, which renders one chapter at a time behind prev/next buttons; DOM scraping would capture ~8% of it.
- `dom` (4 pages) — class-keyed markup. Uses `textContent`, which matters for `education.html`: its accordions hide with CSS rather than unmounting, so collapsed panels are still captured.
- `api` (1 source) — `repertoire.html` has no inline content; it fetches `/api/repertoire` (183 pieces).

- [ ] **Step 1: Write the manifest**

Create `scripts/academy/manifest.mjs`:

```js
const BASE = 'https://kevinphillipjohnson.com/academy';
const url = (page) => `${BASE}/${page}.html`;

// merch.html is deliberately excluded: a product-and-price list, not reference
// knowledge, and stale prices across ~50 tenants is a liability.
export const SOURCES = [
  { page: 'conductors-guide', pageTitle: 'Conductors Reference Guide', url: url('conductors-guide'), mode: 'data',
    globals: ['CHAPTERS'],
    cfg: { titleField: 'name', idField: 'id', fields: ['period', 'summary', 'history', 'developments', 'techniques', 'notableConductors', 'subcategories'] } },

  { page: 'conducting-history', pageTitle: 'History of Conducting', url: url('conducting-history'), mode: 'data',
    globals: ['CONDUCTING_ERAS'],
    cfg: { titleField: 'name', idField: 'id', fields: ['period', 'summary', 'history', 'developments', 'techniques', 'notableConductors'] } },

  { page: 'conductors', pageTitle: 'Conductors Directory', url: url('conductors'), mode: 'data',
    globals: ['DATA'],
    cfg: { titleField: 'name', idField: 'id', fields: ['role', 'affiliation', 'location', 'bio', 'publishers', 'tags'] } },

  { page: 'spirituals', pageTitle: 'The Negro Spiritual', url: url('spirituals'), mode: 'data',
    globals: ['SPIRITUAL_ERAS'],
    cfg: { titleField: 'name', idField: 'id', fields: ['period', 'summary', 'history', 'developments', 'techniques', 'notableConductors'] } },

  { page: 'history', pageTitle: 'History of Choral Music', url: url('history'), mode: 'data',
    globals: ['CHORAL_ERAS'],
    cfg: { titleField: 'name', idField: 'id', fields: ['period', 'summary', 'history', 'developments', 'techniques', 'notableConductors'] } },

  { page: 'patterns', pageTitle: 'Conducting Patterns', url: url('patterns'), mode: 'data',
    globals: ['PATTERNS'],
    cfg: { titleField: 'name', idField: 'id', fields: ['description', 'summary', 'beats', 'meter', 'technique', 'notes'] } },

  { page: 'terms', pageTitle: 'Choral Terminology', url: url('terms'), mode: 'data',
    globals: ['TERM_CATEGORIES'],
    cfg: { titleField: 'name', idField: 'id', fields: ['description', 'terms'] } },

  { page: 'workbook', pageTitle: 'Conducting Workbook', url: url('workbook'), mode: 'data',
    globals: ['COURSE_OBJECTIVES', 'WEEKLY_SCHEDULE', 'GRADING_BREAKDOWN'],
    cfg: { titleField: 'name', fields: ['description', 'summary', 'objectives', 'topics', 'weight', 'notes'] } },

  { page: 'works', pageTitle: 'Major Choral Works', url: url('works'), mode: 'data',
    globals: ['CHORAL_WORKS'],
    cfg: { titleField: 'title', fields: ['composer', 'year', 'era', 'voicing', 'duration', 'movements', 'description', 'notes'] } },

  { page: 'minor-works', pageTitle: 'Shorter Choral Works', url: url('minor-works'), mode: 'data',
    globals: ['MINOR_CHORAL_WORKS'],
    cfg: { titleField: 'title', fields: ['composer', 'year', 'era', 'voicing', 'duration', 'description', 'notes'] } },

  { page: 'mini-major-works', pageTitle: 'Mini-Major Choral Works', url: url('mini-major-works'), mode: 'data',
    globals: ['MINI_MAJOR_WORKS'],
    cfg: { titleField: 'title', fields: ['composer', 'year', 'era', 'voicing', 'duration', 'movements', 'description', 'notes'] } },

  { page: 'performance-wear', pageTitle: 'Concert Attire', url: url('performance-wear'), mode: 'data',
    globals: ['CHAPTERS'],
    cfg: { titleField: 'name', idField: 'id', fields: ['summary', 'history', 'developments', 'techniques', 'subcategories'] } },

  { page: 'education', pageTitle: 'Choral Education', url: url('education'), mode: 'dom',
    blockSelector: '.info-card, .glos-item', titleSelector: '.info-card-title, .glos-term' },

  { page: 'church', pageTitle: 'Church Music', url: url('church'), mode: 'dom',
    blockSelector: '.card', titleSelector: '.card-title' },

  { page: 'associations', pageTitle: 'Choral Associations', url: url('associations'), mode: 'dom',
    blockSelector: '.assoc-card', titleSelector: '.assoc-name' },

  { page: 'conventions', pageTitle: 'Choral Conventions', url: url('conventions'), mode: 'dom',
    blockSelector: '.conv-card', titleSelector: '.conv-name' },

  { page: 'repertoire', pageTitle: 'Repertoire Database', url: url('repertoire'), mode: 'api',
    apiUrl: 'https://kevinphillipjohnson.com/api/repertoire', collection: 'pieces',
    cfg: { titleField: 'title', idField: 'id', fields: ['composer', 'arranger', 'publisher', 'year', 'voicing', 'key_signature', 'tempo', 'meter', 'difficulty', 'notes'] } },
];
```

Note: `ENRICHMENTS` on `conductors.html` is intentionally not ingested — it is a
map of Wikipedia URLs keyed by conductor id, with no prose. The `/api/jwpepper-catalog`
and `/api/carlfischer-catalog` endpoints are live vendor search proxies, not fixed
content, and are also excluded.

- [ ] **Step 2: Write the ingest runner**

Create `scripts/ingest-academy.mjs`:

```js
#!/usr/bin/env node
// Regenerates supabase/functions/_shared/academy/corpus.ts from the live site.
//   node scripts/ingest-academy.mjs
// Run manually; the corpus is a snapshot and goes stale when the site changes.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { SOURCES } from './academy/manifest.mjs';
import { recordToChunk } from './academy/normalize.mjs';

const OUT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../supabase/functions/_shared/academy/corpus.ts',
);

const flatten = (value) => Array.isArray(value) ? value : Object.values(value ?? {});

async function extractData(page, source) {
  const records = [];
  for (const name of source.globals) {
    // Global lexical `const` bindings from a classic <script> are visible to
    // evaluated code in the same realm, but are NOT on `window`.
    const value = await page.evaluate((n) => {
      try { return eval(n); } catch { return null; }
    }, name);
    if (value == null) throw new Error(`${source.page}: global ${name} not found`);
    records.push(...flatten(value));
  }
  return records;
}

async function extractDom(page, source) {
  return page.$$eval(
    source.blockSelector,
    (nodes, titleSel) => nodes.map((node) => {
      const titleNode = node.querySelector(titleSel);
      const title = (titleNode?.textContent ?? '').trim();
      const clone = node.cloneNode(true);
      clone.querySelectorAll(titleSel).forEach((n) => n.remove());
      return { name: title, body: (clone.textContent ?? '').replace(/\s+/g, ' ').trim() };
    }),
    source.titleSelector,
  );
}

async function extractApi(source) {
  const res = await fetch(source.apiUrl);
  if (!res.ok) throw new Error(`${source.page}: ${source.apiUrl} returned ${res.status}`);
  const json = await res.json();
  return json[source.collection] ?? [];
}

async function main() {
  const browser = await chromium.launch();
  const chunks = [];
  const seen = new Set();
  const report = [];

  try {
    for (const source of SOURCES) {
      let records;
      if (source.mode === 'api') {
        records = await extractApi(source);
      } else {
        const page = await browser.newPage();
        const res = await page.goto(source.url, { waitUntil: 'networkidle' });
        if (!res || res.status() !== 200) {
          throw new Error(`${source.page}: ${source.url} returned ${res?.status()}`);
        }
        records = source.mode === 'data'
          ? await extractData(page, source)
          : await extractDom(page, source);
        await page.close();
      }

      if (records.length === 0) throw new Error(`${source.page}: extracted 0 records`);

      const cfg = source.cfg ?? { titleField: 'name', fields: ['body'] };
      const ctx = { page: source.page, pageTitle: source.pageTitle, url: source.url };
      let kept = 0, skipped = 0;
      for (const record of records) {
        const chunk = recordToChunk(record, cfg, ctx);
        if (!chunk) { skipped++; continue; }
        // Disambiguate collisions rather than silently dropping a chunk.
        if (seen.has(chunk.id)) {
          let n = 2;
          while (seen.has(`${chunk.id}-${n}`)) n++;
          chunk.id = `${chunk.id}-${n}`;
        }
        seen.add(chunk.id);
        chunks.push(chunk);
        kept++;
      }
      report.push(`  ${source.page.padEnd(20)} ${String(kept).padStart(4)} chunks  (${skipped} skipped)`);
    }
  } finally {
    await browser.close();
  }

  chunks.sort((a, b) => a.id.localeCompare(b.id));

  const body = [
    '// GENERATED FILE — do not edit by hand.',
    '// Regenerate: node scripts/ingest-academy.mjs',
    `// Source: kevinphillipjohnson.com/academy (${SOURCES.length} sources)`,
    "import type { AcademyChunk } from './types.ts';",
    '',
    `export const ACADEMY_CORPUS: AcademyChunk[] = ${JSON.stringify(chunks, null, 2)};`,
    '',
  ].join('\n');

  writeFileSync(OUT, body, 'utf8');
  console.log(report.join('\n'));
  console.log(`\n  TOTAL ${chunks.length} chunks -> ${path.relative(process.cwd(), OUT)}`);
}

main().catch((err) => { console.error(`\nIngest failed: ${err.message}`); process.exit(1); });
```

- [ ] **Step 3: Add the npm script**

In `package.json`, inside `"scripts"`, add:

```json
"ingest:academy": "node scripts/ingest-academy.mjs",
```

- [ ] **Step 4: Commit**

```bash
git add scripts/academy/manifest.mjs scripts/ingest-academy.mjs package.json
git commit -m "feat: Academy ingest runner and source manifest"
```

---

### Task 4: Generate the corpus and assert its integrity

**Files:**
- Create (generated): `supabase/functions/_shared/academy/corpus.ts`
- Test: `supabase/functions/_shared/academy/__tests__/corpus.test.ts`

**Interfaces:**
- Consumes: the ingest runner (Task 3), `buildIndex`/`searchAcademy` (Task 1).
- Produces: `ACADEMY_CORPUS: AcademyChunk[]`.

- [ ] **Step 1: Run the ingest**

Run: `npm run ingest:academy`
Expected: a per-page table, then a total in the 600–1,200 range. Every page reports a non-zero chunk count.

If a `data` page reports `global NAME not found`, open the live page and re-check the `const` name — the site changed and `manifest.mjs` needs updating. Do not work around it by switching that page to `dom` mode without checking whether the content is paginated.

- [ ] **Step 2: Write the integrity test**

Create `supabase/functions/_shared/academy/__tests__/corpus.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { ACADEMY_CORPUS } from '../corpus';
import { buildIndex, searchAcademy } from '../search';
import { SOURCES } from '../../../../../scripts/academy/manifest.mjs';

describe('ACADEMY_CORPUS', () => {
  it('is substantial', () => {
    expect(ACADEMY_CORPUS.length).toBeGreaterThan(500);
  });

  it('has a unique id for every chunk', () => {
    const ids = new Set(ACADEMY_CORPUS.map((c) => c.id));
    expect(ids.size).toBe(ACADEMY_CORPUS.length);
  });

  it('has non-empty required fields on every chunk', () => {
    for (const c of ACADEMY_CORPUS) {
      expect(c.title.trim(), c.id).not.toBe('');
      expect(c.text.trim(), c.id).not.toBe('');
      expect(c.url, c.id).toMatch(/^https:\/\/kevinphillipjohnson\.com\//);
    }
  });

  it('contains no HTML tags', () => {
    const offenders = ACADEMY_CORPUS.filter((c) => /<[a-z/][^>]*>/i.test(c.text));
    expect(offenders.map((c) => c.id)).toEqual([]);
  });

  it('has no absurdly long chunk', () => {
    const offenders = ACADEMY_CORPUS.filter((c) => c.text.length > 12_000);
    expect(offenders.map((c) => c.id)).toEqual([]);
  });

  it('draws every chunk from a page in the manifest', () => {
    const pages = new Set(SOURCES.map((s) => s.page));
    for (const c of ACADEMY_CORPUS) expect(pages.has(c.page), c.id).toBe(true);
  });

  it('covers every manifest page', () => {
    const covered = new Set(ACADEMY_CORPUS.map((c) => c.page));
    for (const s of SOURCES) expect(covered.has(s.page), s.page).toBe(true);
  });

  it('excludes the merch page', () => {
    expect(ACADEMY_CORPUS.some((c) => c.page === 'merch')).toBe(false);
  });

  // Guards against a silent extraction regression: if the site is restructured
  // so a page still yields records but far fewer of them, the ingest succeeds
  // and only this test notices. Update the numbers deliberately when the site
  // genuinely grows, and say so in the commit message.
  it('holds a plausible chunk count for every page', () => {
    const counts = new Map<string, number>();
    for (const c of ACADEMY_CORPUS) counts.set(c.page, (counts.get(c.page) ?? 0) + 1);

    // Floors, not exact values — set these from the first successful ingest,
    // at roughly 80% of the observed count.
    const FLOORS: Record<string, number> = {
      'conductors-guide': 10, 'conducting-history': 5, conductors: 150,
      spirituals: 5, history: 5, patterns: 5, terms: 5, workbook: 5,
      works: 20, 'minor-works': 20, 'mini-major-works': 20,
      'performance-wear': 5, education: 40, church: 15,
      associations: 7, conventions: 15, repertoire: 150,
    };

    for (const [page, floor] of Object.entries(FLOORS)) {
      expect(counts.get(page) ?? 0, page).toBeGreaterThanOrEqual(floor);
    }
  });

  it('answers a representative conducting query', () => {
    const index = buildIndex(ACADEMY_CORPUS);
    const hits = searchAcademy('what is cheironomy', index);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].text.toLowerCase()).toContain('cheironom');
  });

  it('answers a representative terminology query', () => {
    const index = buildIndex(ACADEMY_CORPUS);
    const hits = searchAcademy('what does andante mean', index);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.some((h) => h.text.toLowerCase().includes('walking'))).toBe(true);
  });
});
```

- [ ] **Step 3: Run the test**

Run: `npx vitest run supabase/functions/_shared/academy/__tests__/corpus.test.ts`
Expected: PASS, 10 tests.

A failure on "no HTML tags" means a source field carries markup that `stripHtml` missed — fix `normalize.mjs` and re-run the ingest. Do not hand-edit `corpus.ts`.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/_shared/academy/corpus.ts supabase/functions/_shared/academy/__tests__/corpus.test.ts
git commit -m "feat: generate the Academy corpus"
```

---

### Task 5: Wire the `search_academy` tool

**Files:**
- Modify: `supabase/functions/assistant-chat/toolCatalog.ts` (add to `TOOL_CATALOG`, before the closing `];`)
- Modify: `supabase/functions/assistant-chat/executors.ts` (add a `switch` case and the executor function)
- Test: `supabase/functions/assistant-chat/__tests__/toolCatalog.test.ts` (extend)
- Test: `supabase/functions/assistant-chat/__tests__/executors.test.ts` (extend)

**Interfaces:**
- Consumes: `ACADEMY_CORPUS` (Task 4), `buildIndex`/`searchAcademy` (Task 1).
- Produces: tool `search_academy`, `minRole: 'member'`, `execution: 'server'`, `confirm: false`.

The tool is read-only, so it needs no confirmation card — same posture as `search_music`. It takes no `Deps`: the corpus is bundled, not fetched.

- [ ] **Step 1: Write the failing tests**

Append to `supabase/functions/assistant-chat/__tests__/toolCatalog.test.ts`:

```ts
describe('search_academy', () => {
  it('is available to members', () => {
    const tool = TOOL_CATALOG.find((t) => t.name === 'search_academy');
    expect(tool).toBeDefined();
    expect(tool!.minRole).toBe('member');
    expect(tool!.execution).toBe('server');
    expect(tool!.confirm).toBe(false);
  });

  it('is included in the member tool list', () => {
    expect(toolsForRole('member').map((t) => t.name)).toContain('search_academy');
  });

  it('requires a query parameter', () => {
    const tool = TOOL_CATALOG.find((t) => t.name === 'search_academy')!;
    expect((tool.parameters as any).required).toEqual(['query']);
  });
});
```

Append to `supabase/functions/assistant-chat/__tests__/executors.test.ts`:

```ts
describe('search_academy executor', () => {
  const deps = { supabase: { from: () => ({}) } } as any;

  it('returns passages for a matching query', async () => {
    const { replyJson } = await executeServerTool('search_academy', { query: 'hemiola' }, deps);
    const parsed = JSON.parse(replyJson);
    expect(Array.isArray(parsed.passages)).toBe(true);
    expect(parsed.passages.length).toBeGreaterThan(0);
    expect(parsed.passages[0]).toHaveProperty('title');
    expect(parsed.passages[0]).toHaveProperty('text');
    expect(parsed.passages[0]).toHaveProperty('url');
  });

  it('reports no match explicitly rather than returning an empty success', async () => {
    const { replyJson } = await executeServerTool(
      'search_academy', { query: 'zzzz nonexistent trombone embouchure' }, deps,
    );
    const parsed = JSON.parse(replyJson);
    expect(parsed.passages).toEqual([]);
    expect(parsed.note).toMatch(/no matching/i);
  });

  it('handles a missing query argument without throwing', async () => {
    const { replyJson } = await executeServerTool('search_academy', {}, deps);
    expect(JSON.parse(replyJson).passages).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the tests and verify they fail**

Run: `npx vitest run supabase/functions/assistant-chat/__tests__/toolCatalog.test.ts supabase/functions/assistant-chat/__tests__/executors.test.ts`
Expected: FAIL — `search_academy` is not defined / unknown tool.

- [ ] **Step 3: Add the tool definition**

In `supabase/functions/assistant-chat/toolCatalog.ts`, add as the last entry of `TOOL_CATALOG`:

```ts
  {
    name: 'search_academy',
    description: 'Search the choral reference library for background on conducting history and technique, beat patterns, spirituals, choral repertoire and major works, musical terminology, church music, choral education, choral associations, and concert attire. Use this before answering any question about those subjects. Returns source passages.',
    parameters: {
      type: 'object',
      properties: { query: str('The subject to look up, e.g. "hemiola" or "conducting before the baton"') },
      required: ['query'],
    },
    minRole: 'member', execution: 'server', confirm: false,
  },
```

- [ ] **Step 4: Add the executor**

In `supabase/functions/assistant-chat/executors.ts`, add the imports at the top:

```ts
import { ACADEMY_CORPUS } from '../_shared/academy/corpus.ts';
import { buildIndex, searchAcademy } from '../_shared/academy/search.ts';
```

Add the case alongside the other read-only tools in `executeServerTool`:

```ts
      case 'search_academy': return { replyJson: searchAcademyTool(args) };
```

And the function, near `searchMusic`:

```ts
// The corpus is bundled and immutable, so the index is built once per instance.
const academyIndex = buildIndex(ACADEMY_CORPUS);

function searchAcademyTool(args: Record<string, unknown>): string {
  const query = String(args.query ?? '').trim();
  const hits = query ? searchAcademy(query, academyIndex) : [];
  if (hits.length === 0) {
    return JSON.stringify({
      passages: [],
      note: 'No matching passages in the reference library. Say you do not have that information rather than guessing.',
    });
  }
  return JSON.stringify({
    passages: hits.map((h) => ({ title: h.chunk.title, section: h.chunk.pageTitle, text: h.text, url: h.chunk.url })),
  });
}
```

- [ ] **Step 5: Run the tests and verify they pass**

Run: `npx vitest run supabase/functions/assistant-chat/__tests__/`
Expected: PASS, including the pre-existing tests.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/assistant-chat/toolCatalog.ts supabase/functions/assistant-chat/executors.ts supabase/functions/assistant-chat/__tests__/
git commit -m "feat: search_academy tool"
```

---

### Task 6: Prompt guidance

**Files:**
- Modify: `supabase/functions/assistant-chat/prompt.ts`
- Test: `supabase/functions/assistant-chat/__tests__/prompt.test.ts` (extend)

**Interfaces:**
- Consumes: the `search_academy` tool name (Task 5).
- Produces: no new exports; `buildSystemPrompt` output gains the guidance block.

- [ ] **Step 1: Write the failing test**

Append to `supabase/functions/assistant-chat/__tests__/prompt.test.ts`:

```ts
describe('academy guidance', () => {
  const ctx = {
    firstName: 'Kevin', role: 'member' as const, tenantName: 'Test Choir',
    activeModules: [], nowIso: '2026-08-04T12:00:00Z', timezone: 'America/New_York',
  };

  it('tells the assistant to search before answering subject questions', () => {
    const prompt = buildSystemPrompt(ctx);
    expect(prompt).toContain('search_academy');
  });

  it('names the covered domains', () => {
    const prompt = buildSystemPrompt(ctx);
    expect(prompt).toMatch(/conducting history/i);
    expect(prompt).toMatch(/terminology/i);
    expect(prompt).toMatch(/repertoire/i);
  });

  it('forbids inventing an answer when nothing is found', () => {
    expect(buildSystemPrompt(ctx)).toMatch(/do not (guess|invent)/i);
  });

  it('gives the guidance to admins too', () => {
    expect(buildSystemPrompt({ ...ctx, role: 'admin' as const })).toContain('search_academy');
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npx vitest run supabase/functions/assistant-chat/__tests__/prompt.test.ts`
Expected: FAIL — the prompt has no `search_academy` text.

- [ ] **Step 3: Add the guidance block**

In `supabase/functions/assistant-chat/prompt.ts`, define near the other note constants inside `buildSystemPrompt`:

```ts
  const academyNote = [
    'Choral reference library (search_academy):',
    '- You have a reference library covering conducting history and technique, beat patterns, spirituals, choral repertoire and major works, musical terminology, church music, choral education, choral associations, and concert attire.',
    '- Call search_academy BEFORE answering any question in those subjects, including questions that sound like general knowledge.',
    '- Answer from the passages it returns. Do not guess or invent details, and do not pad an answer with outside claims.',
    '- If it returns no passages, say you do not have that information.',
    '- Answer in your own voice. Do not cite the library by name, and never attribute the material to any other source.',
  ].join('\n');
```

Then add it to the array returned at the end of `buildSystemPrompt`, on its own line between `placesNote,` and `projectNote,`:

```ts
    placesNote,
    academyNote,
    projectNote,
```

It is role-independent — every role gets it, so it goes in the unconditional list rather than behind a `ctx.role` check.

- [ ] **Step 4: Run the tests and verify they pass**

Run: `npx vitest run supabase/functions/assistant-chat/__tests__/prompt.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/assistant-chat/prompt.ts supabase/functions/assistant-chat/__tests__/prompt.test.ts
git commit -m "feat: prompt guidance for the reference library"
```

---

### Task 7: Verify and deploy

**Files:** none modified.

- [ ] **Step 1: Run the full test suite**

Run: `npx vitest run`
Expected: PASS. Compare the failure count against `origin/main` — the repo carries a known baseline, so confirm this branch adds no new failures rather than assuming zero.

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no new errors versus `origin/main`. `corpus.ts` is a large literal; if typecheck slows noticeably, note the timing in the PR.

- [ ] **Step 3: Deno-check the edge function**

Run: `deno check supabase/functions/assistant-chat/index.ts`
Expected: no errors. This is the real gate on the corpus import and on `.ts` extensions in relative imports — Vitest would not catch either.

- [ ] **Step 4: Deploy**

Run: `bash scripts/deploy-functions.sh assistant-chat`
Expected: the script restarts the container. The restart is required — the edge runtime caches ES modules.

- [ ] **Step 5: Live smoke test**

Get a JWT via a password grant against `https://supabase.gleeworld.org` using the demo account (`demo@` / `GleeDemo2026!`; the anon key is in the droplet's `/opt/supabase/.env`), then POST to the deployed `assistant-chat` with a corpus-only question, for example "what is cheironomy?".

Note the `demo_viewer` JWT claim blocks writes by design, but `search_academy` is read-only, so the demo account exercises it fine.
Expected: a grounded answer naming hand signs tracing melodic contour. Confirm from the response that `search_academy` fired rather than the base model answering from memory.

Verify the negative case too: ask something outside the corpus, such as "what is the fingering for a trumpet high C?", and confirm the assistant declines rather than inventing.

- [ ] **Step 6: Open the PR**

```bash
git push -u origin feat/academy-knowledge
gh pr create --title "feat: Academy knowledge for the assistant" --body "$(cat <<'EOF'
Gives the assistant a `search_academy` tool over a generated corpus of the
choral reference library at kevinphillipjohnson.com/academy.

- Ingest: `npm run ingest:academy` (Playwright, manual, run against the live site)
- Corpus: generated `supabase/functions/_shared/academy/corpus.ts`
- Retrieval: pure in-memory lexical scorer, top 6 passages, ~2,500-token cap
- No DB, no migration, no RLS, no frontend deploy

Spec: docs/superpowers/specs/2026-08-04-academy-knowledge-design.md
Plan: docs/superpowers/plans/2026-08-04-academy-knowledge.md

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Deviations from the spec

Three, all deliberate. Raise them with Kevin if any looks wrong.

1. **`corpus.ts`, not `corpus.json`.** No edge function imports JSON today, and import attributes behave differently in Deno and Vitest. A generated `.ts` module imports identically in both and is covered by `deno check`.
2. **Nested small items stay inside the parent chunk.** The spec said one chunk per term and per work. For the ~150 glossary terms that would produce six-word chunks that cannot rank against 400-word ones and that strip the context an answer needs. Substantial records — conductor bios, repertoire pieces, works — still get their own chunk, as specced.
3. **No Playwright golden-file test against a checked-in fixture page.** The spec asked for one so a site redesign fails loudly. That is already covered from two directions: the ingest throws on a missing global, a non-200, or zero records, so a partial ingest cannot silently reach production; and the per-page floor test in Task 4 catches the subtler case where a page still yields records but far fewer. A browser-driven fixture test would add a Playwright dependency to the unit suite for a third layer of the same guarantee.

`ENRICHMENTS` (a map of Wikipedia URLs keyed by conductor id, no prose) and the two live vendor catalog proxies are excluded from ingest — noted in the spec's inventory but worth restating, since they appear in the page source.

## Refresh procedure

When the Academy site changes:

1. `npm run ingest:academy`
2. `npx vitest run supabase/functions/_shared/academy/`
3. Review the `corpus.ts` diff — it shows exactly what content moved.
4. `bash scripts/deploy-functions.sh assistant-chat`

If a `data` page fails with "global NAME not found", the site was restructured; update `manifest.mjs`. The ingest exits non-zero rather than emitting a smaller corpus, so a silent partial ingest cannot reach production.
