# Studio + Part Tracks Merge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retire the Part Tracks editor and merge every capability it had (external streaming backing, capture-from-playback, streaming-warmup head-trim, SATB voice-part templates, optional score attach) into Studio, so there is one editor and one data model.

**Architecture:** The Studio session manifest gains an optional `accompaniment` field (file / Apple Music / Apple Music album / YouTube) and an optional `scoreId` pointer. Studio's audio engine consumes shared `useStreamingAccompaniment` + `captureFromPlayback` helpers extracted from `PartTracksStudio.tsx`. All Part Tracks routes, files, and DB tables are deleted in the final task.

**Tech Stack:** React 18 + TypeScript + Vite + TanStack Query · Supabase (self-hosted) · Capacitor 7 (Apple Music via native MusicKit plugin) · vitest for unit tests.

## Global Constraints

- Schema version list in `src/lib/studio/session.ts` grows to `['1.0.0', '1.1.0', '2.0.0', '2.1.0']`. Write target `STUDIO_SCHEMA_VERSION = '2.1.0'`. Older manifests load with `accompaniment` and `scoreId` defaulted to `null`.
- Manifest is JSON at `studio/<tenant_id>/sessions/<session_id>/manifest.json`. No new DB columns; `accompaniment` and `scoreId` live in the manifest.
- No `gw_part_tracks_*` reference may remain after Task 9 — grep-clean.
- No native iOS code changes. Capacitor plugins already ship (`nativeMusicKit`, `audioSessionConfig`, `recordingLiveActivity`, `studioEngine`).
- Streaming backing is playback-only. Only the singer's mic is captured into part takes. Capture-from-playback is the sole path that produces a mixable file.
- All new files under `src/lib/studio/streamingBacking/` and `src/components/studio/` for shared plumbing. Legacy `src/components/partTracks/` and `src/components/part-tracks/` disappear in the final task.
- `Head-trim alignment` uses the existing `computeTakeAlignment` from `src/lib/audio/takeAlignment.ts` — do not reimplement.
- Existing Studio session manifests must open unchanged after the schema bump. Regression: opening a plain empty session on the current branch must produce identical behavior after this plan lands.

---

## File Structure

**Created:**
- `src/lib/studio/streamingBacking/useStreamingAccompaniment.ts` — hook wrapping native MusicKit + YouTube iframe.
- `src/lib/studio/streamingBacking/captureFromPlayback.ts` — pure helper: MediaRecorder blob → decoded AudioBuffer → WAV → Supabase upload.
- `src/lib/studio/streamingBacking/__tests__/useStreamingAccompaniment.test.ts` — unit tests.
- `src/lib/studio/streamingBacking/__tests__/captureFromPlayback.test.ts` — unit tests.
- `src/components/studio/AccompanimentPicker.tsx` — moved from `src/components/partTracks/AccompanimentPicker.tsx`.
- `src/components/studio/FloatingScorePanel.tsx` — moved from `src/components/partTracks/FloatingScorePanel.tsx`.
- `src/components/studio/AccompanimentLane.tsx` — the fixed lane 0 renderer for the Studio Editor.
- `src/components/studio/AttachScoreDialog.tsx` — music-library picker for `scoreId`.
- `supabase/migrations/20260729130000_drop_part_tracks.sql` — the cleanup migration.

**Modified:**
- `src/lib/studio/session.ts` — schema types, versions.
- `src/lib/studio/defaults.ts` — write STUDIO_SCHEMA_VERSION = '2.1.0'.
- `src/lib/studio/validate.ts` — validate `accompaniment` shape + `scoreId` string.
- `src/lib/studio/session/schema.test.ts` (or create if absent) — round-trip tests.
- `src/pages/studio/StudioHome.tsx` — three-card create dialog.
- `src/pages/studio/StudioEditor.tsx` — mount `AccompanimentLane`, wire streaming backing during transport, add "Attach score" action, mount `FloatingScorePanel` when `scoreId` set, apply head-trim on take save when a streaming backing was active.
- `src/App.tsx` — remove Part Tracks routes; add `<Route path="/dashboard/part-tracks/*" element={<Navigate to="/studio" replace />} />` with a one-time toast.
- `src/lib/navigation/navCatalog.ts` — remove Part Tracks nav entry.

**Deleted (in the final task):**
- `src/components/partTracks/PartTracksStudio.tsx`
- `src/components/partTracks/AccompanimentPicker.tsx` (after move)
- `src/components/partTracks/FloatingScorePanel.tsx` (after move)
- `src/components/partTracks/DeviceSettings.tsx`
- `src/components/partTracks/audioEngine.ts`
- `src/components/partTracks/audioProcessing.ts`
- `src/components/partTracks/exportMix.ts`
- `src/components/partTracks/Waveform.tsx`
- `src/components/partTracks/__tests__/` (whole directory)
- `src/components/part-tracks/RecordModal.tsx`
- `src/pages/dashboard/PartTracksLandingPage.tsx`
- `src/hooks/usePartTracksProject.ts`
- `src/components/modules/PartTracksModule.tsx`

---

## Task 1: Manifest schema — add `accompaniment` and `scoreId`

**Files:**
- Modify: `src/lib/studio/session.ts` (STUDIO_SCHEMA_VERSIONS + STUDIO_SCHEMA_VERSION + Session interface)
- Modify: `src/lib/studio/validate.ts` (validate new fields)
- Modify: `src/lib/studio/defaults.ts` (schema_version now `'2.1.0'`)
- Create: `src/lib/studio/__tests__/accompanimentSchema.test.ts`

**Interfaces:**
- Consumes: existing `Session`, `STUDIO_SCHEMA_VERSIONS`, `validateSession()`.
- Produces:
  - `type Accompaniment = FileAccompaniment | AppleMusicAccompaniment | AppleMusicAlbumAccompaniment | YouTubeAccompaniment`
  - `Session.accompaniment?: Accompaniment | null`
  - `Session.scoreId?: string | null`
  - `STUDIO_SCHEMA_VERSION: '2.1.0'`

- [ ] **Step 1: Write the failing schema-round-trip test**

