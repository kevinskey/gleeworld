// Part Tracks Studio — recording environment linked to a score.
// Three-column layout for iPad landscape; vertical stack on phones.
//
// Visual language: same light surfaces as the rest of the dashboard
// (white cards, dark text, cream page) — switched 2026-06-17 from the
// original dark-navy/gold to match the unified light theme. Primary
// accent stays gold via the design tokens, not hard-coded amber.

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import {
  Play, Pause, Square, Mic, MicOff, Volume2, VolumeX, Trash2, Plus, Upload, Circle,
  Music, ArrowLeft, Headphones, Sparkles, Loader2, Youtube, Settings2,
  Wrench, AudioWaveform, AudioLines, Star, MicVocal, CircleDot,
  Scissors, BarChart3, Wand2, X,
} from 'lucide-react';
import { AccompanimentPicker } from './AccompanimentPicker';
import { DeviceSettings, isMusicModeEnabled } from './DeviceSettings';
import {
  configureForMusicRecording, restoreDefaultAudioSession,
  isNativeAudioSessionAvailable,
} from '@/plugins/audioSessionConfig';
import {
  isNativeMusicKitAvailable, nmkRequestAuthorization, nmkSetQueueSong,
  nmkSetQueueAlbum, nmkPlay, nmkPause, nmkStop, nmkSeek, nmkWaitForPlaying,
} from '@/plugins/nativeMusicKit';
import {
  startRecordingActivity, endRecordingActivity,
} from '@/plugins/recordingLiveActivity';
import { NativeStudio, isNativeStudioAvailable, getNativeAudioRoute } from '@/plugins/studioEngine';
import type { PluginListenerHandle } from '@capacitor/core';
import { FloatingScorePanel } from './FloatingScorePanel';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useAudioDevices } from '@/hooks/useAudioDevices';
import { extractYouTubeVideoId } from '@/utils/youtubeUtils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePartTracksProject, type PartTrack, type TrackKind } from '@/hooks/usePartTracksProject';
import { Waveform } from './Waveform';
import {
  unlockAudio, loadTrack, loadTrackFromBlob, unloadTrack, setTrackVolume, setTrackPan,
  startPlayback, stopPlayback, getCurrentTime, getMaxDuration,
  startRecording, stopRecording, setTrackRecordOffset,
  getRecordingMimeType, extensionForMimeType,
  getTrackBuffer, playCountIn, getLastCaptureStartWallMs,
} from './audioEngine';
import { bufferToWav, trimSilence, normalize, reduceNoise } from './audioProcessing';
import { getLikelyAudioRoute, getConfiguredDeviceLatencyMs } from '@/lib/audio/sharedRecorder';
import { computeTakeAlignment, type TakeStamps } from '@/lib/audio/takeAlignment';

// Task 5 (headphone/bleed guard): once dismissed, the "wear headphones"
// warning stays suppressed for the rest of the browser tab's session —
// module-level (not component state) so it survives track switches and
// remounts of PartTracksStudio within the same session.
let bleedWarningDismissedForSession = false;

interface ScoreMeta {
  id: string;
  title: string;
  composer: string | null;
  voicing: string | null;
  pdf_url: string | null;
}

interface PartTracksStudioProps {
  projectId: string;
}

const TRACK_KIND_OPTIONS: Array<{ kind: TrackKind; label: string; color: string }> = [
  { kind: 'soprano', label: 'Soprano',      color: '#fbbf24' },
  { kind: 'alto',    label: 'Alto',         color: '#f97316' },
  { kind: 'tenor',   label: 'Tenor',        color: '#3b82f6' },
  { kind: 'bass',    label: 'Bass',         color: '#9333ea' },
  { kind: 'solo',    label: 'Solo',         color: '#ef4444' },
  { kind: 'piano',   label: 'Piano',        color: '#22d3ee' },
  { kind: 'custom',  label: 'Custom Track', color: '#fbbf24' },
];

