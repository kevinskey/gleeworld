# PartTrack Pipeline (Phase 1, Plan 1 of 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A director uploads MusicXML/MXL/MIDI for a score, confirms detected voice parts, attests rights, and GleeWorld renders per-part audio stems + download mixes with a measure-timing manifest.

**Architecture:** New `gw_parttrack_*` tables hang off `gw_sheet_music`. A Python worker (`worker/parttrack-renderer/`) polls `gw_parttrack_jobs` with `FOR UPDATE SKIP LOCKED` (same shape as `worker/video-transcoder/`), runs music21 analysis → director confirmation → FluidSynth/FFmpeg rendering → uploads to a private `parttrack` bucket. Frontend is a dialog in the Music Library talking straight to Supabase via RLS.

**Tech Stack:** Postgres/Supabase (self-hosted), Python 3.11 + music21 + psycopg + pytest, FluidSynth CLI, FFmpeg CLI, React + supabase-js + vitest.

**Spec:** `docs/superpowers/specs/2026-07-31-parttrack-phase1-design.md` (read it first). Plan 2 (practice player, assignments, telemetry) follows after this plan ships.

## Global Constraints

- Every new table: `tenant_id uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.gw_tenants(id)` + RESTRICTIVE `tenant_iso` policy + permissive per-role policies — copy the exact pattern from `supabase/migrations/20260729210000_seating_charts.sql` (§9–10).
- All user-visible copy is tenant-neutral: never a school/choir name; "students", never "singers"/"members".
- UI: light-theme tokens only (white cards, dark text); `text-xs`/`text-sm` minimum sizes; no bare `color` on h1–h6.
- Audio/files reach the browser ONLY as signed URLs via `src/utils/storage.ts` `getSignedUrl` (flatten-daemon-aware). Never raw DO Spaces URLs (no CORS).
- Explicit `created_by: user.id` on every frontend insert (client-generated ids must be real UUIDs — see `src/features/seating-charts/ids.ts` precedent).
- Migrations are applied to prod by Kevin (harness cannot write prod DB). Deploy frontend only via `scripts/deploy-frontend.sh`; never `rsync --delete`.
- Worker: single process, `FOR UPDATE SKIP LOCKED` claim, max 2 attempts, human-readable `error_message` on failure.
- Statuses — score: `queued | analyzing | awaiting_confirmation | rendering | ready | failed`; job: `queued | running | done | error`; job kinds: `analyze | render`.
- Part roles are text: `soprano | soprano_1 | soprano_2 | alto | alto_1 | alto_2 | tenor | tenor_1 | tenor_2 | bass | bass_1 | bass_2 | piano | other`.
- Timbres: `piano` (GM 0, default) | `oboe` (GM 68) | `choir` (GM 52).
- Mix presets and gains (dB-free linear): `strong` featured 1.0 / others 0.15 / piano 0.45; `plus_piano` 1.0/0/0.55; `alone` 1.0/0/0; `full` all voices 0.75 / piano 0.6; `piano_only` piano 1.0.
- All MP3 encodes: `libmp3lame -b:a 192k -ar 44100` — identical params so encoder delay stays uniform across stems.

---

### Task 1: Database migration

**Files:**
- Create: `supabase/migrations/20260801090000_parttrack_pipeline.sql`

**Interfaces:**
- Produces: tables `gw_parttrack_scores`, `gw_parttrack_parts`, `gw_parttrack_rights`, `gw_parttrack_jobs`, `gw_parttrack_renders`; storage bucket `parttrack`; trigger `gw_parttrack_render_requires_rights`.

- [ ] **Step 1: Write the migration**

```sql
-- PartTrack pipeline: score -> analyzed parts -> rights -> rendered stems/mixes.
-- Spec: docs/superpowers/specs/2026-07-31-parttrack-phase1-design.md

CREATE TABLE IF NOT EXISTS public.gw_parttrack_scores (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.gw_tenants(id),
  sheet_music_id      uuid NOT NULL REFERENCES public.gw_sheet_music(id) ON DELETE CASCADE,
  source_type         text NOT NULL CHECK (source_type IN ('musicxml','mxl','midi')),
  source_path         text NOT NULL,
  normalized_mxl_path text,
  status              text NOT NULL DEFAULT 'queued'
                      CHECK (status IN ('queued','analyzing','awaiting_confirmation','rendering','ready','failed')),
  validation_report   jsonb NOT NULL DEFAULT '[]'::jsonb,
  manifest            jsonb,
  timbre              text NOT NULL DEFAULT 'piano' CHECK (timbre IN ('piano','oboe','choir')),
  error_message       text,
  created_by          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, sheet_music_id)
);
CREATE INDEX IF NOT EXISTS gw_parttrack_scores_sheet_idx
  ON public.gw_parttrack_scores (sheet_music_id);

CREATE TABLE IF NOT EXISTS public.gw_parttrack_parts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.gw_tenants(id),
  score_id          uuid NOT NULL REFERENCES public.gw_parttrack_scores(id) ON DELETE CASCADE,
  source_part_index int NOT NULL,
  source_staff      int,
  source_voice      int,
  role              text NOT NULL DEFAULT 'other',
  label             text NOT NULL,
  confidence        numeric NOT NULL DEFAULT 0,
  confirmed         boolean NOT NULL DEFAULT false,
  include           boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS gw_parttrack_parts_score_idx
  ON public.gw_parttrack_parts (score_id, source_part_index);

CREATE TABLE IF NOT EXISTS public.gw_parttrack_rights (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.gw_tenants(id),
  score_id       uuid NOT NULL REFERENCES public.gw_parttrack_scores(id) ON DELETE CASCADE,
  basis          text NOT NULL CHECK (basis IN
                 ('own_work','public_domain','ccli','onelicense','publisher_permission','publisher_cleared')),
  license_number text,
  attested_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  attested_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, score_id)
);

CREATE TABLE IF NOT EXISTS public.gw_parttrack_jobs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.gw_tenants(id),
  score_id      uuid NOT NULL REFERENCES public.gw_parttrack_scores(id) ON DELETE CASCADE,
  kind          text NOT NULL CHECK (kind IN ('analyze','render')),
  status        text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','done','error')),
  attempts      int NOT NULL DEFAULT 0,
  error_message text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  started_at    timestamptz,
  finished_at   timestamptz
);
CREATE INDEX IF NOT EXISTS gw_parttrack_jobs_poll_idx
  ON public.gw_parttrack_jobs (status, created_at);

CREATE TABLE IF NOT EXISTS public.gw_parttrack_renders (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.gw_tenants(id),
  score_id    uuid NOT NULL REFERENCES public.gw_parttrack_scores(id) ON DELETE CASCADE,
  kind        text NOT NULL CHECK (kind IN ('stem','mix')),
  part_role   text,
  mix_preset  text CHECK (mix_preset IN ('strong','plus_piano','alone','full','piano_only')),
  audio_path  text NOT NULL,
  duration_ms int,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS gw_parttrack_renders_score_idx
  ON public.gw_parttrack_renders (score_id, kind);

-- Private storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('parttrack', 'parttrack', false)
ON CONFLICT (id) DO NOTHING;

-- updated_at maintenance
CREATE OR REPLACE FUNCTION public.gw_parttrack_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
DROP TRIGGER IF EXISTS gw_parttrack_scores_touch ON public.gw_parttrack_scores;
CREATE TRIGGER gw_parttrack_scores_touch BEFORE UPDATE ON public.gw_parttrack_scores
  FOR EACH ROW EXECUTE FUNCTION public.gw_parttrack_touch_updated_at();

-- Rights gate: a render job cannot exist without an attestation.
CREATE OR REPLACE FUNCTION public.gw_parttrack_render_requires_rights()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.kind = 'render' AND NOT EXISTS (
    SELECT 1 FROM public.gw_parttrack_rights r WHERE r.score_id = NEW.score_id
  ) THEN
    RAISE EXCEPTION 'Rights attestation required before generating part tracks';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS gw_parttrack_jobs_rights_gate ON public.gw_parttrack_jobs;
CREATE TRIGGER gw_parttrack_jobs_rights_gate BEFORE INSERT ON public.gw_parttrack_jobs
  FOR EACH ROW EXECUTE FUNCTION public.gw_parttrack_render_requires_rights();

-- RLS: enable + RESTRICTIVE tenant-iso on every table
ALTER TABLE public.gw_parttrack_scores  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_parttrack_parts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_parttrack_rights  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_parttrack_jobs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_parttrack_renders ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'gw_parttrack_scores','gw_parttrack_parts','gw_parttrack_rights',
    'gw_parttrack_jobs','gw_parttrack_renders'
  ] LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %1$s_tenant_iso ON public.%1$s; ' ||
      'CREATE POLICY %1$s_tenant_iso ON public.%1$s AS RESTRICTIVE ' ||
      'FOR ALL TO authenticated, anon ' ||
      'USING (tenant_id = public.current_tenant_id()) ' ||
      'WITH CHECK (tenant_id = public.current_tenant_id());',
      t
    );
  END LOOP;
END $$;

-- Permissive per-role policies: tenant members read; admins/creators write.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'gw_parttrack_scores','gw_parttrack_parts','gw_parttrack_rights',
    'gw_parttrack_jobs','gw_parttrack_renders'
  ] LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %1$s_read ON public.%1$s; ' ||
      'CREATE POLICY %1$s_read ON public.%1$s FOR SELECT TO authenticated USING (true); ' ||
      'DROP POLICY IF EXISTS %1$s_admin_write ON public.%1$s; ' ||
      'CREATE POLICY %1$s_admin_write ON public.%1$s FOR ALL TO authenticated ' ||
      'USING (public.is_current_user_admin_or_super_admin()) ' ||
      'WITH CHECK (public.is_current_user_admin_or_super_admin());',
      t
    );
  END LOOP;
END $$;
```

