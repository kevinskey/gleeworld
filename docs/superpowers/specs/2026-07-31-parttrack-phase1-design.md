# PartTrack Phase 1 — Design

**Date:** 2026-07-31
**Status:** Approved (brainstorm complete)
**Source:** "GleeWorld PartTrack — Product & Technical Proposal v1.0" (2026-07-31), amended against the actual codebase.

## What this is

PartTrack turns a choral score (MusicXML/MXL/MIDI) into per-part rehearsal stems and an in-browser practice player: my-part-loud mixing, solo/mute, pitch-preserved tempo slider, A-B looping, count-in, downloads, assignment by voice part, and automatic listen tracking. Phase 1 is the structured-score MVP; OMR/PDF input, sung synthesis, score-synced playback, and `.mscz` support are explicitly deferred.

Positioning: *Upload your score. Confirm the parts. Your whole choir is practicing tonight.*

## Decisions made during brainstorm

| Decision | Choice |
|---|---|
| Player location | Sheet-music detail page in Music Library (new "Part Tracks" tab). Studio stays a creation tool. |
| Tempo | Signalsmith Stretch client-side in Phase 1; render at 100% only. No pre-rendered tempo variants. |
| Inputs | `.xml`, `.mxl`, `.mid`. No `.mscz` (would require MuseScore CLI on droplet). |
| Architecture | Droplet Python worker (music21 + FluidSynth + FFmpeg) polling Postgres jobs, systemd-deployed like `worker/video-transcoder/`. |
| Player engine | Purpose-built lightweight Web Audio mixer, NOT the Studio engine. |
| Timbre | One timbre per generation (org preference: piano default; oboe, choir-aah options). Featured-part emphasis is volume-only. |
| Classifier | Rule-based only in Phase 1. Optional Claude-assist deferred. |

## Codebase facts this design builds on

- `gw_sheet_music` is the canonical library table and **already has `xml_content` and `xml_url`** columns, plus a rights model (`rights_status`, `license_mode`, `license_seat_count`, `license_expires_at`) from `20260622040000_sheet_music_rights.sql`. There is no CCLI/OneLicense number capture anywhere — PartTrack adds it.
- The old Part Tracks feature was retired 2026-07-29 (`20260729130000_drop_part_tracks.sql`); `/dashboard/part-tracks/*` redirects to Studio. PartTrack is a fresh build; the name is unclaimed.
- Worker precedent: `worker/video-transcoder/` — Node process polling Postgres by status, systemd unit, unprivileged user. PartTrack copies this shape in Python.
- There is **no sections table**. The platform's real member→section mapping is the `voice_part` text column on `gw_profiles` (see `useSectionLeaders.ts`). Assignments target `voice_part` text, optionally scoped by `gw_ensembles`.
- Storage: private buckets + signed URLs via `src/utils/storage.ts` `getSignedUrl(..., waitForReady)`, which already handles the flatten-daemon 404 window. Raw DO Spaces URLs have no CORS — everything the Web Audio mixer fetches must come through the supabase.gleeworld.org storage proxy (lesson from `gwInstruments.ts`).
- Listen telemetry precedent: `gw_sheet_music_analytics` (user_id, action_type, session_duration).
- Orphaned prototype `src/lib/score-to-mp3.ts` (client-side MusicXML→MP3) is superseded by this design; leave it untouched in Phase 1.

## 1. Architecture

Four components:

