# Studio + Part Tracks Merge — Design

**Goal.** Retire `PartTracksStudio.tsx` and its schema. Everything the Part Tracks editor did — Apple Music / YouTube backing playback, capture-from-playback into a WAV, streaming-warmup head-trim alignment, iOS native MusicKit playback, SATB voice-part templates — becomes a first-class capability of Studio. There is one editor, one data model, one session-list surface.

**Non-goals.**
- Migrating existing Part Tracks projects. All 8 rows were deleted 2026-07-29 with the user's explicit go-ahead; the retired storage rows (99 in `storage.objects`, ~24 unique files under `sheet-music/part-tracks/`) will be cleaned up out-of-band.
- Requiring a linked score. A Studio session may optionally attach a `gw_sheet_music` PDF, but no session type demands one.
- Per-track voicing metadata beyond the existing `label` + `color`. The template picker just seeds a set of tracks; after creation they are ordinary Studio tracks.

## Data model

No new tables. `accompaniment` becomes a first-class optional field on the Studio session's JSON manifest (stored at `studio/<tenant>/sessions/<id>/manifest.json`). `scoreId` joins it as an optional pointer into the existing music library.

```ts
// src/lib/studio/session/schema.ts — additions to StudioSession
type Accompaniment =
  | { kind: 'file'; title: string | null; fileUrl: string }
  | {
      kind: 'apple_music' | 'apple_music_album';
      title: string | null;
      appleMusicId: string;
      appleMusicStorefront: string;
      appleMusicArtist: string | null;
      appleMusicArtworkUrl: string | null;
    }
  | { kind: 'youtube'; title: string | null; youtubeUrl: string };

interface StudioSession {
  // ...existing fields...
  accompaniment?: Accompaniment | null;
  scoreId?: string | null;   // FK-shape reference to gw_sheet_music.id
}
```

The schema version list in `src/lib/studio/session.ts` (currently `['1.0.0', '1.1.0', '2.0.0']`, write target `'1.0.0'`) gains a new version — call it `'2.1.0'` — appended to `STUDIO_SCHEMA_VERSIONS` and set as the new `STUDIO_SCHEMA_VERSION` write target. The loader must default `accompaniment` and `scoreId` to `null` on any older version so unchanged existing sessions round-trip without error.

The Studio session index table (`gw_studio_sessions`) gets no new columns. All accompaniment/score metadata lives in the manifest so it round-trips through the existing save/load path.

## Create flow

The `/studio` **New session** dialog becomes a three-card chooser (title prompt stays on step 2, unchanged):

| Card | Behavior |
|---|---|
| **Empty session** | Blank slate. Current Studio behavior. No accompaniment lane created. |
| **Voice parts** | Pre-seeds Soprano/Alto/Tenor/Bass tracks. Then opens a backing picker (Upload / Apple Music / YouTube / skip). If skipped, the session still gets an empty Accompaniment lane the user can fill later. |
| **Custom** | Same backing picker as Voice parts, plus a checkbox list of which parts to seed (SSA / TTBB / SAB / Unison / add a solo). |

After picking backing and (optionally) attaching a score from the music library, the session is created and the editor opens.

The picker dialog that already exists in Part Tracks (`AccompanimentPicker`) moves to `src/components/studio/AccompanimentPicker.tsx` and is used verbatim.

## Editor changes

StudioEditor gains an **Accompaniment lane** — a single fixed lane at index 0 of the track list when `session.accompaniment` is non-null. It renders differently by kind:

- `file` — normal audio track (waveform, mixer strip, mute/solo, volume, pan). Behaves like any other Studio track.
- `apple_music` / `apple_music_album` / `youtube` — non-mixable **streaming lane**. Shows title/artist/artwork or the YouTube thumbnail. Plays out of band during transport; only the mic captures into part takes. The **"Capture from playback"** button (already built for Part Tracks) lives here and, on stop, uploads the resulting WAV, sets `accompaniment.kind='file'`, and flips the lane back to a normal audio track.

The editor's transport gains the alignment behavior currently unique to Part Tracks: when a streaming backing is playing during a take, `computeTakeAlignment` (already in `src/lib/audio/takeAlignment.ts`) trims the measured capture→backing-audible gap off the head of the recorded blob. When backing is `file` or `null`, the existing Studio path runs untouched.

If the session has a `scoreId`, the editor exposes a **Score** panel (PDF preview). The existing `FloatingScorePanel` component moves from `src/components/partTracks/` to `src/components/studio/`. The panel opens on demand — it isn't docked or required.

An **Attach score** action lives in the session settings menu. It opens a music-library picker (existing `gw_sheet_music` search UI) and stores the chosen id on the manifest. A **Remove score** action clears it.

## Shared plumbing (extraction)

The following pieces get extracted from `PartTracksStudio.tsx` into shared modules so StudioEditor and (during the deprecation window) the transitional shim can consume them:

- `src/lib/studio/streamingBacking/useStreamingAccompaniment.ts` — hook wrapping native MusicKit (`@/plugins/nativeMusicKit`) + the YouTube iframe postMessage protocol. Exposes `start(positionSec)`, `stop()`, `setVolume(v, muted)`, `waitForPlaying()`.
- `src/lib/studio/streamingBacking/captureFromPlayback.ts` — the stop-recording → decode → `bufferToWav` → upload flow.
- `src/components/studio/AccompanimentPicker.tsx` — moved from `src/components/partTracks/`.
- `src/components/studio/FloatingScorePanel.tsx` — moved from `src/components/partTracks/`.
- iOS audio session `.mixWithOthers` sequencing — moves into `useStreamingAccompaniment` so callers don't juggle `configureForMusicRecording` themselves.

No native (Capacitor / iOS) code changes. `nativeMusicKit`, `audioSessionConfig`, `recordingLiveActivity`, and `studioEngine` plugins already ship in the iOS binary because Part Tracks uses them; Studio inherits the same behavior.

## Routes / deprecation

- Delete `/dashboard/part-tracks` and `/dashboard/part-tracks/:projectId` routes from `src/App.tsx`.
- Add a wildcard redirect `/dashboard/part-tracks/*` → `/studio`. Trigger a one-time sonner toast on first landing: *"Part Tracks is now part of Studio."*
- Sidebar nav: remove the Part Tracks entry (or point it at `/studio` — decide during the plan).
- The chooser dialog we just shipped on `/studio` (Studio session / Part Tracks session cards) collapses back into a single "New session" flow driven by the three-card template picker described above; the current Part Tracks card's navigate-to-`/dashboard/part-tracks` behavior is removed.

## Cleanup migration

One SQL migration:

```sql
DROP TABLE IF EXISTS public.gw_part_tracks_recordings;
DROP TABLE IF EXISTS public.gw_part_tracks_tracks;
DROP TABLE IF EXISTS public.gw_part_tracks_projects;
DELETE FROM gw_billing_modules WHERE id = 'part_tracks';
```

Frontend files removed in the same PR:
- `src/components/partTracks/PartTracksStudio.tsx`
- `src/components/partTracks/AccompanimentPicker.tsx` (moved, not deleted)
- `src/components/partTracks/FloatingScorePanel.tsx` (moved, not deleted)
- `src/components/partTracks/DeviceSettings.tsx`
- `src/components/partTracks/audioEngine.ts` and `audioProcessing.ts` — audit for anything still consumed by Studio and inline what's shared, delete the rest.
- `src/components/partTracks/exportMix.ts` — Studio has its own export path; delete unless the plan finds a caller.
- `src/components/partTracks/Waveform.tsx` — Studio has its own waveform; delete unless required.
- `src/components/partTracks/__tests__/` — delete.
- `src/components/part-tracks/RecordModal.tsx` — delete.
- `src/pages/dashboard/PartTracksLandingPage.tsx`
- `src/hooks/usePartTracksProject.ts`
- `src/components/modules/PartTracksModule.tsx` — delete + remove from module registry.

The 99 stranded `storage.objects` rows under `sheet-music/part-tracks/` stay for later cleanup; no code path reads them anymore.

## Testing

**Vitest:**
- Manifest schema round-trip: legacy manifest without `accompaniment`/`scoreId` loads with both null; a manifest with each accompaniment `kind` round-trips lossless; unknown `kind` → schema error.
- Voice-part template application: seeding SATB creates 4 tracks with the expected labels + colors + `sort_order`.
- Alignment math: existing `computeTakeAlignment` tests continue to pass after the file moves (no behavioral change).

**Manual:**
- Empty session → confirm no Accompaniment lane appears; existing Studio behavior unchanged.
- Voice-parts session with uploaded MP3 backing → record 4 parts → export → the export contains 5 lanes and all vocals are aligned.
- Voice-parts session with Apple Music backing → record a take → verify the streaming-warmup head-trim moves the take start to bar 1 of the backing (within ±50ms).
- Voice-parts session with YouTube backing → tap **Capture from playback** → verify the resulting WAV replaces the streaming source and every subsequent take locks bit-perfectly.
- Attach a score from the music library → verify the Score panel opens and the PDF renders → detach → verify the panel goes away and `manifest.scoreId` clears.
- iOS build: existing Part Tracks recording flow's iOS quirks (headphone-bleed warning, `.mixWithOthers` audio session, Live Activity on the lock screen) all fire when recording in Studio with an Apple Music backing.

## Success criteria

- Studio can create a session, pick a voicing template, attach an Apple Music / YouTube / uploaded / captured backing, optionally attach a music-library score, and record parts locked to the backing.
- No route or code path references `gw_part_tracks_*` after the migration.
- iOS behaves identically to the current Part Tracks flow for equivalent workflows.
- Existing Studio sessions (with no accompaniment) open unchanged.