- [ ] **Step 2: Sanity-check the SQL**

Run: `grep -c "ENABLE ROW LEVEL SECURITY" supabase/migrations/20260801090000_parttrack_pipeline.sql`
Expected: `5`. Also visually confirm every CREATE TABLE has the `tenant_id ... DEFAULT public.current_tenant_id()` line and the file has no `TODO`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260801090000_parttrack_pipeline.sql
git commit -m "feat(parttrack): pipeline schema, rights-gate trigger, RLS"
```

**Note for executor:** the migration is applied to prod by Kevin (type `! psql ...` per the usual flow) at the end of the plan, before live testing. Do not attempt prod writes.

---

### Task 2: Worker scaffold (config, DB loop, pytest)

**Files:**
- Create: `worker/parttrack-renderer/requirements.txt`
- Create: `worker/parttrack-renderer/config.py`
- Create: `worker/parttrack-renderer/db.py`
- Create: `worker/parttrack-renderer/main.py`
- Create: `worker/parttrack-renderer/tests/test_db.py`

**Interfaces:**
- Produces: `config.SETTINGS` (dataclass: `database_url, supabase_url, service_key, soundfont_path, poll_interval_s`), `db.claim_next_job(conn) -> dict | None`, `db.finish_job(conn, job_id, error=None)`, `db.set_score_status(conn, score_id, status, error_message=None)`, `main.handle_job(conn, job)` dispatch.

- [ ] **Step 1: requirements + config**

`requirements.txt`:
```
music21==9.3.0
psycopg[binary]==3.2.*
requests==2.32.*
pytest==8.*
```

`config.py`:
```python
import os
from dataclasses import dataclass

@dataclass(frozen=True)
class Settings:
    database_url: str
    supabase_url: str          # e.g. https://supabase.gleeworld.org
    service_key: str
    soundfont_path: str        # /opt/gleeworld-parttrack/soundfonts/FluidR3_GM.sf2
    poll_interval_s: float

def load() -> Settings:
    return Settings(
        database_url=os.environ["DATABASE_URL"],
        supabase_url=os.environ["SUPABASE_URL"].rstrip("/"),
        service_key=os.environ["SUPABASE_SERVICE_KEY"],
        soundfont_path=os.environ["SOUNDFONT_PATH"],
        poll_interval_s=float(os.environ.get("POLL_INTERVAL_S", "5")),
    )
```

- [ ] **Step 2: Write failing test for job claim SQL semantics**

`tests/test_db.py` (runs only when `PARTTRACK_TEST_DATABASE_URL` is set — CI/droplet-local; otherwise skipped):
```python
import os, uuid, pytest, psycopg
from db import claim_next_job, finish_job

DSN = os.environ.get("PARTTRACK_TEST_DATABASE_URL")
pytestmark = pytest.mark.skipif(not DSN, reason="needs PARTTRACK_TEST_DATABASE_URL")

def test_claim_marks_running_and_skips_locked():
    with psycopg.connect(DSN) as conn:
        job = claim_next_job(conn)
        if job is None:
            pytest.skip("no queued jobs in test DB")
        assert job["status_was"] == "queued"
        # a second connection must not see the same job
        with psycopg.connect(DSN) as conn2:
            other = claim_next_job(conn2)
            assert other is None or other["id"] != job["id"]
        finish_job(conn, job["id"], error="test rollback")
```

- [ ] **Step 3: Implement db.py and main loop**

`db.py`:
```python
import psycopg
from psycopg.rows import dict_row

def claim_next_job(conn) -> dict | None:
    with conn.cursor(row_factory=dict_row) as cur:
        cur.execute("""
            SELECT id, tenant_id, score_id, kind, attempts, 'queued' AS status_was
            FROM gw_parttrack_jobs
            WHERE status = 'queued' AND attempts < 2
            ORDER BY created_at ASC
            LIMIT 1
            FOR UPDATE SKIP LOCKED
        """)
        job = cur.fetchone()
        if not job:
            conn.commit()
            return None
        cur.execute("""
            UPDATE gw_parttrack_jobs
            SET status = 'running', attempts = attempts + 1, started_at = now()
            WHERE id = %s
        """, (job["id"],))
        conn.commit()
        return job

def finish_job(conn, job_id, error: str | None = None):
    with conn.cursor() as cur:
        cur.execute("""
            UPDATE gw_parttrack_jobs
            SET status = %s, error_message = %s, finished_at = now()
            WHERE id = %s
        """, ("error" if error else "done", error, job_id))
    conn.commit()

def set_score_status(conn, score_id, status, error_message: str | None = None):
    with conn.cursor() as cur:
        cur.execute("""
            UPDATE gw_parttrack_scores
            SET status = %s, error_message = %s
            WHERE id = %s
        """, (status, error_message, score_id))
    conn.commit()
```

`main.py`:
```python
# gleeworld-parttrack-worker — polls gw_parttrack_jobs, runs analyze/render.
import time, traceback
import psycopg
import config, db

def handle_job(conn, job):
    # analyze/render handlers are wired in later tasks
    from analyze import run_analyze
    from orchestrate import run_render
    if job["kind"] == "analyze":
        run_analyze(conn, job)
    elif job["kind"] == "render":
        run_render(conn, job)
    else:
        raise ValueError(f"unknown job kind {job['kind']}")

def loop():
    settings = config.load()
    while True:
        try:
            with psycopg.connect(settings.database_url) as conn:
                job = db.claim_next_job(conn)
                if job is None:
                    time.sleep(settings.poll_interval_s)
                    continue
                try:
                    handle_job(conn, job)
                    db.finish_job(conn, job["id"])
                except Exception as e:
                    traceback.print_exc()
                    db.finish_job(conn, job["id"], error=str(e)[:500])
                    db.set_score_status(conn, job["score_id"], "failed", str(e)[:500])
        except Exception:
            traceback.print_exc()
            time.sleep(10)

if __name__ == "__main__":
    loop()
```

- [ ] **Step 4: Run tests (skip is a pass here)**

Run: `cd worker/parttrack-renderer && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt && .venv/bin/pytest tests/ -v`
Expected: `test_db.py` SKIPPED (no test DSN locally); no import errors. (`analyze`/`orchestrate` imports are inside `handle_job`, so main.py imports cleanly before those modules exist.)

- [ ] **Step 5: Commit**

```bash
git add worker/parttrack-renderer
git commit -m "feat(parttrack): worker scaffold with job claim loop"
```

---

### Task 3: Test fixture corpus

**Files:**
- Create: `worker/parttrack-renderer/tests/fixtures.py`
- Create: `worker/parttrack-renderer/tests/test_fixtures.py`

**Interfaces:**
- Produces: `fixtures.satb_piano() -> music21.stream.Score` (5 open-score parts named Soprano/Alto/Tenor/Bass/Piano, 8 measures, lyrics on vocals, MM=96), `fixtures.condensed_satb() -> Score` (2 staves, 2 voices each, no part names), `fixtures.no_tempo() -> Score`, `fixtures.with_repeats() -> Score` (8 written measures, one repeated section → 12 sounding), `fixtures.write_musicxml(score, path) -> str`.

- [ ] **Step 1: Write failing structural test**

`tests/test_fixtures.py`:
```python
from fixtures import satb_piano, condensed_satb, no_tempo, with_repeats

