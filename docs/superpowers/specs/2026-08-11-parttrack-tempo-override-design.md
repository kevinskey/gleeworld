# PartTrack tempo override — design

Approved by Kevin 2026-08-11 (conversation; design presented and accepted verbatim).

## Problem

Audiveris OMR frequently drops tempo markings (`no_tempo` warning), so PDF-derived
scores render at the hardcoded 100 bpm fallback. Directors need to set the tempo
before generating.

## Design

**Database.** Nullable `tempo_override_bpm` integer on `gw_parttrack_scores`,
`CHECK (tempo_override_bpm BETWEEN 20 AND 300)`. Lives on the score so re-generates
inherit it; clearing it restores the score's own tempo.

**Confirm screen** (`PartTracksDialog`, `awaiting_confirmation` state). A small
"Tempo (BPM)" number input above the Generate button. Helper text depends on the
analysis: when `validation_report` contains `no_tempo`, "No tempo was found in the
score — tracks will render at this speed (default 100 BPM)"; otherwise "Optional —
leave blank to use the score's own tempo." The value is written to the score row
in `api.enqueueRender` *before* the render job row is inserted (the worker reads
the scores row at render time, so the update must land first).

**Worker.** `_prepared()` in `render.py` is the single seam both `render_stems`
and `build_manifest` flow through. It gains an `override_bpm` parameter: when set,
strip every existing `MetronomeMark` from the deep copy and insert one
`MetronomeMark(number=override_bpm)` at offset 0 — stems, mixes, and the manifest
`tempo_map` all follow automatically. `orchestrate.run_render` selects the new
column and threads it through. No player changes.

## Rejected alternatives

- BPM as one-shot job parameter: doesn't survive re-generates; jobs table has no
  payload column.
- Post-render audio time-stretch: degrades quality, desyncs manifest math.

## Scope

Generate-time only. Changing tempo on a `ready` score means re-generating (existing
behavior for any confirm-screen change). Live playback speed already exists in the
player via the stretch engine; this fixes the baseline speed of rendered files.

## Testing

- Worker (pytest, no-tools tier): `_prepared` override strips-and-replaces marks;
  `build_manifest` override wins over an existing score tempo and over the 100 bpm
  fallback.
- Frontend (vitest): BPM input parsing/validation helper (empty → null, integer
  20–300 → value, junk/out-of-range → invalid).
