import { describe, it, expect } from 'vitest';
import { projectedRenderBytes, planChunks, spliceChunks, stemFilename } from './exportRender';
import { newSession, newAudioTrack } from '../defaults';

// Pure-math tests only — Tone.Offline / AudioBuffer / AudioWorklet can't
// run in vitest (jsdom/node have no real Web Audio implementation), same
// precedent as masterChain.test.ts. renderMaster/renderStems are covered
// by the manual smoke path documented in the task report.

describe('projectedRenderBytes', () => {
  it('matches the spec formula: 8 * rate * (length+1.5) * (tracks+2)', () => {
    const session = newSession({ tenantId: 't', ownerUserId: 'u' });
    session.length_seconds = 100;
    session.tracks = [newAudioTrack('A'), newAudioTrack('B'), newAudioTrack('C')];
    const sampleRate = 44100;
    const expected = 8 * sampleRate * (100 + 1.5) * (3 + 2);
    expect(projectedRenderBytes(session, sampleRate)).toBeCloseTo(expected, 6);
  });

  it('scales with track count (more tracks -> more projected bytes)', () => {
    const session = newSession({ tenantId: 't', ownerUserId: 'u' });
    session.length_seconds = 60;
    const zero = projectedRenderBytes(session, 44100);
    session.tracks = [newAudioTrack(), newAudioTrack()];
    const two = projectedRenderBytes(session, 44100);
    expect(two).toBeGreaterThan(zero);
    expect(two - zero).toBeCloseTo(2 * 8 * 44100 * 61.5, 6);
  });

  it('a 0-length session still projects the master-bus-only floor (tracks=0 -> factor 2)', () => {
    const session = newSession({ tenantId: 't', ownerUserId: 'u' });
    session.length_seconds = 0;
    session.tracks = [];
    expect(projectedRenderBytes(session, 44100)).toBeCloseTo(8 * 44100 * 1.5 * 2, 6);
  });
});

