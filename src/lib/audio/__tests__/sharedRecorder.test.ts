// Shared web recorder — trim/encode core tests. Kept hermetic like the
// Studio engine suite: no real AudioContext/OfflineAudioContext (this
// repo's vitest runs in the plain 'node' environment — see
// src/lib/studio/engine/__tests__/engine.test.ts's header comment for
// the same rationale). trimBufferHeadSamples/encodeWavFromBufferLike are
// deliberately pure functions over a duck-typed AudioBufferLike so they
// can be exercised directly here; trimHeadLatency's full
// decode→trim→encode composition is exercised via an injected decoder
// (its default decoder is the AudioContext path), and its short-circuit
// contracts (ms<=0, decode failure/unavailable) are covered separately.

import { describe, test, expect, vi } from 'vitest';
import {
  msToSamples,
  trimBufferHeadSamples,
  encodeWavFromBufferLike,
  trimDecodedBufferHead,
  trimHeadLatency,
  getConfiguredInputLatencyMs,
  getOutputLatencyMs,
  DEFAULT_INPUT_LATENCY_MS,
  isLikelyHeadphoneLabel,
  getLikelyAudioRoute,
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
    // undefined here — the default decoder throws, and the same fallback
    // this exercises protects against decode failures in a real browser.
    expect(typeof AudioContext).toBe('undefined');
    const blob = new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'audio/webm' });
    const out = await trimHeadLatency(blob, 700);
    expect(out).toBe(blob);
  });

  test('returns the original blob unchanged when the injected decoder throws (decode failure)', async () => {
    const blob = new Blob([new Uint8Array([9, 9, 9])], { type: 'audio/webm' });
    const out = await trimHeadLatency(blob, 500, async () => {
      throw new Error('corrupt data');
    });
    expect(out).toBe(blob);
  });

  test('FULL composition: decode→trim→encode produces exact expected WAV samples', async () => {
    // Synthesized "decoded recording": stereo, 1000 Hz sample rate so
    // 1 sample == 1ms, with recognizable ramps per channel. Injecting
    // the decoder runs trimHeadLatency's real success path end-to-end
    // (everything except the browser-only decodeAudioData call).
    const left = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8];
    const right = [-0.1, -0.2, -0.3, -0.4, -0.5, -0.6, -0.7, -0.8];
    const decoded = fixtureBuffer([left, right], 1000);
    const rawBlob = new Blob([new Uint8Array([1, 2, 3])], { type: 'audio/webm' });

    let decodedFrom: Blob | null = null;
    const out = await trimHeadLatency(rawBlob, 3, async (b) => {
      decodedFrom = b;
      return decoded;
    });

    expect(decodedFrom).toBe(rawBlob); // decoder received the input blob
    expect(out).not.toBe(rawBlob);
    expect(out.type).toBe('audio/wav');

    const bytes = new DataView(await out.arrayBuffer());
    // Header: stereo, original sample rate preserved.
    expect(bytes.getUint16(22, true)).toBe(2);
    expect(bytes.getUint32(24, true)).toBe(1000);
    // 3ms @ 1000Hz == 3 samples trimmed → 5 frames × 2ch × 2 bytes.
    const expectedFrames = left.length - 3;
    expect(bytes.getUint32(40, true)).toBe(expectedFrames * 2 * 2);
    expect(out.size).toBe(44 + expectedFrames * 2 * 2);

    // Exact interleaved samples: the surviving tail, quantized the same
    // way encodeWavFromBufferLike quantizes (x*0x7fff / x*0x8000, then
    // setInt16's truncation toward zero).
    const q = (x: number) => Math.trunc(x < 0 ? x * 0x8000 : x * 0x7fff);
    const expected: number[] = [];
    for (let i = 3; i < left.length; i++) expected.push(q(left[i]), q(right[i]));
    const actual: number[] = [];
    for (let i = 0; i < expected.length; i++) actual.push(bytes.getInt16(44 + i * 2, true));
    expect(actual).toEqual(expected);
  });

  test('FULL composition falls back to the original blob when the decoded take is shorter than the trim', async () => {
    const decoded = fixtureBuffer([[0.5, 0.5]], 1000); // 2 samples == 2ms
    const rawBlob = new Blob([new Uint8Array([7])], { type: 'audio/webm' });
    const out = await trimHeadLatency(rawBlob, 10, async () => decoded);
    expect(out).toBe(rawBlob);
  });
});