Create `src/lib/studio/__tests__/accompanimentSchema.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { validateSession, type Session, type Accompaniment } from '@/lib/studio/session';
import { validateSession as runValidate } from '@/lib/studio/validate';
import { blankSession } from '@/lib/studio/defaults';

function fresh(): Session {
  return blankSession({
    id: 's1',
    ownerUserId: 'u1',
    tenantId: 't1',
    title: 'Test',
  });
}

describe('accompaniment schema', () => {
  it('defaults accompaniment and scoreId to null on a blank session', () => {
    const s = fresh();
    expect(s.accompaniment ?? null).toBeNull();
    expect(s.scoreId ?? null).toBeNull();
    expect(runValidate(s).errors).toEqual([]);
  });

  it('accepts a file accompaniment', () => {
    const s = fresh();
    const acc: Accompaniment = {
      kind: 'file',
      title: 'Backing.mp3',
      fileUrl: 'https://example.com/a.mp3',
    };
    s.accompaniment = acc;
    expect(runValidate(s).errors).toEqual([]);
  });

  it('accepts an apple_music accompaniment with all required fields', () => {
    const s = fresh();
    s.accompaniment = {
      kind: 'apple_music',
      title: 'Song · Artist',
      appleMusicId: '1234567',
      appleMusicStorefront: 'us',
      appleMusicArtist: 'Artist',
      appleMusicArtworkUrl: 'https://example.com/art.jpg',
    };
    expect(runValidate(s).errors).toEqual([]);
  });

  it('rejects apple_music missing appleMusicId', () => {
    const s = fresh();
    s.accompaniment = {
      kind: 'apple_music',
      title: null,
      appleMusicId: '',
      appleMusicStorefront: 'us',
      appleMusicArtist: null,
      appleMusicArtworkUrl: null,
    };
    expect(runValidate(s).errors.length).toBeGreaterThan(0);
  });

  it('accepts a youtube accompaniment', () => {
    const s = fresh();
    s.accompaniment = {
      kind: 'youtube',
      title: 'Live rehearsal',
      youtubeUrl: 'https://www.youtube.com/watch?v=abc123',
    };
    expect(runValidate(s).errors).toEqual([]);
  });

  it('accepts a string scoreId', () => {
    const s = fresh();
    s.scoreId = '00000000-0000-0000-0000-000000000001';
    expect(runValidate(s).errors).toEqual([]);
  });

  it('rejects a non-string scoreId', () => {
    const s = fresh();
    (s as any).scoreId = 42;
    expect(runValidate(s).errors.length).toBeGreaterThan(0);
  });

  it('stamps schema_version=2.1.0 on new sessions', () => {
    const s = fresh();
    expect(s.schema_version).toBe('2.1.0');
  });

  it('loads a legacy 1.0.0 manifest without accompaniment or scoreId as-is', () => {
    const legacy: Session = { ...fresh(), schema_version: '1.0.0' } as Session;
    delete (legacy as any).accompaniment;
    delete (legacy as any).scoreId;
    expect(runValidate(legacy).errors).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test — expect failures**

```
npx vitest run src/lib/studio/__tests__/accompanimentSchema.test.ts
```

Expected: multiple failures (schema_version still `'1.0.0'`, `accompaniment` field not on Session, no validator for it).

- [ ] **Step 3: Extend `src/lib/studio/session.ts`**

Add above the existing `Session` interface (after `MASTER_BUS_ID`):

```ts
export type Accompaniment =
  | {
      kind: 'file';
      title: string | null;
      fileUrl: string;
    }
  | {
      kind: 'apple_music' | 'apple_music_album';
      title: string | null;
      appleMusicId: string;
      appleMusicStorefront: string;
      appleMusicArtist: string | null;
      appleMusicArtworkUrl: string | null;
    }
  | {
      kind: 'youtube';
      title: string | null;
      youtubeUrl: string;
    };
```

Update `STUDIO_SCHEMA_VERSIONS`:

```ts
export const STUDIO_SCHEMA_VERSIONS = ['1.0.0', '1.1.0', '2.0.0', '2.1.0'] as const;
```

Update `STUDIO_SCHEMA_VERSION` (write target):

```ts
export const STUDIO_SCHEMA_VERSION: StudioSchemaVersion = '2.1.0';
```

Add these fields to `Session`:

```ts
  accompaniment?: Accompaniment | null;
  scoreId?: string | null;
```

- [ ] **Step 4: Extend `src/lib/studio/validate.ts` — validate the new fields**

Inside `validateSession()`, after the existing shape checks, add:

```ts
if (s.accompaniment != null) {
  const a = s.accompaniment as Partial<Accompaniment>;
  if (!a.kind || !['file', 'apple_music', 'apple_music_album', 'youtube'].includes(a.kind)) {
    errors.push(`accompaniment.kind invalid: ${String(a.kind)}`);
  } else if (a.kind === 'file') {
    if (typeof (a as any).fileUrl !== 'string' || !(a as any).fileUrl) {
      errors.push('accompaniment.fileUrl required when kind=file');
    }
  } else if (a.kind === 'apple_music' || a.kind === 'apple_music_album') {
    if (typeof (a as any).appleMusicId !== 'string' || !(a as any).appleMusicId) {
      errors.push('accompaniment.appleMusicId required when kind=apple_music*');
    }
    if (typeof (a as any).appleMusicStorefront !== 'string' || !(a as any).appleMusicStorefront) {
      errors.push('accompaniment.appleMusicStorefront required');
    }
  } else if (a.kind === 'youtube') {
    if (typeof (a as any).youtubeUrl !== 'string' || !(a as any).youtubeUrl) {
      errors.push('accompaniment.youtubeUrl required when kind=youtube');
    }
  }
}
if (s.scoreId != null && typeof s.scoreId !== 'string') {
  errors.push(`scoreId must be a string or null, got ${typeof s.scoreId}`);
}
```

Import `Accompaniment` at the top of `validate.ts` alongside the existing `Session` import.

- [ ] **Step 5: Update `src/lib/studio/defaults.ts` — write the new schema_version**

Replace the `schema_version` field in `blankSession()`:

```ts
schema_version: STUDIO_SCHEMA_VERSION,  // now '2.1.0'
```

(Already reads the constant — no code change if it does. Verify with `grep -n schema_version src/lib/studio/defaults.ts`. If it hard-codes `'1.0.0'`, replace with `STUDIO_SCHEMA_VERSION`.)

Do NOT add `accompaniment` / `scoreId` to `blankSession()` — they're optional and callers set them.

- [ ] **Step 6: Run the tests — verify pass**

```
npx vitest run src/lib/studio/__tests__/accompanimentSchema.test.ts
```

Expected: all pass.

- [ ] **Step 7: Typecheck-guard**

```
npm run typecheck:guard
```

Expected: no new errors.

- [ ] **Step 8: Commit**

```bash
git add src/lib/studio/session.ts src/lib/studio/validate.ts src/lib/studio/defaults.ts src/lib/studio/__tests__/accompanimentSchema.test.ts
git commit -m "feat(studio): accompaniment + scoreId on manifest (schema v2.1.0)"
```

---

## Task 2: Extract `useStreamingAccompaniment` hook

**Files:**
- Create: `src/lib/studio/streamingBacking/useStreamingAccompaniment.ts`
- Create: `src/lib/studio/streamingBacking/__tests__/useStreamingAccompaniment.test.ts`
- Read (do not modify): `src/components/partTracks/PartTracksStudio.tsx` (source of truth for behavior)

**Interfaces:**
- Consumes: `Accompaniment` from Task 1; existing plugin modules `@/plugins/nativeMusicKit`, `@/utils/youtubeUtils`, `@/lib/musicKit`.
- Produces:
  ```ts
  interface StreamingAccompanimentHandle {
    start(positionSec: number): Promise<{ backingAudibleWallMs: number }>;
    stop(): void;
    setVolume(volume: number, muted: boolean): void;
    waitForPlaying(): Promise<boolean>;
    /** Present only for YouTube; parent sets on the <iframe> ref. */
    ytIframeRef: React.MutableRefObject<HTMLIFrameElement | null>;
  }
  export function useStreamingAccompaniment(
    accompaniment: Accompaniment | null | undefined,
  ): StreamingAccompanimentHandle;
  ```

- [ ] **Step 1: Write the failing test**

Create `src/lib/studio/streamingBacking/__tests__/useStreamingAccompaniment.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStreamingAccompaniment } from '../useStreamingAccompaniment';

