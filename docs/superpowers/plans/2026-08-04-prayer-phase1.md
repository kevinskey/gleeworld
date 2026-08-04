# Prayer Module — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve a lectionary citation to actual scripture text from our own database, and use it to replace the `usccb-readings` edge function's runtime scrape of Universalis.

**Architecture:** Phase 0 landed the calendar, the citations, and 35,379 WEBCE verses. The missing link between them is a citation parser: `"Acts 7:51—8:1a"` → a set of `(book, chapter, verse)` ranges that can be selected from `gw_bible_verses`. Parsing is pure TypeScript, unit-tested against the **real 1,165-citation corpus** already imported. A new RPC composes it with `prayer_day()` so one call returns the day, its citations, *and* the text. The existing `usccb-readings` function then becomes a thin adapter over that RPC, preserving its response contract so deployed iOS clients keep working.

**Tech Stack:** TypeScript (pure parser + Vitest), PostgreSQL RPC, Supabase Edge Function (Deno).

## Global Constraints

- Everything from the Phase 0 plan's Global Constraints still applies (table prefix, tenant-less reference tables, `NOTIFY pgrst`, `npm ci --legacy-peer-deps`, `typecheck:guard` as the real gate, Kevin runs production DB statements).
- **The `usccb-readings` response contract must not change.** Deployed iOS builds call it. Its shape is `{ date, sourceUrl, liturgicalTitle, readings: [{ heading, citation, summary, html }] }`. The function name stays too — it is already a misnomer (it scrapes Universalis, not USCCB) and is kept for backward compatibility.
- **Do not ship scraped third-party reading text.** The whole point of this phase is to stop doing that.
- Scripture text rendered to users must come from `gw_bible_verses` (WEBCE, public domain) and be attributed via `gw_bible_translations.attribution`.

---

## Why this phase, and why first

`supabase/functions/usccb-readings/index.ts` currently fetches and scrapes **universalis.com** at request time. Its own header comment records that it originally targeted USCCB and had to move because *"their Cloudflare Bot Fight Mode returns 403 / stub to every server-side fetch."*

That is three problems in production today, before the Prayer module ships anything:

1. **Licensing.** It serves scraped text from a commercial third-party site as `html` injected into our modal. Phase 0's entire content strategy exists to avoid exactly this.
2. **Fragility.** It has already been broken once by anti-bot measures. A second block takes the feature down with no fallback.
3. **Incompleteness.** The header notes Universalis "strips the Responsorial Psalm body (citation only)", so *"directors paste the psalm verses by hand when planning the song slot."*

Phase 0's data fixes all three: local, permissively-licensed, offline-capable, and complete — including the psalm. Consumers already exist (`LiturgicalDayCard`, `ReadingsModal`, `DateCardTabPanel`, `cards/custom.tsx`), so this phase delivers user-visible value without building a single new screen.

---

## The citation corpus (measured, not assumed)

Profiled across all 1,165 citations imported in Phase 0. Percentages are of the corpus.

| Feature | Share | Example |
|---|---|---|
| Comma segments | 43.3% | `Psalm 122:1-2, 3-4, 4-5` |
| Letter suffix | 12.9% | `Isaiah 58:1-9a` |
| Numbered book | 11.0% | `1 Corinthians 12:12-14` |
| `" and "` joiner | 4.9% | `Psalm 1:1-2, 3, 4 and 6` |
| Cross-chapter range | 1.5% | `Acts 7:51—8:1a` |
| Semicolon jump | 1.5% | `Ezekiel 9:1-7; 10:18-22` |
| No `chapter:verse` | 0.6% | `Philemon 7-20` |

62 distinct book names appear. Specific traps, all real rows:

