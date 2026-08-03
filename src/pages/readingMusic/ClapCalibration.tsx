import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { getAudioCtx } from './audioCtx';
import { startMicOnsetSession } from '@/lib/rhythm/onsets/mic';
import type { MicOnsetSession } from '@/lib/rhythm/onsets/mic';
import { calibrationOffsetSec, CALIBRATION_CLICKS, CALIBRATION_BPM } from '@/lib/rhythm/clapBlast';

// One-time device latency measurement — deliberately VISUAL-ONLY, no audio.
//
// Clap Blast is a visually-synchronized game: notes scroll against the raw
// musical clock and the player claps to what the hit line shows. So the number
// we need is the *visual* round trip (screen → hands → mic → onset detector),
// not the audio one. An audible metronome would instead measure speaker output
// latency + input latency, and grading a player who claps to pixels with an
// output-latency-inflated offset reads every clap as early — badly so on
// Bluetooth iPads.
//
// Silence also removes two failure modes the audible version had: loud clicks
// bleeding into the open (echoCancellation:false) mic and self-triggering the
// onset detector, whose 80 ms refractory would then swallow the real clap; and
// scheduled oscillators outliving a Cancel.
//
// The pulses are driven off ctx.currentTime in a rAF loop so the pulse times
// and the mic onset timestamps share one clock. The median (clap − pulse)
// delta becomes rm_clap_latency_ms (persisted by the parent).

type CalState = 'idle' | 'running' | 'failed';
export type CalCancelReason = 'denied' | 'user';

interface Props {
  onDone: (ms: number) => void;
  onCancel: (reason: CalCancelReason) => void;
}

const FLASH_SEC = 0.14;

export function ClapCalibration({ onDone, onCancel }: Props) {
  const [state, setState] = useState<CalState>('idle');
  const [pulseIdx, setPulseIdx] = useState(-1);
  const [lit, setLit] = useState(false);
  const timersRef = useRef<number[]>([]);
  const rafRef = useRef(0);
  const sessionRef = useRef<MicOnsetSession | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const runningRef = useRef(false);

  const cleanup = () => {
    runningRef.current = false;
    for (const t of timersRef.current) window.clearTimeout(t);
    timersRef.current = [];
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    sessionRef.current?.dispose();
    sessionRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };
  useEffect(() => cleanup, []);

  const run = async () => {
    if (runningRef.current) return;
    runningRef.current = true;

    const ctx = getAudioCtx();
    if (!ctx) { toast.error('Audio unavailable'); cleanup(); return; }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
    } catch {
      toast.error('Microphone unavailable', { description: 'Calibration needs the mic. Tap input needs no calibration.' });
      cleanup();
      onCancel('denied');
      return;
    }
    streamRef.current = stream;
    setState('running');
    setPulseIdx(-1);
    setLit(false);

    try {
      const spb = 60 / CALIBRATION_BPM;
      // A little lead-in so the player sees the circle before pulse one.
      const t0 = ctx.currentTime + 0.9;
      const pulseTimes = Array.from({ length: CALIBRATION_CLICKS }, (_, i) => i * spb);
      sessionRef.current = startMicOnsetSession(ctx, stream, t0);

      // Visuals ride the audio clock, same clock the onsets are stamped on.
      const loop = () => {
        const rel = ctx.currentTime - t0;
        let idx = -1;
        for (let i = 0; i < pulseTimes.length; i++) if (rel >= pulseTimes[i]) idx = i;
        setPulseIdx(idx);
        setLit(idx >= 0 && rel - pulseTimes[idx] < FLASH_SEC);
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);

      const endMs = (t0 + (CALIBRATION_CLICKS - 1) * spb + 0.7 - ctx.currentTime) * 1000;
      timersRef.current.push(window.setTimeout(() => {
        const claps = [...(sessionRef.current?.onsets ?? [])];
        cleanup();
        setPulseIdx(-1);
        setLit(false);
        const offset = calibrationOffsetSec(pulseTimes, claps);
        if (offset === null) {
          setState('failed');
          return;
        }
        onDone(Math.round(offset * 1000));
      }, endMs));
    } catch {
      cleanup();
      setState('failed');
      toast.error('Calibration failed', { description: 'Audio error — try again.' });
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-sky-200 bg-sky-50 p-4">
      <p className="text-sm font-medium text-slate-800">Calibrate your clap timing</p>
      <p className="text-sm text-slate-600">
        Every device hears your claps a little late. Clap once on each of the {CALIBRATION_CLICKS} flashes
        below — no sound, just watch the circle — and Clap Blast will grade you fairly on this device.
      </p>

      {state === 'running' && (
        <div className="flex flex-col items-center gap-2 py-2">
          <div
            data-role="cal-pulse"
            data-lit={lit ? 'on' : 'off'}
            className={`flex h-32 w-32 items-center justify-center rounded-full border-4 transition-transform duration-75 ${
              lit
                ? 'scale-110 border-sky-600 bg-sky-500 text-white'
                : 'scale-100 border-sky-300 bg-white text-sky-700'
            }`}
          >
            <span className="text-3xl font-bold tabular-nums">{Math.max(0, pulseIdx + 1)}</span>
          </div>
          <p className="text-sm font-medium text-slate-700">
            Clap the moment it flashes ({Math.max(0, pulseIdx + 1)} of {CALIBRATION_CLICKS})
          </p>
        </div>
      )}

      {state === 'failed' && (
        <p className="text-sm font-medium text-red-600">
          We couldn't hear enough claps — get closer to the mic and try again.
        </p>
      )}
      <div className="flex items-center gap-2">
        <Button onClick={() => void run()} disabled={state === 'running'}>
          {state === 'running' ? 'Clap with the flashes…' : state === 'failed' ? 'Try again' : 'Start calibration'}
        </Button>
        <Button variant="outline" onClick={() => { cleanup(); setState('idle'); onCancel('user'); }}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
