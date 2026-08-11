# PartTrack MusicXML round-trip — design

Approved by Kevin 2026-08-11 (conversation; "Download + re-upload" chosen over
in-app editing, which the single-staff notation editor cannot support).

## Problem

OMR output has recognition errors. Directors need to pull the recognized
MusicXML out, fix it in a real editor (MuseScore/Finale/Sibelius), and feed the
corrected file back — without deleting the project or re-attesting rights.

## Design

**Download (admin-only).** "Download MusicXML" on the confirm and ready panels.
Signs a URL for `normalized_mxl_path ?? source_path` (the OMR-normalized `.mxl`
when one exists, else the uploaded source) and clicks a temporary
`<a download>` — the same signed-URL pattern `RendersList` uses. Admin-gated:
editable engraving files are a rights problem in student hands.

**Replace (admin-only).** "Replace with corrected file" accepts
`.xml`/`.musicxml`/`.mxl` only (no PDF — corrections are already engraved).
`api.replaceSource(scoreId, file, sourceType)`:

1. Upload to `uploads/<scoreId>/source-<random>.<ext>` (fresh path — never
   overwrite the old source mid-pipeline).
2. Update the score row: new `source_path` + `source_type`,
   `normalized_mxl_path = NULL` (this is what makes the worker re-parse instead
   of short-circuiting to the stale OMR output), `status = 'queued'`,
   `error_message = NULL`. Chained `.select()` per repo rule.
3. Insert an `analyze` job.

The existing analyze handler wipes and rebuilds `gw_parttrack_parts`, so the
corrected file flows through the normal confirm → attest (already attested) →
generate path. `tempo_override_bpm` and the rights row live on the score and
survive. `omr_beta` clears because `source_type` is no longer `pdf_omr`.

**No worker changes.**

## Rejected

- In-app editing: notation editor is single-staff by spec; octavos need grand
  staff + multi-part. Separate project.
- Overwriting the original source path in place: a worker that already claimed
  a job could read the half-written file.

## Testing

- vitest `scoreFile.ts`: extension → replace source type (mxl/xml/musicxml,
  rejects pdf/mid/junk); editable-path preference (normalized wins, source
  falls back).
- vitest `api.replaceSource` with a mocked supabase client: asserts
  `normalized_mxl_path` nulled + status queued in the update, analyze job
  inserted after the row update, upload path differs from the old source.