vi.mock('@/plugins/nativeMusicKit', () => ({
  isNativeMusicKitAvailable: vi.fn(() => false),
  nmkRequestAuthorization: vi.fn(),
  nmkSetQueueSong: vi.fn(),
  nmkSetQueueAlbum: vi.fn(),
  nmkPlay: vi.fn(),
  nmkPause: vi.fn(),
  nmkStop: vi.fn(),
  nmkSeek: vi.fn(),
  nmkWaitForPlaying: vi.fn(async () => true),
}));

vi.mock('@/lib/musicKit', () => ({
  getMusicKit: vi.fn(),
  authorizeAppleMusic: vi.fn(),
  isAppleMusicAuthorized: vi.fn(async () => true),
}));

describe('useStreamingAccompaniment', () => {
  beforeEach(() => vi.clearAllMocks());

  it('start() is a no-op when accompaniment is null', async () => {
    const { result } = renderHook(() => useStreamingAccompaniment(null));
    await act(async () => {
      const r = await result.current.start(0);
      expect(r.backingAudibleWallMs).toBeGreaterThan(0);
    });
    // No plugin calls
    const nmk = await import('@/plugins/nativeMusicKit');
    expect(nmk.nmkPlay).not.toHaveBeenCalled();
  });

  it('YouTube start posts a play command through the iframe ref', async () => {
    const { result } = renderHook(() =>
      useStreamingAccompaniment({
        kind: 'youtube',
        title: null,
        youtubeUrl: 'https://www.youtube.com/watch?v=abc123',
      }),
    );
    const post = vi.fn();
    result.current.ytIframeRef.current = { contentWindow: { postMessage: post } } as unknown as HTMLIFrameElement;
    await act(async () => {
      await result.current.start(4);
    });
    expect(post).toHaveBeenCalled();
  });

  it('Apple Music start on iOS routes through the native plugin', async () => {
    const nmk = await import('@/plugins/nativeMusicKit');
    (nmk.isNativeMusicKitAvailable as any).mockReturnValue(true);
    (nmk.nmkRequestAuthorization as any).mockResolvedValue({ authorized: true });
    const { result } = renderHook(() =>
      useStreamingAccompaniment({
        kind: 'apple_music',
        title: null,
        appleMusicId: 'abc',
        appleMusicStorefront: 'us',
        appleMusicArtist: null,
        appleMusicArtworkUrl: null,
      }),
    );
    await act(async () => {
      await result.current.start(0);
    });
    expect(nmk.nmkSetQueueSong).toHaveBeenCalledWith('abc');
    expect(nmk.nmkPlay).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test — expect failure (module not found)**

```
npx vitest run src/lib/studio/streamingBacking/__tests__/useStreamingAccompaniment.test.ts
```

- [ ] **Step 3: Create the hook**

Create `src/lib/studio/streamingBacking/useStreamingAccompaniment.ts`. Port the behavior from `PartTracksStudio.tsx` `startExternalAccompaniment` (line ~416), `stopExternalAccompaniment` (line ~527), and `waitForAppleMusicPlaying` — everything gated by `accompaniment_kind`. The rewritten hook:

```ts
import { useCallback, useRef } from 'react';
import { toast } from 'sonner';
import {
  isNativeMusicKitAvailable, nmkRequestAuthorization, nmkSetQueueSong,
  nmkSetQueueAlbum, nmkPlay, nmkPause, nmkStop, nmkSeek, nmkWaitForPlaying,
} from '@/plugins/nativeMusicKit';
import { extractYouTubeVideoId } from '@/utils/youtubeUtils';
import type { Accompaniment } from '@/lib/studio/session';

export interface StreamingAccompanimentHandle {
  start(positionSec: number): Promise<{ backingAudibleWallMs: number }>;
  stop(): void;
  setVolume(volume: number, muted: boolean): void;
  waitForPlaying(): Promise<boolean>;
  ytIframeRef: React.MutableRefObject<HTMLIFrameElement | null>;
}

export function useStreamingAccompaniment(
  accompaniment: Accompaniment | null | undefined,
): StreamingAccompanimentHandle {
  const appleMusicRef = useRef<any>(null);
  const ytIframeRef = useRef<HTMLIFrameElement | null>(null);

  const start = useCallback(async (positionSec: number) => {
    const audibleAt = () => performance.now();
    if (!accompaniment) return { backingAudibleWallMs: audibleAt() };

    if (accompaniment.kind === 'apple_music' || accompaniment.kind === 'apple_music_album') {
      const isAlbum = accompaniment.kind === 'apple_music_album';
      const id = accompaniment.appleMusicId;
      if (isNativeMusicKitAvailable()) {
        const auth = await nmkRequestAuthorization();
        if (!auth.authorized) {
          toast.error('Apple Music access denied. Enable Music access in Settings → GleeWorld.');
          return { backingAudibleWallMs: audibleAt() };
        }
        if (isAlbum) await nmkSetQueueAlbum(id);
        else await nmkSetQueueSong(id);
        if (positionSec > 0.05) await nmkSeek(positionSec);
        await nmkPlay();
        const reached = await nmkWaitForPlaying();
        if (!reached) toast.warning('Apple Music did not start playing in time.');
        return { backingAudibleWallMs: audibleAt() };
      }
      // Web MusicKit JS fallback
      const { getMusicKit, authorizeAppleMusic, isAppleMusicAuthorized } = await import('@/lib/musicKit');
      const kit = await getMusicKit();
      appleMusicRef.current = kit;
      if (!(await isAppleMusicAuthorized())) await authorizeAppleMusic();
      await kit.setQueue(isAlbum ? { album: id } : { song: id });
      if (positionSec > 0.05) {
        try { await (kit.seekToTime?.(positionSec) ?? kit.player?.seekToTime?.(positionSec)); } catch { /* ignore */ }
      }
      await kit.play();
      return { backingAudibleWallMs: audibleAt() };
    }

    if (accompaniment.kind === 'youtube') {
      const id = extractYouTubeVideoId(accompaniment.youtubeUrl);
      const win = ytIframeRef.current?.contentWindow;
      if (!id || !win) return { backingAudibleWallMs: audibleAt() };
      win.postMessage(JSON.stringify({ event: 'listening' }), 'https://www.youtube.com');
      if (positionSec > 0.05) {
        win.postMessage(JSON.stringify({ event: 'command', func: 'seekTo', args: [positionSec, true] }), 'https://www.youtube.com');
      }
      win.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: [] }), 'https://www.youtube.com');
      return { backingAudibleWallMs: audibleAt() };
    }

    return { backingAudibleWallMs: audibleAt() };
  }, [accompaniment]);

  const stop = useCallback(() => {
    if (!accompaniment) return;
    if (accompaniment.kind === 'apple_music' || accompaniment.kind === 'apple_music_album') {
      if (isNativeMusicKitAvailable()) {
        void nmkPause().catch(() => { /* ignore */ });
        void nmkStop().catch(() => { /* ignore */ });
        return;
      }
      try { appleMusicRef.current?.pause?.(); } catch { /* ignore */ }
      try { appleMusicRef.current?.stop?.(); } catch { /* ignore */ }
      appleMusicRef.current = null;
      return;
    }
    if (accompaniment.kind === 'youtube') {
      const win = ytIframeRef.current?.contentWindow;
      if (win) {
        win.postMessage(JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }), 'https://www.youtube.com');
      }
    }
  }, [accompaniment]);

  const setVolume = useCallback((_volume: number, _muted: boolean) => {
    // Streaming sources own their own volume; the mixer strip for the
    // Accompaniment lane is a passive display when kind is streaming.
    // Left as a no-op for now — extend if the mixer wires it up.
  }, []);

  const waitForPlaying = useCallback(async () => {
    if (!accompaniment) return true;
    if (accompaniment.kind === 'apple_music' || accompaniment.kind === 'apple_music_album') {
      if (isNativeMusicKitAvailable()) return nmkWaitForPlaying();
    }
    return true;
  }, [accompaniment]);

  return { start, stop, setVolume, waitForPlaying, ytIframeRef };
}
```

- [ ] **Step 4: Run the tests — verify pass**

```
npx vitest run src/lib/studio/streamingBacking/__tests__/useStreamingAccompaniment.test.ts
```

- [ ] **Step 5: Typecheck-guard + commit**

```
npm run typecheck:guard
git add src/lib/studio/streamingBacking/useStreamingAccompaniment.ts src/lib/studio/streamingBacking/__tests__/useStreamingAccompaniment.test.ts
git commit -m "feat(studio): useStreamingAccompaniment hook (Apple Music + YouTube)"
```

---

## Task 3: Extract `captureFromPlayback` helper

**Files:**
- Create: `src/lib/studio/streamingBacking/captureFromPlayback.ts`
- Create: `src/lib/studio/streamingBacking/__tests__/captureFromPlayback.test.ts`

**Interfaces:**
- Consumes: existing `bufferToWav` from `src/components/partTracks/audioProcessing.ts` (will move in Task 9; import from current path for now). Existing Supabase client `@/integrations/supabase/client`.
- Produces:
  ```ts
  export interface CapturedAccompaniment {
    /** Public URL of the uploaded WAV. */
    url: string;
    /** Suggested title (matches the uploaded filename). */
    title: string;
  }
  export async function captureFromPlayback(input: {
    blob: Blob;
    sessionId: string;
  }): Promise<CapturedAccompaniment>;
  ```

- [ ] **Step 1: Write the failing test**

Create `src/lib/studio/streamingBacking/__tests__/captureFromPlayback.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { captureFromPlayback } from '../captureFromPlayback';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    storage: {
      from: () => ({
        upload: vi.fn(async () => ({ error: null })),
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://cdn.example/${path}` } }),
      }),
    },
  },
}));

