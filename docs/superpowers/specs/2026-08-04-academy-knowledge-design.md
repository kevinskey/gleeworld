# Academy Knowledge for the GleeWorld Assistant

Date: 2026-08-04
Status: Approved (design), not yet implemented
Branch: `feat/academy-knowledge`

## Problem

The GleeWorld Assistant (`supabase/functions/assistant-chat`) can drive the app —
navigate, query the calendar, search music, create courses — but it knows nothing
about choral conducting as a subject. Asked "what did conductors do before the
baton?" or "what is a hemiola?" or "what's a good SATB Renaissance piece for a
young choir?", it answers from whatever the base model happens to carry, with no
grounding and no consistency.

kevinphillipjohnson.com/academy hosts a substantial, authored reference library on
exactly these subjects: roughly 70,000 words across 17 pages plus a 183-piece
repertoire database. This spec gives the assistant retrieval access to that
library.

## Decisions

These were settled during brainstorming and are not open questions:

- **Retrieval, not fine-tuning.** Consistent with the original assistant design
  decision (system prompt + tool catalog, no model training).
- **Bundled corpus, not a database.** A generated JSON file ships inside the edge
  function and is searched in memory. Rejected alternatives: a Postgres table with
  `tsvector` full-text search (better ranking and no redeploy to update, but costs
  hand-applied DDL and RLS design on the self-hosted prod stack, where migration
  files are record-only); and pgvector embeddings (best fuzzy recall, but DeepSeek
  has no embeddings API, so it means a new provider, key, and recurring cost —
  overkill for a corpus this small and this well-titled).
- **All tenants, unattributed.** Every tenant's assistant can answer from the
  corpus, presented as platform reference knowledge rather than branded as KPJ
  Choral Academy. The assistant must not fabricate a source either — see
  "Attribution" below.
- **`merch.html` is excluded.** It is a product-and-price list, not reference
  knowledge, and stale prices recited unattributed across ~50 tenant
  organizations is a liability.

## Source inventory

The live site is authoritative. It is *newer* than the HTML files in `$HOME` on
Kevin's Mac (live `conductors.html` is 122 KB vs 118 KB local), and three pages
exist only under `/academy/` — the local copies are 8.7 KB stubs. Ingest reads
`https://kevinphillipjohnson.com/academy/*.html`, never the local files.

Pages fall into three extraction modes.

### Mode `data` — 12 pages

Content lives in a top-level `const` in a classic `<script>`, so it is reachable
from `page.evaluate(() => NAME)` in the same realm. This mode is mandatory, not a
convenience: `conductors-guide.html` renders **one chapter at a time** behind
`currentPage` and prev/next buttons, so DOM scraping would capture roughly 8% of
it.

| Page | Global(s) |
| --- | --- |
| `conductors-guide` | `CHAPTERS` |
| `conducting-history` | `CONDUCTING_ERAS` |
| `conductors` | `CATEGORIES`, `DATA`, `ENRICHMENTS` |
| `spirituals` | `SPIRITUAL_ERAS` |
| `history` | `CHORAL_ERAS` |
| `patterns` | `PATTERNS` |
| `terms` | `TERM_CATEGORIES` |
| `workbook` | `COURSE_OBJECTIVES`, `WEEKLY_SCHEDULE`, `GRADING_BREAKDOWN` |
| `works` | `CHORAL_WORKS` |
| `minor-works` | `MINOR_CHORAL_WORKS` |
| `mini-major-works` | `MINI_MAJOR_WORKS` |
| `performance-wear` | `CHAPTERS` |

`AUDIO_FILES` (conductors-guide) and `SP_AUDIO_FILES` (spirituals) are media
manifests, not prose — skipped.

### Mode `dom` — 4 pages

Content is in the markup as class-keyed blocks. Extraction uses `textContent`,
which matters on `education.html`: its accordions hide with CSS rather than
unmounting, so collapsed panels are still captured.

| Page | Block selector |
| --- | --- |
| `education` (82 KB, largest page) | `.info-card`, `.glos-item` |
| `church` | `.card` |
| `associations` | `.assoc-card` — 9 cards, 3 of which carry the extra `full` class; title from `.assoc-name` |
| `conventions` | `.conv-card` |

### Mode `api` — 1 source

`repertoire.html` contains no content; it fetches `/api/repertoire`, which returns
183 structured pieces (145 KB JSON) from the site's `repertoire.db`. Ingest calls
that endpoint directly.

The same page also proxies `/api/jwpepper-catalog` and `/api/carlfischer-catalog`.
Those are live vendor search proxies, not fixed content — excluded.

## Architecture

Four units, each independently testable:

```
scripts/ingest-academy.mjs          (Mac, manual)  → writes corpus.json
supabase/functions/_shared/academy/
    manifest.ts                     page list + mode + selectors/globals
    corpus.json                     generated; ~800-1100 chunks, ~600 KB
    search.ts                       pure scorer: (query, corpus) → ranked chunks
supabase/functions/assistant-chat/
    toolCatalog.ts                  + search_academy tool definition
    executors.ts                    + executor calling search.ts
    prompt.ts                       + ~6 lines of domain guidance
```

