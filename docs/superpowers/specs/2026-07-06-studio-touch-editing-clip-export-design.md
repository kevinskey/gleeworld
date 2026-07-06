# Studio Touch Editing + Clip MP3 Export — Design Spec (Sub-project A)

**Date:** 2026-07-06
**Status:** Approved (brainstorm with Kevin)
**Parent effort:** Studio DAW expansion. Sub-project B (Mixer & Mastering page, "Mix + Master strip" scope) is specced separately after DAW-standards research completes.
**Surface:** `src/pages/studio/StudioEditor.tsx` + new `src/lib/audio/mp3Encode.ts` (+ worker)

## Goal

Make the clip editing that already exists on desktop (split at playhead `B`, delete `Del`) reachable on touch devices, and add per-clip MP3 export — via a selection action bar that appears when a clip is selected.

## Current state (verified in code)

- Split-at-playhead exists: `B` key handler on the selected clip (StudioEditor ~line 1155).
- Clip delete exists: `Del` key. Track delete already touch-accessible (strip trash + per-track sheet).
- Full-session Mixdown→WAV exists (`useMixdown`, `mixdown.ts`, `audioBufferToWavBlob`).
- lamejs already a dependency (`@breezystack/lamejs` 1.2.7 — use this one; the older `lamejs` 1.2.1 dependency is legacy, do not import it in new code).

## Design

### Selection action bar

- Renders while exactly one clip is selected (`selectedClip != null`), floating above the timeline area, centered, `z` above lanes but below dialogs: capsule container, glass (`bg-card/75 backdrop-blur-xl border border-border/40 rounded-full`), three actions, each ≥44pt touch target, tint-colored icons + 13px labels:
  1. **Split** — invokes the same logic as the `B` handler (extract that handler body into `splitSelectedClipAtPlayhead()` so key and button share one path). Disabled state mirrors the key handler's guard (playhead must intersect the selected clip's span).
  2. **Export MP3** — see pipeline below. Shows a spinner in-place while rendering/encoding; disabled meanwhile.
  3. **Delete** — same path as the `Del` key handler (extract to `deleteSelectedClip()`); confirm dialog NOT required (undo via ⌘Z / existing history covers it — matches Logic behavior).
- Keyboard shortcuts unchanged. Desktop sees the same bar (harmless, useful).
- Bar placement (amended post-review): renders IN-FLOW above the add-track row (upgrading the pre-existing phone-only bar in place) rather than as a fixed overlay — avoids any overlap with the Inspector rail/Smart Controls and reuses shipped code; accepted trade-off is a small layout reflow on select/deselect.

### Per-clip MP3 export pipeline

1. Resolve the selected clip's asset buffer (existing asset cache / `getAssetUrl` + decode path used by playback).
2. Render clip through `OfflineAudioContext`: length = `clip.duration_seconds`, sample rate = asset's rate; apply `offset_seconds`, `gain_db`, fade-in/out (linear ramps, same semantics as playback engine), `reverse` and `pitch_semitones`/`time_stretch` if set (if the playback engine applies these via player options, reuse the same code path; if that proves impractical, v1 exports the un-stretched audio and the spec notes it — decide in the plan after reading engine.ts).
3. Encode to MP3 320 kbps CBR via `@breezystack/lamejs` **in a Web Worker** (`src/lib/audio/mp3Encode.worker.ts` + `mp3Encode.ts` wrapper that transfers Float32 channel data and returns a Blob). Mono assets encode mono; stereo as joint stereo.
4. Download as `<track name> — <clip source filename>.mp3` (sanitized), via the same object-URL download used by Mixdown (works in Safari/WKWebView via share sheet).
5. Errors surface as a toast with the failure reason; the bar returns to idle.

### Non-goals (v1)

- Multi-clip selection/export (one clip at a time — matches "highlighted clip").
- Export format options (fixed MP3 320; Mixdown still covers WAV; format pickers arrive with Sub-project B's export presets).
- Changing selection mechanics or adding gestures.

## Error handling

- Asset not yet uploaded/cached (provisional take): export uses the local blob URL exactly as playback does — works offline; if decode fails, toast "Take is still processing, try again in a moment."
- Very long clips: worker encoding keeps UI responsive; no hard cap in v1 (a 10-min clip ≈ 23 MB MP3, fine).
- iOS WKWebView: verify the download path via the existing Mixdown mechanism (already proven there).

## Testing

- Unit: mp3Encode wrapper — encodes a generated 1s sine Float32 buffer, asserts non-empty Blob with `audio/mpeg` type and plausible size; worker message protocol.
- Unit: splitSelectedClipAtPlayhead extraction — pure clip math (split point inside span → two clips with correct start/offset/duration; at edges → no-op), factored to be testable without DOM.
- Manual on preview: select clip → bar appears; split on iPad (touch); delete; export MP3 and play the file; keyboard B/Del still work; bar hidden when nothing selected.