- **Em-dash vs hyphen is meaningful.** `—` separates a cross-chapter range (`Acts 12:24—13:5a`); `-` separates verses within a chapter (`1-7`). Treating them the same silently corrupts 18 citations.
- **Single-chapter books omit the chapter**: `Jude 17, 20b-25`, `Philemon 7-20`, `2 John 4-9`, `3 John 5-8`. The verse numbers are *verses*, not chapters. Obadiah and Philemon behave the same way.
- **Esther has letter-chapters**: `Esther C:12, 14-16, 23-25`. The Greek additions are lettered A–F in the Catholic canon and have no numeric chapter.
- **Upstream typos exist**: `Psalm 23: 1-3a, 3b4, 5, 6` — `3b4` is malformed (`3b-4`). The parser must degrade gracefully on a bad segment rather than throwing away the whole citation.
- **Space after the colon** is common (`Psalm 23: 1-3a`).
- Letter suffixes (`9a`, `3b`) mark half-verses. **WEBCE has no half-verse granularity**, so `9a` resolves to the whole of verse 9. This is a deliberate, documented approximation — record it in the UI attribution, not silently.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/lib/prayer/books.ts` | Book-name → USFM code resolution, incl. single-chapter and letter-chapter books |
| `src/lib/prayer/books.test.ts` | Unit tests, including every one of the 62 corpus names |
| `src/lib/prayer/citation.ts` | Citation string → `VerseRange[]` |
| `src/lib/prayer/citation.test.ts` | Unit tests driven by the real corpus traps |
| `supabase/migrations/20260805120000_prayer_reading_text.sql` | `prayer_reading_text()` + `prayer_day_full()` RPCs |
| `supabase/migrations/tests/prayer_reading_text_test.sql` | SQL assertions for both RPCs |
| `scripts/check-citation-coverage.ts` | Sweeps all imported citations, reports any that fail to resolve |
| `supabase/functions/usccb-readings/index.ts` | **Modified** — thin adapter over the RPC; same response contract, no scraping |

---

### Task 1: Book-name resolver

**Files:**
- Create: `src/lib/prayer/books.ts`
- Test: `src/lib/prayer/books.test.ts`

**Interfaces:**
- Produces: `resolveBook(name: string): BookRef | null` where
  `BookRef = { usfmCode: string; singleChapter: boolean }`.
  Task 2 consumes it.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { resolveBook } from './books';

describe('resolveBook', () => {
  it('resolves plain and numbered book names', () => {
    expect(resolveBook('Isaiah')?.usfmCode).toBe('ISA');
    expect(resolveBook('1 Corinthians')?.usfmCode).toBe('1CO');
    expect(resolveBook('2 Samuel')?.usfmCode).toBe('2SA');
  });

  it('resolves deuterocanonical books present in WEBCE', () => {
    expect(resolveBook('Sirach')?.usfmCode).toBe('SIR');
    expect(resolveBook('Wisdom')?.usfmCode).toBe('WIS');
    expect(resolveBook('Tobit')?.usfmCode).toBe('TOB');
    expect(resolveBook('Baruch')?.usfmCode).toBe('BAR');
    expect(resolveBook('1 Maccabees')?.usfmCode).toBe('1MA');
  });

  it('is case- and whitespace-insensitive', () => {
    expect(resolveBook('  song of songs ')?.usfmCode).toBe('SNG');
  });

  // Jude 17, Philemon 7-20, 2 John 4-9, 3 John 5-8 all cite VERSES with no
  // chapter. The parser needs to know which books behave this way.
  it('flags single-chapter books', () => {
    for (const n of ['Jude', 'Philemon', 'Obadiah', '2 John', '3 John']) {
      expect(resolveBook(n)?.singleChapter, `${n} should be single-chapter`).toBe(true);
    }
    expect(resolveBook('Genesis')?.singleChapter).toBe(false);
  });

  it('returns null for an unknown name rather than guessing', () => {
    expect(resolveBook('Book of Mormon')).toBeNull();
    expect(resolveBook('')).toBeNull();
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run src/lib/prayer/books.test.ts`
Expected: FAIL, cannot resolve `./books`.