def test_satb_piano_shape():
    s = satb_piano()
    assert len(s.parts) == 5
    assert [p.partName for p in s.parts] == ["Soprano", "Alto", "Tenor", "Bass", "Piano"]
    assert len(s.parts[0].getElementsByClass("Measure")) == 8

def test_condensed_has_two_voices_per_staff():
    s = condensed_satb()
    assert len(s.parts) == 2
    m1 = s.parts[0].getElementsByClass("Measure")[0]
    assert len(m1.voices) == 2

def test_no_tempo_has_no_metronome_marks():
    assert len(no_tempo().recurse().getElementsByClass("MetronomeMark")) == 0

def test_repeats_expand_longer():
    s = with_repeats()
    assert len(s.expandRepeats().parts[0].getElementsByClass("Measure")) > \
           len(s.parts[0].getElementsByClass("Measure"))
```

- [ ] **Step 2: Run to verify failure**

Run: `.venv/bin/pytest tests/test_fixtures.py -v`
Expected: FAIL (`fixtures` not found).

- [ ] **Step 3: Implement fixtures.py**

```python
# Deterministic music21 fixture scores; no binary files in the repo.
from music21 import stream, note, clef, tempo, meter, bar, repeat, instrument

def _measures(part, pitches, lyric=None, n=8):
    for i in range(n):
        m = stream.Measure(number=i + 1)
        if i == 0:
            m.append(meter.TimeSignature("4/4"))
        for beat in range(4):
            nt = note.Note(pitches[(i + beat) % len(pitches)], quarterLength=1)
            if lyric:
                nt.lyric = lyric
            m.append(nt)
        part.append(m)
    return part

def _vocal(name, pitches, cl):
    p = stream.Part(); p.partName = name
    p.append(cl)
    return _measures(p, pitches, lyric="la")

def satb_piano():
    s = stream.Score()
    s.append(tempo.MetronomeMark(number=96))
    s.append(_vocal("Soprano", ["C5", "D5", "E5", "F5"], clef.TrebleClef()))
    s.append(_vocal("Alto", ["G4", "A4", "B4", "C5"], clef.TrebleClef()))
    s.append(_vocal("Tenor", ["C4", "D4", "E4", "F4"], clef.Treble8vbClef()))
    s.append(_vocal("Bass", ["C3", "D3", "E3", "F3"], clef.BassClef()))
    piano = stream.Part(); piano.partName = "Piano"
    piano.insert(0, instrument.Piano())
    piano.append(clef.TrebleClef())
    s.append(_measures(piano, ["C4", "E4", "G4", "C5"]))
    return s

def condensed_satb():
    s = stream.Score()
    s.append(tempo.MetronomeMark(number=90))
    for cl, hi, lo in [
        (clef.TrebleClef(), ["C5", "D5", "E5", "F5"], ["G4", "A4", "B4", "C5"]),
        (clef.BassClef(), ["C4", "D4", "E4", "F4"], ["C3", "D3", "E3", "F3"]),
    ]:
        p = stream.Part()
        p.append(cl)
        for i in range(8):
            m = stream.Measure(number=i + 1)
            if i == 0:
                m.append(meter.TimeSignature("4/4"))
            v1, v2 = stream.Voice(id="1"), stream.Voice(id="2")
            for beat in range(4):
                a = note.Note(hi[(i + beat) % 4], quarterLength=1); a.lyric = "la"
                b = note.Note(lo[(i + beat) % 4], quarterLength=1); b.lyric = "la"
                v1.append(a); v2.append(b)
            m.insert(0, v1); m.insert(0, v2)
            p.append(m)
        s.append(p)
    return s

def no_tempo():
    s = satb_piano()
    for mm in list(s.recurse().getElementsByClass("MetronomeMark")):
        mm.activeSite.remove(mm)
    return s

def with_repeats():
    s = satb_piano()
    for p in s.parts:
        ms = p.getElementsByClass("Measure")
        ms[0].leftBarline = bar.Repeat(direction="start")
        ms[3].rightBarline = bar.Repeat(direction="end")
    return s

def write_musicxml(score, path):
    score.write("musicxml", fp=str(path))
    return str(path)
```

- [ ] **Step 4: Run tests to verify pass**

Run: `.venv/bin/pytest tests/test_fixtures.py -v`
Expected: 4 PASS. If `Treble8vbClef` naming errors: the class in music21 9.x is `clef.Treble8vbClef` — if missing, use `clef.TrebleClef()` for tenor and adjust the classifier test expectation in Task 4 accordingly (tenor detection then rides on pitch range alone).

- [ ] **Step 5: Commit**

```bash
git add worker/parttrack-renderer/tests
git commit -m "test(parttrack): deterministic music21 fixture corpus"
```

---

### Task 4: Analysis — inventory, classifier, validation

**Files:**
- Create: `worker/parttrack-renderer/classify.py`
- Create: `worker/parttrack-renderer/validate.py`
- Create: `worker/parttrack-renderer/tests/test_classify.py`
- Create: `worker/parttrack-renderer/tests/test_validate.py`

**Interfaces:**
- Consumes: fixture builders from Task 3.
- Produces:
  - `classify.inventory_parts(score) -> list[PartCandidate]` where `PartCandidate` is a dataclass: `source_part_index: int, source_staff: int | None, source_voice: int | None, role: str, label: str, confidence: float`.
  - `validate.validate_score(score) -> list[dict]` — each `{"code": str, "severity": "warning", "message": str}`; codes: `measure_count_mismatch`, `no_tempo`, `range_implausible`, `repeats_unexpandable`.

- [ ] **Step 1: Write failing classifier tests**

`tests/test_classify.py`:
```python
from fixtures import satb_piano, condensed_satb
from classify import inventory_parts

def test_named_satb_piano_classified_by_name():
    cands = inventory_parts(satb_piano())
    roles = [c.role for c in cands]
    assert roles == ["soprano", "alto", "tenor", "bass", "piano"]
    assert all(c.confidence >= 0.9 for c in cands)

def test_condensed_yields_four_voice_candidates():
    cands = inventory_parts(condensed_satb())
    assert len(cands) == 4
    assert [(c.source_part_index, c.source_voice) for c in cands] == \
           [(0, 1), (0, 2), (1, 1), (1, 2)]
    # pitch-range heuristic ordering: S, A from staff 0; T, B from staff 1
    assert [c.role for c in cands] == ["soprano", "alto", "tenor", "bass"]
    assert all(c.confidence < 0.9 for c in cands)  # heuristic, needs confirmation
```

- [ ] **Step 2: Run to verify failure**

Run: `.venv/bin/pytest tests/test_classify.py -v` — Expected: FAIL (`classify` not found).

- [ ] **Step 3: Implement classify.py**

```python
from dataclasses import dataclass
from statistics import median
from music21 import clef as m21clef

NAME_ROLES = {
    "soprano": "soprano", "sop": "soprano", "s.": "soprano",
    "alto": "alto", "a.": "alto",
    "tenor": "tenor", "ten": "tenor", "t.": "tenor",
    "bass": "bass", "baritone": "bass", "b.": "bass",
    "piano": "piano", "pno": "piano", "accomp": "piano", "organ": "piano",
}

@dataclass
class PartCandidate:
    source_part_index: int
    source_staff: int | None
    source_voice: int | None
    role: str
    label: str
    confidence: float

def _role_from_name(name: str | None) -> str | None:
    if not name:
        return None
    n = name.lower()
    for key, role in NAME_ROLES.items():
        if key in n:
            return role
    return None

def _median_midi(notes) -> float | None:
    vals = [p.midi for n in notes for p in n.pitches]
    return median(vals) if vals else None

def _role_from_pitch(mid: float | None, has_lyrics: bool) -> tuple[str, float]:
    if mid is None:
        return "other", 0.3
    if not has_lyrics:
        return "piano", 0.5
    if mid >= 69: return "soprano", 0.6
    if mid >= 62: return "alto", 0.6
    if mid >= 55: return "tenor", 0.6
    return "bass", 0.6

