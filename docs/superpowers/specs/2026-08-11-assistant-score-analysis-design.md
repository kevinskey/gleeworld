# Assistant Score Analysis (OMR Bridge) — Design

**Date:** 2026-08-11
**Status:** Approved by Kevin (brainstorming session)
**Feature:** `get_score_analysis` assistant tool bridging assistant-chat to PartTrack's music21 analysis

## Problem

The assistant cannot answer musical questions about scores in the library — "what key is
Total Praise in", "how many measures", "what's the alto range". Its brain (DeepSeek) is
text-only and its library tools (`search_music`, `open_song`) touch metadata only. The
platform already parses scores optically and symbolically: the PartTrack worker loads every
processed score into music21 during `run_analyze` — then throws the musical facts away.

## Decisions (Kevin, 2026-08-11)

1. **Full musical facts** — key, meter(s), tempo, measure count, part list with vocal
   ranges, duration. Requires the worker to persist an analysis blob; a metadata-only read
   was rejected as not answering the actual questions.
2. **Honest miss, read-only** — a score that hasn't been through PartTrack gets "hasn't
   been analyzed yet" plus a pointer to the score's ⋯ → Part Tracks menu. The assistant
   gains no write path and cannot enqueue jobs. (Offer-to-queue and auto-queue rejected.)
3. **All members can ask** — matches the practice-player world where members already see
   parts and stems. RLS scopes everything.
4. **Caveat OMR only** — facts from `source_type = 'pdf_omr'` carry a beta caveat (once
   per thread); facts from real MusicXML/MIDI are stated plainly.
5. **Worker writes `analysis` jsonb** (vs. edge-fn on-demand parsing or storing on
   `gw_sheet_music`) — music21 already holds the parsed score at analyze time, so the
   facts are computed exactly once, nearly free.

## Architecture

```
PDF/XML/MIDI → PartTrack worker run_analyze (music21)
                 ├─ parts + warnings (existing)
                 └─ NEW: analysis jsonb → gw_parttrack_scores.analysis
                                              │
assistant-chat get_score_analysis (server tool, userClient/RLS read)
                                              │
                        facts + optical flag → prompt honesty rules → answer
```

### Data model

One new column, applied by hand to prod (record-only migration file, self-hosted DB has no
migration runner):

```sql
ALTER TABLE public.gw_parttrack_scores ADD COLUMN analysis jsonb;
```

`NULL` = not yet computed. Filled by the worker at the end of `run_analyze`, in the same
UPDATE that stores `validation_report`. No new job kind, no status change.

### `analysis` schema (v1, versioned)

```json
{
  "v": 1,
  "computed_at": "2026-08-11T22:00:00Z",
  "key": { "initial": "F major", "changes": 1 },
  "time_signatures": ["4/4", "3/4"],
  "tempo_bpm": 96,
  "measures": 84,
  "parts": [
    { "role": "soprano_1", "label": "Soprano", "range": { "low": "C4", "high": "G5" } }
  ]
}
```

