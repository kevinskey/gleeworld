// Studio session editor. Timeline of track lanes, transport bar,
// strip per track, drop-to-import audio, record-to-armed-track,
// piano roll for MIDI clips, mixdown export.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { StudioEngineStatus } from '@/components/studio/StudioEngineStatus';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { renderRegionMix, renderRegionStems, renderRegionBuffer, zipBlobs, safeName } from '@/lib/studio/engine/regionExport';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Metronome } from '@/components/audioTools/Metronome';
import { PitchPipe } from '@/components/audioTools/PitchPipe';
import { Tuner } from '@/components/audioTools/Tuner';
import { InstrumentPlayer } from '@/components/audioTools/InstrumentPlayer';
import {
  Loader2, ArrowLeft, AlertCircle, Play, Pause, Square, Mic, Plus, Download, Scissors,
  Volume2, MoveHorizontal, Trash2, Music2, Drum, Upload, Circle, Timer, Palette,
  FileJson, Activity, Save, SkipBack, SkipForward, Rewind, FastForward, Settings as SettingsIcon,
  ChevronLeft, ChevronRight, Repeat, SlidersHorizontal, X, MoreVertical, Undo2, Flag,
  Magnet, Wrench, BookOpen, BookX,
} from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { GM_GROUPED, toGmPresetId } from '@/lib/studio/gmInstruments';
import { GW_INSTRUMENTS, toGwPresetId } from '@/lib/studio/gwInstruments';
import { LiveVoices } from '@/lib/studio/engine/liveVoices';
import { trackEqSig } from '@/lib/studio/engine/trackEq';
import { useStudioMidiInput } from '@/hooks/useStudioMidiInput';
import { applyStatusBarSurface } from '@/lib/statusBarStyle';
import { getMidiInputSource } from '@/lib/midi/midiInputSource';
import {
  appendTakeNote, recordStartMode, grownSessionLength, HeldNotes, attachTakeCc, getMidiTrimMs, MIDI_TRIM_STORAGE_KEY,
  type HeldPress, type CapturedCc,
} from '@/lib/studio/midiRecord';
import { MidiTimebase } from '@/lib/studio/midiTimebase';
import { useStudioSession, useStudioEngine, useUploadAudioAsset, type TransportTickStore } from '@/hooks/useStudio';
import { useTransportPosition, useTransportTick } from './useTransportTick';
import { retainUnsavedWork } from '@/lib/unsavedWork';
import { newAudioTrack, newMidiTrack, newId, newFxNode } from '@/lib/studio/defaults';
import { listFxPresets, saveFxPreset, type FxPreset } from '@/lib/studio/fxPresets';
import { isAudioTrack, isMidiTrack, withMasteringDefaults, type Session, type Track, type AudioTrack, type AudioClip, type MidiClip, type FxNode, type FxType, type AudioAsset, type SessionMarker } from '@/lib/studio/session';
import {
  formatTime, formatBarBeat, formatSamples, nextCounterMode, type CounterMode,
  preRollStartSeconds, postRollEndSeconds, punchTransition,
  nextMarker, prevMarker, sortMarkers, defaultMarkerName, shuttleStepSeconds,
} from '@/lib/studio/transport';
import { MidiClockSender } from '@/lib/studio/midiClock';
import { PianoRollPanel } from '@/pages/studio/pianoroll/PianoRollPanel';
import { MidiClipPreview } from '@/pages/studio/pianoroll/MidiClipPreview';
import type { EngineState } from '@/lib/studio/engine/engine';
import { openMicRecorder, type MicRecorder } from '@/lib/studio/engine/recorder';
import { getConfiguredInputLatencyMs, getConfiguredDeviceLatencyMs, getOutputLatencyMs, msToSamples, DEFAULT_DEVICE_LATENCY_MS, DEFAULT_INPUT_LATENCY_MS } from '@/lib/audio/sharedRecorder';
import { computeTakeAlignment } from '@/lib/audio/takeAlignment';
import { Capacitor } from '@capacitor/core';
import { setAssetUrl } from '@/lib/studio/engine/assetUrlCache';
import { audioBufferToWavBlob } from '@/lib/studio/engine/mixdown';
import { getAssetUrlSync } from '@/lib/studio/engine/assetUrlCache';
import { splitAudioClips, sliceClipChannels, duplicateClip } from '@/lib/studio/clipOps';
import { encodeMp3 } from '@/lib/audio/encodeMp3';
import { exportSession, hasResumableExport, clearExportProgress, type ExportPreset } from '@/lib/studio/engine/exportRender';
import { getAssetUrl, saveSession, uploadAudioAsset } from '@/lib/studio/storage';
import { toast } from 'sonner';
import { MixerView } from './MixerView';
import { useStreamingAccompaniment } from '@/lib/studio/streamingBacking/useStreamingAccompaniment';
import { captureFromPlayback } from '@/lib/studio/streamingBacking/captureFromPlayback';
import { AccompanimentLane } from '@/components/studio/AccompanimentLane';
import { AttachScoreDialog } from '@/components/studio/AttachScoreDialog';
import { FloatingScorePanel } from '@/components/studio/FloatingScorePanel';
import { useQuery } from '@tanstack/react-query';

const PX_PER_SECOND_DEFAULT = 40;
const PX_PER_SECOND_MIN = 8;
const PX_PER_SECOND_MAX = 240;
/* On coarse-pointer devices (iPad/phone) the global tap-target safety
 * net in index.css bumps every custom <button> to min-height 44px, so
 * the strip's M/S/R row alone needs ~44px + name row + padding ≈ 82px.
 * A 72px row clips the transport chips (seen on iPad 2026-07-06). Give
 * touch devices a taller floor instead of shrinking the tap targets. */
const IS_COARSE_POINTER =
  typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
// Coarse-pointer (touch) floor raised 88 → 100 so the two-row strip
// header (name + M/S/R + volume) always has breathing room above the
// divider — at 88 the buttons sat flush and read as clipped by the next
// track (2026-07-07).
const TRACK_HEIGHT_DEFAULT = IS_COARSE_POINTER ? 100 : 72;
const TRACK_HEIGHT_MIN = IS_COARSE_POINTER ? 100 : 48;
const TRACK_HEIGHT_MAX = 240;

/** Zoom is one value (px per second of timeline) shared by the ruler,
 * all track lanes, clip blocks, and playhead. Default 40px/s matches
 * the pre-zoom layout. */
const ZoomContext = createContext<number>(PX_PER_SECOND_DEFAULT);
function usePxPerSecond(): number { return useContext(ZoomContext); }
/** Per-row height shared by every track row. Dragging the bottom edge
 * of any row resizes all rows uniformly, like Logic's "Track Height"
 * keyboard shortcut. */
const TrackHeightContext = createContext<number>(TRACK_HEIGHT_DEFAULT);
function useTrackHeight(): number { return useContext(TrackHeightContext); }

/** Sync horizontal scroll across the bar ruler + every track lane. Each
 * scrollable container registers itself via `register(el)`; whichever
 * one fires a scroll event broadcasts its scrollLeft to the others. */
interface ScrollSync {
  register: (el: HTMLDivElement | null) => void;
  /** Current horizontal viewport of the (synced) scrollers, or null if none
   * are registered yet. All registered scrollers share the same scrollLeft. */
  getViewport: () => { scrollLeft: number; clientWidth: number; scrollWidth: number } | null;
  /** Programmatically scroll every synced scroller to `px` (clamped ≥ 0). */
  scrollToX: (px: number) => void;
}
const ScrollSyncContext = createContext<ScrollSync | null>(null);
function useScrollSync(): ScrollSync | null { return useContext(ScrollSyncContext); }

function useScrollSyncProvider(): ScrollSync {
  const elementsRef = useRef<Set<HTMLDivElement>>(new Set());
  const isSyncingRef = useRef(false);
  // Stable handler so React's effect cleanup works against the same fn.
  const onScroll = useCallback((e: Event) => {
    if (isSyncingRef.current) return;
    const src = e.currentTarget as HTMLDivElement;
    const left = src.scrollLeft;
    isSyncingRef.current = true;
    for (const el of elementsRef.current) {
      if (el !== src && el.scrollLeft !== left) el.scrollLeft = left;
    }
    // Reset on next frame so subsequent native scrolls reach the
    // listeners normally.
    requestAnimationFrame(() => { isSyncingRef.current = false; });
  }, []);
  const register = useCallback((el: HTMLDivElement | null) => {
    // React calls the ref with null when the element it was attached to
    // unmounts. Take that as our cue to sweep any registered elements
    // that are no longer in the DOM — otherwise the Set retains dead
    // HTMLDivElement references (plus their scroll listeners) for the
    // rest of the ScrollSyncProvider's lifetime.
    if (!el) {
      for (const stored of Array.from(elementsRef.current)) {
        if (!stored.isConnected) {
          stored.removeEventListener('scroll', onScroll);
          elementsRef.current.delete(stored);
        }
      }
      return;
    }
    if (elementsRef.current.has(el)) return;
    elementsRef.current.add(el);
    el.addEventListener('scroll', onScroll, { passive: true });
    // Catch-up: sync the new element to any existing scrollLeft so it
    // doesn't snap back to 0 the first time the user scrolls another lane.
    const any = elementsRef.current.values().next().value;
    if (any && any !== el) el.scrollLeft = any.scrollLeft;
  }, [onScroll]);
  const getViewport = useCallback(() => {
    const el = elementsRef.current.values().next().value as HTMLDivElement | undefined;
    if (!el) return null;
    return { scrollLeft: el.scrollLeft, clientWidth: el.clientWidth, scrollWidth: el.scrollWidth };
  }, []);
  const scrollToX = useCallback((px: number) => {
    const clamped = Math.max(0, px);
    // Set all scrollers directly (guarded so onScroll doesn't re-broadcast).
    isSyncingRef.current = true;
    for (const el of elementsRef.current) el.scrollLeft = clamped;
    requestAnimationFrame(() => { isSyncingRef.current = false; });
  }, []);
  return { register, getViewport, scrollToX };
}

/** Snap modes for clip start / duration during drag. "free" is no
 * snapping at all; everything else is a musical division derived from
 * the project's tempo + time signature. */
const SNAP_MODES = ['free', 'bar', '1/2', '1/4', '1/8', '1/16', '1/32'] as const;
type SnapMode = typeof SNAP_MODES[number];

/** Convert a SnapMode into a quantum (seconds) given the project tempo
 * and time signature. Returned 0 means "free" — no snapping. */
function snapModeToSeconds(mode: SnapMode, tempoBpm: number, numerator: number, denominator: number): number {
  if (mode === 'free') return 0;
  const secondsPerQuarter = 60 / tempoBpm;
  if (mode === 'bar') return secondsPerQuarter * numerator * (4 / denominator);
  const div = { '1/2': 2, '1/4': 4, '1/8': 8, '1/16': 16, '1/32': 32 }[mode];
  return secondsPerQuarter * (4 / div);
}

/** Grid-level controls the finest subdivision rendered on the ruler +
 * timeline lanes. "auto" picks the densest subdivision that still has
 * at least 8 px between lines at the current zoom. */
const GRID_LEVELS = ['auto', 'off', '1/2', 'beat', '1/8', '1/16', '1/32'] as const;
type GridLevel = typeof GRID_LEVELS[number];
const GridLevelContext = createContext<GridLevel>('auto');
function useGridLevel(): GridLevel { return useContext(GridLevelContext); }
/** Resolve a GridLevel into the subdivision used by the grid renderers.
 * "off" → 0 means render bar boundaries only. Other values mean
 * `sub` finest-grain notes per whole-note (2 = half, 4 = quarter, etc.). */
function resolveGridSubdivision(level: GridLevel, secondsPerBeat: number, pxPerSecond: number): number {
  if (level === 'off') return 0;
  if (level === '1/2') return 2;
  if (level === 'beat') return 4;
  if (level === '1/8') return 8;
  if (level === '1/16') return 16;
  if (level === '1/32') return 32;
  // auto — pick densest subdivision that stays readable at this zoom.
  const px16 = pxPerSecond * (secondsPerBeat / 4);
  const px8 = pxPerSecond * (secondsPerBeat / 2);
  return px16 >= 8 ? 16 : px8 >= 8 ? 8 : 4;
}
const STRIP_WIDTH = 240;
const STRIP_WIDTH_MIN = 180;
const STRIP_WIDTH_MAX = 360;
const INSPECTOR_WIDTH_MIN = 180;
const INSPECTOR_WIDTH_MAX = 360;

/** Downsample an AudioBuffer's first channel to a small peak array
 * suitable for rendering inside a clip block (a few hundred bars). */
function computePeaks(buffer: AudioBuffer, target = 300): number[] {
  const channel = buffer.getChannelData(0);
  const total = channel.length;
  const windowSize = Math.max(1, Math.floor(total / target));
  const peaks: number[] = [];
  for (let i = 0; i < target; i++) {
    const start = i * windowSize;
    const end = Math.min(total, start + windowSize);
    let peak = 0;
    for (let j = start; j < end; j++) {
      const v = Math.abs(channel[j]);
      if (v > peak) peak = v;
    }
    peaks.push(peak);
  }
  return peaks;
}

/** Take the raw MediaRecorder blob from a take and produce the asset
 * we'll actually upload. The "right way" to do latency compensation
 * turned out to be trimming the audio at the sample level — that
 * sidesteps every problem with shifting clip.start_seconds or playing
 * back with a non-zero clip.offset_seconds.
 *
 * Reads `studio.inputLatencyMs` (default 700) + the AudioContext's
 * output latency and cuts that many ms off the head of the recording.
 * Returns the trimmed AudioBuffer plus a freshly encoded WAV blob.
 * If the recording is shorter than the trim, the original is kept.
 *
 * The latency configuration + ms→samples math live in
 * src/lib/audio/sharedRecorder.ts; the decode/copy/re-encode steps
 * below are unchanged from before that extraction. */
/** Safari / any iOS browser shell reports vendor "Apple Computer, Inc.".
 *  On those engines MediaRecorder emits a fragmented mp4 that
 *  decodeAudioData can't read ("decoding failed" — recorded takes never
 *  became clips, 2026-07-07), so Studio captures WAV PCM directly there.
 *  Chrome/Firefox keep their webm MediaRecorder (decodes fine). */
function isAppleWebEngine(): boolean {
  return typeof navigator !== 'undefined' && /apple/i.test(navigator.vendor || '');
}

async function finalizeRecordingBlob(
  rawBlob: Blob,
  trimOverrideMs?: number,
): Promise<{ blob: Blob; buf: AudioBuffer; ext: 'webm' | 'mp4' | 'm4a' | 'mp3' | 'wav' | 'ogg' }> {
  const ctx = new AudioContext();
  const rawBuf = await ctx.decodeAudioData(await rawBlob.arrayBuffer());
  await ctx.close();

  // Web takes pass a per-take MEASURED trim (startup gap + device
  // residual, see takeAlignment.ts). Native takes keep the legacy
  // configured guess — their count-in/recorder/transport run on one
  // native clock so the startup component doesn't apply.
  const compensationMs = trimOverrideMs !== undefined
    ? Math.max(0, trimOverrideMs)
    : Math.max(0, getConfiguredInputLatencyMs() + getOutputLatencyMs());

  if (compensationMs === 0) {
    return { blob: rawBlob, buf: rawBuf, ext: extFromMime(rawBlob.type) };
  }

  const skipSamples = Math.min(rawBuf.length, msToSamples(compensationMs, rawBuf.sampleRate));
  const newLen = rawBuf.length - skipSamples;
  if (newLen <= 0) {
    // Recording shorter than the latency — nothing to trim. Use raw.
    return { blob: rawBlob, buf: rawBuf, ext: extFromMime(rawBlob.type) };
  }

  const offlineCtx = new AudioContext();
  const trimmed = offlineCtx.createBuffer(rawBuf.numberOfChannels, newLen, rawBuf.sampleRate);
  for (let c = 0; c < rawBuf.numberOfChannels; c++) {
    trimmed.getChannelData(c).set(rawBuf.getChannelData(c).subarray(skipSamples));
  }
  await offlineCtx.close();
  return { blob: audioBufferToWavBlob(trimmed), buf: trimmed, ext: 'wav' };
}

function extFromMime(mime: string): 'webm' | 'mp4' | 'm4a' | 'mp3' | 'wav' | 'ogg' {
  if (!mime) return 'webm';
  const t = mime.toLowerCase();
  if (t.includes('webm')) return 'webm';
  if (t.includes('mp4')) return 'mp4';
  if (t.includes('m4a') || t.includes('aac')) return 'm4a';
  if (t.includes('mpeg') || t.includes('mp3')) return 'mp3';
  if (t.includes('wav')) return 'wav';
  if (t.includes('ogg')) return 'ogg';
  return 'webm';
}

/** Live recording state. While set, every armed track shows a growing
 * clip-shaped block at `startSeconds` with a real-time waveform. */
interface RecordingSession {
  /** null when the iOS native path owns the recorder — the AVAudioEngine
   * input tap writes the WAV directly and we just collect it on stop. */
  recorder: MicRecorder | null;
  /** true → finalize via NativeStudio.recordStop() instead of recorder.stop(). */
  native: boolean;
  /** true → this take was dropped in by the auto punch flow; finalize
   * must not yank the playhead back while the post-roll is playing. */
  punch?: boolean;
  /** true → no mic at all: the transport rolls purely so USB MIDI note
   * capture can write into the target MIDI track; finalize skips the
   * whole audio-take pipeline. */
  midiOnly?: boolean;
  startSeconds: number;
  startWallMs: number;
  /** Wall stamps for measured take alignment (web path only). Native
   * takes never enter computeTakeAlignment (legacy configured trim);
   * their stamps are recorded but unused — note pressWallMs is taken
   * BEFORE the native count-in, so don't assume the three are equal. */
  pressWallMs: number;
  captureStartWallMs: number;
  transportStartWallMs: number | null;
  armedTrackIds: string[];
  /** Sampled peak values (one per render frame) for the live waveform. */
  peaks: number[];
}

export default function StudioEditor() {
  const { id } = useParams<{ id: string }>();
  const sessionState = useStudioSession(id ?? null);
  const engineState = useStudioEngine(sessionState.session);

  // A DAW session is unsaved work the whole time it's open: the session doc
  // autosaves on an 800ms debounce and an in-flight recording lives only in
  // memory, so ANY page reload can lose data. While mounted with a session,
  // arm the leave-confirmation and block BootErrorBoundary's silent
  // stale-chunk reload (the 2026-07-12 lost-take incident). In-app route
  // changes are unaffected — beforeunload only fires on real unloads.
  const hasSession = !!sessionState.session;
  useEffect(() => {
    if (!hasSession) return;
    return retainUnsavedWork('studio-session');
  }, [hasSession]);

  // The Studio is the app's dark room — flip the overlaid iOS status bar
  // to white text while it's open, back to dark text on exit.
  useEffect(() => {
    applyStatusBarSurface('dark-room');
    return () => applyStatusBarSurface('default');
  }, []);

  if (sessionState.loading) return (
    <div className="flex items-center justify-center py-16 text-muted-foreground">
      <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading session…
    </div>
  );
  if (sessionState.error || !sessionState.session) {
    const msg = sessionState.error?.message ?? 'Session document missing or corrupt';
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-3">
        <div className="text-sm text-destructive p-3 rounded-lg border border-destructive/30 bg-destructive/5 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <div className="font-semibold">Could not load session.</div>
            <pre className="text-xs mt-1 whitespace-pre-wrap break-all opacity-80">{msg}</pre>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={sessionState.reload}
            className="text-xs font-semibold inline-flex items-center gap-1 px-3 py-1.5 rounded bg-primary text-primary-foreground hover:opacity-90"
          >
            Try again
          </button>
          <Link to="/studio" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Back to sessions
          </Link>
        </div>
      </div>
    );
  }

  return <Editor sessionState={sessionState} engineState={engineState} />;
}