1. **Frontend** — "Part Tracks" tab on the sheet-music detail page.
   - Director view: upload/attach source file (or use the score's existing MusicXML) → part-confirmation screen → rights attestation → generate → job status.
   - Singer view: practice player + downloads + assignment status.
2. **Database** — `gw_parttrack_*` tables (Section 3). Every table: `tenant_id` with `DEFAULT current_tenant_id()`, BEFORE INSERT tenant trigger, RESTRICTIVE RLS — per platform convention.
3. **Worker** — `worker/parttrack-renderer/` (Python 3.11+; music21, psycopg; FluidSynth + FFmpeg CLIs). Polls `gw_parttrack_jobs` with `FOR UPDATE SKIP LOCKED`. Two job kinds: `analyze`, `render`. Deployed as systemd unit `gleeworld-parttrack-worker.service` under an unprivileged user. Talks to storage via the Storage HTTP API with the service key.
4. **Storage** — private `parttrack` bucket: `parttrack/<tenant_id>/<score_id>/stems/*.mp3`, `mixes/*.mp3`. Served to clients exclusively as signed URLs.

**Score status lifecycle** (on `gw_parttrack_scores.status`): `queued → analyzing → awaiting_confirmation → rendering → ready | failed`. Client polls status every ~3s while the tab is open (pattern: `check-upload-status`). No realtime publication in v1.

**Soundfonts:** FluidR3_GM (MIT) + GeneralUser GS (commercial rendering permitted; keep LICENSE.txt on file in the worker directory).

## 2. Data flow

1. Director uploads `.xml`/`.mxl`/`.mid` (or clicks "use attached MusicXML" when `gw_sheet_music.xml_content`/`xml_url` is present). Row created in `gw_parttrack_scores`, analyze job enqueued.
2. **Analyze** (worker): parse with music21 → inventory parts/staves/voices → rule-based classifier scores each candidate part on: part/instrument name, clef, median pitch, lyric presence, per-measure voice counts → writes `gw_parttrack_parts` rows (role guess + confidence) and `validation_report` jsonb → status `awaiting_confirmation`.
   - Condensed-staff detection: a 2-staff part with 2 voices per staff yields four voice-level part candidates with explicit "Voice 1 on treble staff = Soprano?" mapping surfaced in the UI.
   - Validation checks: measure-count agreement across parts, duration-vs-meter, vocal-range plausibility per assigned role, tempo presence (missing tempo → default 100 bpm + warning). Warnings block generation until acknowledged.
3. **Confirm** (director): edit roles/labels, include/exclude parts, acknowledge warnings. Roles are text matching the platform `voice_part` convention (`soprano`, `soprano_1`, `alto`, `tenor`, `bass`, `piano`, `other`).
4. **Rights gate**: attestation dialog (Section 5). A DB trigger rejects render-job inserts for scores without a rights row — the gate is server-side.
5. **Render** (worker):
   - `expandRepeats()` on the parsed score so audio and manifest agree; deep-copy before any mutation.
   - Per confirmed part: extract (music21 `voicesToParts` for condensed staves) → assign timbre program → write MIDI → `fluidsynth -ni <soundfont> part.mid -F part.wav -r 44100`.
   - Loudness-normalize stems (ffmpeg `loudnorm`) to a consistent target.
   - Mixes built from WAVs via ffmpeg `amix` (no double MP3 encode), then all files encoded to MP3 — **identical LAME parameters for every stem** so encoder delay is uniform and stems stay aligned in the mixer.
   - Upload stems + mixes; write `gw_parttrack_renders` rows; write `manifest` jsonb (measure→seconds map from the expanded timeline, rehearsal marks, tempo map, beats-per-measure); status `ready`.

**Mix matrix** (100% tempo, one timbre):

| Mix | Featured part | Other voices | Piano |
|---|---|---|---|
| {Part} Strong | 100% | 15% | 45% |
| {Part} + Piano | 100% | mute | 55% |
| {Part} Alone | 100% | mute | mute |
| Full Choir | 75% | 75% | 60% |
| Piano Only | mute | mute | 100% |

For SATB + piano: 5 stems + (3 × 4 voice mixes) + 2 ensemble mixes = **19 files** (vs ~40+ in the original proposal).

## 3. Data model

All tables `gw_`-prefixed, `tenant_id uuid DEFAULT current_tenant_id()` + BEFORE INSERT trigger + RESTRICTIVE RLS. FKs cascade from `gw_parttrack_scores`.

```sql
gw_parttrack_scores (
  id uuid pk,
  tenant_id uuid,
  sheet_music_id uuid fk -> gw_sheet_music,   -- UNIQUE (tenant_id, sheet_music_id); regeneration replaces
  source_type text,          -- musicxml | mxl | midi
  source_path text,          -- storage path of upload
  normalized_mxl_path text,
  status text,               -- queued | analyzing | awaiting_confirmation | rendering | ready | failed
  validation_report jsonb,
  manifest jsonb,            -- measure->seconds, rehearsal marks, tempo map, beats
  timbre text default 'piano',   -- piano | oboe | choir
  error_message text,
  created_by uuid, created_at, updated_at
)

gw_parttrack_parts (
  id uuid pk, tenant_id uuid, score_id uuid fk,
  source_part_index int, source_staff int, source_voice int,
  role text,                 -- voice_part convention: soprano|soprano_1|alto|tenor|bass|piano|other...
  label text,                -- director-editable display name
  confidence numeric,
  confirmed boolean default false,
  include boolean default true
)

gw_parttrack_renders (
  id uuid pk, tenant_id uuid, score_id uuid fk,
  kind text,                 -- stem | mix
  part_role text,            -- null for full/piano_only mixes
  mix_preset text,           -- strong | plus_piano | alone | full | piano_only (null for stems)
  audio_path text, duration_ms int
)

gw_parttrack_rights (
  id uuid pk, tenant_id uuid, score_id uuid fk,
  basis text,                -- own_work | public_domain | ccli | onelicense | publisher_permission | publisher_cleared
  license_number text,
  attested_by uuid, attested_at timestamptz
)

gw_parttrack_jobs (
  id uuid pk, tenant_id uuid, score_id uuid fk,
  kind text,                 -- analyze | render
  status text,               -- queued | running | done | error
  attempts int default 0,    -- max 2
  error_message text,
  created_at, started_at, finished_at
)

gw_parttrack_assignments (
  id uuid pk, tenant_id uuid, score_id uuid fk,
  ensemble_id uuid null fk -> gw_ensembles,
  voice_part text null,      -- null = all parts
  due_date date null,
  created_by uuid, created_at
)

gw_parttrack_listens (
  id uuid pk, tenant_id uuid, score_id uuid fk,
  user_id uuid,
  part_role text null,       -- featured part during the session
  mode text,                 -- player | download (download rows log the event; seconds_listened null)
  seconds_listened int null,
  tempo_pct int,
  occurred_at timestamptz
)
```

Notes:
- License-number prefill: most recent attestation with the same basis in the tenant.
- `basis = 'public_domain'` also syncs `gw_sheet_music.rights_status = 'public_domain'` if currently `unknown`.
- Listens are batched inserts (flush every 30s and on pause/unload). Director rollup is a view: per singer per score, total minutes, last practiced, matched against tenant profiles by `voice_part`.

## 4. Practice player

`PartTrackPlayer` component on the score page. Audio graph:

```
stem AudioBufferSourceNodes → per-part GainNodes → sum GainNode
  → Signalsmith Stretch AudioWorklet (one instance) → destination
```

Per-part gain is pre-sum, so tempo stretching costs one worklet regardless of part count — phone-viable. Signalsmith Stretch is MIT, on npm, WASM/AudioWorklet, served same-origin (no CSP change).

Features: per-part volume/solo/mute; "My part" preset seeded from the singer's profile `voice_part`; continuous pitch-preserved tempo slider (~50–110%); A-B loop snapped to measure boundaries from the manifest; synthesized count-in (Web Audio clicks at current tempo — no rendered count-in files); transport with measure readout. Downloads tab lists static mixes (signed URLs). iOS-webview constraint: AudioContext resumes on first user gesture.

Player fetches stems as signed URLs through the storage proxy (CORS-clean) and decodes to AudioBuffers up front; show total download size before load on cellular-class connections.

## 5. Rights gate, assignments, accountability

- **Gate:** Generate disabled until (a) all included parts confirmed, (b) warnings acknowledged, (c) rights attested. Server-side trigger on `gw_parttrack_jobs` insert (kind='render') requires a `gw_parttrack_rights` row.
- **Attestation UI:** basis picker; license-number field required for `ccli`/`onelicense`; explicit attestation checkbox with plain-language text. No verification against CCLI/OneLicense APIs (none exist to call).
- **Distribution scope:** signed URLs only; RLS restricts renders/manifest to tenant members. No public URLs.
- **Assignments:** director picks voice parts (optionally scoped to an ensemble), due date. Singers see an "assigned" chip on the score card and tab.
- **Accountability tab** (director-only): table of singers (tenant profiles matching assigned voice_part, or ensemble members) × minutes listened, last practiced, typical tempo.
- **Copy/UI:** tenant-neutral ("students", never a school name), light-theme tokens, `text-xs`/`text-sm` minimums, mobile-first (docked footer clearance).

## 6. Error handling & testing

**Errors:** worker failures → job `error`, score `failed`, human-readable `error_message` surfaced with a retry button; 2 attempts max. Analysis warnings never silently pass — acknowledged or fixed. Unparseable files fail fast with actionable messages ("this .mxl contains no parts — was it exported as audio-only?").

**Testing:**
- Worker: pytest over a fixture corpus — clean engraved SATB octavo, condensed 2-staff hymnal page, MIDI export, piece with repeats/endings, missing-tempo piece. Golden-file assertions on manifests, stem counts/durations; classifier accuracy against known-correct roles.
- Frontend: vitest for mixer gain math, loop-boundary snapping, telemetry batching.
- E2E: Playwright via the existing harness (demo@) — upload → confirm → (mocked render) → player renders and mixes.
- QA: batch-render real Lion & Lamb engraving files against known-correct parts before launch.

## Deferred (explicit non-goals for Phase 1)

OMR/PDF input; sung synthesis; Verovio score-synced playback; `.mscz`; per-mix timbres; pre-rendered tempo variants; Claude-assisted classification; publisher catalog automation; CCLI/OneLicense API verification; realtime job status; offline/PWA caching (no service worker — platform rule).

## Build slices (feeds the implementation plan)

1. **1a** Schema + RLS + job table + upload UI + analyze pipeline (worker: parse/classify/validate).
2. **1b** Confirmation UI (incl. condensed-staff voice mapping) + rights gate.
3. **1c** Render pipeline (stems, mixes, manifest, storage) + status polling.
4. **1d** Practice player (mixer, Signalsmith tempo, loop, count-in) + downloads.
5. **1e** Assignments + listen telemetry + accountability tab.
6. **1f** L&L batch generation + QA vs ground truth.
