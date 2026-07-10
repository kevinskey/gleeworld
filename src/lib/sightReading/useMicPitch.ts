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
  const [error, setError] = useState<string | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nodeRef = useRef<AudioWorkletNode | null>(null);
  const capturedRef = useRef<SungNote[]>([]);
  const startedAtRef = useRef(0);
  const tempoRef = useRef(80);
  // Set to the just-captured MIDI number while a note is voiced, and cleared
  // (null) the instant a silent frame arrives. Note capture below compares
  // against this instead of `capturedRef.current.at(-1)`, so a rest always
  // resets the "last note" state — two identical pitches separated by a rest
  // (e.g. two consecutive Cs) push two SungNote entries, not one held note.
  const lastVoicedMidiRef = useRef<number | null>(null);
  // Bumped on every start()/stop() call. Captured locally at the top of each
  // start() as `sessionId`; async continuations (post-getUserMedia,
  // post-addModule) compare their local snapshot against the live ref and
  // abandon themselves if a newer session has since begun. This is what
  // makes start() safe against re-entrancy — a double tap, or a caller
  // invoking start() again before the first call's `await getUserMedia()`
  // resolves — without leaking the first call's mic stream/context.
  const sessionIdRef = useRef(0);

  const stop = useCallback(() => {
    // Invalidate any start() call currently in flight (awaiting
    // getUserMedia/addModule) so it tears itself down instead of adopting
    // shared refs out from under this stop().
    sessionIdRef.current += 1;
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

  const start = useCallback(
    async (tempo = 80) => {
      // Re-entrancy guard: tear down any active/in-flight session before
      // starting a new one. stop() is idempotent, so this is safe even if
      // no session exists yet.
      stop();
      const sessionId = ++sessionIdRef.current;

      tempoRef.current = tempo;
      capturedRef.current = [];
      lastVoicedMidiRef.current = null;
      setError(null);

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

      // A newer start() (or an explicit stop()) happened while we were
      // awaiting getUserMedia — abandon this session instead of clobbering
      // the newer one's refs, and don't leave this stream's mic open.
      if (sessionId !== sessionIdRef.current) {
        stream.getTracks().forEach((t) => t.stop());
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

        // Same supersede check as above, but past the (also async) addModule
        // await — a second start()/stop() could have landed while we waited.
        if (sessionId !== sessionIdRef.current) {
          ctx.close();
          stream.getTracks().forEach((t) => t.stop());
          if (ctxRef.current === ctx) ctxRef.current = null;
          if (streamRef.current === stream) streamRef.current = null;
          return;
        }

        const src = ctx.createMediaStreamSource(stream);
        const node = new AudioWorkletNode(ctx, 'gw-pitch');
        nodeRef.current = node;
        startedAtRef.current = ctx.currentTime;

        node.port.onmessage = (e: MessageEvent<{ hz: number; clarity: number; t: number }>) => {
          // Belt-and-suspenders: stop()/a newer start() nulls onmessage
          // synchronously, but guard anyway in case a message was already
          // queued for this session at the moment of teardown.
          if (sessionId !== sessionIdRef.current) return;

          const { hz, clarity } = e.data;
          if (!hz) {
            // Silent frame: a rest. Clear the dedup key so the next voiced
            // frame — even if it's the same MIDI number as before the rest —
            // always starts a new captured note (BUG 1 fix).
            setLive(null);
            lastVoicedMidiRef.current = null;
            return;
          }
          const midi = nearestMidi(hz);
          const cents = (hzToMidi(hz) - midi) * 100;
          setLive({ midi, cents, clarity });

          const beats = ((ctx.currentTime - startedAtRef.current) * tempoRef.current) / 60;
          if (lastVoicedMidiRef.current !== midi) {
            capturedRef.current.push({ midi, beatPos: beats });
          }
          lastVoicedMidiRef.current = midi;
        };

        src.connect(node);
        // Do NOT connect to ctx.destination — the student must not hear
        // themselves through this graph.
      } catch {
        // addModule/AudioContext failures (e.g. worklet 404, CSP blocking it)
        // must not throw out of the hook either. Warn loudly (matching
        // masterChain.ts's tryLoadWorklets precedent) instead of failing
        // silently — a silent addModule rejection here is the same class of
        // bug that caused the Cloudflare reload loop — and surface it via
        // `error` so a caller doesn't have to guess with a timeout.
        console.warn(
          'useMicPitch: AudioWorklet setup failed for /worklets/gw-pitch.js — live pitch tracking disabled.',
        );
        setError('Pitch detection failed to start (worklet /worklets/gw-pitch.js could not load).');
        // Tear down whatever mic access/context was already granted for this
        // session so a failed start() doesn't leak them.
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        ctxRef.current?.close();
        ctxRef.current = null;
        nodeRef.current = null;
      }
    },
    [stop],
  );

  // `captured` is intentionally NOT exposed as reactive state: pushing a
  // SungNote happens on nearly every voiced audio frame, and a useState
  // update at that rate would thrash React. Instead this getter returns a
  // fresh copy of the ref's current contents on demand — callers (e.g. the
  // end-of-take scorer) call it once when they actually need the timeline,
  // rather than depending on `captured` identity in a memo/effect, which
  // would never see updates since the ref's array identity never changes.
  const getCaptured = useCallback((): SungNote[] => [...capturedRef.current], []);

  return { start, stop, permission, live, error, getCaptured };
}
