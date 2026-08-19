# Assistant Score Analysis (OMR Bridge) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the assistant answer musical questions about library scores ("what key is X in", "what's the alto range") by persisting the PartTrack worker's music21 analysis and reading it through a new `get_score_analysis` server tool.

**Architecture:** The worker's `run_analyze` gains an `extract_analysis(score, cands)` step that stores a versioned facts blob in a new `gw_parttrack_scores.analysis` jsonb column. A read-only server tool in assistant-chat assembles that blob with the parts rows, tempo override, and warnings, with honest misses for unanalyzed scores and an optical-beta flag for `pdf_omr` sources. A one-off backfill script fills the column for existing rows without touching parts/status.

**Tech Stack:** Python 3 + music21 (worker, pytest), Deno/TypeScript edge function (vitest), PostgreSQL/Supabase RLS. Spec: `docs/superpowers/specs/2026-08-11-assistant-score-analysis-design.md`.

## Global Constraints

- Tenant-neutral, user-facing copy says **"students"**, never "singers"/"members"; no hardcoded choir names.
- **No frontend deploy** — the tool is `execution: 'server'` with no client half.
- Migration file is **record-only**; the self-hosted DB has no migration runner. Kevin applies DDL by hand as `supabase_admin`.
- Deploy order (Kevin, after merge): 1 migration → 2 `scripts/deploy-parttrack-worker.sh` → 3 backfill script once → 4 `bash scripts/deploy-functions.sh assistant-chat`.
- Backfill and worker changes must NEVER modify `gw_parttrack_parts`, `status`, or confirmations outside `run_analyze`'s existing flow (re-analysis resets confirmed scores — the Hip Hop Mass trap).
- Prompt honesty: prescribe exact sentences for the model to say; never rely on prohibition-only prompt rules (2026-08-06 lesson).
- Worktree: this repo checkout is `~/Documents/GitHub/gleeworld-wt-score-analysis` on branch `docs/assistant-score-analysis-spec` — rename/continue on branch `feat/assistant-score-analysis` (Task 1 Step 1). Vitest in a fresh worktree needs `npm ci --legacy-peer-deps` first (pdfjs peer conflict; do NOT pipe to tail — it hides failures).
- Worker tests: `cd worker/parttrack-renderer && python3 -m pytest tests/ -q`. If music21 isn't installed: `python3 -m venv .venv && .venv/bin/pip install -r requirements.txt` and use `.venv/bin/python -m pytest`.

---

### Task 1: Worker `extract_analysis` (pure function, TDD)

**Files:**
- Modify: `worker/parttrack-renderer/analyze.py` (add imports + functions at bottom)
- Test: `worker/parttrack-renderer/tests/test_analysis.py` (new)

**Interfaces:**
- Consumes: `classify.inventory_parts(score) -> list[PartCandidate]` (fields: `source_part_index: int, source_staff: int|None, source_voice: int|None, role: str, label: str, confidence: float`); test fixtures `fixtures.satb_piano()`, `fixtures.condensed_satb()`, `fixtures.no_tempo()`.
- Produces: `extract_analysis(score, cands) -> dict` — the v1 analysis blob. Keys: `v:int, computed_at:str, key:{initial:str|None, changes:int}, time_signatures:list[str], tempo_bpm:int|None, measures:int, parts:list[{source_part_index, source_staff, source_voice, role, label, range:{low,high}|None}]`. Tasks 2, 3, and 5 rely on exactly these names.

- [ ] **Step 1: Create the working branch**

```bash
cd ~/Documents/GitHub/gleeworld-wt-score-analysis
git checkout -b feat/assistant-score-analysis
```

- [ ] **Step 2: Write the failing tests**

Create `worker/parttrack-renderer/tests/test_analysis.py`:

```python
from classify import inventory_parts
from fixtures import condensed_satb, no_tempo, satb_piano
from analyze import extract_analysis


def _analysis(score):
    return extract_analysis(score, inventory_parts(score))


def test_satb_piano_facts():
    a = _analysis(satb_piano())
    assert a["v"] == 1
    assert a["computed_at"]  # ISO timestamp, non-empty
    assert a["tempo_bpm"] == 96
    assert a["measures"] == 8
    assert a["time_signatures"] == ["4/4"]
    # Krumhansl on a C-major-ish scale fixture: mode+tonic both present.
    assert a["key"]["initial"] is not None
    assert " " in a["key"]["initial"]          # "C major"-shaped
    assert a["key"]["changes"] == 0


def test_satb_piano_part_ranges():
    a = _analysis(satb_piano())
    by_label = {p["label"]: p for p in a["parts"]}
    assert by_label["Soprano"]["range"] == {"low": "C5", "high": "F5"}
    assert by_label["Bass"]["range"] == {"low": "C3", "high": "F3"}
    assert by_label["Soprano"]["role"] == "soprano"
    # Every part row carries the join keys Task 5 matches on.
    for p in a["parts"]:
        assert set(p) >= {"source_part_index", "source_staff", "source_voice",
                          "role", "label", "range"}


def test_voice_split_ranges_differ():
    # condensed_satb: 2 staves x 2 voices; each split voice gets its OWN range.
    a = _analysis(condensed_satb())
    split = [p for p in a["parts"] if p["source_voice"] is not None]
    assert len(split) == 4
    treble = {p["source_voice"]: p["range"] for p in split if p["source_part_index"] == 0}
    assert treble[1] == {"low": "C5", "high": "F5"}
    assert treble[2] == {"low": "E4", "high": "A4"}


def test_no_tempo_is_null_not_default():
    assert _analysis(no_tempo())["tempo_bpm"] is None
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd worker/parttrack-renderer && python3 -m pytest tests/test_analysis.py -q`
Expected: FAIL — `ImportError: cannot import name 'extract_analysis' from 'analyze'`

