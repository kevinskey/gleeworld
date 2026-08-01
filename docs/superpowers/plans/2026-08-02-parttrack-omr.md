# PartTrack OMR (Phase 3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Directors generate part tracks from a PDF octavo — either uploaded or already attached to the score — via Audiveris OMR feeding the existing confirm-parts pipeline, beta-labeled.

**Architecture:** No new service. The existing `worker/parttrack-renderer` gains an `omr.py` step: `pdf_omr` sources run Audiveris headless (`-batch -export`) → `.mxl` → uploaded as `normalized_mxl_path` → the SAME music21 analyze/classify/validate path. Renders parse the normalized MXL. Frontend accepts `.pdf` and offers one-click "Use the attached PDF" for scores that already have one. Audiveris is invoked as an unmodified separate-process CLI (no linking, no modification — no AGPL conveyance obligations; we ship nothing of it).

**Tech Stack:** Audiveris 5.x headless (Java 17/21) on the droplet, existing Python worker, existing React dialog.

**Spec:** `docs/superpowers/specs/2026-07-31-parttrack-phase1-design.md` (Phase 3 section + §2 pipeline). Plans 1–2 shipped (PRs #335–#346).

## Global Constraints

- OMR is BETA and the UI says so: "Reads clean, engraved octavos best — check every part before generating." An `omr_beta` warning is ALWAYS present in `validation_report` for `pdf_omr` scores, so generation always requires the acknowledge checkbox.
- Honest ETAs: analyzing copy for PDFs says "a few minutes", not "under a minute".
- OMR subprocess hard timeout: 600 s; failure surfaces the stderr tail in `error_message`.
- All Plan-1/2 conventions hold (tenant RLS, `.select().single()` on writes, text sizes, tenant-neutral copy).
- Worker env gains `AUDIVERIS_CMD` (default `audiveris`); config guards missing binary with a clear failure message ("PDF reading is not set up on this server yet").

---

### Task 1: Migration — allow pdf_omr source type

**Files:**
- Create: `supabase/migrations/20260803090000_parttrack_pdf_omr.sql`

- [ ] **Step 1: Write it**

```sql
-- Phase 3: PDF input via OMR. Widens the source_type CHECK.
ALTER TABLE public.gw_parttrack_scores
  DROP CONSTRAINT IF EXISTS gw_parttrack_scores_source_type_check;
ALTER TABLE public.gw_parttrack_scores
  ADD CONSTRAINT gw_parttrack_scores_source_type_check
  CHECK (source_type IN ('musicxml','mxl','midi','pdf_omr'));
```

- [ ] **Step 2: Commit** — `feat(parttrack): allow pdf_omr source type`. (Kevin applies with the other steps at ship time.)

---

### Task 2: Worker — OMR step

**Files:**
- Create: `worker/parttrack-renderer/omr.py`
- Modify: `worker/parttrack-renderer/config.py` (add `audiveris_cmd`)
- Modify: `worker/parttrack-renderer/analyze.py` (branch on `pdf_omr`, upload normalized mxl)
- Modify: `worker/parttrack-renderer/orchestrate.py` + `analyze.py` `_load_score` (prefer `normalized_mxl_path`)
- Test: `worker/parttrack-renderer/tests/test_omr.py`

**Interfaces:**
- `omr.pdf_to_mxl(pdf_path: Path, workdir: Path, audiveris_cmd: str) -> Path` — runs `[audiveris_cmd, '-batch', '-export', '-output', str(workdir), str(pdf_path)]` with `timeout=600`, then returns the newest `*.mxl` under `workdir` (Audiveris may nest it in a book subfolder — search recursively). Raises `OmrError` with a human-readable message (including stderr tail) on non-zero exit, timeout, or no `.mxl` produced.
- `config.Settings.audiveris_cmd: str` from `AUDIVERIS_CMD` env, default `"audiveris"`.
- `analyze._load_score` becomes: SELECT `source_path, source_type, normalized_mxl_path`; if `normalized_mxl_path` is set, download and parse THAT (all types); else download source. For `pdf_omr` with no normalized path yet: download the PDF, `pdf_to_mxl`, upload result to `parttrack/<tenant>/<score>/normalized.mxl`, UPDATE `normalized_mxl_path`, parse it.
- `run_analyze` appends `{"code": "omr_beta", "severity": "warning", "message": "This score was read from a PDF by optical music recognition (beta). Check parts, notes, and rhythms before generating."}` to the warnings for `pdf_omr` scores.

- [ ] **Step 1: Failing tests** (subprocess mocked — no Audiveris locally):

```python
import subprocess
from pathlib import Path
from unittest.mock import patch
import pytest
from omr import OmrError, pdf_to_mxl

def _touch(p):
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_bytes(b"x")
    return p

def test_finds_nested_mxl(tmp_path):
    pdf = _touch(tmp_path / "score.pdf")
    out = tmp_path / "out"
    def fake_run(cmd, **kw):
        _touch(out / "score" / "score.mxl")
        return subprocess.CompletedProcess(cmd, 0, stdout=b"", stderr=b"")
    with patch("omr.subprocess.run", side_effect=fake_run):
        assert pdf_to_mxl(pdf, out, "audiveris").name == "score.mxl"

def test_raises_on_failure_with_stderr(tmp_path):
    pdf = _touch(tmp_path / "score.pdf")
    def fake_run(cmd, **kw):
        return subprocess.CompletedProcess(cmd, 1, stdout=b"", stderr=b"boom: bad page")
    with patch("omr.subprocess.run", side_effect=fake_run):
        with pytest.raises(OmrError, match="bad page"):
            pdf_to_mxl(pdf, tmp_path / "out", "audiveris")

def test_raises_when_no_mxl_produced(tmp_path):
    pdf = _touch(tmp_path / "score.pdf")
    def fake_run(cmd, **kw):
        return subprocess.CompletedProcess(cmd, 0, stdout=b"", stderr=b"")
    with patch("omr.subprocess.run", side_effect=fake_run):
        with pytest.raises(OmrError, match="produced no music"):
            pdf_to_mxl(pdf, tmp_path / "out", "audiveris")
```

- [ ] **Step 2: Run to fail; implement omr.py**

```python
# Audiveris headless OMR: PDF -> MusicXML (.mxl). Invoked as an unmodified
# separate-process CLI. Beta-quality by design; the confirm screen absorbs
# recognition errors.
import subprocess
from pathlib import Path

OMR_TIMEOUT_S = 600


class OmrError(Exception):
    pass


def pdf_to_mxl(pdf_path: Path, workdir: Path, audiveris_cmd: str) -> Path:
    workdir.mkdir(parents=True, exist_ok=True)
    cmd = [audiveris_cmd, "-batch", "-export", "-output", str(workdir), str(pdf_path)]
    try:
        result = subprocess.run(cmd, capture_output=True, timeout=OMR_TIMEOUT_S)
    except FileNotFoundError:
        raise OmrError("PDF reading is not set up on this server yet (Audiveris not found).")
    except subprocess.TimeoutExpired:
        raise OmrError("Reading the PDF took too long — try a shorter or cleaner scan.")
    if result.returncode != 0:
        tail = (result.stderr or b"")[-400:].decode(errors="replace")
        raise OmrError(f"Could not read the PDF: {tail}")
    candidates = sorted(workdir.rglob("*.mxl"), key=lambda p: p.stat().st_mtime)
    if not candidates:
        raise OmrError("The PDF was processed but produced no music — is it a scanned score?")
    return candidates[-1]
```

- [ ] **Step 3: Wire config + analyze + load-order** per Interfaces above (exact SQL/upload paths follow Plan-1 conventions in those files). `orchestrate.run_render` needs no change beyond `_load_score` preferring `normalized_mxl_path`.
- [ ] **Step 4: Full worker suite passes** (`pytest tests/ -v`, OMR tests mocked; existing 16 unaffected).
- [ ] **Step 5: Commit** — `feat(parttrack): Audiveris OMR step for pdf sources`.

---

### Task 3: Frontend — PDF upload + "Use the attached PDF"

**Files:**
- Modify: `src/features/part-tracks/PartTracksDialog.tsx`
- Modify: `src/features/part-tracks/api.ts`
- Modify: `src/features/part-tracks/types.ts` (`'pdf_omr'` in `PartTrackSourceType`)

**Interfaces:**
- Upload accept becomes `.xml,.musicxml,.mxl,.mid,.midi,.pdf`; `sourceTypeFromName` maps `.pdf → 'pdf_omr'`.
- `api.createScoreFromAttachedPdf(sheetMusicId, userId)` — reads the score row's PDF (resolve via the same logic `useSheetMusicUrl`/`getSignedUrl` uses for the `sheet-music` bucket / `pdf_url`), `fetch`es it into a `File`, then calls the existing `createScore(sheetMusicId, file, 'pdf_omr', userId)`.
- Empty-state UI: when the sheet-music row has a PDF, show a primary "Use the attached PDF (beta)" button above "Choose file", plus the beta copy: "Reads clean, engraved octavos best — you'll confirm every part before anything is generated."
- `queued|analyzing` copy for `pdf_omr`: "Reading the PDF… this takes a few minutes for a full octavo."
- The dialog needs the sheet-music PDF availability: extend the dialog props with `pdfUrl?: string | null` passed from both call sites (`MusicLibraryPage` has `row.pdf_url`/`storage_path`; `PartTracksPage` joins `gw_sheet_music(title, composer)` — add `pdf_url` to that select).

- [ ] **Step 1: Implement** per interfaces; `tsc` + eslint + part-tracks vitest green.
- [ ] **Step 2: Commit** — `feat(parttrack): PDF input with attached-PDF one-click (OMR beta)`.

---

### Task 4: Droplet Audiveris install + ship

**Files:**
- Modify: `worker/parttrack-renderer/DEPLOY.md` (Audiveris section)

- [ ] **Step 1: Add install doc** — Java runtime + Audiveris release download, `AUDIVERIS_CMD` added to `/etc/gleeworld-parttrack-worker.env`, verify with `audiveris -help`. Exact artifact layout varies by release: the executor verifies on the droplet and adjusts (github.com/Audiveris/audiveris releases; flatpak fallback `flatpak run org.audiveris.audiveris`).
- [ ] **Step 2: PR + merge; Kevin applies the migration and runs the droplet install; deploy worker (`scripts/deploy-parttrack-worker.sh`) + frontend (`scripts/deploy-frontend.sh`).**
- [ ] **Step 3: Live smoke** — pick one of Kevin's engraved PDFs already in the library → "Use the attached PDF" → confirm OMR-read parts (expect imperfections; that's the beta contract) → generate → play.

## Self-review notes

- Spec coverage: Phase 3 = OMR into the same validation+confirmation pipeline ✓; beta labeling ✓; `.omr` project retention and the homr benchmark are explicitly deferred (log in memory, not built).
- No engine-adapter abstraction yet (spec sketched one): YAGNI until a second engine is actually evaluated; `pdf_to_mxl` is the seam.
- Render path re-parses `normalized_mxl_path`, so OMR runs once per score, not per render.
