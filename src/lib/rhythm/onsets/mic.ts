import { frameEnergies } from './flux';

// Mic clap-onset source. Incremental version of the flux.ts peak logic so
// onsets appear in real time; timestamps are relative to t0 on the ctx clock.

export interface MicOnsetSession { onsets: number[]; level: () => number; dispose(): void }

const FRAME = 512;
const RATIO = 6;
const FLOOR_ALPHA = 0.995;
const REFRACTORY_SEC = 0.08;

export function startMicOnsetSession(ctx: AudioContext, stream: MediaStream, t0: number): MicOnsetSession {
  const src = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 2048;
  src.connect(analyser);
  const buf = new Float32Array(analyser.fftSize);
  const onsets: number[] = [];
  let floor = 1e-4;
  let armed = true;
  let lastOnsetAt = -Infinity;
  let lastLevel = 0;
  const timer = window.setInterval(() => {
    analyser.getFloatTimeDomainData(buf);
    const now = ctx.currentTime;
    // Only the freshest frame matters for edge detection.
    const e = frameEnergies(buf.subarray(buf.length - FRAME), FRAME, FRAME)[0] ?? 0;
    lastLevel = e;
    const threshold = Math.max(floor * RATIO, 1e-3);
    if (armed && e > threshold && now - lastOnsetAt >= REFRACTORY_SEC) {
      onsets.push(now - t0 - FRAME / (2 * ctx.sampleRate));
      lastOnsetAt = now;
      armed = false;
    } else if (!armed && e < threshold * 0.5) {
      armed = true;
    }
    if (e < threshold) floor = FLOOR_ALPHA * floor + (1 - FLOOR_ALPHA) * Math.max(e, 1e-4);
  }, 12);
  return {
    onsets,
    level: () => lastLevel,
    dispose() {
      window.clearInterval(timer);
      src.disconnect();
    },
  };
}