- [ ] **Step 4: Implement `extract_analysis` in `analyze.py`**

Add to the imports at the top of `worker/parttrack-renderer/analyze.py`:

```python
from datetime import datetime, timezone

from music21 import converter, key as m21key, meter as m21meter, tempo as m21tempo
```

(Replace the existing `from music21 import converter` line with the one above.)

Append at the bottom of `analyze.py`:

```python
# ---- Musical-facts extraction (assistant get_score_analysis bridge). ----
# Spec: docs/superpowers/specs/2026-08-11-assistant-score-analysis-design.md

def _candidate_notes(score, cand):
    """Mirror classify._voice_split_candidates' note selection so ranges
    line up 1:1 with the inventoried parts."""
    part = score.parts[cand.source_part_index]
    if cand.source_voice is None:
        return list(part.recurse().notes)
    voice_ids = []
    for m in part.getElementsByClass("Measure"):
        for v in m.voices:
            if v.id not in voice_ids:
                voice_ids.append(v.id)
    ordered = sorted(voice_ids, key=str)
    if cand.source_voice > len(ordered):
        return []
    vid = ordered[cand.source_voice - 1]
    return [n for m in part.getElementsByClass("Measure")
            for v in m.voices if str(v.id) == str(vid)
            for n in v.notes]


def _pitch_range(notes):
    pitches = [p for n in notes for p in getattr(n, "pitches", [])]
    if not pitches:
        return None
    lo = min(pitches, key=lambda p: p.midi)
    hi = max(pitches, key=lambda p: p.midi)
    # music21 spells flats as "B-4"; humans read "Bb4".
    return {"low": lo.nameWithOctave.replace("-", "b"),
            "high": hi.nameWithOctave.replace("-", "b")}


def _key_facts(score):
    try:
        k = score.analyze("key")
        initial = f"{k.tonic.name.replace('-', 'b')} {k.mode}"
    except Exception:
        initial = None
    sigs = []
    parts = list(score.parts)
    src = parts[0] if parts else score
    for ks in src.recurse().getElementsByClass(m21key.KeySignature):
        if not sigs or sigs[-1] != ks.sharps:
            sigs.append(ks.sharps)
    return {"initial": initial, "changes": max(0, len(sigs) - 1)}


def _time_signatures(score):
    out = []
    parts = list(score.parts)
    src = parts[0] if parts else score
    for ts in src.recurse().getElementsByClass(m21meter.TimeSignature):
        if not out or out[-1] != ts.ratioString:
            out.append(ts.ratioString)
    return out


def _tempo_bpm(score):
    for mm in score.recurse().getElementsByClass(m21tempo.MetronomeMark):
        bpm = mm.getQuarterBPM()
        if bpm:
            return round(bpm)
    return None


def extract_analysis(score, cands):
    """Versioned musical-facts blob for gw_parttrack_scores.analysis (v1)."""
    return {
        "v": 1,
        "computed_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "key": _key_facts(score),
        "time_signatures": _time_signatures(score),
        "tempo_bpm": _tempo_bpm(score),
        "measures": max((len(p.getElementsByClass("Measure")) for p in score.parts),
                        default=0),
        "parts": [
            {"source_part_index": c.source_part_index,
             "source_staff": c.source_staff,
             "source_voice": c.source_voice,
             "role": c.role,
             "label": c.label,
             "range": _pitch_range(_candidate_notes(score, c))}
            for c in cands
        ],
    }
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd worker/parttrack-renderer && python3 -m pytest tests/test_analysis.py -q`
Expected: 4 passed. If `test_satb_piano_part_ranges` fails on exact pitches, print the actual ranges — the fixture's `_measures` cycles `pitches[(i + beat) % len(pitches)]`, which covers all 4 listed pitches, so min/max are the first/last of each fixture list.

- [ ] **Step 6: Run the whole worker suite (no regressions)**

Run: `cd worker/parttrack-renderer && python3 -m pytest tests/ -q`
Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add worker/parttrack-renderer/analyze.py worker/parttrack-renderer/tests/test_analysis.py
git commit -m "feat(parttrack): extract musical-facts analysis blob from analyzed scores"
```

---

### Task 2: Store `analysis` in `run_analyze` + record-only migration

**Files:**
- Modify: `worker/parttrack-renderer/analyze.py:85-99` (the final UPDATE in `run_analyze`)
- Create: `supabase/migrations/20260811300000_parttrack_analysis_column.sql`

**Interfaces:**
- Consumes: `extract_analysis(score, cands)` from Task 1.
- Produces: `gw_parttrack_scores.analysis jsonb` populated on every future analyze run. Task 5 reads it.

- [ ] **Step 1: Write the migration file (record-only)**

Create `supabase/migrations/20260811300000_parttrack_analysis_column.sql`:

```sql
-- Musical-facts blob computed by the PartTrack worker at analyze time,
-- read by the assistant's get_score_analysis tool. NULL = not yet computed.
-- Spec: docs/superpowers/specs/2026-08-11-assistant-score-analysis-design.md
-- Self-hosted prod has no migration runner: Kevin applies this by hand as
-- supabase_admin BEFORE the worker deploy (the analyze UPDATE references it).
ALTER TABLE public.gw_parttrack_scores ADD COLUMN IF NOT EXISTS analysis jsonb;
```

- [ ] **Step 2: Wire `extract_analysis` into `run_analyze`**

In `run_analyze` (analyze.py), after `warnings = validate_score(score)` and the two warning appends, before the `with conn.cursor() as cur:` block, add:

```python
    analysis = extract_analysis(score, cands)