// Provide a minimal AudioContext stub so decodeAudioData resolves.
class MockCtx {
  async decodeAudioData(_ab: ArrayBuffer): Promise<AudioBuffer> {
    return {
      length: 44100,
      numberOfChannels: 1,
      sampleRate: 44100,
      duration: 1,
      getChannelData: () => new Float32Array(44100),
    } as unknown as AudioBuffer;
  }
  async close() {}
}
(global as any).AudioContext = MockCtx;
(global as any).webkitAudioContext = MockCtx;

describe('captureFromPlayback', () => {
  it('decodes → WAVs → uploads → returns public URL', async () => {
    const blob = new Blob([new Uint8Array([1,2,3,4])], { type: 'audio/webm' });
    const out = await captureFromPlayback({ blob, sessionId: 'sess-1' });
    expect(out.url).toContain('studio/');
    expect(out.url).toContain('sess-1');
    expect(out.url).toContain('.wav');
    expect(out.title).toMatch(/\.wav$/);
  });

  it('throws on tiny blobs (< 1KB)', async () => {
    const tiny = new Blob([new Uint8Array(100)], { type: 'audio/webm' });
    await expect(captureFromPlayback({ blob: tiny, sessionId: 's' })).rejects.toThrow(/too short/i);
  });
});
```

- [ ] **Step 2: Run the test — expect module-not-found**

```
npx vitest run src/lib/studio/streamingBacking/__tests__/captureFromPlayback.test.ts
```

- [ ] **Step 3: Create the helper**

Create `src/lib/studio/streamingBacking/captureFromPlayback.ts`:

```ts
import { supabase } from '@/integrations/supabase/client';
import { bufferToWav } from '@/components/partTracks/audioProcessing';

export interface CapturedAccompaniment {
  url: string;
  title: string;
}

/** Decode a mic-recorder Blob (webm/opus or mp4/aac) into a WAV, upload
 *  it into the studio bucket under the session's asset prefix, and
 *  return the public URL. Used by the "Capture from playback" flow. */