def _voice_split_candidates(part, idx):
    out = []
    voice_ids = []
    for m in part.getElementsByClass("Measure"):
        for v in m.voices:
            if v.id not in voice_ids:
                voice_ids.append(v.id)
    for vpos, vid in enumerate(sorted(voice_ids, key=str), start=1):
        notes = [n for m in part.getElementsByClass("Measure")
                 for v in m.voices if str(v.id) == str(vid)
                 for n in v.notes]
        has_lyrics = any(n.lyric for n in notes)
        role, conf = _role_from_pitch(_median_midi(notes), has_lyrics)
        out.append(PartCandidate(idx, idx, int(vpos), role,
                                 f"Staff {idx + 1} voice {vpos}", conf))
    return out

def inventory_parts(score):
    cands = []
    for idx, part in enumerate(score.parts):
        measures = part.getElementsByClass("Measure")
        voiced = sum(1 for m in measures if len(m.voices) >= 2)
        named = _role_from_name(part.partName)
        if named:
            cands.append(PartCandidate(idx, None, None, named, part.partName, 0.95))
        elif measures and voiced / len(measures) >= 0.3:
            cands.extend(_voice_split_candidates(part, idx))
        else:
            notes = list(part.recurse().notes)
            has_lyrics = any(n.lyric for n in notes)
            role, conf = _role_from_pitch(_median_midi(notes), has_lyrics)
            cands.append(PartCandidate(idx, None, None, role,
                                       part.partName or f"Part {idx + 1}", conf))
    return cands
```

- [ ] **Step 4: Run classifier tests**

Run: `.venv/bin/pytest tests/test_classify.py -v` — Expected: 2 PASS. If the condensed test's role ordering fails, print the median MIDI per candidate and adjust the fixture pitch sets (not the thresholds) so each voice sits inside its intended range.

- [ ] **Step 5: Write failing validation tests**

`tests/test_validate.py`:
```python
from fixtures import satb_piano, no_tempo, with_repeats
from validate import validate_score

def test_clean_score_no_warnings():
    assert validate_score(satb_piano()) == []

def test_missing_tempo_warns():
    codes = [w["code"] for w in validate_score(no_tempo())]
    assert "no_tempo" in codes

def test_repeats_ok():
    assert "repeats_unexpandable" not in [w["code"] for w in validate_score(with_repeats())]
```

- [ ] **Step 6: Implement validate.py, run tests**

```python
def validate_score(score) -> list[dict]:
    warnings = []
    counts = {len(p.getElementsByClass("Measure")) for p in score.parts}
    if len(counts) > 1:
        warnings.append({"code": "measure_count_mismatch", "severity": "warning",
                         "message": f"Parts disagree on measure count: {sorted(counts)}"})
    if not score.recurse().getElementsByClass("MetronomeMark"):
        warnings.append({"code": "no_tempo", "severity": "warning",
                         "message": "No tempo marking found — rendering will assume 100 bpm."})
    try:
        score.expandRepeats()
    except Exception as e:
        warnings.append({"code": "repeats_unexpandable", "severity": "warning",
                         "message": f"Repeat structure could not be expanded: {e}"})
    return warnings
```

Run: `.venv/bin/pytest tests/ -v` — Expected: all PASS (test_db still skipped).

- [ ] **Step 7: Commit**

```bash
git add worker/parttrack-renderer
git commit -m "feat(parttrack): part classifier and score validation"
```

---

### Task 5: Render — stems, mixes, manifest

**Files:**
- Create: `worker/parttrack-renderer/render.py`
- Create: `worker/parttrack-renderer/tests/test_render.py`

**Interfaces:**
- Consumes: `PartCandidate`-shaped part rows (as dicts from DB: `role, label, source_part_index, source_voice, include`).
- Produces:
  - `render.render_stems(score, parts, timbre, workdir) -> dict[str, Path]` — role → normalized WAV path. Expands repeats, inserts MM=100 if missing, extracts voices for condensed rows.
  - `render.build_mixes(stems: dict[str, Path], workdir) -> dict[tuple, Path]` — key `(mix_preset, part_role|None)` → WAV path, per the Global Constraints gain matrix.
  - `render.encode_mp3(wav: Path) -> Path`
  - `render.build_manifest(score) -> dict` — `{"duration_ms": int, "tempo_map": [{"measure": int, "bpm": float}], "measures": [{"number": int, "seconds": float}], "rehearsal_marks": [{"measure": int, "label": str}], "beats": [{"measure": int, "count": int}]}` from the repeat-expanded score.

**Prereq:** `brew install fluid-synth ffmpeg` locally; download FluidR3_GM.sf2 to `~/.local/share/soundfonts/FluidR3_GM.sf2` and export `SOUNDFONT_PATH` before running these tests. Tests that need the binaries skip when absent.

- [ ] **Step 1: Write failing tests**

`tests/test_render.py`:
```python
import os, shutil, subprocess, wave, pytest
from pathlib import Path
from fixtures import satb_piano, no_tempo, with_repeats
from render import render_stems, build_mixes, build_manifest

HAVE_TOOLS = shutil.which("fluidsynth") and shutil.which("ffmpeg") and os.environ.get("SOUNDFONT_PATH")
needs_tools = pytest.mark.skipif(not HAVE_TOOLS, reason="needs fluidsynth+ffmpeg+SOUNDFONT_PATH")

PARTS = [
    {"role": r, "label": r.title(), "source_part_index": i, "source_voice": None, "include": True}
    for i, r in enumerate(["soprano", "alto", "tenor", "bass", "piano"])
]

def _wav_seconds(p):
    with wave.open(str(p)) as w:
        return w.getnframes() / w.getframerate()

@needs_tools
def test_stems_one_per_part_same_duration(tmp_path):
    stems = render_stems(satb_piano(), PARTS, "piano", tmp_path)
    assert set(stems) == {"soprano", "alto", "tenor", "bass", "piano"}
    secs = [_wav_seconds(p) for p in stems.values()]
    assert max(secs) - min(secs) < 0.1          # aligned stems
    assert 19 < max(secs) < 22                  # 8 bars of 4/4 at 96bpm = 20s

@needs_tools
def test_mix_count_for_satb_piano(tmp_path):
    stems = render_stems(satb_piano(), PARTS, "piano", tmp_path)
    mixes = build_mixes(stems, tmp_path)
    # 4 voices x (strong, plus_piano, alone) + full + piano_only = 14
    assert len(mixes) == 14

def test_manifest_measures_and_tempo():
    m = build_manifest(satb_piano())
    assert len(m["measures"]) == 8
    assert m["tempo_map"][0]["bpm"] == 96
    assert m["measures"][1]["seconds"] == pytest.approx(2.5, abs=0.01)  # 4 beats at 96

def test_manifest_expands_repeats():
    assert len(build_manifest(with_repeats())["measures"]) == 12

def test_manifest_defaults_missing_tempo_to_100():
    assert build_manifest(no_tempo())["tempo_map"][0]["bpm"] == 100
```

- [ ] **Step 2: Run to verify failure**

Run: `.venv/bin/pytest tests/test_render.py -v` — Expected: FAIL (`render` not found).

- [ ] **Step 3: Implement render.py**

```python
import copy, subprocess
from pathlib import Path
from music21 import tempo, instrument

GM_PROGRAMS = {"piano": 0, "oboe": 68, "choir": 52}

MIX_MATRIX = {          # (voices_gain, piano_gain, featured_gain)
    "strong":     (0.15, 0.45, 1.0),
    "plus_piano": (0.0,  0.55, 1.0),
    "alone":      (0.0,  0.0,  1.0),
}
FULL_VOICES, FULL_PIANO = 0.75, 0.6

def _prepared(score):
    s = copy.deepcopy(score)
    if not s.recurse().getElementsByClass("MetronomeMark"):
        s.insert(0, tempo.MetronomeMark(number=100))
    try:
        s = s.expandRepeats()
    except Exception:
        pass  # validated earlier; render written-through as fallback
    return s

def _extract(score, row):
    part = copy.deepcopy(score.parts[row["source_part_index"]])
    if row["source_voice"] is not None:
        split = part.voicesToParts()
        idx = min(row["source_voice"] - 1, len(split.parts) - 1)
        part = split.parts[idx]
    return part

def _run(cmd):
    subprocess.run(cmd, check=True, capture_output=True)

