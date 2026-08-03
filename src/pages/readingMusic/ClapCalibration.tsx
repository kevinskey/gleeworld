// src/pages/readingMusic/ClapCalibration.tsx
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { getAudioCtx } from './audioCtx';
import { startMicOnsetSession } from '@/lib/rhythm/onsets/mic';
import type { MicOnsetSession } from '@/lib/rhythm/onsets/mic';
import { calibrationOffsetSec, CALIBRATION_CLICKS, CALIBRATION_BPM } from '@/lib/rhythm/clapBlast';

// One-time device latency measurement: play 8 loud clicks, the player claps
// along, the median clap−click delta becomes rm_clap_latency_ms (persisted by
// the parent). Clicks here are LOUD on purpose — unlike a take, the mic is
// supposed to hear you clap WITH them, and clap transients dwarf sine clicks.

type CalState = 'idle' | 'running' | 'failed';

interface Props {
  onDone: (ms: number) => void;
  onCancel: () => void;
}

export function ClapCalibration({ onDone, onCancel }: Props) {
  const [state, setState] = useState<CalState>('idle');
  const timersRef = useRef<number[]>([]);
  const sessionRef = useRef<MicOnsetSession | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const cleanup = () => {
    for (const t of timersRef.current) window.clearTimeout(t);
    timersRef.current = [];
    sessionRef.current?.dispose();
    sessionRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };
  useEffect(() => cleanup, []);

  const run = async () => {
    const ctx = getAudioCtx();
    if (!ctx) { toast.error('Audio unavailable'); return; }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
    } catch {
      toast.error('Microphone unavailable', { description: 'Calibration needs the mic. Tap input needs no calibration.' });
      onCancel();
      return;
    }
    streamRef.current = stream;
    setState('running');

    const spb = 60 / CALIBRATION_BPM;
    const t0 = ctx.currentTime + 0.35;
    const clickTimes = Array.from({ length: CALIBRATION_CLICKS }, (_, i) => i * spb);
    for (const c of clickTimes) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 1400;
      g.gain.setValueAtTime(0, t0 + c);
      g.gain.linearRampToValueAtTime(0.4, t0 + c + 0.004);
      g.gain.linearRampToValueAtTime(0, t0 + c + 0.05);
      osc.connect(g).connect(ctx.destination);
      osc.start(t0 + c);
      osc.stop(t0 + c + 0.06);
    }
    sessionRef.current = startMicOnsetSession(ctx, stream, t0);

    const endMs = (t0 + (CALIBRATION_CLICKS - 1) * spb + 0.7 - ctx.currentTime) * 1000;
    timersRef.current.push(window.setTimeout(() => {
      const claps = [...(sessionRef.current?.onsets ?? [])];
      cleanup();
      const offset = calibrationOffsetSec(clickTimes, claps);
      if (offset === null) {
        setState('failed');
        return;
      }
      onDone(Math.round(offset * 1000));
    }, endMs));
  };

  return (
    <div className="space-y-3 rounded-xl border border-sky-200 bg-sky-50 p-4">
      <p className="text-sm font-medium text-slate-800">Calibrate your clap timing</p>
      <p className="text-sm text-slate-600">
        Every device hears your claps a little late. Clap along with {CALIBRATION_CLICKS} clicks
        once, and Clap Blast will grade you fairly on this device.
      </p>
      {state === 'failed' && (
        <p className="text-sm font-medium text-red-600">
          We couldn't hear enough claps — get closer to the mic and try again.
        </p>
      )}
      <div className="flex items-center gap-2">
        <Button onClick={() => void run()} disabled={state === 'running'}>
          {state === 'running' ? 'Clap with the clicks…' : state === 'failed' ? 'Try again' : 'Start calibration'}
        </Button>
        <Button variant="outline" onClick={() => { cleanup(); onCancel(); }} disabled={state === 'running'}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