export async function captureFromPlayback(input: {
  blob: Blob;
  sessionId: string;
}): Promise<CapturedAccompaniment> {
  const { blob, sessionId } = input;
  if (!blob || blob.size < 1024) {
    throw new Error('Captured audio is too short — check the mic and speaker volume.');
  }

  const AC = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
  const ctx = new AC();
  try {
    const ab = await blob.arrayBuffer();
    const buffer = await ctx.decodeAudioData(ab.slice(0));
    const wav = bufferToWav(buffer);
    const title = `accompaniment-capture-${Date.now()}.wav`;
    // Colocate with the session's other assets. RLS + storage prefix
    // rules on the studio bucket scope reads to the tenant already.
    const path = `studio/sessions/${sessionId}/audio/${title}`;
    const { error } = await supabase.storage
      .from('studio')
      .upload(path, wav, { contentType: 'audio/wav', upsert: true });
    if (error) throw new Error(`Upload failed: ${error.message}`);
    const url = supabase.storage.from('studio').getPublicUrl(path).data.publicUrl;
    return { url, title };
  } finally {
    try { await ctx.close(); } catch { /* ignore */ }
  }
}
```

- [ ] **Step 4: Run the tests — verify pass**

```
npx vitest run src/lib/studio/streamingBacking/__tests__/captureFromPlayback.test.ts
```

- [ ] **Step 5: Typecheck-guard + commit**

```
npm run typecheck:guard
git add src/lib/studio/streamingBacking/captureFromPlayback.ts src/lib/studio/streamingBacking/__tests__/captureFromPlayback.test.ts
git commit -m "feat(studio): captureFromPlayback WAV encode + upload helper"
```

---

## Task 4: Move `AccompanimentPicker` and `FloatingScorePanel` to `src/components/studio/`

**Files:**
- Create: `src/components/studio/AccompanimentPicker.tsx` (copy of `src/components/partTracks/AccompanimentPicker.tsx` — do NOT delete the source yet; that's Task 9)
- Create: `src/components/studio/FloatingScorePanel.tsx` (copy of `src/components/partTracks/FloatingScorePanel.tsx`)

**Interfaces:**
- Consumes: existing `AccompanimentPicker` public API, existing `FloatingScorePanel` public API.
- Produces: identical components at new paths so Studio can import from `src/components/studio/*`.

- [ ] **Step 1: Copy `AccompanimentPicker` verbatim**

```bash
cp src/components/partTracks/AccompanimentPicker.tsx src/components/studio/AccompanimentPicker.tsx
```

If `AccompanimentPicker.tsx` imports from other files in `src/components/partTracks/` (e.g. `./types`), keep those imports pointing at the old paths for now — Task 9 either moves them or inlines them.

- [ ] **Step 2: Copy `FloatingScorePanel` verbatim**

```bash
cp src/components/partTracks/FloatingScorePanel.tsx src/components/studio/FloatingScorePanel.tsx
```

Same import-path caveat.

- [ ] **Step 3: Typecheck-guard**

```
npm run typecheck:guard
```

Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/studio/AccompanimentPicker.tsx src/components/studio/FloatingScorePanel.tsx
git commit -m "chore(studio): copy AccompanimentPicker + FloatingScorePanel from partTracks"
```

---

## Task 5: `StudioHome` three-card create dialog

**Files:**
- Modify: `src/pages/studio/StudioHome.tsx`
- Modify: `src/hooks/useStudio.ts` (extend `useCreateStudioSession` to accept optional starter tracks + accompaniment)

**Interfaces:**
- Consumes: `Accompaniment` (Task 1), `AccompanimentPicker` at `src/components/studio/AccompanimentPicker.tsx` (Task 4), existing `useCreateStudioSession`.
- Produces:
  ```ts
  useCreateStudioSession().mutateAsync({
    tenantId, ownerUserId, title,
    template?: 'empty' | 'satb' | 'custom',
    accompaniment?: Accompaniment | null,
    customParts?: Array<{ kind: 'soprano'|'alto'|'tenor'|'bass'|'solo'|'piano'|'custom', label: string, color: string }>,
  });
  ```

- [ ] **Step 1: Update `useCreateStudioSession` to accept the template + accompaniment**

Read `src/hooks/useStudio.ts`, find `useCreateStudioSession`. Extend the mutation input:

```ts
export interface CreateStudioSessionInput {
  tenantId: string;
  ownerUserId: string;
  title: string;
  template?: 'empty' | 'satb' | 'custom';
  accompaniment?: Accompaniment | null;
  customParts?: Array<{ kind: string; label: string; color: string }>;
}
```

In the mutation body, after `blankSession()` produces the base manifest, apply the template + accompaniment:

```ts
import { blankSession } from '@/lib/studio/defaults';
import type { Track, Session } from '@/lib/studio/session';

const base = blankSession({ id, ownerUserId: input.ownerUserId, tenantId: input.tenantId, title: input.title });

const templateTracks: Track[] = (() => {
  if (input.template === 'satb') {
    return [
      { id: 't-sop',   kind: 'audio', name: 'Soprano', color: '#fbbf24', output: { busId: MASTER_BUS_ID, gain_db: 0 }, sends: [], inserts: [], clips: [], mute: false, solo: false, pan: 0, volume: 0.8 },
      { id: 't-alt',   kind: 'audio', name: 'Alto',    color: '#f97316', output: { busId: MASTER_BUS_ID, gain_db: 0 }, sends: [], inserts: [], clips: [], mute: false, solo: false, pan: 0, volume: 0.8 },
      { id: 't-ten',   kind: 'audio', name: 'Tenor',   color: '#3b82f6', output: { busId: MASTER_BUS_ID, gain_db: 0 }, sends: [], inserts: [], clips: [], mute: false, solo: false, pan: 0, volume: 0.8 },
      { id: 't-bass',  kind: 'audio', name: 'Bass',    color: '#9333ea', output: { busId: MASTER_BUS_ID, gain_db: 0 }, sends: [], inserts: [], clips: [], mute: false, solo: false, pan: 0, volume: 0.8 },
    ];
  }
  if (input.template === 'custom' && input.customParts?.length) {
    return input.customParts.map((p, i) => ({
      id: `t-${p.kind}-${i}`, kind: 'audio', name: p.label, color: p.color,
      output: { busId: MASTER_BUS_ID, gain_db: 0 },
      sends: [], inserts: [], clips: [], mute: false, solo: false, pan: 0, volume: 0.8,
    })) as Track[];
  }
  return [];
})();

const session: Session = {
  ...base,
  tracks: [...base.tracks, ...templateTracks],
  accompaniment: input.accompaniment ?? null,
};
// then write manifest at storage_prefix + '/manifest.json' via the existing storage helper
```

Fill in the exact `Track` shape based on the current interface in `src/lib/studio/session.ts` — the above is illustrative for the audio-track branch; match the file's actual `AudioTrack` type (including any required optional fields the type demands).

- [ ] **Step 2: Rewrite the create dialog in `StudioHome.tsx`**

Replace the current two-step chooser (that we shipped earlier in this session — the "Studio session / Part Tracks session" cards) with:

```tsx
type Template = 'empty' | 'satb' | 'custom';
type Step = 'pick' | 'backing' | 'title';

function CreateSessionDialog({ open, onOpenChange, onSubmit, busy }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSubmit: (i: { title: string; template: Template; accompaniment: Accompaniment | null }) => void;
  busy: boolean;
}) {
  const [step, setStep] = useState<Step>('pick');
  const [template, setTemplate] = useState<Template>('empty');
  const [accompaniment, setAccompaniment] = useState<Accompaniment | null>(null);
  const [title, setTitle] = useState('');
  // ... reset on close
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setStep('pick'); setTemplate('empty'); setAccompaniment(null); setTitle(''); } onOpenChange(o); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{step === 'pick' ? 'New session' : step === 'backing' ? 'Choose backing' : 'Name your session'}</DialogTitle>
        </DialogHeader>
        {step === 'pick' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <TemplateCard label="Empty session" icon={Sliders} onClick={() => { setTemplate('empty'); setStep('title'); }} />
            <TemplateCard label="Voice parts (SATB)" icon={Users} onClick={() => { setTemplate('satb'); setStep('backing'); }} />
            <TemplateCard label="Custom" icon={AudioLines} onClick={() => { setTemplate('custom'); setStep('backing'); }} />
          </div>
        )}
        {step === 'backing' && (
          <AccompanimentPicker
            open={true}
            embedded  // render inline instead of as its own dialog
            onPick={(a) => { setAccompaniment(a); setStep('title'); }}
            onSkip={() => { setAccompaniment(null); setStep('title'); }}
          />
        )}
        {step === 'title' && (
          <TitleStep
            busy={busy}
            onBack={() => setStep(template === 'empty' ? 'pick' : 'backing')}
            onCancel={() => onOpenChange(false)}
            onSubmit={(t) => onSubmit({ title: t, template, accompaniment })}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
```

Also add an `embedded` prop to the copied `AccompanimentPicker` so it renders as a plain form rather than opening its own dialog when embedded. The picker must return an `Accompaniment` in the manifest shape (from Task 1) — map the picker's internal shape into it at the `onPick` boundary.

- [ ] **Step 3: Wire `onCreated` to include the template + accompaniment**

Extend the `onCreated` handler in `StudioHome`:

```ts
const onCreated = async (i: { title: string; template: Template; accompaniment: Accompaniment | null }) => {
  if (!owner.data) return;
  try {
    const s = await createMut.mutateAsync({
      tenantId: owner.data.tenantId,
      ownerUserId: owner.data.userId,
      title: i.title || 'Untitled session',
      template: i.template,
      accompaniment: i.accompaniment,
    });
    setCreateOpen(false);
    navigate(`/studio/sessions/${s.id}`);
  } catch (e) {
    toast.error('Could not create session', { description: e instanceof Error ? e.message : String(e) });
  }
};
```

- [ ] **Step 4: Manual verification**

```
npm run dev
```

Open `/studio` → click **New session** → pick **Voice parts (SATB)** → pick a backing (upload a small MP3) → confirm title → session opens with 4 SATB tracks + accompaniment lane populated.

Repeat for **Empty session** and **Custom** paths.

- [ ] **Step 5: Typecheck-guard + commit**

```
npm run typecheck:guard
git add src/pages/studio/StudioHome.tsx src/hooks/useStudio.ts src/components/studio/AccompanimentPicker.tsx
git commit -m "feat(studio): three-card new-session dialog with voice parts + backing"
```

---

## Task 6: `AccompanimentLane` + streaming-backing wiring in the editor

**Files:**
- Create: `src/components/studio/AccompanimentLane.tsx`
- Modify: `src/pages/studio/StudioEditor.tsx` (mount lane, wire transport, apply head-trim on take save)

**Interfaces:**
- Consumes: `Accompaniment` (Task 1), `useStreamingAccompaniment` (Task 2), `captureFromPlayback` (Task 3), existing `computeTakeAlignment` from `src/lib/audio/takeAlignment.ts`.
- Produces: `AccompanimentLane` component rendered at track index 0 when `session.accompaniment != null`. On `kind='file'` the lane routes through the existing Studio audio engine as a normal audio track. On streaming kinds, the lane is decorative + hosts the "Capture from playback" button.

- [ ] **Step 1: Write `AccompanimentLane.tsx`**

Create `src/components/studio/AccompanimentLane.tsx`:

```tsx
import { useState } from 'react';
import { Music, Youtube, Square, CircleDot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { Accompaniment } from '@/lib/studio/session';

export interface AccompanimentLaneProps {
  accompaniment: Accompaniment;
  /** Called when capture-from-playback completes; parent flips accompaniment.kind → 'file'. */
  onCapture: () => Promise<void>;
  /** True while capture is in-flight so the button turns into Stop + pulses. */
  capturing: boolean;
  /** True while any part-track take is in progress; disables the capture button. */
  recordingInProgress: boolean;
  /** Called when user hits Stop mid-capture. */
  onStopCapture: () => Promise<void>;
  /** Ref for YouTube iframe (only used when kind='youtube'). */
  ytIframeRef?: React.MutableRefObject<HTMLIFrameElement | null>;
}

