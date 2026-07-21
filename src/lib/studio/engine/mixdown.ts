// Render a Session to a WAV blob via Tone.Offline. Used for "Export
// mixdown" and "Share take to class". Renders at session.length_seconds
// + a small tail to capture reverb decay.

import * as Tone from 'tone';
import type { Session } from '../session';
import { MASTER_BUS_ID } from '../session';
import { buildFxChain } from './fx';
import { buildTrack } from './tracks';
import { buildBus } from './buses';
import { buildSend } from './sends';
import { dbToGain } from './engine';
import { encodeWavFromBufferLike } from '@/lib/audio/sharedRecorder';
import { preloadGwSession } from './layeredSampler';
import { findRoutingCycle, type RoutingEdge } from '../routingGraph';

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

    // Phase 7 — v2.0.0 bus/send graph mirrored offline. Same shape as
    // exportRender.renderWindow and engine.loadSession, minimally
    // inlined here so the older mixdown path stays a one-file
    // stand-alone WAV bounce.
    const busInputs = new Map<string, Tone.ToneAudioNode>();
    const busGraphOk = findRoutingCycle(
      (session.buses ?? []).map<RoutingEdge>((b) => ({ from: b.id, to: b.output.bus_id })),
    ).ok;
    const engineBuses = new Map<string, ReturnType<typeof buildBus>>();
    if (busGraphOk) {
      for (const b of session.buses ?? []) {
        const bus = buildBus(b);
        engineBuses.set(b.id, bus);
        busInputs.set(b.id, bus.input);
      }
    }
    const resolveTarget = (busId: string): Tone.ToneAudioNode =>
      busId === MASTER_BUS_ID ? masterIn : (busInputs.get(busId) ?? masterIn);
    if (busGraphOk) {
      for (const b of session.buses ?? []) {
        const eng = engineBuses.get(b.id);
        if (eng) eng.output.connect(resolveTarget(b.output.bus_id));
      }
    }

    const engineTracks = new Map<string, ReturnType<typeof buildTrack>>();
    for (const tr of session.tracks) {
      const eng = buildTrack(tr, session.assets);
      const targetBusId = tr.output?.bus_id ?? MASTER_BUS_ID;
      eng.output.connect(resolveTarget(targetBusId));
      engineTracks.set(tr.id, eng);
    }

    for (const tr of session.tracks) {
      const trackEng = engineTracks.get(tr.id);
      if (!trackEng || !tr.sends || tr.sends.length === 0) continue;
      for (const snd of tr.sends) {
        const targetInput = snd.target_bus_id === MASTER_BUS_ID
          ? masterIn
          : busInputs.get(snd.target_bus_id);
        if (!targetInput) continue;
        const source = snd.pre_fader ? trackEng.preFaderTap : trackEng.postFaderTap;
        buildSend(snd, source, targetInput);
      }
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
