# Part Tracks × Studio Shared Recording Engine — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Expand each task into a full brief (with exact code) at dispatch time from the interface notes here plus the current source.

**Goal:** Part Tracks records vocals with the same hardened capture pipeline as Studio — native AVAudioEngine capture + hardware-latency compensation on iOS, Studio's latency-trimmed recorder on web — while the backing track (Apple Music / YouTube / uploaded file) keeps playing.

**Architecture:** Extract Studio's capture + latency-trim primitives into a shared layer (`src/lib/audio/`), add an "external-source coexistence" record mode to StudioEnginePlugin (`.playAndRecord` + `.mixWithOthers`, never seizing exclusive focus, MusicKit-aware no-op), and swap Part Tracks' MediaRecorder path onto it. Part Tracks keeps its own UI, project model, storage bucket, and `record_offset_sec` timeline; only capture, count-in timing, and latency math move to the shared engine.

**Non-goals:** No change to Studio's exclusive-focus behavior in Studio sessions; no YouTube timing improvements beyond explicit "best-effort" labeling (the iframe API gives no trustworthy audible-now signal); no storage migration.

## Global Constraints
- Studio's existing behavior must be bit-identical: its engine keeps exclusive `.playback` focus in Studio sessions (Engine.swift design comment stands).
- Apple-Music-backed recording MUST NOT reconfigure the AVAudioSession when MPMusicPlayerController owns it (today's guard in PartTracksStudio.tsx:862-872 carries over).
- All recorded-take writes stay in bucket `sheet-music` under `part-tracks/<project_id>/…` (public) — the shared finalize step returns a blob/file handle; the caller owns persistence.
- `text-xs` floor, tokens only, tenant-neutral copy.
- Every task's covering tests run before commit; simulator smoke for plugin changes; ON-DEVICE checklist (Kevin's iPhone) gates the final merge because MusicKit + mic coexistence cannot be simulated.

### Task 1: Extract shared web recorder + latency trim
Create `src/lib/audio/sharedRecorder.ts` from Studio's `engine/recorder.ts` + `finalizeRecordingBlob` (StudioEditor.tsx:159-197): `openMicRecorder(constraints)`, `startTake()`, `stopTake() → Blob`, `trimHeadLatency(blob, ms) → Blob` (sample-accurate decode/trim/re-encode WAV), `getConfiguredInputLatencyMs()` (localStorage `studio.inputLatencyMs`, default 700) + `AudioContext.outputLatency`. Studio's editor re-imports from the shared module (no behavior change; its tests prove it). Unit tests: trim math on a synthetic buffer.

### Task 2: Part Tracks web path adopts the shared recorder
Replace `audioEngine.ts:517-643` MediaRecorder plumbing with sharedRecorder, preserving Part Tracks' constraints (mono 48k, music-mode toggle disabling AEC/NS/AGC, mime probing) via the constraints param. Apply `trimHeadLatency` to every finished take before upload — Part Tracks gains latency compensation it never had. `record_offset_sec` semantics unchanged (offset captured at record-start stays). Keep blob-based immediate playback (CDN-race dodge). Tests: existing part-tracks unit tests + a new trim-application test.

### Task 3: StudioEnginePlugin coexistence record mode (iOS)
New plugin methods, additive only:
- `prepareExternalRecordSession({ mixWithOthers: boolean, musicKitOwnsSession: boolean })` — sets `.playAndRecord` + `.mixWithOthers` + `.defaultToSpeaker`/`allowBluetoothA2DP`; complete no-op when `musicKitOwnsSession` (mirrors today's guard).
- `externalRecordStart({ countInBeats, secondsPerBeat }) → { startedAtEpochMs, hardwareLatencyMs }` — native count-in clicks (reuse Studio's click source) then AVAudioEngine input-node tap → WAV file, WITHOUT starting Studio transport or touching other audio.
- `externalRecordStop() → { fileUri, durationSec }`.
Must not regress Studio: `prepareRecordSession`/`recordWithCountIn` untouched; add a Debug self-test (env-gated, matching the existing harness pattern) that runs both modes back-to-back.

### Task 4: Part Tracks iOS uses native capture
In PartTracksStudio record flow: when `isNativeStudioAvailable()`, call Task-3 methods instead of getUserMedia/MediaRecorder; anchor `record_offset_sec` against `startedAtEpochMs` and subtract `hardwareLatencyMs` from the placed offset. Apple Music path passes `musicKitOwnsSession: true`; YouTube/upload pass `mixWithOthers: true`. Web fallback (Task 2 path) retained for non-iOS. AudioSessionConfigPlugin calls removed where superseded, kept for Live Activity. Fetch take from `fileUri` (Filesystem read → blob) for the immediate-playback path.

### Task 5: Headphone/bleed guard
Shared helper `getAudioRoute()` (native: AVAudioSession currentRoute via new plugin getter; web: mediaDevices enumeration heuristics). When recording starts over speakers with echo-cancellation off, show a dismissible inline warning ("Wear headphones — the backing track will bleed into your recording"). Copy tenant-neutral, text-sm.

### Task 6: Regression + on-device gate
- Simulator: Studio smoke (metronome self-test harness), Part Tracks upload-file record path end-to-end with fake mic (Playwright recipe from the E2E memory works on web preview).
- ON-DEVICE checklist (Kevin, TestFlight build): record over (a) uploaded mp3, (b) Apple Music, (c) YouTube — each with AirPods and with speaker; verify backing keeps playing, take aligns (clap test), Studio still records normally afterward.
- WEB clap test too (desktop Chrome + iPhone Safari, uploaded-mp3 backing): Task 2's head-trim borrows Studio's 700ms default via a Part-Tracks-specific key ('partTracks.inputLatencyMs') — the clap test calibrates whether that constant fits this pipeline; adjust the default in audioEngine.ts if takes land early/late.
- Final whole-branch review (opus) before PR.
