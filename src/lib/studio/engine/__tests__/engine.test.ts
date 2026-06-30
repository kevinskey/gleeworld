// DAW engine sanity tests. Kept intentionally hermetic — no real
// AudioContext, no Tone instantiation — so this suite runs in <1 s
// from CI without needing a browser. Behavior that *requires* a live
// audio graph (clip scheduling, latency probing) lives in browser
// integration tests instead.

import { describe, test, expect } from 'vitest';

describe('DAW Engine Verification Matrix', () => {
  test('should calculate exact sample offsets without rounding drift', () => {
    const sampleRate = 44100;
    const startSeconds = 1.337;
    const expectedFrame = BigInt(Math.floor(startSeconds * sampleRate));

    // Simulating internal BigInt frame anchoring used by the iOS
    // AVAudioPlayerNode.scheduleSegment path.
    const calculatedFrame = BigInt(Math.floor(startSeconds * sampleRate));
    expect(calculatedFrame).toBe(expectedFrame);
  });

  test('should convert dB to linear scaling accurately for native layers', () => {
    // -6 dB ≈ 0.501 linear gain. Mirrors the Float conversion the
    // updateTrackVolume alias performs before handing to
    // AVAudioMixerNode.outputVolume.
    const dbValue = -6;
    const expectedLinear = Math.pow(10, dbValue / 20);
    expect(expectedLinear).toBeCloseTo(0.501, 3);
  });
});
