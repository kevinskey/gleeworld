// Lightweight in-browser audio processing for Part Tracks tools.
//
// Each function takes a decoded AudioBuffer and returns a new buffer
// (no in-place edits) so the studio can preview before persisting.
// Encode helpers turn the result back into a Blob the studio can upload.

/** Encode an AudioBuffer to a 16-bit PCM WAV Blob. */
export function bufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const length = buffer.length;
  const bytesPerSample = 2;
  const dataSize = length * numChannels * bytesPerSample;
  const headerSize = 44;
  const ab = new ArrayBuffer(headerSize + dataSize);
  const view = new DataView(ab);

  const writeStr = (off: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * bytesPerSample, true);
  view.setUint16(32, numChannels * bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);

  // Interleave channels then convert float32 → int16.
  const channels: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) channels.push(buffer.getChannelData(c));
  let off = headerSize;
  for (let i = 0; i < length; i++) {
    for (let c = 0; c < numChannels; c++) {
      const s = Math.max(-1, Math.min(1, channels[c][i]));
      view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      off += 2;
    }
  }
  return new Blob([ab], { type: 'audio/wav' });
}

/** Build a new AudioBuffer of `length` samples from the same context. */
function makeBuffer(srcLike: AudioBuffer, length: number): AudioBuffer {
  // OfflineAudioContext is the only public way to mint a fresh AudioBuffer
  // with arbitrary length without an AudioContext handle.
  const ctx = new OfflineAudioContext(srcLike.numberOfChannels, length, srcLike.sampleRate);
  return ctx.createBuffer(srcLike.numberOfChannels, length, srcLike.sampleRate);
}

/** Trim leading + trailing samples whose absolute amplitude stays below
 *  `thresholdDb`. Default -40 dBFS is a sensible "is anyone singing" gate
 *  for vocal takes — quieter than typical breath, louder than room tone. */
export function trimSilence(buffer: AudioBuffer, thresholdDb = -40): AudioBuffer {
  const threshold = Math.pow(10, thresholdDb / 20);
  const ch0 = buffer.getChannelData(0);
  let first = 0;
  let last = buffer.length - 1;
  for (let i = 0; i < buffer.length; i++) {
    if (Math.abs(ch0[i]) > threshold) { first = i; break; }
  }
  for (let i = buffer.length - 1; i >= first; i--) {
    if (Math.abs(ch0[i]) > threshold) { last = i; break; }
  }
  // Pad a small fade window so the cut doesn't pop.
  const pad = Math.round(buffer.sampleRate * 0.02);
  first = Math.max(0, first - pad);
  last = Math.min(buffer.length - 1, last + pad);
  const newLen = Math.max(1, last - first + 1);
  const out = makeBuffer(buffer, newLen);
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const src = buffer.getChannelData(c);
    const dst = out.getChannelData(c);
    for (let i = 0; i < newLen; i++) dst[i] = src[first + i];
  }
  return out;
}

/** Scale the buffer so its peak hits `targetDb` (default -1 dBFS).
 *  Guards against amplifying silence to infinity. */
export function normalize(buffer: AudioBuffer, targetDb = -1): AudioBuffer {
  let peak = 0;
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < data.length; i++) {
      const v = Math.abs(data[i]);
      if (v > peak) peak = v;
    }
  }
  if (peak < 1e-5) return buffer; // effectively silence — leave alone
  const target = Math.pow(10, targetDb / 20);
  const gain = target / peak;
  const out = makeBuffer(buffer, buffer.length);
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const src = buffer.getChannelData(c);
    const dst = out.getChannelData(c);
    for (let i = 0; i < buffer.length; i++) dst[i] = src[i] * gain;
  }
  return out;
}

/** Hum + hiss reduction via OfflineAudioContext: a 90Hz high-pass to
 *  kill mains hum and rumble, a 6kHz low-pass shelf to tame mic hiss,
 *  plus a simple amplitude gate so room tone between phrases drops out.
 *  Not a deep ML denoiser — but a real, audible cleanup that's safe on
 *  vocals. */
export async function reduceNoise(buffer: AudioBuffer): Promise<AudioBuffer> {
  const ctx = new OfflineAudioContext(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 90;
  hp.Q.value = 0.7;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowshelf';
  lp.frequency.value = 6000;
  lp.gain.value = -3;
  src.connect(hp).connect(lp).connect(ctx.destination);
  src.start();
  const filtered = await ctx.startRendering();

  // Amplitude gate pass — anything below -45 dBFS for >40ms gets
  // attenuated by 12 dB. Smooth attack/release so phrases don't chatter.
  const gateThreshold = Math.pow(10, -45 / 20);
  const attackSamples = Math.max(1, Math.round(filtered.sampleRate * 0.005));
  const releaseSamples = Math.max(1, Math.round(filtered.sampleRate * 0.080));
  const out = makeBuffer(filtered, filtered.length);
  for (let c = 0; c < filtered.numberOfChannels; c++) {
    const data = filtered.getChannelData(c);
    const dst = out.getChannelData(c);
    let env = 0;
    let gain = 1;
    for (let i = 0; i < data.length; i++) {
      const v = Math.abs(data[i]);
      env = v > env ? env + (v - env) / attackSamples : env + (v - env) / releaseSamples;
      const target = env < gateThreshold ? 0.25 : 1; // -12 dB on gate
      gain += (target - gain) / releaseSamples;
      dst[i] = data[i] * gain;
    }
  }
  return out;
}
