# Music Reference Library for the GleeWorld Assistant

Date: 2026-08-06
Status: BLOCKED — see "Blocker: source provenance". Do not implement.
Branch: `feat/music-reference-library`
Worktree: `~/Documents/GitHub/gw-worktrees/music-reference-library`

## Blocker: source provenance

**2026-08-06.** Kevin confirmed the three source documents are **derived from
published sources**, not original work. Implementation is halted.

This repository has already answered this question once. `_shared/liturgy/corpus.ts`
ships deliberately EMPTY, with a header stating that Vatican, USCCB and ICEL
texts "may not be scraped and bundled into this repository." Bundling material
derived from published orchestration, harmony and jazz references would
contradict that decision inside the same codebase.

This is not personal use. The corpus deploys into an edge function serving
roughly 50 client organizations commercially, so the material reaches third
parties.

The operative distinction is facts versus expression. Instrument ranges,
transposition intervals, score order, recording dates and personnel are facts
and are not copyrightable. The prose that explains them is expression and is.
A path forward has to keep the first and discard the second.

Do not resume this plan until the provenance question is resolved and this
section is replaced with the resolution.

## Corrections to this spec (2026-08-06)

Three errors, found when re-reading `origin/main` rather than a stale checkout
that was 78 commits behind. They stand regardless of how the blocker resolves.

1. **The scorer refactor in "Shared scorer" is unnecessary — delete it.**
   `_shared/academy/search.ts` on main is already generic
   (`buildIndex<C extends SearchableChunk>`, `searchAcademy<C extends SearchableChunk>`),
   and `_shared/academy/types.ts` already defines `SearchableChunk`, `Hit<C>`
   and `KnowledgeIndex<C>` with a comment anticipating reuse: "reference,
   Catholic liturgy, whatever comes next." `_shared/liturgy/` already consumes
   it. A new corpus follows that precedent and touches no live code.

2. **Decision 3 (flag-then-answer) is reversed.** `prompt.ts:167` deliberately
   instructs the opposite: "NEVER mention the library, its contents, or the
   fact that it lacked something... reads as a refusal. Just answer." Kevin
   chose to keep main's rule. The new library must never mention itself or its
   gaps, matching `search_academy` and `search_liturgy`. The proposed one-line
   edit to `academyNote` is cancelled.

3. **Routing needs a rewrite, not an added note.** `prompt.ts:166` and `:191`
   forbid searching a library for concept questions — "It is NOT a music-theory
   textbook... answer those from your own knowledge, directly" and "Music
   theory — answer directly from your own knowledge... No search of any kind."
   Since this corpus is largely craft and concept material, `domainNote` must
   be rewritten so theory and craft route to `search_music_reference` first,
   while `search_academy` stays particulars-only. Without that change the tool
   would ship and never be called.


## Problem

