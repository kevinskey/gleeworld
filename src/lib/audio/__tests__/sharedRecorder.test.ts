// Shared web recorder — trim/encode core tests. Kept hermetic like the
// Studio engine suite: no real AudioContext/OfflineAudioContext (this
// repo's vitest runs in the plain 'node' environment — see
// src/lib/studio/engine/__tests__/engine.test.ts's header comment for
// the same rationale). trimBufferHeadSamples/encodeWavFromBufferLike are
// deliberately pure functions over a duck-typed AudioBufferLike so they
// can be exercised directly here; trimHeadLatency's thin decode wrapper
// is covered separately for its short-circuit contracts (ms<=0, no
// AudioContext in this environment == "decode unavailable").

import { describe, test, expect } from 'vitest';
import {
  msToSamples,
  trimBufferHeadSamples,
  encodeWavFromBufferLike,
  trimDecodedBufferHead,
  trimHeadLatency,
  getConfiguredInputLatencyMs,
  getOutputLatencyMs,
  type AudioBufferLike,
} from '../sharedRecorder';

/** Build a minimal AudioBufferLike fixture from plain sample arrays —
 * one array per channel — without touching any Web Audio API. */
function fixtureBuffer(channelSamples: number[][], sampleRate = 48000): AudioBufferLike {
  const channels = channelSamples.map((samples) => new Float32Array(samples));
  const length = channels[0]?.length ?? 0;
  return {
    numberOfChannels: channels.length,
    length,
    sampleRate,
    getChannelData: (c: number) => channels[c],
  };
}

describe('msToSamples', () => {
  test('converts ms to a whole sample count at the given sample rate', () => {
    expect(msToSamples(1000, 48000)).toBe(48000);
    expect(msToSamples(700, 48000)).toBe(33600);
    expect(msToSamples(500, 44100)).toBe(22050);
  });

  test('floors fractional sample counts', () => {
    // 33.333ms at 48kHz = 1599.84 samples.
    expect(msToSamples(33.333, 48000)).toBe(1599);
  });

  test('zero/negative ms yields zero/negative samples (caller decides no-op)', () => {
    expect(msToSamples(0, 48000)).toBe(0);
    expect(msToSamples(-10, 48000)).toBeLessThan(0);
  });
});

describe('trimBufferHeadSamples', () => {
  test('cuts the requested sample count off the head of every channel', () => {
    const left = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    const right = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
    const buf = fixtureBuffer([left, right], 48000);

    const trimmed = trimBufferHeadSamples(buf, 3);
    expect(trimmed).not.toBeNull();
    expect(trimmed!.length).toBe(7);
    expect(trimmed!.sampleRate).toBe(48000);
    expect(trimmed!.numberOfChannels).toBe(2);
    expect(Array.from(trimmed!.getChannelData(0))).toEqual([3, 4, 5, 6, 7, 8, 9]);
    expect(Array.from(trimmed!.getChannelData(1))).toEqual([13, 14, 15, 16, 17, 18, 19]);
  });

  test('preserves channel count and sample rate through the trim', () => {
    const buf = fixtureBuffer([[1, 2, 3, 4, 5], [1, 2, 3, 4, 5], [1, 2, 3, 4, 5]], 44100);
    const trimmed = trimBufferHeadSamples(buf, 2);
    expect(trimmed!.numberOfChannels).toBe(3);
    expect(trimmed!.sampleRate).toBe(44100);
  });

  test('returns null (no-op) when skipSamples is zero or negative', () => {
    const buf = fixtureBuffer([[1, 2, 3]]);
    expect(trimBufferHeadSamples(buf, 0)).toBeNull();
    expect(trimBufferHeadSamples(buf, -5)).toBeNull();
  });

  test('returns null (no-op) when the buffer is shorter than the requested trim', () => {
    const buf = fixtureBuffer([[1, 2, 3]]); // 3 samples
    expect(trimBufferHeadSamples(buf, 3)).toBeNull(); // would leave 0 samples
    expect(trimBufferHeadSamples(buf, 10)).toBeNull(); // would go negative
  });
});

describe('trimDecodedBufferHead', () => {
  test('trims when ms produces a positive, in-range sample skip', () => {
    const buf = fixtureBuffer([[0, 1, 2, 3, 4, 5, 6, 7, 8, 9]], 1000); // 1 sample == 1ms
    const { buffer, trimmed } = trimDecodedBufferHead(buf, 3);
    expect(trimmed).toBe(true);
    expect(Array.from(buffer.getChannelData(0))).toEqual([3, 4, 5, 6, 7, 8, 9]);
  });

  test('falls back to the original buffer, untrimmed, when ms <= 0', () => {
    const buf = fixtureBuffer([[1, 2, 3]]);
    const { buffer, trimmed } = trimDecodedBufferHead(buf, 0);
    expect(trimmed).toBe(false);
    expect(buffer).toBe(buf);
  });

  test('falls back to the original buffer when the recording is shorter than the trim', () => {
    const buf = fixtureBuffer([[1, 2, 3]], 1000);
    const { buffer, trimmed } = trimDecodedBufferHead(buf, 10); // 10ms == 10 samples > length
    expect(trimmed).toBe(false);
    expect(buffer).toBe(buf);
  });
});

