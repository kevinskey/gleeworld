// MP3 encoder worker. Receives Float32 PCM (mono), returns an MP3 Uint8Array.
// Runs in a Web Worker so a 10-minute encode (≈2–5 s of CPU) doesn't freeze
// the UI.
import { Mp3Encoder } from '@breezystack/lamejs';

self.onmessage = (e: MessageEvent<{ samples: Float32Array; sampleRate: number; bitrate?: number }>) => {
  const { samples, sampleRate, bitrate = 128 } = e.data;
  const int16 = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  const enc = new Mp3Encoder(1, sampleRate, bitrate);
  const chunk = 1152;
  const out: Uint8Array[] = [];
  for (let i = 0; i < int16.length; i += chunk) {
    const slice = int16.subarray(i, i + chunk);
    const buf = enc.encodeBuffer(slice);
    if (buf.length > 0) out.push(buf);
  }
  const tail = enc.flush();
  if (tail.length > 0) out.push(tail);
  const total = out.reduce((a, c) => a + c.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const c of out) {
    result.set(c, offset);
    offset += c.length;
  }
  (self as any).postMessage({ mp3: result }, [result.buffer]);
};

export {};