describe('getConfiguredInputLatencyMs / getOutputLatencyMs', () => {
  test('input latency defaults to DEFAULT_INPUT_LATENCY_MS (700) when localStorage is unavailable', () => {
    expect(typeof localStorage).toBe('undefined');
    expect(DEFAULT_INPUT_LATENCY_MS).toBe(700);
    expect(getConfiguredInputLatencyMs()).toBe(DEFAULT_INPUT_LATENCY_MS);
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

describe('isLikelyHeadphoneLabel', () => {
  test('matches headphone-ish labels case-insensitively', () => {
    expect(isLikelyHeadphoneLabel('AirPods Pro')).toBe(true);
    expect(isLikelyHeadphoneLabel('Bose QuietComfort Headphones')).toBe(true);
    expect(isLikelyHeadphoneLabel('bluetooth headset')).toBe(true);
    expect(isLikelyHeadphoneLabel('Wireless Earbuds')).toBe(true);
    expect(isLikelyHeadphoneLabel('Jabra BLUETOOTH Speaker')).toBe(true);
  });

  test('does not match speaker/default labels', () => {
    expect(isLikelyHeadphoneLabel('MacBook Pro Speakers')).toBe(false);
    expect(isLikelyHeadphoneLabel('Default')).toBe(false);
    expect(isLikelyHeadphoneLabel('External Speakers (USB Audio)')).toBe(false);
    expect(isLikelyHeadphoneLabel('')).toBe(false);
  });
});

describe('getLikelyAudioRoute', () => {
  // This repo's vitest suite runs in a plain Node environment (see the
  // module header comment above), which itself may or may not expose a
  // bare `navigator` global (Node 21+ does, but with no `mediaDevices`) —
  // either way it's not a real browser's, so every case here stubs
  // `navigator` explicitly via `vi.stubGlobal` rather than mutating the
  // real global directly (which throws on Node's getter-only `navigator`).
  function withMediaDevices<T>(
    devices: Array<Pick<MediaDeviceInfo, 'kind' | 'label' | 'deviceId'>> | 'throw' | 'unavailable',
    fn: () => Promise<T>,
  ): Promise<T> {
    const stub = devices === 'unavailable'
      ? {}
      : {
        mediaDevices: {
          enumerateDevices:
            devices === 'throw'
              ? async () => { throw new Error('permission denied'); }
              : async () => devices,
        },
      };
    vi.stubGlobal('navigator', stub);
    return fn().finally(() => vi.unstubAllGlobals());
  }

  test('returns null (unknown) when mediaDevices.enumerateDevices is unavailable', async () => {
    await withMediaDevices('unavailable', async () => {
      expect(await getLikelyAudioRoute()).toEqual({ isHeadphones: null });
    });
  });

  test('returns null (unknown) when enumerateDevices throws', async () => {
    await withMediaDevices('throw', async () => {
      expect(await getLikelyAudioRoute()).toEqual({ isHeadphones: null });
    });
  });

  test('returns null (unknown) when there are no audiooutput devices', async () => {
    await withMediaDevices(
      [{ kind: 'audioinput', label: 'Built-in Mic', deviceId: 'default' }],
      async () => {
        expect(await getLikelyAudioRoute()).toEqual({ isHeadphones: null });
      },
    );
  });

  test('returns null (unknown) when output labels are blank (no permission granted yet)', async () => {
    await withMediaDevices(
      [{ kind: 'audiooutput', label: '', deviceId: 'default' }],
      async () => {
        expect(await getLikelyAudioRoute()).toEqual({ isHeadphones: null });
      },
    );
  });

  test('true when the default output is labeled like headphones', async () => {
    await withMediaDevices(
      [
        { kind: 'audiooutput', label: 'MacBook Pro Speakers', deviceId: 'not-default-id' },
        { kind: 'audiooutput', label: 'AirPods Pro', deviceId: 'default' },
      ],
      async () => {
        expect(await getLikelyAudioRoute()).toEqual({ isHeadphones: true });
      },
    );
  });

  test('false when the default/communications outputs are speakers, even if a non-default output looks like headphones', async () => {
    await withMediaDevices(
      [
        { kind: 'audiooutput', label: 'Built-in Speakers', deviceId: 'default' },
        { kind: 'audiooutput', label: 'Built-in Speakers', deviceId: 'communications' },
        { kind: 'audiooutput', label: 'AirPods Pro', deviceId: 'some-other-id' },
      ],
      async () => {
        expect(await getLikelyAudioRoute()).toEqual({ isHeadphones: false });
      },
    );
  });

  test('falls back to checking all outputs when neither default nor communications markers are present (Firefox/Safari)', async () => {
    await withMediaDevices(
      [{ kind: 'audiooutput', label: 'Bluetooth Headset', deviceId: 'some-opaque-id' }],
      async () => {
        expect(await getLikelyAudioRoute()).toEqual({ isHeadphones: true });
      },
    );
  });
});