export function AccompanimentLane({ accompaniment, onCapture, onStopCapture, capturing, recordingInProgress, ytIframeRef }: AccompanimentLaneProps) {
  const isApple = accompaniment.kind === 'apple_music' || accompaniment.kind === 'apple_music_album';
  const isYouTube = accompaniment.kind === 'youtube';
  const isFile = accompaniment.kind === 'file';

  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 flex items-center gap-3">
      {isApple ? (
        <>
          {accompaniment.appleMusicArtworkUrl
            ? <img src={accompaniment.appleMusicArtworkUrl} alt="" className="w-8 h-8 rounded shrink-0" />
            : <Music className="w-8 h-8 text-pink-400" />}
          <div className="flex-1 min-w-0">
            <div className="text-sm truncate">{accompaniment.title}</div>
            <div className="text-[10px] uppercase tracking-wider text-pink-400">
              Apple Music{accompaniment.kind === 'apple_music_album' ? ' · Album' : ''}
            </div>
          </div>
        </>
      ) : isYouTube ? (
        <>
          <Youtube className="w-8 h-8 text-rose-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-sm truncate">{accompaniment.title ?? 'YouTube backing'}</div>
            <div className="text-[10px] uppercase tracking-wider text-rose-500">YouTube</div>
          </div>
        </>
      ) : isFile ? (
        <>
          <Music className="w-8 h-8 text-slate-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-sm truncate">{accompaniment.title ?? 'Accompaniment'}</div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500">File (locked)</div>
          </div>
        </>
      ) : null}

      {!isFile && (capturing ? (
        <Button size="sm" variant="destructive" className="animate-pulse" onClick={() => void onStopCapture()}>
          <Square className="w-3.5 h-3.5 mr-1" fill="currentColor" /> Stop capture
        </Button>
      ) : (
        <Button
          size="sm"
          variant="outline"
          disabled={recordingInProgress}
          onClick={() => void onCapture()}
          title="Record the room while the backing plays. Future takes will lock to the WAV."
        >
          <CircleDot className="w-3.5 h-3.5 mr-1 text-red-500" /> Capture from playback
        </Button>
      ))}

      {isYouTube && (
        <iframe
          ref={ytIframeRef}
          className="w-0 h-0 opacity-0 pointer-events-none"
          allow="autoplay"
          src={`https://www.youtube.com/embed/${extractIdOrEmpty(accompaniment.youtubeUrl)}?enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`}
          title="YouTube backing"
        />
      )}
    </div>
  );
}

function extractIdOrEmpty(url: string): string {
  const m = url.match(/(?:v=|be\/|embed\/)([A-Za-z0-9_-]{6,})/);
  return m ? m[1] : '';
}
```

- [ ] **Step 2: Wire `AccompanimentLane` into `StudioEditor.tsx`**

Read `src/pages/studio/StudioEditor.tsx`. Find where the track list is rendered. Add above the first track when `session.accompaniment != null`:

```tsx
import { useStreamingAccompaniment } from '@/lib/studio/streamingBacking/useStreamingAccompaniment';
import { captureFromPlayback } from '@/lib/studio/streamingBacking/captureFromPlayback';
import { AccompanimentLane } from '@/components/studio/AccompanimentLane';
// ...
const streaming = useStreamingAccompaniment(session.accompaniment);
const [capturing, setCapturing] = useState(false);
const captureBlobRef = useRef<Blob | null>(null);

