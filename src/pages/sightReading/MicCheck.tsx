import { useState } from 'react';
import { useMicPitch } from '@/lib/sightReading/useMicPitch';

// Temporary on-device diagnostic harness for Task 7 of the Sight Reading
// Studio rebuild. Proves the mic -> cents path actually works on a physical
// iPhone (the simulator lies about audio) before any scoring UI is built on
// top of it. NOT part of the product surface — deleted once verified.
export default function MicCheck() {
  const { start, stop, permission, live, error, getCaptured } = useMicPitch();
  const [settings, setSettings] = useState<MediaTrackSettings | null>(null);
  const [probeError, setProbeError] = useState<string | null>(null);
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  const handleStart = async () => {
    // Probe the actual constraints iOS applies before handing off to the
    // hook's own getUserMedia call. iOS silently ignores constraints it
    // dislikes (autoGainControl in particular), and if AGC is actually on the
    // cents readings will wander and the scorer's tolerances become
    // meaningless — so this has to be checked on-device, not assumed.
    try {
      const probe = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      const track = probe.getAudioTracks()[0];
      setSettings(track ? track.getSettings() : null);
      probe.getTracks().forEach((t) => t.stop());
      setProbeError(null);
    } catch (err) {
      setProbeError(err instanceof Error ? err.message : String(err));
    }
    await start(80);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Mic check</h1>
      <p className="text-sm text-slate-600">Permission: {permission}</p>
      {error ? <p className="text-sm text-red-600">Pitch detection error: {error}</p> : null}
      {probeError ? <p className="text-sm text-red-600">Constraint probe failed: {probeError}</p> : null}

      <div className="flex gap-3">
        <button
          className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white"
          onClick={handleStart}
        >
          Start
        </button>
        <button
          className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-900"
          onClick={stop}
        >
          Stop
        </button>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        {live ? (
          <>
            <div className="text-5xl font-bold text-slate-900">
              {names[live.midi % 12]}
              {Math.floor(live.midi / 12) - 1}
            </div>
            <div className="mt-2 text-base text-slate-700">
              {live.cents.toFixed(1)} cents &middot; clarity {live.clarity.toFixed(2)}
            </div>
          </>
        ) : (
          <div className="text-sm text-slate-500">&mdash; no pitch &mdash;</div>
        )}
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">
          Applied audio constraints (from getSettings() on Start)
        </h2>
        {settings ? (
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-700">
            <dt>autoGainControl</dt>
            <dd>{String(settings.autoGainControl)}</dd>
            <dt>echoCancellation</dt>
            <dd>{String(settings.echoCancellation)}</dd>
            <dt>noiseSuppression</dt>
            <dd>{String(settings.noiseSuppression)}</dd>
            <dt>sampleRate</dt>
            <dd>{String(settings.sampleRate)}</dd>
          </dl>
        ) : (
          <p className="mt-2 text-xs text-slate-500">Tap Start to probe.</p>
        )}
      </div>

      <p className="text-xs text-slate-500">
        Students should sing a sustained note; this readout is for verifying the mic pipeline, not
        for classroom use.
      </p>

      <button
        className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700"
        onClick={() => console.log('captured notes', getCaptured())}
      >
        Log captured notes
      </button>
    </div>
  );
}