- `tempo_bpm` = the score's MetronomeMark; `null` when unmarked (the existing `no_tempo`
  warning covers honesty). **`tempo_override_bpm` is NOT baked in** — the tool reads the
  row column and reports the override as the performance tempo when present ("marked
  ♩=96, your director set 88").
- `parts[].role/label` mirror the PartTrack part rows (post voice-split); ranges are
  spelled pitch names. Parts marked `include:false` in `gw_parttrack_parts` (e.g. an
  unreadable spoken-text staff) still appear in `analysis.parts` but the tool result marks
  them excluded so the assistant never describes a garbage staff as a real voice part.
- `source_type` and `validation_report` are NOT duplicated into analysis — they are
  columns on the same row; the tool assembles all three.

**Trust rule:** `source_type = 'pdf_omr'` → optical/beta facts; `musicxml`/`mxl`/`midi` →
exact. (`pdf_omr` added to the CHECK by migration `20260803090000_parttrack_pdf_omr.sql`.)

## Tool contract

New server tool in `supabase/functions/assistant-chat/toolCatalog.ts`,
`execution: 'server'` (read-only, so the 2026-08-05 same-side read/write rule is satisfied
trivially). No client half → **no frontend deploy**.

- **Name:** `get_score_analysis`
- **Input:** `score_id` (uuid). Description instructs: get it from `search_music` first,
  never guess ids (same contract as `open_song`).
- **Handler:** one `userClient` query — `gw_parttrack_scores` filtered
  `sheet_music_id = score_id`, selecting `analysis, source_type, status,
  validation_report, tempo_override_bpm, manifest->duration_ms`, joined with the
  `gw_parttrack_parts` rows (`role, label, confidence, include, confirmed`). RLS plus the
  forwarded `x-tenant-slug` (PR #599) scope it to the operating tenant — the tool inherits
  the assistant's blindness rules for free.

### Result shapes (all honest, none fabricated)

| State | Tool returns |
|---|---|
| No PartTrack row, or `analysis` IS NULL | `{ analyzed: false, hint }` — assistant says the score hasn't been analyzed and points to ⋯ → Part Tracks (admins run it; members are told to ask their director). |
| Analyzed, `source_type = 'pdf_omr'` | Facts + `optical: true` — answer with the beta caveat. |
| Analyzed from MusicXML/MIDI | Facts + `optical: false` — stated plainly. |
| Row exists, status `failed` | Honest failure with `error_message` context; no facts. |

## Prompt + guard changes (`prompt.ts`)

Applying the 2026-08-06 lesson — prescribe sentences; enforce hard rules in code:

- **Prescribed caveat** for optical scores, first mention per thread only (thread history
  is in context so the model can see whether it already said it): "I read this optically
  from the PDF, so double-check anything critical against the printed score."
- **Never-from-memory rule** (mirrors `lookup_hymn`): key/meter/measure/range facts come
  only from this tool, never from model memory.
- **Source-leak guard untouched:** no new corpus name is introduced. "Part Tracks" is a
  user-facing feature name and does not match `sourceLeak.ts`'s "`<word>` library"
  pattern; a test proves a typical analysis answer passes the guard.
- **Voice turns:** the ≤4-sentence voice rule already applies. `sanitizeForSpeech` must
  leave or respell pitch names correctly ("C4" → "C four"); verify and add a respelling if
  the current chord-symbol handling mangles them.

## Backfill (existing scores)

Tracked script `worker/parttrack-renderer/backfill_analysis.py`: for rows where `analysis IS NULL`, download normalized_mxl_path when set (pdf_omr) or source_path otherwise — only pdf_omr rows ever have a normalized_mxl_path, run the same extraction used by `run_analyze` (one shared function `extract_analysis(score)` in `analyze.py`), and UPDATE **only the `analysis` column**. Parts, status, and confirmations untouched — re-running full analyze resets confirmed scores to `awaiting_confirmation` (the Hip Hop Mass trap). Handful of rows today; runs once on the droplet under the worker env. Kevin runs it (harness blocks prod writes).

## Deploy order (matters)

1. Migration: `ALTER TABLE gw_parttrack_scores ADD COLUMN analysis jsonb;` — Kevin via
   psql as `supabase_admin`.
2. Worker: `scripts/deploy-parttrack-worker.sh` — after the migration (the new UPDATE
   references the column; same lesson as tempo-override).
3. Backfill script, once.
4. Edge fn: `bash scripts/deploy-functions.sh assistant-chat`.
5. No frontend deploy.

## Testing

- **Worker pytest** (`worker/parttrack-renderer/tests`): `extract_analysis` against a
  fixture .mxl asserting key/meters/measures/ranges; `run_analyze` stores `analysis` in
  the same update as warnings.
- **Edge-fn server-tools test:** unanalyzed → `{analyzed:false}`; `pdf_omr` →
  `optical:true`; `failed` → honest failure; tool-inventory assertion updated.
- **Guard tests:** typical analysis reply passes `sourceLeak.ts`; `sanitizeForSpeech`
  handles pitch names on voice turns.
- **Live verification** (demo-recipe POST to assistant-chat): honest miss on an
  unanalyzed score; real key/range answer on a backfilled one; caveat appears once per
  thread on a `pdf_omr` score.

## Coordination

`fix/parttrack-musicxml-sanitize` (worktree, commit a578fd150) also edits `analyze.py` and
is now merged as PR #623 (`edf294390`) — this work builds on top of it; the extraction
function is additive. Any worker deploy carries both changes knowingly.

## Out of scope

- Triggering OMR/analysis from the assistant (any write path).
- Vision-model analysis of raw PDFs (option 2 from the original discussion).
- Storing analysis on `gw_sheet_music` for non-PartTrack scores.
- Difficulty/prose summaries computed by the worker.