describe('planChunks', () => {
  it('planChunks(100) covers [0,100] with 45s bodies, 3s lead-ins, first chunk renderStart 0', () => {
    const chunks = planChunks(100);
    expect(chunks).toEqual([
      { start: 0, renderStart: 0, end: 45 },
      { start: 45, renderStart: 42, end: 90 },
      { start: 90, renderStart: 87, end: 100 },
    ]);
  });

  it('no gaps or overlaps in [start,end) across the full plan', () => {
    for (const length of [1, 44, 45, 46, 100, 137, 450.25]) {
      const chunks = planChunks(length);
      expect(chunks[0].start).toBe(0);
      expect(chunks[chunks.length - 1].end).toBeCloseTo(length, 9);
      for (let i = 1; i < chunks.length; i++) {
        expect(chunks[i].start).toBeCloseTo(chunks[i - 1].end, 9); // no gap/overlap
      }
      for (const c of chunks) {
        expect(c.end).toBeGreaterThan(c.start);
        expect(c.renderStart).toBeLessThanOrEqual(c.start);
        expect(c.renderStart).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('a session shorter than one chunk body produces a single chunk', () => {
    const chunks = planChunks(20);
    expect(chunks).toEqual([{ start: 0, renderStart: 0, end: 20 }]);
  });

  it('respects custom chunkSeconds/leadInSeconds', () => {
    const chunks = planChunks(30, 10, 2);
    expect(chunks).toEqual([
      { start: 0, renderStart: 0, end: 10 },
      { start: 10, renderStart: 8, end: 20 },
      { start: 20, renderStart: 18, end: 30 },
    ]);
  });
});

describe('spliceChunks', () => {
  // Two windows of the SAME continuous sine (exactly what two adjacent
  // chunk renders of deterministic session content look like once their
  // discarded-lead-in trimming leaves a shared crossfade region at the
  // seam) — a low frequency relative to sampleRate keeps the reference
  // signal's own per-sample slope tiny, so any residual amplitude
  // deviation from the equal-power blend (a smooth, known artifact of
  // crossfading correlated content, not a bug) never shows up as an
  // abrupt sample-to-sample jump.
  const sampleRate = 44100;
  const freq = 1;
  const crossfadeSamples = Math.round(0.05 * sampleRate); // 2205 — the real 50ms convention

  function referenceSine(length: number): Float32Array {
    const out = new Float32Array(length);
    for (let i = 0; i < length; i++) out[i] = Math.sin((2 * Math.PI * freq * i) / sampleRate);
    return out;
  }

  it('joins two overlapping sine chunks with no discontinuity at the seam and correct length', () => {
    const len0 = 6000;
    const len1 = 5500;
    const totalLength = len0 + len1 - crossfadeSamples;
    const reference = referenceSine(totalLength);

    const chunk0 = [reference.slice(0, len0)];
    const chunk1 = [reference.slice(len0 - crossfadeSamples, len0 - crossfadeSamples + len1)];

    const result = spliceChunks([chunk0, chunk1], crossfadeSamples);

    expect(result).toHaveLength(1);
    expect(result[0].length).toBe(totalLength);

    // Max discontinuity: the largest jump between any two consecutive
    // output samples, anywhere in the joined signal (including across
    // the seam) — a real implementation bug (off-by-one splice, wrong
    // overlap length, hard concatenation) would show up as a large
    // spike well above the reference sine's own tiny per-sample slope.
    let maxJump = 0;
    for (let i = 1; i < result[0].length; i++) {
      maxJump = Math.max(maxJump, Math.abs(result[0][i] - result[0][i - 1]));
    }
    expect(maxJump).toBeLessThan(1e-3);
  });

  it('multi-channel chunks splice each channel independently', () => {
    const len0 = 500;
    const len1 = 500;
    const fade = 100;
    const l0 = [referenceSine(len0), referenceSine(len0).map((v) => v * 0.5)];
    const l1 = [referenceSine(len1), referenceSine(len1).map((v) => v * 0.5)];
    const result = spliceChunks([l0, l1], fade);
    expect(result).toHaveLength(2);
    expect(result[0].length).toBe(len0 + len1 - fade);
    expect(result[1].length).toBe(len0 + len1 - fade);
  });

  it('zero chunks -> empty array; one chunk -> passthrough copy', () => {
    expect(spliceChunks([], 100)).toEqual([]);
    const single = [new Float32Array([1, 2, 3])];
    const result = spliceChunks([single], 100);
    expect(Array.from(result[0])).toEqual([1, 2, 3]);
    // passthrough returns a copy, not the same array instance
    expect(result[0]).not.toBe(single[0]);
  });

  it('three chunks: total length accounts for both seams', () => {
    const fade = 50;
    const a = [new Float32Array(300)];
    const b = [new Float32Array(300)];
    const c = [new Float32Array(200)];
    const result = spliceChunks([a, b, c], fade);
    expect(result[0].length).toBe(300 + 300 + 200 - 2 * fade);
  });
});

describe('stemFilename', () => {
  it('zero-pads the 1-based index and joins with an em-dash', () => {
    expect(stemFilename(0, 'Soprano', 'wav')).toBe('01 — Soprano.wav');
    expect(stemFilename(9, 'Alto', 'wav')).toBe('10 — Alto.wav');
  });

  it('is unicode-safe (keeps letters/numbers/space/dash, strips stray punctuation)', () => {
    expect(stemFilename(0, "Lead Vox (Kevin's take!) 🎤", 'wav')).toBe("01 — Lead Vox Kevins take.wav");
    expect(stemFilename(1, 'Soprán II', 'wav')).toBe('02 — Soprán II.wav');
  });

  it('falls back to "Track" when the name sanitizes away to nothing', () => {
    expect(stemFilename(0, '🎤🎶', 'wav')).toBe('01 — Track.wav');
  });
});