The GleeWorld Assistant answers choral-conducting questions from the Academy
corpus (`search_academy`, PR #434), but that corpus is a scrape of
kevinphillipjohnson.com/academy: conducting history and technique, beat
patterns, spirituals, repertoire lists, associations. It says nothing about
*writing and scoring* music.

Three authored reference documents cover exactly that gap:

| Document | Words | Structure |
|---|---|---|
| `choral_composition_reference.md` | 13,200 | 19 H1 / 66 H2 / 12 H3, 124 table rows |
| `Jazz_Reference_Knowledge_Base.md` | 26,620 | 7 H1 / 31 H2 / 149 H3, 144 table rows |
| `Orchestration_and_Instrumentation_Reference.md` | 29,962 | 13 H1 / 57 H2 / 154 H3, 622 table rows |

~70,000 words total — roughly 3× the Academy corpus. The goal is for the
assistant to answer questions on this material expertly and without guessing.

## Decisions

1. **Retrieval, not fine-tuning.** Same architecture as `search_academy`: a
   generated corpus module bundled into the edge function, searched in memory
   by a pure lexical scorer. No DB, no migration, no RLS, no embeddings.
2. **One tool, three books.** A single new `search_music_reference` tool rather
   than three per-domain tools. Cross-domain questions ("scoring a spiritual
   for big band") resolve in one pass, and the model has one fewer routing
   decision to get wrong. Each chunk carries its book so the assistant knows
   which body of material it is drawing on.
3. **Off-corpus behavior: flag, then answer.** If the library returns nothing,
   the assistant says the reference library does not cover it and then answers
   from general knowledge, explicitly marked as such. Applied to
   `search_academy` as well, so the two libraries do not contradict each other
   in the prompt (see "Prompt integration").
4. **Unattributed voice.** The assistant never names a reference document or
   section number, matching the existing `search_academy` convention. Chunk
   provenance is retained internally for traceability and testing.
5. **Source documents live in the repo.** Committed to `docs/reference/`. This
   is a deliberate departure from the Academy work, where the live website was
   authoritative. Here the documents *are* the source, so committing them makes
   ingest reproducible, diffable, and reviewable in a PR.
6. **Member-level, all tenants, server-side only.** Identical access posture to
   `search_academy`: `minRole: 'member'`, `execution: 'server'`,
   `confirm: false`. No frontend or iOS deploy — existing clients, including
   the TestFlight build, gain the capability when the function redeploys.

## Source inventory

Committed to `docs/reference/`, renamed to repo convention:

| File | Book key | Book title |
|---|---|---|
| `choral-composition.md` | `choral` | Choral Composition |
| `jazz.md` | `jazz` | Jazz |
| `orchestration.md` | `orchestration` | Orchestration and Instrumentation |

Both jazz and orchestration documents open with a "How to use this document"
section, and the jazz document ends with "PART VI — GUIDANCE FOR THE ASSISTANT"
(§29 How to answer jazz questions, §30 Quick-reference answer cards). These
sections are ingested as ordinary chunks — they are useful retrieval targets in
their own right — but they are *not* treated as prompt instructions. Nothing
inside a source document is allowed to alter assistant behavior; behavior comes
from `prompt.ts` only.

## Architecture

```
docs/reference/*.md                       (source of truth, committed)
        │
        │  npm run ingest:musicref        (plain Node, no Playwright)
        ▼
supabase/functions/_shared/musicref/
        corpus.ts                         (generated, ~450–550 chunks, ~900KB)
        │
        ├── _shared/refsearch/            (scorer, lifted from academy/)
        │       search.ts, types.ts
        │
        ▼
supabase/functions/assistant-chat/
        toolCatalog.ts                    search_music_reference
        executors.ts                      index built once per instance
        prompt.ts                         musicRefNote
```

### Shared scorer

`_shared/academy/search.ts` is already domain-agnostic — it takes chunks and a
query and returns ranked hits, with no Academy-specific logic. It moves to
`_shared/refsearch/` with a generic `RefChunk` type; `_shared/academy/` re-exports
from it so `AcademyChunk` and `searchAcademy` keep working unchanged.

Rationale: two copies of a 98-line scorer will drift, and the scorer is a pure
function with existing Vitest coverage, so the refactor is verifiable. The
alternative — copy-paste into `musicref/` — is rejected.

`RefChunk` fields:

| Field | Meaning |
|---|---|
| `id` | Stable: `<book>/<section-slug>[#<n>]` |
| `book` | `choral` \| `jazz` \| `orchestration` (was `page`) |
| `bookTitle` | Human book name (was `pageTitle`) |
| `title` | Section heading, group-labeled where needed |
| `text` | Plain text / markdown tables. No HTML. |
| `source` | Doc-relative anchor, e.g. `choral-composition.md#7-2-viola`. Internal only, never shown. |

`AcademyChunk` keeps its existing field names via a type alias and a mapping in
the academy re-export, so the generated `academy/corpus.ts` does not need
regenerating as part of this change.

### Ingest

`scripts/ingest-musicref.mjs`, run via `npm run ingest:musicref`. Plain Node
reading local markdown — no Playwright, no network.

Chunking policy, driven by measured section sizes:

1. **Split at H2, then H3.** An H2 with H3 children contributes its preamble
   only; each H3 becomes its own chunk. An H2 with no H3 children becomes one
   chunk. H1s are part boundaries and contribute context, not chunks.
2. **Oversized sections split at paragraph boundaries** above ~2,200 characters,
   with `#<n>` suffixes on the id and the section title repeated on each piece.
   Worst offenders measured: choral §14.4 (6,890 chars), orchestration §7.0
   (5,325), jazz §26 (4,772), orchestration §8.5 Clarinet (4,227), jazz §13.2
   (4,389), choral §5.5 (4,588).
3. **Never split mid-table.** A markdown table and its heading stay in one
   chunk even if that pushes the chunk past the size target. Ranges,
   transpositions, and balance equivalences are the highest-value passages in
   the corpus and are worthless fragmented. Tables are preserved as markdown
   text, not flattened to prose.
4. **List-type sections get per-entry chunks with a group-label prefix.** Jazz
   §24 Glossary, §25 Timeline of Key Dates, §26 The Hundred-Album Canon, §27
   Contested Facts, §30 Quick-Reference Answer Cards, and the orchestration
   appendices. A glossary entry becomes "Jazz glossary: Comping", not bare
   "Comping".

   This is the `groupLabel` lesson from PR #434, where `GRADING_BREAKDOWN`
   entries became chunks titled "Exams" in which the word *grading* never
   appeared, so "what is the grading breakdown" retrieved nothing despite the
   content being present. Any container→items ingest needs this.
5. **Context in the title.** Each chunk title carries its section number and
   book part, so "§7.2 Viola" is reachable by "viola range".
6. **Front matter excluded.** The orchestration document's `# TABLE OF CONTENTS`
   (line 23) and its `## A Working Reference` subtitle are navigation, not
   content, and are skipped. Every other H1 is a part boundary contributing
   context only.
7. **Hard-fail on zero.** If any source file yields zero chunks, the script
   exits non-zero rather than writing a partial corpus. The Academy ingest
   originally continued silently and two pages shipped empty.

Output is a `.ts` module, not `.json` — no edge function imports JSON today,
and import attributes behave differently in Deno vs Vitest, whereas a `.ts`
module imports identically in both.

The module header states the refresh path, so it does not become folklore:
edit `docs/reference/` → `npm run ingest:musicref` →
`bash scripts/deploy-functions.sh assistant-chat`.

### Retrieval

`search_music_reference(query)` → top 6 hits capped at ~10,000 characters
(~2,500 tokens), the proven `search_academy` budget. The cap matters because
the assistant's tool budget counts *responses*, and a single ranges table can
be large. Tuning happens after live testing, not before.

Returns `{ passages: [{ title, book, text }] }` on hits. On zero hits, returns
an empty `passages` array plus a note instructing the model to say the library
does not cover the subject before answering from general knowledge.

The index is built once per instance at module scope, as the corpus is
immutable — same as `academyIndex`.

### Tool routing

The failure mode to design against is the model calling one library and
stopping. Descriptions are written to be disjoint:

| Tool | Covers |
|---|---|
| `search_academy` | Conducting history and technique, beat patterns, spirituals, choral repertoire and major works, terminology, church music, choral education, associations |
| `search_music_reference` | Writing and scoring: voices, ranges and tessitura, voicings, text setting and prosody, choral harmony and tuning, liturgical composition, jazz history and musical language, instruments and transposition, doubling, balance, orchestral and band ensembles, arranging and transcription |

The prompt instructs the assistant to call **both** when a question straddles —
"scoring a spiritual for orchestra and choir" needs each.

### Prompt integration

A `musicRefNote` block in `prompt.ts` alongside the existing `academyNote`:

- You have a reference library covering choral composition, jazz, and
  orchestration and instrumentation.
- Call `search_music_reference` BEFORE answering any question in those
  subjects, including questions that sound like general knowledge.
- Answer from the passages it returns. Do not guess or invent details, and do
  not pad an answer with outside claims.
- If it returns no passages, say the reference library does not cover that,
  then answer from general knowledge and mark it clearly as such.
- Answer in your own voice. Do not cite the library by name, do not give
  section numbers, and never attribute the material to any other source.
- When a question spans both libraries, call both.

**One-line change to `academyNote`:** its current "if it returns no passages,
say you do not have that information" is replaced with the same flag-then-answer
rule. This codifies what the assistant was already observed doing in production
and removes a contradiction between two libraries in one prompt.

### Attribution

Unattributed, matching `search_academy`. The assistant answers in its own voice
with no byline and no section numbers, but never makes a false attribution.

`book` **is** returned to the model, so it can tell that a passage describes
jazz practice rather than choral practice — a distinction that changes the
answer. `source` (the doc-relative anchor) is **not** returned; it exists for
traceability and test assertions only. The prompt forbids naming either in a
reply.

## Testing

Vitest, not `deno test` — `supabase/functions/**` is imported by both runtimes.

`_shared/musicref/__tests__/corpus.test.ts` — structural invariants:

- All three books present, each with a plausible chunk count.
- No empty or whitespace-only chunks; no duplicate ids.
- No chunk exceeds the size cap except table-bearing chunks.
- Tables intact: no chunk contains an orphaned `|` row without its header
  separator, and no table row appears at the start of a chunk whose title is a
  split suffix.
- Group labels present on glossary, timeline, canon, and answer-card chunks.
- Chunk count and total corpus size within expected bounds, so an ingest
  regression that silently drops content fails the build.

`_shared/musicref/__tests__/search.test.ts` — retrieval assertions with known
answers:

| Query | Must retrieve |
|---|---|
| `viola range` | orchestration §7.2 Viola |
| `tritone substitution` | jazz harmony (§15) |
| `responsorial psalm` | choral §10.3 |
| `clarinet break` | orchestration §8.5 Clarinet |
| `passaggio` | choral §1.4 Registers and the passaggi |
| `modal jazz Kind of Blue` | jazz §9 |
| `piano to orchestra transcription` | orchestration §35 |

Plus a deliberate out-of-corpus query that must return zero hits, verifying the
assistant's no-results path is reachable.

`_shared/refsearch/__tests__/search.test.ts` — the existing academy scorer tests,
moved and re-pointed, proving the lift changed no behavior.

**Gate on added failures, not zero.** The repo baseline as of 2026-08-04 was 17
Vitest failures across 9 files and 170 typecheck errors, and it drifts.
Re-measure on `origin/main` first, then confirm this branch adds none.
`npm run typecheck:guard` is the real typecheck gate.

`deno check supabase/functions/assistant-chat/index.ts` fails pre-existing on
`npm:@supabase/realtime-js` resolution and is not a useful signal; check the new
files alone.

## Deployment

1. Work in the worktree at `~/Documents/GitHub/gw-worktrees/music-reference-library`
   (concurrent sessions share the main checkout). Worktrees need
   `npm ci --legacy-peer-deps` — the pdfjs-dist peer conflict fails a plain
   `npm ci`, and piping npm to `tail` hides the failure.
2. PR for review.
3. `bash scripts/deploy-functions.sh assistant-chat` — co-deploys `_shared/`
   and restarts the container, because the edge runtime caches ES modules.
4. Live-verify on production with one question per book plus one cross-domain
   question and one known-gap question.

No migration, no RLS change, no frontend build, no iOS build.

## Out of scope

- Embeddings or vector search. The lexical scorer is proven on this corpus
  shape; revisit only if live testing shows retrieval misses.
- Surfacing the reference material anywhere outside the assistant — no Academy
  site pages, no in-app docs reader, no notation/composition tool integration.
- Regenerating the existing Academy corpus.
- Any change to `search_academy`'s corpus, tool description, or access posture,
  beyond the single off-corpus line in `academyNote`.