describe('encodeWavFromBufferLike', () => {
  test('produces a WAV blob with a correct RIFF/fmt header + byte size', async () => {
    const buf = fixtureBuffer([[0, 0.5, -0.5, 1, -1]], 48000);
    const blob = encodeWavFromBufferLike(buf);
    expect(blob.type).toBe('audio/wav');

    const bytes = new DataView(await blob.arrayBuffer());
    const readStr = (offset: number, len: number) =>
      Array.from({ length: len }, (_, i) => String.fromCharCode(bytes.getUint8(offset + i))).join('');

    expect(readStr(0, 4)).toBe('RIFF');
    expect(readStr(8, 4)).toBe('WAVE');
    expect(readStr(12, 4)).toBe('fmt ');
    expect(bytes.getUint16(20, true)).toBe(1); // PCM
    expect(bytes.getUint16(22, true)).toBe(1); // mono
    expect(bytes.getUint32(24, true)).toBe(48000); // sample rate
    expect(bytes.getUint16(34, true)).toBe(16); // bits per sample
    expect(readStr(36, 4)).toBe('data');

    const dataSize = buf.length * buf.numberOfChannels * 2;
    expect(bytes.getUint32(40, true)).toBe(dataSize);
    expect(blob.size).toBe(44 + dataSize);
  });

  test('quantizes float samples to 16-bit PCM with correct sign/clamping', async () => {
    const buf = fixtureBuffer([[0, 0.5, -0.5, 1, -1, 2, -2]], 48000); // last two exercise clamping
    const blob = encodeWavFromBufferLike(buf);
    const bytes = new DataView(await blob.arrayBuffer());
    const sampleAt = (i: number) => bytes.getInt16(44 + i * 2, true);

    // DataView.setInt16 truncates toward zero (not round-to-nearest), so
    // 0.5 * 0x7fff (16383.5) lands on 16383, not 16384.
    expect(sampleAt(0)).toBe(0);
    expect(sampleAt(1)).toBe(Math.trunc(0.5 * 0x7fff));
    expect(sampleAt(2)).toBe(Math.trunc(-0.5 * 0x8000));
    expect(sampleAt(3)).toBe(0x7fff);
    expect(sampleAt(4)).toBe(-0x8000);
    expect(sampleAt(5)).toBe(0x7fff); // clamped from 2
    expect(sampleAt(6)).toBe(-0x8000); // clamped from -2
  });

  test('preserves multi-channel interleaving', async () => {
    const buf = fixtureBuffer([[1, 1], [-1, -1]], 48000); // L, R
    const blob = encodeWavFromBufferLike(buf);
    const bytes = new DataView(await blob.arrayBuffer());
    expect(bytes.getUint16(22, true)).toBe(2); // stereo
    // Interleaved: L0 R0 L1 R1
    expect(bytes.getInt16(44 + 0, true)).toBe(0x7fff);
    expect(bytes.getInt16(44 + 2, true)).toBe(-0x8000);
    expect(bytes.getInt16(44 + 4, true)).toBe(0x7fff);
    expect(bytes.getInt16(44 + 6, true)).toBe(-0x8000);
  });
});

describe('trimHeadLatency (blob in/out)', () => {
  test('returns the original blob unchanged when ms <= 0', async () => {
    const blob = new Blob([new Uint8Array([1, 2, 3])], { type: 'audio/webm' });
    const out = await trimHeadLatency(blob, 0);
    expect(out).toBe(blob);
    const outNeg = await trimHeadLatency(blob, -100);
    expect(outNeg).toBe(blob);
  });

  test('returns the original blob unchanged when decoding is unavailable (no AudioContext)', async () => {
    // This repo's vitest suite runs in the plain 'node' environment
    // (see engine.test.ts's header), so AudioContext is genuinely
    // undefined here — the same guard this exercises protects against
    // decode failures in a real browser too.
    expect(typeof AudioContext).toBe('undefined');
    const blob = new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'audio/webm' });
    const out = await trimHeadLatency(blob, 700);
    expect(out).toBe(blob);
  });
});

describe('getConfiguredInputLatencyMs / getOutputLatencyMs', () => {
  test('input latency defaults to 700ms when localStorage is unavailable', () => {
    expect(typeof localStorage).toBe('undefined');
    expect(getConfiguredInputLatencyMs()).toBe(700);
  });

  test('input latency respects a stored override', () => {
    const store = new Map<string, string>();
    (globalThis as { localStorage?: unknown }).localStorage = {
      getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
      setItem: (k: string, v: string) => { store.set(k, v); },
    };
    try {
      expect(getConfiguredInputLatencyMs()).toBe(700); // still default, nothing stored
      store.set('studio.inputLatencyMs', '120');
      expect(getConfiguredInputLatencyMs()).toBe(120);
    } finally {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    }
  });

  test('output latency is 0 when AudioContext is unavailable', () => {
    expect(typeof AudioContext).toBe('undefined');
    expect(getOutputLatencyMs()).toBe(0);
  });
});