```

Then change the final UPDATE from:

```python
        cur.execute("""
            UPDATE gw_parttrack_scores
            SET validation_report = %s, status = 'awaiting_confirmation', error_message = NULL
            WHERE id = %s
        """, (json.dumps(warnings), job["score_id"]))
```

to:

```python
        cur.execute("""
            UPDATE gw_parttrack_scores
            SET validation_report = %s, analysis = %s,
                status = 'awaiting_confirmation', error_message = NULL
            WHERE id = %s
        """, (json.dumps(warnings), json.dumps(analysis), job["score_id"]))
```

- [ ] **Step 3: Run the worker suite**

Run: `cd worker/parttrack-renderer && python3 -m pytest tests/ -q`
Expected: all pass (`run_analyze` has no direct test — the change is two lines over the Task 1-tested function; reviewer verifies the UPDATE column list matches the migration).

- [ ] **Step 4: Commit**

```bash
git add worker/parttrack-renderer/analyze.py supabase/migrations/20260811300000_parttrack_analysis_column.sql
git commit -m "feat(parttrack): persist analysis blob at analyze time + analysis column migration"
```

---

### Task 3: Backfill script for existing scores

**Files:**
- Create: `worker/parttrack-renderer/backfill_analysis.py`
- Modify: `docs/superpowers/specs/2026-08-11-assistant-score-analysis-design.md` (Backfill section, one sentence)

**Interfaces:**
- Consumes: `extract_analysis` (Task 1), `inventory_parts`, `config.load()`, `storage.download(settings, bucket, path, dest)`, `psycopg.connect(settings.database_url)` (same idiom as `main.py:27`).
- Produces: one-off droplet script; UPDATEs ONLY the `analysis` column.

- [ ] **Step 1: Amend the spec's backfill source (self-review catch)**

The spec says backfill reads `normalized_mxl_path` — but only `pdf_omr` scores have one (`_load_score` normalizes nothing else). XML/MIDI-sourced rows must fall back to `source_path`. In the spec's **Backfill** section, replace the first sentence's condition:

- from: `for rows where analysis IS NULL AND normalized_mxl_path IS NOT NULL, download the .mxl`
- to: `for rows where analysis IS NULL, download normalized_mxl_path when set (pdf_omr) or source_path otherwise — only pdf_omr rows ever have a normalized_mxl_path`

- [ ] **Step 2: Write the script**

Create `worker/parttrack-renderer/backfill_analysis.py`:

```python
#!/usr/bin/env python3
"""One-off backfill: fill gw_parttrack_scores.analysis for rows analyzed
before the column existed.

Touches ONLY the analysis column — parts, status, and confirmations are
never modified (re-running a full analyze would reset confirmed scores).

Run on the droplet under the worker env (needs music21 + storage creds):
    sudo -u parttrack env $(cat /etc/gleeworld-parttrack-worker.env | xargs) \
        /opt/gleeworld-parttrack/venv/bin/python backfill_analysis.py --dry-run
Drop --dry-run to write.
"""
import json
import sys
import tempfile
from pathlib import Path

import psycopg
from music21 import converter

import config
import storage
from analyze import extract_analysis
from classify import inventory_parts

EXT = {"musicxml": ".musicxml", "mxl": ".mxl", "midi": ".mid", "pdf_omr": ".mxl"}


