// Render a Session to a WAV blob via Tone.Offline. Used for "Export
// mixdown" and "Share take to class". Renders at session.length_seconds
// + a small tail to capture reverb decay.

import * as Tone from 'tone';
import type { Session } from '../session';
import { buildFxChain } from './fx';
import { buildTrack } from './tracks';
import { dbToGain } from './engine';

const TAIL_SECONDS = 1.5;

export async function renderSessionToWav(session: Session): Promise<Blob> {
  const totalSeconds = Math.max(session.length_seconds + TAIL_SECONDS, 1);

  // Tone.Offline lets us re-build the same engine graph against an
  // OfflineAudioContext and renders to a Tone.ToneAudioBuffer.
  const buffer = await Tone.Offline(({ transport }) => {
    transport.bpm.value = session.tempo_bpm;
    transport.timeSignature = [
      session.time_signature.numerator,
      session.time_signature.denominator,
    ];

    const masterIn = new Tone.Gain(dbToGain(session.master.volume_db));
    const masterFx = buildFxChain(session.master.fx);
    masterIn.connect(masterFx.input);
    masterFx.output.toDestination();

    for (const tr of session.tracks) {
      const eng = buildTrack(tr, session.assets);
      eng.output.connect(masterIn);
    }

    transport.start(0);
  }, totalSeconds);

  return audioBufferToWavBlob(buffer.get() as AudioBuffer);
}

// ── AudioBuffer → 16-bit PCM WAV blob ─────────────────────────────────

export function audioBufferToWavBlob(buf: AudioBuffer): Blob {
  const numCh = buf.numberOfChannels;
  const sampleRate = buf.sampleRate;
  const length = buf.length;
  const bytesPerSample = 2; // 16-bit
  const dataSize = length * numCh * bytesPerSample;
  const headerSize = 44;
  const out = new ArrayBuffer(headerSize + dataSize);
  const view = new DataView(out);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');

  // fmt sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);             // PCM chunk size
  view.setUint16(20, 1, true);              // format = PCM
  view.setUint16(22, numCh, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numCh * bytesPerSample, true); // byte rate
  view.setUint16(32, numCh * bytesPerSample, true);              // block align
  view.setUint16(34, 16, true);             // bits per sample

  // data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Interleave + clamp to 16-bit.
  const channels: Float32Array[] = [];
  for (let c = 0; c < numCh; c++) channels.push(buf.getChannelData(c));

  let offset = headerSize;
  for (let i = 0; i < length; i++) {
    for (let c = 0; c < numCh; c++) {
      const s = Math.max(-1, Math.min(1, channels[c][i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }
  }
  return new Blob([out], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
}
