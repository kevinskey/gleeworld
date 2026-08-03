import { frameEnergies } from './flux';
import { createOnsetDetector } from './detector';

// Mic clap-onset source: AnalyserNode frames in, onset timestamps (relative to
// t0 on the ctx clock) out. The peak-picking itself lives in detector.ts so it
// is unit-testable against synthetic rooms — this file previously carried its
// own copy of that logic, which drifted from the tested version and went deaf
// in any room noisier than -80dBFS.

export interface MicOnsetSession { onsets: number[]; level: () => number; dispose(): void }

const FRAME = 512;

export function startMicOnsetSession(ctx: AudioContext, stream: MediaStream, t0: number): MicOnsetSession {
  const src = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 2048;
  src.connect(analyser);
  const buf = new Float32Array(analyser.fftSize);
  const onsets: number[] = [];
  const detector = createOnsetDetector();
  let lastLevel = 0;
  const timer = window.setInterval(() => {
    analyser.getFloatTimeDomainData(buf);
    const now = ctx.currentTime;
    // Only the freshest frame matters for edge detection.
    const e = frameEnergies(buf.subarray(buf.length - FRAME), FRAME, FRAME)[0] ?? 0;
    lastLevel = e;
    if (detector.push(now, e)) {
      // Half-frame group delay: the transient sits mid-frame on average.
      onsets.push(now - t0 - FRAME / (2 * ctx.sampleRate));
    }
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
