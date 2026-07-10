import { useCallback, useRef, useState } from 'react';
import { hzToMidi, nearestMidi } from './pitch';
import type { SungNote } from './score';

type Permission = 'granted' | 'denied' | 'prompt';

// Owns mic permission + the AudioWorklet lifecycle for live pitch tracking.
// The worklet (public/worklets/gw-pitch.js) runs the actual detector on the
// audio thread and posts { hz, clarity, t } messages back over its port;
// this hook turns those into UI-facing `live` state and, in parallel,
// captures a SungNote[] timeline for scoring (src/lib/sightReading/score.ts).
export function useMicPitch() {
  const [permission, setPermission] = useState<Permission>('prompt');
  const [live, setLive] = useState<{ midi: number; cents: number; clarity: number } | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nodeRef = useRef<AudioWorkletNode | null>(null);
  const capturedRef = useRef<SungNote[]>([]);
  const startedAtRef = useRef(0);
  const tempoRef = useRef(80);

  const start = useCallback(async (tempo = 80) => {
    tempoRef.current = tempo;
    capturedRef.current = [];

    let stream: MediaStream;
    try {
      // All three processors OFF: AGC rides the level and destroys the cents
      // reading; noise suppression eats sustained vowels; echo cancellation
      // is irrelevant here (nothing is played back to the student) but left
      // explicit so a future change to that assumption doesn't silently
      // re-enable it.
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
    } catch {
      // Denial, no device, insecure context, etc. — never throw out of this
      // hook; the caller only needs to know permission didn't come through.
      setPermission('denied');
      return;
    }

    streamRef.current = stream;
    setPermission('granted');

    try {
      // Never hardcode a sample rate; the browser/device picks its own and
      // resampling to a fixed rate costs pitch-detection accuracy (cents).
      const ctx = new AudioContext();
      ctxRef.current = ctx;
      await ctx.audioWorklet.addModule('/worklets/gw-pitch.js');
      const src = ctx.createMediaStreamSource(stream);
      const node = new AudioWorkletNode(ctx, 'gw-pitch');
      nodeRef.current = node;
      startedAtRef.current = ctx.currentTime;

      node.port.onmessage = (e: MessageEvent<{ hz: number; clarity: number; t: number }>) => {
        const { hz, clarity } = e.data;
        if (!hz) {
          setLive(null);
          return;
        }
        const midi = nearestMidi(hz);
        const cents = (hzToMidi(hz) - midi) * 100;
        setLive({ midi, cents, clarity });

        const beats = ((ctx.currentTime - startedAtRef.current) * tempoRef.current) / 60;
        const last = capturedRef.current.at(-1);
        if (!last || last.midi !== midi) capturedRef.current.push({ midi, beatPos: beats });
      };

      src.connect(node);
      // Do NOT connect to ctx.destination — the student must not hear
      // themselves through this graph.
    } catch {
      // addModule/AudioContext failures (e.g. worklet 404, CSP blocking it)
      // must not throw out of the hook either. Tear down whatever mic access
      // was already granted so we don't leak an open stream.
      stream.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      ctxRef.current?.close();
      ctxRef.current = null;
      nodeRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    if (nodeRef.current) {
      nodeRef.current.port.onmessage = null;
      nodeRef.current.disconnect();
      nodeRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    ctxRef.current?.close();
    ctxRef.current = null;
    setLive(null);
  }, []);

  return { start, stop, permission, live, captured: capturedRef.current };
}