def main() -> int:
    dry = "--dry-run" in sys.argv
    settings = config.load()
    with psycopg.connect(settings.database_url) as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT id, source_type, source_path, normalized_mxl_path
                FROM gw_parttrack_scores
                WHERE analysis IS NULL
                ORDER BY created_at
            """)
            rows = cur.fetchall()
        print(f"{len(rows)} score(s) to backfill{' (dry run)' if dry else ''}")
        failures = 0
        for score_id, source_type, source_path, normalized_mxl_path in rows:
            path = normalized_mxl_path or source_path
            if source_type == "pdf_omr" and not normalized_mxl_path:
                print(f"  {score_id}: SKIP — pdf_omr without normalized mxl (never analyzed)")
                continue
            try:
                tmp = Path(tempfile.mkdtemp()) / f"score{EXT[source_type]}"
                storage.download(settings, "parttrack", path, tmp)
                score = converter.parse(str(tmp))
                analysis = extract_analysis(score, inventory_parts(score))
            except Exception as e:  # keep going; report at the end
                failures += 1
                print(f"  {score_id}: FAILED — {e}")
                continue
            print(f"  {score_id}: {analysis['key']['initial']}, "
                  f"{analysis['measures']} measures, {len(analysis['parts'])} parts")
            if not dry:
                with conn.cursor() as cur:
                    cur.execute(
                        "UPDATE gw_parttrack_scores SET analysis = %s WHERE id = %s",
                        (json.dumps(analysis), score_id))
                conn.commit()
        print(f"done, {failures} failure(s)")
        return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 3: Syntax-check (no droplet run in this session)**

Run: `cd worker/parttrack-renderer && python3 -m py_compile backfill_analysis.py && python3 -m pytest tests/ -q`
Expected: compiles; suite still green. The live run is Kevin's deploy step 3.

- [ ] **Step 4: Commit**

```bash
git add worker/parttrack-renderer/backfill_analysis.py docs/superpowers/specs/2026-08-11-assistant-score-analysis-design.md
git commit -m "feat(parttrack): one-off analysis backfill script (analysis column only)"
```

---

### Task 4: `get_score_analysis` catalog entry (TDD)

**Files:**
- Modify: `supabase/functions/assistant-chat/toolCatalog.ts` (insert entry after `lookup_hymn`, ~line 126)
- Test: `supabase/functions/assistant-chat/__tests__/toolCatalog.test.ts`

**Interfaces:**
- Produces: catalog entry `get_score_analysis` — `minRole: 'member'`, `execution: 'server'`, `confirm: false`, required param `score_id: string`. Task 5's executor case and Task 6's prompt note use this exact name.

- [ ] **Step 0 (once per worktree): install deps**

```bash
cd ~/Documents/GitHub/gleeworld-wt-score-analysis
npm ci --legacy-peer-deps
```
Watch it finish — do not pipe to tail.

- [ ] **Step 1: Write the failing test**

In `toolCatalog.test.ts`, inside the `'members get only member tools'` it-block, add to the `arrayContaining` list:

```ts
      expect.arrayContaining(['query_calendar', 'search_music', 'open_page', 'open_song',
        'create_note', 'create_task', 'start_video_session', 'get_score_analysis']),
```

And add a new it-block after it:

```ts
  it('get_score_analysis is a read-only member server tool', () => {
    const t = TOOL_CATALOG.find((x) => x.name === 'get_score_analysis')!;
    expect(t.minRole).toBe('member');
    expect(t.execution).toBe('server');
    expect(t.confirm).toBe(false);
    expect(t.parameters.required).toEqual(['score_id']);
  });
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run supabase/functions/assistant-chat/__tests__/toolCatalog.test.ts`
Expected: FAIL — `get_score_analysis` missing.

- [ ] **Step 3: Add the catalog entry**

In `toolCatalog.ts`, directly after the `lookup_hymn` entry's closing `},`, insert:

```ts
  {
    name: 'get_score_analysis',
    description: "Musical facts about a score in the library, from its Part Tracks analysis: key, meter, tempo, measure count, voice parts with their ranges, and duration. Use for 'what key is X in', 'how many measures', 'what's the alto range', 'how fast does it go'. Get score_id from search_music first — never guess ids. NEVER state a score's key, meter, measure count, or ranges from memory — only from this tool. If it returns analyzed:false, tell the user the score hasn't been analyzed yet and relay the hint honestly.",
    parameters: {
      type: 'object',
      properties: {
        score_id: str('The score id from search_music'),
      },
      required: ['score_id'],
    },
    minRole: 'member', execution: 'server', confirm: false,
  },
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run supabase/functions/assistant-chat/__tests__/toolCatalog.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/assistant-chat/toolCatalog.ts supabase/functions/assistant-chat/__tests__/toolCatalog.test.ts
git commit -m "feat(assistant): get_score_analysis tool catalog entry"
```

---

### Task 5: `getScoreAnalysis` executor (TDD)

**Files:**
- Modify: `supabase/functions/assistant-chat/executors.ts` (switch case ~line 85 area; function near `lookupHymn` ~line 1330)
- Test: `supabase/functions/assistant-chat/__tests__/executors.scoreAnalysis.test.ts` (new file — executors.test.ts is generic; domain tools get their own file, like `executors.academy.test.ts`)

**Interfaces:**
- Consumes: `Deps` (`supabase`, `role?: 'admin' | 'member'`); `gw_parttrack_scores` columns `id, analysis, source_type, status, validation_report, tempo_override_bpm, manifest, error_message`; `gw_parttrack_parts` columns `source_part_index, source_staff, source_voice, role, label, include`; analysis blob shape from Task 1.
- Produces: `executeServerTool('get_score_analysis', {score_id}, deps)` → `replyJson` with either `{analyzed:false, hint, failed?, error_message?}` or `{analyzed:true, optical, optical_note?, key, time_signatures, marked_tempo_bpm, performance_tempo_bpm, tempo_overridden, measures, duration_ms, parts:[{role,label,range,excluded?}], warnings:[codes]}`. Task 6's prompt note names `optical`, `tempo_overridden`, `excluded`, `analyzed:false` — keep these exact.

- [ ] **Step 1: Write the failing tests**

Create `supabase/functions/assistant-chat/__tests__/executors.scoreAnalysis.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { executeServerTool } from '../executors';

// Per-table stub: routes from(table) to that table's rows. maybeSingle()
// resolves the first row or null; awaiting the builder resolves the list.
function stubTables(tables: Record<string, unknown[]>, error: { message: string } | null = null) {
  return {
    from: (table: string) => {
      const rows = tables[table] ?? [];
      const builder: any = {};
      for (const m of ['select', 'eq', 'or', 'ilike', 'order', 'limit']) builder[m] = () => builder;
      builder.maybeSingle = () => Promise.resolve({ data: (rows[0] ?? null), error });
      builder.then = (resolve: (v: unknown) => void) => resolve({ data: rows, error });
      return builder;
    },
  } as any;
}

const ANALYSIS = {
  v: 1,
  computed_at: '2026-08-11T22:00:00+00:00',
  key: { initial: 'F major', changes: 1 },
  time_signatures: ['4/4', '3/4'],
  tempo_bpm: 96,
  measures: 84,
  parts: [
    { source_part_index: 0, source_staff: null, source_voice: null,
      role: 'soprano', label: 'Soprano', range: { low: 'C4', high: 'G5' } },
    { source_part_index: 1, source_staff: null, source_voice: null,
      role: 'other', label: 'Spoken', range: null },
  ],
};

const PART_ROWS = [
  { source_part_index: 0, source_staff: null, source_voice: null,
    role: 'soprano_1', label: 'Soprano I', include: true },
  { source_part_index: 1, source_staff: null, source_voice: null,
    role: 'other', label: 'Spoken', include: false },
];

function scoreRow(over: Record<string, unknown> = {}) {
  return {
    id: 'pt1', analysis: ANALYSIS, source_type: 'pdf_omr', status: 'ready',
    validation_report: [{ code: 'omr_beta', severity: 'warning', message: 'x' }],
    tempo_override_bpm: null, manifest: { duration_ms: 210_000 }, error_message: null,
    ...over,
  };
}

describe('get_score_analysis executor', () => {
  it('missing score_id is an error', async () => {
    const { replyJson } = await executeServerTool('get_score_analysis', {},
      { supabase: stubTables({}) });
    expect(JSON.parse(replyJson).error).toContain('score_id');
  });

  it('no PartTrack row → honest miss with member hint', async () => {
    const { replyJson } = await executeServerTool('get_score_analysis', { score_id: 's1' },
      { supabase: stubTables({ gw_parttrack_scores: [] }), role: 'member' });
    const out = JSON.parse(replyJson);
    expect(out.analyzed).toBe(false);
    expect(out.hint).toContain('director');
  });

  it('no row → admin hint points at the Part Tracks menu', async () => {
    const { replyJson } = await executeServerTool('get_score_analysis', { score_id: 's1' },
      { supabase: stubTables({ gw_parttrack_scores: [] }), role: 'admin' });
    expect(JSON.parse(replyJson).hint).toContain('Part Tracks');
  });

  it('row without analysis (pre-backfill) is still an honest miss', async () => {
    const { replyJson } = await executeServerTool('get_score_analysis', { score_id: 's1' },
      { supabase: stubTables({ gw_parttrack_scores: [scoreRow({ analysis: null })] }), role: 'member' });
    expect(JSON.parse(replyJson).analyzed).toBe(false);
  });

  it('failed analysis reports failure, not facts', async () => {
    const { replyJson } = await executeServerTool('get_score_analysis', { score_id: 's1' },
      { supabase: stubTables({ gw_parttrack_scores: [scoreRow({ analysis: null, status: 'failed', error_message: 'boom' })] }) });
    const out = JSON.parse(replyJson);
    expect(out.analyzed).toBe(false);
    expect(out.failed).toBe(true);
    expect(out.error_message).toBe('boom');
  });

  it('pdf_omr facts come back optical with a caveat note', async () => {
    const { replyJson } = await executeServerTool('get_score_analysis', { score_id: 's1' },
      { supabase: stubTables({ gw_parttrack_scores: [scoreRow()], gw_parttrack_parts: PART_ROWS }) });
    const out = JSON.parse(replyJson);
    expect(out.analyzed).toBe(true);
    expect(out.optical).toBe(true);
    expect(out.optical_note).toContain('optically');
    expect(out.key.initial).toBe('F major');
    expect(out.measures).toBe(84);
    expect(out.duration_ms).toBe(210_000);
    expect(out.warnings).toContain('omr_beta');
  });

  it('parts prefer confirmed DB role/label; excluded staves are flagged', async () => {
    const { replyJson } = await executeServerTool('get_score_analysis', { score_id: 's1' },
      { supabase: stubTables({ gw_parttrack_scores: [scoreRow()], gw_parttrack_parts: PART_ROWS }) });
    const parts = JSON.parse(replyJson).parts;
    expect(parts[0].role).toBe('soprano_1');       // DB row wins over analysis blob
    expect(parts[0].label).toBe('Soprano I');
    expect(parts[0].range).toEqual({ low: 'C4', high: 'G5' });
    expect(parts[0].excluded).toBeUndefined();
    expect(parts[1].excluded).toBe(true);
  });

  it('musicxml source is not optical and tempo override is reported', async () => {
    const { replyJson } = await executeServerTool('get_score_analysis', { score_id: 's1' },
      { supabase: stubTables({
          gw_parttrack_scores: [scoreRow({ source_type: 'mxl', tempo_override_bpm: 88 })],
          gw_parttrack_parts: PART_ROWS,
        }) });
    const out = JSON.parse(replyJson);
    expect(out.optical).toBe(false);
    expect(out.optical_note).toBeUndefined();
    expect(out.marked_tempo_bpm).toBe(96);
    expect(out.performance_tempo_bpm).toBe(88);
    expect(out.tempo_overridden).toBe(true);
  });

  it('db errors surface as an error field', async () => {
    const { replyJson } = await executeServerTool('get_score_analysis', { score_id: 's1' },
      { supabase: stubTables({ gw_parttrack_scores: [] }, { message: 'permission denied' }) });
    expect(JSON.parse(replyJson).error).toContain('permission denied');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run supabase/functions/assistant-chat/__tests__/executors.scoreAnalysis.test.ts`
Expected: FAIL — `Unknown tool` errors (no switch case yet).

- [ ] **Step 3: Implement the executor**

In `executors.ts`, add the switch case (alphabetically near `lookup_hymn`'s case, ~line 85):

```ts
      case 'get_score_analysis': return { replyJson: await getScoreAnalysis(args, deps) };
```

Add the function directly above `lookupHymn` (~line 1330):

```ts
async function getScoreAnalysis(args: Record<string, unknown>, { supabase, role }: Deps): Promise<string> {
  const scoreId = String(args.score_id ?? '').trim();
  if (!scoreId) return JSON.stringify({ error: 'Pass score_id from search_music first.' });

  const { data: row, error } = await supabase
    .from('gw_parttrack_scores')
    .select('id, analysis, source_type, status, validation_report, tempo_override_bpm, manifest, error_message')
    .eq('sheet_music_id', scoreId)
    .maybeSingle();
  if (error) return JSON.stringify({ error: error.message });

  // Honesty split (Deps.role): admins can run the analysis themselves;
  // students need their director to do it.
  const hint = role === 'admin'
    ? "Not analyzed yet — open this score's ⋯ menu in the Music Library, run Part Tracks, and ask again once it finishes."
    : 'Not analyzed yet — ask your director to run this score through Part Tracks, then I can answer.';
  if (!row || !row.analysis) {
    if (row?.status === 'failed') {
      return JSON.stringify({
        analyzed: false, failed: true,
        error_message: row.error_message ?? 'analysis failed', hint,
      });
    }
    return JSON.stringify({ analyzed: false, hint });
  }

  const { data: partRows, error: pErr } = await supabase
    .from('gw_parttrack_parts')
    .select('source_part_index, source_staff, source_voice, role, label, include')
    .eq('score_id', row.id);
  if (pErr) return JSON.stringify({ error: pErr.message });

  const analysis = row.analysis as Record<string, unknown>;
  const aParts = (analysis.parts ?? []) as Array<Record<string, unknown>>;
  const joinKey = (p: Record<string, unknown>) =>
    `${p.source_part_index}|${p.source_staff ?? ''}|${p.source_voice ?? ''}`;
  const dbByKey = new Map(
    ((partRows ?? []) as Array<Record<string, unknown>>).map((p) => [joinKey(p), p]));
  // The DB parts rows are the source of truth for role/label/include — the
  // director may have re-labeled parts at confirm, after analysis was stored.
  const parts = aParts.map((p) => {
    const db = dbByKey.get(joinKey(p));
    return {
      role: (db?.role ?? p.role) as string,
      label: (db?.label ?? p.label) as string,
      range: p.range ?? null,
      ...(db && db.include === false ? { excluded: true } : {}),
    };
  });

  const optical = row.source_type === 'pdf_omr';
  const markedTempo = (analysis.tempo_bpm ?? null) as number | null;
  return JSON.stringify({
    analyzed: true,
    optical,
    ...(optical ? {
      optical_note: 'These facts were read optically from the PDF (beta) and can contain errors. The FIRST time you state them in this conversation, add: "I read this optically from the PDF, so double-check anything critical against the printed score."',
    } : {}),
    key: analysis.key ?? null,
    time_signatures: analysis.time_signatures ?? [],
    marked_tempo_bpm: markedTempo,
    performance_tempo_bpm: (row.tempo_override_bpm ?? markedTempo) as number | null,
    tempo_overridden: row.tempo_override_bpm != null,
    measures: analysis.measures ?? null,
    duration_ms: (row.manifest as Record<string, unknown> | null)?.duration_ms ?? null,
    parts,
    warnings: ((row.validation_report ?? []) as Array<{ code: string }>).map((w) => w.code),
  });
}
```

- [ ] **Step 4: Run to verify pass, then the whole assistant-chat suite**

Run: `npx vitest run supabase/functions/assistant-chat/__tests__/executors.scoreAnalysis.test.ts`
Expected: PASS (9 tests).
Run: `npx vitest run supabase/functions/assistant-chat/__tests__/`
Expected: all pass — the generic `rejects unknown tools` test still passes because `get_score_analysis` now has a case.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/assistant-chat/executors.ts supabase/functions/assistant-chat/__tests__/executors.scoreAnalysis.test.ts
git commit -m "feat(assistant): get_score_analysis executor — RLS read over parttrack analysis"
```

---

### Task 6: Prompt note + source-leak regression test

**Files:**
- Modify: `supabase/functions/assistant-chat/prompt.ts` (new note const near `hymnalNote` ~line 154; add to the assembled sections)
- Test: `supabase/functions/assistant-chat/__tests__/prompt.test.ts`, `supabase/functions/assistant-chat/__tests__/sourceLeak.test.ts`

**Interfaces:**
- Consumes: tool result field names from Task 5 (`analyzed`, `optical`, `tempo_overridden`, `excluded`, `hint`).
- Produces: `buildSystemPrompt` output containing the score-facts rules; proof a typical analysis reply passes `namesItsSources`.

- [ ] **Step 1: Write the failing prompt test**

In `prompt.test.ts`, add (mirroring existing note assertions — check how other notes are asserted and match the local style):

```ts
  it('teaches score-analysis honesty rules', () => {
    const p = buildSystemPrompt(baseCtx());
    expect(p).toContain('get_score_analysis');
    expect(p).toContain('never from memory');
    expect(p).toContain('double-check anything critical against the printed score');
  });
```

(If `prompt.test.ts` has no `baseCtx()` helper, reuse whatever minimal `AssistantContext` literal its existing tests pass to `buildSystemPrompt` — copy the nearest test's context object verbatim.)

- [ ] **Step 2: Add the sourceLeak regression test (should pass immediately)**

In `sourceLeak.test.ts`, add to the block of non-leaking examples (there is an it-block asserting legitimate replies are NOT flagged — add there):

```ts
      'From the Part Tracks analysis: F major, 84 measures in 4/4, about three and a half minutes. I read this optically from the PDF, so double-check anything critical against the printed score.',
      "The alto range is E4 up to A4. The score hasn't been analyzed yet for ranges beyond that — ask your director to run it through Part Tracks.",
```

- [ ] **Step 3: Run to verify the prompt test fails, sourceLeak passes**

Run: `npx vitest run supabase/functions/assistant-chat/__tests__/prompt.test.ts supabase/functions/assistant-chat/__tests__/sourceLeak.test.ts`
Expected: prompt test FAILS (note missing); sourceLeak tests PASS (nothing in these sentences matches the `<word> library` pattern — this is the guard-compatibility proof).

- [ ] **Step 4: Add the prompt note**

In `prompt.ts`, after the `hymnalNote` const, add:

```ts
  const scoreAnalysisNote = [
    'Score facts (get_score_analysis):',
    "- A score's key, meter, tempo, measure count, and voice ranges come ONLY from get_score_analysis (score_id from search_music) — never from memory. A wrong key or range misleads a student's practice.",
    '- If it returns analyzed:false, say the score has not been analyzed yet and relay its hint exactly; never guess the facts instead.',
    '- When the result has optical:true, the FIRST time you state its facts in this conversation say: "I read this optically from the PDF, so double-check anything critical against the printed score." Do not repeat the caveat in later turns about the same score.',
    '- When tempo_overridden is true, give both numbers: the printed marking (marked_tempo_bpm) and the rehearsal tempo the director set (performance_tempo_bpm).',
    "- Never present a part flagged excluded as one of the piece's voice parts — it is an unusable staff.",
  ].join('\n');
```

Then add `scoreAnalysisNote` to the prompt assembly: find where `hymnalNote` is joined into the final prompt string (search for `hymnalNote,` in the return/join near the bottom of `buildSystemPrompt`) and add `scoreAnalysisNote,` on the next line.

- [ ] **Step 5: Run to verify pass**

Run: `npx vitest run supabase/functions/assistant-chat/__tests__/`
Expected: all pass, including `prompt.sourceSecrecy.test.ts` (the note names the user-facing feature "Part Tracks", not a corpus "library" — if sourceSecrecy fails, the note's wording changed the secrecy rules; re-read that test before touching wording).

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/assistant-chat/prompt.ts supabase/functions/assistant-chat/__tests__/prompt.test.ts supabase/functions/assistant-chat/__tests__/sourceLeak.test.ts
git commit -m "feat(assistant): score-analysis honesty rules in system prompt"
```

---

### Task 7: Voice-safe pitch names in `sanitizeForSpeech` (TDD)

**Files:**
- Modify: `src/lib/assistant/speech.ts:319-355` (`sanitizeForSpeech`)
- Test: `src/lib/assistant/speech.sanitize.test.ts`

**Interfaces:**
- Consumes: existing `sanitizeForSpeech(text: string): string` and its chord machinery (`CHORD_PARENTHETICAL`, `CHORD_RUN`).
- Produces: pitch names and ranges spoken as words; chord handling unchanged.

- [ ] **Step 1: Write the failing tests**

In `src/lib/assistant/speech.sanitize.test.ts`, add:

```ts
describe('pitch names and ranges', () => {
  it('respells pitch names for speech', () => {
    expect(sanitizeForSpeech('The soprano tops out at G5.'))
      .toBe('The soprano tops out at G five.');
    expect(sanitizeForSpeech('It sits low, around Bb3 for the basses.'))
      .toBe('It sits low, around B flat three for the basses.');
    expect(sanitizeForSpeech('The tenor entrance is on F#4.'))
      .toBe('The tenor entrance is on F sharp four.');
  });

  it('speaks dash-joined ranges as "to"', () => {
    expect(sanitizeForSpeech('The alto range is E4–A4.'))
      .toBe('The alto range is E four to A four.');
  });

  it('does not break chord handling (regression)', () => {
    // Symbol-only parentheticals still stripped; progressions still worded.
    expect(sanitizeForSpeech('the minor one chord (i)')).toBe('the minor one chord');
    expect(sanitizeForSpeech('a iv–V–i cadence')).toBe('a four to five to one cadence');
  });
});
```

(Import `sanitizeForSpeech` the same way the file's existing tests do. The chord regression cases duplicate existing assertions on purpose — they prove the new rules run without disturbing rule order.)

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/lib/assistant/speech.sanitize.test.ts`
Expected: the two new pitch/range tests FAIL ("G5" untouched); chord regression PASSES.

- [ ] **Step 3: Implement**

In `speech.ts`, above `sanitizeForSpeech`, add:

```ts
const OCTAVE_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'];
// A pitch-with-octave like C4, F#3, Bb5. Written accidentals only — a bare
// letter ("the key of A") is not a pitch name and stays untouched.
const PITCH_NAME = /\b([A-G])([#♯b♭])?([0-8])\b/g;
const PITCH_RANGE = /\b([A-G][#♯b♭]?[0-8])\s*[–—-]\s*([A-G][#♯b♭]?[0-8])\b/g;
```

Inside `sanitizeForSpeech`, insert BEFORE the `.replace(CHORD_PARENTHETICAL, '')` line (order matters: once respelled to words, pitch names can never be mistaken for chord symbols by the chord rules that follow):

```ts
    // Vocal ranges: "E4–A4" reads as "E four to A four", not a dash.
    .replace(PITCH_RANGE, '$1 to $2')
    // Pitch names with octaves become words BEFORE chord handling so the
    // chord machinery never mistakes "C4" for a chord symbol.
    .replace(PITCH_NAME, (_, letter, acc, oct) =>
      `${letter}${acc === '#' || acc === '♯' ? ' sharp' : acc ? ' flat' : ''} ${OCTAVE_WORDS[Number(oct)]}`)
```

- [ ] **Step 4: Run to verify pass, then the assistant client suites**

Run: `npx vitest run src/lib/assistant/`
Expected: all pass (speech tests mock `auth.getSession` + `SUPABASE_URL` already — do not remove those mocks; without them the speech path is silently unexercised).

- [ ] **Step 5: Commit**

```bash
git add src/lib/assistant/speech.ts src/lib/assistant/speech.sanitize.test.ts
git commit -m "feat(assistant): speak pitch names and vocal ranges as words"
```

---

### Task 8: Full verification + PR + deploy checklist

**Files:** none new — verification and handoff.

- [ ] **Step 1: Full test suites**

```bash
cd ~/Documents/GitHub/gleeworld-wt-score-analysis
npm run test
(cd worker/parttrack-renderer && python3 -m pytest tests/ -q)
npm run typecheck:guard
npm run lint
```
Expected: all green; typecheck:guard reports no NEW errors. Fix anything that fails before proceeding (superpowers:verification-before-completion — evidence before claims).

- [ ] **Step 2: Push branch + open PR (Kevin merges; gh pr merge is classifier-blocked)**

```bash
git push -u origin feat/assistant-score-analysis
gh pr create --title "Assistant score analysis: get_score_analysis over PartTrack facts" --body "$(cat <<'EOF'
Implements docs/superpowers/specs/2026-08-11-assistant-score-analysis-design.md.

- Worker: extract_analysis stores a v1 musical-facts blob (key, meters, tempo, measures, per-part ranges) in new gw_parttrack_scores.analysis at analyze time; one-off backfill_analysis.py for existing rows (analysis column ONLY).
- Assistant: get_score_analysis member server tool (RLS read; honest miss + role-aware hint; optical-beta caveat for pdf_omr; confirmed DB part roles win over the analysis blob; tempo override reported alongside the printed marking).
- Prompt: never-from-memory rule + prescribed once-per-thread optical caveat; sourceLeak regression tests prove typical replies pass the guard.
- Speech: pitch names/ranges ("Bb3", "E4–A4") spoken as words; chord handling regression-tested.

Deploy AFTER merge, in order: (1) apply supabase/migrations/20260811300000_parttrack_analysis_column.sql by hand as supabase_admin; (2) scripts/deploy-parttrack-worker.sh; (3) run worker/parttrack-renderer/backfill_analysis.py on the droplet (--dry-run first); (4) bash scripts/deploy-functions.sh assistant-chat. No frontend deploy.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 3: Post-deploy live verification (after Kevin's 4 deploy steps)**

Using the standing live-test recipe (anon key from `/opt/supabase/.env`, password grant as `demo@gleeworld.org` / `GleeDemo2026!` at `https://supabase.gleeworld.org/auth/v1/token?grant_type=password`, then POST `/functions/v1/assistant-chat`):

1. Ask about an **unanalyzed** score → expect the honest miss with the director hint (member account).
2. Ask "what key is <backfilled score> in" → expect key/measures from the analysis blob.
3. On a `pdf_omr` score, ask two facts in one thread → the optical caveat sentence appears on the FIRST answer only.
4. Confirm no reply names a corpus (source-leak guard silent in the edge fn logs).

Record results in the PR before Kevin's QA.

---

## Self-Review (performed while writing)

- **Spec coverage:** analysis column + v1 blob (Tasks 1–2), backfill (Task 3, with the `source_path` fallback correction folded into the spec), tool contract + result shapes incl. failed/optical/excluded/tempo-override (Tasks 4–5), prompt honesty + guard proof (Task 6), voice handling (Task 7), deploy order + live verification (Task 8). Out-of-scope items untouched.
- **Placeholder scan:** none — every step has runnable code/commands.
- **Type consistency:** `extract_analysis` part keys (`source_part_index/source_staff/source_voice`) match the executor's `joinKey` and the test fixtures; result field names in Task 5's code, Task 5's tests, and Task 6's prompt note are identical (`analyzed`, `optical`, `optical_note`, `marked_tempo_bpm`, `performance_tempo_bpm`, `tempo_overridden`, `excluded`, `hint`).