export function PartTracksStudio({ projectId }: PartTracksStudioProps) {
  const { user } = useAuth();
  const { project, tracks, updateTrack, updateProject, addTrack, deleteTrack } =
    usePartTracksProject(projectId);
  const [score, setScore] = useState<ScoreMeta | null>(null);
  const [playing, setPlaying] = useState(false);
  // Two distinct states in a DAW-style record flow:
  //   • armedTrackId — the track the per-row Mic button has armed for
  //     recording. Visual-only until the transport Record is pressed.
  //   • recordingTrackId — the track that is ACTIVELY being recorded
  //     right now (the transport Record was pressed and the mic stream
  //     is open). Always equals armedTrackId while recording.
  const [armedTrackId, setArmedTrackId] = useState<string | null>(null);
  const [recordingTrackId, setRecordingTrackId] = useState<string | null>(null);
  const [accPickerOpen, setAccPickerOpen] = useState(false);
  const [devicesOpen, setDevicesOpen] = useState(false);
  // Studio tools (Devices/Recording/Audio tools/Practice) lives in the
  // right rail on xl+ desktops, but collapses into a Sheet on iPad
  // landscape (lg) so the center timeline gets full breathing room.
  const [toolsOpen, setToolsOpen] = useState(false);
  const { inputDeviceId } = useAudioDevices();
  // External (Apple Music / YouTube) accompaniment playback. These can't
  // be mixed into Web Audio (DRM), so we drive them in parallel: when the
  // user hits Play, fire the external source AND the local mix; when
  // they Stop, kill both. Only the singer's mic feeds MediaRecorder.
  const ytIframeRef = useRef<HTMLIFrameElement | null>(null);
  const appleMusicRef = useRef<any>(null);
  // Master-timeline position captured at the instant MediaRecorder
  // started. Used to align the saved take with the rest of the mix on
  // subsequent plays so the vocal never drifts ahead of the backing.
  const recordStartOffsetRef = useRef<number>(0);
  // Wall-clock stamps for the take in progress (press / capture-live /
  // transport-start) so stop can compute a MEASURED head-trim + clip
  // shift via computeTakeAlignment instead of a fixed guess. Web path
  // only; the native iOS recorder does its own hardware compensation.
  const takeStampsRef = useRef<TakeStamps | null>(null);
  const [progressByTrack, setProgressByTrack] = useState<Record<string, number>>({});
  const [waveformByTrack, setWaveformByTrack] = useState<Record<string, number[] | null>>({});
  const [durationByTrack, setDurationByTrack] = useState<Record<string, number>>({});
  // Live peaks while a take is in progress — appended on every
  // onLevel tick from the recording engine, cleared on stop.
  const [livePeaks, setLivePeaks] = useState<number[]>([]);
  const livePeaksRef = useRef<number[]>([]);
  // Count-in: number of metronome clicks (0 = off). BPM falls back to
  // project tempo, then 100 if neither set.
  const [countInBeats, setCountInBeats] = useState<number>(0);
  // Mirror of recordingTrackId for closures (punch-out timer) that
  // capture state at schedule-time but need to compare against the
  // current value when they fire.
  const recordingTrackIdRef = useRef<string | null>(null);
  // --- Native (iOS) external-recorder state (Task 4) ---
  // When the take is live on the native AVAudioEngine path, this holds the
  // info the stop/save flow needs: the offset captured at record-start,
  // the count-in lead the external backing ran ahead by, and the hardware
  // latency reported by externalRecordStart (all used to place
  // record_offset_sec). null on the web path.
  const nativeRecRef = useRef<{
    trackId: string;
    capturedOffset: number;
    // Seconds the Apple Music / YouTube backing advanced DURING the native
    // count-in. The offset is stamped pre-count-in but those sources keep
    // playing through the pre-roll, so capture actually begins this much
    // later on the backing's timeline. 0 for file/none backing (the local
    // mix starts post-count-in, already aligned).
    countInLeadSec: number;
    hardwareLatencyMs: number;
  } | null>(null);
  // True from just before externalRecordStart until it resolves/rejects —
  // i.e. through the native count-in, when capture isn't rolling yet but
  // the transport shows a stoppable take. Lets the stop button cancel a
  // count-in.
  const nativeArmingRef = useRef(false);
  // Set the instant the user asks to stop a native take so the in-flight
  // externalRecordStart's rejection (settled by stop() on the plugin side)
  // is recognized as a user cancel, not an error, and cleanup runs once.
  const nativeStopRequestedRef = useRef(false);
  // Live-peak subscription handle for the native 'externalRecordPeak'
  // event; removed on stop + unmount.
  const externalPeakSubRef = useRef<PluginListenerHandle | null>(null);
  // Punch in/out: timeline seconds. When set, the transport Record
  // button arms with these markers — recording auto-starts at punchIn
  // and auto-stops at punchOut.
  const [punchIn, setPunchIn] = useState<number | null>(null);
  const [punchOut, setPunchOut] = useState<number | null>(null);
  // Task 5 (headphone/bleed guard): shown near the transport when a take
  // is about to start with a backing track playing, the route is
  // confirmed NOT headphones, and echo cancellation is off — so the mic
  // would otherwise pick up the backing and bleed into the recording.
  // Warn-only; never blocks the record flow.
  const [bleedWarning, setBleedWarning] = useState(false);
  // Set of track IDs currently being processed by an audio tool so the
  // button can show a spinner + block double-clicks.
  const [processingTrackIds, setProcessingTrackIds] = useState<Set<string>>(new Set());
  const [audioToolsOpen, setAudioToolsOpen] = useState(false);
  // Snapshot of the most-recent take + the track's pre-save state so
  // Cmd/Ctrl+Z can undo the recording from anywhere on the page. Kept
  // in a ref (not state) because the keyboard handler runs once on
  // mount and we want it to read the current snapshot every keystroke.
  const lastUndoableRef = useRef<{
    track: PartTrack;
    snapshot: {
      recordingId: string | undefined;
      prevAudioUrl: string | null;
      prevOffset: number;
      prevWaveform: number[] | null;
      prevDuration: number;
    };
  } | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const rafRef = useRef<number | null>(null);
  // Floating score panel — opens when the user clicks "Open score" so
  // they can watch the PDF while recording without leaving the studio.
  // Draggable + resizable + minimizable so the conductor can park it
  // wherever it's least in the way.
  const [scoreOpen, setScoreOpen] = useState(false);

  // Pull the linked score's title / composer / voicing for the header card.
  useEffect(() => {
    if (!project) return;
    (async () => {
      const { data } = await supabase
        .from('gw_sheet_music')
        .select('id, title, composer, voicing, pdf_url')
        .eq('id', project.sheet_music_id)
        .maybeSingle();
      setScore((data ?? null) as ScoreMeta | null);
    })();
  }, [project]);

  // Tracks whose audio blob can't be decoded by THIS browser (typically
  // an opus-in-webm take loaded on iOS Safari). UI shows a "Clear take"
  // affordance so the user can wipe it + re-record on this device.
  const [undecodableTrackIds, setUndecodableTrackIds] = useState<Set<string>>(new Set());
  // Surface the codec-mismatch toast at most once per studio session so
  // it doesn't shout every render.
  const decodeToastShownRef = useRef(false);
  // Remember which URL we last loaded into the engine for each track.
  // Keying just by `t.id` means an out-of-band audio_url change (the
  // audio tools, the librarian re-uploading on another tab) wouldn't
  // re-trigger the load effect, leaving the engine on the old buffer.
  const loadedUrlByTrackRef = useRef<Record<string, string>>({});

  // Load every track's audio into the engine + capture waveform peaks.
  // Tracks load CONCURRENTLY: loadTrack retries a fresh upload's URL for
  // up to ~90s (storage flatten window — see TRACK_FETCH_RETRY_DELAYS_MS
  // in audioEngine.ts), and a sequential loop would let one propagating
  // track block every other row from loading for that long.
  useEffect(() => {
    let cancelled = false;
    void Promise.all(tracks.map(async (t) => {
        const url = t.audio_url || (t.kind === 'accompaniment' ? project?.accompaniment_url : null);
        if (!url) return;
        // Skip when we already have a buffer + peaks for THIS url. If
        // the url has changed since last load, fall through and reload.
        if (loadedUrlByTrackRef.current[t.id] === url && waveformByTrack[t.id]) return;
        try {
          // Hand the engine the record offset so the source plays at the
          // right point on the master timeline. Accompaniment is always 0.
          const offset = (t as any).record_offset_sec ?? 0;
          const { duration, peaks } = await loadTrack(t.id, url, offset);
          if (cancelled) return;
          loadedUrlByTrackRef.current[t.id] = url;
          setWaveformByTrack((prev) => ({ ...prev, [t.id]: peaks }));
          setDurationByTrack((prev) => ({ ...prev, [t.id]: duration }));
          setTrackVolume(t.id, t.volume, t.muted);
          setTrackPan(t.id, t.pan);
          setTrackRecordOffset(t.id, offset);
          setUndecodableTrackIds((prev) => {
            if (!prev.has(t.id)) return prev;
            const next = new Set(prev); next.delete(t.id); return next;
          });
        } catch (err: any) {
          // A superseded load (newer load / blob load / unloadTrack won
          // the race) is not a decode failure — just drop it quietly.
          if (err?.name === 'AbortError') return;
          console.warn('[PartTracksStudio] load failed', t.id, err);
          if (cancelled) return;
          setUndecodableTrackIds((prev) => {
            if (prev.has(t.id)) return prev;
            const next = new Set(prev); next.add(t.id); return next;
          });
          if (!decodeToastShownRef.current && t.kind !== 'accompaniment') {
            decodeToastShownRef.current = true;
            toast.error(`Can't play "${t.label}" on this device`, {
              description: err?.message ?? 'Unable to decode audio track.',
              action: {
                label: 'Clear take',
                onClick: () => clearTakeForTrack(t),
              },
              duration: 10000,
            });
          }
        }
    }));
    return () => { cancelled = true; };
  }, [tracks, project?.accompaniment_url]);

  // Wipe a track's recorded audio (audio_url + offset) without deleting
  // the row, so the user can re-record onto the same part.
  const clearTakeForTrack = async (track: PartTrack) => {
    try {
      unloadTrack(track.id);
      delete loadedUrlByTrackRef.current[track.id];
      setWaveformByTrack((prev) => {
        const next = { ...prev }; delete next[track.id]; return next;
      });
      setDurationByTrack((prev) => {
        const next = { ...prev }; delete next[track.id]; return next;
      });
      setUndecodableTrackIds((prev) => {
        if (!prev.has(track.id)) return prev;
        const next = new Set(prev); next.delete(track.id); return next;
      });
      await updateTrack.mutateAsync({
        id: track.id,
        patch: { audio_url: null, record_offset_sec: 0, waveform_peaks: null } as any,
      });
      toast.success(`Cleared "${track.label}" — ready to re-record.`);
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not clear take.');
    }
  };

  useEffect(() => () => {
    stopPlayback();
    tracks.forEach((t) => unloadTrack(t.id));
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    // Drop any live native peak subscription on unmount so it can't fire
    // into a torn-down component.
    if (externalPeakSubRef.current) {
      void externalPeakSubRef.current.remove();
      externalPeakSubRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!playing) return;
    const tick = () => {
      const t = getCurrentTime();
      setCurrentTime(t);
      const maxD = getMaxDuration();
      // Master-timeline progress: every row's playhead is at the same
      // fraction t/maxD so they visually line up. The audio engine
      // already handles per-track record_offset_sec internally, so
      // here we just need a single shared progress value.
      const masterFrac = maxD > 0 ? Math.min(1, t / maxD) : 0;
      const next: Record<string, number> = {};
      tracks.forEach((tr) => { next[tr.id] = masterFrac; });
      setProgressByTrack(next);
      if (maxD > 0 && t >= maxD) {
        stopPlayback();
        setPlaying(false);
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [playing, tracks, durationByTrack]);

  // Start / stop external streaming sources alongside the local mix.
  //
  // Sync model: we AWAIT the external source's "actually playing" state
  // BEFORE letting local playback / the mic recorder start. MusicKit's
  // setQueue + play() can take 500ms–2s on cold start, and that delay
  // varies session-to-session — if local audio kicked off immediately
  // the vocal would land at a different relative offset every time,
  // and the recorded take would drift against Apple Music on replay.
  // Awaiting the playbackState=2 event gives us a deterministic anchor.
  // Resolves with `true` when MusicKit actually reaches playbackState=2
  // (Playing), `false` if the safety timeout elapsed first. Callers can
  // surface a warning when timed-out so the user knows the take may
  // record over silence (auth issue, network stall, no subscription).
  const waitForAppleMusicPlaying = (kit: any, timeoutMs = 6000): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      const state = () => kit.player?.playbackState ?? kit.playbackState;
      if (state() === 2) return resolve(true);
      let done = false;
      const handler = () => {
        if (done) return;
        if (state() === 2) {
          done = true;
          try { kit.removeEventListener?.('playbackStateDidChange', handler); } catch {}
          resolve(true);
        }
      };
      try { kit.addEventListener?.('playbackStateDidChange', handler); } catch {}
      // Safety timeout — never block the recorder forever.
      setTimeout(() => {
        if (done) return;
        done = true;
        try { kit.removeEventListener?.('playbackStateDidChange', handler); } catch {}
        resolve(false);
      }, timeoutMs);
    });
  };

  const startExternalAccompaniment = async (positionSec: number = 0): Promise<void> => {
    if (!project) return;
    const isAppleSong = project.accompaniment_kind === 'apple_music';
    const isAppleAlbum = project.accompaniment_kind === 'apple_music_album';
    if ((isAppleSong || isAppleAlbum) && (project as any).accompaniment_apple_music_id) {
      const id = (project as any).accompaniment_apple_music_id;

      // On iOS, prefer the native MusicKit plugin. It uses MPMusic-
      // PlayerController.applicationMusicPlayer instead of MusicKit JS
      // in WKWebView — no more script-load races, no auth popup
      // blocked by the OS, and a synchronously-pausable player.
      if (isNativeMusicKitAvailable()) {
        try {
          const auth = await nmkRequestAuthorization();
          if (!auth.authorized) {
            toast.error('Apple Music access denied. Enable Music access in Settings → GleeWorld.');
            return;
          }
          if (isAppleAlbum) await nmkSetQueueAlbum(id);
          else await nmkSetQueueSong(id);
          if (positionSec > 0.05) await nmkSeek(positionSec);
          await nmkPlay();
          const reached = await nmkWaitForPlaying();
          if (!reached) {
            toast.warning('Apple Music did not start playing in time. Your take may record over silence.');
          }
        } catch (e: any) {
          console.error('[PartTracks] Native MusicKit start failed', e);
          toast.error(e?.message ?? 'Apple Music playback failed.');
        }
        return;
      }

      // Web fallback — MusicKit JS shim.
      try {
        const { getMusicKit, authorizeAppleMusic, isAppleMusicAuthorized } = await import('@/lib/musicKit');
        const kit = await getMusicKit();
        appleMusicRef.current = kit;
        if (!(await isAppleMusicAuthorized())) await authorizeAppleMusic();
        await kit.setQueue(isAppleAlbum ? { album: id } : { song: id });
        if (positionSec > 0.05) {
          try { await (kit.seekToTime?.(positionSec) ?? kit.player?.seekToTime?.(positionSec)); } catch {}
        }
        await kit.play();
        const reached = await waitForAppleMusicPlaying(kit);
        if (!reached) {
          toast.warning('Apple Music did not start playing in time. Your take may record over silence — check your Apple Music sign-in.');
        }
        const accTrack = tracks.find((t) => t.kind === 'accompaniment');
        if (accTrack) {
          const soloedIds = new Set(tracks.filter((t) => t.solo).map((t) => t.id));
          const muted = accTrack.muted || (soloedIds.size > 0 && !soloedIds.has(accTrack.id));
          setExternalAccompanimentVolume(accTrack.volume, muted);
        }
      } catch (e: any) {
        toast.error('Apple Music playback failed — sign in required.');
      }
    } else if (project.accompaniment_kind === 'youtube' && (project as any).accompaniment_youtube_url) {
      const id = extractYouTubeVideoId((project as any).accompaniment_youtube_url);
      if (id && ytIframeRef.current?.contentWindow) {
        const win = ytIframeRef.current.contentWindow;
        try {
          win.postMessage(JSON.stringify({ event: 'listening' }), 'https://www.youtube.com');
          if (positionSec > 0.05) {
            win.postMessage(JSON.stringify({ event: 'command', func: 'seekTo', args: [positionSec, true] }), 'https://www.youtube.com');
          }
          win.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: [] }), 'https://www.youtube.com');
        } catch {}
        // YouTube's iframe is best-effort — no reliable "playing now"
        // event from a hidden iframe, so we eat ~500ms to let buffering
        // settle before the mic rolls.
        await new Promise((r) => setTimeout(r, 500));
        const accTrack = tracks.find((t) => t.kind === 'accompaniment');
        if (accTrack) {
          const soloedIds = new Set(tracks.filter((t) => t.solo).map((t) => t.id));
          const muted = accTrack.muted || (soloedIds.size > 0 && !soloedIds.has(accTrack.id));
          setExternalAccompanimentVolume(accTrack.volume, muted);
        }
      }
    }
  };
  // Route the Accompaniment track's volume slider into the external
  // audio source. The local Web Audio gain on the Accompaniment track
  // does nothing when the source is Apple Music or YouTube — those
  // play through their own output pipelines outside our graph. This
  // mirrors the slider's value (or 0 when muted) into the streaming
  // source so the user can mix the backing track against their vocal.
  const setExternalAccompanimentVolume = (volume: number, muted: boolean) => {
    const target = muted ? 0 : Math.max(0, Math.min(1, volume));
    const kind = project?.accompaniment_kind;
    if (kind === 'apple_music' || kind === 'apple_music_album') {
      const kit = appleMusicRef.current;
      if (!kit) return;
      try {
        // MusicKit v3: player.volume (0..1). Older path: kit.volume.
        if (kit.player && 'volume' in kit.player) kit.player.volume = target;
        else if ('volume' in kit) kit.volume = target;
      } catch { /* ignore */ }
    } else if (kind === 'youtube') {
      const win = ytIframeRef.current?.contentWindow;
      if (!win) return;
      try {
        // YouTube IFrame Player API takes 0..100.
        win.postMessage(
          JSON.stringify({ event: 'command', func: 'setVolume', args: [Math.round(target * 100)] }),
          'https://www.youtube.com',
        );
      } catch { /* ignore */ }
    }
  };

  const stopExternalAccompaniment = () => {
    // Native MusicKit path — synchronously-pausable on iOS, no race
    // with the JS shim.
    if (isNativeMusicKitAvailable()) {
      void nmkPause();
      void nmkStop();
      void nmkSeek(0);
    }
    // Web fallback. MusicKit JS splits its API between `kit.player.pause()`
    // and the older `kit.pause()`. Try both, then stop + seek-to-0 so the
    // next Play starts fresh instead of resuming mid-song.
    const kit = appleMusicRef.current;
    if (kit) {
      try { kit.player?.pause?.(); } catch {}
      try { kit.pause?.(); } catch {}
      try { kit.player?.stop?.(); } catch {}
      try { kit.stop?.(); } catch {}
      try { kit.player?.seekToTime?.(0); } catch {}
      try { kit.seekToTime?.(0); } catch {}
    }
    const win = ytIframeRef.current?.contentWindow;
    if (win) {
      try {
        win.postMessage(JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }), 'https://www.youtube.com');
        win.postMessage(JSON.stringify({ event: 'command', func: 'seekTo', args: [0, true] }), 'https://www.youtube.com');
      } catch {}
    }
  };

  const handlePlay = async () => {
    await unlockAudio();
    if (playing) {
      stopPlayback();
      stopExternalAccompaniment();
      setPlaying(false);
      return;
    }
    // Start Apple Music / YouTube FIRST and await it actually playing
    // before kicking off the local mix. Otherwise local audio races
    // ahead by the variable streaming-startup delay and the take drifts.
    await startExternalAccompaniment(currentTime);
    startPlayback(currentTime);
    setPlaying(true);
  };

  // Standard DAW solo: if ANY track has Solo on, only the soloed
  // tracks play. Everything else (including the accompaniment if it
  // isn't soloed) is force-muted. Soloing a voice part AND the
  // accompaniment together is how you preview "my vocal + the backing"
  // — toggle both S buttons. Per-track Mute still wins on the soloed
  // track itself (mute beats solo on the same row).
  useEffect(() => {
    const soloedIds = new Set(tracks.filter((t) => t.solo).map((t) => t.id));
    const anySolo = soloedIds.size > 0;
    for (const t of tracks) {
      const effectiveMute = anySolo
        ? (t.muted || !soloedIds.has(t.id))
        : t.muted;
      setTrackVolume(t.id, t.volume, effectiveMute);
      // Streaming sources don't go through the local gain graph, so we
      // also mirror the effective mute/volume into MusicKit / YouTube
      // for the Accompaniment row.
      if (t.kind === 'accompaniment') {
        setExternalAccompanimentVolume(t.volume, effectiveMute);
      }
    }
  }, [tracks]);

  // Click-to-seek from the waveform. If we're already playing, jump
  // the transport to the new offset live. If we're stopped, just
  // update the parked currentTime so the next Play starts there.
  const seekTo = (sec: number) => {
    const clamped = Math.max(0, Math.min(getMaxDuration() || 0, sec));
    setCurrentTime(clamped);
    if (playing) {
      stopPlayback();
      stopExternalAccompaniment();
      // Await the external source's actual play state before re-firing
      // local audio so the seek lands in sync.
      void (async () => {
        await startExternalAccompaniment(clamped);
        startPlayback(clamped);
      })();
    }
  };

  const handleStop = () => {
    // If we're currently recording, end the take cleanly — saves the
    // audio + persists to the DB — before rewinding the transport.
    // Otherwise pressing Stop would just stop playback while leaving
    // an orphaned MediaRecorder running in the background.
    if (recordingTrackId) {
      const track = tracks.find((t) => t.id === recordingTrackId);
      if (track) {
        void stopRecordingForTrack(track);
        return; // stopRecordingForTrack also halts playback + clears progress
      }
    }
    stopPlayback();
    stopExternalAccompaniment();
    setPlaying(false);
    setCurrentTime(0);
    setProgressByTrack({});
  };

  // Per-track Mic button — toggles ARM only. No mic stream opens, no
  // accompaniment starts. The user then taps the transport Record to
  // actually begin recording.
  const toggleArmTrack = (track: PartTrack) => {
    // Can't change arming mid-take.
    if (recordingTrackId) {
      toast.message('Stop the current take before re-arming.');
      return;
    }
    setArmedTrackId((current) => (current === track.id ? null : track.id));
  };

  // Start or stop the actual recording for whichever track is armed.
  // Wired to the transport Record button.
  const toggleTransportRecord = async () => {
    if (recordingTrackId) {
      const track = tracks.find((t) => t.id === recordingTrackId);
      if (track) await stopRecordingForTrack(track);
      return;
    }
    const track = tracks.find((t) => t.id === armedTrackId);
    if (!track) {
      toast.message('Arm a track first — tap the mic icon on the track you want to record.');
      return;
    }
    await startRecordingForTrack(track);
  };

  // Read a native take's WAV (written by the external recorder to the app
  // tmp dir) into a Blob for the shared downstream. WKWebView can't fetch
  // file:// URLs directly, so route the URI through Capacitor.convertFileSrc
  // — the same recipe Studio's finalized-take path uses (StudioEditor.tsx).
  // Force audio/wav: the recorder writes 16-bit PCM WAV, but the fetched
  // blob's type comes back empty on some WebView versions.
  const readNativeTakeBlob = async (fileUri: string): Promise<Blob> => {
    const { Capacitor } = await import('@capacitor/core');
    const fetchable = Capacitor.convertFileSrc(fileUri);
    const res = await fetch(fetchable);
    const raw = await res.blob();
    return raw.type === 'audio/wav' ? raw : new Blob([raw], { type: 'audio/wav' });
  };

  // Persist a finished take (web OR native) the SAME way: upload to the
  // sheet-music bucket, write the history row, point the track at it,
  // load from the in-memory blob for instant playback, and arm Undo.
  // Extension follows the FINAL blob's type (native = wav, web = the
  // recorder's probed/trimmed type) so the upload path/contentType match.
  const saveTakeBlob = async (track: PartTrack, blob: Blob, offsetSec: number) => {
      // Snapshot pre-save state so Undo can restore it. We capture this
      // BEFORE any mutation runs so React Query refetches don't race us.
      const prevAudioUrl = track.audio_url;
      const prevOffset = track.record_offset_sec ?? 0;
      const prevWaveform = waveformByTrack[track.id] ?? track.waveform_peaks ?? null;
      const prevDuration = durationByTrack[track.id] ?? track.duration_sec ?? 0;
      try {
        const contentType = blob.type || getRecordingMimeType() || 'audio/webm';
        const ext = extensionForMimeType(contentType);
        const path = `part-tracks/${project!.id}/${track.id}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('sheet-music').upload(path, blob, { contentType, upsert: true });
        if (upErr) throw new Error(`Upload failed: ${upErr.message}`);
        const url = supabase.storage.from('sheet-music').getPublicUrl(path).data.publicUrl;
        // Insert the recording-history row and grab its ID so Undo can
        // delete it (otherwise rejected takes pile up in the history).
        // Non-blocking: history is best-effort. If the insert fails (RLS,
        // network blip), the take itself still upload-succeeded and the
        // track row will be updated next — we'd rather keep the audio
        // than orphan it. Undo for THIS take is sacrificed in that case;
        // the user can still wipe the track via Clear take.
        let recordingId: string | undefined;
        {
          const { data: insRow, error: insErr } = await supabase
            .from('gw_part_tracks_recordings')
            .insert({
              track_id: track.id,
              user_id: user?.id ?? null,
              audio_url: url,
              duration_sec: null,
              record_offset_sec: offsetSec,
            } as any)
            .select('id')
            .single();
          if (insErr) {
            console.warn('[PartTracks] Recording-history insert failed; continuing', insErr);
            toast.warning('Take saved, but the history entry could not be written. Undo unavailable for this take.');
          } else {
            recordingId = insRow?.id as string | undefined;
          }
        }
        // Load the just-recorded take into the engine straight from the
        // in-memory blob BEFORE the track-row update triggers a React
        // Query refetch. Avoids fetch/CDN/decode races against the
        // freshly-uploaded URL (which can 403 for up to a minute — the
        // storage flatten window) — and marking loadedUrlByTrackRef +
        // waveform first means the refetch-driven load effect skips the
        // redundant URL fetch entirely.
        try {
          const { peaks, duration } = await loadTrackFromBlob(track.id, blob, offsetSec);
          loadedUrlByTrackRef.current[track.id] = url;
          setWaveformByTrack((prev) => ({ ...prev, [track.id]: peaks }));
          setDurationByTrack((prev) => ({ ...prev, [track.id]: duration }));
        } catch (decodeErr: any) {
          console.warn('[PartTracks] Take saved but in-memory preview failed', decodeErr);
        }
        await updateTrack.mutateAsync({
          id: track.id,
          patch: { audio_url: url, record_offset_sec: offsetSec } as any,
        });
        const description = offsetSec > 0 ? `Offset ${offsetSec.toFixed(1)}s` : undefined;
        // Stash for Cmd/Ctrl+Z. Stays until either the user undoes it,
        // starts a new take, or saves a new one (each save overwrites
        // the slot so undo always rolls back the most-recent take).
        const snapshot = { recordingId, prevAudioUrl, prevOffset, prevWaveform, prevDuration };
        lastUndoableRef.current = { track, snapshot };
        toast.success(`Saved ${track.label}`, {
          description,
          action: {
            label: 'Undo',
            onClick: () => { void undoTake(track, snapshot); },
          },
          duration: 10000,
        });
      } catch (e: any) {
        console.error('[PartTracks] Save take failed', e);
        toast.error(e?.message ?? 'Failed to save take');
      }
  };

  // Stop + persist a NATIVE (iOS) external-recorder take. Mirrors the web
  // stop path's transport teardown, but finalizes via externalRecordStop()
  // and reads the WAV back through Capacitor instead of the web recorder.
  const stopNativeRecordForTrack = async (track: PartTrack) => {
    // Mark the stop so the in-flight externalRecordStart rejection (settled
    // by the plugin's stop()) is recognized as a user cancel, not an error.
    nativeStopRequestedRef.current = true;
    const wasArming = nativeArmingRef.current && !nativeRecRef.current;
    const rec = nativeRecRef.current;

    // Common transport + UI teardown (same shape as the web stop path).
    void endRecordingActivity();
    if (externalPeakSubRef.current) {
      try { await externalPeakSubRef.current.remove(); } catch { /* ignore */ }
      externalPeakSubRef.current = null;
    }
    setRecordingTrackId(null);
    recordingTrackIdRef.current = null;
    stopPlayback();
    stopExternalAccompaniment();
    if (playing) setPlaying(false);
    // Placed offset: where the take actually begins on the master timeline.
    // capturedOffset was stamped BEFORE the native count-in, but an external
    // backing (Apple Music / YouTube) kept advancing through it — so add the
    // count-in lead back — then subtract the hardware round-trip latency.
    const placedOffset = rec
      ? Math.max(0, rec.capturedOffset + rec.countInLeadSec - rec.hardwareLatencyMs / 1000)
      : recordStartOffsetRef.current;
    // Park the playhead at the take's placed start (same reasoning as the
    // web path: leaving it at the end silently skips the fresh source).
    setCurrentTime(placedOffset);
    setProgressByTrack({});
    livePeaksRef.current = [];
    setLivePeaks([]);

    let stopResult: { fileUri: string; durationSec: number } | null = null;
    try {
      stopResult = await NativeStudio.externalRecordStop();
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      nativeRecRef.current = null;
      nativeArmingRef.current = false;
      // "cancelled during count-in" (N1) is a deliberate user cancel — the
      // count-in was aborted before capture rolled. No error toast.
      if (/cancelled during count-in/i.test(msg) || wasArming) {
        // silent — backing already stopped above
      } else {
        console.error('[PartTracks] Native external record stop failed', e);
        toast.error(msg || 'Failed to stop recording.');
      }
      return;
    }
    nativeRecRef.current = null;
    nativeArmingRef.current = false;

    if (!stopResult || !stopResult.fileUri) {
      toast.error('Recording failed — no audio was captured. Check your microphone.');
      return;
    }
    let blob: Blob;
    try {
      blob = await readNativeTakeBlob(stopResult.fileUri);
    } catch (e: any) {
      console.error('[PartTracks] Could not read native take file', e);
      toast.error('Take recorded but could not be read back from disk.');
      return;
    }
    if (!blob || blob.size === 0) {
      toast.error('Recording failed — no audio was captured. Check your microphone.');
      return;
    }
    // NOTE: do NOT trimHeadLatency here — the native path already subtracts
    // the hardware round-trip latency from the placed offset (computed
    // above). Trimming again would double-compensate.
    await saveTakeBlob(track, blob, placedOffset);
  };

  // Internal helpers used by both the per-track and the transport flow.
  const stopRecordingForTrack = async (track: PartTrack) => {
      // iOS native path: the take lives on the AVAudioEngine external
      // recorder, not the web MediaRecorder. Route stop through the plugin.
      if (nativeRecRef.current || nativeArmingRef.current) {
        await stopNativeRecordForTrack(track);
        return;
      }
      // Measured alignment for this take (see takeStampsRef): trim the
      // real capture→backing-audible gap off the head, and/or shift the
      // clip right when capture opened after the anchor (overdub case).
      const stamps = takeStampsRef.current;
      takeStampsRef.current = null;
      const alignment = stamps ? computeTakeAlignment(stamps) : null;
      const blob = await stopRecording(
        alignment ? { trimHeadMsOverride: alignment.trimMs } : undefined,
      );
      // End the Live Activity so the lock screen / Dynamic Island
      // returns to normal. iOS-only, web no-ops.
      void endRecordingActivity();
      // Restore the default ambient session so background apps (Apple
      // Music outside the studio, etc.) get their normal audio routing
      // back. No-op on web.
      void restoreDefaultAudioSession();
      setRecordingTrackId(null);
      recordingTrackIdRef.current = null;
      // End the playback session too. Standard DAW behaviour: hitting
      // Stop also stops the backing track so the user can tap Play to
      // preview their take without it racing the still-running source.
      // Unconditionally tear down the external accompaniment — even if
      // React `playing` state somehow flipped off mid-take, the backing
      // (Apple Music / YouTube) should never outlive the recording.
      stopPlayback();
      stopExternalAccompaniment();
      if (playing) setPlaying(false);
      // Park the playhead back at the START of this take. Otherwise
      // the rAF loop leaves currentTime at the END of the recording —
      // and the next Play starts from there, which means the engine's
      // `localOffsetInBuffer >= t.durationSec` short-circuit silently
      // skips the just-recorded source. Result: "can't hear my
      // recording, only the accompaniment."
      const takeStart = recordStartOffsetRef.current;
      setCurrentTime(takeStart);
      setProgressByTrack({});
      // Clear live peaks now that the take has ended. The full saved
      // waveform replaces them once loadTrackFromBlob returns peaks.
      livePeaksRef.current = [];
      setLivePeaks([]);
      // Floor is 1KB, not just non-empty: a broken MediaRecorder path can
      // emit a header-only husk (observed 2026-07-07 on Safari's webm
      // recorder — a 5-byte Cues fragment) that passes a size>0 check but
      // contains no audio. Uploading it poisons the track with an
      // undecodable take.
      if (!blob || blob.size < 1024) {
        toast.error('Recording failed — no audio was captured. Check your microphone.');
        return;
      }
      // Overdub case: capture opened later than the anchor — that audio
      // can't be trimmed into existence, so the take places later instead.
      const offsetSec = recordStartOffsetRef.current + (alignment?.clipStartOffsetSec ?? 0);
      await saveTakeBlob(track, blob, offsetSec);
  };

  // Restore a track to its pre-recording state. Called from the Undo
  // action on the "Saved <part>" toast. Deletes the recording-history
  // row so rejected takes don't linger; if there was a prior take, the
  // load effect picks it back up from the now-restored audio_url.
  const undoTake = async (
    track: PartTrack,
    prev: {
      recordingId: string | undefined;
      prevAudioUrl: string | null;
      prevOffset: number;
      prevWaveform: number[] | null;
      prevDuration: number;
    },
  ) => {
    // Consume the slot immediately so double-tap of Cmd+Z (or a
    // rapidly-clicked Undo) can't fire twice and tear down a healthy
    // re-record state.
    if (lastUndoableRef.current?.track.id === track.id) {
      lastUndoableRef.current = null;
    }

    // STOP first. The just-recorded buffer is potentially in the
    // playback queue; ripping its engine entry out mid-play produced
    // the audible glitch the user was hearing.
    if (playing) {
      stopPlayback();
      stopExternalAccompaniment();
      setPlaying(false);
    }
    if (recordingTrackIdRef.current === track.id) {
      // Should never happen — undo is invoked from the Saved toast,
      // i.e. after stopRecording resolved — but defend anyway.
      try { await stopRecording(); } catch {}
      setRecordingTrackId(null);
      recordingTrackIdRef.current = null;
    }

    // VISUAL + ENGINE reset goes FIRST so the user sees the undo
    // immediately and the React Query refetch (triggered by the DB
    // mutation below) can't race ahead and re-paint the just-saved
    // peaks on top of the restored state.
    unloadTrack(track.id);
    delete loadedUrlByTrackRef.current[track.id];
    setWaveformByTrack((p) => {
      const next = { ...p };
      if (prev.prevWaveform) next[track.id] = prev.prevWaveform; else delete next[track.id];
      return next;
    });
    setDurationByTrack((p) => {
      const next = { ...p };
      if (prev.prevDuration > 0) next[track.id] = prev.prevDuration; else delete next[track.id];
      return next;
    });
    setProgressByTrack((p) => { const n = { ...p }; delete n[track.id]; return n; });
    // Also park the timeline back at 0 since the just-saved duration
    // was the multitrack's new max.
    setCurrentTime(0);

    // DB writes second. Order: restore the track row FIRST so even if
    // the history row delete fails, the track is already pointing
    // back at the previous take.
    try {
      await updateTrack.mutateAsync({
        id: track.id,
        patch: {
          audio_url: prev.prevAudioUrl,
          record_offset_sec: prev.prevOffset,
        } as any,
      });
      if (prev.recordingId) {
        // Non-blocking: if the history-row delete fails we still got
        // the meaningful undo (the track itself is back to its prior
        // state). The orphan history row is a soft cost.
        try {
          await supabase.from('gw_part_tracks_recordings').delete().eq('id', prev.recordingId);
        } catch (histErr) {
          console.warn('[PartTracks] Undo: history-row delete failed', histErr);
        }
      }
      toast.success(`Undid take on "${track.label}"`);
    } catch (e: any) {
      console.error('[PartTracks] Undo failed', e);
      toast.error(e?.message ?? 'Undo failed.');
    }
  };

  // Cmd+Z (mac) / Ctrl+Z (PC) → undo the most-recent take. Ignored when
  // the user is typing in an input/textarea so we don't fight the OS's
  // text-undo. Empty slot ⇒ short toast hint.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isUndo = (e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'z';
      if (!isUndo) return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) return;
      if (recordingTrackIdRef.current) return; // mid-take — don't undo
      e.preventDefault();
      const slot = lastUndoableRef.current;
      if (!slot) {
        toast.message('Nothing to undo.');
        return;
      }
      void undoTake(slot.track, slot.snapshot);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Apply an audio tool (trim / normalize / denoise) to a track's
  // recorded take. Reads the decoded buffer from the engine, runs the
  // processor, encodes to WAV, uploads, swaps audio_url, reloads.
  const runAudioTool = async (
    track: PartTrack,
    tool: 'trim' | 'normalize' | 'denoise',
  ) => {
    if (!track.audio_url) {
      toast.message('Nothing to process — record this part first.');
      return;
    }
    const buffer = getTrackBuffer(track.id);
    if (!buffer) {
      toast.error('This take can\'t be processed here (fallback playback mode). Re-record it on this device first.');
      return;
    }
    setProcessingTrackIds((prev) => { const n = new Set(prev); n.add(track.id); return n; });
    try {
      let out: AudioBuffer;
      if (tool === 'trim') out = trimSilence(buffer);
      else if (tool === 'normalize') out = normalize(buffer);
      else out = await reduceNoise(buffer);

      const wav = bufferToWav(out);
      const path = `part-tracks/${project!.id}/${track.id}-${tool}-${Date.now()}.wav`;
      const { error: upErr } = await supabase.storage
        .from('sheet-music').upload(path, wav, { contentType: 'audio/wav', upsert: true });
      if (upErr) throw new Error(`Upload failed: ${upErr.message}`);
      const url = supabase.storage.from('sheet-music').getPublicUrl(path).data.publicUrl;
      // Record-offset unchanged: we processed in place, so the take
      // still sits at the same timeline position as before.
      const offset = (track as any).record_offset_sec ?? 0;
      await supabase.from('gw_part_tracks_recordings').insert({
        track_id: track.id,
        user_id: user?.id ?? null,
        audio_url: url,
        duration_sec: out.duration,
        record_offset_sec: offset,
      } as any);
      // Swap the engine onto the processed WAV from memory BEFORE the
      // track-row update triggers a refetch — the new URL can 403 for up
      // to a minute (storage flatten window), and marking the ref +
      // waveform first stops the load effect from re-fetching it.
      unloadTrack(track.id);
      const { peaks, duration } = await loadTrackFromBlob(track.id, wav, offset);
      loadedUrlByTrackRef.current[track.id] = url;
      setWaveformByTrack((prev) => ({ ...prev, [track.id]: peaks }));
      setDurationByTrack((prev) => ({ ...prev, [track.id]: duration }));
      await updateTrack.mutateAsync({
        id: track.id,
        patch: { audio_url: url, record_offset_sec: offset } as any,
      });
      const labels = { trim: 'Trimmed', normalize: 'Normalized', denoise: 'Cleaned' } as const;
      toast.success(`${labels[tool]} "${track.label}"`);
    } catch (e: any) {
      console.error('[PartTracks] Audio tool failed', tool, e);
      toast.error(e?.message ?? `${tool} failed.`);
    } finally {
      setProcessingTrackIds((prev) => { const n = new Set(prev); n.delete(track.id); return n; });
    }
  };

  // Append one normalized peak (0..1) to the rolling live-waveform buffer,
  // downsampling when it grows past the cap. Shared by the web `onLevel`
  // tick and the native 'externalRecordPeak' listener so both draw the
  // same live waveform. Cap: ~16 peaks/sec, so 2048 is ~2min before the
  // resolution halves.
  const appendLivePeak = (peak: number) => {
    const arr = livePeaksRef.current;
    arr.push(peak);
    if (arr.length > 2048) {
      // Halve resolution by averaging adjacent pairs. The odd-length case
      // is handled explicitly: the trailing unpaired sample is copied
      // straight across, no off-by-one games.
      const outLen = Math.ceil(arr.length / 2);
      const next: number[] = new Array(outLen);
      for (let j = 0; j < outLen; j++) {
        const a = arr[j * 2];
        const b = arr[j * 2 + 1];
        next[j] = b === undefined ? a : (a + b) / 2;
      }
      livePeaksRef.current = next;
    }
    setLivePeaks(livePeaksRef.current.slice());
  };

  // Which external backing source this project uses — drives whether the
  // native record session must cede to MusicKit ('appleMusic') or can mix
  // over the source ('youtube'/'file').
  const getBackingKind = (): 'appleMusic' | 'youtube' | 'file' | 'none' => {
    const k = project?.accompaniment_kind;
    if (k === 'apple_music' || k === 'apple_music_album') return 'appleMusic';
    if (k === 'youtube') return 'youtube';
    if (project?.accompaniment_url || k === 'file') return 'file';
    return 'none';
  };

  // Task 5 (headphone/bleed guard). Called just before capture begins on
  // BOTH the native and web record-start paths. Warns only when ALL of:
  //  - a backing source will be audible during this take (willPlayBacking)
  //  - the route is CONFIRMED not headphones — `false`, not `null`/unknown
  //    (native `getNativeAudioRoute`, or the web heuristic
  //    `getLikelyAudioRoute` in sharedRecorder.ts; `null` means "don't
  //    know" and is treated as "don't warn", not "warn")
  //  - echo cancellation is off (`aecOff`) — always true on the native
  //    path (the .videoRecording session mode used by
  //    prepareExternalRecordSession disables the speech DSP), or gated by
  //    isMusicModeEnabled() on the web path (audioEngine.ts's
  //    startRecording sets `echoCancellation: !musicMode`).
  // Never blocks recording — this only flips UI state. Any failure
  // reading the route (native call rejects, enumerateDevices throws) is
  // swallowed: better to skip a warning than to fail a record-start over
  // a diagnostic check.
  const maybeShowBleedWarning = async (willPlayBacking: boolean, aecOff: boolean): Promise<void> => {
    if (bleedWarningDismissedForSession || !willPlayBacking || !aecOff) return;
    try {
      const isHeadphones = isNativeStudioAvailable()
        ? (await getNativeAudioRoute())?.isHeadphones ?? null
        : (await getLikelyAudioRoute()).isHeadphones;
      if (isHeadphones === false) setBleedWarning(true);
    } catch {
      /* best-effort — see comment above */
    }
  };

  const dismissBleedWarning = () => {
    bleedWarningDismissedForSession = true;
    setBleedWarning(false);
  };

  // iOS native record flow (Task 4). Captures the mic on the shared native
  // AVAudioEngine (StudioEnginePlugin.externalRecord*) OVER the backing
  // source, with hardware-latency-compensated placement. Replaces the web
  // getUserMedia + playCountIn + startRecording path on iOS. Falls back to
  // the web path when MusicKit owns the session and native capture can't
  // get a record route.
  const startNativeRecordForTrack = async (track: PartTrack): Promise<void> => {
    const backing = getBackingKind();
    nativeStopRequestedRef.current = false;
    try {
      // Task 5 (headphone/bleed guard) — checked before capture begins.
      // The native external-record session mode (.videoRecording, set by
      // prepareExternalRecordSession below) always disables the speech
      // DSP, so echo cancellation is off on this path unconditionally.
      void maybeShowBleedWarning(backing !== 'none', true);

      // Unlock the web audio graph inside the user gesture — the local mix
      // (other recorded parts + any local-file backing) still rides it.
      await unlockAudio();

      // prepareExternalRecordSession SUPERSEDES AudioSessionConfigPlugin's
      // configureForMusicRecording on this path: it sets .playAndRecord +
      // .mixWithOthers when we own the session, or (Apple Music) leaves the
      // MusicKit-owned session untouched and resolves sessionConfigured=false.
      let prepared: { sessionConfigured: boolean };
      try {
        prepared = await NativeStudio.prepareExternalRecordSession({
          musicKitOwnsSession: backing === 'appleMusic',
          mixWithOthers: true,
        });
      } catch (e: any) {
        // Nothing has started yet — fully recoverable. Surface + bail.
        console.error('[PartTracks] prepareExternalRecordSession failed', e);
        toast.error(e?.message ?? 'Could not prepare the recording session.');
        return;
      }

      lastUndoableRef.current = null;

      // Punch-in seeks the transport to the in-mark before we capture the
      // offset, so the take starts exactly there.
      if (punchIn !== null) seekTo(punchIn);

      // Capture the master-timeline position the instant we begin the take.
      recordStartOffsetRef.current = playing ? getCurrentTime() : (punchIn ?? 0);
      livePeaksRef.current = [];
      setLivePeaks([]);

      // Start the backing source FIRST (unchanged path) and await it audible
      // — the native count-in then runs over it. No-op for file/none backing
      // (that plays through the local mix, started post-capture below).
      if (!playing) {
        await startExternalAccompaniment(recordStartOffsetRef.current);
      }

      // Live waveform: native mic peaks arrive as dBFS on 'externalRecordPeak'.
      // Convert to a 0..1 amplitude to match the web onLevel scale.
      externalPeakSubRef.current = await NativeStudio.addListener(
        'externalRecordPeak',
        ({ db }) => {
          const amp = !Number.isFinite(db) || db <= -160 ? 0 : Math.min(1, Math.pow(10, db / 20));
          appendLivePeak(amp);
        },
      );

      // Count-in timing mirrors playCountIn: interval = 60 / clamped BPM.
      const bpm = project?.tempo_bpm ?? 100;
      const secondsPerBeat = 60 / Math.max(20, Math.min(300, bpm));

      // Optimistically show the take as live so the transport Stop can cancel
      // the count-in — externalRecordStart hasn't resolved yet. armingRef
      // routes stopRecordingForTrack to the native stop during this window.
      nativeArmingRef.current = true;
      setRecordingTrackId(track.id);
      recordingTrackIdRef.current = track.id;
      setArmedTrackId(track.id);
      void startRecordingActivity(project?.title ?? 'Part Tracks', track.label);

      let started: { startedAtEpochMs: number; hardwareLatencyMs: number };
      try {
        started = await NativeStudio.externalRecordStart({
          countInBeats,
          secondsPerBeat,
          clickVolume: 0.7,
        });
      } catch (e: any) {
        nativeArmingRef.current = false;
        const msg = e?.message ?? String(e);
        // A concurrent user-stop settled this start via the plugin's stop()
        // ("capture stopped before it started"). stopNativeRecordForTrack
        // owns all teardown in that case — do nothing here.
        if (nativeStopRequestedRef.current || /capture stopped before/i.test(msg)) {
          return;
        }
        // Detach the peak sub before either branch below.
        if (externalPeakSubRef.current) {
          try { await externalPeakSubRef.current.remove(); } catch { /* ignore */ }
          externalPeakSubRef.current = null;
        }
        // FALLBACK: MusicKit owned the session (sessionConfigured=false) and
        // the dead-input watchdog rejected ("no record route"). Fall back to
        // the Task-2 web capture path, which re-establishes its own mic graph.
        if (prepared.sessionConfigured === false) {
          console.info('[PartTracks] Native external record unavailable under MusicKit-owned session — falling back to web capture path.');
          // Clean the optimistic native state + backing so the web path can
          // start fresh (it re-arms its own session, count-in, and backing).
          nativeRecRef.current = null;
          setRecordingTrackId(null);
          recordingTrackIdRef.current = null;
          stopExternalAccompaniment();
          setPlaying(false);
          void endRecordingActivity();
          await startRecordingForTrack(track, { fallbackFromNative: true });
          return;
        }
        // Genuine failure — leave the UI recoverable: clear the take, stop
        // the backing, end the Live Activity.
        console.error('[PartTracks] externalRecordStart failed', e);
        setRecordingTrackId(null);
        recordingTrackIdRef.current = null;
        stopExternalAccompaniment();
        if (playing) setPlaying(false);
        void endRecordingActivity();
        toast.error(msg || 'Could not start recording.');
        return;
      }

      // Capture rolling. Record the anchor for the stop/save flow: the
      // placed offset adds the count-in lead and subtracts hardware latency
      // at save time (see stopNativeRecordForTrack).
      //
      // countInLeadSec: the offset above was stamped BEFORE the native
      // count-in ran, but an EXTERNAL backing (Apple Music / YouTube)
      // keeps playing through the pre-roll — capture actually starts
      // countInBeats*secondsPerBeat later on that backing's timeline, so
      // the take must be placed that much later or it lands exactly the
      // count-in early. File/none backing stays 0: the local mix starts
      // AFTER the count-in (startPlayback below), already aligned.
      const countInLeadSec = (backing === 'appleMusic' || backing === 'youtube')
        ? countInBeats * secondsPerBeat
        : 0;
      nativeArmingRef.current = false;
      nativeRecRef.current = {
        trackId: track.id,
        capturedOffset: recordStartOffsetRef.current,
        countInLeadSec,
        hardwareLatencyMs: started.hardwareLatencyMs,
      };

      // Start the local mix (other recorded parts + any local-file backing)
      // now that native capture is rolling — mirrors the web path's
      // post-recorder startPlayback so parts stay aligned with the take.
      startPlayback(recordStartOffsetRef.current);
      setPlaying(true);

      // Punch-out safety net (same as web).
      if (punchOut !== null && punchOut > recordStartOffsetRef.current) {
        const ms = (punchOut - recordStartOffsetRef.current) * 1000;
        setTimeout(() => {
          if (recordingTrackIdRef.current === track.id) {
            void stopRecordingForTrack(track);
          }
        }, ms);
      }

      const msg = recordStartOffsetRef.current > 0
        ? `Recording ${track.label} from ${recordStartOffsetRef.current.toFixed(1)}s.`
        : backing !== 'none'
          ? `Recording ${track.label} — accompaniment playing.`
          : `Recording ${track.label}.`;
      toast.message(msg);
    } catch (e: any) {
      // Rare post-backing-start throw (e.g. addListener rejecting): make
      // sure the backing doesn't keep playing with no recording, the peak
      // sub doesn't leak, and the record button is usable again.
      nativeArmingRef.current = false;
      nativeRecRef.current = null;
      if (externalPeakSubRef.current) {
        try { await externalPeakSubRef.current.remove(); } catch { /* ignore */ }
        externalPeakSubRef.current = null;
      }
      stopExternalAccompaniment();
      setRecordingTrackId(null);
      recordingTrackIdRef.current = null;
      void endRecordingActivity();
      console.error('[PartTracks] Native start recording failed', e);
      toast.error(e?.message ?? 'Could not start recording.');
    }
  };

  const startRecordingForTrack = async (
    track: PartTrack,
    opts?: { fallbackFromNative?: boolean },
  ) => {
    // iOS uses the native external recorder (Task 4). The web path below is
    // the fallback when native capture can't get a record route under a
    // MusicKit-owned session (opts.fallbackFromNative), and the path for all
    // non-iOS platforms.
    // Apple Music goes straight to web capture: MPMusicPlayerController owns
    // the audio session, so the native recorder's watchdog would reject after
    // ~1.5s, stop/restart the Music playback, and re-run the count-in before
    // landing here anyway. (Device-gate experiment for later: establishing a
    // .playAndRecord session BEFORE MusicKit playback may enable the native
    // path — see plan Task 6.)
    if (isNativeStudioAvailable() && !opts?.fallbackFromNative && getBackingKind() !== 'appleMusic') {
      await startNativeRecordForTrack(track);
      return;
    }
    try {
      // Unlock audio context inside the user gesture so iOS permits
      // both the mic stream AND the playback graph below to start.
      await unlockAudio();

      // Task 5 (headphone/bleed guard) — checked before capture begins.
      // On this web path echo cancellation is off exactly when music
      // mode is on (audioEngine.ts's startRecording sets
      // `echoCancellation: !musicMode`), so that's the aecOff gate here
      // (unlike the native path, which is always AEC-off).
      void maybeShowBleedWarning(getBackingKind() !== 'none', isMusicModeEnabled());

      // On iOS Capacitor, switch the system audio session into
      // recording mode. This bypasses iOS's speech-DSP path so the
      // vocal capture isn't pre-processed before WKWebView sees it.
      //
      // SKIP when the backing track is Apple Music — MPMusicPlayer
      // .applicationMusicPlayer owns the system audio session and
      // even `.mixWithOthers` on our `.playAndRecord` interrupt
      // pauses its playback. With Apple Music backing we let the
      // Music session stay primary and accept the default mic DSP.
      // (This guard is preserved for the native→web fallback, which only
      // fires under an Apple-Music-owned session.)
      const isAppleMusicBacking =
        project?.accompaniment_kind === 'apple_music' ||
        project?.accompaniment_kind === 'apple_music_album';
      if (isNativeAudioSessionAvailable() && isMusicModeEnabled() && !isAppleMusicBacking) {
        await configureForMusicRecording();
      }

      // Starting a new take invalidates the prior undo slot — Cmd+Z
      // should never roll back to a take older than the one before the
      // one currently being recorded.
      lastUndoableRef.current = null;

      // Count-in: play N metronome clicks at project tempo BEFORE the
      // recorder rolls. Singer hears "1, 2, 3, 4" then the take starts.
      if (countInBeats > 0) {
        const bpm = project?.tempo_bpm ?? 100;
        const waitSec = playCountIn(countInBeats, bpm);
        await new Promise((r) => setTimeout(r, waitSec * 1000));
      }

      // Punch-in seeks the transport to the in-mark so the take starts
      // exactly there, not from wherever the playhead happened to sit.
      if (punchIn !== null) {
        seekTo(punchIn);
      }

      // Capture the master-timeline position the INSTANT we start
      // recording. If playback is already going we lock to that
      // playhead; otherwise we begin a new take from the very top.
      const wasPlayingAtPress = playing;
      const pressWallMs = performance.now();
      recordStartOffsetRef.current = playing ? getCurrentTime() : (punchIn ?? 0);
      livePeaksRef.current = [];
      setLivePeaks([]);

      // External accompaniment FIRST and AWAIT it actually playing.
      // MusicKit's setQueue + play() takes 500ms–2s to reach the
      // playbackState=2 (Playing) event. If we started the mic and
      // local audio before that, the vocal would lead Apple Music by
      // the warm-up delay — and that delay differs every session,
      // which is why takes never lined up on replay. Awaiting here
      // anchors the recorder to Apple Music's audible start.
      const isStreamingBacking = getBackingKind() === 'appleMusic' || getBackingKind() === 'youtube';
      let backingAudibleWallMs: number | null = null;
      if (!playing) {
        await startExternalAccompaniment(recordStartOffsetRef.current);
        if (isStreamingBacking) backingAudibleWallMs = performance.now();
      }

      await startRecording({
        inputDeviceId,
        musicMode: isMusicModeEnabled(),
        onLevel: appendLivePeak,
      });
      const captureStartWallMs = getLastCaptureStartWallMs() ?? performance.now();
      setRecordingTrackId(track.id);
      recordingTrackIdRef.current = track.id;
      setArmedTrackId(track.id); // keep arm light on while recording

      // Start a Live Activity so the lock screen + Dynamic Island show
      // "Recording: <part>" with a live elapsed timer. The widget
      // extension that renders the UI must be added in Xcode; the
      // plugin warns once if it's missing. iOS-only, web no-ops.
      void startRecordingActivity(project?.title ?? 'Part Tracks', track.label);

      // Local backing tracks fire NOW that the mic recorder is rolling
      // and the external source is already audible. External start was
      // awaited above, so this last call closes the sync triangle.
      let transportStartWallMs: number | null = null;
      if (!playing) {
        startPlayback(recordStartOffsetRef.current);
        // + the 50ms scheduling anchor inside startPlayback (sources fire
        // at ctx.currentTime + 0.05, not at the call itself).
        transportStartWallMs = performance.now() + 50;
        setPlaying(true);
      }

      // Stamp the take so stop can MEASURE the real head gap instead of
      // trusting a fixed trim guess (real startup — mic open, audio
      // session switch on iOS — varies 0.3s–2.5s and landed takes "a
      // measure late"). Three shapes, same model as Studio's
      // takeAlignment.ts:
      //  - fresh start, local/file backing → transport stamp set: trim
      //    the measured capture→audible gap + hardware residual;
      //  - fresh start, streaming backing → backing became audible when
      //    startExternalAccompaniment resolved, BEFORE capture: treat as
      //    the already-running case anchored at that moment;
      //  - overdub while playing → anchor is the press moment; capture
      //    opened late, so the clip shifts right instead of trimming.
      takeStampsRef.current = {
        pressWallMs: !wasPlayingAtPress && backingAudibleWallMs !== null
          ? backingAudibleWallMs
          : pressWallMs,
        captureStartWallMs,
        transportStartWallMs: !wasPlayingAtPress && !isStreamingBacking
          ? transportStartWallMs
          : null,
        deviceLatencyMs: getConfiguredDeviceLatencyMs(),
      };

      // Punch-out: schedule auto-stop at the out-mark. If the user hits
      // Stop earlier, that path also tears the recorder down so this
      // timer is purely a safety net.
      if (punchOut !== null && punchOut > recordStartOffsetRef.current) {
        const ms = (punchOut - recordStartOffsetRef.current) * 1000;
        setTimeout(() => {
          if (recordingTrackIdRef.current === track.id) {
            void stopRecordingForTrack(track);
          }
        }, ms);
      }

      const hasAccompaniment =
        !!project?.accompaniment_url ||
        project?.accompaniment_kind === 'apple_music' ||
        project?.accompaniment_kind === 'apple_music_album' ||
        project?.accompaniment_kind === 'youtube';
      const msg = recordStartOffsetRef.current > 0
        ? `Recording ${track.label} from ${recordStartOffsetRef.current.toFixed(1)}s.`
        : hasAccompaniment
          ? `Recording ${track.label} — accompaniment playing.`
          : `Recording ${track.label}.`;
      toast.message(msg);
    } catch (e: any) {
      console.error('[PartTracks] Start recording failed', e);
      toast.error(e?.message ?? 'Mic permission denied');
    }
  };

  const uploadAccompaniment = async (file: File) => {
    if (!project) return;
    try {
      // Reject obviously-broken pickups before they hit the network.
      if (!file || file.size === 0) {
        toast.error('Selected file is empty or could not be read.');
        return;
      }
      // 100MB cap matches the storage bucket policy. Larger files
      // would fail mid-upload with a less-helpful error.
      const MAX_SIZE = 100 * 1024 * 1024;
      if (file.size > MAX_SIZE) {
        toast.error(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max is 100MB.`);
        return;
      }

      // Infer content type from extension when iOS returns empty
      // `file.type` (common for Files-app picks that came via AirDrop
      // or iCloud). Without this Supabase Storage rejects the upload
      // or stores it with an unhelpful `application/octet-stream`.
      const ext = (file.name.split('.').pop() || 'mp3').toLowerCase();
      const MIME_BY_EXT: Record<string, string> = {
        mp3: 'audio/mpeg',
        m4a: 'audio/mp4',
        aac: 'audio/aac',
        wav: 'audio/wav',
        flac: 'audio/flac',
        ogg: 'audio/ogg',
        webm: 'audio/webm',
      };
      const contentType = file.type && file.type !== 'application/octet-stream'
        ? file.type
        : (MIME_BY_EXT[ext] ?? 'audio/mpeg');

      const path = `part-tracks/${project.id}/accompaniment-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from('sheet-music').upload(path, file, { contentType, upsert: true });
      if (error) throw new Error(`Upload failed: ${error.message}`);
      const url = supabase.storage.from('sheet-music').getPublicUrl(path).data.publicUrl;

      // Load the backing track into the engine straight from the picked
      // file, BEFORE the DB mutations below trigger a React Query refetch.
      // The public URL can 403 for up to a minute after upload (storage
      // flatten window) — waiting on it made a fresh upload look broken:
      // no waveform, silent playback, and silence behind the next take.
      // Marking loadedUrlByTrackRef + waveform state first also stops the
      // load effect from kicking off a redundant URL fetch of the same
      // bytes when the refetch lands.
      const accTrack = tracks.find((t) => t.kind === 'accompaniment');
      if (accTrack) {
        try {
          const { peaks, duration } = await loadTrackFromBlob(accTrack.id, file, 0);
          loadedUrlByTrackRef.current[accTrack.id] = url;
          setWaveformByTrack((prev) => ({ ...prev, [accTrack.id]: peaks }));
          setDurationByTrack((prev) => ({ ...prev, [accTrack.id]: duration }));
          setTrackVolume(accTrack.id, accTrack.volume, accTrack.muted);
          setTrackPan(accTrack.id, accTrack.pan);
          setUndecodableTrackIds((prev) => {
            if (!prev.has(accTrack.id)) return prev;
            const next = new Set(prev); next.delete(accTrack.id); return next;
          });
        } catch (previewErr) {
          // Undecodable here may still decode via the URL path (or the
          // HTMLAudioElement fallback) — leave it to the load effect.
          console.warn('[PartTracks] Backing uploaded but immediate preview failed', previewErr);
        }
      }

      await updateProject.mutateAsync({
        accompaniment_url: url,
        accompaniment_title: file.name,
        accompaniment_kind: 'file' as any,
        accompaniment_apple_music_id: null,
        accompaniment_youtube_url: null,
      } as any);
      if (accTrack) await updateTrack.mutateAsync({ id: accTrack.id, patch: { audio_url: url } });
      toast.success(`Loaded "${file.name}" as the backing track.`);
    } catch (e: any) {
      console.error('[PartTracks] Accompaniment upload failed', e);
      toast.error(e?.message ?? 'Upload failed');
    }
  };

  const pickAppleMusic = async (input: { id: string; storefront: string; title: string; artist: string; artworkUrl: string | null }) => {
    if (!project) return;
    await updateProject.mutateAsync({
      accompaniment_url: null,
      accompaniment_title: `${input.title} · ${input.artist}`,
      accompaniment_kind: 'apple_music' as any,
      accompaniment_apple_music_id: input.id,
      accompaniment_apple_music_storefront: input.storefront,
      accompaniment_apple_music_artist: input.artist,
      accompaniment_apple_music_artwork_url: input.artworkUrl,
      accompaniment_youtube_url: null,
    } as any);
    const accTrack = tracks.find((t) => t.kind === 'accompaniment');
    if (accTrack) await updateTrack.mutateAsync({ id: accTrack.id, patch: { audio_url: null } });
    toast.success('Apple Music backing track set — sign in once when you press play.');
  };

  const pickAppleMusicAlbum = async (input: { id: string; storefront: string; title: string; artist: string; artworkUrl: string | null }) => {
    if (!project) return;
    await updateProject.mutateAsync({
      accompaniment_url: null,
      accompaniment_title: `${input.title} · ${input.artist} (album)`,
      // 'apple_music_album' is a distinct kind so playback uses
      // setQueue({ album: id }) instead of { song: id }.
      accompaniment_kind: 'apple_music_album' as any,
      accompaniment_apple_music_id: input.id,
      accompaniment_apple_music_storefront: input.storefront,
      accompaniment_apple_music_artist: input.artist,
      accompaniment_apple_music_artwork_url: input.artworkUrl,
      accompaniment_youtube_url: null,
    } as any);
    const accTrack = tracks.find((t) => t.kind === 'accompaniment');
    if (accTrack) await updateTrack.mutateAsync({ id: accTrack.id, patch: { audio_url: null } });
    toast.success('Apple Music album set — sign in once when you press play.');
  };

  const pickYouTube = async (url: string) => {
    if (!project) return;
    await updateProject.mutateAsync({
      accompaniment_url: null,
      accompaniment_title: 'YouTube backing track',
      accompaniment_kind: 'youtube' as any,
      accompaniment_apple_music_id: null,
      accompaniment_youtube_url: url,
    } as any);
    const accTrack = tracks.find((t) => t.kind === 'accompaniment');
    if (accTrack) await updateTrack.mutateAsync({ id: accTrack.id, patch: { audio_url: null } });
    toast.success('YouTube backing track set.');
  };

  const fmtTime = (s: number) => {
    if (!Number.isFinite(s) || s < 0) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (!project) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-foreground bg-card">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  const maxDuration = Math.max(getMaxDuration(), ...Object.values(durationByTrack));

  return (
    <div className="min-h-[calc(100dvh-4.5rem)] bg-muted/30">
      {/* ── Studio Header ───────────────────────────────────────────── */}
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4 flex-wrap">
          <Button asChild variant="ghost" size="sm">
            <Link to="/dashboard/part-tracks">
              <ArrowLeft className="w-4 h-4 mr-1" /> All projects
            </Link>
          </Button>
          <div className="flex-1 min-w-0">
            {/* Eyebrow + Linked badge only on tablet+ — on phone portrait
                the back button + Open score + Tools chew up too much
                horizontal room and the eyebrow was wrapping to 3 lines. */}
            <div className="hidden sm:flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
              <AudioWaveform className="w-3 h-3 text-primary" />
              Part Tracks Studio
            </div>
            <div className="flex items-center gap-2 sm:mt-0.5">
              <h1 className="text-base sm:text-2xl font-semibold tracking-tight truncate min-w-0">
                {project.title}
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-primary bg-primary/10 rounded-full px-2 py-0.5 shrink-0">
                <Sparkles className="w-3 h-3" /> Linked
              </span>
            </div>
            {score && (
              <div className="hidden sm:block text-sm text-muted-foreground truncate mt-0.5">
                {score.title}{score.composer ? ` · ${score.composer}` : ''}
                {project.voicing ? ` · ${project.voicing}` : ''}
              </div>
            )}
          </div>
          {score?.pdf_url && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setScoreOpen(true)}
            >
              <Music className="w-4 h-4 mr-1" /> Open score
            </Button>
          )}
          {/* Tools button — visible on phone, iPad portrait, AND iPad
              landscape. Only hidden at xl+ where the right rail is
              rendered inline. Opens Devices / Recording / Audio tools /
              Practice tracks as a Sheet. */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setToolsOpen(true)}
            className="xl:hidden"
          >
            <Wrench className="w-4 h-4 mr-1" /> Tools
          </Button>
        </div>
      </header>

      {/* ── Main Studio Layout ──────────────────────────────────────── */}
      {/* Phone + iPad portrait: stacked 1-col.
          iPad landscape (lg ≥ 1024): 2-col — left rail + center timeline; the
            right tools rail opens via the "Tools" button in the header.
          Desktop (xl ≥ 1280): full 3-col with the right tools rail visible. */}
      <div className="max-w-7xl mx-auto p-3 sm:p-4 grid grid-cols-1 lg:grid-cols-[240px_1fr] xl:grid-cols-[240px_1fr_240px] gap-3 sm:gap-4">
        {/* Left — session setup + voice parts roster */}
        <aside className="space-y-3">
          <Section title="Accompaniment">
            {project.accompaniment_kind === 'apple_music' || project.accompaniment_kind === 'apple_music_album' ? (
              <div className="flex items-center gap-2">
                {(project as any).accompaniment_apple_music_artwork_url
                  ? <img src={(project as any).accompaniment_apple_music_artwork_url} alt="" className="w-10 h-10 rounded shrink-0" />
                  : <Music className="w-10 h-10 text-pink-400" />}
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-foreground truncate">{project.accompaniment_title}</div>
                  <div className="text-[10px] uppercase tracking-wider text-pink-400">
                    Apple Music{project.accompaniment_kind === 'apple_music_album' ? ' · Album' : ''}
                  </div>
                </div>
              </div>
            ) : project.accompaniment_kind === 'youtube' ? (
              <div className="flex items-center gap-2">
                <Youtube className="w-8 h-8 text-rose-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-foreground truncate">{project.accompaniment_title}</div>
                  <div className="text-[10px] uppercase tracking-wider text-rose-500">YouTube</div>
                </div>
              </div>
            ) : project.accompaniment_url ? (
              <div className="text-sm text-foreground truncate">{project.accompaniment_title ?? 'Accompaniment'}</div>
            ) : (
              <p className="text-xs text-muted-foreground italic mb-2">No backing track yet.</p>
            )}
            <Button
              size="sm"
              className="mt-2 w-full"
              onClick={() => setAccPickerOpen(true)}
            >
              <Music className="w-3.5 h-3.5 mr-1" />
              {project.accompaniment_kind && project.accompaniment_title ? 'Change backing track' : 'Choose backing track'}
            </Button>
            {project.accompaniment_kind && project.accompaniment_kind !== 'file' && (
              <p className="text-[10px] text-muted-foreground mt-2 italic leading-tight">
                Streams alongside the mix. Only your mic is captured into recordings.
              </p>
            )}
          </Section>

          <Section title="Voice parts">
            {/* Roster list removed — the Multitrack rows below show
                the exact same data (label + color + status pill), and
                the duplicate read as two separate Bass tracks on phone
                portrait where everything stacks. Add-part CTA stays so
                the user has a one-tap way to grow the roster. */}
            {tracks.filter((t) => t.kind !== 'accompaniment').length === 0 && (
              <p className="text-xs text-muted-foreground italic mb-2">
                No voice parts yet — add Soprano, Alto, Tenor, Bass, or a custom part.
              </p>
            )}
            <NewTrackButton onAdd={(opt) => addTrack.mutate({ kind: opt.kind, label: opt.label, color: opt.color })} />
          </Section>
        </aside>

        {/* Center — multitrack timeline */}
        <section className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-3 sm:px-4 py-3 border-b border-border flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <AudioLines className="w-3.5 h-3.5 text-primary" />
              <div className="text-[10px] uppercase tracking-[0.18em] text-foreground/80 font-semibold">
                Multitrack
              </div>
            </div>
            <div className="text-xs text-muted-foreground tabular-nums font-medium">
              <span className="text-foreground">{fmtTime(currentTime)}</span>
              <span className="text-muted-foreground/60 mx-1.5">/</span>
              {fmtTime(maxDuration)}
            </div>
          </div>
          <ul className="divide-y divide-slate-800">
            {tracks.map((t) => {
              // Where this take sits on the master timeline. We map
              // record_offset_sec + take duration → 0..1 fractions of
              // the row so each row draws its peaks at the same
              // horizontal scale as every other row.
              const offset = (t as any).record_offset_sec ?? 0;
              const dur = durationByTrack[t.id] ?? t.duration_sec ?? 0;
              const offsetFrac = maxDuration > 0 ? offset / maxDuration : 0;
              const widthFrac = maxDuration > 0 && dur > 0 ? dur / maxDuration : 1;
              return (
              <TrackRow
                key={t.id}
                track={t}
                peaks={
                  recordingTrackId === t.id && livePeaks.length > 0
                    ? livePeaks
                    : (waveformByTrack[t.id] ?? t.waveform_peaks ?? null)
                }
                progress={progressByTrack[t.id] ?? 0}
                offsetFrac={offsetFrac}
                widthFrac={widthFrac}
                recording={recordingTrackId === t.id}
                onArmRecord={() => toggleArmTrack(t)}
                armed={armedTrackId === t.id}
                undecodable={undecodableTrackIds.has(t.id)}
                onClearTake={() => clearTakeForTrack(t)}
                // Live-update the audio engine on every value change so
                // the slider feels continuous; persist to the DB only
                // when the user releases the thumb (onCommit). Otherwise
                // every pixel of drag fired a Supabase write and the
                // resulting roundtrip backpressure made the slider feel
                // like it was clicking through discrete steps.
                onVolume={(v) => {
                  setTrackVolume(t.id, v, t.muted);
                  if (t.kind === 'accompaniment') setExternalAccompanimentVolume(v, t.muted);
                }}
                onVolumeCommit={(v) => updateTrack.mutate({ id: t.id, patch: { volume: v } })}
                onPan={(p) => setTrackPan(t.id, p)}
                onPanCommit={(p) => updateTrack.mutate({ id: t.id, patch: { pan: p } })}
                onMute={() => {
                  const next = !t.muted;
                  setTrackVolume(t.id, t.volume, next);
                  if (t.kind === 'accompaniment') setExternalAccompanimentVolume(t.volume, next);
                  updateTrack.mutate({ id: t.id, patch: { muted: next } });
                }}
                onSolo={() => {
                  // Apply solo to the audio graph immediately, before
                  // the DB mutation roundtrips. Otherwise pressing Solo
                  // on a vocal part leaves Apple Music audible for the
                  // ~100–300ms it takes React Query to refetch tracks.
                  const nextSolo = !t.solo;
                  const soloedIds = new Set(
                    tracks.filter((x) => x.id === t.id ? nextSolo : x.solo).map((x) => x.id),
                  );
                  const anySolo = soloedIds.size > 0;
                  for (const x of tracks) {
                    const effectiveMute = anySolo
                      ? (x.muted || !soloedIds.has(x.id))
                      : x.muted;
                    setTrackVolume(x.id, x.volume, effectiveMute);
                    if (x.kind === 'accompaniment') {
                      setExternalAccompanimentVolume(x.volume, effectiveMute);
                    }
                  }
                  updateTrack.mutate({ id: t.id, patch: { solo: nextSolo } });
                }}
                onSeek={(frac) => seekTo(frac * maxDuration)}
                onDelete={() => {
                  // toast.confirm — `confirm()` is blocked silently in
                  // iOS WKWebView (and some Safari versions), so it
                  // appeared to the user that the delete button did
                  // nothing. Sonner's action toast works everywhere and
                  // also surfaces an error if the mutation fails. We
                  // hold onto the toast ID so we can explicitly dismiss
                  // it from inside the action — Sonner's auto-dismiss
                  // on action click has been inconsistent on iOS
                  // Capacitor (touch event sometimes ends without
                  // triggering the auto-close timer).
                  const confirmId = toast(`Delete "${t.label}"?`, {
                    action: {
                      label: 'Delete',
                      onClick: () => {
                        toast.dismiss(confirmId);
                        unloadTrack(t.id);
                        // No success toast — the track row vanishing
                        // is the confirmation. Stacking three "Removed X"
                        // cards on rapid deletes was blocking the
                        // transport.
                        deleteTrack.mutate(t.id, {
                          onError: (err: any) => toast.error(`Couldn't remove "${t.label}": ${err?.message ?? 'unknown error'}`),
                        });
                      },
                    },
                    cancel: {
                      label: 'Cancel',
                      onClick: () => { toast.dismiss(confirmId); },
                    },
                    duration: 8000,
                  });
                }}
              />
              );
            })}
            {tracks.length === 0 && (
              <li className="p-8 text-center text-sm text-muted-foreground italic">
                No tracks yet. Add a voice part on the left to get started.
              </li>
            )}
          </ul>
        </section>

        {/* Right — studio tools. Inline only on xl+; on lg (iPad landscape)
            this content lives in the Tools Sheet to give the center timeline
            room to breathe. */}
        <aside className="hidden xl:block space-y-3">
          <StudioToolsPanel
            tracks={tracks}
            onOpenDevices={() => setDevicesOpen(true)}
          />
        </aside>
      </div>

      {/* Tools sheet (iPad landscape / lg only — xl shows the inline rail). */}
      <Sheet open={toolsOpen} onOpenChange={setToolsOpen}>
        <SheetContent
          side="right"
          className="w-[320px] sm:w-[360px] bg-card border-border text-foreground overflow-y-auto"
        >
          <SheetHeader>
            <SheetTitle className="text-primary flex items-center gap-2">
              <Wrench className="w-4 h-4" /> Studio tools
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            <StudioToolsPanel
              tracks={tracks}
              onOpenDevices={() => { setDevicesOpen(true); setToolsOpen(false); }}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Transport bar (fixed bottom) ─────────────────────────────── */}
      {/* Sticky transport. On phones the MobileBottomNav lives at the
          very bottom of the viewport (fixed, z-99999) and the iPhone
          home-indicator safe-area adds another ~34px below that — so
          this bar needs to ride above both. `bottom-12` clears the
          ~40px tall mobile nav and `safe-area-inset-bottom` covers the
          home indicator. At md+ (no mobile nav rendered) the bar sits
          at bottom-0. */}
      <div
        className="sticky bottom-12 md:bottom-0 inset-x-0 bg-card border-t border-border backdrop-blur"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {/* Task 5 (headphone/bleed guard). Dismissible — the X suppresses
            this for the rest of the session (module-level flag), it never
            reappears on its own. Warn-only: doesn't block Record. */}
        {bleedWarning && (
          <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-3 bg-status-warning-bg text-status-warning-fg text-sm">
            <span>Wear headphones — without them the backing track will bleed into your recording.</span>
            <button
              type="button"
              onClick={dismissBleedWarning}
              aria-label="Dismiss"
              className="shrink-0 p-1 hover:opacity-70"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="text-xs text-muted-foreground uppercase tracking-wider tabular-nums">
            {fmtTime(currentTime)} / {fmtTime(maxDuration)}
          </div>

          {/* Recording features — count-in selector + punch markers.
              Compact icon buttons so they fit alongside the main
              transport on iPad portrait. */}
          <div className="hidden sm:flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCountInBeats((c) => (c === 0 ? 4 : c === 4 ? 8 : c === 8 ? 2 : 0))}
              className={`h-9 px-2 rounded-md text-[11px] font-semibold inline-flex items-center gap-1 ${
                countInBeats > 0 ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-muted'
              }`}
              title={countInBeats > 0
                ? `Count-in: ${countInBeats} clicks at ${project?.tempo_bpm ?? 100} BPM`
                : 'Count-in off — tap to enable'}
            >
              <Headphones className="w-3.5 h-3.5" />
              {countInBeats > 0 ? `${countInBeats}` : 'CI'}
            </button>
            <button
              type="button"
              onClick={() => setPunchIn((v) => v === null ? currentTime : null)}
              className={`h-9 px-2 rounded-md text-[11px] font-semibold inline-flex items-center gap-1 ${
                punchIn !== null ? 'bg-rose-500/15 text-rose-500' : 'text-muted-foreground hover:bg-muted'
              }`}
              title={punchIn !== null ? `Punch in: ${fmtTime(punchIn)} — tap to clear` : 'Set punch-in at playhead'}
            >
              <span className="font-mono text-[10px]">[I]</span>
              {punchIn !== null && <span className="tabular-nums">{fmtTime(punchIn)}</span>}
            </button>
            <button
              type="button"
              onClick={() => setPunchOut((v) => v === null ? Math.max(currentTime, (punchIn ?? 0) + 0.1) : null)}
              className={`h-9 px-2 rounded-md text-[11px] font-semibold inline-flex items-center gap-1 ${
                punchOut !== null ? 'bg-rose-500/15 text-rose-500' : 'text-muted-foreground hover:bg-muted'
              }`}
              title={punchOut !== null ? `Punch out: ${fmtTime(punchOut)} — tap to clear` : 'Set punch-out at playhead'}
            >
              <span className="font-mono text-[10px]">[O]</span>
              {punchOut !== null && <span className="tabular-nums">{fmtTime(punchOut)}</span>}
            </button>
          </div>

          <div className="flex-1 flex items-center justify-center gap-2">
            <Button size="icon" variant="ghost" onClick={handleStop} className="h-12 w-12 text-muted-foreground hover:bg-primary/10 hover:text-primary">
              <Square className="w-5 h-5" />
            </Button>
            <button
              type="button"
              onClick={handlePlay}
              className="h-14 w-14 rounded-full inline-flex items-center justify-center shadow-lg shadow-amber-500/30 transition-colors"
              style={{ backgroundColor: '#f59e0b', color: '#0f172a' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fbbf24')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#f59e0b')}
              aria-label={playing ? 'Pause' : 'Play'}
            >
              {playing ? <Pause className="w-6 h-6" style={{ color: '#0f172a' }} /> : <Play className="w-6 h-6" style={{ color: '#0f172a' }} />}
            </button>
            {/* Transport Record button — starts/stops the actual
                recording for whichever track is armed (via the per-row
                mic icon). Disabled when nothing is armed so the user
                gets a clear hint about the two-step flow. While
                recording, the dot pulses red. */}
            <Button
              size="icon"
              variant="ghost"
              onClick={toggleTransportRecord}
              disabled={!recordingTrackId && !armedTrackId}
              className={`h-12 w-12 rounded-full ${
                recordingTrackId
                  ? 'bg-rose-500 text-white animate-pulse hover:bg-rose-600'
                  : armedTrackId
                    ? 'text-rose-500 border border-rose-500/40 hover:bg-rose-500/10'
                    : 'text-muted-foreground opacity-60'
              }`}
              title={
                recordingTrackId
                  ? 'Stop recording'
                  : armedTrackId
                    ? 'Start recording (accompaniment will play)'
                    : 'Arm a track with its mic icon first'
              }
              aria-label={recordingTrackId ? 'Stop recording' : 'Start recording'}
            >
              <Circle className="w-5 h-5 fill-current" />
            </Button>
          </div>

          {/* Audio tools — opens a popover with Trim / Normalize /
              Clean noise per track. Hidden on the smallest viewports
              so the transport row stays touchable. */}
          <div className="hidden sm:block relative">
            <button
              type="button"
              onClick={() => setAudioToolsOpen((v) => !v)}
              className={`h-9 px-3 rounded-md text-[11px] font-semibold inline-flex items-center gap-1 ${
                audioToolsOpen ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-muted'
              }`}
              title="Audio tools"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Tools
            </button>
            {audioToolsOpen && (
              <div className="absolute right-0 bottom-12 z-50 w-80 bg-popover border border-border rounded-lg shadow-2xl max-h-[70vh] overflow-y-auto">
                {/* Header — eyebrow + dismiss-hint */}
                <div className="sticky top-0 bg-popover border-b border-border px-3 py-2.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    <div className="text-[10px] uppercase tracking-[0.18em] font-semibold text-foreground/80">
                      Audio tools
                    </div>
                  </div>
                  <div className="text-[10px] text-muted-foreground italic">
                    Pick a take to process
                  </div>
                </div>

                {tracks.filter((t) => t.audio_url).length === 0 ? (
                  <p className="text-xs text-muted-foreground italic px-3 py-6 text-center">
                    No recorded takes yet. Record a part first, then come back here to trim it, level it out, or clean it up.
                  </p>
                ) : (
                  <div className="p-2 space-y-2">
                    {tracks.filter((t) => t.audio_url).map((t) => {
                      const busy = processingTrackIds.has(t.id);
                      const tools = [
                        { key: 'trim' as const,      label: 'Trim',      Icon: Scissors,  desc: 'Cut silence at the start + end' },
                        { key: 'normalize' as const, label: 'Normalize', Icon: BarChart3, desc: 'Raise peak to ≈-1 dBFS' },
                        { key: 'denoise' as const,   label: 'Clean',     Icon: Wand2,     desc: 'Remove hum + hiss' },
                      ];
                      return (
                        <div
                          key={t.id}
                          className="rounded-md border border-border bg-muted/40 p-2.5 space-y-2"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                            <span className="text-sm font-semibold truncate flex-1 tracking-tight">{t.label}</span>
                            {busy && (
                              <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-primary">
                                <Loader2 className="w-3 h-3 animate-spin" /> Working…
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-3 gap-1.5">
                            {tools.map(({ key, label, Icon, desc }) => (
                              <button
                                key={key}
                                type="button"
                                disabled={busy}
                                onClick={() => { void runAudioTool(t, key); setAudioToolsOpen(false); }}
                                title={desc}
                                className="group flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-md border border-border bg-card hover:bg-primary hover:text-primary-foreground hover:border-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-card disabled:hover:text-foreground disabled:hover:border-border transition-colors"
                              >
                                <Icon className="w-4 h-4" />
                                <span className="text-[10px] font-semibold uppercase tracking-wider">
                                  {label}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="sticky bottom-0 bg-popover border-t border-border px-3 py-2 space-y-1">
                  <div className="grid grid-cols-3 gap-2 text-[10px] text-muted-foreground leading-tight">
                    <div className="flex items-start gap-1">
                      <Scissors className="w-3 h-3 mt-0.5 shrink-0" />
                      <span>Trim silence</span>
                    </div>
                    <div className="flex items-start gap-1">
                      <BarChart3 className="w-3 h-3 mt-0.5 shrink-0" />
                      <span>Even volume</span>
                    </div>
                    <div className="flex items-start gap-1">
                      <Wand2 className="w-3 h-3 mt-0.5 shrink-0" />
                      <span>Cut hum + hiss</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="text-xs text-muted-foreground tabular-nums hidden sm:block">
            {tracks.length} {tracks.length === 1 ? 'track' : 'tracks'}
          </div>
        </div>
      </div>

      {/* Floating PDF panel — detaches the score from the studio so the
          conductor can read it while recording without losing the
          transport / track controls below. */}
      {scoreOpen && score?.pdf_url && (
        <FloatingScorePanel
          pdfUrl={score.pdf_url}
          musicId={score.id}
          musicTitle={score.title}
          onClose={() => setScoreOpen(false)}
        />
      )}

      {/* Pickers + hidden YouTube iframe for parallel playback. */}
      <AccompanimentPicker
        open={accPickerOpen}
        onClose={() => setAccPickerOpen(false)}
        onPickFile={uploadAccompaniment}
        onPickAppleMusic={pickAppleMusic}
        onPickAppleMusicAlbum={pickAppleMusicAlbum}
        onPickYouTube={pickYouTube}
      />
      <DeviceSettings open={devicesOpen} onClose={() => setDevicesOpen(false)} />
      {project.accompaniment_kind === 'youtube' && (project as any).accompaniment_youtube_url && (() => {
        const id = extractYouTubeVideoId((project as any).accompaniment_youtube_url);
        if (!id) return null;
        return (
          <iframe
            ref={ytIframeRef}
            src={`https://www.youtube.com/embed/${id}?enablejsapi=1&autoplay=0&controls=0&modestbranding=1&rel=0&origin=${window.location.origin}`}
            allow="autoplay; encrypted-media"
            style={{ position: 'fixed', left: '-10000px', top: 0, width: 200, height: 113, pointerEvents: 'none' }}
            aria-hidden="true"
            title="YouTube backing track"
          />
        );
      })()}
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl p-3">
      <div className="flex items-center gap-1.5 mb-2.5">
        {icon ?? <span className="w-1 h-3 rounded-sm bg-primary" />}
        <div className="text-[10px] uppercase tracking-[0.18em] text-foreground/80 font-semibold">
          {title}
        </div>
      </div>
      {children}
    </div>
  );
}

function StudioToolsPanel({
  tracks,
  onOpenDevices,
}: {
  tracks: PartTrack[];
  onOpenDevices: () => void;
}) {
  return (
    <>
      <Section title="Devices">
        <button
          type="button"
          onClick={onOpenDevices}
          className="w-full text-xs px-2 py-2 rounded bg-muted text-foreground hover:bg-primary/15 hover:text-primary flex items-center gap-2"
        >
          <Settings2 className="w-3.5 h-3.5" />
          <span className="flex-1 text-left">Choose input + output</span>
        </button>
      </Section>
      {/* Recording + audio-tool controls moved to the transport bar. */}
      <Section title="Practice tracks">
        <p className="text-[11px] text-muted-foreground mb-2">Generate a part-dominant mix.</p>
        {tracks.filter((t) => ['soprano','alto','tenor','bass','solo'].includes(t.kind)).map((t) => (
          <Button
            key={t.id}
            size="sm"
            variant="outline"
            className="w-full mb-1.5 bg-muted/40 border-border text-foreground hover:bg-muted justify-start"
            onClick={() => generatePracticeMix(tracks, t.id)}
          >
            <span className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: t.color }} />
            {t.label} dominant
          </Button>
        ))}
      </Section>
    </>
  );
}

function ToolButton({ icon, label, disabled, help }: { icon: React.ReactNode; label: string; disabled?: boolean; help?: string }) {
  return (
    <button
      type="button"
      disabled={disabled}
      title={help}
      className={`w-full text-left text-xs px-2 py-2 rounded flex items-center gap-2 transition-colors ${
        disabled
          ? 'text-muted-foreground bg-muted cursor-not-allowed'
          : 'text-foreground bg-muted hover:bg-primary/15 hover:text-primary'
      }`}
    >
      {icon}
      <span className="flex-1">{label}</span>
      {disabled && <span className="text-[9px] uppercase tracking-wider">Soon</span>}
    </button>
  );
}

function NewTrackButton({ onAdd }: { onAdd: (opt: typeof TRACK_KIND_OPTIONS[number]) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2 relative">
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => setOpen((v) => !v)}
      >
        <Plus className="w-3.5 h-3.5 mr-1" /> Add part
      </Button>
      {open && (
        // Opaque background + high z-index so the dropdown floats above
        // the Multitrack section (the previous bg-muted/40 was 40%
        // transparent — the underlying track rows bled through).
        <div className="absolute z-50 mt-1 inset-x-0 bg-popover border border-border rounded-md shadow-xl p-1">
          {TRACK_KIND_OPTIONS.map((opt) => (
            <button
              key={`${opt.kind}-${opt.label}`}
              type="button"
              onClick={() => { onAdd(opt); setOpen(false); }}
              className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-accent hover:text-accent-foreground flex items-center gap-2 text-foreground"
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: opt.color }} />
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TrackRow({
  track, peaks, progress, offsetFrac, widthFrac, recording, armed,
  onArmRecord, onVolume, onVolumeCommit, onPan, onPanCommit, onMute, onSolo, onDelete,
  onSeek, undecodable, onClearTake,
}: {
  track: PartTrack;
  peaks: number[] | null;
  progress: number;
  offsetFrac: number;
  widthFrac: number;
  recording: boolean;
  armed: boolean;
  onArmRecord: () => void;
  onVolume: (v: number) => void;
  onVolumeCommit: (v: number) => void;
  onPan: (p: number) => void;
  onPanCommit: (p: number) => void;
  onMute: () => void;
  onSolo: () => void;
  onDelete: () => void;
  onSeek: (frac: number) => void;
  undecodable: boolean;
  onClearTake: () => void;
}) {
  // Local drag buffer for the volume slider. Radix's <Slider> is fully
  // controlled by `value`, so feeding it only `track.volume` (which only
  // refreshes after the React Query write commits) snaps the thumb back
  // to the stale value on every tick and the slider feels step-clicky.
  // While the user is dragging we follow the local value; on commit we
  // clear and let `track.volume` take over again.
  const [dragVolume, setDragVolume] = useState<number | null>(null);
  const volumePct = dragVolume ?? Math.round(track.volume * 100);
  return (
    <li className="p-3 flex gap-3 items-center">
      <div className="w-36 shrink-0 flex flex-col gap-1.5">
        {/* Name row — color dot, label, and a status pill that reflects
            the loudest state (RECording > ARMED > SOLO > MUTED > —). */}
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: track.color }} />
          <span className="text-sm font-semibold truncate flex-1 tracking-tight">{track.label}</span>
          {recording ? (
            <span className="inline-flex items-center gap-0.5 text-[9px] uppercase tracking-[0.14em] font-bold text-white bg-rose-500 rounded-full px-1.5 py-0.5">
              <CircleDot className="w-2.5 h-2.5 animate-pulse" /> Rec
            </span>
          ) : armed ? (
            <span className="text-[9px] uppercase tracking-[0.14em] font-bold text-rose-500 bg-rose-500/15 border border-rose-500/30 rounded-full px-1.5 py-0.5">
              Armed
            </span>
          ) : track.solo ? (
            <span className="text-[9px] uppercase tracking-[0.14em] font-bold text-amber-700 dark:text-amber-300 bg-amber-500/20 rounded-full px-1.5 py-0.5">
              Solo
            </span>
          ) : track.muted ? (
            <span className="text-[9px] uppercase tracking-[0.14em] font-bold text-rose-500 bg-rose-500/10 rounded-full px-1.5 py-0.5">
              Mute
            </span>
          ) : null}
        </div>

        {/* Control row — icon-only mixer toggles (Mute / Solo / Arm)
            grouped left, destructive Delete pinned right. 2026 idiom:
            icons over letter glyphs, semantic color on toggle, bigger
            44pt-friendly touch targets. */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onMute}
            className={`inline-flex items-center justify-center h-9 w-9 rounded-md transition-colors touch-manipulation ${
              track.muted
                ? 'bg-rose-500/15 text-rose-500'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
            title={track.muted ? 'Unmute' : 'Mute'}
            aria-label={track.muted ? 'Unmute' : 'Mute'}
            aria-pressed={track.muted}
          >
            {track.muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={onSolo}
            className={`inline-flex items-center justify-center h-9 w-9 rounded-md transition-colors touch-manipulation ${
              track.solo
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-amber-600'
            }`}
            title={track.solo ? 'Unsolo (other tracks resume)' : 'Solo this track'}
            aria-label={track.solo ? 'Unsolo' : 'Solo'}
            aria-pressed={track.solo}
          >
            <Star className={`w-4 h-4 ${track.solo ? 'fill-current' : ''}`} />
          </button>
          {/* Per-track Mic = ARM toggle. It does NOT start the mic
              stream — it just marks this track as the one that will
              record when the transport Record button is pressed.
              States: idle / armed / recording. */}
          <button
            type="button"
            onClick={onArmRecord}
            className={`inline-flex items-center justify-center h-9 w-9 rounded-md transition-colors touch-manipulation ${
              recording
                ? 'bg-rose-500 text-white animate-pulse'
                : armed
                  ? 'bg-rose-500/15 text-rose-500 ring-1 ring-rose-500/40'
                  : 'text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500'
            }`}
            title={recording ? 'Recording…' : armed ? 'Armed — tap to disarm' : 'Arm this track for recording'}
            aria-label={recording ? 'Recording' : armed ? 'Disarm' : 'Arm for recording'}
            aria-pressed={armed || recording}
          >
            <MicVocal className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="ml-auto inline-flex items-center justify-center h-9 w-9 rounded-md text-muted-foreground/70 hover:text-rose-500 hover:bg-rose-500/10 transition-colors touch-manipulation"
            title="Delete track"
            aria-label="Delete track"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Volume row — semantic icon + slider + numeric readout. */}
        <div className="flex items-center gap-1.5">
          {track.muted
            ? <VolumeX className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            : volumePct === 0
              ? <VolumeX className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              : volumePct < 50
                ? <Volume2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                : <Volume2 className="w-3.5 h-3.5 text-foreground shrink-0" />}
          <Slider
            value={[volumePct]}
            min={0} max={100} step={1}
            onValueChange={(v) => { setDragVolume(v[0]); onVolume(v[0] / 100); }}
            onValueCommit={(v) => { setDragVolume(null); onVolumeCommit(v[0] / 100); }}
            className="flex-1"
          />
          <span className="text-[10px] tabular-nums font-medium text-muted-foreground w-7 text-right">
            {volumePct}
          </span>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        {undecodable ? (
          <div className="flex items-center justify-between gap-3 bg-rose-500/5 border border-rose-500/30 rounded-md px-3 py-2 text-xs">
            <div className="text-rose-600 dark:text-rose-400 truncate">
              Can&apos;t play this take on this device (codec mismatch).
            </div>
            <button
              type="button"
              onClick={onClearTake}
              className="shrink-0 text-xs font-semibold px-2 py-1 rounded bg-rose-500 text-white hover:bg-rose-600 touch-manipulation"
            >
              Clear take
            </button>
          </div>
        ) : (
          <Waveform
            peaks={peaks}
            color={track.color}
            height={96}
            progress={progress}
            offsetFrac={offsetFrac}
            widthFrac={widthFrac}
            onSeek={onSeek}
          />
        )}
      </div>
    </li>
  );
}

// Practice mix generator — sets the selected part to full volume +
// every other voice part to a soft 30%. The accompaniment stays at the
// user's chosen volume so it can be a karaoke-style learn-along.
function generatePracticeMix(tracks: PartTrack[], dominantId: string) {
  tracks.forEach((t) => {
    if (t.kind === 'accompaniment') return;
    const isDominant = t.id === dominantId;
    setTrackVolume(t.id, isDominant ? 1 : 0.3, false);
  });
  toast.success('Practice mix set — press play to rehearse.');
}
