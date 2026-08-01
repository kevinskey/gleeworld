// Web Audio engine for the practice player.
//
// Graph: stem AudioBufferSourceNodes (playbackRate = tempo, which shifts
// pitch) -> per-part GainNodes -> sum GainNode -> ONE signalsmith-stretch
// AudioWorklet in live-input mode compensating pitch by -12*log2(rate)
// semitones -> destination. Per-part mixing stays live and tempo costs a
// single worklet regardless of part count. Count-in clicks bypass the
// stretch node (they should not be pitch-shifted or add latency).
import SignalsmithStretch from 'signalsmith-stretch';
import type { PartTrackManifest } from '../types';
import { countInDelays, pitchCompSemitones } from './playerMath';

export interface StemInput {
  role: string;
  url: string;
}

export interface PartTrackEngine {
  play: () => Promise<void>;
  pause: () => void;
  seekSeconds: (bufferSec: number) => void;
  setTempo: (rate: number) => void;
  setGain: (role: string, value: number) => void;
  setLoop: (region: { startSec: number; endSec: number } | null) => void;
  setCountIn: (on: boolean) => void;
  positionSeconds: () => number;
  isPlaying: () => boolean;
  durationSeconds: () => number;
  onTick: (cb: (pos: number) => void) => () => void;
  dispose: () => void;
}

interface StretchNode extends AudioNode {
  start: () => void;
  stop: () => void;
  schedule: (opts: { semitones?: number; active?: boolean }) => void;
}

export async function createPartTrackEngine(
  stems: StemInput[],
  manifest: PartTrackManifest,
  onProgress?: (loaded: number, total: number) => void,
): Promise<PartTrackEngine> {
  // Chrome caps live AudioContexts (~6 per tab); a failed attempt must
  // close its context or retries eventually fail at construction.
  const ctx = new AudioContext();
  let sum: GainNode;
  let stretch: StretchNode;
  const buffers = new Map<string, AudioBuffer>();
  try {
    // Decode sequentially to cap peak memory on phones.
    let loaded = 0;
    for (const stem of stems) {
      const res = await fetch(stem.url);
      if (!res.ok) throw new Error(`Could not load the ${stem.role} track`);
      const bytes = await res.arrayBuffer();
      buffers.set(stem.role, await ctx.decodeAudioData(bytes));
      loaded += 1;
      onProgress?.(loaded, stems.length);
    }

    sum = ctx.createGain();
    stretch = (await SignalsmithStretch(ctx)) as StretchNode;
    sum.connect(stretch);
    stretch.connect(ctx.destination);
    stretch.start();
  } catch (e) {
    void ctx.close();
    throw e;
  }

  const partGains = new Map<string, GainNode>();
  for (const stem of stems) {
    const g = ctx.createGain();
    g.connect(sum);
    partGains.set(stem.role, g);
  }

  let rate = 1;
  let loop: { startSec: number; endSec: number } | null = null;
  let countIn = false;
  let playing = false;
  let sources: AudioBufferSourceNode[] = [];
  let startedAtCtx = 0;
  let startedAtOffset = 0;
  let pausedAt = 0;
  const tickCbs = new Set<(pos: number) => void>();
  let tickTimer: number | null = null;

  const duration = () => manifest.duration_ms / 1000;

  const position = (): number => {
    if (!playing) return pausedAt;
    let pos = startedAtOffset + (ctx.currentTime - startedAtCtx) * rate;
    if (loop && pos >= loop.startSec) {
      const span = loop.endSec - loop.startSec;
      if (span > 0 && pos > loop.startSec) {
        pos = loop.startSec + ((pos - loop.startSec) % span);
      }
    }
    return Math.min(pos, duration());
  };

  const stopSources = () => {
    for (const s of sources) {
      try { s.stop(); } catch { /* already stopped */ }
      s.disconnect();
    }
    sources = [];
  };

  const startSources = (offset: number, when: number) => {
    stopSources();
    for (const [role, buffer] of buffers) {
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.playbackRate.value = rate;
      if (loop) {
        src.loop = true;
        src.loopStart = loop.startSec;
        src.loopEnd = Math.min(loop.endSec, buffer.duration);
      }
      src.connect(partGains.get(role)!);
      src.start(when, offset);
      sources.push(src);
    }
    startedAtCtx = when;
    startedAtOffset = offset;
  };

  const scheduleClicks = (delays: number[], base: number) => {
    for (const d of delays) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, base + d);
      g.gain.exponentialRampToValueAtTime(0.3, base + d + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, base + d + 0.06);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(base + d);
      osc.stop(base + d + 0.08);
    }
  };

  const startTick = () => {
    if (tickTimer !== null) return;
    tickTimer = window.setInterval(() => {
      const pos = position();
      tickCbs.forEach((cb) => cb(pos));
      if (playing && !loop && pos >= duration()) pauseInternal();
    }, 100);
  };
  const stopTick = () => {
    if (tickTimer !== null) {
      window.clearInterval(tickTimer);
      tickTimer = null;
    }
  };

  const pauseInternal = () => {
    if (!playing) return;
    pausedAt = position();
    playing = false;
    stopSources();
    tickCbs.forEach((cb) => cb(pausedAt));
  };

  return {
    async play() {
      if (playing) return;
      if (ctx.state === 'suspended') await ctx.resume();
      const offset = loop && (pausedAt < loop.startSec || pausedAt >= loop.endSec)
        ? loop.startSec
        : Math.min(pausedAt, duration());
      let when = ctx.currentTime + 0.05;
      if (countIn) {
        const measure = manifest.measures.filter((m) => m.seconds <= offset).pop()?.number ?? 1;
        const delays = countInDelays(manifest, measure, rate);
        scheduleClicks(delays, when);
        when += delays[delays.length - 1] + (delays[1] ?? 0.5) - (delays[0] ?? 0);
      }
      startSources(offset, when);
      playing = true;
      startTick();
    },
    pause: pauseInternal,
    seekSeconds(bufferSec: number) {
      const target = Math.max(0, Math.min(bufferSec, duration()));
      if (playing) {
        startSources(target, ctx.currentTime + 0.02);
      } else {
        pausedAt = target;
        tickCbs.forEach((cb) => cb(target));
      }
    },
    setTempo(next: number) {
      const wasPlaying = playing;
      const pos = position();
      rate = next;
      stretch.schedule({ semitones: pitchCompSemitones(rate) });
      if (wasPlaying) startSources(pos, ctx.currentTime + 0.02);
      else pausedAt = pos;
    },
    setGain(role: string, value: number) {
      const g = partGains.get(role);
      if (g) g.gain.setTargetAtTime(value, ctx.currentTime, 0.02);
    },
    setLoop(region) {
      loop = region;
      const pos = position();
      if (playing) {
        const offset = region && (pos < region.startSec || pos >= region.endSec)
          ? region.startSec
          : pos;
        startSources(offset, ctx.currentTime + 0.02);
      }
    },
    setCountIn(on: boolean) {
      countIn = on;
    },
    positionSeconds: position,
    isPlaying: () => playing,
    durationSeconds: duration,
    onTick(cb) {
      tickCbs.add(cb);
      return () => tickCbs.delete(cb);
    },
    dispose() {
      pauseInternal();
      stopTick();
      try { stretch.stop(); } catch { /* not started */ }
      void ctx.close();
    },
  };
}