`search.ts` is pure and takes the corpus as an argument, so it unit-tests without
loading the real file. `manifest.ts` is the single place to edit when a page is
added or the site is restructured.

### Ingest

`node scripts/ingest-academy.mjs` (Playwright, already a repo dependency):

1. For each manifest entry, fetch the live URL. Non-200 is a hard failure — the
   script exits non-zero rather than silently emitting a smaller corpus.
2. `data` mode: `page.evaluate` the named global(s), assert the result is a
   non-empty array/object.
3. `dom` mode: `page.$$eval` the block selector, take `textContent`, collapse
   whitespace.
4. `api` mode: fetch the JSON endpoint.
5. Normalize each record into chunks, strip any residual HTML, and write
   `corpus.json` sorted by `id` for a stable, reviewable diff.

Ingest is deliberately manual. The corpus is a snapshot; it goes stale when the
site is edited and is refreshed by rerunning the script. That is the accepted
cost of Approach A.

### Chunk format

```ts
interface AcademyChunk {
  id: string;        // "conductors/nathaniel-dett" — stable, derived from page + slug
  page: string;      // "conductors"
  pageTitle: string; // "Conductors Directory"
  title: string;     // "Robert Nathaniel Dett"
  text: string;      // plain text, HTML stripped
  url: string;       // https://kevinphillipjohnson.com/academy/conductors.html
}
```

Granularity follows the shape of the data rather than a fixed word count:

- **One chunk per conductor bio.** Name-keyed lookup is what users actually ask
  for, and the bios are short (~60 words).
- **One chunk per era**, with `history` / `developments` / `techniques` /
  `notableConductors` folded in as labeled facets (~400 words). Splitting these
  would separate a technique from the era that explains it.
- **One chunk per term, per work, per repertoire piece, per association.**

### Retrieval

`search_academy(query: string)` — available to every role, no confirmation card
(it is a read-only lookup, like `search_music`).

Scoring in `search.ts`, on a lowercased tokenization with stopwords dropped:

- Term hit in `title` or `pageTitle` weighs ~3× a hit in `text`.
- Terms are weighted by inverse document frequency, so "hemiola" outranks
  "choir".
- Exact-phrase match on the full query adds a bonus.
- Return the top 6 chunks, hard-capped at ~2,500 tokens total, truncating the
  tail chunk if needed.

The cap matters: `MAX_TOOL_ITERATIONS` is 12 and the budget counts model
responses, so an unbounded tool result could starve a multi-step turn.

Empty result is a first-class outcome: the executor returns an explicit
"no matching passages" payload, and the prompt requires the assistant to say it
does not know rather than fall back to invention.

### Prompt integration

About six lines added to `buildSystemPrompt`, listing the covered domains —
conducting history and technique, beat patterns, spirituals, choral repertoire,
terminology, church music, choral education, concert attire — and one rule: call
`search_academy` before answering questions in those domains, answer only from the
returned passages, and say so when nothing relevant comes back.

### Attribution

Replies carry no "according to KPJ Choral Academy" framing, per the reach
decision. Two guardrails:

- Every chunk retains its `url` in the corpus and in the tool result, so any
  answer can be traced to its source page during debugging.
- The assistant must never attribute the material to a *different* source. It may
  answer plainly; it may not invent a citation.

## Testing

- **`search.ts` unit tests** (Deno): ranking order, title weighting, idf behavior,
  phrase bonus, stopword handling, empty-result path, token cap enforcement.
- **Corpus integrity test**: every chunk has a non-empty `title` and `text`, no
  residual HTML tags, word count within sane bounds, `id` values unique, every
  `page` present in the manifest.
- **Ingest golden-file test**: run the extractor against a checked-in fixture copy
  of `conductors-guide.html` and assert the chapter count and one known chapter's
  text. A site redesign then fails loudly instead of silently producing an empty
  corpus.
- **Post-deploy smoke test**: one live `assistant-chat` call with a real JWT
  asking a corpus-only question, confirming the tool fires and the answer is
  grounded.

## Deployment

1. `node scripts/ingest-academy.mjs` — regenerates `corpus.json`; the PR diff
   shows exactly what content changed.
2. `scripts/deploy-functions.sh` — required, not optional: the edge runtime caches
   ES modules, so the container must restart to pick up a new corpus.
3. No database change, no migration, no RLS work, no frontend deploy. The tool is
   server-side only; existing clients gain it without a new bundle.

## Out of scope

- The ElevenLabs live-voice agent is a separate brain with its own tool
  configuration. Giving it academy knowledge is a follow-up, not part of this
  work.
- Migrating to Postgres full-text search or embeddings. The chunk format and the
  ingest script are storage-agnostic, so that upgrade reuses this work if the
  corpus outgrows in-memory search.
- Automated re-ingest on site change.