def render_stems(score, parts, timbre, workdir) -> dict:
    workdir = Path(workdir)
    prepared = _prepared(score)
    stems = {}
    for row in parts:
        if not row["include"]:
            continue
        part = _extract(prepared, row)
        program = GM_PROGRAMS["piano"] if row["role"] == "piano" else GM_PROGRAMS[timbre]
        for el in list(part.recurse().getElementsByClass(instrument.Instrument)):
            el.activeSite.remove(el)
        inst = instrument.instrumentFromMidiProgram(program)
        part.insert(0, inst)
        # carry the score-level tempo into the solo part so MIDI timing matches
        for mm in prepared.recurse().getElementsByClass("MetronomeMark"):
            part.insert(mm.getOffsetInHierarchy(prepared), copy.deepcopy(mm))
            break
        mid = workdir / f"{row['role']}.mid"
        raw = workdir / f"{row['role']}.raw.wav"
        out = workdir / f"{row['role']}.wav"
        part.write("midi", fp=str(mid))
        import os
        _run(["fluidsynth", "-ni", "-F", str(raw), "-r", "44100",
              os.environ["SOUNDFONT_PATH"], str(mid)])
        _run(["ffmpeg", "-y", "-i", str(raw),
              "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", "44100", str(out)])
        stems[row["role"]] = out
    return stems

def _amix(inputs_gains, out):
    cmd, filters, tags = ["ffmpeg", "-y"], [], []
    for i, (path, gain) in enumerate(inputs_gains):
        cmd += ["-i", str(path)]
        filters.append(f"[{i}:a]volume={gain}[a{i}]")
        tags.append(f"[a{i}]")
    fc = ";".join(filters) + f";{''.join(tags)}amix=inputs={len(tags)}:normalize=0[out]"
    _run(cmd + ["-filter_complex", fc, "-map", "[out]", "-ar", "44100", str(out)])
    return out

def build_mixes(stems: dict, workdir) -> dict:
    workdir = Path(workdir)
    voices = {r: p for r, p in stems.items() if r != "piano"}
    piano = stems.get("piano")
    mixes = {}
    for featured, fpath in voices.items():
        for preset, (vg, pg, fg) in MIX_MATRIX.items():
            ig = [(fpath, fg)]
            ig += [(p, vg) for r, p in voices.items() if r != featured and vg > 0]
            if piano and pg > 0:
                ig.append((piano, pg))
            mixes[(preset, featured)] = _amix(ig, workdir / f"{featured}_{preset}.wav")
    full = [(p, FULL_VOICES) for p in voices.values()]
    if piano:
        full.append((piano, FULL_PIANO))
    mixes[("full", None)] = _amix(full, workdir / "full.wav")
    if piano:
        mixes[("piano_only", None)] = _amix([(piano, 1.0)], workdir / "piano_only.wav")
    return mixes

def encode_mp3(wav: Path) -> Path:
    out = Path(wav).with_suffix(".mp3")
    _run(["ffmpeg", "-y", "-i", str(wav), "-codec:a", "libmp3lame",
          "-b:a", "192k", "-ar", "44100", str(out)])
    return out

def build_manifest(score) -> dict:
    prepared = _prepared(score)
    ref = prepared.parts[0]
    measures, marks, beats = [], [], []
    for m, sm in zip(ref.getElementsByClass("Measure"),
                     ref.getElementsByClass("Measure").secondsMap):
        measures.append({"number": m.measureNumber, "seconds": round(sm["offsetSeconds"], 3)})
        ts = m.timeSignature
        if ts:
            beats.append({"measure": m.measureNumber, "count": ts.numerator})
        for rm in m.getElementsByClass("RehearsalMark"):
            marks.append({"measure": m.measureNumber, "label": str(rm.content)})
    tempo_map = [{"measure": 1, "bpm": float(mm.number)}
                 for mm in prepared.recurse().getElementsByClass("MetronomeMark")][:1] or \
                [{"measure": 1, "bpm": 100.0}]
    dur = ref.seconds if hasattr(ref, "seconds") else measures[-1]["seconds"]
    return {"duration_ms": int(dur * 1000), "tempo_map": tempo_map,
            "measures": measures, "rehearsal_marks": marks, "beats": beats}
```

- [ ] **Step 4: Run tests, iterate on music21 API friction**

Run: `.venv/bin/pytest tests/test_render.py -v`
Expected: all PASS. Known friction points to check in order if not: (a) `secondsMap` on a `StreamIterator` — if unavailable, call `ref.secondsMap` and filter entries whose `element` is a Measure; (b) `part.seconds` raising when tempo isn't in the part — fall back to last measure seconds + measure duration; (c) fluidsynth writing stereo — fine, ffmpeg handles it.

- [ ] **Step 5: Commit**

```bash
git add worker/parttrack-renderer
git commit -m "feat(parttrack): stem rendering, mix matrix, timing manifest"
```

---

### Task 6: Storage upload + job orchestration

**Files:**
- Create: `worker/parttrack-renderer/storage.py`
- Create: `worker/parttrack-renderer/analyze.py`
- Create: `worker/parttrack-renderer/orchestrate.py`
- Create: `worker/parttrack-renderer/tests/test_storage.py`

**Interfaces:**
- Consumes: `db.set_score_status`, `classify.inventory_parts`, `validate.validate_score`, `render.*` (exact signatures above).
- Produces: `storage.download(settings, bucket, path, dest)`, `storage.upload(settings, bucket, path, local, content_type)`, `analyze.run_analyze(conn, job)`, `orchestrate.run_render(conn, job)` — the two handlers `main.handle_job` dispatches to.

- [ ] **Step 1: Write failing storage test (mocked HTTP)**

`tests/test_storage.py`:
```python
from unittest.mock import patch, MagicMock
from config import Settings
import storage

S = Settings(database_url="x", supabase_url="https://supabase.example.org",
             service_key="sk", soundfont_path="/sf.sf2", poll_interval_s=5)

def test_upload_posts_to_object_endpoint(tmp_path):
    f = tmp_path / "a.mp3"; f.write_bytes(b"abc")
    with patch("storage.requests.post") as post:
        post.return_value = MagicMock(status_code=200)
        storage.upload(S, "parttrack", "t/s/stems/a.mp3", f, "audio/mpeg")
        url = post.call_args.args[0]
        assert url == "https://supabase.example.org/storage/v1/object/parttrack/t/s/stems/a.mp3"
        assert post.call_args.kwargs["headers"]["Authorization"] == "Bearer sk"
```

- [ ] **Step 2: Run to verify failure, then implement storage.py**

Run: `.venv/bin/pytest tests/test_storage.py -v` — FAIL, then:

```python
import requests

def _headers(settings):
    return {"Authorization": f"Bearer {settings.service_key}", "apikey": settings.service_key}

def download(settings, bucket, path, dest):
    url = f"{settings.supabase_url}/storage/v1/object/{bucket}/{path}"
    r = requests.get(url, headers=_headers(settings), timeout=60)
    r.raise_for_status()
    dest.write_bytes(r.content)
    return dest

def upload(settings, bucket, path, local, content_type):
    url = f"{settings.supabase_url}/storage/v1/object/{bucket}/{path}"
    with open(local, "rb") as fh:
        r = requests.post(url, headers={**_headers(settings),
                                        "Content-Type": content_type,
                                        "x-upsert": "true"},
                          data=fh, timeout=300)
    r.raise_for_status()
```

- [ ] **Step 3: Implement analyze.py**

```python
# Analyze handler: parse source, classify parts, store inventory + warnings.
import json, tempfile
from pathlib import Path
from dataclasses import asdict
from music21 import converter
import config, db, storage
from classify import inventory_parts
from validate import validate_score

def _load_score(conn, job, settings):
    with conn.cursor() as cur:
        cur.execute("SELECT source_path, source_type FROM gw_parttrack_scores WHERE id = %s",
                    (job["score_id"],))
        source_path, source_type = cur.fetchone()
    ext = {"musicxml": ".musicxml", "mxl": ".mxl", "midi": ".mid"}[source_type]
    tmp = Path(tempfile.mkdtemp()) / f"source{ext}"
    storage.download(settings, "parttrack", source_path, tmp)
    return converter.parse(str(tmp))