- [ ] **Step 3: Implement**

Build a `Record<string, BookRef>` keyed by lowercased name. Cover, at minimum, every one of the 62 corpus names. Derive the authoritative list by querying the imported data:

```bash
psql "$PRAYER_DB_URL" -tA -c \
  "SELECT DISTINCT regexp_replace(citation, '^((?:[123] )?[A-Za-z][A-Za-z ]+?) +[0-9A-F].*$', '\\1')
   FROM gw_prayer_readings WHERE slot <> 'note' ORDER BY 1;"
```

Include common abbreviations (`Ps`, `Mt`, `Cf.` stripped) and the single-chapter set `{ OBA, PHM, 2JN, 3JN, JUD }`.

- [ ] **Step 4: Confirm green**

Run: `npx vitest run src/lib/prayer/books.test.ts`

- [ ] **Step 5: Prove every corpus name resolves**

```bash
npx tsx scripts/check-citation-coverage.ts --books-only
```
Expected: `0 unresolved book names`. Any miss is a real gap — add it, do not loosen the test.

- [ ] **Step 6: Commit**

```bash
git add src/lib/prayer/books.ts src/lib/prayer/books.test.ts
git commit -m "feat(prayer): book-name resolver for lectionary citations"
```

---

### Task 2: Citation parser

**Files:**
- Create: `src/lib/prayer/citation.ts`
- Test: `src/lib/prayer/citation.test.ts`

**Interfaces:**
- Consumes: `resolveBook` from Task 1.
- Produces: `parseCitation(citation: string): ParsedCitation` where
  `ParsedCitation = { usfmCode: string | null; ranges: VerseRange[]; unparsed: string[] }` and
  `VerseRange = { startChapter: number | null; startVerse: number; endChapter: number | null; endVerse: number; chapterLabel?: string }`.
  `unparsed` collects segments that could not be read, so a malformed fragment degrades one segment instead of the whole citation.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { parseCitation } from './citation';

