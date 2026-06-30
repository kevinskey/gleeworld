// Low-level handlers that wrap direct engine mutations. UI components
// (faders, record-finalize callbacks) call these for sample-accurate
// edits that don't go through the session-state diff cycle.
//
// On native, calls land on the iOS Capacitor plugin via the existing
// NativeStudio handle (registerPlugin('StudioEngine')). On web, calls
// land on the singleton StudioEngine instance owned by useStudioEngine.
// Both paths converge on the same engine internals (incremental clip
// add, click-free volume ramp).
//
// This hook deliberately does NOT create its own StudioEngine — the
// app already runs one per session via useStudioEngine, and two
// AudioContexts on the same page would race for the speaker.

import { useCallback, useMemo } from 'react';
import { Capacitor } from '@capacitor/core';
import { NativeStudio } from '@/plugins/studioEngine';
import type { StudioEngine } from '@/lib/studio/engine/engine';

interface RuntimeHandlers {
  /** Click-free track fader update. Accepts a dB value (the unit the
   *  UI thinks in); converts to linear gain only when crossing the iOS
   *  bridge, where AVAudioMixerNode.outputVolume is 0..1 linear. */
  handleVolumeChange: (trackId: string, targetDb: number) => Promise<void>;
  /** Fired after a fresh recording is captured to disk. Subtracts the
   *  device's measured hardware round-trip latency from the timeline
   *  anchor so the new clip lands where the user actually played. */
  handleOptimisticRecordCommit: (args: {
    trackId: string;
    clipId: string;
    /** capacitor:// or file:// path on iOS, blob: URL on web. */
    localPath: string;
    /** Position on the project timeline (seconds) where the user hit Record. */
    timelineStartSeconds: number;
    /** Duration of the captured take in seconds — required so the web
     *  engine knows when to stop the Player. iOS doesn't need it (the
     *  AVAudioFile knows its own length). */
    durationSeconds?: number;
  }) => Promise<void>;
}

export function useStudioEngineRuntime(engine: StudioEngine | null): RuntimeHandlers {
  const handleVolumeChange = useCallback(async (trackId: string, targetDb: number) => {
    if (Capacitor.isNativePlatform()) {
      // AVAudioMixerNode.outputVolume is linear gain 0..1. The web
      // engine works in dB; the plugin's updateTrackVolume alias takes
      // linear gain and converts back to dB on the Swift side.
      const linear = Math.pow(10, targetDb / 20);
      try {
        await NativeStudio.updateTrackVolume({ trackId, volume: linear });
      } catch {
        // Older iOS builds (< build 85) don't have the alias yet —
        // fall back to the canonical updateStrip(volumeDb).
        await NativeStudio.updateStrip({ trackId, volumeDb: targetDb });
      }
      return;
    }
    if (!engine) return;
    engine.setTrackVolume(trackId, targetDb);
  }, [engine]);

  const handleOptimisticRecordCommit = useCallback(async (args: {
    trackId: string;
    clipId: string;
    localPath: string;
    timelineStartSeconds: number;
    durationSeconds?: number;
  }) => {
    const { trackId, clipId, localPath, timelineStartSeconds, durationSeconds } = args;

    if (Capacitor.isNativePlatform()) {
      // Pull the device's hardware round-trip latency so the captured
      // audio lands at the same moment the performer played it (not the
      // moment recorder.start() returned, which is offset by input
      // latency). Falls back to no compensation on older builds.
      let latencyMs = 0;
      try {
        const r = await NativeStudio.getHardwareLatency();
        latencyMs = r?.latencyMs ?? 0;
      } catch {
        try { latencyMs = (await NativeStudio.getHardwareLatencyMs())?.ms ?? 0; }
        catch { latencyMs = 0; }
      }
      const trueTimelineAnchor = Math.max(0, timelineStartSeconds - latencyMs / 1000);
      try {
        await NativeStudio.injectNewClip({
          trackId,
          clipId,
          localPath,
          startSeconds: trueTimelineAnchor,
          offsetSeconds: 0,
        });
      } catch {
        // Fallback for builds that have addClipToTrack but not the
        // injectNewClip alias. We need a fuller clip shape; supply
        // safe defaults.
        await NativeStudio.addClipToTrack({
          trackId,
          clip: {
            id: clipId,
            asset_id: clipId,
            start_seconds: trueTimelineAnchor,
            duration_seconds: durationSeconds ?? 300,
            offset_seconds: 0,
            gain_db: 0,
            fade_in_seconds: 0,
            fade_out_seconds: 0,
            reverse: false,
            pitch_semitones: 0,
            time_stretch: 1,
          },
          localUrl: localPath,
        });
      }
      return;
    }

    if (!engine) return;
    // Web: subtract the AudioContext's reported output latency. Newer
    // browsers expose it; fall back to 0 when unavailable.
    let outputLatencySec = 0;
    try {
      const ctx = (typeof window !== 'undefined' ? (window as any).audioContext : undefined) as AudioContext | undefined;
      outputLatencySec = Number(ctx?.outputLatency) || 0;
    } catch { /* ignore */ }
    const cleanWebAnchor = Math.max(0, timelineStartSeconds - outputLatencySec);
    engine.addClipIncremental(trackId, {
      id: clipId,
      kind: 'audio',
      asset_id: clipId,
      start_seconds: cleanWebAnchor,
      duration_seconds: durationSeconds ?? 300,
      offset_seconds: 0,
      gain_db: 0,
      fade_in_seconds: 0,
      fade_out_seconds: 0,
      reverse: false,
      pitch_semitones: 0,
      time_stretch: 1,
    }, localPath);
  }, [engine]);

  return useMemo(() => ({ handleVolumeChange, handleOptimisticRecordCommit }),
    [handleVolumeChange, handleOptimisticRecordCommit]);
}