// Render just above the tracks list:
{session.accompaniment && (
  <AccompanimentLane
    accompaniment={session.accompaniment}
    capturing={capturing}
    recordingInProgress={/* your existing recording state */}
    ytIframeRef={streaming.ytIframeRef}
    onCapture={async () => { /* see step 3 */ }}
    onStopCapture={async () => { /* see step 3 */ }}
  />
)}
```

The `isFile` case must ALSO be added to the normal Studio audio-track pipeline so it renders as a mixable track with waveform (it uses the same `fileUrl` as any other clip). If Studio's audio engine can already load a URL as a track, just seed that track when the session opens with `kind='file'`.

- [ ] **Step 3: Wire capture flow**

```tsx
const onCapture = async () => {
  if (!session.accompaniment) return;
  setCapturing(true);
  try {
    await startRecording({ inputDeviceId, musicMode: false });  // Studio's existing mic API
    await streaming.start(0);
  } catch (e) {
    setCapturing(false);
    toast.error(e instanceof Error ? e.message : 'Capture failed to start');
  }
};

const onStopCapture = async () => {
  try {
    streaming.stop();
    const blob = await stopRecording();  // Studio's existing stop
    if (!blob) throw new Error('No audio captured');
    const captured = await captureFromPlayback({ blob, sessionId: session.id });
    // Flip manifest.accompaniment to kind='file' with the new URL
    updateSession({
      ...session,
      accompaniment: { kind: 'file', title: captured.title, fileUrl: captured.url },
    });
    toast.success('Accompaniment captured — future takes lock to this WAV.');
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Capture failed');
  } finally {
    setCapturing(false);
  }
};
```

- [ ] **Step 4: Apply head-trim on take save when streaming backing was active**

Wherever `StudioEditor.tsx` finishes a take and receives the mic blob, add:

```ts
import { computeTakeAlignment, type TakeStamps } from '@/lib/audio/takeAlignment';
// Stamps captured when the take starts (same shape Part Tracks used):
const stamps: TakeStamps | null = takeStampsRef.current;
takeStampsRef.current = null;
const alignment = stamps ? computeTakeAlignment(stamps) : null;
const trimMs = alignment?.trimMs ?? 0;
// Pass to stopRecording as trimHeadMsOverride, or trim the blob head after decode.
```

At take START, populate the ref (only when streaming backing is active):

```ts
import type { TakeStamps } from '@/lib/audio/takeAlignment';
import { getConfiguredDeviceLatencyMs } from '@/lib/audio/sharedRecorder';
import { getLastCaptureStartWallMs } from '@/components/partTracks/audioEngine';  // moves in Task 9

const takeStampsRef = useRef<TakeStamps | null>(null);
// on record-start (only when accompaniment kind is streaming):
const pressWallMs = performance.now();
await startRecording({ inputDeviceId, musicMode: false });
const captureStartWallMs = getLastCaptureStartWallMs() ?? performance.now();
const { backingAudibleWallMs } = await streaming.start(recordStartOffsetSec);
takeStampsRef.current = {
  pressWallMs,
  captureStartWallMs,
  transportStartWallMs: backingAudibleWallMs,
  deviceLatencyMs: getConfiguredDeviceLatencyMs(),
};
```

Skip stamp population entirely when `session.accompaniment?.kind` is `'file'` or `null` — Studio's existing take flow handles those.

- [ ] **Step 5: Manual verification**

- Create a Voice Parts session with a YouTube backing → open editor → confirm the lane appears above the tracks with a YouTube badge.
- Hit **Capture from playback** → confirm the mic opens + YouTube plays → hit **Stop capture** → confirm the lane redraws as "File (locked)" and the WAV is playable in the mixer.
- Create a Voice Parts session with Apple Music backing → record a take → confirm the take starts on or very near beat 1 of the backing (head-trim working).

- [ ] **Step 6: Typecheck-guard + commit**

```
npm run typecheck:guard
git add src/components/studio/AccompanimentLane.tsx src/pages/studio/StudioEditor.tsx
git commit -m "feat(studio): accompaniment lane + streaming backing wiring"
```

---

## Task 7: Score attach / detach + `FloatingScorePanel`

**Files:**
- Create: `src/components/studio/AttachScoreDialog.tsx`
- Modify: `src/pages/studio/StudioEditor.tsx` (session-settings menu, panel mount)

**Interfaces:**
- Consumes: existing `gw_sheet_music` search UI. If a reusable picker doesn't exist, use `useMusicLibrarySearch` (or the same query the music library page uses) inside `AttachScoreDialog`.
- Produces: `AttachScoreDialog` — a controlled dialog that returns a chosen `scoreId: string` or null.

- [ ] **Step 1: Write `AttachScoreDialog.tsx`**

```tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export interface AttachScoreDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onAttach: (scoreId: string) => void;
}