describe('parseCitation', () => {
  it('parses a simple within-chapter range', () => {
    const c = parseCitation('Isaiah 2:1-5');
    expect(c.usfmCode).toBe('ISA');
    expect(c.ranges).toEqual([
      { startChapter: 2, startVerse: 1, endChapter: 2, endVerse: 5 },
    ]);
  });

  it('parses comma segments as separate ranges in the same chapter', () => {
    const c = parseCitation('Psalm 122:1-2, 3-4, 6-7');
    expect(c.ranges).toEqual([
      { startChapter: 122, startVerse: 1, endChapter: 122, endVerse: 2 },
      { startChapter: 122, startVerse: 3, endChapter: 122, endVerse: 4 },
      { startChapter: 122, startVerse: 6, endChapter: 122, endVerse: 7 },
    ]);
  });

  // An em-dash means the range crosses a chapter boundary. A hyphen never does.
  it('distinguishes an em-dash cross-chapter range from a hyphen range', () => {
    const c = parseCitation('Acts 7:51—8:1a');
    expect(c.ranges).toEqual([
      { startChapter: 7, startVerse: 51, endChapter: 8, endVerse: 1 },
    ]);
  });

  it('parses semicolon jumps to a new chapter', () => {
    const c = parseCitation('Ezekiel 9:1-7; 10:18-22');
    expect(c.ranges).toEqual([
      { startChapter: 9, startVerse: 1, endChapter: 9, endVerse: 7 },
      { startChapter: 10, startVerse: 18, endChapter: 10, endVerse: 22 },
    ]);
  });

  // WEBCE has no half-verse granularity, so 9a resolves to all of verse 9.
  it('drops letter suffixes and keeps the whole verse', () => {
    expect(parseCitation('Isaiah 58:1-9a').ranges).toEqual([
      { startChapter: 58, startVerse: 1, endChapter: 58, endVerse: 9 },
    ]);
    expect(parseCitation('Psalm 23: 1-3a, 3b-4').ranges).toEqual([
      { startChapter: 23, startVerse: 1, endChapter: 23, endVerse: 3 },
      { startChapter: 23, startVerse: 3, endChapter: 23, endVerse: 4 },
    ]);
  });

  it('accepts a space after the colon', () => {
    expect(parseCitation('Psalm 33: 4-5').ranges[0].startVerse).toBe(4);
  });

  it('treats " and " as a segment separator', () => {
    const c = parseCitation('Psalm 1:1-2, 3, 4 and 6');
    expect(c.ranges.map((r) => [r.startVerse, r.endVerse])).toEqual([
      [1, 2], [3, 3], [4, 4], [6, 6],
    ]);
  });

  // Jude/Philemon/2-3 John cite verses with no chapter at all.
  it('reads bare numbers as verses for single-chapter books', () => {
    const c = parseCitation('Philemon 7-20');
    expect(c.usfmCode).toBe('PHM');
    expect(c.ranges).toEqual([
      { startChapter: 1, startVerse: 7, endChapter: 1, endVerse: 20 },
    ]);
  });

  // Esther's Greek additions are lettered, not numbered.
  it('preserves a letter chapter label instead of failing', () => {
    const c = parseCitation('Esther C:12, 14-16');
    expect(c.usfmCode).toBe('EST');
    expect(c.ranges[0].chapterLabel).toBe('C');
    expect(c.ranges[0].startChapter).toBeNull();
  });

  // Upstream typo, verbatim from the corpus: "3b4" should be "3b-4".
  it('degrades one malformed segment without losing the rest', () => {
    const c = parseCitation('Psalm 23: 1-3a, 3b4, 5, 6');
    expect(c.unparsed).toEqual(['3b4']);
    expect(c.ranges.map((r) => [r.startVerse, r.endVerse])).toEqual([
      [1, 3], [5, 5], [6, 6],
    ]);
  });

  it('takes the first alternative of a pipe-separated citation', () => {
    const c = parseCitation('Genesis 1:1-2:2|Genesis 1:1,26-31a');
    expect(c.ranges[0]).toEqual({
      startChapter: 1, startVerse: 1, endChapter: 2, endVerse: 2,
    });
  });

  it('returns a null book and no ranges for unresolvable input', () => {
    const c = parseCitation('From the Common of the Blessed Virgin Mary');
    expect(c.usfmCode).toBeNull();
    expect(c.ranges).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run src/lib/prayer/citation.test.ts`
Expected: FAIL, cannot resolve `./citation`.

- [ ] **Step 3: Implement**

Suggested order inside `parseCitation`:
1. Take the substring before the first `|`.
2. Match the leading book name (greedy letters plus optional leading digit) and `resolveBook` it. Null book → return `{ usfmCode: null, ranges: [], unparsed: [rest] }`.
3. Split the remainder on `;` into chapter groups, then each group on `,` and `" and "` into segments.
4. Track a "current chapter" that persists across comma segments and resets on `;` or an explicit `N:`.
5. For each segment: strip letter suffixes with `/([0-9]+)[a-d]\b/ → $1`, then match `N:M—P:Q`, `N:M-Q`, `N:M`, or bare `M`/`M-Q` (verses, using the current chapter; chapter 1 for single-chapter books).
6. Anything left unmatched goes to `unparsed`.

- [ ] **Step 4: Confirm green**

Run: `npx vitest run src/lib/prayer/citation.test.ts`

- [ ] **Step 5: Sweep the entire real corpus**

```bash
npx tsx scripts/check-citation-coverage.ts
```
Expected: **≥ 99% of the 1,165 citations fully parsed, 0 unresolved book names.** Print every unparsed segment. Investigate each before proceeding — do not raise the threshold to make it pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/prayer/citation.ts src/lib/prayer/citation.test.ts scripts/check-citation-coverage.ts
git commit -m "feat(prayer): lectionary citation parser"
```

---

### Task 3: Reading-text RPCs

**Files:**
- Create: `supabase/migrations/20260805120000_prayer_reading_text.sql`
- Test: `supabase/migrations/tests/prayer_reading_text_test.sql`

**Interfaces:**
- Consumes: `gw_bible_*` (Phase 0), `prayer_day()` (Phase 0).
- Produces:
  - `public.prayer_reading_text(p_translation text, p_usfm text, p_ranges jsonb) RETURNS jsonb` — resolves ranges to verses.
  - `public.prayer_day_full(p_date date, p_rite text, p_translation text) RETURNS jsonb` — `prayer_day()` plus a `verses` array per reading.
- Ranges are passed as JSON from the TypeScript parser, so citation parsing lives in exactly one place.

- [ ] **Step 1: Write the failing SQL test**

```sql
BEGIN;
DO $$
DECLARE r jsonb;
BEGIN
  r := public.prayer_reading_text('WEBCE', 'PSA',
        '[{"startChapter":23,"startVerse":1,"endChapter":23,"endVerse":1}]'::jsonb);
  ASSERT jsonb_array_length(r->'verses') = 1, 'expected 1 verse';
  ASSERT r->'verses'->0->>'text' LIKE 'The LORD is my shepherd%',
         'wrong verse text: ' || coalesce(r->'verses'->0->>'text','<null>');
  ASSERT r->>'attribution' IS NOT NULL, 'attribution must be returned';

  -- Cross-chapter range must span the boundary.
  r := public.prayer_reading_text('WEBCE', 'ACT',
        '[{"startChapter":7,"startVerse":59,"endChapter":8,"endVerse":1}]'::jsonb);
  ASSERT jsonb_array_length(r->'verses') >= 3, 'cross-chapter range too short';

  -- Unknown book returns empty, never null.
  r := public.prayer_reading_text('WEBCE', 'NOPE', '[]'::jsonb);
  ASSERT r->'verses' = '[]'::jsonb, 'unknown book should yield []';
END $$;
ROLLBACK;
```

- [ ] **Step 2: Run it and confirm it fails**

`psql "$PRAYER_DB_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/tests/prayer_reading_text_test.sql`
Expected: `function public.prayer_reading_text(...) does not exist`.

- [ ] **Step 3: Implement the migration**

`prayer_reading_text` joins `gw_bible_verses` → `gw_bible_books` → `gw_bible_translations`, expands `p_ranges` with `jsonb_to_recordset`, and selects verses where the `(chapter, verse)` tuple falls inside any range — using tuple comparison `(v.chapter, v.verse) BETWEEN (r.start_chapter, r.start_verse) AND (r.end_chapter, r.end_verse)` so cross-chapter ranges work. Returns `{ translation, attribution, verses: [{ chapter, verse, text }] }` ordered by chapter then verse. `SECURITY INVOKER`, `STABLE`, `GRANT EXECUTE TO authenticated`, and `NOTIFY pgrst, 'reload schema';`.

- [ ] **Step 4: Confirm green**

Re-run the migration and the test.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260805120000_prayer_reading_text.sql \
        supabase/migrations/tests/prayer_reading_text_test.sql
git commit -m "feat(prayer): reading-text RPCs resolving citations to WEBCE verses"
```

---

### Task 4: Replace the scrape in `usccb-readings`

**Files:**
- Modify: `supabase/functions/usccb-readings/index.ts`

**Interfaces:**
- Consumes: `prayer_day_full()` from Task 3.
- Produces: the **unchanged** response contract
  `{ date, sourceUrl, liturgicalTitle, readings: [{ heading, citation, summary, html }] }`.

- [ ] **Step 1: Pin the existing contract with a test first**

Before changing anything, add `supabase/functions/usccb-readings/contract.test.ts` asserting the exact response shape against a mocked Supabase client — field names, types, and that `readings` is an array of objects carrying all four keys. This is what proves deployed iOS clients keep working.

Run: `npx vitest run supabase/functions/usccb-readings/contract.test.ts`
Expected: PASS against the current implementation. **If it does not pass, the contract is not what we think it is — stop and re-read the function.**

- [ ] **Step 2: Rewrite the body to query the RPC**

Replace the `fetch(universalis…)` + HTML parse with a `supabase.rpc('prayer_day_full', { p_date, p_rite: 'roman_catholic', p_translation: 'WEBCE' })` call. Map each reading to a `ReadingBlock`:
- `heading` — humanised slot (`first_reading` → `First Reading`, `responsorial_psalm` → `Responsorial Psalm`, `gospel` → `Gospel`)
- `citation` — straight from the RPC
- `summary` — `null` (we no longer scrape a title line; do not fabricate one)
- `html` — verses rendered as `<p><sup>N</sup> text</p>`, **HTML-escaping the verse text**, plus a trailing attribution line from `gw_bible_translations.attribution`
- `sourceUrl` — our own app URL, not universalis.com
- `liturgicalTitle` — the highest-ranked event's `name`

Delete the scraping helpers (`parseUniversalisReadings` and friends). Leave a header comment explaining that the function name is retained only for backward compatibility.

- [ ] **Step 3: Re-run the contract test**

Run: `npx vitest run supabase/functions/usccb-readings/contract.test.ts`
Expected: PASS, unchanged. The point of this task is that the contract is identical while the source is not.

- [ ] **Step 4: Verify the psalm body is now populated**

The old implementation returned a citation-only Responsorial Psalm. Assert that for a known date the `responsorial_psalm` block's `html` contains actual verse text. This is the user-visible win: directors no longer paste psalm verses by hand.

- [ ] **Step 5: Full gates**

```bash
npx vitest run src/lib/prayer supabase/functions/usccb-readings
npm run typecheck:guard
npx eslint src/lib/prayer supabase/functions/usccb-readings
```

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/usccb-readings
git commit -m "feat(prayer): serve readings from local WEBCE instead of scraping Universalis"
```

---

## Definition of done

- [ ] `prayer_day_full(CURRENT_DATE, 'roman_catholic', 'WEBCE')` returns the day, its citations, **and** the verse text.
- [ ] ≥ 99% of the 1,165 imported citations parse; every failure is individually explained in the PR.
- [ ] `usccb-readings` performs **no outbound HTTP request**. Verify by inspection: no `fetch(` to any external host remains.
- [ ] Its response contract is byte-compatible with the previous shape, pinned by a test written *before* the rewrite.
- [ ] The Responsorial Psalm block contains verse text, not just a citation.
- [ ] `npm run typecheck:guard` reports no new errors; eslint clean.

## Explicitly out of scope for Phase 1

No Today screen, no Bible reader UI, no concordance UI, no intentions, no circles, no module registration or `useModuleAccess('prayer')` gating, no Strong's/TSK import. Those are Phase 2. This phase changes where existing screens get their data, and nothing else.

## Risks

1. **Deployed iOS clients.** The contract test is the guard. If it cannot be made to pass identically, stop and consult Kevin before shipping — a broken contract bricks the readings sheet on installed builds.
2. **Half-verse precision loss.** `9a` becomes all of verse 9. Acceptable and documented, but it must be visible in the UI attribution rather than silently wrong.
3. **WEBCE wording differs from the Lectionary.** WEBCE is a different translation from what is proclaimed at Mass. This is a deliberate, licence-driven trade-off already accepted in the proposal, but directors will notice. The attribution line must name the translation plainly.
4. **`scrape-usccb-readings` and `sync-usccb-liturgical` still exist** (326 and 420 lines). They are out of scope here; audit them in Phase 2 and remove them if nothing calls them.