function Editor({
  sessionState, engineState,
}: { sessionState: ReturnType<typeof useStudioSession>; engineState: ReturnType<typeof useStudioEngine> }) {
  const session = sessionState.session!;
  const { update, flushSave } = sessionState;
  const {
    state, start, play, pause, stop, updateTrackStrip, updateTempo,
    updateTimeSignature, setMetronome, transportTick,
  } = engineState;
  // Live transport position for event handlers. Render-time consumers
  // (playhead, counter, meters) subscribe via useTransportTick leaves
  // instead — `state` deliberately does NOT update per position tick
  // (see TransportTickStore in useStudio.ts).
  const posNow = () => transportTick.get().positionSeconds;
  // Export sheet (B1 Task 7) — MP3 320 / WAV / Stems. Owned here (not
  // inside MixerView) so the header's Export button AND the MasterStrip's
  // Export button (inside MixerView, a different component subtree) open
  // the exact same sheet/state.
  const [exportOpen, setExportOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [regionExportOpen, setRegionExportOpen] = useState(false);
  const [attachScoreOpen, setAttachScoreOpen] = useState(false);

  // Timeline vs Mixer — same route, transport/header stay mounted; only
  // the main tracks-area block below swaps content (B1 Task 6).
  const [view, setView] = useState<'tracks' | 'mix'>('tracks');

  // Snap mode — musical (bar / 1/4 / 1/8 / etc) rather than absolute
  // seconds. The runtime value `snapSeconds` is derived from tempo +
  // time-sig below so the grid follows the project's musical metric.
  const [snapMode, setSnapMode] = useState<SnapMode>('1/4');
  useEffect(() => {
    const v = localStorage.getItem('studio.snapMode') as SnapMode | null;
    if (v && SNAP_MODES.includes(v)) setSnapMode(v);
  }, []);
  useEffect(() => { localStorage.setItem('studio.snapMode', snapMode); }, [snapMode]);
  // Remember the last grid subdivision so the one-tap Snap toggle can
  // return to it after a stint of free ('free') dragging.
  const lastGridSnapRef = useRef<SnapMode>('1/4');
  useEffect(() => { if (snapMode !== 'free') lastGridSnapRef.current = snapMode; }, [snapMode]);
  const toggleSnap = () => setSnapMode((m) => (m === 'free' ? lastGridSnapRef.current : 'free'));

  // Count-in bars — how many empty bars to click off before recording
  // actually starts. 0 = off, 1 or 2 bars supported.
  const [countInBars, setCountInBars] = useState<0 | 1 | 2>(() => {
    const v = Number(localStorage.getItem('studio.countInBars') || 0);
    return (v === 1 || v === 2 ? v : 0) as 0 | 1 | 2;
  });
  useEffect(() => { localStorage.setItem('studio.countInBars', String(countInBars)); }, [countInBars]);
  // While the count-in is ticking, hold the bar number that's about to
  // play (1..N then "GO"). null = no count-in in progress.
  const [countInBeat, setCountInBeat] = useState<number | null>(null);

  // Time counter mode — the LCD cycles Bars|Beats → Min:Sec → Samples
  // on click, like tapping the counter in Logic.
  const [counterMode, setCounterMode] = useState<CounterMode>(() => {
    const v = localStorage.getItem('studio.counterMode');
    return v === 'time' || v === 'samples' ? v : 'bars';
  });
  useEffect(() => { localStorage.setItem('studio.counterMode', counterMode); }, [counterMode]);

  // Punch in/out — when armed, Record starts playback ahead of the
  // punch range (pre-roll) and drops in/out of record automatically at
  // the range edges. The punch range IS the loop region (drag the ruler).
  const [punchEnabled, setPunchEnabled] = useState(false);
  const [preRollBars, setPreRollBars] = useState<number>(() => {
    const v = Number(localStorage.getItem('studio.preRollBars') ?? 1);
    return [0, 1, 2, 4].includes(v) ? v : 1;
  });
  useEffect(() => { localStorage.setItem('studio.preRollBars', String(preRollBars)); }, [preRollBars]);
  const [postRollBars, setPostRollBars] = useState<number>(() => {
    const v = Number(localStorage.getItem('studio.postRollBars') ?? 0);
    return [0, 1, 2].includes(v) ? v : 0;
  });
  useEffect(() => { localStorage.setItem('studio.postRollBars', String(postRollBars)); }, [postRollBars]);

  // MIDI Clock sync out (web only, feature-detected in the settings UI).
  const [midiSyncEnabled, setMidiSyncEnabled] = useState<boolean>(() =>
    localStorage.getItem('studio.midiSyncEnabled') === '1');
  useEffect(() => { localStorage.setItem('studio.midiSyncEnabled', midiSyncEnabled ? '1' : '0'); }, [midiSyncEnabled]);
  const [midiSyncOutputId, setMidiSyncOutputId] = useState<string>(() =>
    localStorage.getItem('studio.midiSyncOutputId') || '');
  useEffect(() => { localStorage.setItem('studio.midiSyncOutputId', midiSyncOutputId); }, [midiSyncOutputId]);
  useMidiClockSync(engineState.state, engineState.transportTick, midiSyncEnabled && !engineState.native, midiSyncOutputId);

  // ── USB/Web MIDI keyboard INPUT: play the armed MIDI track's instrument live,
  // and capture notes into its clip while the transport is recording. ──────────
  const [midiInputEnabled, setMidiInputEnabled] = useState<boolean>(() =>
    localStorage.getItem('studio.midiInputEnabled') === '1');
  useEffect(() => { localStorage.setItem('studio.midiInputEnabled', midiInputEnabled ? '1' : '0'); }, [midiInputEnabled]);
  const [midiInputDeviceId, setMidiInputDeviceId] = useState<string>(() =>
    localStorage.getItem('studio.midiInputDeviceId') || '');
  useEffect(() => { localStorage.setItem('studio.midiInputDeviceId', midiInputDeviceId); }, [midiInputDeviceId]);

  // The MIDI track that receives keyboard input: the armed one (red R). No
  // fallback — pressing keys with nothing armed must produce silence, so the
  // player doesn't accidentally audition through the first MIDI track.
  const midiInputTrack = useMemo(
    () => session.tracks.filter(isMidiTrack).find((t) => t.arm),
    [session.tracks],
  );

  const liveVoicesRef = useRef<LiveVoices | null>(null);
  // Physically-held keys for the current take. Since schema 1.1.0 the
  // pedal is captured as CC64 events (midiCcRef) and notes commit with
  // their TRUE key-up duration — playback lengthens them via applySustain.
  const [midiHeld] = useState(() => new HeldNotes());
  // CC events captured during the take (absolute compensated seconds).
  const midiCcRef = useRef<CapturedCc[]>([]);
  const midiPedalRef = useRef(false);   // dedupe (WP06 broadcasts CC64 on 3 channels)
  // Capture compensation for this take, seconds (auto output latency + trim).
  const midiCompSecRef = useRef(0);
  // Hardware-timestamp → transport mapping for the current take. The
  // positionSeconds snapshot only updates ~30Hz, so stamping notes at
  // handler run time quantized them to a ±33ms grid plus main-thread lag
  // ("fast eighths don't lock"). The timebase anchors Web MIDI's
  // performance.now()-domain event timestamps to the transport once per
  // take and places every note by hardware delta instead.
  const [midiTimebase] = useState(() => new MidiTimebase());
  useEffect(() => { midiTimebase.reset(); }, [state?.recordingActive, midiTimebase]);
  // Transport position minus recording compensation — the musical moment
  // the player MEANT, given they play in time with late-by-outputLatency audio.
  const compNow = () => Math.max(0, posNow() - midiCompSecRef.current);
  // Same, but placed by the event's hardware timestamp when it has one.
  const compAt = (timeStampMs?: number) => Math.max(0,
    midiTimebase.toTransportSeconds(timeStampMs, posNow()) - midiCompSecRef.current);
  // The single clip owned by the current recording take — every note of a
  // take appends here so one take never sprays one-clip-per-note.
  const midiTakeClipRef = useRef<string | null>(null);

  // Build/tear down the live-audition voice manager with the input toggle.
  // The audition voices always run in the webview, on every platform; on
  // iOS they play alongside the native engine through the shared audio
  // session (playAndRecord + mixWithOthers). Terminate at the engine's
  // masterIn when it's available so live playing goes through the same
  // master pan / master FX / mastering / master out that playback does;
  // fall back to the destination while the engine warms up.
  const monitorOut = engineState.engine?.getMasterIn();
  useEffect(() => {
    if (!midiInputEnabled) return;
    const lv = new LiveVoices(monitorOut);
    liveVoicesRef.current = lv;
    return () => { lv.dispose(); liveVoicesRef.current = null; midiHeld.flush(); };
  }, [midiInputEnabled, monitorOut]);

  // Keep the audition instrument matched to the target track's instrument.
  useEffect(() => {
    liveVoicesRef.current?.setInstrument(midiInputTrack?.instrument ?? null);
  }, [midiInputEnabled, midiInputTrack?.instrument?.type, midiInputTrack?.instrument?.preset_id]);

  // Live monitor follows the target track's strip — volume/pan/mute on the
  // MIDI track control what you hear while playing, same as playback.
  useEffect(() => {
    if (!midiInputTrack) return;
    liveVoicesRef.current?.setStrip({
      volume_db: midiInputTrack.volume_db,
      pan: midiInputTrack.pan,
      mute: midiInputTrack.mute,
    });
  }, [midiInputEnabled, midiInputTrack?.volume_db, midiInputTrack?.pan, midiInputTrack?.mute]);

  // Live monitor honors the armed track's EQ. Rebuilds the biquad chain on
  // any band change so the player hears the same EQ that playback applies.
  useEffect(() => {
    liveVoicesRef.current?.setEq(midiInputTrack?.eq);
    // eqSig is embedded in the dep so band edits invalidate the memo without
    // us watching every band field by field.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [midiInputEnabled, midiInputTrack?.id, midiInputTrack ? trackEqSig(midiInputTrack.eq) : '']);

  // When arming goes away mid-press, drop held-key tracking so a later
  // re-arm doesn't inherit a stuck press and commit bogus durations.
  useEffect(() => {
    if (midiInputTrack) return;
    midiHeld.flush();
    midiPedalRef.current = false;
  }, [midiInputTrack, midiHeld]);

  // Pending press queue + coalesce timer for MIDI-take commits. Every
  // released note used to trigger its own update() → the whole session
  // subtree re-rendered per keystroke and the engine-reload effect saw
  // a new skeleton per keystroke. Even after deferring reloads mid-take
  // (useStudio.ts), the React-render pressure alone still glitched
  // longer takes. Batch releases into a ref and flush every 250 ms so
  // one update lands per quarter-second of playing instead of per
  // finger. Immediate-flush path is used when NOT recording (single
  // notes need to land in state right away) and from stopRecording so
  // the take fully commits before setRecordingActive(false).
  const pendingMidiCommitsRef = useRef<Array<{ presses: HeldPress[]; upAbs: number }>>([]);
  const pendingFlushTimerRef = useRef<number | null>(null);

  const flushPendingMidiCommits = () => {
    if (pendingFlushTimerRef.current !== null) {
      window.clearTimeout(pendingFlushTimerRef.current);
      pendingFlushTimerRef.current = null;
    }
    const items = pendingMidiCommitsRef.current;
    if (items.length === 0 || !midiInputTrack) return;
    pendingMidiCommitsRef.current = [];
    const trackId = midiInputTrack.id;
    const freshClipId = crypto.randomUUID();
    update((s) => ({
      ...s,
      tracks: s.tracks.map((t) => {
        if (t.id !== trackId || !isMidiTrack(t)) return t;
        let clips = t.clips;
        for (const { presses, upAbs } of items) {
          for (const press of presses) {
            const committed = appendTakeNote(
              clips, midiTakeClipRef.current,
              { pitch: press.pitch, velocity: press.velocity, downAbsSeconds: press.downAbsSeconds, upAbsSeconds: upAbs },
              freshClipId,
            );
            clips = committed.clips;
            midiTakeClipRef.current = committed.takeClipId;
          }
        }
        return { ...t, clips } as Track;
      }),
    }));
  };

  // Write finished presses into the take clip. Coalesces to ~4 updates/
  // second during recording; commits immediately outside a take or when
  // the caller passes `immediate=true` (used at stopRecording so the
  // final held-note flush lands in state synchronously).
  const commitMidiPresses = (presses: HeldPress[], upAbs: number, immediate = false) => {
    if (presses.length === 0 || !midiInputTrack) return;
    pendingMidiCommitsRef.current.push({ presses, upAbs });
    if (immediate || !state?.recordingActive) {
      flushPendingMidiCommits();
      return;
    }
    if (pendingFlushTimerRef.current === null) {
      pendingFlushTimerRef.current = window.setTimeout(() => {
        pendingFlushTimerRef.current = null;
        flushPendingMidiCommits();
      }, 250);
    }
  };

  const handleMidiNoteOn = (pitch: number, velocity: number, timeStampMs?: number) => {
    if (!midiInputTrack) return; // no armed MIDI track → keyboard is silent
    liveVoicesRef.current?.noteOn(pitch, velocity / 127);
    if (state?.recordingActive) {
      const at = compAt(timeStampMs);
      const stale = midiHeld.keyDown(pitch, velocity, at);
      if (stale) commitMidiPresses([stale], at); // missed note-off
    }
  };
  const handleMidiNoteOff = (pitch: number, timeStampMs?: number) => {
    if (!midiInputTrack) return;
    liveVoicesRef.current?.noteOff(pitch);
    const press = midiHeld.keyUp(pitch);
    if (!press) return;
    commitMidiPresses([press], compAt(timeStampMs));
  };
  const handleMidiSustain = (down: boolean, timeStampMs?: number) => {
    if (!midiInputTrack) return;
    liveVoicesRef.current?.sustain(down); // monitoring feel unchanged
    if (state?.recordingActive && down !== midiPedalRef.current) {
      midiPedalRef.current = down;
      midiCcRef.current.push({ controller: 64, value: down ? 127 : 0, timeAbsSeconds: compAt(timeStampMs) });
    }
    if (!state?.recordingActive) midiPedalRef.current = down;
  };
  const handleMidiCc = (controller: number, value: number, timeStampMs?: number) => {
    if (!midiInputTrack || !state?.recordingActive) return;
    const prev = midiCcRef.current[midiCcRef.current.length - 1];
    if (prev && prev.controller === controller && prev.value === value) return; // coalesce dupes
    midiCcRef.current.push({ controller, value, timeAbsSeconds: compAt(timeStampMs) });
  };

  const midiIn = useStudioMidiInput({
    enabled: midiInputEnabled,
    deviceId: midiInputDeviceId,
    onNoteOn: handleMidiNoteOn,
    onNoteOff: handleMidiNoteOff,
    onSustain: handleMidiSustain,
    onCc: handleMidiCc,
  });

  // Tempo slider draft. While the user drags we only push the live
  // engine tempo (cheap) and hold the value here; the session write —
  // which changes the skeleton signature and triggers a full engine
  // reload — happens once, on release. Committing per drag-tick would
  // rebuild the native audio graph dozens of times per second.
  const [tempoDraft, setTempoDraft] = useState<number | null>(null);
  // Rolling window of tap-tempo timestamps; the transport's "Tap" button
  // pushes into this and derives BPM from the average interval.
  const tapTempoTimesRef = useRef<number[]>([]);
  // Controlled so the phone tools row's BPM chip can open the settings
  // sheet directly — the bare sliders icon wasn't discoverable enough
  // ("no way to set tempo on mobile").
  const [settingsOpen, setSettingsOpen] = useState(false);
  const commitTempoDraft = () => {
    setTempoDraft((draft) => {
      if (draft !== null) {
        update((s) => ({ ...s, tempo_bpm: draft }));
        updateTempo(draft);
      }
      return null;
    });
  };

  // Visual grid level. Independent of snap — you can have a 1/16 grid
  // but snap to 1/4 (or vice versa). "auto" follows the zoom.
  const [gridLevel, setGridLevel] = useState<GridLevel>('auto');
  useEffect(() => {
    const v = localStorage.getItem('studio.gridLevel') as GridLevel | null;
    if (v && GRID_LEVELS.includes(v)) setGridLevel(v);
  }, []);
  useEffect(() => { localStorage.setItem('studio.gridLevel', gridLevel); }, [gridLevel]);

  // Inspector for the currently-selected clip. null = no inspector.
  const [selectedClip, setSelectedClip] = useState<{ trackId: string; clipId: string } | null>(null);

  // Shared by the desktop keyboard shortcut (Delete/Backspace) and the
  // phone-only clip action bar — phones have no keyboard, which left
  // clips undeletable on iPhone.
  const deleteSelectedClip = () => {
    if (!selectedClip) return;
    pushHistory(session);
    update((s) => ({
      ...s,
      tracks: s.tracks.map((t) => t.id !== selectedClip.trackId ? t : {
        ...t,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        clips: (t as any).clips.filter((c: { id: string }) => c.id !== selectedClip.clipId),
      } as Track),
    }));
    setSelectedClip(null);
    toast.success('Clip deleted');
  };

  /** Logic-style split of the selected clip at the playhead. Shared by
   * the B shortcut and the selection action bar (touch). */
  const splitSelectedClipAtPlayhead = () => {
    if (!selectedClip) return;
    // Determine the cut point. Split at the playhead when it's inside the
    // selected clip; otherwise fall back to the clip's midpoint so a single
    // tap always splits on touch (iPad has no keyboard and precise scrubbing
    // into the clip is fiddly). The user can then trim the halves.
    const t0 = session?.tracks.find((x) => x.id === selectedClip.trackId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c0 = t0 && (t0 as any).clips?.find((x: any) => x.id === selectedClip.clipId);
    if (!c0) return;
    const ph = posNow();
    const inside0 = ph > c0.start_seconds && ph < c0.start_seconds + c0.duration_seconds;
    const pos = inside0 ? ph : c0.start_seconds + c0.duration_seconds / 2;
    pushHistory(session);
    let didSplit = false;
    update((s) => {
      const tracks = s.tracks.map((t) => {
        if (t.id !== selectedClip.trackId) return t;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const clips: any[] = (t as any).clips;
        const idx = clips.findIndex((c) => c.id === selectedClip.clipId);
        if (idx < 0) return t;
        const c = clips[idx];
        if (c.kind === 'audio') {
          const pair = splitAudioClips(clips, c.id, pos, newId);
          if (!pair) return t;
          const next = [...clips];
          next.splice(idx, 1, pair[0], pair[1]);
          didSplit = true;
          return { ...t, clips: next } as Track;
        }
        const inside = pos > c.start_seconds && pos < c.start_seconds + c.duration_seconds;
        if (!inside) return t;
        const leftDur = pos - c.start_seconds;
        const rightDur = c.duration_seconds - leftDur;
        // MIDI: split notes by their absolute start time relative to the cut.
        const leftNotes = c.notes.filter((n: { start_seconds: number }) => c.start_seconds + n.start_seconds < pos);
        const rightNotes = c.notes
          .filter((n: { start_seconds: number }) => c.start_seconds + n.start_seconds >= pos)
          .map((n: { start_seconds: number }) => ({ ...n, start_seconds: n.start_seconds - leftDur }));
        const left = { ...c, id: newId(), duration_seconds: leftDur, notes: leftNotes };
        const right = { ...c, id: newId(), start_seconds: pos, duration_seconds: rightDur, notes: rightNotes };
        const next = [...clips];
        next.splice(idx, 1, left, right);
        didSplit = true;
        return { ...t, clips: next } as Track;
      });
      return { ...s, tracks };
    });
    if (didSplit) toast.success(inside0 ? 'Clip split at playhead' : 'Clip split at center');
    else toast.error("Couldn't split this clip");
  };

  // "Piano roll" on the track strip: select the first clip, creating an
  // empty 4-bar clip when the track has none (compose-from-scratch path).
  const openPianoRollForTrack = (trackId: string) => {
    const t = session.tracks.find((x) => x.id === trackId);
    if (!t || !isMidiTrack(t)) return;
    if (t.clips.length > 0) { setSelectedClip({ trackId, clipId: t.clips[0].id }); return; }
    const barSec = (60 / session.tempo_bpm) * session.time_signature.numerator * (4 / session.time_signature.denominator);
    const clip: MidiClip = { id: crypto.randomUUID(), kind: 'midi', start_seconds: 0, duration_seconds: barSec * 4, notes: [] };
    update((s) => ({
      ...s,
      tracks: s.tracks.map((x) => x.id === trackId && isMidiTrack(x) ? { ...x, clips: [clip] } as Track : x),
    }));
    setSelectedClip({ trackId, clipId: clip.id });
  };

  /** True when the playhead currently intersects the selected clip —
   * gates the Split button the same way the B handler's guard does. */
  // Reads the live tick, so evaluated at render time it reflects the
  // last render's moment — only used for a tooltip, where that's fine.
  const playheadInsideSelectedClip = () => {
    if (!selectedClip) return false;
    const t = session?.tracks.find((x) => x.id === selectedClip.trackId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c = t && (t as any).clips?.find((x: any) => x.id === selectedClip.clipId);
    if (!c) return false;
    const pos = posNow();
    return pos > c.start_seconds && pos < c.start_seconds + c.duration_seconds;
  };

  const { user: authUser } = useAuth();
  const [exportingClip, setExportingClip] = useState(false);
  // Pre-export prompt — the user names the file and picks a destination
  // (Download vs Media Library → Studio folder) BEFORE the render runs.
  // Previously the MP3 button downloaded immediately with an auto name.
  const [clipExportPrompt, setClipExportPrompt] = useState<{ name: string; dest: 'download' | 'library' } | null>(null);

  const openClipExportPrompt = () => {
    if (!selectedClip || exportingClip) return;
    const track = session.tracks.find((t) => t.id === selectedClip.trackId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const clip: any = track && (track as any).clips?.find((c: any) => c.id === selectedClip.clipId);
    if (!track || !clip) return;
    const base = clip.kind === 'midi'
      ? `${track.name} — MIDI clip`
      : `${track.name} — ${(session.assets.find((a) => a.id === clip.asset_id)?.filename ?? 'clip').replace(/\.[^.]+$/, '')}`;
    setClipExportPrompt({ name: base.replace(/[^\p{L}\p{N}\s—_-]+/gu, '').trim(), dest: 'download' });
  };

  /** MP3 flavor of RegionExportSheet's sendToLibrary (same bucket/path/
   *  row shape — columns must match the LIVE gw_media_library schema). */
  const saveClipMp3ToLibrary = async (filename: string, blob: Blob) => {
    if (!authUser?.id) throw new Error('Not signed in.');
    const path = `media/${authUser.id}/studio/${Date.now()}-${filename}`;
    const { error: upErr } = await supabase.storage
      .from('media-library').upload(path, blob, { contentType: 'audio/mpeg', upsert: true });
    if (upErr) throw new Error(`Upload failed: ${upErr.message}`);
    const fileUrl = supabase.storage.from('media-library').getPublicUrl(path).data.publicUrl;
    const { error: insErr } = await supabase.from('gw_media_library').insert({
      title: filename.replace(/\.mp3$/i, ''),
      file_url: fileUrl,
      file_path: path,
      file_type: 'audio/mpeg',
      file_size: blob.size,
      folder: 'Studio',
      category: 'studio',
      is_public: false,
      is_featured: false,
      is_deleted: false,
      course_id: null,
      uploaded_by: authUser.id,
      download_count: 0,
      view_count: 0,
    } as never);
    if (insErr) throw new Error(`Library save failed: ${insErr.message}`);
  };

  const deliverClipMp3 = async (blob: Blob, name: string, dest: 'download' | 'library') => {
    const clean = name.replace(/[/\\]+/g, '-').trim();
    const filename = /\.mp3$/i.test(clean) ? clean : `${clean}.mp3`;
    if (dest === 'library') {
      await saveClipMp3ToLibrary(filename, blob);
      toast.success(`Saved to Media Library (Studio): ${filename}`);
      return;
    }
    const dlUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = dlUrl;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(dlUrl), 30_000);
    toast.success('Clip exported as MP3');
  };

  /** Export the selected clip as a 320kbps MP3.
   * AUDIO clip: slice the source asset (offset/duration), apply clip
   * gain + fades (+reverse) at the sample level, encode in the shared
   * worker. pitch/time_stretch are intentionally not applied (spec'd v1
   * non-goal).
   * MIDI clip: no source asset exists — offline-bounce the clip's time
   * window on just its track (notes through the track's instrument, same
   * renderer as Region export), then encode. */
  const exportSelectedClipMp3 = async (name: string, dest: 'download' | 'library') => {
    if (!selectedClip || exportingClip) return;
    const track = session.tracks.find((t) => t.id === selectedClip.trackId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const clip: any = track && (track as any).clips?.find((c: any) => c.id === selectedClip.clipId);
    if (!track || !clip) return;
    if (clip.kind === 'midi') {
      setExportingClip(true);
      try {
        const buf = await renderRegionBuffer(
          session, [track.id], clip.start_seconds, clip.start_seconds + clip.duration_seconds,
        );
        const channels = Array.from({ length: buf.numberOfChannels }, (_, i) => buf.getChannelData(i));
        const blob = await encodeMp3(channels, buf.sampleRate, 320);
        await deliverClipMp3(blob, name, dest);
      } catch (e) {
        toast.error('Clip export failed', { description: e instanceof Error ? e.message : String(e) });
      } finally {
        setExportingClip(false);
      }
      return;
    }
    const asset = session.assets.find((a) => a.id === clip.asset_id);
    if (!asset) { toast.error('Clip source not found.'); return; }
    setExportingClip(true);
    try {
      const url = getAssetUrlSync(asset.id)
        ?? await getAssetUrl({ tenantId: session.tenant_id, sessionId: session.id, asset });
      const res = await fetch(url);
      if (!res.ok) throw new Error('Could not load clip audio');
      const ctx = new AudioContext();
      const buf = await ctx.decodeAudioData(await res.arrayBuffer());
      await ctx.close();
      const channels = Array.from({ length: buf.numberOfChannels }, (_, i) => buf.getChannelData(i));
      const sliced = sliceClipChannels(channels, buf.sampleRate, {
        offset_seconds: clip.offset_seconds ?? 0,
        duration_seconds: clip.duration_seconds,
        gain_db: clip.gain_db ?? 0,
        fade_in_seconds: clip.fade_in_seconds ?? 0,
        fade_out_seconds: clip.fade_out_seconds ?? 0,
        reverse: !!clip.reverse,
      });
      const blob = await encodeMp3(sliced, buf.sampleRate, 320);
      await deliverClipMp3(blob, name, dest);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/not found|Failed to fetch|load clip audio|decod/i.test(msg)) {
        toast.error('Take is still processing, try again in a moment.');
      } else {
        toast.error('Clip export failed', { description: msg });
      }
    } finally {
      setExportingClip(false);
    }
  };
  // The session lives in the session hook (`sessionState`). Reach
  // inside to compute snapSeconds from tempo + time-sig before any
  // child needs it. If the session hasn't loaded yet, fall back to a
  // 120-BPM 4/4 grid so the value is still well-defined.
  const sessTempo = sessionState.session?.tempo_bpm ?? 120;
  const sessNum = sessionState.session?.time_signature.numerator ?? 4;
  const sessDen = sessionState.session?.time_signature.denominator ?? 4;
  const snapSeconds = snapModeToSeconds(snapMode, sessTempo, sessNum, sessDen);

  // Loop region — set by dragging on the bar ruler. While loop is
  // enabled (Repeat button in transport), the transport loops between
  // start and end. Null = no region defined.
  const [loopRegion, setLoopRegion] = useState<{ start: number; end: number } | null>(null);
  const [loopEnabled, setLoopEnabled] = useState(false);
  useEffect(() => {
    if (loopEnabled && loopRegion) {
      engineState.updateTransport?.({ loop: { start: loopRegion.start, end: loopRegion.end, enabled: true } });
    } else {
      engineState.updateTransport?.({ loop: { start: 0, end: 0, enabled: false } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loopEnabled, loopRegion?.start, loopRegion?.end]);

  // Keep the loop region in sync with the selected clip while loop is
  // enabled. Trim / move the clip → the loop region follows.
  useEffect(() => {
    if (!loopEnabled || !selectedClip) return;
    const t = sessionState.session?.tracks.find((x) => x.id === selectedClip.trackId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c = t && (t as any).clips.find((cc: { id: string }) => cc.id === selectedClip.clipId);
    if (!c) return;
    const next = { start: c.start_seconds, end: c.start_seconds + c.duration_seconds };
    if (!loopRegion || loopRegion.start !== next.start || loopRegion.end !== next.end) {
      setLoopRegion(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loopEnabled, selectedClip?.clipId, selectedClip?.trackId, sessionState.session]);

  // User-resizable column widths. Persist locally so each user gets
  // their own preferred layout across sessions.
  const [inspectorWidth, setInspectorWidth] = useState<number>(() => {
    const v = Number(localStorage.getItem('studio.inspectorWidth') || 0);
    return v >= INSPECTOR_WIDTH_MIN ? Math.min(v, INSPECTOR_WIDTH_MAX) : 224;
  });
  const [stripWidth, setStripWidth] = useState<number>(() => {
    const v = Number(localStorage.getItem('studio.stripWidth') || 0);
    return v >= STRIP_WIDTH_MIN ? Math.min(v, STRIP_WIDTH_MAX) : STRIP_WIDTH;
  });
  useEffect(() => { localStorage.setItem('studio.inspectorWidth', String(inspectorWidth)); }, [inspectorWidth]);
  useEffect(() => { localStorage.setItem('studio.stripWidth', String(stripWidth)); }, [stripWidth]);

  // Phone viewports can't afford the 240px desktop strip — it leaves
  // ~135px for the timeline on a 375px screen. Clamp to 132px on phones
  // so the timeline gets the larger share. User's saved preference is
  // preserved for when they rotate / use a larger device.
  const [isPhoneViewport, setIsPhoneViewport] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 640 : false,
  );
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 639px)');
    const onChange = () => setIsPhoneViewport(window.innerWidth < 640);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  const effectiveStripWidth = isPhoneViewport ? Math.min(stripWidth, 132) : stripWidth;

  // Timeline zoom — px per second of session time. Shared across the
  // ruler + every track lane + the playhead via ZoomContext.
  const [pxPerSecond, setPxPerSecond] = useState<number>(() => {
    const v = Number(localStorage.getItem('studio.pxPerSecond') || 0);
    return v >= PX_PER_SECOND_MIN && v <= PX_PER_SECOND_MAX ? v : PX_PER_SECOND_DEFAULT;
  });
  useEffect(() => { localStorage.setItem('studio.pxPerSecond', String(pxPerSecond)); }, [pxPerSecond]);
  const zoomBy = (factor: number) => setPxPerSecond((p) =>
    Math.max(PX_PER_SECOND_MIN, Math.min(PX_PER_SECOND_MAX, p * factor)),
  );

  // Shared horizontal-scroll sync so the ruler + every track lane move
  // together. Each scrollable child registers itself via the context.
  const scrollSync = useScrollSyncProvider();

  // Auto-follow the playhead while playing so it never runs off-screen.
  // When the playhead nears the right edge (or is left of view after a
  // seek/loop), page the timeline forward so the playhead sits ~15% from
  // the left, giving some lookahead. Runs on each position tick; cheap.
  // Driven by the tick store (not React state, which no longer updates
  // per position tick). Latest-ref pattern: the handler is refreshed
  // every render so it always sees current pxPerSecond/scrollSync,
  // while the subscription itself is mounted once.
  const followPlayheadRef = useRef<() => void>(() => {});
  followPlayheadRef.current = () => {
    if (!state?.isPlaying) return;
    const vp = scrollSync.getViewport();
    if (!vp || vp.clientWidth <= 0) return;
    const playheadX = transportTick.get().positionSeconds * pxPerSecond;
    const margin = Math.min(80, vp.clientWidth * 0.15);
    if (playheadX > vp.scrollLeft + vp.clientWidth - margin || playheadX < vp.scrollLeft) {
      scrollSync.scrollToX(playheadX - vp.clientWidth * 0.15);
    }
  };
  useEffect(() => transportTick.subscribe(() => followPlayheadRef.current()), [transportTick]);

  // Track row height — uniform across all rows. Drag the bottom edge
  // of any row to resize them all.
  const [trackHeight, setTrackHeight] = useState<number>(() => {
    const v = Number(localStorage.getItem('studio.trackHeight') || 0);
    return v >= TRACK_HEIGHT_MIN && v <= TRACK_HEIGHT_MAX ? v : TRACK_HEIGHT_DEFAULT;
  });
  useEffect(() => { localStorage.setItem('studio.trackHeight', String(trackHeight)); }, [trackHeight]);
  const setTrackHeightClamped = (h: number) =>
    setTrackHeight(Math.max(TRACK_HEIGHT_MIN, Math.min(TRACK_HEIGHT_MAX, h)));

  // Live recording state (mic-armed tracks → real-time waveform).
  const [recording, setRecording] = useState<RecordingSession | null>(null);
  const recRafRef = useRef<number | null>(null);
  const [, forceRender] = useState(0);
  // Keep a ref to the latest engineState so the recording RAF closure
  // can read the current peak-dB values (input level) without being
  // restarted every render. Without this, the iOS waveform would stay
  // empty for the entire take and only appear when the recording
  // finalized — the user saw it as "10 seconds to appear".
  const engineStateRef = useRef(engineState);
  useEffect(() => { engineStateRef.current = engineState; }, [engineState]);
  // Latest input peak (dBFS, negative) pushed by the native recorder via
  // notifyListeners('recordPeak'). The RAF sampler reads this each tick
  // and writes the corresponding amplitude into recording.peaks.
  const latestPeakDbRef = useRef<number>(-Infinity);
  // PluginListenerHandle for the native recordPeak subscription —
  // unwired in stopRecording().
  const nativePeakSubRef = useRef<{ remove: () => Promise<void> } | null>(null);

  // ── Streaming accompaniment + capture-from-playback ──────────────────
  const streaming = useStreamingAccompaniment(session.accompaniment);
  const [capturing, setCapturing] = useState(false);
  // When a streaming-backed take starts, this ref holds the wall-clock ms
  // at which the streaming source became audible. stopRecording() uses it
  // to override transportStartWallMs in computeTakeAlignment so head-trim
  // measures against the actual backing onset rather than the Studio
  // transport start (which may lag by hundreds of ms on buffered sources).
  // Null when the take was started without a streaming backing (file/null).
  const streamingTransportWallMsRef = useRef<number | null>(null);

  // Effect: when accompaniment.kind === 'file', ensure a track exists in the
  // session backed by that URL so it loads in the mixer as a normal audio clip.
  // We upsert idempotently — if a track already references the fileUrl we skip.
  const ACCOMPANIMENT_TRACK_COLOR = '#64748b'; // slate-500
  const ACCOMPANIMENT_TRACK_NAME = 'Accompaniment';
  useEffect(() => {
    if (session.accompaniment?.kind !== 'file') return;
    const fileUrl = session.accompaniment.fileUrl;
    const title = session.accompaniment.title ?? ACCOMPANIMENT_TRACK_NAME;
    // I1: Guard by clip source URL (not track name) so renaming the
    // accompaniment track doesn't defeat the idempotency check. Walk every
    // audio track's clips, look each clip's asset_id up in the assetUrlCache,
    // and skip seeding if any clip already resolves to the current fileUrl.
    const alreadySeeded = session.tracks.some(
      (t) =>
        isAudioTrack(t) &&
        t.clips.some((c) => getAssetUrlSync(c.asset_id) === fileUrl),
    );
    if (alreadySeeded) return;
    // Seed a locked audio track with one clip spanning the declared session length.
    // The asset is a placeholder — duration will be updated once the file loads.
    const assetId = `accomp-${newId()}`;
    const trackId = `accomp-track-${newId()}`;
    setAssetUrl(assetId, fileUrl);
    const asset: AudioAsset = {
      id: assetId,
      filename: title,
      format: fileUrl.endsWith('.mp3') ? 'mp3' : fileUrl.endsWith('.m4a') ? 'm4a' : 'wav',
      duration_seconds: session.length_seconds,
      sample_rate: 44100,
      channels: 2,
      size_bytes: 0,
    };
    const clip: AudioClip = {
      id: newId(), kind: 'audio', asset_id: assetId,
      start_seconds: 0, duration_seconds: session.length_seconds,
      offset_seconds: 0, gain_db: 0,
      fade_in_seconds: 0, fade_out_seconds: 0,
      reverse: false, pitch_semitones: 0, time_stretch: 1,
    };
    const track: AudioTrack = {
      id: trackId, kind: 'audio', name: ACCOMPANIMENT_TRACK_NAME,
      color: ACCOMPANIMENT_TRACK_COLOR,
      volume_db: 0, pan: 0, mute: false, solo: false, arm: false,
      fx: [], clips: [clip],
    };
    update((s) => ({ ...s, tracks: [track, ...s.tracks], assets: [...s.assets, asset] }));
  // Run only when the accompaniment fileUrl changes — not on every session update.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.accompaniment?.kind === 'file' ? session.accompaniment.fileUrl : null]);

  const isStreaming =
    session.accompaniment?.kind === 'apple_music' ||
    session.accompaniment?.kind === 'apple_music_album' ||
    session.accompaniment?.kind === 'youtube';

  // C2: Declare captureRecorderRef ABOVE onCapture so the ref allocation
  // textually precedes the function that writes to it. React's runtime is
  // unaffected (refs allocate before any handler runs), but this prevents
  // a linter, code-splitter, or hand-refactor from reordering into a broken state.
  const captureRecorderRef = useRef<MicRecorder | null>(null);

  const onCapture = async () => {
    if (!session.accompaniment) return;
    setCapturing(true);
    try {
      // Open the mic (reuse the same openMicRecorder path as a normal take).
      const inputDeviceId = localStorage.getItem('studio.inputDeviceId') || undefined;
      const inputGainDb = Number(localStorage.getItem('studio.micInputGainDb') || 0);
      const channelIndex = Number(localStorage.getItem('studio.inputChannelIndex') || 0) || 0;
      const captureRecorder = await openMicRecorder({ inputDeviceId, inputGainDb, channelIndex, captureWav: false });
      await captureRecorder.start();
      // Start the streaming backing from position 0.
      await streaming.start(0);
      // Store the recorder for onStopCapture.
      captureRecorderRef.current = captureRecorder;
    } catch (e) {
      setCapturing(false);
      toast.error(e instanceof Error ? e.message : 'Capture failed to start');
    }
  };

  const onStopCapture = async () => {
    const captureRecorder = captureRecorderRef.current;
    captureRecorderRef.current = null;
    try {
      streaming.stop();
      if (!captureRecorder) throw new Error('No capture recorder active');
      const blob = await captureRecorder.stop();
      captureRecorder.dispose();
      if (!blob || blob.size < 1024) throw new Error('No audio captured — check mic and speaker volume');
      const captured = await captureFromPlayback({ blob, sessionId: session.id });
      // Flip the session accompaniment to kind='file' with the captured WAV URL.
      const nextSession = { ...session, accompaniment: { kind: 'file' as const, title: captured.title, fileUrl: captured.url } };
      update(() => nextSession);
      // I2: Persist immediately rather than relying on the 800ms autosave
      // debounce. The captured WAV is already uploaded to storage; if the user
      // reloads before the debounce fires the manifest would still reference
      // the old streaming accompaniment and the WAV URL would be orphaned.
      await saveSession(nextSession).catch((err) => {
        console.error('[studio] failed to persist accompaniment capture', err);
      });
      toast.success('Accompaniment captured — future takes lock to this WAV.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Capture failed');
    } finally {
      setCapturing(false);
    }
  };

  // Undo stack — snapshots of the session taken right before each
  // structural change (recording finalize, track add/remove, etc.).
  // Cap at 30 entries so we don't grow indefinitely.
  const undoStackRef = useRef<Session[]>([]);
  const pushHistory = (snapshot: Session) => {
    undoStackRef.current.push(JSON.parse(JSON.stringify(snapshot)));
    if (undoStackRef.current.length > 30) undoStackRef.current.shift();
  };
  const undo = () => {
    const prev = undoStackRef.current.pop();
    if (!prev) {
      toast.info('Nothing to undo');
      return;
    }
    update(() => prev);
    toast.success('Undone');
  };

  const armedTrackIds = session.tracks.filter((t) => t.arm && isAudioTrack(t)).map((t) => t.id);

  // ── Markers — named navigation points on the timeline ─────────────
  const markers = session.markers ?? [];
  const addMarkerAtPlayhead = () => {
    const seconds = posNow();
    const marker: SessionMarker = { id: newId(), name: defaultMarkerName(markers), seconds };
    update((s) => ({ ...s, markers: [...(s.markers ?? []), marker] }));
    toast.success(`${marker.name} set at ${formatBarBeat(seconds, session.tempo_bpm, session.time_signature.numerator)}`);
  };
  const renameMarker = (id: string, name: string) => {
    update((s) => ({ ...s, markers: (s.markers ?? []).map((mk) => mk.id === id ? { ...mk, name } : mk) }));
  };
  const deleteMarker = (id: string) => {
    update((s) => ({ ...s, markers: (s.markers ?? []).filter((mk) => mk.id !== id) }));
  };
  const jumpPrevMarker = () => {
    const mk = prevMarker(markers, posNow());
    if (mk) engineState.seek?.(mk.seconds); else engineState.seek?.(0);
  };
  const jumpNextMarker = () => {
    const mk = nextMarker(markers, posNow());
    if (mk) engineState.seek?.(mk.seconds);
  };
  // Marker being renamed/deleted via the ruler-flag double-click dialog.
  const [editingMarkerId, setEditingMarkerId] = useState<string | null>(null);
  const editingMarker = markers.find((mk) => mk.id === editingMarkerId) ?? null;

  /** Drive live waveform polling for a web take (native takes push
   * peaks over the bridge instead). Shared by the manual record flow
   * and the auto punch-in. */
  const startWaveTick = (recorder: MicRecorder, startedAt: number) => {
    const tick = () => {
      const now = performance.now();
      const wave = recorder.getWaveform();
      let peak = 0;
      for (let i = 0; i < wave.length; i++) {
        const v = Math.abs(wave[i]);
        if (v > peak) peak = v;
      }
      const since = now - startedAt;
      const targetCount = Math.floor(since / 33);
      setRecording((prev) => {
        if (!prev) return prev;
        while (prev.peaks.length < targetCount) prev.peaks.push(peak);
        return prev;
      });
      forceRender((n) => n + 1);
      recRafRef.current = requestAnimationFrame(tick);
    };
    recRafRef.current = requestAnimationFrame(tick);
  };

  // Reset the MIDI capture buffers for a fresh take — CC/pedal state must
  // not leak across takes, and compensation is re-measured each time since
  // output latency can drift between takes. Shared by the normal record
  // path and punch-record's in-point.
  const resetMidiCapture = () => {
    midiCcRef.current = [];
    midiPedalRef.current = false;
    // Auto compensation measured once per take; ±trim from the settings
    // dial. Do NOT clamp the total at 0 here: the trim UI explicitly
    // promises "go negative if they land early" (MidiLatencyControl), and
    // clamping the sum would make a negative trim a no-op whenever auto
    // latency is 0 (Safari). A negative total is fine — compNow() below
    // subtracts this value, so a negative comp SHIFTS captured times
    // later, and compNow's own `Math.max(0, position - comp)` still floors
    // the result at 0.
    // Measure off the ENGINE'S running context — the one actually
    // playing the click. A throwaway context reports outputLatency 0
    // ("auto 0"), which left takes uncompensated and audibly late.
    midiCompSecRef.current = engineState.native ? 0
      : ((engineState.engine?.getOutputLatencyMs() || getOutputLatencyMs()) + getMidiTrimMs()) / 1000;
  };

  const startRecording = async () => {
    if (recording) return;
    midiTakeClipRef.current = null; // each take owns a fresh clip
    resetMidiCapture();
    const mode = recordStartMode({
      armedAudioCount: armedTrackIds.length,
      midiInputEnabled,
      hasMidiTarget: !!midiInputTrack,
    });
    if (mode === 'blocked') {
      toast.error('Arm an audio track (red R) — or turn on the MIDI keyboard in Settings to record a MIDI take.');
      return;
    }
    try {
      await start();                                  // unlock audio

      // iOS: flip the audio session into .playAndRecord NOW, before the
      // count-in. Doing it inside nativeRecordStart put a 100-500 ms
      // category transition between the last count-in click and beat 1,
      // so the metronome grid started late on recording runs.
      const startSec = posNow();
      const pressWallMs = performance.now();

      // iOS: the ENTIRE count-in → recorder → transport sequence runs
      // on one native clock (recordWithCountIn). Driving the count-in
      // from JS and then crossing the bridge twice (recordStart, play)
      // put 100-300 ms of serial latency between the last count-in
      // click and grid beat 1 — the take's click grid always started
      // audibly late off the pulse. JS keeps only the visual countdown.
      // Audio takes only — a MIDI-only take has no mic to open, so it
      // uses the shared JS count-in + transport path below on iOS too.
      if (mode === 'audio' && engineState.native && engineState.nativeRecordStart) {
        const { NativeStudio } = await import('@/plugins/studioEngine');
        await NativeStudio.prepareRecordSession().catch(() => { /* recordWithCountIn will retry */ });

        const secPerBeat = 60 / session.tempo_bpm;
        const numerator = session.time_signature.numerator;
        const totalBeats = countInBars * numerator;

        // Visual-only countdown badge — audio clicks are native now.
        let visualTimer: ReturnType<typeof setInterval> | null = null;
        if (totalBeats > 0) {
          let beatIdx = 0;
          setCountInBeat(1);
          visualTimer = setInterval(() => {
            beatIdx += 1;
            if (beatIdx >= totalBeats) return;
            setCountInBeat(beatIdx + 1);
          }, secPerBeat * 1000);
        }
        try {
          await NativeStudio.recordWithCountIn({
            countInBeats: totalBeats,
            secondsPerBeat: secPerBeat,
            beatsPerBar: numerator,
          });
        } finally {
          if (visualTimer) clearInterval(visualTimer);
          setCountInBeat(null);
        }
        const startedAt = performance.now();
        setRecording({
          recorder: null, native: true,
          startSeconds: startSec, startWallMs: startedAt,
          pressWallMs, captureStartWallMs: startedAt, transportStartWallMs: startedAt,
          armedTrackIds, peaks: [],
        });
        toast.success('Recording — click ● again to stop');

        // Subscribe to live peak-dB events from the native AVAudioRecorder
        // (fires ~30Hz, see Recorder.swift). Each value is a dBFS reading
        // of the actual mic input — without this the waveform would be
        // empty for the duration of the take and only fill in after stop,
        // which the user saw as "10 seconds to appear".
        const peakHandle = await NativeStudio.addListener('recordPeak', (e: { db: number }) => {
          latestPeakDbRef.current = e.db;
        });
        nativePeakSubRef.current = peakHandle;

        const nativeTick = () => {
          const now = performance.now();
          const peakDb = latestPeakDbRef.current;
          const amp = Number.isFinite(peakDb) && peakDb > -60
            ? Math.min(1, Math.pow(10, peakDb / 20))
            : 0;
          const since = now - startedAt;
          const targetCount = Math.floor(since / 33);
          setRecording((prev) => {
            if (!prev) return prev;
            while (prev.peaks.length < targetCount) prev.peaks.push(amp);
            return prev;
          });
          forceRender((n) => n + 1);
          recRafRef.current = requestAnimationFrame(nativeTick);
        };
        recRafRef.current = requestAnimationFrame(nativeTick);
        return;
      }

      // Web path: Tone.UserMedia + MediaRecorder. Count-in for web
      // stays JS-driven (same-context audio, no bridge seam).
      if (countInBars > 0) {
        const secPerBeat = 60 / session.tempo_bpm;
        const numerator = session.time_signature.numerator;
        const totalBeats = countInBars * numerator;
        let beatIdx = 0;
        engineState.triggerMetronomeClick?.(true);
        setCountInBeat(1);
        const audioTimer = setInterval(() => {
          beatIdx += 1;
          if (beatIdx >= totalBeats) return;
          engineState.triggerMetronomeClick?.(beatIdx % numerator === 0);
          setCountInBeat(beatIdx + 1);
        }, secPerBeat * 1000);
        await new Promise<void>((resolve) => setTimeout(resolve, totalBeats * secPerBeat * 1000));
        clearInterval(audioTimer);
        setCountInBeat(null);
      }
      const startedAt = performance.now();

      // MIDI-only take: no mic to open. The transport rolls with
      // recordingActive set so handleMidiNoteOn/Off capture into the
      // target MIDI track; notes commit clip-side on each key release.
      if (mode === 'midi') {
        engineState.setRecordingActive?.(true);
        let midiTransportStartWallMs: number | null = null;
        if (!state?.isPlaying) {
          play();
          midiTransportStartWallMs = performance.now();
        }
        setRecording({
          recorder: null, native: false, midiOnly: true,
          startSeconds: startSec, startWallMs: startedAt,
          pressWallMs, captureStartWallMs: startedAt,
          transportStartWallMs: midiTransportStartWallMs,
          armedTrackIds: [], peaks: [],
        });
        toast.success('Recording MIDI — click ● again to stop');
        return;
      }

      // Web path: Tone.UserMedia + MediaRecorder.
      const inputDeviceId = localStorage.getItem('studio.inputDeviceId') || undefined;
      const inputGainDb = Number(localStorage.getItem('studio.micInputGainDb') || 0);
      const channelIndex = Number(localStorage.getItem('studio.inputChannelIndex') || 0) || 0;
      const recorder = await openMicRecorder({ inputDeviceId, inputGainDb, channelIndex, captureWav: isAppleWebEngine() });
      await recorder.start();
      // Stamp the moment capture is actually live — getUserMedia +
      // graph setup above is the variable startup cost that used to be
      // guessed at inside the 700ms latency dial.
      const captureStartWallMs = performance.now();
      engineState.setRecordingActive?.(true);
      // Start the transport BEFORE registering the recording so we can
      // stamp when playback began; null = it was already rolling.
      let transportStartWallMs: number | null = null;
      if (!state?.isPlaying) {
        play();
        transportStartWallMs = performance.now();
      }
      // For streaming backings (Apple Music / YouTube), kick off the backing
      // source and capture the wall-clock ms when it became audible. This
      // precise timestamp overrides transportStartWallMs in computeTakeAlignment
      // (see stopRecording) so the head-trim accounts for streaming buffer
      // latency rather than the Studio transport's start time (which is only
      // the Tone.js clock start — not when sound arrived at the listener).
      // For file or null backings we leave the ref null so the existing
      // transport-stamp path in stopRecording is used unchanged.
      streamingTransportWallMsRef.current = null;
      if (isStreaming) {
        try {
          const recordStartOffsetSec = state?.isPlaying ? (posNow() - startSec) : 0;
          const { backingAudibleWallMs } = await streaming.start(recordStartOffsetSec);
          streamingTransportWallMsRef.current = backingAudibleWallMs;
        } catch (streamErr) {
          // I3: Non-fatal — the take continues without the streaming backing
          // rather than aborting the whole recording. Toast as error (not
          // warning) so the user knows the take may drift and can stop + retry.
          // Continue but surface clearly — same pattern as the retired
          // Part Tracks startExternalAccompaniment failure path.
          console.warn('[studio] streaming backing start failed', streamErr);
          toast.error('Backing failed to start; take may drift. Stop and try again.');
        }
      }
      setRecording({
        recorder, native: false,
        startSeconds: startSec, startWallMs: startedAt,
        pressWallMs, captureStartWallMs, transportStartWallMs,
        armedTrackIds, peaks: [],
      });
      toast.success('Recording — click ● again to stop');
      startWaveTick(recorder, startedAt);
    } catch (e) {
      // If we set recordingActive=true but bailed before setRecording(),
      // the loop watchdog + preGain servo would stay stood down for the
      // rest of the session. Reset defensively — it's a no-op when we
      // never armed in the first place.
      engineState.setRecordingActive?.(false);
      toast.error('Could not start recording', { description: e instanceof Error ? e.message : String(e) });
    }
  };

  // Attach this take's captured CC (pedal + mod wheel) to the take clip.
  // Called once per stop, after the corresponding HeldNotes flush commit.
  const commitTakeCc = () => {
    const ccTake = midiCcRef.current.splice(0);
    if (ccTake.length && midiTakeClipRef.current && midiInputTrack) {
      const takeId = midiTakeClipRef.current;
      const trackId = midiInputTrack.id;
      update((s) => ({
        ...s,
        tracks: s.tracks.map((t) => t.id === trackId && isMidiTrack(t)
          ? { ...t, clips: attachTakeCc(t.clips, takeId, ccTake) } as Track
          : t),
      }));
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    if (recRafRef.current !== null) { cancelAnimationFrame(recRafRef.current); recRafRef.current = null; }
    if (nativePeakSubRef.current) {
      try { await nativePeakSubRef.current.remove(); } catch { /* ignore */ }
      nativePeakSubRef.current = null;
    }
    latestPeakDbRef.current = -Infinity;

    // MIDI-only take: notes already committed on each key release — there
    // is no blob/asset to finalize. Flush any keys still held (their
    // note-off would otherwise land after the playhead is parked), then
    // park at the take's start like the audio path does.
    if (recording.midiOnly) {
      const midiElapsed = (performance.now() - recording.startWallMs) / 1000;
      const takeEndSec = posNow() || recording.startSeconds;
      commitMidiPresses(midiHeld.flush(), takeEndSec, true);
      commitTakeCc();
      // Grow the grid to cover a take that ran past it, like the audio
      // path does — otherwise playback stops at the old length_seconds
      // and the take's tail never plays.
      update((s) => ({ ...s, length_seconds: grownSessionLength(s.length_seconds, takeEndSec) }));
      setRecording(null);
      engineState.setRecordingActive?.(false);
      try { engineState.seek?.(recording.startSeconds); } catch { /* ignore */ }
      toast.success(`Recorded ${midiElapsed.toFixed(1)}s of MIDI`);
      return;
    }

    // MIDI notes riding along an audio take: commit anything still held or
    // pedal-sustained before the transport gets parked. immediate=true so
    // any coalesced-mid-take presses land in state before we tear down.
    commitMidiPresses(midiHeld.flush(), posNow() || recording.startSeconds, true);
    commitTakeCc();

    const { recorder, native: nativeTake, punch, startSeconds, startWallMs, pressWallMs, captureStartWallMs, armedTrackIds: armed } = recording;
    // If a streaming backing was running during this take, stop it now.
    // Also grab the streaming-transport override (backingAudibleWallMs) so
    // computeTakeAlignment measures head-trim against the true backing onset.
    const streamingBackingWallMs = streamingTransportWallMsRef.current;
    streamingTransportWallMsRef.current = null;
    if (isStreaming) { try { streaming.stop(); } catch { /* ignore */ } }
    // Use the streaming-backing wall-clock as transportStartWallMs when
    // available (streaming take). Fall back to the Studio transport stamp
    // (recording.transportStartWallMs) for non-streaming takes.
    const transportStartWallMs = streamingBackingWallMs ?? recording.transportStartWallMs;
    setRecording(null);
    engineState.setRecordingActive?.(false);
    const elapsed = (performance.now() - startWallMs) / 1000;
    try {
      let rawBlob: Blob;
      if (nativeTake && engineState.nativeRecordStop) {
        // iOS path: AVAudioRecorder wrote a WAV to the app's tmp dir.
        // WKWebView can't fetch `file://` URLs directly, so we run the
        // URL through `Capacitor.convertFileSrc()`, which rewrites it
        // to Capacitor's internal scheme (`capacitor://localhost/_capacitor_file_/…`)
        // — that one the webview CAN load. Without this rewrite, fetch
        // throws "Load failed" and the user sees "Could not finalize
        // recording".
        const { localUrl } = await engineState.nativeRecordStop();
        const { Capacitor } = await import('@capacitor/core');
        const fetchable = Capacitor.convertFileSrc(localUrl);
        const fileRes = await fetch(fetchable);
        rawBlob = await fileRes.blob();
      } else if (recorder) {
        rawBlob = await recorder.stop();
        recorder.dispose();
      } else {
        throw new Error('no recorder source');
      }
      // Web takes: measured startup gap + device residual. Native takes:
      // undefined → finalize falls back to the legacy configured trim.
      let clipStartOffsetSec = 0;
      let trimOverrideMs: number | undefined;
      if (!nativeTake) {
        const align = computeTakeAlignment({
          pressWallMs, captureStartWallMs, transportStartWallMs,
          // Live output latency (tracks Bluetooth device switches) +
          // configured residual for the input side. Read from the
          // engine's RUNNING context — a throwaway one reports 0.
          deviceLatencyMs: getConfiguredDeviceLatencyMs() + (engineState.engine?.getOutputLatencyMs() || getOutputLatencyMs()),
        });
        trimOverrideMs = align.trimMs;
        clipStartOffsetSec = align.clipStartOffsetSec;
      }
      const { blob: uploadBlob, buf, ext } = await finalizeRecordingBlob(rawBlob, trimOverrideMs);
      const peaks = computePeaks(buf);
      const filename = `take-${new Date().toISOString().replace(/[:.]/g, '-')}.${ext}`;

      // Optimistic insert: the take appears on the track the moment
      // the tape stops, backed by an object URL of the finalized blob.
      // The upload + real URL replacement happens in the background.
      // Was: user waited 3–8s (upload + roundtrip) for the clip to
      // appear — long enough to think Stop had frozen the app.
      const provisionalId = `provisional-${newId()}`;
      const localUrl = URL.createObjectURL(uploadBlob);
      const provisionalAsset: AudioAsset = {
        id: provisionalId,
        filename,
        format: (ext as AudioAsset['format']) ?? 'wav',
        duration_seconds: buf.duration,
        sample_rate: buf.sampleRate,
        channels: buf.numberOfChannels,
        size_bytes: uploadBlob.size,
        peaks,
      };
      if (nativeTake) {
        // iOS: the native engine reads assets with AVAudioFile, which
        // can't open a WebView blob: object URL — caching one here left
        // every fresh take silently absent from playback. Persist the
        // finalized (latency-trimmed) WAV to the app tmp dir via the
        // plugin and cache that file:// URL instead.
        //
        // base64 via FileReader — NOT String.fromCharCode(...spread):
        // JavaScriptCore's spread-argument limit is low enough that a
        // multi-MB take threw RangeError mid-finalize on device, which
        // surfaced as "Could not finalize recording".
        try {
          const { NativeStudio } = await import('@/plugins/studioEngine');
          const base64 = await new Promise<string>((resolve, reject) => {
            const fr = new FileReader();
            fr.onload = () => {
              const s = fr.result as string;
              resolve(s.slice(s.indexOf(',') + 1));
            };
            fr.onerror = () => reject(fr.error ?? new Error('FileReader failed'));
            fr.readAsDataURL(uploadBlob);
          });
          const { localUrl: nativePath } = await NativeStudio.saveFinalizedTake({
            base64,
            filename,
          });
          setAssetUrl(provisionalId, nativePath);
        } catch (persistErr) {
          // The take must never be lost to a persistence hiccup: fall
          // back to the blob URL (native playback stays silent until
          // the background upload lands and the https path takes over),
          // and say so instead of failing the whole stop.
          console.warn('[studio] saveFinalizedTake failed, using blob URL fallback', persistErr);
          setAssetUrl(provisionalId, localUrl);
          toast.error('Take saved, but instant playback may need a few seconds', {
            description: persistErr instanceof Error ? persistErr.message : String(persistErr),
          });
        }
      } else {
        setAssetUrl(provisionalId, localUrl);
      }

      // Snapshot before the recording lands so ⌘Z restores pre-recording state.
      pushHistory(session);

      const clipId = newId();
      update((s) => {
        const nextAssets = [...s.assets, provisionalAsset];
        const nextTracks = s.tracks.map((t) => {
          if (!armed.includes(t.id) || !isAudioTrack(t)) return t;
          const clip: AudioClip = {
            id: clipId, kind: 'audio', asset_id: provisionalId,
            start_seconds: startSeconds + clipStartOffsetSec, duration_seconds: buf.duration,
            offset_seconds: 0, gain_db: 0,
            fade_in_seconds: 0, fade_out_seconds: 0,
            reverse: false, pitch_semitones: 0, time_stretch: 1,
          };
          return { ...t, clips: [...t.clips, clip] } as Track;
        });
        // Grow the session to cover a take that ran past the current grid —
        // otherwise the transport stops at length_seconds (the end of the
        // grid) and the tail of the recording never plays back even though
        // the clip captured it.
        const clipEndSec = startSeconds + clipStartOffsetSec + buf.duration;
        return { ...s, assets: nextAssets, tracks: nextTracks, length_seconds: grownSessionLength(s.length_seconds, clipEndSec) };
      });
      toast.success(`Recorded ${elapsed.toFixed(1)}s`);

      // Background upload — swap the provisional asset for the real
      // one when the network round-trip finishes. The user can play +
      // hear the take immediately in the meantime.
      (async () => {
        try {
          const assetRaw = await uploadAudioAsset({
            tenantId: session.tenant_id,
            sessionId: session.id,
            file: uploadBlob,
            filename,
            duration_seconds: buf.duration,
            sample_rate: buf.sampleRate,
            channels: buf.numberOfChannels,
          });
          const asset: AudioAsset = { ...assetRaw, peaks };
          const remoteUrl = await getAssetUrl({ tenantId: session.tenant_id, sessionId: session.id, asset });
          setAssetUrl(asset.id, remoteUrl);
          update((s) => {
            const nextAssets = s.assets
              .filter((a) => a.id !== provisionalId)
              .concat([asset]);
            const nextTracks = s.tracks.map((t) => {
              if (!isAudioTrack(t)) return t;
              return {
                ...t,
                clips: t.clips.map((c) => c.id === clipId ? { ...c, asset_id: asset.id } : c),
              } as Track;
            });
            return { ...s, assets: nextAssets, tracks: nextTracks };
          });
          // Local blob URL is no longer referenced — free it.
          try { URL.revokeObjectURL(localUrl); } catch { /* ignore */ }
        } catch (uploadErr) {
          toast.error('Take upload failed — clip is playable locally but not saved', {
            description: uploadErr instanceof Error ? uploadErr.message : String(uploadErr),
          });
        }
      })();
      // Park the playhead at the take's start so the user can press
      // Play (or hit Space) once and immediately hear the take. Auto-
      // play is intentionally NOT triggered here — the engine reload
      // that follows the clip add tears down + rebuilds Players (or the
      // whole AVAudioEngine on iOS), which can take a couple seconds and
      // makes auto-play race with the rebuild. Punch takes skip the
      // park: their post-roll is still rolling and must not be yanked.
      if (!punch) { try { engineState.seek?.(startSeconds + clipStartOffsetSec); } catch { /* ignore */ } }
    } catch (e) {
      toast.error('Could not finalize recording', { description: e instanceof Error ? e.message : String(e) });
    }
  };

  // ── Punch in/out orchestration (web engine) ───────────────────────
  //
  // Arm: open the mic up front (getUserMedia costs hundreds of ms and
  // must not eat into the punch moment), start playback at
  // punch-in − pre-roll, then let the position watcher below drop the
  // recorder in and out as the playhead crosses the range edges.
  const punchRef = useRef<{ recorder: MicRecorder; phase: 'pre' | 'rec' | 'post' } | null>(null);
  const prevPosRef = useRef(0);

  const cancelPunch = () => {
    const p = punchRef.current;
    punchRef.current = null;
    if (p && p.phase === 'pre') { try { p.recorder.dispose(); } catch { /* ignore */ } }
    // Cancelling must leave no trace — discard any captured MIDI rather
    // than committing it, or it leaks into the next take's clip.
    midiHeld.flush();
    midiCcRef.current = [];
    engineState.setRecordingActive?.(false);
  };

  const startPunchRecord = async () => {
    if (recording || punchRef.current) return;
    midiTakeClipRef.current = null; // each take owns a fresh clip
    resetMidiCapture();
    if (engineState.native) {
      toast.info('Punch recording is available in the web Studio for now.');
      return;
    }
    if (!loopRegion || loopRegion.end <= loopRegion.start) {
      toast.error('Set a punch range first — drag across the bar ruler.');
      return;
    }
    if (armedTrackIds.length === 0) {
      toast.error('Arm at least one audio track first (red R button on the strip).');
      return;
    }
    try {
      await start();
      // Cycle and punch fight over the transport (the loop wrap would
      // yank the head mid-take) — punch wins while it runs.
      if (loopEnabled) setLoopEnabled(false);
      const inputDeviceId = localStorage.getItem('studio.inputDeviceId') || undefined;
      const inputGainDb = Number(localStorage.getItem('studio.micInputGainDb') || 0);
      const channelIndex = Number(localStorage.getItem('studio.inputChannelIndex') || 0) || 0;
      const recorder = await openMicRecorder({ inputDeviceId, inputGainDb, channelIndex, captureWav: isAppleWebEngine() });
      punchRef.current = { recorder, phase: 'pre' };
      engineState.setRecordingActive?.(true);
      const from = preRollStartSeconds(
        loopRegion.start, preRollBars,
        session.tempo_bpm, session.time_signature.numerator, session.time_signature.denominator,
      );
      prevPosRef.current = from;
      engineState.playFrom?.(from);
      toast.success(preRollBars > 0
        ? `Punch armed — rolling ${preRollBars} bar${preRollBars > 1 ? 's' : ''} of pre-roll`
        : 'Punch armed — recording starts at the punch-in point');
    } catch (e) {
      cancelPunch();
      toast.error('Could not arm punch recording', { description: e instanceof Error ? e.message : String(e) });
    }
  };

  const beginPunchTake = async (recorder: MicRecorder) => {
    if (!loopRegion) return;
    try {
      await recorder.start();
      const startedAt = performance.now();
      setRecording({
        recorder, native: false, punch: true,
        startSeconds: loopRegion.start, startWallMs: startedAt,
        // Mic opened during pre-roll; capture goes live AT the punch
        // moment, so anchor and capture coincide — alignment reduces to
        // the configured device residual.
        pressWallMs: startedAt, captureStartWallMs: startedAt, transportStartWallMs: null,
        armedTrackIds, peaks: [],
      });
      startWaveTick(recorder, startedAt);
      toast.success('Punched in — recording');
    } catch (e) {
      cancelPunch();
      toast.error('Punch-in failed', { description: e instanceof Error ? e.message : String(e) });
    }
  };

  // Position watcher — fires the punch transitions off the engine's
  // ~30Hz tick stream. Latest-ref pattern (like followPlayheadRef): the
  // body must close over the CURRENT loopRegion/stopRecording/etc., but
  // the tick subscription mounts once.
  const punchWatchRef = useRef<() => void>(() => {});
  punchWatchRef.current = () => {
    const cur = transportTick.get().positionSeconds;
    const prev = prevPosRef.current;
    prevPosRef.current = cur;
    const p = punchRef.current;
    if (!p || !loopRegion) return;
    const range = { inSeconds: loopRegion.start, outSeconds: loopRegion.end };
    if (p.phase === 'pre') {
      if (punchTransition(prev, cur, range) === 'in') {
        p.phase = 'rec';
        void beginPunchTake(p.recorder);
      }
    } else if (p.phase === 'rec') {
      if (punchTransition(prev, cur, range) === 'out') {
        p.phase = 'post';
        void stopRecording();
        if (postRollBars === 0) {
          // No post-roll — take is done, transport keeps rolling.
          punchRef.current = null;
        }
      }
    } else if (p.phase === 'post') {
      const end = postRollEndSeconds(
        loopRegion.end, postRollBars,
        session.tempo_bpm, session.time_signature.numerator, session.time_signature.denominator,
      );
      if (cur >= end) {
        punchRef.current = null;
        stop();
      }
    }
  };
  useEffect(() => transportTick.subscribe(() => punchWatchRef.current()), [transportTick]);

  /** One handler for every Stop surface (button, S, Space) so a punch
   * pass in any phase is cleaned up alongside the recording itself. */
  const onStopPressed = () => {
    if (punchRef.current) {
      if (punchRef.current.phase === 'pre') cancelPunch();
      else punchRef.current = null;
    }
    if (recording) stopRecording();
    stop();
  };

  /** Record control: punch mode arms the auto punch pass; otherwise
   * the classic manual take. A second press always stops the take. */
  const onRecordPressed = () => {
    if (recording) { stopRecording(); return; }
    if (punchRef.current) { cancelPunch(); stop(); return; }
    if (punchEnabled) void startPunchRecord();
    else void startRecording();
  };

  const isRecording = recording !== null;

  // Publish session + asset-append into a module-level handle so deeply
  // nested dialogs (import/record/piano roll) can read/write without
  // five layers of prop drilling.
  useEditorScope(session, update);

  const addAudioTrack = () => {
    pushHistory(session);
    update((s) => ({ ...s, tracks: [...s.tracks, newAudioTrack(`Audio ${s.tracks.length + 1}`)] }));
  };
  const addMidiTrack = () => {
    pushHistory(session);
    update((s) => ({ ...s, tracks: [...s.tracks, newMidiTrack(`MIDI ${s.tracks.length + 1}`)] }));
  };
  const removeTrack = (id: string) => {
    pushHistory(session);
    update((s) => ({ ...s, tracks: s.tracks.filter((t) => t.id !== id) }));
  };

  // Keyboard shortcuts. Placed here so all referenced handlers
  // (startRecording, stopRecording, undo, …) are already initialized
  // by the time the dep array is evaluated. Putting this hook above
  // those `const`s triggered "Cannot access 'k' before initialization"
  // at render time.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const inField = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable;
      if (inField) return;
      const hasMod = e.metaKey || e.ctrlKey;
      if (e.code === 'Space' && !hasMod) {
        e.preventDefault();
        // Spacebar = global play / stop toggle, mirroring the
        // transport bar. If a take (or punch pass) is in flight,
        // finalize it so one keystroke ends recording AND playback.
        if (recording || punchRef.current || state?.isPlaying) {
          onStopPressed();
        } else {
          (async () => {
            try {
              await start();
              // Don't seek to the loop start here — writing transport
              // position before play() while looping freezes Tone's
              // transport. play() now snaps to loopStart itself using an
              // atomic start(offset).
              await play();
            } catch (e) {
              toast.error('Could not start playback', {
                description: e instanceof Error ? e.message : String(e),
              });
            }
          })();
        }
      } else if (e.key === 's' && !hasMod) {
        e.preventDefault();
        onStopPressed();
      } else if (hasMod && (e.key === 's' || e.key === 'S')) {
        e.preventDefault(); update((s) => ({ ...s, updated_at: new Date().toISOString() }));
      } else if (hasMod && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        undo();
      } else if (hasMod && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        zoomBy(1.4);
      } else if (hasMod && (e.key === '-' || e.key === '_')) {
        e.preventDefault();
        zoomBy(1 / 1.4);
      } else if (hasMod && e.key === '0') {
        e.preventDefault();
        setPxPerSecond(PX_PER_SECOND_DEFAULT);
      } else if ((e.key === 'm' || e.key === 'M') && !hasMod) {
        setMetronome(!state?.metronomeOn);
      } else if ((e.key === 'r' || e.key === 'R') && !hasMod) {
        // Bare R toggles recording. With a modifier (⌘R / Ctrl+R) we
        // let the browser refresh — never start a recording on refresh.
        e.preventDefault();
        onRecordPressed();
      } else if ((e.key === 'k' || e.key === 'K') && !hasMod) {
        // Drop a marker at the playhead.
        e.preventDefault();
        addMarkerAtPlayhead();
      } else if (e.key === ',' && !hasMod) {
        e.preventDefault();
        jumpPrevMarker();
      } else if (e.key === '.' && !hasMod) {
        e.preventDefault();
        jumpNextMarker();
      } else if (e.key === 'ArrowLeft' && !hasMod) {
        // Free-scrub by 0.25s per key press. Shift+arrow jumps a full bar
        // for those who want the old behavior.
        e.preventDefault();
        const step = e.shiftKey ? (60 / session.tempo_bpm) * session.time_signature.numerator : 0.25;
        engineState.seek?.(Math.max(0, posNow() - step));
      } else if (e.key === 'ArrowRight' && !hasMod) {
        e.preventDefault();
        const step = e.shiftKey ? (60 / session.tempo_bpm) * session.time_signature.numerator : 0.25;
        engineState.seek?.(Math.min(session.length_seconds, posNow() + step));
      } else if (e.key === 'Home' && !hasMod) {
        e.preventDefault();
        engineState.seek?.(0);
      } else if (e.key === 'End' && !hasMod) {
        e.preventDefault();
        engineState.seek?.(session.length_seconds);
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && !hasMod && selectedClip) {
        e.preventDefault();
        deleteSelectedClip();
      } else if ((e.key === 'b' || e.key === 'B') && !hasMod && selectedClip) {
        // Logic-style split — same path as the selection action bar.
        e.preventDefault();
        splitSelectedClipAtPlayhead();
      } else if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight') && selectedClip) {
        // Alt+arrow nudges the selected clip ±50ms (or ±10ms with Shift),
        // perfect for slipping a take into the pocket after the fact.
        e.preventDefault();
        const step = e.shiftKey ? 0.01 : 0.05;
        const delta = e.key === 'ArrowLeft' ? -step : +step;
        update((s) => ({
          ...s,
          tracks: s.tracks.map((t) => t.id !== selectedClip.trackId ? t : {
            ...t,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            clips: (t as any).clips.map((c: { id: string; start_seconds: number }) =>
              c.id !== selectedClip.clipId ? c : { ...c, start_seconds: Math.max(0, c.start_seconds + delta) },
            ),
          } as Track),
        }));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, start, play, pause, stop, setMetronome, update, recording, selectedClip, session, session.tempo_bpm, session.time_signature.numerator, session.length_seconds, loopEnabled, loopRegion?.start, loopRegion?.end, punchEnabled, markers]);

  // Timeline extent — the grid must NEVER stop before the content does.
  // Clips (and an in-flight recording) can run past session.length_seconds
  // ("End"): the length only auto-extends when a recording FINALIZES, so
  // during a take — and for any clip dragged/trimmed past End — lanes
  // sized by length_seconds alone left content floating in gridless
  // space. Extend to the furthest clip end, keep a few bars of runway
  // ahead of the live playhead while recording, and round up to a whole
  // bar so the last measure is always bookended.
  // While recording, the grid extends ahead of the playhead — but the
  // editor no longer re-renders per position tick, so track the take's
  // leading edge in state, advanced at most once per bar (one cheap
  // re-render per bar instead of thirty per second).
  const [recordingHeadSec, setRecordingHeadSec] = useState(0);
  useEffect(() => {
    if (!recording) { setRecordingHeadSec(0); return; }
    const secondsPerBar = (60 / session.tempo_bpm) * session.time_signature.numerator;
    setRecordingHeadSec(transportTick.get().positionSeconds);
    return transportTick.subscribe(() => {
      const sec = transportTick.get().positionSeconds;
      setRecordingHeadSec((prev) => (sec - prev >= secondsPerBar || sec < prev ? sec : prev));
    });
  }, [recording, transportTick, session.tempo_bpm, session.time_signature.numerator]);

  const timelineEndSeconds = (() => {
    const secondsPerBar = (60 / session.tempo_bpm) * session.time_signature.numerator;
    let end = session.length_seconds;
    for (const t of session.tracks) {
      if (!isAudioTrack(t) && !isMidiTrack(t)) continue;
      for (const c of t.clips) end = Math.max(end, c.start_seconds + c.duration_seconds);
    }
    if (recording) end = Math.max(end, recordingHeadSec + secondsPerBar * 4);
    return Math.ceil(end / secondsPerBar - 1e-6) * secondsPerBar;
  })();

  return (
    <ZoomContext.Provider value={pxPerSecond}>
    <TrackHeightContext.Provider value={trackHeight}>
    <GridLevelContext.Provider value={gridLevel}>
    <ScrollSyncContext.Provider value={scrollSync}>
    {/* Editor surface forces dark theme inside the otherwise light
     * app — every shadcn / Tailwind token (bg-card, text-foreground,
     * border-border, etc.) resolves to its dark-mode value, giving the
     * Studio the high-contrast DAW look (Logic / ProTools / Ableton)
     * without leaking dark surfaces anywhere else in the app. */}
    <div className="dark bg-background text-foreground min-h-[calc(100vh-5rem)] -mt-2 overflow-x-hidden">
    <div className="px-2 sm:px-3 py-2 sm:py-3 max-w-[1400px] mx-auto space-y-1.5 sm:space-y-2">
      {/* Top bar — wraps to a second line when the action buttons run
       *  out of horizontal room (was overflowing behind the surface's
       *  overflow-x-hidden, clipping "Export" to "Expo…" on iPad). Right
       *  cluster stays anchored via `ml-auto`; on phones the buttons
       *  collapse to icon-only so they never crowd the title input. */}
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-sm">
        <Link to="/studio" className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 shrink-0">
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Sessions</span>
        </Link>
        <Input
          value={session.title}
          onChange={(e) => update((s) => ({ ...s, title: e.target.value }))}
          className="text-sm font-semibold bg-transparent border-0 px-2 h-6 focus-visible:ring-1 flex-1 min-w-[8rem] max-w-xs"
        />
        <div className="ml-auto flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
          {/* Music Tools — left slide-out with metronome, pitch pipe,
              tuner, and the instrument-voice player, so a director can
              grab a reference pitch or set a tempo without leaving the
              session. Reuses the same components as the Viewer + Music
              Tools page. */}
          <Sheet open={toolsOpen} onOpenChange={setToolsOpen}>
            <SheetTrigger asChild>
              <Button size="sm" variant="outline" title="Music tools — metronome, pitch pipe, tuner, instruments" className="h-7 text-sm px-2 sm:px-3">
                <Wrench className="w-4 h-4 sm:mr-1" />
                <span className="hidden sm:inline">Tools</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="dark bg-card text-foreground border-border w-[320px] sm:w-[360px] overflow-y-auto">
              <SheetHeader className="mb-3">
                <SheetTitle className="text-base inline-flex items-center gap-2">
                  <Wrench className="w-4 h-4" /> Music Tools
                </SheetTitle>
              </SheetHeader>
              <div className="space-y-3 pb-6">
                <Metronome />
                <PitchPipe />
                <Tuner />
                <InstrumentPlayer />
              </div>
            </SheetContent>
          </Sheet>
          <AudioSettingsButton
            midiSync={engineState.native ? undefined : {
              enabled: midiSyncEnabled, setEnabled: setMidiSyncEnabled,
              outputId: midiSyncOutputId, setOutputId: setMidiSyncOutputId,
            }}
            midiInput={{
              enabled: midiInputEnabled, setEnabled: setMidiInputEnabled,
              deviceId: midiInputDeviceId, setDeviceId: setMidiInputDeviceId,
              inputs: midiIn.inputs, status: midiIn.status, supported: midiIn.supported,
              targetTrackName: midiInputTrack?.name,
            }}
          />
          <Button
            size="sm"
            variant={view === 'mix' ? 'default' : 'outline'}
            onClick={() => setView(view === 'mix' ? 'tracks' : 'mix')}
            title="Switch between the timeline and the mixer"
            className="h-7 text-sm px-2 sm:px-3"
          >
            <SlidersHorizontal className="w-4 h-4 sm:mr-1" />
            <span className="hidden sm:inline">Mix</span>
          </Button>
          <Button size="sm" variant="outline" onClick={() => setExportOpen(true)} title="Export MP3 320 / WAV / stems" className="h-7 text-sm px-2 sm:px-3">
            <Download className="w-4 h-4 sm:mr-1" />
            <span className="hidden sm:inline">Export</span>
          </Button>
          {/* Region export — enabled only when a loop region is set (drag
              across the bar ruler). Bounces the selected tracks over just
              that range as a stereo mix or mono stems. */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setRegionExportOpen(true)}
            disabled={!loopRegion || loopRegion.end <= loopRegion.start}
            title={loopRegion ? 'Export the selected region (tracks → stereo mix or mono stems)' : 'Drag across the bar ruler to select a region first'}
            className="h-7 text-sm px-2 sm:px-3"
          >
            <Scissors className="w-4 h-4 sm:mr-1" />
            <span className="hidden sm:inline">Region</span>
          </Button>
          {session.scoreId ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => update((s) => ({ ...s, scoreId: null }))}
              title="Remove attached score"
              className="h-7 text-sm px-2 sm:px-3"
            >
              <BookX className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">Remove score</span>
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setAttachScoreOpen(true)}
              title="Attach a score from the music library"
              className="h-7 text-sm px-2 sm:px-3"
            >
              <BookOpen className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">Attach score</span>
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => exportSessionJson(session)} title="Download session JSON" className="h-7 w-7 p-0">
            <FileJson className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <ExportSheet session={session} open={exportOpen} onOpenChange={setExportOpen} engineState={engineState} />
      <RegionExportSheet session={session} region={loopRegion} open={regionExportOpen} onOpenChange={setRegionExportOpen} />
      {/* Score attach dialog — music library search, picks a scoreId. */}
      <AttachScoreDialog
        open={attachScoreOpen}
        onOpenChange={setAttachScoreOpen}
        onAttach={(id) => update((s) => ({ ...s, scoreId: id }))}
      />
      {/* Floating PDF score panel — mounts whenever a scoreId is set. */}
      {session.scoreId && (
        <StudioScorePanel
          scoreId={session.scoreId}
          onClose={() => update((s) => ({ ...s, scoreId: null }))}
        />
      )}
      {/* Clip MP3 export prompt — name + destination before rendering.
       * `dark` classes forced: DialogContent portals to document.body,
       * outside the Studio's .dark scope (same trap as the old EQ sheet). */}
      <Dialog open={!!clipExportPrompt} onOpenChange={(o) => { if (!o) setClipExportPrompt(null); }}>
        <DialogContent className="dark bg-card text-foreground border-border max-w-sm">
          <DialogHeader><DialogTitle>Export clip as MP3</DialogTitle></DialogHeader>
          {clipExportPrompt && (
            <div className="space-y-3 text-sm">
              <div className="space-y-1">
                <Label className="text-xs">File name</Label>
                <div className="flex items-center gap-1.5">
                  <Input
                    value={clipExportPrompt.name}
                    onChange={(e) => setClipExportPrompt({ ...clipExportPrompt, name: e.target.value })}
                    onKeyDown={(e) => e.stopPropagation()}
                    autoFocus
                  />
                  <span className="text-xs text-muted-foreground shrink-0">.mp3</span>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Destination</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(['download', 'library'] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setClipExportPrompt({ ...clipExportPrompt, dest: d })}
                      className={`h-9 rounded border text-sm font-semibold ${clipExportPrompt.dest === d
                        ? 'bg-primary border-primary text-primary-foreground'
                        : 'bg-muted border-border text-muted-foreground hover:bg-muted/70'}`}
                    >
                      {d === 'download' ? 'Download' : 'Media Library'}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {clipExportPrompt.dest === 'library'
                    ? 'Saves into your Media Library → Studio folder.'
                    : 'Downloads the MP3 to this device.'}
                </p>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" onClick={() => setClipExportPrompt(null)}>Cancel</Button>
                <Button
                  disabled={!clipExportPrompt.name.trim() || exportingClip}
                  onClick={() => {
                    const { name, dest } = clipExportPrompt;
                    setClipExportPrompt(null);
                    void exportSelectedClipMp3(name, dest);
                  }}
                >
                  Export
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Transport bar — three-cell grid keeps the LCD dead-center at every
       *  breakpoint. Row 1: primary transport | LCD | secondary actions.
       *  Row 2 (md+): tempo, punch, snap, grid, end chips. Row 3: engine
       *  status. On phones the chip row lives inside the settings sheet. */}
      <div className="bg-card border border-border rounded-md p-1.5 sm:p-2 space-y-1.5">
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1.5 sm:gap-3">

        {/* LEFT — transport controls. Play/Pause/Stop/Rec/Metro are
         *  visible on every breakpoint; nav (skip start/end + scrub) and
         *  markers appear on wider screens where there's room. */}
        <div className="flex items-center gap-0.5 sm:gap-1 min-w-0">
        <button
          onClick={() => engineState.seek?.(0)}
          className="hidden sm:flex h-8 w-8 sm:h-9 sm:w-9 rounded bg-muted border border-border hover:bg-muted/70 items-center justify-center"
          title="Go to beginning (Home)">
          <SkipBack className="w-4 h-4" />
        </button>
        <ScrubButton
          className="hidden sm:flex"
          direction={-1}
          getPosition={posNow}
          max={session.length_seconds}
          onSeek={(s) => engineState.seek?.(s)}
          icon={<Rewind className="w-4 h-4" />}
          title="Rewind — click to nudge, hold to scrub"
        />
        <ScrubButton
          className="hidden sm:flex"
          direction={+1}
          getPosition={posNow}
          max={session.length_seconds}
          onSeek={(s) => engineState.seek?.(s)}
          icon={<FastForward className="w-4 h-4" />}
          title="Forward — click to nudge, hold to scrub"
        />
        <button
          onClick={() => engineState.seek?.(session.length_seconds)}
          className="hidden md:flex h-8 w-8 sm:h-9 sm:w-9 rounded bg-muted border border-border hover:bg-muted/70 items-center justify-center"
          title="Skip to end">
          <SkipForward className="w-4 h-4" />
        </button>

        <div className="hidden sm:block w-px h-7 bg-border mx-0.5" />

        {/* Primary transport — always visible */}
        <button onClick={async () => {
            try {
              await start();
              // When a loop region is armed, play() snaps to the region's
              // left edge itself (atomic start-with-offset). We must NOT
              // seek here first — writing transport position before
              // starting while looping freezes Tone's transport clock.
              await play();
            } catch (e) {
              toast.error('Could not start playback', {
                description: e instanceof Error ? e.message : String(e),
              });
            }
          }} disabled={state?.isPlaying}
          className={`h-8 w-8 sm:h-9 sm:w-9 rounded flex items-center justify-center transition border ${state?.isPlaying ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-muted border-border hover:bg-muted/70'} disabled:opacity-50`}
          title="Play (Space)">
          <Play className="w-4 h-4" />
        </button>
        <button onClick={pause} disabled={!state?.isPlaying}
          className="h-8 w-8 sm:h-9 sm:w-9 rounded bg-muted border border-border hover:bg-muted/70 disabled:opacity-50 flex items-center justify-center"
          title="Pause (Space)">
          <Pause className="w-4 h-4" />
        </button>
        <button
          onClick={onStopPressed}
          className="h-8 w-8 sm:h-9 sm:w-9 rounded bg-muted border border-border hover:bg-muted/70 flex items-center justify-center"
          title="Stop (S) — also finalizes any active recording">
          <Square className="w-4 h-4" />
        </button>
        <button onClick={onRecordPressed}
          className={`h-8 w-8 sm:h-9 sm:w-9 rounded flex items-center justify-center transition border ${isRecording ? 'bg-rose-500 border-rose-500 text-white animate-pulse' : 'bg-muted border-border hover:bg-rose-100 hover:border-rose-300'}`}
          title={punchEnabled ? 'Record (R) — punch mode: rolls pre-roll, then drops in/out at the punch range' : 'Record (R)'}>
          <Circle className={`w-3.5 h-3.5 ${isRecording ? 'fill-white text-white' : 'fill-rose-500 text-rose-500'}`} />
        </button>
        <button onClick={() => {
            // Do NOT await start() here — the native engine only needs
            // to be running for playback, and setMetronome now just
            // flips the flag on the native side. Awaiting start() has
            // been observed to reject on some device audio session
            // states, which then silently swallows the setMetronome
            // call and leaves the button stuck grey. Kick start() in
            // the background so the engine is warm when the user hits
            // Play, but never gate the toggle on it.
            void Promise.resolve(start?.()).catch(() => { /* engine will retry on play */ });
            setMetronome(!state?.metronomeOn);
          }}
          className={`h-8 w-8 sm:h-9 sm:w-9 rounded flex items-center justify-center border ${state?.metronomeOn ? 'bg-amber-400 border-amber-400 text-amber-950' : 'bg-muted border-border hover:bg-muted/70'}`}
          title="Metronome (M)">
          <Timer className="w-4 h-4" />
        </button>
        <button
          onClick={() => {
            // Always toggle off first if the loop is currently on —
            // otherwise a selected clip would force it to re-enable
            // every time the user pressed the button.
            if (loopEnabled) {
              setLoopEnabled(false);
              return;
            }
            // If a clip is selected and the loop isn't already on,
            // snap the region to the clip and enable. Lets the user
            // audition a single take in isolation.
            if (selectedClip) {
              const t = session.tracks.find((x) => x.id === selectedClip.trackId);
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const c = t && (t as any).clips.find((cc: { id: string }) => cc.id === selectedClip.clipId);
              if (c) {
                setLoopRegion({ start: c.start_seconds, end: c.start_seconds + c.duration_seconds });
                setLoopEnabled(true);
                return;
              }
            }
            if (!loopRegion) {
              toast.info('Select a clip, or drag across the bar ruler to set a region.');
              return;
            }
            setLoopEnabled(true);
          }}
          className={`h-8 w-8 sm:h-9 sm:w-9 rounded flex items-center justify-center border ${loopEnabled ? 'bg-sky-500 border-sky-500 text-white' : 'bg-muted border-border hover:bg-muted/70'}`}
          title={
            selectedClip
              ? 'Loop the selected clip — toggle on/off'
              : loopRegion
                ? `Loop region ${loopRegion.start.toFixed(2)}s – ${loopRegion.end.toFixed(2)}s`
                : 'Loop — select a clip or drag on the ruler to set a region'
          }
        >
          <Repeat className="w-4 h-4" />
        </button>

        {/* Markers — drop a flag at the playhead, hop between flags.
         *  Flag on sm+, prev/next on md+ (they only help once markers exist). */}
        <button
          onClick={addMarkerAtPlayhead}
          className="hidden sm:flex h-8 w-8 sm:h-9 sm:w-9 rounded bg-muted border border-border hover:bg-muted/70 items-center justify-center"
          title="Add marker at playhead (K)">
          <Flag className="w-4 h-4 text-amber-500" />
        </button>
        <button
          onClick={jumpPrevMarker}
          disabled={markers.length === 0}
          className="hidden md:flex h-8 w-8 sm:h-9 sm:w-9 rounded bg-muted border border-border hover:bg-muted/70 disabled:opacity-50 items-center justify-center"
          title="Previous marker (,)">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={jumpNextMarker}
          disabled={markers.length === 0}
          className="hidden md:flex h-8 w-8 sm:h-9 sm:w-9 rounded bg-muted border border-border hover:bg-muted/70 disabled:opacity-50 items-center justify-center"
          title="Next marker (.)">
          <ChevronRight className="w-4 h-4" />
        </button>
        </div>

        {/* CENTER — LCD timecode. Anchored to the middle grid cell so it
         *  reads dead-center at every breakpoint regardless of how many
         *  buttons occupy the left cell. Position/length text stacks below
         *  on phones and sits beside the counter on md+ where there's room. */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-0.5 md:gap-3 shrink-0">
          <TransportCounter
            store={transportTick}
            counterMode={counterMode}
            onCycleMode={() => setCounterMode(nextCounterMode(counterMode))}
            tempoBpm={session.tempo_bpm}
            numerator={session.time_signature.numerator}
            sampleRate={state?.sampleRate ?? 48000}
            lengthSeconds={session.length_seconds}
          />
        </div>

        {/* RIGHT — secondary actions. Count-in is a first-class pill here
         *  (used before every take, so pushing it into a sheet slowed
         *  mobile users down). Undo has no keyboard shortcut on iPad, so
         *  a persistent button is the only way to reach it there. The
         *  More button opens the settings sheet with tempo/TS/snap/grid/
         *  end/punch — the same controls that live in Row 2's chip row on
         *  desktop, so nothing is ever exclusively phone- or desktop-only. */}
        <div className="flex items-center gap-1 sm:gap-1.5 justify-end min-w-0">
          <button
            onClick={() => setCountInBars((b) => (b === 0 ? 1 : b === 1 ? 2 : 0) as 0 | 1 | 2)}
            className={`h-8 sm:h-9 px-2 sm:px-3 rounded border text-xs sm:text-sm font-bold whitespace-nowrap ${countInBars > 0 ? 'bg-sky-500 border-sky-500 text-white' : 'bg-muted border-border text-muted-foreground hover:bg-muted/70'}`}
            title={countInBars === 0 ? 'Count-in OFF — tap to cycle 1 bar → 2 bars → off' : `Count-in: ${countInBars} bar${countInBars > 1 ? 's' : ''}`}>
            <span className="hidden md:inline">Count-in </span>{countInBars === 0 ? 'Off' : `${countInBars}`}
          </button>
          {countInBeat !== null && (
            <span className="text-xs sm:text-sm font-bold px-2 py-0.5 rounded bg-rose-500 text-white tabular-nums animate-pulse">
              {countInBeat}
            </span>
          )}
          <button
            onClick={undo}
            className="h-8 sm:h-9 w-8 sm:w-auto sm:px-3 rounded border border-border bg-muted hover:bg-muted/70 inline-flex items-center justify-center gap-1.5"
            aria-label="Undo" title="Undo (⌘Z)">
            <Undo2 className="w-4 h-4" />
            <span className="hidden lg:inline text-sm font-semibold">Undo</span>
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            className="h-8 sm:h-9 w-8 sm:w-auto sm:px-3 rounded border border-border bg-muted hover:bg-muted/70 inline-flex items-center justify-center gap-1.5"
            aria-label="Session settings" title="Session — tempo, time signature, snap, grid, punch, end">
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden lg:inline text-sm font-semibold">More</span>
          </button>
          <div className="hidden lg:block ml-1">
            <LiveVuMeter store={transportTick} />
          </div>
        </div>
        </div>

        {/* Row 2 — desktop chip row (md+). Tempo + Tap + TS, Punch,
         *  Snap/Grid/End. On phones these live inside the settings sheet
         *  (accessible from the More button) — this row disappears
         *  entirely so the transport can fit in one clean line. */}
        <div className="hidden md:flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-1.5 border-t border-border/60 text-sm">
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">BPM</span>
            <input type="number" min={20} max={300} value={session.tempo_bpm}
              onChange={(e) => {
                const bpm = Number(e.target.value) || 120;
                update((s) => ({ ...s, tempo_bpm: bpm }));
                updateTempo(bpm);
              }}
              className="w-14 h-7 bg-background border border-border rounded text-center" />
            <button
              type="button"
              onClick={() => {
                const now = performance.now();
                const taps = tapTempoTimesRef.current;
                taps.push(now);
                while (taps.length > 5 && taps[0] < now - 3000) taps.shift();
                if (taps.length < 2) return;
                const intervals: number[] = [];
                for (let i = 1; i < taps.length; i++) intervals.push(taps[i] - taps[i - 1]);
                const avgMs = intervals.reduce((s, n) => s + n, 0) / intervals.length;
                const detected = Math.round(60000 / avgMs);
                if (detected >= 30 && detected <= 300) {
                  update((s) => ({ ...s, tempo_bpm: detected }));
                  updateTempo(detected);
                }
              }}
              className="h-7 px-2 rounded border border-border bg-muted text-xs font-semibold hover:bg-muted/70"
              title="Tap Tempo — tap along with a beat 2+ times to detect the BPM">
              Tap
            </button>
            <CompactTimeSignaturePicker
              numerator={session.time_signature.numerator}
              denominator={session.time_signature.denominator}
              onChange={(n, d) => {
                update((s) => ({ ...s, time_signature: { numerator: n, denominator: d } }));
                updateTimeSignature(n, d);
              }}
            />
          </div>

          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">Punch</span>
            <button
              onClick={() => {
                if (!punchEnabled && !loopRegion) {
                  toast.info('Drag across the bar ruler to set the punch range first.');
                  return;
                }
                setPunchEnabled((v) => !v);
              }}
              className={`h-7 px-2 rounded border text-sm font-bold ${punchEnabled ? 'bg-rose-500 border-rose-500 text-white' : 'bg-muted border-border text-muted-foreground hover:bg-muted/70'}`}
              title={punchEnabled ? 'Punch is ON — Record rolls the pre-roll, drops in at the range start and out at the end' : 'Punch — auto drop in/out over the marked ruler range'}>
              {punchEnabled ? 'On' : 'Off'}
            </button>
            {punchEnabled && (
              <>
                <select value={preRollBars} onChange={(e) => setPreRollBars(Number(e.target.value))}
                  className="h-7 bg-background border border-border rounded text-sm px-1"
                  title="Pre-roll — bars of playback before the punch-in point">
                  <option value={0}>Pre 0</option>
                  <option value={1}>Pre 1</option>
                  <option value={2}>Pre 2</option>
                  <option value={4}>Pre 4</option>
                </select>
                <select value={postRollBars} onChange={(e) => setPostRollBars(Number(e.target.value))}
                  className="h-7 bg-background border border-border rounded text-sm px-1"
                  title="Post-roll — bars of playback after the punch-out point">
                  <option value={0}>Post 0</option>
                  <option value={1}>Post 1</option>
                  <option value={2}>Post 2</option>
                </select>
              </>
            )}
          </div>

          {/* Timeline zoom — moved up here from the add-track row so it
              sits next to Punch, right in the transport's control cluster.
              Slider is log-scaled (px range 8→240 spans ~5 octaves, so
              linear travel would bunch the useful zoom levels into the
              rightmost sliver); double-click resets to the default. No px
              readout on purpose — the slider position IS the affordance. */}
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Zoom</span>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={Math.round(100 * Math.log(pxPerSecond / PX_PER_SECOND_MIN) / Math.log(PX_PER_SECOND_MAX / PX_PER_SECOND_MIN))}
              onChange={(e) => {
                const pos = Number(e.target.value) / 100;
                const px = PX_PER_SECOND_MIN * Math.pow(PX_PER_SECOND_MAX / PX_PER_SECOND_MIN, pos);
                setPxPerSecond(px);
              }}
              onDoubleClick={() => setPxPerSecond(PX_PER_SECOND_DEFAULT)}
              className="w-28 h-6 accent-primary cursor-pointer"
              aria-label="Timeline zoom"
              title="Timeline zoom — drag to widen or narrow clips. Double-click to reset."
            />
          </div>

          <div className="flex items-center gap-1 ml-auto">
            <span className="text-muted-foreground" title={`Snap quantum at current tempo: ${snapSeconds > 0 ? `${(snapSeconds * 1000).toFixed(0)} ms` : 'off'}`}>Snap</span>
            <select value={snapMode} onChange={(e) => setSnapMode(e.target.value as SnapMode)}
              className="h-7 bg-background border border-border rounded text-sm px-1 min-w-[68px]"
              title="Musical snap — quantum is derived from tempo + time signature">
              <option value="free">Free</option>
              <option value="bar">Bar</option>
              <option value="1/2">1/2 note</option>
              <option value="1/4">1/4 note</option>
              <option value="1/8">1/8 note</option>
              <option value="1/16">1/16</option>
              <option value="1/32">1/32</option>
            </select>
            <span className="text-muted-foreground ml-1" title="Visual grid subdivision — independent of snap">Grid</span>
            <select value={gridLevel} onChange={(e) => setGridLevel(e.target.value as GridLevel)}
              className="h-7 bg-background border border-border rounded text-sm px-1 min-w-[80px]"
              title="Finest subdivision rendered as grid lines">
              <option value="auto">Auto</option>
              <option value="off">Bars only</option>
              <option value="1/2">1/2 note</option>
              <option value="beat">1/4 note</option>
              <option value="1/8">1/8 note</option>
              <option value="1/16">1/16</option>
              <option value="1/32">1/32</option>
            </select>
            <span className="text-muted-foreground ml-1" title="Project length in seconds — sets where the timeline ends">End</span>
            <input type="number" min={4} max={3600} value={session.length_seconds}
              onChange={(e) => update((s) => ({ ...s, length_seconds: Number(e.target.value) || 60 }))}
              title="Project length in seconds"
              className="w-14 h-7 bg-background border border-border rounded text-center" />
            <span className="text-muted-foreground text-xs">s</span>
          </div>
        </div>

        {/* Native engine status + error panel (full-width so it never
         *  crowds the transport row). */}
        <div className="w-full"><StudioEngineStatus /></div>
      </div>

      {/* Session settings sheet — hoisted so it's independent of the
       *  transport grid's layout. Same sheet on every breakpoint (opened
       *  from the More button in Row 1 right cell); on phones this is the
       *  primary access point for tempo/snap/grid/end/punch. */}
      <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
        <SheetContent side="bottom" className="dark bg-card text-foreground border-border">
            <SheetHeader className="mb-3">
              <SheetTitle className="text-base">Session</SheetTitle>
            </SheetHeader>
            <div className="space-y-4 text-sm pb-4">
              {/* Count-in */}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Count-in</span>
                <button
                  onClick={() => setCountInBars((b) => (b === 0 ? 1 : b === 1 ? 2 : 0) as 0 | 1 | 2)}
                  className={`h-10 px-4 rounded border text-sm font-bold ${countInBars > 0 ? 'bg-sky-500 border-sky-500 text-white' : 'bg-muted border-border text-muted-foreground'}`}>
                  {countInBars === 0 ? 'Off' : `${countInBars} bar${countInBars > 1 ? 's' : ''}`}
                </button>
              </div>
              {/* BPM — slider for touch, number input kept for precision. */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">BPM</span>
                  <input type="number" min={20} max={300} value={tempoDraft ?? session.tempo_bpm}
                    onChange={(e) => {
                      const bpm = Number(e.target.value) || 120;
                      update((s) => ({ ...s, tempo_bpm: bpm }));
                      updateTempo(bpm);
                    }}
                    className="w-20 h-10 bg-background border border-border rounded text-center" />
                </div>
                <input
                  type="range" min={40} max={240} step={1}
                  value={tempoDraft ?? Math.min(240, Math.max(40, session.tempo_bpm))}
                  onChange={(e) => {
                    const bpm = Number(e.target.value);
                    setTempoDraft(bpm);
                    updateTempo(bpm);
                  }}
                  onPointerUp={commitTempoDraft}
                  onTouchEnd={commitTempoDraft}
                  onBlur={commitTempoDraft}
                  className="w-full h-10 accent-sky-500"
                  aria-label="Tempo (BPM)"
                />
              </div>
              {/* Time signature */}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Time signature</span>
                <CompactTimeSignaturePicker
                  numerator={session.time_signature.numerator}
                  denominator={session.time_signature.denominator}
                  onChange={(n, d) => {
                    update((s) => ({ ...s, time_signature: { numerator: n, denominator: d } }));
                    updateTimeSignature(n, d);
                  }}
                />
              </div>
              {/* Snap */}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Snap</span>
                <select value={snapMode} onChange={(e) => setSnapMode(e.target.value as SnapMode)}
                  className="h-10 bg-background border border-border rounded px-2 min-w-[120px]">
                  <option value="free">Free</option>
                  <option value="bar">Bar</option>
                  <option value="1/2">1/2 note</option>
                  <option value="1/4">1/4 note</option>
                  <option value="1/8">1/8 note</option>
                  <option value="1/16">1/16</option>
                  <option value="1/32">1/32</option>
                </select>
              </div>
              {/* Grid */}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Grid</span>
                <select value={gridLevel} onChange={(e) => setGridLevel(e.target.value as GridLevel)}
                  className="h-10 bg-background border border-border rounded px-2 min-w-[120px]">
                  <option value="auto">Auto</option>
                  <option value="off">Bars only</option>
                  <option value="1/2">1/2 note</option>
                  <option value="beat">1/4 note</option>
                  <option value="1/8">1/8 note</option>
                  <option value="1/16">1/16</option>
                  <option value="1/32">1/32</option>
                </select>
              </div>
              {/* Punch in/out */}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Punch in/out</span>
                <button
                  onClick={() => {
                    if (!punchEnabled && !loopRegion) {
                      toast.info('Drag across the bar ruler to set the punch range first.');
                      return;
                    }
                    setPunchEnabled((v) => !v);
                  }}
                  className={`h-10 px-4 rounded border text-sm font-bold ${punchEnabled ? 'bg-rose-500 border-rose-500 text-white' : 'bg-muted border-border text-muted-foreground'}`}>
                  {punchEnabled ? 'On' : 'Off'}
                </button>
              </div>
              {/* Pre-roll / post-roll */}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Pre-roll (bars)</span>
                <select value={preRollBars} onChange={(e) => setPreRollBars(Number(e.target.value))}
                  className="h-10 bg-background border border-border rounded px-2 min-w-[80px]">
                  <option value={0}>0</option>
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={4}>4</option>
                </select>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Post-roll (bars)</span>
                <select value={postRollBars} onChange={(e) => setPostRollBars(Number(e.target.value))}
                  className="h-10 bg-background border border-border rounded px-2 min-w-[80px]">
                  <option value={0}>0</option>
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                </select>
              </div>
              {/* End time */}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">End (sec)</span>
                <input type="number" min={4} max={3600} value={session.length_seconds}
                  onChange={(e) => update((s) => ({ ...s, length_seconds: Number(e.target.value) || 60 }))}
                  className="w-20 h-10 bg-background border border-border rounded text-center" />
              </div>
              {/* Mic input — Test meter + Input gain. Lives in the desktop
                  Inspector too, but that rail is hidden on phones, so this
                  is the ONLY place to set input volume on mobile. */}
              <div className="border-t border-border pt-3">
                <MicLevelTester />
              </div>
            </div>
          </SheetContent>
        </Sheet>

      {/* Mix toggle swaps this whole block for MixerView — the header +
       * transport bar above stay mounted either way, so playback/record/
       * metronome are unaffected by which view is showing (B1 Task 6). */}
      {view === 'mix' ? (
        <MixerView session={session} update={update} engineState={engineState} state={state} onOpenExport={() => setExportOpen(true)} />
      ) : (
      <>
      {/* Logic-style main window — Inspector left | Tracks area right */}
      <div className="flex gap-2 items-start">
        {/* INSPECTOR (left rail, resizable). Hidden on phones — they
         * don't have the horizontal room and the side rail steals
         * timeline width. */}
        <div className="hidden sm:contents">
        <Inspector
          width={inspectorWidth}
          onWidthChange={(w) => setInspectorWidth(Math.max(INSPECTOR_WIDTH_MIN, Math.min(INSPECTOR_WIDTH_MAX, w)))}
          session={session}
          selectedTrackId={
            (selectedClip && session.tracks.find((t) => t.id === selectedClip.trackId)?.id) ?? null
          }
          update={update}
          onStripChange={(id, p) => engineState.updateTrackStrip?.(id, p)}
          onMasterStripChange={(p) => engineState.updateMasterStrip?.(p)}
        />
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          {/* Phone-only clip action bar. Desktop deletes via the
           * Delete/Backspace shortcut; a phone has no keyboard, so a
           * selected clip gets an explicit destructive affordance here.
           * Confirm before deleting — there is no Cmd-Z on a phone. */}
          {selectedClip && (
            <div className="flex items-center gap-1.5 bg-card/90 backdrop-blur-xl border border-border/60 rounded-full px-2 py-1.5 overflow-x-auto">
              <span className="text-sm text-muted-foreground flex-1 min-w-0 truncate pl-2">Clip selected</span>
              <button
                onClick={splitSelectedClipAtPlayhead}
                title={playheadInsideSelectedClip() ? 'Split at playhead (B)' : 'Split at clip center (move the playhead into the clip to cut there)'}
                className="h-10 px-3 rounded-full border border-border inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--tint)] hover:bg-muted disabled:opacity-40 shrink-0"
              >
                <Scissors className="w-4 h-4" /> Split
              </button>
              <button
                onClick={openClipExportPrompt}
                disabled={exportingClip}
                title="Export this clip as a 320kbps MP3"
                className="h-10 px-3 rounded-full border border-border inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--tint)] hover:bg-muted disabled:opacity-40 shrink-0"
              >
                {exportingClip ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} MP3
              </button>
              <button
                onClick={() => {
                  if (confirm("Delete this clip? This can't be undone.")) deleteSelectedClip();
                }}
                className="h-10 px-3 rounded-full border border-border text-destructive inline-flex items-center gap-1.5 text-sm font-semibold hover:bg-destructive/10 shrink-0"
              >
                <Trash2 className="w-4 h-4" /> Delete
              </button>
              <button
                onClick={() => setSelectedClip(null)}
                className="h-10 w-10 rounded-full border border-border text-muted-foreground flex items-center justify-center shrink-0"
                aria-label="Deselect clip"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          {/* Add-track row */}
          <div className="flex items-center gap-2 text-sm">
            <button onClick={addAudioTrack} className="h-7 px-2 bg-card border border-border rounded hover:bg-muted inline-flex items-center gap-1">
              <Plus className="w-4 h-4" /> Audio
            </button>
            <button onClick={addMidiTrack} className="h-7 px-2 bg-card border border-border rounded hover:bg-muted inline-flex items-center gap-1">
              <Plus className="w-4 h-4" /> MIDI
            </button>
            {/* Timeline zoom lives in the transport's Row 2 chip row now
                (next to Punch) — a single slider replaces the ±/label
                trio and reads cleaner without px measurements. Removed
                from here to keep the add-track row focused on the two
                actions it still owns (Audio, MIDI, Snap). */}
            {/* One-tap Snap on/off. On = clips snap to the grid
                subdivision; off = drag/trim freely to any position.
                Grid choice still lives in Settings → Snap; this just
                flips between that and free. */}
            <button
              onClick={toggleSnap}
              title={snapMode === 'free'
                ? 'Snap OFF — clips move freely. Tap to snap to grid.'
                : `Snap ON (${snapMode}) — clips align to the grid. Tap for free movement.`}
              aria-pressed={snapMode !== 'free'}
              className={`h-7 px-2.5 inline-flex items-center gap-1 rounded border text-xs font-semibold ${
                snapMode !== 'free'
                  ? 'bg-primary/15 text-primary border-primary/40'
                  : 'bg-background text-muted-foreground border-border'
              }`}
            >
              <Magnet className="w-3.5 h-3.5" />
              {snapMode !== 'free' ? 'Snap' : 'Free'}
            </button>
            {isRecording && (
              <div className="ml-auto text-rose-600 inline-flex items-center gap-1.5 font-semibold">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                Recording — {((performance.now() - recording.startWallMs) / 1000).toFixed(1)}s
              </div>
            )}
          </div>

      {/* Tracks — DAW-style numbered + dense */}
      {session.tracks.length === 0 ? (
        <div className="border border-dashed border-border rounded-md py-10 text-center text-xs text-muted-foreground space-y-2">
          <Music2 className="w-5 h-5 mx-auto opacity-40" />
          <p>Add an audio or MIDI track to begin.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-md overflow-hidden">
          {/* Bar/beat ruler */}
          <div className="flex border-b border-border bg-muted/30">
            <div className="shrink-0 border-r border-border" style={{ width: effectiveStripWidth }} />
            <div className="flex-1 min-w-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" ref={scrollSync.register}>
              <BarRuler
                lengthSeconds={timelineEndSeconds}
                tempoBpm={session.tempo_bpm}
                numerator={session.time_signature.numerator}
                transportTick={transportTick}
                loopRegion={loopRegion}
                loopEnabled={loopEnabled}
                onLoopRegionChange={setLoopRegion}
                onSeek={(s) => engineState.seek?.(s)}
                markers={markers}
                onMarkerJump={(s) => engineState.seek?.(s)}
                onMarkerEdit={setEditingMarkerId}
              />
            </div>
          </div>

          {/* Click track — always-visible virtual row. Mute toggles
           * the engine metronome; the slider drives setMetronomeVolume.
           * Lane shows where each click hits, accent on beat 1. */}
          <ClickTrackRow
            session={session}
            endSeconds={timelineEndSeconds}
            stripWidth={effectiveStripWidth}
            metronomeOn={state?.metronomeOn ?? false}
            metronomeVolumeDb={state?.metronomeVolumeDb ?? 0}
            onToggle={() => {
              // Same rationale as the toolbar metronome button: never
              // gate the flag toggle on start() succeeding. Warm the
              // engine in the background but always flip the flag so
              // the ON/OFF pill reflects the request even if the audio
              // graph is in a temporarily unusable state.
              void Promise.resolve(start?.()).catch(() => { /* engine will retry on play */ });
              setMetronome(!(state?.metronomeOn ?? false));
            }}
            onVolume={(db) => engineState.setMetronomeVolume?.(db)}
            onSeek={(s) => engineState.seek?.(s)}
            onHeightChange={setTrackHeightClamped}
          />
          {/* Accompaniment lane — rendered above all tracks when the session
           * has an accompaniment set. Decorative for kind='file' (the file
           * is already loaded as a normal audio track); shows a capture
           * button for streaming kinds (Apple Music / YouTube). */}
          {session.accompaniment && (
            <AccompanimentLane
              accompaniment={session.accompaniment}
              capturing={capturing}
              recordingInProgress={!!recording}
              ytIframeRef={streaming.ytIframeRef}
              onCapture={onCapture}
              onStopCapture={onStopCapture}
            />
          )}
          {session.tracks.map((t, i) => (
            <DarkTrackRow
              key={t.id}
              index={i + 1}
              session={session}
              track={t}
              transportTick={transportTick}
              snapSeconds={snapSeconds}
              endSeconds={timelineEndSeconds}
              selectedClip={selectedClip}
              recording={recording}
              stripWidth={effectiveStripWidth}
              onStripWidthChange={(w) => setStripWidth(Math.max(STRIP_WIDTH_MIN, Math.min(STRIP_WIDTH_MAX, w)))}
              onSelectClip={setSelectedClip}
              onUpdate={(mut) => update((s) => ({ ...s, tracks: s.tracks.map((x) => x.id === t.id ? mut(x) : x) }))}
              onRemove={() => removeTrack(t.id)}
              onStripChange={(p) => { updateTrackStrip(t.id, p); }}
              onSeek={(s) => engineState.seek?.(s)}
              onHeightChange={setTrackHeightClamped}
              onOpenPianoRoll={() => openPianoRollForTrack(t.id)}
            />
          ))}
          {/* Single shared horizontal scrollbar — drags here scroll the
           * ruler + every track lane via the ScrollSyncContext. Per-row
           * scrollbars are hidden so the user sees ONE coordinated bar. */}
          <div className="flex border-t border-border bg-muted/20">
            <div className="shrink-0 border-r border-border" style={{ width: effectiveStripWidth }} />
            <div
              className="flex-1 min-w-0 overflow-x-scroll"
              ref={scrollSync.register}
              title="Drag to scroll the timeline horizontally — all tracks move together"
            >
              <div style={{ width: timelineEndSeconds * pxPerSecond, height: 1 }} />
            </div>
          </div>
        </div>
      )}

      {/* SMART CONTROLS (bottom drawer — selected track's FX rack) */}
      <SmartControls
        session={session}
        selectedTrackId={
          (selectedClip && session.tracks.find((t) => t.id === selectedClip.trackId)?.id) ?? null
        }
        update={update}
      />

      {(() => {
        if (!selectedClip) return null;
        const t = session.tracks.find((x) => x.id === selectedClip.trackId);
        if (!t || !isMidiTrack(t) || !t.clips.some((c) => c.id === selectedClip.clipId)) return null;
        return (
          <PianoRollPanel
            key={selectedClip.clipId}
            session={session}
            trackId={selectedClip.trackId}
            clipId={selectedClip.clipId}
            transportTick={transportTick}
            update={update}
            pushHistory={() => pushHistory(session)}
            onSeek={(s) => engineState.seek?.(s)}
            onClose={() => setSelectedClip(null)}
          />
        );
      })()}
        </div>{/* /flex-1 right column */}
      </div>
      </>
      )}

      {selectedClip && (
        <ClipInspector
          session={session}
          selected={selectedClip}
          onClose={() => setSelectedClip(null)}
          update={update}
        />
      )}

      {/* Marker rename / delete — opened by double-clicking a ruler flag. */}
      <Dialog open={editingMarker !== null} onOpenChange={(o) => { if (!o) setEditingMarkerId(null); }}>
        <DialogContent className="dark bg-card text-foreground border-border max-w-sm">
          <DialogHeader><DialogTitle className="text-base">Edit marker</DialogTitle></DialogHeader>
          {editingMarker && (
            <div className="space-y-3 text-sm">
              <div>
                <Label className="text-xs">Name</Label>
                <Input
                  value={editingMarker.name}
                  onChange={(e) => renameMarker(editingMarker.id, e.target.value)}
                  className="h-8 text-sm"
                  autoFocus
                />
              </div>
              <div className="text-xs text-muted-foreground tabular-nums">
                At {formatBarBeat(editingMarker.seconds, session.tempo_bpm, session.time_signature.numerator)}
                {' · '}{formatTime(editingMarker.seconds)}
              </div>
              <div className="flex justify-between pt-1">
                <Button size="sm" variant="destructive" onClick={() => { deleteMarker(editingMarker.id); setEditingMarkerId(null); }}>
                  <Trash2 className="w-4 h-4 mr-1" /> Delete
                </Button>
                <Button size="sm" onClick={() => setEditingMarkerId(null)}>Done</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="hidden sm:flex text-xs text-muted-foreground items-center justify-between pt-1">
        <div>
          {state?.isPlaying ? <span className="text-emerald-600">● Playing</span> : 'Stopped'}
          {isRecording && <span className="ml-2 text-rose-600">● Recording</span>}
          {engineState.warming && <span className="ml-2 text-amber-600">Loading assets…</span>}
        </div>
        <span className="opacity-70">Space play/stop · R record · M metronome · K marker · ,/. prev/next marker · ←/→ scrub · ⌘+/⌘− zoom · B split clip · Del delete · ⌘Z undo · ⌘S save</span>
      </div>
    </div>
    </div>
    </ScrollSyncContext.Provider>
    </GridLevelContext.Provider>
    </TrackHeightContext.Provider>
    </ZoomContext.Provider>
  );
}

interface SelectedClip { trackId: string; clipId: string }

// ── FX rack ──────────────────────────────────────────────────────────

const FX_TYPES: { value: FxType; label: string }[] = [
  { value: 'gain', label: 'Gain' },
  { value: 'eq3', label: '3-band EQ' },
  { value: 'compressor', label: 'Compressor' },
  { value: 'reverb', label: 'Reverb' },
  { value: 'delay', label: 'Delay' },
  { value: 'filter', label: 'Filter' },
];

function FxRack({ track, onUpdate }: { track: Track; onUpdate: (mut: (t: Track) => Track) => void }) {
  const [open, setOpen] = useState(false);
  const [presets, setPresets] = useState<FxPreset[]>([]);
  const addFx = (type: FxType) => {
    onUpdate((t) => ({ ...t, fx: [...t.fx, newFxNode(type)] } as Track));
  };
  const removeFx = (id: string) => {
    onUpdate((t) => ({ ...t, fx: t.fx.filter((f) => f.id !== id) } as Track));
  };
  const updateFx = (id: string, patch: Partial<FxNode>) => {
    onUpdate((t) => ({ ...t, fx: t.fx.map((f) => f.id === id ? { ...f, ...patch } : f) } as Track));
  };
  const refreshPresets = () => { listFxPresets().then(setPresets).catch(() => { /* offline / no table */ }); };
  useEffect(() => { if (open) refreshPresets(); }, [open]);
  const savePreset = async () => {
    const name = window.prompt('Save FX chain as preset — name:');
    if (!name?.trim()) return;
    try { await saveFxPreset(name, track.fx); toast.success('Preset saved'); refreshPresets(); }
    catch { toast.error("Couldn't save preset"); }
  };
  const loadPreset = (p: FxPreset) => {
    // Fresh ids so a preset's effects don't collide with another track's.
    onUpdate((t) => ({ ...t, fx: p.effects.map((f) => ({ ...f, id: newId() })) } as Track));
    toast.success(`Loaded "${p.name}"`);
  };
  return (
    <div className="pt-1 border-t border-border/60">
      <button
        onClick={() => setOpen(!open)}
        className="text-xs text-muted-foreground hover:text-foreground w-full text-left"
      >
        {open ? '▾' : '▸'} FX ({track.fx.length})
      </button>
      {open && (
        <div className="space-y-1 mt-1">
          {track.fx.map((fx) => (
            <FxNodeEditor key={fx.id} fx={fx}
              onChange={(p) => updateFx(fx.id, p)}
              onRemove={() => removeFx(fx.id)}
            />
          ))}
          <div>
            <select
              className="text-xs border border-border rounded px-1 py-0.5 bg-card w-full"
              value=""
              onChange={(e) => {
                if (!e.target.value) return;
                addFx(e.target.value as FxType);
                e.target.value = '';
              }}
            >
              <option value="">+ Add FX…</option>
              {FX_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          {/* Presets: save this chain, or apply a saved one. */}
          <div className="flex items-center gap-1.5 pt-1">
            <button
              onClick={savePreset}
              disabled={track.fx.length === 0}
              className="text-xs px-2 py-0.5 rounded border border-border bg-card hover:bg-muted disabled:opacity-40"
              title="Save this FX chain as a preset"
            >
              Save preset
            </button>
            <select
              className="text-xs border border-border rounded px-1 py-0.5 bg-card flex-1 min-w-0"
              value=""
              onChange={(e) => {
                const p = presets.find((x) => x.id === e.target.value);
                if (p) loadPreset(p);
                e.target.value = '';
              }}
            >
              <option value="">Load preset…</option>
              {presets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

function FxNodeEditor({
  fx, onChange, onRemove,
}: { fx: FxNode; onChange: (p: Partial<FxNode>) => void; onRemove: () => void }) {
  const [show, setShow] = useState(false);
  const label = FX_TYPES.find((t) => t.value === fx.type)?.label ?? fx.type;
  return (
    <div className="border border-border rounded p-1 bg-muted/20">
      <div className="flex items-center gap-1">
        <button
          className={`text-xs flex-1 text-left ${fx.enabled ? 'text-foreground' : 'text-muted-foreground line-through'}`}
          onClick={() => setShow(!show)}
        >{label}</button>
        <button
          onClick={() => onChange({ enabled: !fx.enabled })}
          className={`text-sm px-1 rounded ${fx.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground'}`}
        >{fx.enabled ? 'on' : 'off'}</button>
        <button onClick={onRemove} className="text-sm px-1 text-muted-foreground hover:text-rose-600">×</button>
      </div>
      {show && (
        <div className="space-y-0.5 mt-1">
          {Object.entries(fx.params).map(([key, val]) => (
            <FxParamRow
              key={key} paramKey={key} value={val}
              onChange={(v) => onChange({ params: { ...fx.params, [key]: v } })}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FxParamRow({
  paramKey, value, onChange,
}: { paramKey: string; value: number | string | boolean; onChange: (v: number | string | boolean) => void }) {
  // For Phase 2 UI, render numeric params as a tiny slider, strings as a select,
  // booleans as a toggle. Slider ranges are heuristic by suffix.
  if (typeof value === 'number') {
    const { min, max, step } = inferRange(paramKey);
    // Commit ON RELEASE, not per drag-tick. FX params have no live engine
    // setter — applying them means a full engine rebuild (via
    // skeletonSig, which now includes FX params). Firing that per range
    // tick would rebuild the whole Tone/AVAudioEngine graph dozens of
    // times a second → dropouts/jank on iOS. Local draft tracks the
    // thumb during the drag; the committed value (which triggers the
    // one rebuild) fires on pointer/key release. Before this, FX params
    // did nothing at all (skeletonSig ignored them) — see useStudio fxSig.
    return (
      <FxNumberSlider
        paramKey={paramKey} value={value} min={min} max={max} step={step}
        onCommit={(v) => onChange(v)}
      />
    );
  }
  if (typeof value === 'boolean') {
    return (
      <div className="flex items-center gap-1 text-sm">
        <span className="w-16 text-muted-foreground">{paramKey}</span>
        <button onClick={() => onChange(!value)}
          className={`px-1 rounded ${value ? 'bg-emerald-100' : 'bg-muted'}`}
        >{String(value)}</button>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 text-sm">
      <span className="w-16 text-muted-foreground">{paramKey}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="flex-1 border border-border rounded px-1" />
    </div>
  );
}

/** Numeric FX-param slider that shows a live thumb while dragging but
 *  only COMMITS (→ engine rebuild) on release. See FxParamRow. */
function FxNumberSlider({
  paramKey, value, min, max, step, onCommit,
}: {
  paramKey: string; value: number; min: number; max: number; step: number;
  onCommit: (v: number) => void;
}) {
  const [draft, setDraft] = useState<number | null>(null);
  const shown = draft ?? value;
  const commit = () => {
    if (draft !== null) { onCommit(draft); setDraft(null); }
  };
  return (
    <div className="flex items-center gap-1 text-sm">
      <span className="w-16 text-muted-foreground">{paramKey}</span>
      <input
        type="range" min={min} max={max} step={step}
        value={shown}
        onChange={(e) => setDraft(Number(e.target.value))}
        onPointerUp={commit}
        onPointerCancel={commit}
        onKeyUp={commit}
        onBlur={commit}
        className="flex-1 h-3"
        style={{ touchAction: 'none' }}
      />
      <span className="w-10 text-right tabular-nums">{shown.toFixed(2)}</span>
    </div>
  );
}

function inferRange(key: string): { min: number; max: number; step: number } {
  if (key.endsWith('_db')) return { min: -40, max: 12, step: 0.5 };
  if (key.endsWith('_ms')) return { min: 0, max: 2000, step: 1 };
  if (key.endsWith('_hz')) return { min: 20, max: 20000, step: 1 };
  if (key === 'wet' || key === 'feedback' || key === 'room_size' || key === 'damp') return { min: 0, max: 1, step: 0.01 };
  if (key === 'ratio') return { min: 1, max: 20, step: 0.1 };
  if (key === 'q') return { min: 0.1, max: 10, step: 0.1 };
  return { min: -10, max: 10, step: 0.1 };
}

/** Compact icon-only import button rendered in the track header row.
 * Opens the existing ImportClipDialog. */
function AudioImportIconButton({
  track, onUpdate,
}: { track: Track; onUpdate: (mut: (t: Track) => Track) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Import an audio file as a clip on this track"
        className="text-muted-foreground hover:text-foreground inline-flex items-center justify-center"
      >
        <Upload className="w-4 h-4" />
      </button>
      <ImportClipDialog open={open} onOpenChange={setOpen} track={track} onUpdate={onUpdate} />
    </>
  );
}

function AudioClipBlock({
  clip, session, trackColor, snapSeconds, selected, onSelect, onChange, onRemove, onDuplicate,
}: {
  clip: AudioClip; session: Session;
  trackColor: string;
  snapSeconds: number;
  selected: boolean;
  onSelect: () => void;
  onChange: (patch: Partial<AudioClip>) => void;
  onRemove: () => void;
  onDuplicate?: () => void;
}) {
  const asset = session.assets.find((a) => a.id === clip.asset_id);
  return (
    <DraggableClip
      tint={trackColor}
      start={clip.start_seconds}
      duration={clip.duration_seconds}
      offset={clip.offset_seconds}
      label={asset?.filename ?? 'audio'}
      peaks={asset?.peaks}
      assetDuration={asset?.duration_seconds}
      snapSeconds={snapSeconds}
      selected={selected}
      fadeIn={clip.fade_in_seconds}
      fadeOut={clip.fade_out_seconds}
      onSelect={onSelect}
      onChange={(p) => {
        const patch: Partial<AudioClip> = {};
        if (p.start !== undefined) patch.start_seconds = p.start;
        if (p.duration !== undefined) patch.duration_seconds = p.duration;
        if (p.offset !== undefined) patch.offset_seconds = p.offset;
        if (p.fadeIn !== undefined) patch.fade_in_seconds = p.fadeIn;
        if (p.fadeOut !== undefined) patch.fade_out_seconds = p.fadeOut;
        onChange(patch);
      }}
      onRemove={onRemove}
      onDuplicate={onDuplicate}
    />
  );
}

function MidiClipBlock({
  clip, trackColor, snapSeconds, selected, onSelect, onChange, onRemove, onDuplicate,
}: {
  clip: MidiClip; trackColor: string;
  snapSeconds: number;
  selected: boolean;
  onSelect: () => void;
  onChange: (patch: Partial<MidiClip>) => void;
  onRemove: () => void;
  onDuplicate?: () => void;
}) {
  return (
    <DraggableClip
      tint={trackColor}
      start={clip.start_seconds}
      duration={clip.duration_seconds}
      label=""
      preview={<MidiClipPreview notes={clip.notes} durationSeconds={clip.duration_seconds} />}
      title={`${clip.notes.length} notes — drag body to move · ⌥-drag to copy`}
      snapSeconds={snapSeconds}
      selected={selected}
      canTrimLeft={false}
      onSelect={onSelect}
      onChange={(p) => onChange({
        start_seconds: p.start ?? clip.start_seconds,
        duration_seconds: p.duration ?? clip.duration_seconds,
      })}
      onRemove={onRemove}
      onDuplicate={onDuplicate}
    />
  );
}

function DraggableClip({
  tint, start, duration, offset = 0, label, peaks, preview, assetDuration, snapSeconds, selected,
  fadeIn = 0, fadeOut = 0, canTrimLeft = true, title,
  onSelect, onChange, onRemove, onDuplicate,
}: {
  tint: string;
  start: number; duration: number; offset?: number; label: string;
  peaks?: number[];
  /** Arbitrary overlay rendered in the same absolute inset position as
   * the peaks waveform — used for the MIDI note-map preview. */
  preview?: React.ReactNode;
  /** Total length of the underlying asset in seconds — used to map
   * the visible `[offset, offset + duration]` window into the peaks
   * array so trimming actually slices the waveform instead of
   * stretching it. */
  assetDuration?: number;
  snapSeconds: number;
  selected: boolean;
  /** Fade values in seconds — render handles when audio clip. */
  fadeIn?: number;
  fadeOut?: number;
  /** Left-edge trim is only valid when the underlying clip has an
   * `offset` (audio). MIDI clips disable it. */
  canTrimLeft?: boolean;
  /** Tooltip text — defaults to the drag/trim/fade hint built from `label`. */
  title?: string;
  onSelect: () => void;
  onChange: (p: {
    start?: number;
    duration?: number;
    offset?: number;
    fadeIn?: number;
    fadeOut?: number;
  }) => void;
  onRemove: () => void;
  /** Option/Alt-drag duplication (Logic/GarageBand style): the parent
   * inserts a clone at the clip's CURRENT (pre-drag) position; the body
   * drag then proceeds as normal and moves the original clip to the
   * drop point — net effect, a copy stays behind. Desktop pointers only
   * (Alt key), audio + MIDI both wire this the same way. */
  onDuplicate?: () => void;
}) {
  const pxPerSecond = usePxPerSecond();
  const snap = (s: number) => snapSeconds > 0
    ? Math.round(s / snapSeconds) * snapSeconds
    : Math.max(0, s);

  const onDragBody = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).dataset.handle) return;
    e.stopPropagation();
    onSelect();
    // Option/Alt-drag duplicate (Logic/GarageBand style): leave a copy
    // at the original position, then let the drag below move the
    // clip we're holding as normal — net effect, a copy stays behind.
    // Desktop pointers only (hardware Alt key, incl. iPad w/ keyboard).
    const isAltDrag = e.altKey && !!onDuplicate;
    if (isAltDrag) onDuplicate!();
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);
    const prevCursor = el.style.cursor;
    if (isAltDrag) el.style.cursor = 'copy';
    const startX = e.clientX;
    const startSec = start;
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const newStart = Math.max(0, snap((dx / pxPerSecond) + startSec));
      onChange({ start: newStart });
    };
    const up = (ev: PointerEvent) => {
      el.releasePointerCapture(ev.pointerId);
      el.style.cursor = prevCursor;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  // Right edge — trim end (shorter duration).
  const onResizeRight = (e: React.PointerEvent) => {
    e.stopPropagation();
    const startX = e.clientX;
    const startDur = duration;
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const minDur = snapSeconds > 0 ? snapSeconds : 0.05;
      const newDur = Math.max(minDur, snap(startDur + dx / pxPerSecond));
      onChange({ duration: newDur });
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  // Left edge — trim start. Shifts start later AND advances offset
  // into the underlying asset by the same delta so the audio at the
  // new left-edge stays musically aligned.
  const onResizeLeft = (e: React.PointerEvent) => {
    e.stopPropagation();
    const startX = e.clientX;
    const startSec = start;
    const startDur = duration;
    const startOff = offset;
    const move = (ev: PointerEvent) => {
      const dxSec = (ev.clientX - startX) / pxPerSecond;
      // Clamp so we don't push the right edge past itself and don't
      // pull offset below zero.
      const minDur = snapSeconds > 0 ? snapSeconds : 0.05;
      const maxAdvance = Math.min(startDur - minDur, /* offset cap */ Number.POSITIVE_INFINITY);
      const advance = Math.max(-startOff, Math.min(maxAdvance, dxSec));
      const newStart = Math.max(0, startSec + advance);
      const newOff = startOff + advance;
      const newDur = startDur - advance;
      onChange({ start: newStart, offset: newOff, duration: newDur });
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  // Fade-in / fade-out handles drag horizontally. Pixel→seconds at
  // the current zoom. Capped at duration/2 so the two fades never
  // overlap each other.
  const onFadeIn = (e: React.PointerEvent) => {
    e.stopPropagation();
    const startX = e.clientX;
    const startFade = fadeIn;
    const move = (ev: PointerEvent) => {
      const dxSec = (ev.clientX - startX) / pxPerSecond;
      const next = Math.max(0, Math.min(duration / 2, startFade + dxSec));
      onChange({ fadeIn: next });
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  const onFadeOut = (e: React.PointerEvent) => {
    e.stopPropagation();
    const startX = e.clientX;
    const startFade = fadeOut;
    const move = (ev: PointerEvent) => {
      const dxSec = (ev.clientX - startX) / pxPerSecond;
      // Dragging left = bigger fade-out.
      const next = Math.max(0, Math.min(duration / 2, startFade - dxSec));
      onChange({ fadeOut: next });
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const width = Math.max(8, duration * pxPerSecond);
  const fadeInW = Math.min(width, fadeIn * pxPerSecond);
  const fadeOutW = Math.min(width, fadeOut * pxPerSecond);
  const hasFades = fadeIn !== undefined && fadeOut !== undefined;
  return (
    <div
      className={`absolute top-2 bottom-2 rounded-md border cursor-grab active:cursor-grabbing select-none transition-shadow overflow-hidden ${selected ? 'ring-2 ring-primary ring-offset-1 shadow-md brightness-110' : 'hover:brightness-105'}`}
      style={{
        left: start * pxPerSecond,
        width,
        backgroundColor: selected ? `${tint}aa` : `${tint}66`,
        borderColor: tint,
        borderWidth: selected ? 2 : 1,
        // Without this, the iOS webview claims the touch for scrolling the
        // timeline the instant the finger moves, cancels the pointer
        // stream, and the drag/trim/fade never runs — "dragging clips
        // doesn't work" (2026-07-07, iPad). `none` hands every gesture
        // starting on the clip (body + edge/fade handles, which are
        // children) to our pointer handlers. The empty track lane keeps
        // its default touch-action, so timeline scrolling still works.
        touchAction: 'none',
      }}
      onPointerDown={onDragBody}
      onDoubleClick={onRemove}
      title={title ?? `${label} — click to select · drag body to move · ⌥-drag to copy · L/R edges to trim · corners to fade · Delete to remove`}
    >
      {peaks && peaks.length > 0 && (() => {
        // Slice the asset's peaks to just the visible window so that
        // trimming an edge visibly cuts the waveform at that edge
        // (rather than squishing the whole thing into the new width).
        const total = assetDuration && assetDuration > 0 ? assetDuration : duration + offset;
        const startFrac = Math.max(0, Math.min(1, offset / total));
        const endFrac = Math.max(startFrac, Math.min(1, (offset + duration) / total));
        const i0 = Math.floor(startFrac * peaks.length);
        const i1 = Math.max(i0 + 1, Math.floor(endFrac * peaks.length));
        const slice = peaks.slice(i0, i1);
        return <PeaksCanvas peaks={slice} width={width} tint={tint} />;
      })()}
      {preview}

      {/* Fade-in triangle (top-left → bottom-left wedge) */}
      {hasFades && fadeInW > 0 && (
        <div
          className="absolute top-0 bottom-0 left-0 pointer-events-none"
          style={{
            width: fadeInW,
            background: `linear-gradient(to right, rgba(0,0,0,0.55), rgba(0,0,0,0))`,
          }}
        />
      )}
      {/* Fade-out triangle (top-right → bottom-right wedge) */}
      {hasFades && fadeOutW > 0 && (
        <div
          className="absolute top-0 bottom-0 right-0 pointer-events-none"
          style={{
            width: fadeOutW,
            background: `linear-gradient(to left, rgba(0,0,0,0.55), rgba(0,0,0,0))`,
          }}
        />
      )}

      <div className="absolute top-0 left-0 right-0 text-sm px-1 pt-0.5 truncate pointer-events-none"
        style={{ color: tint, textShadow: '0 0 2px rgba(255,255,255,0.85)' }}>{label}</div>

      {/* Left-edge trim handle (full-height) */}
      {canTrimLeft && (
        <div
          data-handle="resize-left"
          onPointerDown={onResizeLeft}
          className="absolute top-0 bottom-0 left-0 w-1.5 cursor-ew-resize bg-black/10 hover:bg-black/30 z-10"
          title="Trim start (left edge)"
        />
      )}
      {/* Right-edge trim handle */}
      <div
        data-handle="resize-right"
        onPointerDown={onResizeRight}
        className="absolute top-0 bottom-0 right-0 w-1.5 cursor-ew-resize bg-black/10 hover:bg-black/30 z-10"
        title="Trim end (right edge)"
      />
      {/* Fade-in handle — small dot at top-left corner */}
      {hasFades && (
        <div
          data-handle="fade-in"
          onPointerDown={onFadeIn}
          className="absolute top-0 w-3.5 h-3.5 -translate-y-1/2 rounded-full bg-foreground border-2 border-background cursor-ew-resize z-20 hover:scale-125 transition-transform"
          style={{ left: fadeInW > 0 ? `calc(${fadeInW}px - 5px)` : -5 }}
          title={`Drag right to lengthen fade-in (currently ${fadeIn.toFixed(2)} s)`}
        />
      )}
      {/* Fade-out handle — small dot at top-right corner */}
      {hasFades && (
        <div
          data-handle="fade-out"
          onPointerDown={onFadeOut}
          className="absolute top-0 w-3.5 h-3.5 -translate-y-1/2 rounded-full bg-foreground border-2 border-background cursor-ew-resize z-20 hover:scale-125 transition-transform"
          style={{ right: fadeOutW > 0 ? `calc(${fadeOutW}px - 5px)` : -5 }}
          title={`Drag left to lengthen fade-out (currently ${fadeOut.toFixed(2)} s)`}
        />
      )}
    </div>
  );
}

/** Render a static waveform inside an audio clip. Peaks are normalized
 * 0..1 (computed at upload/record time and stored on the asset). */
function PeaksCanvas({ peaks, width, tint }: { peaks: number[]; width: number; tint: string }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const trackHeight = useTrackHeight();
  const HEIGHT = trackHeight - 12;
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(HEIGHT * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, HEIGHT);
    ctx.fillStyle = tint;
    const mid = HEIGHT / 2;
    const step = width / peaks.length;
    for (let i = 0; i < peaks.length; i++) {
      const h = Math.max(1, peaks[i] * (HEIGHT - 2));
      ctx.fillRect(i * step, mid - h / 2, Math.max(1, step), h);
    }
  }, [peaks, width, tint, HEIGHT]);
  return (
    <canvas
      ref={ref}
      className="absolute bottom-0 left-0 pointer-events-none"
      style={{ width, height: HEIGHT }}
    />
  );
}

// ── Import / record / piano-roll dialogs ─────────────────────────────

function ImportClipDialog({
  open, onOpenChange, track, onUpdate,
}: { open: boolean; onOpenChange: (o: boolean) => void; track: Track; onUpdate: (mut: (t: Track) => Track) => void }) {
  const sess = useParentSession();
  const upload = useUploadAudioAsset(sess);
  const [file, setFile] = useState<File | null>(null);

  const submit = async () => {
    if (!file || !sess) return;
    try {
      const asset = await upload.mutateAsync(file);
      // Pre-warm URL so engine can play immediately.
      const url = await getAssetUrl({ tenantId: sess.tenant_id, sessionId: sess.id, asset });
      setAssetUrl(asset.id, url);

      onUpdate((t) => {
        if (!isAudioTrack(t)) return t;
        const newClip: AudioClip = {
          id: newId(),
          kind: 'audio',
          asset_id: asset.id,
          start_seconds: 0,
          duration_seconds: asset.duration_seconds,
          offset_seconds: 0,
          gain_db: 0,
          fade_in_seconds: 0,
          fade_out_seconds: 0,
          reverse: false,
          pitch_semitones: 0,
          time_stretch: 1,
        };
        return { ...t, clips: [...t.clips, newClip] } as Track;
      });
      // Also append to session-level assets list — handled at parent level.
      sessAddAsset(asset);
      toast.success('Imported');
      setFile(null);
      onOpenChange(false);
    } catch (e) {
      toast.error('Import failed', { description: e instanceof Error ? e.message : String(e) });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Import audio</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input type="file" accept="audio/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <div className="text-xs text-muted-foreground">Adds the file as a clip starting at 0s on "{track.name}".</div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={submit} disabled={!file || upload.isPending}>
              {upload.isPending ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Uploading…</> : 'Import'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Tiny shared store for parent session access ──────────────────────
//
// The Import/Record dialogs are nested inside per-track strips. Rather
// than threading the session through five layers of props we publish
// it on a module var when the Editor mounts. Safe because the editor
// is single-instance (one session open at a time).

let _currentSession: Session | null = null;
let _addAsset: (asset: import('@/lib/studio/session').AudioAsset) => void = () => {};
function useParentSession() { return _currentSession; }
function sessAddAsset(asset: import('@/lib/studio/session').AudioAsset) { _addAsset(asset); }

function useEditorScope(session: Session | null, update: (mut: (s: Session) => Session) => void) {
  useEffect(() => {
    _currentSession = session;
    _addAsset = (asset) => update((s) => ({ ...s, assets: [...s.assets, asset] }));
    return () => {
      _currentSession = null;
      _addAsset = () => {};
    };
  }, [session, update]);
}

// ── Time signature picker ────────────────────────────────────────────

const TIME_SIGS: Array<[number, number, string]> = [
  [4, 4, '4/4'], [3, 4, '3/4'], [2, 4, '2/4'], [5, 4, '5/4'],
  [6, 8, '6/8'], [7, 8, '7/8'], [9, 8, '9/8'], [12, 8, '12/8'],
];

function TimeSignaturePicker({
  numerator, denominator, onChange,
}: { numerator: number; denominator: number; onChange: (n: number, d: number) => void }) {
  const value = `${numerator}/${denominator}`;
  return (
    <Select value={value} onValueChange={(v) => {
      const [n, d] = v.split('/').map(Number);
      onChange(n, d);
    }}>
      <SelectTrigger className="w-20 h-8 text-xs"><SelectValue /></SelectTrigger>
      <SelectContent>
        {TIME_SIGS.map(([n, d, label]) => (
          <SelectItem key={label} value={`${n}/${d}`}>{label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ── VU meter (post-master-FX, stereo bars) ───────────────────────────

// ── Transport-tick leaf components ───────────────────────────────────
// The ONLY components that re-render per ~30Hz transport tick — they
// subscribe to the tick store directly so the editor tree above them
// stays still while the transport rolls (see TransportTickStore in
// useStudio.ts).

function TransportCounter({
  store, counterMode, onCycleMode, tempoBpm, numerator, sampleRate, lengthSeconds,
}: {
  store: TransportTickStore;
  counterMode: 'bars' | 'time' | 'samples';
  onCycleMode: () => void;
  tempoBpm: number;
  numerator: number;
  sampleRate: number;
  lengthSeconds: number;
}) {
  const pos = useTransportPosition(store);
  return (
    <>
      <button
        onClick={onCycleMode}
        className="px-2 sm:px-3 py-1 bg-zinc-900 rounded leading-none tabular-nums font-mono inline-flex items-baseline gap-1.5 hover:bg-zinc-800"
        title="Time counter — click to switch Bars|Beats → Min:Sec → Samples">
        <span className="text-emerald-400 text-sm sm:text-lg">
          {counterMode === 'bars' && formatBarBeat(pos, tempoBpm, numerator)}
          {counterMode === 'time' && formatTime(pos)}
          {counterMode === 'samples' && formatSamples(pos, sampleRate)}
        </span>
        <span className="text-emerald-700 text-xs font-semibold">
          {counterMode === 'bars' ? 'BAR' : counterMode === 'time' ? 'SEC' : 'SMP'}
        </span>
      </button>
      <div className="hidden md:block text-muted-foreground text-xs tabular-nums font-mono">
        {formatTime(pos)} / {formatTime(lengthSeconds)}
      </div>
    </>
  );
}

function LiveVuMeter({ store }: { store: TransportTickStore }) {
  const tick = useTransportTick(store);
  return <VuMeter peakDbL={tick.peakDbL} peakDbR={tick.peakDbR} />;
}

/** The vertical playhead line inside a track lane. */
function LanePlayhead({ store }: { store: TransportTickStore }) {
  const pxPerSecond = usePxPerSecond();
  const pos = useTransportPosition(store);
  return (
    <div
      className="absolute top-0 bottom-0 pointer-events-none"
      style={{
        left: pos * pxPerSecond - 1,
        width: 2,
        background: 'rgb(244 63 94)',
        boxShadow: '0 0 6px rgba(244,63,94,0.8)',
        zIndex: 50,
      }}
    />
  );
}

/** The playhead chevron on the bar ruler. */
function RulerPlayheadChevron({ store }: { store: TransportTickStore }) {
  const pxPerSecond = usePxPerSecond();
  const pos = useTransportPosition(store);
  return (
    <div
      className="absolute top-0 pointer-events-none"
      style={{
        left: pos * pxPerSecond - 5,
        width: 0, height: 0,
        borderLeft: '5px solid transparent',
        borderRight: '5px solid transparent',
        borderTop: '7px solid rgb(244 63 94)',
      }}
      aria-label="playhead"
    />
  );
}

function VuMeter({ peakDbL, peakDbR }: { peakDbL: number; peakDbR: number }) {
  // Map -60..0 dB to 0..100%. Tone.Meter sometimes reports +N dB on
  // peaks — clamp the visual at 0 dB (top) and color red for >-1.
  const pctL = Math.max(0, Math.min(100, ((peakDbL + 60) / 60) * 100));
  const pctR = Math.max(0, Math.min(100, ((peakDbR + 60) / 60) * 100));
  const clipL = peakDbL > -1;
  const clipR = peakDbR > -1;
  return (
    <div className="flex items-end gap-0.5 h-8" title="Master output level">
      <Activity className="w-3.5 h-3.5 text-muted-foreground mr-1" />
      <div className="w-1.5 h-7 bg-muted rounded-sm overflow-hidden flex flex-col justify-end">
        <div
          className={`w-full transition-all duration-75 ${clipL ? 'bg-rose-500' : 'bg-emerald-500'}`}
          style={{ height: `${pctL}%` }}
        />
      </div>
      <div className="w-1.5 h-7 bg-muted rounded-sm overflow-hidden flex flex-col justify-end">
        <div
          className={`w-full transition-all duration-75 ${clipR ? 'bg-rose-500' : 'bg-emerald-500'}`}
          style={{ height: `${pctR}%` }}
        />
      </div>
    </div>
  );
}

// ── Master bus panel — volume + FX rack ──────────────────────────────

function MasterBusPanel({
  session, update,
}: { session: Session; update: (mut: (s: Session) => Session) => void }) {
  const [open, setOpen] = useState(false);
  const m = session.master;
  const addFx = (type: FxType) => update((s) => ({
    ...s, master: { ...s.master, fx: [...s.master.fx, newFxNode(type)] },
  }));
  const removeFx = (id: string) => update((s) => ({
    ...s, master: { ...s.master, fx: s.master.fx.filter((f) => f.id !== id) },
  }));
  const updateFx = (id: string, patch: Partial<FxNode>) => update((s) => ({
    ...s, master: { ...s.master, fx: s.master.fx.map((f) => f.id === id ? { ...f, ...patch } : f) },
  }));

  return (
    <Card>
      <CardContent className="p-3 space-y-2">
        <button onClick={() => setOpen(!open)} className="w-full text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground">
          {open ? '▾' : '▸'} Master bus · {m.fx.length} FX
        </button>
        {open && (
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Label className="text-xs w-12">Volume</Label>
              <Slider
                value={[m.volume_db]} min={-40} max={6} step={0.5}
                onValueChange={(v) => update((s) => ({ ...s, master: { ...s.master, volume_db: v[0] } }))}
                className="flex-1"
              />
              <span className="text-xs tabular-nums w-12 text-right">{m.volume_db.toFixed(1)} dB</span>
            </div>
            <div className="space-y-1">
              {m.fx.map((fx) => (
                <FxNodeEditor key={fx.id} fx={fx}
                  onChange={(p) => updateFx(fx.id, p)} onRemove={() => removeFx(fx.id)}
                />
              ))}
              <select
                className="text-xs border border-border rounded px-1 py-0.5 bg-card w-full"
                value=""
                onChange={(e) => {
                  if (!e.target.value) return;
                  addFx(e.target.value as FxType);
                  e.target.value = '';
                }}
              >
                <option value="">+ Add master FX…</option>
                {FX_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Color swatch ─────────────────────────────────────────────────────

const TRACK_COLORS = [
  // Row 1 — saturated primary palette
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#10b981',
  // Row 2 — cool & accent
  '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#a855f7', '#ec4899',
  // Row 3 — muted tones for backing tracks
  '#dc2626', '#ea580c', '#ca8a04', '#16a34a', '#0891b2', '#9333ea',
];

function ColorSwatch({ color, onChange }: { color: string; onChange: (c: string) => void }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    const el = buttonRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const popupWidth = 220;
    const popupHeight = 156;
    let left = rect.right - popupWidth;
    if (left < 8) left = 8;
    let top = rect.bottom + 6;
    if (top + popupHeight > window.innerHeight) {
      top = rect.top - popupHeight - 6;
    }
    setCoords({ top, left });
  }, [open]);

  const popup = (open && coords) ? (
    <>
      <div className="fixed inset-0 z-[1000]" onClick={() => setOpen(false)} />
      <div
        className="fixed z-[1001] bg-card border border-border rounded-lg p-2 shadow-xl"
        style={{ top: coords.top, left: coords.left, width: 220 }}
      >
        <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1.5 px-0.5">Track color</div>
        <div className="grid grid-cols-6 gap-1.5">
          {TRACK_COLORS.map((c) => (
            <button
              key={c}
              className={`w-7 h-7 rounded-md border transition hover:scale-110 ${c === color ? 'border-foreground ring-2 ring-foreground/70' : 'border-border'}`}
              style={{ backgroundColor: c }}
              onClick={() => { onChange(c); setOpen(false); }}
              title={c}
            />
          ))}
        </div>
      </div>
    </>
  ) : null;

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setOpen(!open)}
        className="w-5 h-5 rounded border border-border shrink-0 hover:ring-1 hover:ring-foreground/40 transition"
        style={{ backgroundColor: color }}
        title="Track color"
      />
      {/* Render portal only when document.body exists (always, in browsers).
       * Wrap with try-catch so a portal failure can't break the whole editor. */}
      {popup && typeof document !== 'undefined' && document.body
        ? createPortal(popup, document.body)
        : popup}
    </>
  );
}

// ── Clip inspector ───────────────────────────────────────────────────
//
// Bottom drawer with per-clip params. Audio clips expose gain / fade /
// pitch / time-stretch / reverse. MIDI clips just show note count + a
// "shift all notes" control (handy after recording on the wrong octave).

function ClipInspector({
  session, selected, onClose, update,
}: {
  session: Session;
  selected: SelectedClip;
  onClose: () => void;
  update: (mut: (s: Session) => Session) => void;
}) {
  const track = session.tracks.find((t) => t.id === selected.trackId);
  if (!track) return null;
  const clip = track.clips.find((c) => c.id === selected.clipId);
  if (!clip) return null;

  const patchClip = <T,>(patch: T) => update((s) => ({
    ...s,
    tracks: s.tracks.map((t) => t.id !== selected.trackId ? t : {
      ...t,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      clips: (t as any).clips.map((c: { id: string }) => c.id === selected.clipId ? { ...c, ...patch } : c),
    } as Track),
  }));

  return (
    <Card className="sticky bottom-2 shadow-lg border-primary/30">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Clip · {clip.kind} · {track.name}
          </h3>
          <Button size="sm" variant="ghost" onClick={onClose} className="h-6 w-6 p-0">×</Button>
        </div>
        {clip.kind === 'audio' ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <Label className="text-xs">Start (s)</Label>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => patchClip({ start_seconds: Math.max(0, clip.start_seconds - 0.05) })}
                  className="h-7 w-7 rounded border border-border bg-muted hover:bg-muted/70 text-xs"
                  title="Nudge clip left 50ms (Alt+←)"
                >−</button>
                <Input type="number" step="0.01" min="0" value={clip.start_seconds.toFixed(3)}
                  onChange={(e) => patchClip({ start_seconds: Math.max(0, Number(e.target.value) || 0) })}
                  className="h-7 tabular-nums" />
                <button
                  onClick={() => patchClip({ start_seconds: clip.start_seconds + 0.05 })}
                  className="h-7 w-7 rounded border border-border bg-muted hover:bg-muted/70 text-xs"
                  title="Nudge clip right 50ms (Alt+→)"
                >+</button>
              </div>
              <div className="flex gap-1 mt-1">
                <button
                  onClick={() => {
                    const secPerBeat = 60 / session.tempo_bpm;
                    const snapped = Math.round(clip.start_seconds / secPerBeat) * secPerBeat;
                    patchClip({ start_seconds: Math.max(0, snapped) });
                  }}
                  className="flex-1 h-7 rounded border border-border bg-muted hover:bg-muted/70 text-xs"
                  title="Align this clip's start to the nearest beat — fixes recording latency drift"
                >Snap to beat</button>
                <button
                  onClick={() => {
                    const secPerBeat = 60 / session.tempo_bpm;
                    const secPerBar = secPerBeat * session.time_signature.numerator;
                    const snapped = Math.round(clip.start_seconds / secPerBar) * secPerBar;
                    patchClip({ start_seconds: Math.max(0, snapped) });
                  }}
                  className="flex-1 h-7 rounded border border-border bg-muted hover:bg-muted/70 text-xs"
                  title="Align this clip's start to the nearest bar"
                >Snap to bar</button>
              </div>
            </div>
            <div>
              <Label className="text-xs">Gain (dB)</Label>
              <Input type="number" value={clip.gain_db}
                onChange={(e) => patchClip({ gain_db: Number(e.target.value) || 0 })}
                className="h-7" />
            </div>
            <div>
              <Label className="text-xs">Fade in (s)</Label>
              <Input type="number" min="0" step="0.05" value={clip.fade_in_seconds}
                onChange={(e) => patchClip({ fade_in_seconds: Math.max(0, Number(e.target.value) || 0) })}
                className="h-7" />
            </div>
            <div>
              <Label className="text-xs">Fade out (s)</Label>
              <Input type="number" min="0" step="0.05" value={clip.fade_out_seconds}
                onChange={(e) => patchClip({ fade_out_seconds: Math.max(0, Number(e.target.value) || 0) })}
                className="h-7" />
            </div>
            <div>
              <Label className="text-xs">Pitch (semitones)</Label>
              <Input type="number" min="-24" max="24" step="1" value={clip.pitch_semitones}
                onChange={(e) => patchClip({ pitch_semitones: Number(e.target.value) || 0 })}
                className="h-7" />
            </div>
            <div>
              <Label className="text-xs">Time stretch</Label>
              <Input type="number" min="0.25" max="4" step="0.05" value={clip.time_stretch}
                onChange={(e) => patchClip({ time_stretch: Math.max(0.25, Number(e.target.value) || 1) })}
                className="h-7" />
            </div>
            <div className="flex items-end">
              <Button size="sm" variant={clip.reverse ? 'default' : 'outline'} className="h-7 text-xs w-full"
                onClick={() => patchClip({ reverse: !clip.reverse })}>
                {clip.reverse ? '↺ Reversed' : 'Reverse'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <Label className="text-xs">Notes</Label>
              <div className="h-7 leading-7 px-2 border border-border rounded bg-muted/30 tabular-nums">{clip.notes.length}</div>
            </div>
            <div>
              <Label className="text-xs">Transpose all (semitones)</Label>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" className="h-7 flex-1" onClick={() => patchClip({
                  notes: clip.notes.map((n) => ({ ...n, pitch: Math.max(0, n.pitch - 12) })),
                })}>−12</Button>
                <Button size="sm" variant="outline" className="h-7 flex-1" onClick={() => patchClip({
                  notes: clip.notes.map((n) => ({ ...n, pitch: Math.max(0, n.pitch - 1) })),
                })}>−1</Button>
                <Button size="sm" variant="outline" className="h-7 flex-1" onClick={() => patchClip({
                  notes: clip.notes.map((n) => ({ ...n, pitch: Math.min(127, n.pitch + 1) })),
                })}>+1</Button>
                <Button size="sm" variant="outline" className="h-7 flex-1" onClick={() => patchClip({
                  notes: clip.notes.map((n) => ({ ...n, pitch: Math.min(127, n.pitch + 12) })),
                })}>+12</Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Export session JSON ──────────────────────────────────────────────

function exportSessionJson(session: Session): void {
  const blob = new Blob([JSON.stringify(session, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${session.title.replace(/[^\w]+/g, '_')}.gleewstudio.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── StudioScorePanel — fetches gw_sheet_music row and mounts the
// floating PDF panel. Handles the prop impedance mismatch between
// FloatingScorePanel (pdfUrl + musicId + musicTitle + onClose) and the
// session's stored scoreId (just the row id). ──────────────────────────

function StudioScorePanel({ scoreId, onClose }: { scoreId: string; onClose: () => void }) {
  const { data } = useQuery({
    queryKey: ['studio-score-panel', scoreId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_sheet_music')
        .select('id, title, composer, voicing, pdf_url')
        .eq('id', scoreId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  if (!data || !data.pdf_url) return null;
  return (
    <FloatingScorePanel
      pdfUrl={data.pdf_url}
      musicId={data.id}
      musicTitle={data.title ?? null}
      onClose={onClose}
    />
  );
}

// ── Export sheet (B1 Task 7) — MP3 320 / WAV (CD quality) / Stems ────
//
// Controlled (open/onOpenChange from Editor) rather than owning its own
// trigger button, because BOTH the header's Export button AND the
// MasterStrip's Export button (MixerView.tsx, a sibling component tree)
// need to open this exact same sheet — a self-contained
// Dialog-with-its-own-trigger like AudioSettingsButton below won't work
// for a two-entry-point sheet.
//
// Downloads fire sequentially (one <a> click + revoke per file, a short
// stagger between them for Stems) rather than all at once — browsers can
// silently drop rapid-fire simultaneous downloads triggered from a single
// event handler.

const EXPORT_PRESET_LABEL: Record<ExportPreset, string> = {
  mp3: 'MP3 320',
  wav: 'WAV (CD quality)',
  stems: 'Stems (per track)',
};

/** Region export — bounce the selected loop range of chosen tracks as a
 *  stereo mix (one file) or mono stems (per track), delivered as
 *  individual downloads or one zip. (Send-to-Media-Library lands in a
 *  follow-up phase.) */
function RegionExportSheet({
  session, region, open, onOpenChange,
}: {
  session: Session;
  region: { start: number; end: number } | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { user } = useAuth();
  const bounceable = session.tracks.filter((t) => isAudioTrack(t) || isMidiTrack(t));
  const [selected, setSelected] = useState<Set<string>>(() => new Set(bounceable.map((t) => t.id)));
  const [mode, setMode] = useState<'mix' | 'stems'>('mix');
  const [mono, setMono] = useState(false);
  const [pkg, setPkg] = useState<'individual' | 'zip'>('individual');
  const [dest, setDest] = useState<'download' | 'library'>('download');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);

  // Re-seed the selection whenever the sheet opens (tracks may have
  // changed since last time) — default to everything bounceable.
  useEffect(() => {
    if (open) setSelected(new Set(bounceable.map((t) => t.id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const toggle = (id: string) => setSelected((s) => {
    const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n;
  });

  const download = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };

  // Upload one WAV to the Media Library's per-user Studio folder:
  //   bucket media-library, path media/<userId>/studio/<file>
  // + a gw_media_library row with folder='Studio'. tenant_id fills from
  // the table's DEFAULT current_tenant_id() + trigger (cutover model).
  const sendToLibrary = async (blob: Blob, filename: string) => {
    if (!user?.id) throw new Error('Not signed in.');
    const path = `media/${user.id}/studio/${Date.now()}-${filename}`;
    const { error: upErr } = await supabase.storage
      .from('media-library').upload(path, blob, { contentType: 'audio/wav', upsert: true });
    if (upErr) throw new Error(`Upload failed: ${upErr.message}`);
    const fileUrl = supabase.storage.from('media-library').getPublicUrl(path).data.publicUrl;
    // Columns must match the LIVE gw_media_library schema (the same set
    // MediaLibraryPage's working upload uses) + folder. An earlier cut
    // included filename/original_filename/mime_type/bucket_name which
    // don't exist on the live table — PostgREST rejected the whole insert
    // ("Could not find the 'bucket_name' column"), so takes never
    // appeared in the library (2026-07-08).
    const { error: insErr } = await supabase.from('gw_media_library').insert({
      title: filename.replace(/\.wav$/i, ''),
      file_url: fileUrl,
      file_path: path,
      file_type: 'audio/wav',
      file_size: blob.size,
      folder: 'Studio',
      category: 'studio',
      is_public: false,
      is_featured: false,
      is_deleted: false,
      course_id: null,
      uploaded_by: user.id,
      download_count: 0,
      view_count: 0,
    } as never);
    if (insErr) throw new Error(`Library save failed: ${insErr.message}`);
  };

  const run = async () => {
    if (!region || busy) return;
    const trackIds = [...selected];
    if (trackIds.length === 0) { toast.error('Select at least one track.'); return; }
    setBusy(true); setProgress(0);
    const stamp = `${safeName(session.title)}_${region.start.toFixed(1)}-${region.end.toFixed(1)}s`;
    try {
      // Build the list of named WAVs to deliver.
      let files: Array<{ name: string; blob: Blob }>;
      if (mode === 'mix') {
        const blob = await renderRegionMix(session, {
          trackIds, startSec: region.start, endSec: region.end, mono, onProgress: setProgress,
        });
        files = [{ name: `${stamp}_${mono ? 'mono' : 'stereo'}mix.wav`, blob }];
      } else {
        const stems = await renderRegionStems(session, {
          trackIds, startSec: region.start, endSec: region.end, mono, onProgress: setProgress,
        });
        files = stems.map((s) => ({
          name: `${stamp}_${safeName(s.track.name)}${mono ? '_mono' : ''}.wav`,
          blob: s.blob,
        }));
      }

      if (dest === 'library') {
        for (const f of files) await sendToLibrary(f.blob, f.name);
        toast.success(`Saved ${files.length} file${files.length === 1 ? '' : 's'} to your Media Library (Studio).`);
      } else if (mode === 'stems' && pkg === 'zip') {
        download(await zipBlobs(files), `${stamp}_stems.zip`);
        toast.success(`${files.length} stem${files.length === 1 ? '' : 's'} zipped.`);
      } else {
        // Stagger so the browser's multi-download throttle keeps all.
        for (let i = 0; i < files.length; i++) {
          download(files[i].blob, files[i].name);
          if (i < files.length - 1) await new Promise((r) => setTimeout(r, 400));
        }
        toast.success(`${files.length} file${files.length === 1 ? '' : 's'} exported.`);
      }
      onOpenChange(false);
    } catch (e) {
      console.error('[Studio] region export failed', e);
      toast.error(e instanceof Error ? e.message : 'Region export failed.');
    } finally {
      setBusy(false); setProgress(0);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="dark bg-card text-foreground border-border max-h-[85dvh] overflow-y-auto">
        <SheetHeader className="mb-3">
          <SheetTitle className="text-base inline-flex items-center gap-2">
            <Scissors className="w-4 h-4" /> Export region
            {region && (
              <span className="text-xs font-normal text-muted-foreground tabular-nums">
                {region.start.toFixed(1)}s – {region.end.toFixed(1)}s ({(region.end - region.start).toFixed(1)}s)
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 text-sm pb-4">
          {/* Tracks */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-semibold">Tracks</span>
              <button
                className="text-xs text-primary"
                onClick={() => setSelected((s) => s.size === bounceable.length ? new Set() : new Set(bounceable.map((t) => t.id)))}
              >
                {selected.size === bounceable.length ? 'Clear all' : 'Select all'}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {bounceable.map((t) => (
                <label key={t.id} className="flex items-center gap-2 px-2 py-2 rounded border border-border bg-background cursor-pointer">
                  <input type="checkbox" checked={selected.has(t.id)} onChange={() => toggle(t.id)} className="accent-primary w-4 h-4" />
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                  <span className="truncate">{t.name}</span>
                </label>
              ))}
              {bounceable.length === 0 && <span className="text-muted-foreground italic col-span-2">No tracks to export.</span>}
            </div>
          </div>

          {/* Format */}
          <div>
            <span className="font-semibold block mb-1.5">Format</span>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => { setMode('mix'); setMono(false); }}
                className={`h-11 rounded border text-sm font-semibold ${mode === 'mix' ? 'bg-primary/15 border-primary/50 text-primary' : 'border-border bg-background text-muted-foreground'}`}
              >Stereo mix<span className="block text-[10px] font-normal opacity-70">one file</span></button>
              <button
                onClick={() => { setMode('stems'); setMono(true); }}
                className={`h-11 rounded border text-sm font-semibold ${mode === 'stems' ? 'bg-primary/15 border-primary/50 text-primary' : 'border-border bg-background text-muted-foreground'}`}
              >Mono stems<span className="block text-[10px] font-normal opacity-70">one file per track</span></button>
            </div>
            <label className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <input type="checkbox" checked={mono} onChange={(e) => setMono(e.target.checked)} className="accent-primary w-4 h-4" />
              Downmix to mono
            </label>
          </div>

          {/* Destination */}
          <div>
            <span className="font-semibold block mb-1.5">Destination</span>
            <div className="grid grid-cols-2 gap-1.5">
              <button onClick={() => setDest('download')}
                className={`h-10 rounded border text-sm font-semibold ${dest === 'download' ? 'bg-primary/15 border-primary/50 text-primary' : 'border-border bg-background text-muted-foreground'}`}
              >Download</button>
              <button onClick={() => setDest('library')}
                className={`h-10 rounded border text-sm font-semibold ${dest === 'library' ? 'bg-primary/15 border-primary/50 text-primary' : 'border-border bg-background text-muted-foreground'}`}
              >Media Library</button>
            </div>
          </div>

          {/* Packaging (stems + download only) */}
          {mode === 'stems' && dest === 'download' && (
            <div>
              <span className="font-semibold block mb-1.5">Download as</span>
              <div className="grid grid-cols-2 gap-1.5">
                <button onClick={() => setPkg('individual')}
                  className={`h-10 rounded border text-sm font-semibold ${pkg === 'individual' ? 'bg-primary/15 border-primary/50 text-primary' : 'border-border bg-background text-muted-foreground'}`}
                >Individual files</button>
                <button onClick={() => setPkg('zip')}
                  className={`h-10 rounded border text-sm font-semibold ${pkg === 'zip' ? 'bg-primary/15 border-primary/50 text-primary' : 'border-border bg-background text-muted-foreground'}`}
                >One .zip</button>
              </div>
            </div>
          )}

          <Button onClick={run} disabled={busy || selected.size === 0} className="w-full h-11">
            {busy
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Rendering… {Math.round(progress * 100)}%</>
              : dest === 'library'
                ? <><Upload className="w-4 h-4 mr-2" /> Send {selected.size} track{selected.size === 1 ? '' : 's'} to Library</>
                : <><Download className="w-4 h-4 mr-2" /> Export {selected.size} track{selected.size === 1 ? '' : 's'}</>}
          </Button>
          <p className="text-[11px] text-muted-foreground text-center">
            {dest === 'library'
              ? 'Saved to Media Library → Studio, in your own subfolder.'
              : 'Downloads to this device.'}
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ExportSheet({
  session, open, onOpenChange, engineState,
}: {
  session: Session;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  engineState: ReturnType<typeof useStudioEngine>;
}) {
  const [preset, setPreset] = useState<ExportPreset>('wav');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resumeAvailable, setResumeAvailable] = useState(false);
  const mastering = withMasteringDefaults(session).master.mastering!;

  // Only mp3/wav (renderMaster) persist chunked-render progress — stems
  // render one small per-track pass at a time and are never chunked.
  useEffect(() => {
    if (!open || preset === 'stems') { setResumeAvailable(false); return; }
    let cancelled = false;
    hasResumableExport(session.id, preset).then((has) => {
      if (!cancelled) setResumeAvailable(has);
    });
    return () => { cancelled = true; };
  }, [open, preset, session.id]);

  const runExport = async (resume: boolean) => {
    setBusy(true);
    setProgress(0);
    try {
      // Declining a resumable record and starting fresh must not leave
      // the stale chunks lying around in IndexedDB — a later resume
      // attempt (possibly after the session/mastering params changed)
      // would otherwise silently splice in outdated audio. Only mp3/wav
      // persist progress (stems are never chunked), matching the
      // hasResumableExport gating above.
      if (!resume && resumeAvailable && preset !== 'stems') {
        await clearExportProgress(session.id, preset);
        setResumeAvailable(false);
      }
      // Spec §3: "Export applies the settled gain" — read the loudness
      // servo's converged pre-limiter makeup gain straight off the live
      // master chain (the same guarded handle the servo itself writes
      // through in MixerView's MasterStrip) rather than re-deriving it.
      const preGainDb = engineState.state?.masterChain?.getPreGainDb() ?? 0;
      const files = await exportSession(session, preset, {
        mastering: mastering.enabled,
        onProgress: setProgress,
        resume,
        preGainDb,
        onDegraded: () => toast.warning(
          'Mastering ran in degraded mode for this export',
          { description: 'The limiter worklet was unavailable — exported with HPF/air/comp only.' },
        ),
      });
      for (let i = 0; i < files.length; i++) {
        const { filename, blob } = files[i];
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        // Sequential downloads (spec) — stagger so the browser's
        // multi-download throttle doesn't drop any of the stems.
        if (i < files.length - 1) await new Promise((r) => setTimeout(r, 200));
      }
      toast.success(files.length > 1 ? `Exported ${files.length} stems` : 'Export complete');
      setResumeAvailable(false);
      onOpenChange(false);
    } catch (e) {
      toast.error('Export failed', { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!busy) onOpenChange(o); }}>
      <SheetContent side="bottom" className="max-w-md mx-auto rounded-t-xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            Export
            <span
              className={`text-xs font-semibold px-1.5 py-0.5 rounded border ${
                mastering.enabled
                  ? 'bg-emerald-500/15 border-emerald-500/60 text-emerald-400'
                  : 'bg-muted border-border text-muted-foreground'
              }`}
            >
              {mastering.enabled ? 'Mastering applied' : 'No mastering'}
            </span>
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-3 py-2">
          <div className="grid grid-cols-3 gap-2">
            {(['mp3', 'wav', 'stems'] as ExportPreset[]).map((p) => (
              <button
                key={p}
                type="button"
                disabled={busy}
                onClick={() => setPreset(p)}
                className={`h-11 rounded border text-sm font-semibold disabled:opacity-50 ${
                  preset === p
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted border-border text-muted-foreground hover:bg-muted/70'
                }`}
              >
                {EXPORT_PRESET_LABEL[p]}
              </button>
            ))}
          </div>

          {resumeAvailable && !busy && (
            <div className="text-xs bg-amber-500/10 border border-amber-500/40 rounded p-2 flex items-center justify-between gap-2">
              <span>An interrupted export of this preset was found.</span>
              <button type="button" onClick={() => runExport(true)} className="underline font-semibold shrink-0">
                Resume
              </button>
            </div>
          )}

          {busy && (
            <div className="space-y-1">
              <div className="h-2 rounded bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary transition-[width] duration-150"
                  style={{ width: `${Math.round(progress * 100)}%` }}
                />
              </div>
              <div className="text-xs text-muted-foreground text-center tabular-nums">
                {Math.round(progress * 100)}%
              </div>
            </div>
          )}

          <Button onClick={() => runExport(false)} disabled={busy} className="w-full">
            {busy ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Download className="w-4 h-4 mr-1" />}
            {busy ? 'Rendering…' : `Export ${EXPORT_PRESET_LABEL[preset]}`}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Compact time-signature picker (dark, fits in transport bar) ──────

function CompactTimeSignaturePicker({
  numerator, denominator, onChange,
}: { numerator: number; denominator: number; onChange: (n: number, d: number) => void }) {
  return (
    <select value={`${numerator}/${denominator}`}
      onChange={(e) => { const [n, d] = e.target.value.split('/').map(Number); onChange(n, d); }}
      className="h-7 bg-background border border-border rounded text-sm px-1 tabular-nums"
    >
      {TIME_SIGS.map(([n, d, label]) => (
        <option key={label} value={`${n}/${d}`}>{label}</option>
      ))}
    </select>
  );
}

// ── Bar/beat ruler ───────────────────────────────────────────────────

function BarRuler({
  lengthSeconds, tempoBpm, numerator, transportTick,
  loopRegion = null, loopEnabled = false, onLoopRegionChange, onSeek,
  markers = [], onMarkerJump, onMarkerEdit,
}: {
  lengthSeconds: number; tempoBpm: number; numerator: number;
  transportTick: TransportTickStore;
  loopRegion?: { start: number; end: number } | null;
  loopEnabled?: boolean;
  onLoopRegionChange?: (r: { start: number; end: number } | null) => void;
  onSeek?: (seconds: number) => void;
  markers?: SessionMarker[];
  onMarkerJump?: (seconds: number) => void;
  onMarkerEdit?: (id: string) => void;
}) {
  const pxPerSecond = usePxPerSecond();
  const gridLevel = useGridLevel();
  const secondsPerBeat = 60 / tempoBpm;
  const secondsPerBar = secondsPerBeat * numerator;
  const totalBars = Math.ceil(lengthSeconds / secondsPerBar);
  const width = lengthSeconds * pxPerSecond;

  // Logic-style ruler behavior:
  //   • Tap (no drag) → set playhead.
  //   • Drag → mark a loop region.
  const onPointerDown = (e: React.PointerEvent) => {
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);
    const rect = el.getBoundingClientRect();
    const startSec = Math.max(0, Math.min(lengthSeconds, (e.clientX - rect.left) / pxPerSecond));
    let dragged = false;
    const move = (ev: PointerEvent) => {
      const sec = Math.max(0, Math.min(lengthSeconds, (ev.clientX - rect.left) / pxPerSecond));
      if (!dragged && Math.abs(sec - startSec) >= 0.05) {
        dragged = true;
      }
      if (dragged && onLoopRegionChange) {
        const lo = Math.min(startSec, sec);
        const hi = Math.max(startSec, sec);
        onLoopRegionChange({ start: lo, end: hi });
      }
    };
    const up = (ev: PointerEvent) => {
      try { el.releasePointerCapture(ev.pointerId); } catch { /* ignore */ }
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      const sec = Math.max(0, Math.min(lengthSeconds, (ev.clientX - rect.left) / pxPerSecond));
      if (!dragged) {
        // Tap: move playhead. A leftover region highlight with loop OFF
        // is just a stale selection — clear it so the ruler doesn't stay
        // highlighted forever (there was previously NO way to deselect).
        // An ACTIVE loop region (Repeat on) survives taps, so seeking
        // while looping doesn't kill the loop.
        if (!loopEnabled) onLoopRegionChange?.(null);
        onSeek?.(sec);
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  return (
    <div
      className="relative h-6 bg-muted/30 cursor-crosshair select-none"
      style={{ width }}
      onPointerDown={onPointerDown}
      title="Click to set playhead · drag to mark a loop region"
    >
      {/* Bar labels — show the bar number at the start of each bar.
       * pointer-events-none so the ruler's tap-to-seek / drag-to-loop
       * still fires when the cursor is on a bar line. */}
      {Array.from({ length: totalBars + 1 }).map((_, b) => {
        const x = b * secondsPerBar * pxPerSecond;
        return (
          <div key={b} className="absolute top-0 bottom-0 border-l-2 border-foreground/80 pointer-events-none" style={{ left: x }}>
            <span className="text-xs text-foreground font-bold pl-1 tabular-nums font-mono">{b + 1}</span>
          </div>
        );
      })}
      {/* Subdivision ticks — counts per measure follow the Grid setting:
       * 1/4 → 4, 1/8 → 8, 1/16 → 16. The next measure's start is a bar
       * line (drawn above) and isn't counted as one of THIS measure's
       * subdivision lines. */}
      {(() => {
        const sub = resolveGridSubdivision(gridLevel, secondsPerBeat, pxPerSecond);
        if (sub === 0) return null;
        const stepSec = secondsPerBeat * (4 / sub);
        const beatStride = sub / 4;
        const barStride = beatStride * numerator;
        const totalSteps = Math.ceil(lengthSeconds / stepSec);
        const ticks = [];
        for (let i = 0; i < totalSteps; i++) {
          if (Math.abs(i % barStride) < 1e-6) continue; // bar already drawn above
          const isBeat = Math.abs(i % Math.max(beatStride, 1)) < 1e-6;
          const isEighth = sub >= 8 && Math.abs(i % (beatStride / 2)) < 1e-6;
          const x = i * stepSec * pxPerSecond;
          let cls = 'top-[18px] border-foreground/35';
          if (isEighth && !isBeat) cls = 'top-[15px] border-foreground/55';
          if (isBeat) cls = 'top-[10px] border-foreground/75';
          ticks.push(
            <div
              key={`tick${i}`}
              className={`absolute bottom-0 border-l pointer-events-none ${cls}`}
              style={{ left: x }}
            />,
          );
        }
        return ticks;
      })()}
      {/* Loop region highlight */}
      {loopRegion && loopRegion.end > loopRegion.start && (
        <div
          className={`absolute top-0 bottom-0 ${loopEnabled ? 'bg-sky-400/40 border-sky-500' : 'bg-sky-200/40 border-sky-300'} border-l-2 border-r-2 pointer-events-none`}
          style={{
            left: loopRegion.start * pxPerSecond,
            width: (loopRegion.end - loopRegion.start) * pxPerSecond,
          }}
        />
      )}
      {/* Marker flags — Logic-style chips pinned to the ruler. Click
       * jumps the playhead; pointer-down is stopped so the ruler's
       * tap-to-seek / drag-to-loop doesn't also fire. */}
      {sortMarkers(markers).map((mk) => (
        <button
          key={mk.id}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onMarkerJump?.(mk.seconds); }}
          onDoubleClick={(e) => { e.stopPropagation(); onMarkerEdit?.(mk.id); }}
          className="absolute top-0 z-10 h-4 max-w-[96px] truncate rounded-sm bg-amber-500/90 hover:bg-amber-400 px-1 text-xs font-semibold leading-4 text-amber-950"
          style={{ left: mk.seconds * pxPerSecond }}
          title={`${mk.name} — click to jump · double-click to rename/delete`}
        >
          {mk.name}
        </button>
      ))}
      {/* Playhead chevron on the ruler — moves with transport position. */}
      <RulerPlayheadChevron store={transportTick} />
    </div>
  );
}

// ── Click (metronome) track row ──────────────────────────────────────
//
// A virtual track row that mirrors the engine metronome: mute toggles
// the click on/off, the slider sets click volume. The lane renders one
// dot per beat (filled accent on beat 1) so you can see what the click
// would sound like against the project.

function ClickTrackRow({
  session, endSeconds, stripWidth, metronomeOn, metronomeVolumeDb,
  onToggle, onVolume, onSeek, onHeightChange,
}: {
  session: Session;
  /** Timeline extent (>= session.length_seconds) — see timelineEndSeconds. */
  endSeconds: number;
  stripWidth: number;
  metronomeOn: boolean;
  metronomeVolumeDb: number;
  onToggle: () => void;
  onVolume: (db: number) => void;
  onSeek: (seconds: number) => void;
  onHeightChange?: (h: number) => void;
}) {
  const pxPerSecond = usePxPerSecond();
  const trackHeight = useTrackHeight();
  const scrollSync = useScrollSync();
  // Click track is intentionally a THIN strip — roughly one-third the
  // height of a regular row (previously ~half — user asked for tinier).
  // Floors at 22px so the controls remain tappable but the row reads
  // as a subtle chrome strip, not a full track. As the user drags rows
  // shorter, the click row meets them and they end up equal.
  const CLICK_MIN_HEIGHT = 22;
  const clickHeight = Math.min(trackHeight, Math.max(CLICK_MIN_HEIGHT, Math.floor(trackHeight / 3)));
  const numerator = session.time_signature.numerator;
  const secondsPerBeat = 60 / session.tempo_bpm;
  const totalWidth = endSeconds * pxPerSecond;
  const totalBeats = Math.ceil(endSeconds / secondsPerBeat);

  const onLaneClick = (e: React.MouseEvent) => {
    if (e.target !== e.currentTarget) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const sec = Math.max(0, Math.min(endSeconds, (e.clientX - rect.left) / pxPerSecond));
    onSeek(sec);
  };

  const onRowResize = (e: React.PointerEvent) => {
    if (!onHeightChange) return;
    e.preventDefault();
    const startY = e.clientY;
    const startH = trackHeight;
    // Click row renders at half the global height, so the cursor moves
    // twice as far as the row grows. Scale the delta so dragging the
    // click handle feels 1:1 with the visible row height. rAF-throttle
    // so the visible height tracks the cursor smoothly rather than
    // stepping on every pointer batch.
    let pending: number | null = null;
    let raf: number | null = null;
    const move = (ev: PointerEvent) => {
      pending = startH + 2 * (ev.clientY - startY);
      if (raf !== null) return;
      raf = requestAnimationFrame(() => {
        raf = null;
        if (pending !== null) onHeightChange(pending);
      });
    };
    const up = () => {
      if (raf !== null) cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  return (
    <div className="flex border-b border-border bg-muted/10 relative" style={{ height: clickHeight }}>
      <div
        className="shrink-0 border-r border-border flex items-stretch bg-background relative"
        style={{ width: stripWidth }}
      >
        <div className="w-1 bg-amber-400" />
        {/* Single horizontal row — sized to the ~22px strip height.
         * Everything tightened: xs text, w-3 icon, h-1 slider, minimal
         * padding. Reads as a chrome strip, not a track. */}
        <div className="flex-1 px-1.5 flex items-center gap-1 min-w-0">
          <Timer className="w-3 h-3 shrink-0 text-amber-500" />
          <span className="text-xs font-semibold">Click</span>
          <button
            onClick={onToggle}
            className={`text-[10px] font-bold px-1 py-px rounded border shrink-0 ${metronomeOn ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-muted border-border text-muted-foreground hover:bg-muted/70'}`}
            title={metronomeOn ? 'Click is ON — tap to silence' : 'Click is OFF — tap to turn on (M)'}
          >
            {metronomeOn ? 'ON' : 'OFF'}
          </button>
          <input
            type="range" min={-40} max={6} step={0.5} value={metronomeVolumeDb}
            onChange={(e) => onVolume(Number(e.target.value))}
            className="flex-1 min-w-0 h-1 accent-amber-500"
            title={`${metronomeVolumeDb.toFixed(1)} dB`}
          />
          <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
            {session.tempo_bpm} BPM
          </span>
        </div>
      </div>
      <div
        className="flex-1 overflow-x-auto bg-background relative"
        ref={scrollSync?.register}
      >
        <div
          className="relative cursor-crosshair"
          style={{ width: totalWidth, height: clickHeight }}
          onClick={onLaneClick}
          title="Click to set playhead"
        >
          {Array.from({ length: totalBeats }).map((_, i) => {
            const isDownbeat = i % numerator === 0;
            const x = i * secondsPerBeat * pxPerSecond;
            return (
              <div key={i} className="absolute top-1/2 -translate-y-1/2 pointer-events-none" style={{ left: x }}>
                <div
                  className={`rounded-full ${
                    isDownbeat
                      ? metronomeOn ? 'bg-amber-500' : 'bg-amber-500/40'
                      : metronomeOn ? 'bg-amber-300' : 'bg-amber-300/30'
                  }`}
                  style={{ width: isDownbeat ? 5 : 3, height: isDownbeat ? 5 : 3, marginLeft: isDownbeat ? -2.5 : -1.5 }}
                />
              </div>
            );
          })}
        </div>
      </div>
      {/* Row resize handle — drag down/up to set every row's height. */}
      <div
        onPointerDown={onRowResize}
        className="absolute left-0 right-0 bottom-0 h-1.5 cursor-ns-resize hover:bg-primary/30 z-30"
        title="Drag to resize all track rows"
      />
    </div>
  );
}

// ── Compact dark track row ───────────────────────────────────────────
//
// Combines the strip (left, fixed-width) and the timeline lane (right,
// scrollable) into a single 64px-tall row. Numbered like Logic Pro,
// with M/S/R inline + a thin volume slider + live mini-meter.

function DarkTrackRow({
  index, session, track, transportTick, snapSeconds, endSeconds, selectedClip, recording,
  stripWidth, onStripWidthChange,
  onSelectClip, onUpdate, onRemove, onStripChange, onSeek, onHeightChange, onOpenPianoRoll,
}: {
  index: number;
  session: Session;
  track: Track;
  transportTick: TransportTickStore;
  snapSeconds: number;
  /** Timeline extent (>= session.length_seconds) — see timelineEndSeconds. */
  endSeconds: number;
  selectedClip: SelectedClip | null;
  recording: RecordingSession | null;
  stripWidth: number;
  onStripWidthChange: (w: number) => void;
  onSelectClip: (c: SelectedClip | null) => void;
  onUpdate: (mut: (t: Track) => Track) => void;
  onRemove: () => void;
  onStripChange: (p: { volume_db?: number; pan?: number; mute?: boolean; solo?: boolean }) => void;
  onSeek?: (seconds: number) => void;
  onHeightChange?: (h: number) => void;
  onOpenPianoRoll: () => void;
}) {
  const pxPerSecond = usePxPerSecond();
  const trackHeight = useTrackHeight();
  const scrollSync = useScrollSync();
  const onStripResize = (e: React.PointerEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = stripWidth;
    const move = (ev: PointerEvent) => onStripWidthChange(startW + (ev.clientX - startX));
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  const onRowResize = (e: React.PointerEvent) => {
    if (!onHeightChange) return;
    e.preventDefault();
    const startY = e.clientY;
    const startH = trackHeight;
    // rAF-throttle so the height tracks the cursor smoothly instead of
    // stepping when pointermove events outpace React's render cycle.
    let pending: number | null = null;
    let raf: number | null = null;
    const move = (ev: PointerEvent) => {
      pending = startH + (ev.clientY - startY);
      if (raf !== null) return;
      raf = requestAnimationFrame(() => {
        raf = null;
        if (pending !== null) onHeightChange(pending);
      });
    };
    const up = () => {
      if (raf !== null) cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  const setStrip = (p: Partial<Pick<Track, 'name' | 'volume_db' | 'pan' | 'mute' | 'solo' | 'arm'>>) => {
    onUpdate((t) => ({ ...t, ...p } as Track));
    if (p.volume_db !== undefined || p.pan !== undefined || p.mute !== undefined || p.solo !== undefined) {
      onStripChange(p as never);
    }
  };
  const isRecordingThisTrack = !!recording && recording.armedTrackIds.includes(track.id);

  return (
    <div className="flex border-b border-border last:border-b-0 hover:bg-muted/30 relative" style={{ height: trackHeight }}>
      {/* Strip — resizable width, compact */}
      <div
        className="shrink-0 border-r border-border flex items-stretch bg-background relative"
        style={{ width: stripWidth }}
      >
        {/* Right-edge resize handle (affects all strips uniformly) */}
        <div
          onPointerDown={onStripResize}
          className="hidden sm:block absolute top-0 bottom-0 right-0 w-1.5 cursor-ew-resize hover:bg-primary/20 z-20"
          title="Drag to resize track strip"
        />
        {/* Color stripe */}
        <div className="w-1.5" style={{ backgroundColor: track.color }} />
        {/* justify-center + overflow-hidden: keep the header vertically
            centred inside the fixed row height so M/S/R never sits flush
            against (and reads as clipped by) the divider to the next
            track, and clip cleanly at the strip edge rather than bleeding
            under the row below. */}
        <div className="flex-1 min-w-0 px-2 py-1.5 flex flex-col justify-center gap-1 overflow-hidden">
          {/* Row 1: number + name + remove */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground tabular-nums w-5 font-mono">{index}</span>
            {isAudioTrack(track) ? <Mic className="w-4 h-4 shrink-0" style={{ color: track.color }} /> : <Drum className="w-4 h-4 shrink-0" style={{ color: track.color }} />}
            <input
              value={track.name}
              onChange={(e) => setStrip({ name: e.target.value })}
              className="bg-transparent text-base font-semibold outline-none flex-1 min-w-0"
            />
            <div className="hidden sm:flex items-center gap-1.5">
              <ColorSwatch color={track.color} onChange={(c) => onUpdate((t) => ({ ...t, color: c } as Track))} />
              {isAudioTrack(track) && (
                <AudioImportIconButton track={track} onUpdate={onUpdate} />
              )}
            </div>
            {/* Phone: the 132px strip clamp pushes the row-2 trash out
             * of view and there's no room for swatch + import either —
             * fold the overflow actions into a per-track bottom sheet. */}
            <Sheet>
              <SheetTrigger asChild>
                <button
                  className="sm:hidden shrink-0 h-10 w-10 -mr-1 rounded flex items-center justify-center text-muted-foreground hover:bg-muted"
                  aria-label={`Track actions for ${track.name}`}
                >
                  <MoreVertical className="w-5 h-5" />
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" className="max-h-[70dvh] overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>{track.name}</SheetTitle>
                </SheetHeader>
                <div className="space-y-4 text-sm pb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Track color</span>
                    <ColorSwatch color={track.color} onChange={(c) => onUpdate((t) => ({ ...t, color: c } as Track))} />
                  </div>
                  {isAudioTrack(track) && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Import audio</span>
                      <AudioImportIconButton track={track} onUpdate={onUpdate} />
                    </div>
                  )}
                  <button
                    onClick={() => {
                      const clipCount = isAudioTrack(track) || isMidiTrack(track) ? track.clips.length : 0;
                      const msg = clipCount > 0
                        ? `Delete "${track.name}"? ${clipCount} clip${clipCount === 1 ? '' : 's'} on this track will be removed. This can't be undone.`
                        : `Delete "${track.name}"? This can't be undone.`;
                      if (confirm(msg)) onRemove();
                    }}
                    className="w-full h-11 rounded border border-border text-destructive inline-flex items-center justify-center gap-2 font-semibold hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4" /> Delete track
                  </button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
          {/* Row 2: M/S/R + volume slider + persistent trash. Trash is
           * on this row (not row 1) because row 1's color swatch +
           * import + trash overflow-clip on narrow strip widths (user
           * couldn't see delete). Keeping it on row 2 next to the
           * transport controls guarantees it's always visible. */}
          <div className="flex items-center gap-1">
            <button onClick={() => setStrip({ mute: !track.mute })}
              className={`text-sm font-bold px-1.5 py-0.5 rounded border ${track.mute ? 'bg-amber-400 border-amber-400 text-amber-950' : 'bg-muted border-border text-muted-foreground hover:bg-muted/70'}`}>M</button>
            <button onClick={() => setStrip({ solo: !track.solo })}
              className={`text-sm font-bold px-1.5 py-0.5 rounded border ${track.solo ? 'bg-yellow-400 border-yellow-400 text-yellow-950' : 'bg-muted border-border text-muted-foreground hover:bg-muted/70'}`}>S</button>
            <button onClick={() => setStrip({ arm: !track.arm })}
              className={`text-sm font-bold px-1.5 py-0.5 rounded border inline-flex items-center gap-0.5 ${track.arm ? 'bg-rose-500 border-rose-500 text-white' : 'bg-muted border-border text-muted-foreground hover:bg-rose-50 hover:border-rose-300'}`}
              title={isAudioTrack(track) ? 'Arm for recording' : 'Arm as the USB MIDI input target'}>
              <Circle className={`w-2 h-2 ${track.arm ? 'fill-current' : ''}`} /> R
            </button>
            <input
              type="range" min={-40} max={6} step={0.5} value={track.volume_db}
              onChange={(e) => setStrip({ volume_db: Number(e.target.value) })}
              className="flex-1 h-1 accent-primary min-w-0"
              title={`${track.volume_db.toFixed(1)} dB`}
            />
            <button
              onClick={() => {
                const clipCount = isAudioTrack(track) || isMidiTrack(track) ? track.clips.length : 0;
                const msg = clipCount > 0
                  ? `Delete "${track.name}"? ${clipCount} clip${clipCount === 1 ? '' : 's'} on this track will be removed. This can't be undone.`
                  : `Delete "${track.name}"? This can't be undone.`;
                if (confirm(msg)) onRemove();
              }}
              className="hidden sm:block shrink-0 text-muted-foreground hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors"
              title="Delete track"
              aria-label={`Delete ${track.name}`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          {/* Row 3: only MIDI tracks need the instrument picker now.
           * Audio tracks use the Import icon next to the color swatch. */}
          {isMidiTrack(track) && (
            <MidiInstrumentDropdown track={track} onUpdate={onUpdate} onOpenPianoRoll={onOpenPianoRoll} />
          )}
        </div>
      </div>

      {/* Timeline lane */}
      <div className="flex-1 overflow-x-auto bg-background relative [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" ref={scrollSync?.register}>
        <DarkTimeline
          session={session} track={track}
          snapSeconds={snapSeconds}
          endSeconds={endSeconds}
          selectedClip={selectedClip}
          onSelectClip={onSelectClip}
          onUpdate={onUpdate}
          onSeek={onSeek}
        />
        {/* Live waveform overlay while recording on this track */}
        {isRecordingThisTrack && recording && (
          <LiveWaveform recording={recording} trackColor={track.color} />
        )}
        {/* Playhead — rendered after the timeline AND the live waveform so it
         * sits visually on top of both regardless of DOM order tricks. */}
        <LanePlayhead store={transportTick} />
      </div>
      {/* Row resize handle — drag down/up to set every row's height. */}
      <div
        onPointerDown={onRowResize}
        className="absolute left-0 right-0 bottom-0 h-1.5 cursor-ns-resize hover:bg-primary/30 z-30"
        title="Drag to resize all track rows"
      />
    </div>
  );
}

// MIDI instrument picker — compact dropdown style for the dark strip.
function MidiInstrumentDropdown({
  track, onUpdate, onOpenPianoRoll,
}: { track: Track; onUpdate: (mut: (t: Track) => Track) => void; onOpenPianoRoll: () => void }) {
  if (!isMidiTrack(track)) return null;
  const inst = track.instrument;
  return (
    <div className="flex items-center gap-1 text-xs">
      <select
        value={`${inst.type}:${inst.preset_id ?? ''}`}
        onChange={(e) => {
          // Split on the FIRST colon only: a GM preset id is itself 'gm:<name>',
          // so 'sampler:gm:violin' must yield type='sampler', preset='gm:violin'.
          const v = e.target.value;
          const i = v.indexOf(':');
          const type = v.slice(0, i);
          const preset = v.slice(i + 1);
          onUpdate((t) => isMidiTrack(t)
            ? { ...t, instrument: { ...t.instrument, type: type as 'synth_basic' | 'sampler', preset_id: preset || undefined } } as Track
            : t);
        }}
        className="h-5 bg-zinc-950 border border-zinc-800 rounded text-zinc-300 px-1 flex-1 min-w-0"
      >
        <optgroup label="Studio">
          {GW_INSTRUMENTS.map((g) => (
            <option key={g.name} value={`sampler:${toGwPresetId(g.name)}`}>{g.label}</option>
          ))}
        </optgroup>
        <option value="synth_basic:sine">Synth · Sine</option>
        <option value="synth_basic:triangle">Synth · Triangle</option>
        <option value="synth_basic:square">Synth · Square</option>
        <option value="synth_basic:sawtooth">Synth · Sawtooth</option>
        <option value="sampler:kit_basic">Sampler · Kit</option>
        {GM_GROUPED.map((group) => (
          <optgroup key={group.family} label={group.family}>
            {group.instruments.map((g) => (
              <option key={g.name} value={`sampler:${toGmPresetId(g.name)}`}>{g.label}</option>
            ))}
          </optgroup>
        ))}
      </select>
      <button onClick={onOpenPianoRoll} className="px-1.5 h-5 bg-zinc-800 border border-zinc-700 rounded hover:bg-zinc-700">Roll</button>
    </div>
  );
}

// ── Dark timeline lane (clips + playhead) ────────────────────────────

function DarkTimeline({
  session, track, snapSeconds, endSeconds, selectedClip, onSelectClip, onUpdate, onSeek,
}: {
  session: Session; track: Track;
  snapSeconds: number;
  /** Timeline extent (>= session.length_seconds) — see timelineEndSeconds. */
  endSeconds: number;
  selectedClip: SelectedClip | null;
  onSelectClip: (c: SelectedClip | null) => void;
  onUpdate: (mut: (t: Track) => Track) => void;
  onSeek?: (seconds: number) => void;
}) {
  const pxPerSecond = usePxPerSecond();
  const trackHeight = useTrackHeight();
  const gridLevel = useGridLevel();
  const totalWidth = endSeconds * pxPerSecond;
  const secondsPerBeat = 60 / session.tempo_bpm;
  const secondsPerBar = secondsPerBeat * session.time_signature.numerator;
  const totalBars = Math.ceil(endSeconds / secondsPerBar);

  // Click on the lane background (NOT on a clip) sets the playhead.
  // Clips stop propagation via onPointerDown so they keep their own
  // drag-to-move behavior intact.
  const onLaneClick = (e: React.MouseEvent) => {
    if (!onSeek) return;
    if (e.target !== e.currentTarget) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const sec = Math.max(0, Math.min(endSeconds, (e.clientX - rect.left) / pxPerSecond));
    onSeek(sec);
    onSelectClip(null);
  };

  return (
    <div
      className="relative"
      style={{ width: totalWidth, height: trackHeight }}
      onClick={onLaneClick}
      title="Click to set playhead"
    >
      {/* Musical grid — bars (strongest), then halves / beats / 8ths /
       * 16ths / 32nds depending on the Grid dropdown. Per-measure line
       * count matches the subdivision name: 1/4 = 4, 1/8 = 8, 1/16 =
       * 16. Each measure's right edge is the next measure's start, so
       * we don't render a closing duplicate — the "next measure line"
       * isn't counted toward this measure. */}
      {(() => {
        const numerator = session.time_signature.numerator;
        const sub = resolveGridSubdivision(gridLevel, secondsPerBeat, pxPerSecond);
        // Bars-only: bar boundaries at every measure start AND the very
        // end of the timeline, so each measure visibly bookended.
        if (sub === 0) {
          const totalBarsB = Math.ceil(endSeconds / secondsPerBar);
          return Array.from({ length: totalBarsB + 1 }).map((_, b) => (
            <div
              key={`bar${b}`}
              className="absolute top-0 bottom-0 border-l border-amber-300/95 pointer-events-none"
              style={{ left: b * secondsPerBar * pxPerSecond }}
            />
          ));
        }
        const stepSec = secondsPerBeat * (4 / sub);
        const beatStride = sub / 4;             // steps per beat (may be < 1 for sub=2)
        const barStride = beatStride * numerator;
        const totalSteps = Math.ceil(endSeconds / stepSec);
        const lines = [];
        // Exclusive end (`<` not `<=`) so per-measure count equals the
        // subdivision name. The line at position `totalSteps` would be
        // the start of the bar after the last one — not part of any
        // existing measure.
        for (let i = 0; i < totalSteps; i++) {
          const isBar = Math.abs(i % barStride) < 1e-6;
          const isBeat = Math.abs(i % Math.max(beatStride, 1)) < 1e-6;
          const isEighth = sub >= 8 && Math.abs(i % (beatStride / 2)) < 1e-6;
          let cls = 'border-zinc-700/30';
          if (isEighth && !isBeat) cls = 'border-zinc-500/50';
          if (isBeat && !isBar) cls = 'border-zinc-300/85';
          if (isBar) cls = 'border-amber-300/95';
          lines.push(
            <div
              key={`tick${i}`}
              className={`absolute top-0 bottom-0 border-l pointer-events-none ${cls}`}
              style={{ left: i * stepSec * pxPerSecond }}
            />,
          );
        }
        return lines;
      })()}
      {/* Clips */}
      {isAudioTrack(track) && track.clips.map((c) => (
        <AudioClipBlock
          key={c.id} clip={c} session={session} trackColor={track.color}
          snapSeconds={snapSeconds}
          selected={selectedClip?.clipId === c.id}
          onSelect={() => onSelectClip({ trackId: track.id, clipId: c.id })}
          onChange={(patch) => onUpdate((t) => ({
            ...t, clips: (t as never as { clips: AudioClip[] }).clips
              .map((x) => x.id === c.id ? { ...x, ...patch } : x),
          } as Track))}
          onRemove={() => onUpdate((t) => ({
            ...t, clips: (t as never as { clips: AudioClip[] }).clips.filter((x) => x.id !== c.id),
          } as Track))}
          onDuplicate={() => onUpdate((t) => ({
            ...t, clips: [...(t as never as { clips: AudioClip[] }).clips, duplicateClip(c, crypto.randomUUID())],
          } as Track))}
        />
      ))}
      {isMidiTrack(track) && track.clips.map((c) => (
        <MidiClipBlock
          key={c.id} clip={c} trackColor={track.color}
          snapSeconds={snapSeconds}
          selected={selectedClip?.clipId === c.id}
          onSelect={() => onSelectClip({ trackId: track.id, clipId: c.id })}
          onChange={(patch) => onUpdate((t) => ({
            ...t, clips: (t as never as { clips: MidiClip[] }).clips
              .map((x) => x.id === c.id ? { ...x, ...patch } : x),
          } as Track))}
          onRemove={() => onUpdate((t) => ({
            ...t, clips: (t as never as { clips: MidiClip[] }).clips.filter((x) => x.id !== c.id),
          } as Track))}
          onDuplicate={() => onUpdate((t) => ({
            ...t, clips: [...(t as never as { clips: MidiClip[] }).clips, duplicateClip(c, crypto.randomUUID())],
          } as Track))}
        />
      ))}
    </div>
  );
}

// ── Live waveform overlay (visible only while recording an armed track) ──

function LiveWaveform({
  recording, trackColor,
}: { recording: RecordingSession; trackColor: string }) {
  const pxPerSecond = usePxPerSecond();
  const trackHeight = useTrackHeight();
  const left = recording.startSeconds * pxPerSecond;
  const elapsedSec = (performance.now() - recording.startWallMs) / 1000;
  const width = Math.max(4, elapsedSec * pxPerSecond);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor((trackHeight - 4) * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, trackHeight);
    ctx.fillStyle = `${trackColor}33`;
    ctx.fillRect(0, 0, width, trackHeight - 4);
    ctx.fillStyle = trackColor;
    const peaks = recording.peaks;
    const pixelsPerSample = width / Math.max(1, peaks.length);
    const mid = (trackHeight - 4) / 2;
    for (let i = 0; i < peaks.length; i++) {
      const h = Math.max(1, peaks[i] * (trackHeight - 8));
      const x = i * pixelsPerSample;
      ctx.fillRect(x, mid - h / 2, Math.max(1, pixelsPerSample), h);
    }
  });

  return (
    <div className="absolute top-1 rounded-sm border-2 pointer-events-none overflow-hidden shadow"
      style={{ left, width, height: trackHeight - 4, borderColor: trackColor, background: '#fff' }}>
      <canvas ref={canvasRef} style={{ width, height: trackHeight - 4 }} />
      <div className="absolute top-0.5 left-1 text-sm font-semibold" style={{ color: trackColor }}>
        ● REC {elapsedSec.toFixed(1)}s
      </div>
    </div>
  );
}

// ── Inspector (left rail, Logic-style) ───────────────────────────────

function Inspector({
  width, onWidthChange, session, selectedTrackId, update, onStripChange, onMasterStripChange,
}: {
  width: number;
  onWidthChange: (w: number) => void;
  session: Session;
  selectedTrackId: string | null;
  update: (mut: (s: Session) => Session) => void;
  /** Live engine mirror for track fader/pan/mute/solo — session `update`
   *  alone never reaches the running engine (strip fields are excluded
   *  from the skeleton sig by design). */
  onStripChange?: (trackId: string, p: { volume_db?: number; pan?: number; mute?: boolean; solo?: boolean }) => void;
  /** Same, for the Master Out strip. */
  onMasterStripChange?: (p: { volume_db?: number; pan?: number }) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const track = selectedTrackId ? session.tracks.find((t) => t.id === selectedTrackId) ?? null : null;

  const onResize = (e: React.PointerEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = width;
    const move = (ev: PointerEvent) => onWidthChange(startW + (ev.clientX - startX));
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  if (collapsed) {
    return (
      <button onClick={() => setCollapsed(false)}
        className="shrink-0 w-6 h-32 mt-7 bg-card border border-border rounded-r-md text-xs text-muted-foreground hover:bg-muted"
        style={{ writingMode: 'vertical-rl' }}
        title="Show inspector">
        Inspector
      </button>
    );
  }

  return (
    <div className="relative shrink-0 bg-card border border-border rounded-md p-2 space-y-2 text-sm"
      style={{ width }}
    >
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Inspector</div>
        <button
          onClick={() => setCollapsed(true)}
          title="Collapse Inspector"
          className="text-muted-foreground hover:text-foreground inline-flex items-center justify-center h-6 w-6 leading-none"
        >
          <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
        </button>
      </div>

      {track ? (
        <ChannelStrip
          label={`Track ${session.tracks.indexOf(track) + 1} · ${track.name}`}
          color={track.color}
          volumeDb={track.volume_db} pan={track.pan}
          mute={track.mute} solo={track.solo}
          onVolume={(v) => {
            update((s) => ({
              ...s, tracks: s.tracks.map((t) => t.id === track.id ? { ...t, volume_db: v } as Track : t),
            }));
            onStripChange?.(track.id, { volume_db: v });
          }}
          onPan={(p) => {
            update((s) => ({
              ...s, tracks: s.tracks.map((t) => t.id === track.id ? { ...t, pan: p } as Track : t),
            }));
            onStripChange?.(track.id, { pan: p });
          }}
          onMute={() => {
            update((s) => ({
              ...s, tracks: s.tracks.map((t) => t.id === track.id ? { ...t, mute: !t.mute } as Track : t),
            }));
            onStripChange?.(track.id, { mute: !track.mute });
          }}
          onSolo={() => {
            update((s) => ({
              ...s, tracks: s.tracks.map((t) => t.id === track.id ? { ...t, solo: !t.solo } as Track : t),
            }));
            onStripChange?.(track.id, { solo: !track.solo });
          }}
        />
      ) : (
        <div className="text-xs text-muted-foreground italic px-1">Click a clip to select its track.</div>
      )}

      <div className="border-t border-border pt-2">
        <MicLevelTester />
      </div>

      <div className="border-t border-border pt-2">
        <ChannelStrip
          label="Master Out"
          color="#6b7280"
          volumeDb={session.master.volume_db}
          pan={session.master.pan}
          mute={false} solo={false}
          onVolume={(v) => {
            update((s) => ({ ...s, master: { ...s.master, volume_db: v } }));
            onMasterStripChange?.({ volume_db: v });
          }}
          onPan={(p) => {
            update((s) => ({ ...s, master: { ...s.master, pan: p } }));
            onMasterStripChange?.({ pan: p });
          }}
          onMute={() => { /* master no mute */ }}
          onSolo={() => { /* master no solo */ }}
          hideMS
        />
      </div>

      {/* Right-edge resize handle */}
      <div
        onPointerDown={onResize}
        className="absolute top-0 bottom-0 right-0 w-1.5 cursor-ew-resize hover:bg-primary/20"
        title="Drag to resize Inspector"
      />
    </div>
  );
}

function ChannelStrip({
  label, color, volumeDb, pan, mute, solo, onVolume, onPan, onMute, onSolo, hideMS,
}: {
  label: string; color: string;
  volumeDb: number; pan: number;
  mute: boolean; solo: boolean;
  onVolume: (v: number) => void; onPan: (p: number) => void;
  onMute: () => void; onSolo: () => void;
  hideMS?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <div className="w-2 h-2 rounded" style={{ backgroundColor: color }} />
        <div className="font-semibold truncate text-sm">{label}</div>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Volume2 className="w-4 h-4" />
        <span className="w-10 tabular-nums text-right">{volumeDb.toFixed(1)} dB</span>
      </div>
      <input type="range" min={-40} max={6} step={0.5} value={volumeDb}
        onChange={(e) => onVolume(Number(e.target.value))} className="w-full h-1 accent-primary" />
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {/* Pan (stereo balance), NOT a separate headphones output. Was a
            Headphones icon that misled users into thinking there was a
            second output; there isn't — everything routes to the single
            destination. -1 = hard left, 0 = center, +1 = hard right. */}
        <MoveHorizontal className="w-4 h-4" />
        <span className="text-[10px] font-semibold uppercase tracking-wider">Pan</span>
        <span className="w-10 tabular-nums text-right ml-auto">{pan.toFixed(2)}</span>
      </div>
      <input type="range" min={-1} max={1} step={0.05} value={pan}
        onChange={(e) => onPan(Number(e.target.value))} className="w-full h-1 accent-primary" />
      {!hideMS && (
        <div className="flex gap-1">
          <button onClick={onMute}
            className={`flex-1 text-sm font-bold py-0.5 rounded border ${mute ? 'bg-amber-400 border-amber-400 text-amber-950' : 'bg-muted border-border text-muted-foreground'}`}>M</button>
          <button onClick={onSolo}
            className={`flex-1 text-sm font-bold py-0.5 rounded border ${solo ? 'bg-yellow-400 border-yellow-400 text-yellow-950' : 'bg-muted border-border text-muted-foreground'}`}>S</button>
        </div>
      )}
    </div>
  );
}

// ── Mic level tester (Inspector widget) ─────────────────────────────
//
// Opens the user's chosen mic, polls a Tone.Meter for live peak dB,
// renders a horizontal VU with a slow-decay peak-hold tick. Lets the
// user verify their mic is reaching the engine BEFORE arming a record.

function MicLevelTester() {
  const [running, setRunning] = useState(false);
  const [peakDb, setPeakDb] = useState(-Infinity);
  const [holdDb, setHoldDb] = useState(-Infinity);
  // Session MAX — monotonic, never decays until Test is (re)started.
  // The decaying `holdDb` tick was too fleeting to read "how hot did I
  // actually get" on a phone ("not enough to tell your max input level",
  // 2026-07-07). This is the number you set your gain by.
  const [maxDb, setMaxDb] = useState(-Infinity);
  const [error, setError] = useState<string | null>(null);
  const [inputGainDb, setInputGainDb] = useState<number>(() =>
    Number(localStorage.getItem('studio.micInputGainDb') || 0),
  );
  const recRef = useRef<MicRecorder | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastHoldUpdateRef = useRef(0);
  useEffect(() => {
    localStorage.setItem('studio.micInputGainDb', String(inputGainDb));
    // While the meter is running, push the new gain into the live recorder.
    recRef.current?.setInputGain(inputGainDb);
  }, [inputGainDb]);

  const stop = () => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    try { recRef.current?.dispose(); } catch { /* ignore */ }
    recRef.current = null;
    setRunning(false);
    setPeakDb(-Infinity);
    setHoldDb(-Infinity);
  };

  const start = async () => {
    setError(null);
    setMaxDb(-Infinity); // fresh session max
    try {
      const deviceId = localStorage.getItem('studio.inputDeviceId') || '';
      const channelIndex = Number(localStorage.getItem('studio.inputChannelIndex') || 0) || 0;
      const rec = await openMicRecorder({ inputDeviceId: deviceId, channelIndex, monitorGain: 0, inputGainDb });
      recRef.current = rec;
      setRunning(true);
      // Drive the meter directly off the raw waveform analyser samples
      // instead of Tone.Meter — Tone.Meter is RMS+smoothed, which masks
      // the fast transients of speech / claps and feels laggy. Reading
      // peak(|x|) per frame gives instant response.
      const tick = () => {
        const wave = rec.getWaveform();
        let peakLin = 0;
        for (let i = 0; i < wave.length; i++) {
          const a = Math.abs(wave[i]);
          if (a > peakLin) peakLin = a;
        }
        const db = peakLin > 0 ? 20 * Math.log10(peakLin) : -Infinity;
        setPeakDb(db);
        if (isFinite(db)) setMaxDb((prev) => (db > prev ? db : prev));
        const now = performance.now();
        setHoldDb((prev) => {
          if (db > prev) return db;
          const elapsed = (now - lastHoldUpdateRef.current) / 1000;
          return Math.max(-60, prev - 12 * elapsed);
        });
        lastHoldUpdateRef.current = now;
        rafRef.current = requestAnimationFrame(tick);
      };
      lastHoldUpdateRef.current = performance.now();
      rafRef.current = requestAnimationFrame(tick);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setRunning(false);
    }
  };

  useEffect(() => () => stop(), []);

  // dB → 0..1 across the visible -60..+6 range.
  const dbToPct = (db: number) => {
    if (!isFinite(db)) return 0;
    return Math.max(0, Math.min(1, (db + 60) / 66));
  };
  const fillPct = dbToPct(peakDb) * 100;
  const holdPct = dbToPct(holdDb) * 100;
  // Color zones — green (safe), amber (~ -12 to -3), red (above -3).
  const fillColor = peakDb >= -3 ? 'bg-rose-500' : peakDb >= -12 ? 'bg-amber-400' : 'bg-emerald-500';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="font-semibold text-sm inline-flex items-center gap-1.5">
          <Mic className="w-4 h-4" /> Mic Level
        </div>
        <button
          onClick={running ? stop : start}
          className={`text-xs font-bold px-1.5 py-0.5 rounded border ${running ? 'bg-rose-500 border-rose-500 text-white' : 'bg-muted border-border text-muted-foreground hover:bg-muted/70'}`}
          title={running ? 'Stop the meter (releases the mic)' : 'Open the mic + start metering'}
        >
          {running ? 'Stop' : 'Test'}
        </button>
      </div>
      {/* VU bar */}
      <div className="relative h-3 bg-muted/40 border border-border rounded overflow-hidden">
        <div
          className={`absolute left-0 top-0 bottom-0 transition-[width] duration-75 ${fillColor}`}
          style={{ width: `${fillPct}%` }}
        />
        {/* Peak hold tick (decaying) */}
        {running && isFinite(holdDb) && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-foreground/80 pointer-events-none"
            style={{ left: `calc(${holdPct}% - 1px)` }}
          />
        )}
        {/* Session MAX tick — non-decaying, the level to set gain by. */}
        {running && isFinite(maxDb) && (
          <div
            className={`absolute top-0 bottom-0 w-1 pointer-events-none ${maxDb >= -3 ? 'bg-rose-600' : 'bg-primary'}`}
            style={{ left: `calc(${dbToPct(maxDb) * 100}% - 1.5px)` }}
            title={`Max: ${maxDb.toFixed(1)} dB`}
          />
        )}
        {/* dB ruler — small dashes at -60, -40, -20, -12, -3, 0 */}
        {[-40, -20, -12, -3, 0].map((db) => (
          <div key={db}
            className="absolute top-0 bottom-0 w-px bg-foreground/15 pointer-events-none"
            style={{ left: `${dbToPct(db) * 100}%` }}
          />
        ))}
      </div>
      <div className="flex items-center justify-between text-sm text-muted-foreground tabular-nums">
        <span>-60</span>
        <span>-12</span>
        <span>-3</span>
        <span>0 dB</span>
      </div>
      <div className="text-xs tabular-nums flex items-center justify-between gap-2">
        {running
          ? <>
              <span>Peak: <span className="font-mono">{isFinite(peakDb) ? peakDb.toFixed(1) : '−∞'}</span> dB</span>
              <span className={`font-semibold ${isFinite(maxDb) && maxDb >= -3 ? 'text-rose-600' : 'text-foreground'}`}>
                Max: <span className="font-mono">{isFinite(maxDb) ? maxDb.toFixed(1) : '−∞'}</span> dB
                {isFinite(maxDb) && maxDb >= -1 && <span className="ml-1 text-rose-600">CLIP!</span>}
              </span>
            </>
          : <span className="text-muted-foreground italic">Tap Test to verify mic input.</span>}
      </div>
      {/* Input gain — applied to recordings too, persisted to localStorage. */}
      <div className="border-t border-border pt-1.5 space-y-0.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold inline-flex items-center gap-1">
            <Volume2 className="w-4 h-4" /> Input gain
          </span>
          <span className="font-mono tabular-nums">{inputGainDb > 0 ? '+' : ''}{inputGainDb.toFixed(1)} dB</span>
        </div>
        <div className="flex items-center gap-1.5">
          <input
            type="range" min={-24} max={24} step={0.5} value={inputGainDb}
            onChange={(e) => setInputGainDb(Number(e.target.value))}
            className="flex-1 h-1 accent-primary"
            title="Boost or cut the mic signal before it reaches the meter and the recorder"
          />
          <button
            onClick={() => setInputGainDb(0)}
            className="text-xs font-semibold px-1.5 py-0.5 rounded border border-border bg-muted hover:bg-muted/70 tabular-nums"
            title="Reset to unity (0 dB)"
          >0</button>
        </div>
      </div>
      {/* Recording latency comp — pulls recorded clips earlier by this
       * many ms to counter the browser's mic-capture pipeline delay. */}
      <RecordingLatencyControl />
      {/* MIDI recording offset — compensates for MIDI input latency and
       * allows fine-tuning where recorded MIDI notes land relative to audio. */}
      <MidiLatencyControl />
      {error && (
        <div className="text-xs text-rose-600 break-words">{error}</div>
      )}
    </div>
  );
}

function RecordingLatencyControl() {
  // Native keeps the legacy semantics (one configured trim covers
  // everything). Web now measures startup per take, so its dial covers
  // only hardware I/O residual — different key, much smaller default.
  // Mount-stable: isNativePlatform() is settled before first render, and
  // freezing key/default here means the write effect can never fire from
  // a key flip and clobber the other platform's calibrated value.
  const [{ storageKey, defaultMs }] = useState(() => {
    const isNative = Capacitor.isNativePlatform();
    return {
      storageKey: isNative ? 'studio.inputLatencyMs' : 'studio.deviceLatencyMs',
      defaultMs: isNative ? DEFAULT_INPUT_LATENCY_MS : DEFAULT_DEVICE_LATENCY_MS,
    };
  });
  const [ms, setMs] = useState<number>(() => {
    const raw = localStorage.getItem(storageKey);
    return raw !== null ? Number(raw) : defaultMs;
  });
  useEffect(() => {
    localStorage.setItem(storageKey, String(ms));
  }, [ms, storageKey]);
  return (
    <div className="border-t border-border pt-1.5 space-y-0.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold inline-flex items-center gap-1">
          <Timer className="w-4 h-4" /> Latency comp
        </span>
        <span className="font-mono tabular-nums">{ms} ms</span>
      </div>
      <div className="flex items-center gap-1.5">
        <input
          type="range" min={0} max={1500} step={10} value={ms}
          onChange={(e) => setMs(Number(e.target.value))}
          className="flex-1 h-1 accent-primary"
          title="Shifts every new recording earlier by this many ms. Higher = clip moves further left."
        />
        <button
          onClick={() => setMs(defaultMs)}
          className="text-xs font-semibold px-1.5 py-0.5 rounded border border-border bg-muted hover:bg-muted/70 tabular-nums"
          title={`Reset to default (${defaultMs} ms)`}
        >R</button>
      </div>
      <div className="text-[10px] text-muted-foreground italic">
        {Capacitor.isNativePlatform()
          ? 'Increase if takes land late, decrease if early. Use Snap to beat on a clip after a take.'
          : 'Covers mic/speaker hardware latency only — startup delay is measured automatically per take. Increase if takes still land late.'}
      </div>
    </div>
  );
}

function MidiLatencyControl() {
  const [trim, setTrim] = useState<number>(() => getMidiTrimMs());
  // Auto value read once for display — the actual per-take value is
  // sampled at record start (midiCompSecRef in startRecording).
  const [autoMs] = useState(() => Math.round(getOutputLatencyMs()));
  useEffect(() => { localStorage.setItem(MIDI_TRIM_STORAGE_KEY, String(trim)); }, [trim]);
  return (
    <div className="border-t border-border pt-1.5 space-y-0.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold inline-flex items-center gap-1">
          <Timer className="w-4 h-4" /> MIDI recording offset
        </span>
        <span className="font-mono tabular-nums">auto {autoMs} + trim {trim} ms</span>
      </div>
      <div className="flex items-center gap-1.5">
        <input
          type="range" min={-100} max={100} step={5} value={trim}
          onChange={(e) => setTrim(Number(e.target.value))}
          className="flex-1 h-1 accent-primary"
          title="Fine-tunes where recorded MIDI notes land. Positive = notes move earlier."
        />
        <button
          onClick={() => setTrim(0)}
          className="text-xs font-semibold px-1.5 py-0.5 rounded border border-border bg-muted hover:bg-muted/70 tabular-nums"
          title="Reset trim to 0 ms"
        >R</button>
      </div>
      <div className="text-[10px] text-muted-foreground italic">
        Auto compensation is measured each take. Add trim if recorded notes still sit late against the click; go negative if they land early.
      </div>
    </div>
  );
}

// ── Smart Controls (bottom drawer, Logic-style) ─────────────────────

function SmartControls({
  session, selectedTrackId, update,
}: {
  session: Session;
  selectedTrackId: string | null;
  update: (mut: (s: Session) => Session) => void;
}) {
  // Default closed on phones so it doesn't eat the small viewport's
  // vertical space — users tap the chevron when they want FX.
  const [open, setOpen] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 640 : true,
  );
  const [tab, setTab] = useState<'track' | 'master'>('track');
  const track = selectedTrackId ? session.tracks.find((t) => t.id === selectedTrackId) ?? null : null;
  const showTrack = tab === 'track';

  const addFx = (type: FxType) => update((s) => {
    if (showTrack && track) {
      return { ...s, tracks: s.tracks.map((t) => t.id === track.id ? { ...t, fx: [...t.fx, newFxNode(type)] } as Track : t) };
    }
    return { ...s, master: { ...s.master, fx: [...s.master.fx, newFxNode(type)] } };
  });
  const removeFx = (id: string) => update((s) => {
    if (showTrack && track) {
      return { ...s, tracks: s.tracks.map((t) => t.id === track.id ? { ...t, fx: t.fx.filter((f) => f.id !== id) } as Track : t) };
    }
    return { ...s, master: { ...s.master, fx: s.master.fx.filter((f) => f.id !== id) } };
  });
  const updateFx = (id: string, patch: Partial<FxNode>) => update((s) => {
    if (showTrack && track) {
      return { ...s, tracks: s.tracks.map((t) => t.id === track.id ? { ...t, fx: t.fx.map((f) => f.id === id ? { ...f, ...patch } : f) } as Track : t) };
    }
    return { ...s, master: { ...s.master, fx: s.master.fx.map((f) => f.id === id ? { ...f, ...patch } : f) } };
  });

  const fxList = showTrack ? (track?.fx ?? []) : session.master.fx;

  return (
    <div className="bg-card border border-border rounded-md">
      <div className="px-3 py-1.5 border-b border-border flex items-center gap-2 text-sm">
        <button onClick={() => setOpen(!open)} className="text-muted-foreground hover:text-foreground">
          {open ? '▾' : '▸'}
        </button>
        <span className="font-semibold uppercase tracking-wide text-muted-foreground">Smart Controls</span>
        <div className="flex gap-1 ml-2">
          <button onClick={() => setTab('track')}
            className={`px-2 py-0.5 rounded text-xs ${tab === 'track' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}>
            Track {track ? `· ${track.name}` : ''}
          </button>
          <button onClick={() => setTab('master')}
            className={`px-2 py-0.5 rounded text-xs ${tab === 'master' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}>
            Master
          </button>
        </div>
        {showTrack && !track && (
          <span className="text-xs text-muted-foreground italic ml-2">Click a clip to inspect its track.</span>
        )}
      </div>
      {open && (
        <div className="p-3 space-y-2">
          {(showTrack && !track) ? (
            <div className="text-xs text-muted-foreground py-4 text-center">No track selected.</div>
          ) : fxList.length === 0 ? (
            <div className="text-xs text-muted-foreground py-4 text-center">No FX yet — add one below.</div>
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {fxList.map((fx) => (
                <li key={fx.id}>
                  <FxNodeEditor fx={fx}
                    onChange={(p) => updateFx(fx.id, p)}
                    onRemove={() => removeFx(fx.id)}
                  />
                </li>
              ))}
            </ul>
          )}
          <select
            className="text-sm border border-border rounded px-2 py-1 bg-background w-full max-w-sm"
            value=""
            onChange={(e) => {
              if (!e.target.value) return;
              addFx(e.target.value as FxType);
              e.target.value = '';
            }}
            disabled={showTrack && !track}
          >
            <option value="">+ Add FX…</option>
            {FX_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
      )}
    </div>
  );
}

// ── Audio settings (input + output device picker) ────────────────────
//
// Browsers expose enumerateDevices() once microphone permission has
// been granted; before that we can only see device labels as empty
// strings. We therefore prompt for permission the first time the
// dropdown opens. Choices persist to localStorage and are applied:
//   • Input: passed to openMicRecorder({ inputDeviceId }) on next record
//   • Output: setSinkId() on the engine's main output element (Chrome
//     only; Safari + Firefox don't yet support setSinkId on Web Audio)

// ── MIDI Clock sync (web only) ───────────────────────────────────────
//
// Follows the engine transport: Play → SPP + Start/Continue + 24 PPQ
// clock to the chosen Web MIDI output; Stop → MIDI Stop; tempo edits
// retime the stream live. Feature-detected — browsers without Web MIDI
// (Safari, Firefox) simply never show the controls.

const midiAccessSupported = typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator;

function useMidiClockSync(state: EngineState | null, transportTick: TransportTickStore, enabled: boolean, outputId: string) {
  const senderRef = useRef<MidiClockSender | null>(null);

  useEffect(() => {
    if (!enabled || !midiAccessSupported) return;
    let cancelled = false;
    (navigator as Navigator & { requestMIDIAccess: () => Promise<MIDIAccess> })
      .requestMIDIAccess()
      .then((access) => {
        if (cancelled) return;
        const outs = [...access.outputs.values()];
        const out = outs.find((o) => o.id === outputId) ?? outs[0];
        if (!out) { toast.info('MIDI sync is on, but no MIDI output device was found.'); return; }
        senderRef.current = new MidiClockSender(out, 120);
      })
      .catch(() => toast.error('MIDI access was denied — sync stays off.'));
    return () => {
      cancelled = true;
      senderRef.current?.stop();
      senderRef.current?.dispose();
      senderRef.current = null;
    };
  }, [enabled, outputId]);

  useEffect(() => {
    const sender = senderRef.current;
    if (!sender) return;
    if (state?.tempoBpm) sender.setBpm(state.tempoBpm);
    // Live position comes from the tick store — `state` is discrete-only
    // now, and isPlaying/tempo flips are exactly when we need to act.
    if (state?.isPlaying && !sender.running) sender.start(transportTick.get().positionSeconds);
    else if (!state?.isPlaying && sender.running) sender.stop();
  }, [state?.isPlaying, state?.tempoBpm, enabled, transportTick]);
}

interface MidiSyncProps {
  enabled: boolean;
  setEnabled: (v: boolean) => void;
  outputId: string;
  setOutputId: (v: string) => void;
}

function MidiSyncSection({ enabled, setEnabled, outputId, setOutputId }: MidiSyncProps) {
  const [outs, setOuts] = useState<Array<{ id: string; name: string }>>([]);
  useEffect(() => {
    if (!enabled || !midiAccessSupported) return;
    (navigator as Navigator & { requestMIDIAccess: () => Promise<MIDIAccess> })
      .requestMIDIAccess()
      .then((access) => setOuts([...access.outputs.values()].map((o) => ({ id: o.id, name: o.name ?? o.id }))))
      .catch(() => { /* denied — the sync hook already toasts */ });
  }, [enabled]);

  if (!midiAccessSupported) return null;
  return (
    <div className="border-t border-border pt-2">
      <Label className="text-xs font-semibold">Synchronization — MIDI Clock out</Label>
      <p className="text-xs text-muted-foreground mb-1.5">
        Sends Start/Stop + 24 PPQ MIDI Clock to a MIDI output so hardware
        and other DAWs follow this transport. (Ableton Link and SMPTE
        chase aren't possible in a browser.)
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setEnabled(!enabled)}
          className={`h-8 px-3 rounded border text-sm font-bold ${enabled ? 'bg-sky-500 border-sky-500 text-white' : 'bg-muted border-border text-muted-foreground hover:bg-muted/70'}`}
        >
          {enabled ? 'On' : 'Off'}
        </button>
        {enabled && (
          <select value={outputId} onChange={(e) => setOutputId(e.target.value)}
            className="flex-1 h-8 bg-background border border-border rounded px-2 text-sm">
            <option value="">First available output</option>
            {outs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        )}
      </div>
    </div>
  );
}

interface MidiInputProps {
  enabled: boolean;
  setEnabled: (v: boolean) => void;
  deviceId: string;
  setDeviceId: (v: string) => void;
  inputs: { id: string; name: string }[];
  status: 'idle' | 'connected' | 'denied';
  supported: boolean;
  targetTrackName?: string;
}

function MidiInputSection({ enabled, setEnabled, deviceId, setDeviceId, inputs, status, supported, targetTrackName }: MidiInputProps) {
  if (!supported) return null;
  return (
    <div className="border-t border-border pt-2">
      <Label className="text-xs font-semibold">MIDI keyboard — play &amp; record</Label>
      <p className="text-xs text-muted-foreground mb-1.5">
        Plays the armed MIDI track&apos;s instrument live, and records into its clip while the transport is recording.{' '}
        {targetTrackName
          ? <>Input goes to <span className="font-medium">“{targetTrackName}”</span>.</>
          : 'Add a MIDI track and arm it (red R) to receive input.'}
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setEnabled(!enabled)}
          className={`h-8 px-3 rounded border text-sm font-bold ${enabled ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-muted border-border text-muted-foreground hover:bg-muted/70'}`}
        >
          {enabled ? 'On' : 'Off'}
        </button>
        {enabled && (
          <select value={deviceId} onChange={(e) => setDeviceId(e.target.value)}
            className="flex-1 h-8 bg-background border border-border rounded px-2 text-sm">
            <option value="">All MIDI inputs</option>
            {inputs.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
        )}
      </div>
      {enabled && getMidiInputSource().kind === 'native' && (
        <button
          onClick={() => {
            void getMidiInputSource().showBluetoothPairing().then((ok) => {
              if (!ok) toast.error('Could not open Bluetooth MIDI pairing.');
            });
          }}
          className="mt-1.5 h-8 px-3 rounded border text-sm bg-muted border-border text-muted-foreground hover:bg-muted/70"
        >
          Pair Bluetooth MIDI…
        </button>
      )}
      {enabled && status === 'denied' && <p className="text-xs text-red-500 mt-1">MIDI access was denied — check MIDI permissions and try again.</p>}
      {enabled && status === 'connected' && inputs.length === 0 && <p className="text-xs text-muted-foreground mt-1">No MIDI inputs found — plug in a keyboard.</p>}
    </div>
  );
}

function AudioSettingsButton({ midiSync, midiInput }: { midiSync?: MidiSyncProps; midiInput?: MidiInputProps }) {
  const [open, setOpen] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [inputId, setInputId] = useState<string>(() => localStorage.getItem('studio.inputDeviceId') || '');
  const [outputId, setOutputId] = useState<string>(() => localStorage.getItem('studio.outputDeviceId') || '');
  // Zero-based interface input to record from (0 = Input 1). Stored as
  // string in localStorage; parsed on read. Applies globally to the next
  // recording — matches Logic's "input source" per-track, but scoped to
  // one recorder at a time.
  const [channelIndex, setChannelIndexState] = useState<number>(() => {
    const raw = localStorage.getItem('studio.inputChannelIndex');
    const n = raw !== null ? Number(raw) : 0;
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  });
  // How many channels the currently selected device reports as available
  // (via getCapabilities). Filled by probeChannelCount when the device
  // changes; defaults to 2 so the picker isn't confusingly empty.
  const [deviceChannelCount, setDeviceChannelCount] = useState<number>(2);

  const refresh = async () => {
    try {
      // Trigger permission so device labels populate.
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      const list = await navigator.mediaDevices.enumerateDevices();
      setDevices(list.filter((d) => d.kind === 'audioinput' || d.kind === 'audiooutput'));
      // Probe the currently-saved input so the channel picker knows how
      // many options to show on first open of the dialog.
      void probeChannelCount(inputId);
    } catch (e) {
      toast.error('Could not enumerate audio devices', { description: e instanceof Error ? e.message : String(e) });
    }
  };

  // Ask the device how many input channels it exposes. Chrome routinely
  // reports getSettings().channelCount = 2 even when the interface
  // supports 8 (it treats the constraint as a ceiling, not a request),
  // so we prefer getCapabilities().channelCount.max — the TRUE device
  // max — and only fall back to getSettings when capabilities aren't
  // exposed. Then we retry the open with the higher count so downstream
  // recording actually gets those channels.
  const probeChannelCount = async (deviceId: string) => {
    try {
      const constraints: MediaTrackConstraints = { channelCount: 8 };
      if (deviceId && deviceId !== 'default') {
        (constraints as { deviceId?: ConstrainDOMString }).deviceId = { exact: deviceId };
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: constraints });
      const track = stream.getAudioTracks()[0];
      const caps = track?.getCapabilities?.();
      const capMax = caps?.channelCount?.max;
      const negotiated = track?.getSettings().channelCount;
      // Prefer the device's advertised max; if capabilities are missing
      // (Safari, Firefox), fall back to what we negotiated.
      const actual = (typeof capMax === 'number' && capMax > 0)
        ? capMax
        : (typeof negotiated === 'number' && negotiated > 0 ? negotiated : 2);
      // eslint-disable-next-line no-console
      console.log('[studio] channel probe', { deviceId, capMax, negotiated, chose: actual });
      stream.getTracks().forEach((t) => t.stop());
      setDeviceChannelCount(Math.min(Math.max(actual, 1), 8));
    } catch (e) {
      // OverconstrainedError, permission denied, etc. — stay at stereo
      // and let the user proceed. If the device really only has 2 the
      // splitter clamps gracefully anyway.
      // eslint-disable-next-line no-console
      console.warn('[studio] channel probe failed', e);
      setDeviceChannelCount(2);
    }
  };

  const onPickInput = (id: string) => {
    setInputId(id);
    localStorage.setItem('studio.inputDeviceId', id);
    // Reset channel selection when the device changes — Input 5 on
    // Apollo means nothing on the MacBook mic.
    setChannelIndexState(0);
    localStorage.setItem('studio.inputChannelIndex', '0');
    void probeChannelCount(id);
    toast.success(`Input set — next recording will use this device.`);
  };

  const onPickChannel = (idx: number) => {
    setChannelIndexState(idx);
    localStorage.setItem('studio.inputChannelIndex', String(idx));
    toast.success(`Recording from Input ${idx + 1} on next take.`);
  };
  const onPickOutput = async (id: string) => {
    setOutputId(id);
    localStorage.setItem('studio.outputDeviceId', id);
    // Apply to the global destination element if supported.
    try {
      // @ts-expect-error setSinkId is non-standard but widely supported on Chrome.
      const dest = (window as never as { __toneDestination?: HTMLAudioElement }).__toneDestination;
      if (dest && 'setSinkId' in dest) await (dest as { setSinkId: (id: string) => Promise<void> }).setSinkId(id);
      toast.success('Output device updated');
    } catch (e) {
      toast.warning('Output device picking not supported in this browser');
    }
  };

  const inputs = devices.filter((d) => d.kind === 'audioinput');
  const outputs = devices.filter((d) => d.kind === 'audiooutput');

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) refresh(); }}>
      <button
        onClick={() => setOpen(true)}
        title="Audio settings — devices + recording latency"
        className="h-7 px-2 inline-flex items-center gap-1 rounded border border-border bg-background hover:bg-muted text-sm font-medium"
      >
        <SettingsIcon className="w-3.5 h-3.5" />
        Settings
      </button>
      <DialogContent>
        <DialogHeader><DialogTitle>Audio settings</DialogTitle></DialogHeader>
        <div className="space-y-3 text-sm">
          {/* Latency control — front and center because it's the
           * setting the user is most likely to want to tune. */}
          <div className="bg-muted/40 border border-border rounded p-2">
            <Label className="text-xs font-semibold">Recording latency compensation</Label>
            <p className="text-xs text-muted-foreground mb-1.5">
              Shifts each recorded clip earlier by this many ms to counter
              the browser's mic-capture delay. Typical: <strong>100–200 ms</strong>
              {' '}wired, <strong>200–350 ms</strong> Bluetooth.
            </p>
            <LatencyControl />
          </div>
          <div>
            <Label className="text-xs">Microphone (input)</Label>
            <select value={inputId} onChange={(e) => onPickInput(e.target.value)}
              className="w-full h-8 bg-background border border-border rounded px-2 text-sm">
              <option value="">Browser default</option>
              {inputs.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Microphone (${d.deviceId.slice(0, 6)}…)`}
                </option>
              ))}
            </select>
          </div>
          {/* Channel picker — hidden on plain 1-2 channel devices where
              there's nothing to pick between. Numbered from 1 to match
              the physical panel labeling of Apollo/MOTU/etc. interfaces. */}
          {deviceChannelCount > 2 && (
            <div>
              <Label className="text-xs">Interface input channel</Label>
              <select value={channelIndex} onChange={(e) => onPickChannel(Number(e.target.value))}
                className="w-full h-8 bg-background border border-border rounded px-2 text-sm">
                {Array.from({ length: deviceChannelCount }, (_, i) => (
                  <option key={i} value={i}>Input {i + 1}</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-0.5">
                Which physical input on your interface to record — like Logic's input
                source. Requires Chrome/Edge on macOS; Safari caps at Input 1–2.
              </p>
            </div>
          )}
          <div>
            <Label className="text-xs">Speakers / headphones (output)</Label>
            <select value={outputId} onChange={(e) => onPickOutput(e.target.value)}
              className="w-full h-8 bg-background border border-border rounded px-2 text-sm">
              <option value="">System default</option>
              {outputs.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Speaker (${d.deviceId.slice(0, 6)}…)`}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-0.5">
              Output picker is Chromium-only — other browsers stay on system default.
            </p>
          </div>
          <div className="border-t border-border pt-2">
            <Label className="text-xs">Test output</Label>
            <p className="text-xs text-muted-foreground mb-1.5">
              Plays a 1-second 440 Hz beep through the selected speakers. If you
              don't hear it, the audio context is locked or muted.
            </p>
            <Button size="sm" variant="outline" onClick={async () => {
              try {
                // Use the bare Web Audio API so we know we're not at the mercy
                // of any Tone routing. This proves whether speakers are reachable.
                const ctx = new (window.AudioContext || (window as never as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
                await ctx.resume();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.frequency.value = 440;
                gain.gain.setValueAtTime(0.2, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1);
                osc.connect(gain); gain.connect(ctx.destination);
                osc.start(); osc.stop(ctx.currentTime + 1);
                setTimeout(() => ctx.close(), 1100);
                toast.success('Beep sent — if you heard nothing, your output device is muted/wrong');
              } catch (e) {
                toast.error('Test tone failed', { description: e instanceof Error ? e.message : String(e) });
              }
            }}>
              🔊 Play test beep
            </Button>
          </div>
          {midiSync && <MidiSyncSection {...midiSync} />}
          {midiInput && <MidiInputSection {...midiInput} />}
          <div className="flex items-center justify-between gap-2 pt-2">
            {/* CC-BY attribution for the premium instrument sample libraries. */}
            <a
              href="/studio-sound-credits.html"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-muted-foreground underline hover:text-foreground"
            >
              Sound credits
            </a>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={refresh}>Refresh device list</Button>
              <Button size="sm" onClick={() => setOpen(false)}>Done</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Read the user's preferred mic device id (empty string = default). */
export function getPreferredInputDeviceId(): string {
  return localStorage.getItem('studio.inputDeviceId') || '';
}

// ── Scrub button — free-time rewind / fast-forward ───────────────────
//
// Single click nudges by 0.25 seconds. Press-and-hold scrubs the
// timeline continuously at ~4 seconds of timeline per second of real
// time (smooth, controllable). Release to stop.

function ScrubButton({
  direction, getPosition, max, onSeek, icon, title, className,
}: {
  direction: 1 | -1;
  getPosition: () => number;
  max: number;
  onSeek: (s: number) => void;
  icon: React.ReactNode;
  title: string;
  className?: string;
}) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const nudge = (delta: number) => {
    const next = Math.max(0, Math.min(max, getPosition() + delta));
    onSeek(next);
  };

  const startScrub = () => {
    // Immediate small nudge so a quick tap moves the playhead at all.
    nudge(direction * 0.25);
    if (intervalRef.current !== null) return;
    // Shuttle acceleration: the longer the hold, the faster the scrub
    // (~4×/s → ~12×/s → ~30×/s), like leaning on a jog wheel.
    const heldSince = performance.now();
    intervalRef.current = setInterval(
      () => nudge(direction * shuttleStepSeconds(performance.now() - heldSince)),
      20,
    );
  };
  const stopScrub = () => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // Clean up if the component unmounts mid-scrub.
  useEffect(() => () => stopScrub(), []);

  return (
    <button
      onPointerDown={(e) => { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); startScrub(); }}
      onPointerUp={(e) => { try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* ignore */ } stopScrub(); }}
      onPointerCancel={stopScrub}
      onPointerLeave={stopScrub}
      className={`h-8 w-8 sm:h-9 sm:w-9 rounded bg-muted border border-border hover:bg-muted/70 flex items-center justify-center ${className ?? ''}`}
      title={title}
    >
      {icon}
    </button>
  );
}

function LatencyControl() {
  const [value, setValue] = useState<number>(() =>
    Number(localStorage.getItem('studio.inputLatencyMs') || 700),
  );
  useEffect(() => {
    localStorage.setItem('studio.inputLatencyMs', String(value));
  }, [value]);
  return (
    <div className="flex items-center gap-2">
      <input
        type="range" min={0} max={1500} step={10} value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="flex-1 h-1 accent-primary"
      />
      <input
        type="number" min={0} max={1500} step={10} value={value}
        onChange={(e) => setValue(Math.max(0, Math.min(1500, Number(e.target.value) || 0)))}
        className="w-20 h-7 bg-background border border-border rounded text-center text-sm tabular-nums"
      />
      <span className="text-sm text-muted-foreground">ms</span>
    </div>
  );
}
