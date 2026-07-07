import { describe, it, expect } from 'vitest';
import { splitAudioClips, sliceClipChannels } from './clipOps';

const mkClip = (over: Partial<Record<string, unknown>> = {}) => ({
  id: 'c1', kind: 'audio', asset_id: 'a1',
  start_seconds: 2, duration_seconds: 4, offset_seconds: 1,
  gain_db: 0, fade_in_seconds: 1, fade_out_seconds: 2,
  reverse: false, pitch_semitones: 0, time_stretch: 1,
  ...over,
});

describe('splitAudioClips', () => {
  it('splits an audio clip at an interior position into two adjacent clips', () => {
    const out = splitAudioClips([mkClip()], 'c1', 3, () => 'new');
    expect(out).not.toBeNull();
    const [l, r] = out!;
    expect(l.start_seconds).toBe(2);
    expect(l.duration_seconds).toBe(1);
    expect(r.start_seconds).toBe(3);
    expect(r.duration_seconds).toBe(3);
    // right half reads from deeper into the source asset
    expect(r.offset_seconds).toBe(2);
    // fades clamp to their half
    expect(l.fade_out_seconds).toBeLessThanOrEqual(0.5);
    expect(r.fade_in_seconds).toBeLessThanOrEqual(1.5);
  });
  it('returns null when position is outside the clip', () => {
    expect(splitAudioClips([mkClip()], 'c1', 2, () => 'x')).toBeNull();   // at left edge
    expect(splitAudioClips([mkClip()], 'c1', 6, () => 'x')).toBeNull();   // at right edge
    expect(splitAudioClips([mkClip()], 'c1', 9, () => 'x')).toBeNull();   // beyond
  });
  it('returns null for unknown clip id', () => {
    expect(splitAudioClips([mkClip()], 'nope', 3, () => 'x')).toBeNull();
  });
});

describe('sliceClipChannels', () => {
  const rate = 100; // 100 Hz keeps sample math readable
  it('slices offset→duration and applies gain', () => {
    const src = [new Float32Array(1000).fill(0.5)];
    const out = sliceClipChannels(src, rate, {
      offset_seconds: 1, duration_seconds: 2, gain_db: -6.0206, // ≈ ×0.5
      fade_in_seconds: 0, fade_out_seconds: 0, reverse: false,
    });
    expect(out[0].length).toBe(200);
    expect(out[0][100]).toBeCloseTo(0.25, 3);
  });
  it('applies linear fade-in and fade-out', () => {
    const src = [new Float32Array(1000).fill(1)];
    const out = sliceClipChannels(src, rate, {
      offset_seconds: 0, duration_seconds: 2, gain_db: 0,
      fade_in_seconds: 1, fade_out_seconds: 1, reverse: false,
    });
    expect(out[0][0]).toBeCloseTo(0, 5);
    expect(out[0][50]).toBeCloseTo(0.5, 2);   // halfway through fade-in
    expect(out[0][100]).toBeCloseTo(1, 2);    // fade-in done exactly at 1s
    expect(out[0][150]).toBeCloseTo(0.5, 2);  // halfway through fade-out
  });
  it('reverse matches playback: whole-buffer flip, then the offset window', () => {
    // Tone.Player.reverse flips the ENTIRE buffer, then start(offset, dur)
    // reads the window from the flipped buffer. offset 2s at 100Hz on a
    // 1000-sample ramp: first exported sample = orig[999 - 200] = 0.799.
    const src = [Float32Array.from({ length: 1000 }, (_, i) => i / 1000)];
    const out = sliceClipChannels(src, rate, {
      offset_seconds: 2, duration_seconds: 3, gain_db: 0,
      fade_in_seconds: 0, fade_out_seconds: 0, reverse: true,
    });
    expect(out[0].length).toBe(300);
    expect(out[0][0]).toBeCloseTo(0.799, 5);
    expect(out[0][299]).toBeCloseTo(0.5, 3);
  });
  it('clamps the slice to the source length', () => {
    const src = [new Float32Array(150).fill(1)];
    const out = sliceClipChannels(src, rate, {
      offset_seconds: 1, duration_seconds: 5, gain_db: 0,
      fade_in_seconds: 0, fade_out_seconds: 0, reverse: false,
    });
    expect(out[0].length).toBe(50); // only 0.5s of audio exists past the offset
  });
});
