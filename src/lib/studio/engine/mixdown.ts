// Render a Session to a WAV blob via Tone.Offline. Used for "Export
// mixdown" and "Share take to class". Renders at session.length_seconds
// + a small tail to capture reverb decay.

import * as Tone from 'tone';
import type { Session } from '../session';
import { buildFxChain } from './fx';
import { buildTrack } from './tracks';
import { dbToGain } from './engine';
import { encodeWavFromBufferLike } from '@/lib/audio/sharedRecorder';
import { preloadGwSession } from './layeredSampler';

const TAIL_SECONDS = 1.5;

export async function renderSessionToWav(session: Session): Promise<Blob> {
  // Premium (gw:) instruments load their manifests asynchronously; warm the
  // module cache first so buildTrack constructs them synchronously inside
  // Tone.Offline — otherwise those tracks render as silence.
  await preloadGwSession(session);
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
// Implementation now lives in the shared web recording engine
// (src/lib/audio/sharedRecorder.ts, encodeWavFromBufferLike) — the exact
// same header layout / interleave / clamp math this file used to inline.
// A real AudioBuffer structurally satisfies AudioBufferLike, so this is
// a pure delegation; the export name stays for existing call sites
// (StudioEditor, renderSessionToWav above).

export function audioBufferToWavBlob(buf: AudioBuffer): Blob {
  return encodeWavFromBufferLike(buf);
}