export function AttachScoreDialog({ open, onOpenChange, onAttach }: AttachScoreDialogProps) {
  const [query, setQuery] = useState('');
  const { data = [], isLoading } = useQuery({
    queryKey: ['studio-attach-score', query],
    enabled: open,
    queryFn: async () => {
      let q = supabase.from('gw_sheet_music').select('id, title, composer, voicing').limit(20);
      if (query.trim()) q = q.ilike('title', `%${query.trim()}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Attach score</DialogTitle></DialogHeader>
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search title…" autoFocus />
        <ul className="max-h-80 overflow-y-auto divide-y divide-border mt-2">
          {isLoading && <li className="p-2 text-sm text-muted-foreground">Searching…</li>}
          {(data as Array<{ id: string; title: string; composer: string | null; voicing: string | null }>).map((s) => (
            <li key={s.id}>
              <button
                type="button"
                className="w-full text-left p-2 hover:bg-muted transition-colors"
                onClick={() => { onAttach(s.id); onOpenChange(false); }}
              >
                <div className="text-sm">{s.title}</div>
                <div className="text-xs text-muted-foreground">
                  {[s.composer, s.voicing].filter(Boolean).join(' · ')}
                </div>
              </button>
            </li>
          ))}
          {!isLoading && data.length === 0 && (
            <li className="p-2 text-sm text-muted-foreground italic">No matches.</li>
          )}
        </ul>
        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Wire attach/detach into `StudioEditor.tsx`**

In the session settings menu (existing dropdown in the editor header), add two items:

```tsx
{session.scoreId ? (
  <MenuItem onClick={() => updateSession({ ...session, scoreId: null })}>
    Remove score
  </MenuItem>
) : (
  <MenuItem onClick={() => setAttachOpen(true)}>Attach score</MenuItem>
)}
```

Mount the dialog:

```tsx
<AttachScoreDialog
  open={attachOpen}
  onOpenChange={setAttachOpen}
  onAttach={(id) => updateSession({ ...session, scoreId: id })}
/>
```

When `session.scoreId` is set, mount `FloatingScorePanel` (from `src/components/studio/`) and pass the score id. The panel already handles fetching the PDF and rendering — keep its existing prop shape.

```tsx
{session.scoreId && <FloatingScorePanel scoreId={session.scoreId} />}
```

If `FloatingScorePanel`'s current prop is `scoreMeta` instead of `scoreId`, add a small wrapper that queries the score by id and passes the meta through:

```tsx
function StudioScorePanel({ scoreId }: { scoreId: string }) {
  const { data } = useQuery({
    queryKey: ['studio-score', scoreId],
    queryFn: async () => {
      const { data, error } = await supabase.from('gw_sheet_music').select('id, title, composer, voicing, pdf_url').eq('id', scoreId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  if (!data) return null;
  return <FloatingScorePanel score={data} />;
}
```

- [ ] **Step 3: Manual verification**

- Open any session → session settings menu → click **Attach score** → search + pick → confirm panel opens with the PDF.
- Click **Remove score** → confirm panel disappears and `session.scoreId` is null.

- [ ] **Step 4: Typecheck-guard + commit**

```
npm run typecheck:guard
git add src/components/studio/AttachScoreDialog.tsx src/pages/studio/StudioEditor.tsx
git commit -m "feat(studio): optional attach/remove score from music library"
```

---

## Task 8: Part Tracks route redirect + sidebar nav cleanup

**Files:**
- Modify: `src/App.tsx` (remove Part Tracks routes, add wildcard redirect + toast)
- Modify: `src/lib/navigation/navCatalog.ts` (remove Part Tracks entry)

**Interfaces:**
- Consumes: existing sonner `toast`, `Navigate` from `react-router-dom`.
- Produces: `/dashboard/part-tracks/*` → `/studio` with one-time toast.

- [ ] **Step 1: Replace Part Tracks routes with a redirect in `App.tsx`**

Find the current routes (`/dashboard/part-tracks` and `/dashboard/part-tracks/:projectId`, line ~1610 and ~1622) and replace them with:

```tsx
<Route
  path="/dashboard/part-tracks/*"
  element={<PartTracksRedirect />}
/>
```

Then define near the top of `App.tsx` (or in a small file next to it):

```tsx
function PartTracksRedirect() {
  useEffect(() => {
    if (typeof window !== 'undefined' && !sessionStorage.getItem('pt-redirect-toast-shown')) {
      sessionStorage.setItem('pt-redirect-toast-shown', '1');
      import('sonner').then(({ toast }) => toast.message('Part Tracks is now part of Studio.'));
    }
  }, []);
  return <Navigate to="/studio" replace />;
}
```

Delete the `PartTracksLandingPage` lazy import (`const PartTracksLandingPage = lazy(...)`) if no other route references it.

- [ ] **Step 2: Remove the Part Tracks entry from `navCatalog.ts`**

Grep `navCatalog.ts` for `part-tracks` or `Part Tracks` and remove that entry. Also drop any test data in `src/lib/navigation/__tests__/navCatalog.test.ts` that expected that key.

- [ ] **Step 3: Manual verification**

- Navigate to `/dashboard/part-tracks` — confirm redirect to `/studio` and toast appears once.
- Sidebar nav no longer shows Part Tracks.

- [ ] **Step 4: Typecheck-guard + tests**

```
npm run typecheck:guard
npx vitest run src/lib/navigation
```

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/lib/navigation/navCatalog.ts src/lib/navigation/__tests__/
git commit -m "chore: redirect /dashboard/part-tracks to /studio; drop nav entry"
```

---

## Task 9: DB migration + code cleanup

**Files:**
- Create: `supabase/migrations/20260729130000_drop_part_tracks.sql`
- Delete: entire `src/components/partTracks/` directory
- Delete: `src/components/part-tracks/RecordModal.tsx`
- Delete: `src/pages/dashboard/PartTracksLandingPage.tsx`
- Delete: `src/hooks/usePartTracksProject.ts`
- Delete: `src/components/modules/PartTracksModule.tsx`
- Modify: any module registry that references `PartTracksModule` — remove the reference.

**Interfaces:**
- Consumes: nothing — this is the terminal cleanup.
- Produces: a codebase with zero references to `gw_part_tracks_*` and `PartTracksStudio`.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260729130000_drop_part_tracks.sql`:

```sql
-- Studio + Part Tracks merge (2026-07-29). Part Tracks projects were
-- deleted 2026-07-29 with the platform owner's explicit approval; the
-- tables themselves are dropped here now that the editor is retired.

DROP TABLE IF EXISTS public.gw_part_tracks_recordings CASCADE;
DROP TABLE IF EXISTS public.gw_part_tracks_tracks CASCADE;
DROP TABLE IF EXISTS public.gw_part_tracks_projects CASCADE;

DELETE FROM gw_billing_modules WHERE id = 'part_tracks';
```

- [ ] **Step 2: Apply on the self-host DB**

```
ssh root@supabase.gleeworld.org "docker exec -i supabase-db psql -U postgres -d postgres" < supabase/migrations/20260729130000_drop_part_tracks.sql
```

Confirm the three tables are gone:

```
ssh root@supabase.gleeworld.org "docker exec -i supabase-db psql -U postgres -d postgres -c \"SELECT tablename FROM pg_tables WHERE tablename LIKE 'gw_part_tracks%';\""
```

Expected: 0 rows.

- [ ] **Step 3: Delete the code**

```bash
git rm -r src/components/partTracks
git rm src/components/part-tracks/RecordModal.tsx
git rm src/pages/dashboard/PartTracksLandingPage.tsx
git rm src/hooks/usePartTracksProject.ts
git rm src/components/modules/PartTracksModule.tsx
```

If `src/components/part-tracks/` is now empty, remove the directory too.

- [ ] **Step 4: Fix any references the deletion breaks**

```
npm run typecheck:guard
```

Address each error:
- Module registry importing `PartTracksModule` → drop that entry.
- `App.tsx` importing `usePartTracksProject` → drop the import (if the redirect from Task 8 removed the only user, nothing to do).
- Any test importing from `src/components/partTracks/*` → delete the test.
- Studio code that imported `bufferToWav` from `src/components/partTracks/audioProcessing` (Task 3 helper): move `bufferToWav` to `src/lib/studio/streamingBacking/wav.ts` (verbatim copy of the function) and update the import in `captureFromPlayback.ts`.

- [ ] **Step 5: Grep-clean check**

```
git grep -l 'gw_part_tracks' src/
git grep -l "from '@/components/partTracks" src/
git grep -l "from '@/hooks/usePartTracksProject'" src/
git grep -l "PartTracksStudio" src/
git grep -l "PartTracksModule" src/
```

Expected: no matches for any command.

- [ ] **Step 6: Full build + tests**

```
npm run build
npm run test
npm run typecheck:guard
```

All three must pass.

- [ ] **Step 7: Manual verification**

- Deploy to staging (or your local `npm run dev`).
- Create a new SATB Voice Parts session with an Apple Music backing → record all 4 parts → export → confirm alignment.
- Open an existing (pre-merge) Studio session → confirm it opens unchanged.

- [ ] **Step 8: Commit + deploy**

```bash
git add supabase/migrations/20260729130000_drop_part_tracks.sql
git commit -m "chore: drop gw_part_tracks_* tables and retire Part Tracks code"
bash scripts/deploy-frontend.sh
```