def run_analyze(conn, job):
    settings = config.load()
    db.set_score_status(conn, job["score_id"], "analyzing")
    score = _load_score(conn, job, settings)
    cands = inventory_parts(score)
    warnings = validate_score(score)
    with conn.cursor() as cur:
        cur.execute("DELETE FROM gw_parttrack_parts WHERE score_id = %s", (job["score_id"],))
        for c in cands:
            cur.execute("""
                INSERT INTO gw_parttrack_parts
                  (tenant_id, score_id, source_part_index, source_staff, source_voice,
                   role, label, confidence)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (job["tenant_id"], job["score_id"], c.source_part_index, c.source_staff,
                  c.source_voice, c.role, c.label, c.confidence))
        cur.execute("""
            UPDATE gw_parttrack_scores
            SET validation_report = %s, status = 'awaiting_confirmation', error_message = NULL
            WHERE id = %s
        """, (json.dumps(warnings), job["score_id"]))
    conn.commit()
```

- [ ] **Step 4: Implement orchestrate.py**

```python
# Render handler: stems -> mixes -> mp3 -> storage -> render rows + manifest.
import json, tempfile
from pathlib import Path
from psycopg.rows import dict_row
import config, db, storage
from analyze import _load_score
from render import render_stems, build_mixes, encode_mp3, build_manifest

def run_render(conn, job):
    settings = config.load()
    db.set_score_status(conn, job["score_id"], "rendering")
    score = _load_score(conn, job, settings)
    with conn.cursor(row_factory=dict_row) as cur:
        cur.execute("""
            SELECT role, label, source_part_index, source_voice, include
            FROM gw_parttrack_parts
            WHERE score_id = %s AND confirmed AND include
            ORDER BY source_part_index, source_voice NULLS FIRST
        """, (job["score_id"],))
        parts = cur.fetchall()
        cur.execute("SELECT timbre, tenant_id FROM gw_parttrack_scores WHERE id = %s",
                    (job["score_id"],))
        row = cur.fetchone()
    if not parts:
        raise ValueError("No confirmed parts to render — confirm the part mapping first")

    workdir = Path(tempfile.mkdtemp())
    prefix = f"{row['tenant_id']}/{job['score_id']}"
    stems = render_stems(score, parts, row["timbre"], workdir)
    mixes = build_mixes(stems, workdir)
    manifest = build_manifest(score)

    with conn.cursor() as cur:
        cur.execute("DELETE FROM gw_parttrack_renders WHERE score_id = %s", (job["score_id"],))
        for role, wav in stems.items():
            mp3 = encode_mp3(wav)
            path = f"{prefix}/stems/{role}.mp3"
            storage.upload(settings, "parttrack", path, mp3, "audio/mpeg")
            cur.execute("""
                INSERT INTO gw_parttrack_renders
                  (tenant_id, score_id, kind, part_role, audio_path, duration_ms)
                VALUES (%s, %s, 'stem', %s, %s, %s)
            """, (job["tenant_id"], job["score_id"], role, path, manifest["duration_ms"]))
        for (preset, featured), wav in mixes.items():
            mp3 = encode_mp3(wav)
            name = f"{featured}_{preset}.mp3" if featured else f"{preset}.mp3"
            path = f"{prefix}/mixes/{name}"
            storage.upload(settings, "parttrack", path, mp3, "audio/mpeg")
            cur.execute("""
                INSERT INTO gw_parttrack_renders
                  (tenant_id, score_id, kind, part_role, mix_preset, audio_path, duration_ms)
                VALUES (%s, %s, 'mix', %s, %s, %s, %s)
            """, (job["tenant_id"], job["score_id"], featured, preset, path,
                  manifest["duration_ms"]))
        cur.execute("""
            UPDATE gw_parttrack_scores
            SET manifest = %s, status = 'ready', error_message = NULL
            WHERE id = %s
        """, (json.dumps(manifest), job["score_id"]))
    conn.commit()
```

- [ ] **Step 5: Run full worker test suite**

Run: `.venv/bin/pytest tests/ -v`
Expected: all PASS (db test skipped locally; render tests pass with tools installed).

- [ ] **Step 6: Commit**

```bash
git add worker/parttrack-renderer
git commit -m "feat(parttrack): analyze/render job handlers with storage upload"
```

---

### Task 7: Deployment assets

**Files:**
- Create: `worker/parttrack-renderer/gleeworld-parttrack-worker.service`
- Create: `worker/parttrack-renderer/DEPLOY.md`
- Create: `scripts/deploy-parttrack-worker.sh`

**Interfaces:**
- Consumes: env names from `config.py` (`DATABASE_URL, SUPABASE_URL, SUPABASE_SERVICE_KEY, SOUNDFONT_PATH, POLL_INTERVAL_S`).

- [ ] **Step 1: Write the systemd unit** (mirrors `worker/video-transcoder/*.service`)

```ini
[Unit]
Description=GleeWorld PartTrack Renderer
After=network-online.target supabase.target
Wants=network-online.target

[Service]
Type=simple
User=parttrack
WorkingDirectory=/opt/gleeworld-parttrack-worker
EnvironmentFile=/etc/gleeworld-parttrack-worker.env
ExecStart=/opt/gleeworld-parttrack-worker/.venv/bin/python main.py
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

- [ ] **Step 2: Write deploy script**

`scripts/deploy-parttrack-worker.sh`:
```bash
#!/usr/bin/env bash
# Deploy the PartTrack renderer worker to the droplet.
# Never uses --delete (repo rule). First-time setup steps are in DEPLOY.md.
set -euo pipefail
HOST=${1:?usage: deploy-parttrack-worker.sh user@droplet}
DEST=/opt/gleeworld-parttrack-worker

rsync -avz --exclude '.venv' --exclude '__pycache__' --exclude 'tests' \
  worker/parttrack-renderer/ "$HOST:$DEST/"

ssh "$HOST" "cd $DEST && \
  python3 -m venv .venv 2>/dev/null || true && \
  .venv/bin/pip install -q -r requirements.txt && \
  .venv/bin/python -c 'import main' && \
  sudo systemctl restart gleeworld-parttrack-worker && \
  sudo systemctl --no-pager status gleeworld-parttrack-worker | head -5"
```
(The `python -c 'import main'` is the Python equivalent of the repo's `node --check`-before-restart rule.)

- [ ] **Step 3: Write DEPLOY.md** — one-time droplet setup, verbatim:

````markdown
# PartTrack worker — one-time droplet setup

```bash
sudo useradd -r -m -d /opt/gleeworld-parttrack-worker parttrack
sudo apt-get install -y fluidsynth ffmpeg python3-venv
sudo mkdir -p /opt/gleeworld-parttrack/soundfonts
# FluidR3_GM (MIT) — copy from a trusted mirror, then:
#   /opt/gleeworld-parttrack/soundfonts/FluidR3_GM.sf2
sudo tee /etc/gleeworld-parttrack-worker.env <<'EOF'
DATABASE_URL=postgresql://postgres:<pw>@localhost:5432/postgres
SUPABASE_URL=https://supabase.gleeworld.org
SUPABASE_SERVICE_KEY=<service key from /opt/supabase/.env>
SOUNDFONT_PATH=/opt/gleeworld-parttrack/soundfonts/FluidR3_GM.sf2
POLL_INTERVAL_S=5
EOF
sudo chmod 600 /etc/gleeworld-parttrack-worker.env
sudo cp gleeworld-parttrack-worker.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable gleeworld-parttrack-worker
```
Keep the FluidR3_GM LICENSE file beside the soundfont.
````

- [ ] **Step 4: Verify + commit**

Run: `bash -n scripts/deploy-parttrack-worker.sh && chmod +x scripts/deploy-parttrack-worker.sh`
Expected: no output (syntax OK).

```bash
git add worker/parttrack-renderer/gleeworld-parttrack-worker.service worker/parttrack-renderer/DEPLOY.md scripts/deploy-parttrack-worker.sh
git commit -m "feat(parttrack): worker deploy assets"
```

---

### Task 8: Frontend data layer

**Files:**
- Create: `src/features/part-tracks/types.ts`
- Create: `src/features/part-tracks/api.ts`
- Create: `src/features/part-tracks/canGenerate.ts`
- Create: `src/features/part-tracks/__tests__/canGenerate.test.ts`

**Interfaces:**
- Produces:
  - Types: `PartTrackScore { id, sheet_music_id, source_type, status, validation_report: ValidationWarning[], manifest, timbre, error_message }`, `PartTrackPart { id, score_id, source_part_index, source_voice, role, label, confidence, confirmed, include }`, `PartTrackRights { basis, license_number }`, `PartTrackRender { id, kind, part_role, mix_preset, audio_path, duration_ms }`, `ValidationWarning { code, severity, message }`.
  - `api.getScoreForSheetMusic(sheetMusicId): Promise<PartTrackScore | null>`
  - `api.createScore(sheetMusicId, file, sourceType, userId): Promise<PartTrackScore>` — uploads to `parttrack/<tenantless client path>` via supabase.storage, inserts score row (explicit `created_by`), inserts analyze job. **Demo-tenant rule: every insert chains `.select().single()` and throws on empty.**
  - `api.updateParts(parts: Array<Pick<PartTrackPart,'id'|'role'|'label'|'include'>>): Promise<void>` — also sets `confirmed: true`.
  - `api.attestRights(scoreId, basis, licenseNumber, userId): Promise<void>`
  - `api.enqueueRender(scoreId): Promise<void>`
  - `api.listRenders(scoreId): Promise<PartTrackRender[]>`
  - `api.getLatestLicenseNumber(basis): Promise<string | null>`
  - `canGenerate(score, parts, rights, warningsAcked): { ok: boolean; reason: string | null }`

- [ ] **Step 1: Write failing canGenerate tests**

```typescript
import { describe, expect, it } from 'vitest';
import { canGenerate } from '../canGenerate';

const score = { status: 'awaiting_confirmation', validation_report: [] } as never;
const parts = [{ role: 'soprano', confirmed: true, include: true }] as never;
const rights = { basis: 'own_work', license_number: null } as never;

describe('canGenerate', () => {
  it('allows confirmed parts + rights + no warnings', () => {
    expect(canGenerate(score, parts, rights, false).ok).toBe(true);
  });
  it('blocks without rights', () => {
    const r = canGenerate(score, parts, null, false);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/rights/i);
  });
  it('blocks unconfirmed parts', () => {
    const p = [{ role: 'soprano', confirmed: false, include: true }] as never;
    expect(canGenerate(score, p, rights, false).ok).toBe(false);
  });
  it('blocks unacknowledged warnings', () => {
    const s = { ...score, validation_report: [{ code: 'no_tempo', severity: 'warning', message: 'x' }] } as never;
    expect(canGenerate(s, parts, rights, false).ok).toBe(false);
    expect(canGenerate(s, parts, rights, true).ok).toBe(true);
  });
  it('requires license number for ccli/onelicense', () => {
    const r = { basis: 'ccli', license_number: '' } as never;
    expect(canGenerate(score, parts, r, false).ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/features/part-tracks` — Expected: FAIL (module not found).

- [ ] **Step 3: Implement types.ts, canGenerate.ts, api.ts**

`canGenerate.ts`:
```typescript
import type { PartTrackScore, PartTrackPart, PartTrackRights } from './types';

export function canGenerate(
  score: PartTrackScore,
  parts: PartTrackPart[],
  rights: PartTrackRights | null,
  warningsAcked: boolean,
): { ok: boolean; reason: string | null } {
  const included = parts.filter((p) => p.include);
  if (included.length === 0) return { ok: false, reason: 'Include at least one part.' };
  if (!included.every((p) => p.confirmed)) return { ok: false, reason: 'Confirm the part mapping first.' };
  if ((score.validation_report?.length ?? 0) > 0 && !warningsAcked)
    return { ok: false, reason: 'Review and acknowledge the warnings first.' };
  if (!rights) return { ok: false, reason: 'Attest rights before generating.' };
  if ((rights.basis === 'ccli' || rights.basis === 'onelicense') && !rights.license_number?.trim())
    return { ok: false, reason: 'A license number is required for this rights basis.' };
  return { ok: true, reason: null };
}
```

`api.ts` (shape — follow `src/features/seating-charts` for supabase client import convention):
```typescript
import { supabase } from '@/integrations/supabase/client';
import type { PartTrackScore, PartTrackPart, PartTrackRender } from './types';

const EXT: Record<string, string> = { musicxml: 'musicxml', mxl: 'mxl', midi: 'mid' };

export async function getScoreForSheetMusic(sheetMusicId: string) {
  const { data, error } = await supabase
    .from('gw_parttrack_scores').select('*')
    .eq('sheet_music_id', sheetMusicId).maybeSingle();
  if (error) throw error;
  return data as PartTrackScore | null;
}

export async function createScore(
  sheetMusicId: string, file: File, sourceType: keyof typeof EXT, userId: string,
) {
  const id = crypto.randomUUID();
  const path = `uploads/${id}/source.${EXT[sourceType]}`;
  const up = await supabase.storage.from('parttrack').upload(path, file, { upsert: true });
  if (up.error) throw up.error;
  const { data, error } = await supabase.from('gw_parttrack_scores')
    .upsert(
      { id, sheet_music_id: sheetMusicId, source_type: sourceType,
        source_path: path, status: 'queued', created_by: userId },
      { onConflict: 'tenant_id,sheet_music_id' },
    )
    .select().single();          // demo tenant writes fail silently — always check
  if (error || !data) throw error ?? new Error('Score row was not created');
  const job = await supabase.from('gw_parttrack_jobs')
    .insert({ score_id: data.id, kind: 'analyze' }).select().single();
  if (job.error || !job.data) throw job.error ?? new Error('Analyze job was not created');
  return data as PartTrackScore;
}

export async function updateParts(
  parts: Array<Pick<PartTrackPart, 'id' | 'role' | 'label' | 'include'>>,
) {
  for (const p of parts) {
    const { data, error } = await supabase.from('gw_parttrack_parts')
      .update({ role: p.role, label: p.label, include: p.include, confirmed: true })
      .eq('id', p.id).select().single();
    if (error || !data) throw error ?? new Error('Part update did not persist');
  }
}

export async function attestRights(
  scoreId: string, basis: string, licenseNumber: string | null, userId: string,
) {
  const { data, error } = await supabase.from('gw_parttrack_rights')
    .upsert({ score_id: scoreId, basis, license_number: licenseNumber, attested_by: userId },
            { onConflict: 'tenant_id,score_id' })
    .select().single();
  if (error || !data) throw error ?? new Error('Rights attestation did not persist');
}

export async function enqueueRender(scoreId: string) {
  const { data, error } = await supabase.from('gw_parttrack_jobs')
    .insert({ score_id: scoreId, kind: 'render' }).select().single();
  if (error || !data) throw error ?? new Error('Render job was not created');
  const upd = await supabase.from('gw_parttrack_scores')
    .update({ status: 'rendering' }).eq('id', scoreId).select().single();
  if (upd.error) throw upd.error;
}

export async function listRenders(scoreId: string) {
  const { data, error } = await supabase.from('gw_parttrack_renders')
    .select('*').eq('score_id', scoreId).order('kind');
  if (error) throw error;
  return (data ?? []) as PartTrackRender[];
}

export async function getLatestLicenseNumber(basis: string) {
  const { data } = await supabase.from('gw_parttrack_rights')
    .select('license_number').eq('basis', basis).not('license_number', 'is', null)
    .order('attested_at', { ascending: false }).limit(1).maybeSingle();
  return data?.license_number ?? null;
}

export async function listParts(scoreId: string) {
  const { data, error } = await supabase.from('gw_parttrack_parts')
    .select('*').eq('score_id', scoreId)
    .order('source_part_index').order('source_voice', { nullsFirst: true });
  if (error) throw error;
  return (data ?? []) as PartTrackPart[];
}

export async function getRights(scoreId: string) {
  const { data, error } = await supabase.from('gw_parttrack_rights')
    .select('*').eq('score_id', scoreId).maybeSingle();
  if (error) throw error;
  return data;
}
```

`types.ts` mirrors the SQL columns exactly (write all interfaces; no `any`).

- [ ] **Step 4: Run tests + typecheck**

Run: `npx vitest run src/features/part-tracks && npx tsc --noEmit -p tsconfig.json 2>&1 | grep part-tracks`
Expected: 5 PASS; no type errors mentioning part-tracks. (If generated Supabase types don't know the new tables yet, cast table names with `as never` at the `.from()` boundary the way other pre-typegen features do — search `as never` under `src/features/` for the idiom.)

- [ ] **Step 5: Commit**

```bash
git add src/features/part-tracks
git commit -m "feat(parttrack): frontend data layer with generation gate"
```

---

### Task 9: Director dialog — upload, status, part confirmation

**Files:**
- Create: `src/features/part-tracks/PartTracksDialog.tsx`
- Create: `src/features/part-tracks/PartMappingTable.tsx`
- Create: `src/features/part-tracks/usePartTrackScore.ts`

**Interfaces:**
- Consumes: everything from Task 8's `api.ts`.
- Produces: `PartTracksDialog({ sheetMusicId, sheetMusicTitle, open, onOpenChange })`, `usePartTrackScore(sheetMusicId, open)` — returns `{ score, parts, rights, renders, refresh }` and polls every 3s while `open && score?.status` is `queued | analyzing | rendering`.

- [ ] **Step 1: Implement usePartTrackScore**

```typescript
import { useCallback, useEffect, useState } from 'react';
import * as api from './api';
import type { PartTrackScore, PartTrackPart, PartTrackRender } from './types';

const ACTIVE = new Set(['queued', 'analyzing', 'rendering']);

export function usePartTrackScore(sheetMusicId: string, open: boolean) {
  const [score, setScore] = useState<PartTrackScore | null>(null);
  const [parts, setParts] = useState<PartTrackPart[]>([]);
  const [rights, setRights] = useState<{ basis: string; license_number: string | null } | null>(null);
  const [renders, setRenders] = useState<PartTrackRender[]>([]);

  const refresh = useCallback(async () => {
    const s = await api.getScoreForSheetMusic(sheetMusicId);
    setScore(s);
    if (s) {
      const [p, r, rd] = await Promise.all([
        api.listParts(s.id), api.getRights(s.id), api.listRenders(s.id),
      ]);
      setParts(p); setRights(r); setRenders(rd);
    }
  }, [sheetMusicId]);

  useEffect(() => { if (open) void refresh(); }, [open, refresh]);
  useEffect(() => {
    if (!open || !score || !ACTIVE.has(score.status)) return;
    const t = setInterval(() => void refresh(), 3000);
    return () => clearInterval(t);
  }, [open, score, refresh]);

  return { score, parts, rights, renders, refresh };
}
```

- [ ] **Step 2: Implement PartMappingTable**

Renders one row per part: label input, role `<Select>` over the role vocabulary (Global Constraints list), include `<Switch>`, confidence badge (`<70%` amber "check me"), and for `source_voice != null` rows a caption "Staff N, voice M — from a condensed staff". Controlled component: `({ parts, onChange })` with `onChange(next: PartTrackPart[])`. Use existing `@/components/ui/*` primitives (`Table`, `Select`, `Switch`, `Badge`, `Input`); `text-sm` body, `text-xs` captions; no custom colors beyond tokens.

- [ ] **Step 3: Implement PartTracksDialog state machine**

One dialog, content switches on `score?.status`:
- `null`: upload zone (accept `.xml,.musicxml,.mxl,.mid,.midi`; infer `sourceType` from extension — `.mid|.midi → midi`, `.mxl → mxl`, else `musicxml`) + timbre note. On file: `api.createScore(...)` with the signed-in user id from the session (follow the session-access idiom used in `MyMusicTab.tsx`).
- `queued | analyzing`: spinner + "Reading the score…" (+ honest note: "usually under a minute").
- `awaiting_confirmation`: `PartMappingTable` + warnings list (each `validation_report` entry with icon + message) + "I've reviewed the warnings" checkbox (`warningsAcked` state) + rights section (Task 10) + Generate button gated by `canGenerate(...)` — disabled state shows `reason` as helper text. Save mapping via `api.updateParts`, then `api.enqueueRender(score.id)`.
- `rendering`: spinner + "Rendering stems and mixes…".
- `ready`: render list (Task 10 step 2).
- `failed`: `error_message` in a destructive Alert + "Try again" button that re-inserts an `analyze` job via `api.createScore`-less path: `supabase.from('gw_parttrack_jobs').insert({ score_id, kind: 'analyze' })` wrapped in api as `api.retryAnalyze(scoreId)` (add it to api.ts).

- [ ] **Step 4: Verify build + lint**

Run: `npx tsc --noEmit 2>&1 | grep part-tracks; npx eslint src/features/part-tracks --max-warnings 0`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/features/part-tracks
git commit -m "feat(parttrack): director dialog with part confirmation flow"
```

---

### Task 10: Rights attestation UI + results list + library mount

**Files:**
- Create: `src/features/part-tracks/RightsAttestation.tsx`
- Create: `src/features/part-tracks/RendersList.tsx`
- Modify: `src/components/music-library/MusicLibraryCard.tsx` (add menu item + dialog mount)

**Interfaces:**
- Consumes: `api.attestRights`, `api.getLatestLicenseNumber`, `api.listRenders`, `getSignedUrl` from `src/utils/storage.ts`.

- [ ] **Step 1: Implement RightsAttestation**

`({ scoreId, rights, onAttested })`: radio group over bases — labels: "My own work", "Public domain", "CCLI Rehearsal License", "OneLicense Practice-Track License", "Direct publisher permission". License-number `<Input>` appears for `ccli`/`onelicense`, prefilled from `api.getLatestLicenseNumber(basis)`. Checkbox: "I confirm this ensemble is licensed to create and share rehearsal recordings of this work." Submit calls `api.attestRights` then `onAttested()`. All `text-sm`.

- [ ] **Step 2: Implement RendersList**

`({ renders })`: two groups (Stems, Practice mixes). Each row: label (role/preset humanized: "Soprano — strong"), duration (`mm:ss` from `duration_ms`), and an `<audio controls preload="none">` whose `src` is resolved lazily on first play via `getSignedUrl('parttrack', render.audio_path, 3600)` (import from `@/utils/storage`). Download link uses the same signed URL. This is the interim listen surface until Plan 2's full player.

- [ ] **Step 3: Mount in MusicLibraryCard**

In `MusicLibraryCard.tsx`, locate the existing actions `DropdownMenu` and add:
```tsx
<DropdownMenuItem onClick={() => setPartTracksOpen(true)}>
  <AudioLines className="w-4 h-4 mr-2" />
  Part Tracks
</DropdownMenuItem>
```
plus local state + `<PartTracksDialog sheetMusicId={item.id} sheetMusicTitle={item.title} open={partTracksOpen} onOpenChange={setPartTracksOpen} />` beside the card's other dialogs. Match the icon set already imported there (lucide); follow neighboring menu items exactly.

- [ ] **Step 4: Full verification**

Run: `npx vitest run src/features/part-tracks && npx tsc --noEmit && npm run build`
Expected: tests pass; build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/features/part-tracks src/components/music-library/MusicLibraryCard.tsx
git commit -m "feat(parttrack): rights attestation, render list, library entry point"
```

---

### Task 11: End-to-end verification (with Kevin)

**Files:** none new — this is the integration gate.

- [ ] **Step 1:** Kevin applies the migration (`!` prefix, psql as postgres superuser) and confirms the five tables + bucket exist.
- [ ] **Step 2:** Run `scripts/deploy-parttrack-worker.sh` after Kevin completes `DEPLOY.md` one-time setup; confirm `systemctl status` is active and journal shows polling.
- [ ] **Step 3:** Deploy frontend via `scripts/deploy-frontend.sh` from origin/main after merge (verify fix-signature in live bundle per stale-build rule).
- [ ] **Step 4:** Live smoke: upload a real MusicXML octavo → confirm parts → attest (public domain) → generate → play a stem and a "Soprano — strong" mix in the browser; confirm audio is CORS-clean (no console errors) and signed URLs work.
- [ ] **Step 5:** Negative test: on a fresh score, attempt `enqueueRender` before attestation (temporarily via console) and confirm the DB trigger rejects it.
- [ ] **Step 6:** File follow-ups discovered during smoke as issues; update memory files; hand off to Plan 2 (player + assignments + telemetry).

---

## Self-review notes

- Spec coverage: slices 1a (Tasks 1–6), 1b (Tasks 9–10), 1c (Tasks 5–7, 11). Slices 1d–1f are Plan 2 by design. Rights-gate server-side trigger: Task 1. Condensed-staff UI: Task 9. Storage/CORS rule: Tasks 7, 10.
- Types: role vocabulary, status strings, and mix presets are identical across SQL (Task 1), Python (Tasks 4–6), and TS (Task 8) — all copied from Global Constraints.
- Known deliberate simplifications: single tempo-map entry in the manifest (multi-tempo pieces get the first mark; refine in Plan 2 if needed); `updateParts` writes serially (part counts are ≤8).
