// Studio engine status chip + error panel. Subscribes to the native engine's
// discrete events through the single remount-safe hook. Renders nothing on the
// happy path (and nothing at all on web, where there's no native engine).

import { useState } from 'react';
import { AlertCircle, Loader2, X } from 'lucide-react';
import { isNativeApp } from '@/lib/nativeTenant';
import { useStudioEngineEvents, type StudioEngineError } from '@/plugins/studioEngineEvents';

type Status = 'ready' | 'recovering' | 'error';

export function StudioEngineStatus() {
  const native = isNativeApp();
  const [status, setStatus] = useState<Status>('ready');
  const [errors, setErrors] = useState<StudioEngineError[]>([]);

  useStudioEngineEvents(
    {
      studioEngineReady: () => setStatus('ready'),
      audioInterrupted: () => setStatus('recovering'),
      engineRecovered: () => setStatus('ready'),
      studioEngineError: (e) => {
        setErrors((prev) => [e, ...prev].slice(0, 5));
        setStatus(e.recoverable ? 'recovering' : 'error');
      },
      trackFailed: (d) => { if (d.error) setErrors((prev) => [d.error as StudioEngineError, ...prev].slice(0, 5)); },
    },
    [native],
  );

  if (!native) return null;

  return (
    <>
      {status !== 'ready' && (
        <div
          className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
            status === 'recovering'
              ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
              : 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
          }`}
          role="status"
        >
          {status === 'recovering' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <AlertCircle className="w-3.5 h-3.5" />}
          {status === 'recovering' ? 'Recovering audio…' : 'Audio engine error'}
        </div>
      )}

      {errors.length > 0 && (
        <div className="mt-2 rounded-lg border border-rose-300/60 bg-rose-50 dark:bg-rose-950/30 p-2.5 text-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-rose-700 dark:text-rose-300 inline-flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" /> Studio audio issues
            </span>
            <button onClick={() => setErrors([])} className="text-rose-600/70 hover:text-rose-700" aria-label="Dismiss">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <ul className="space-y-1">
            {errors.map((e, i) => (
              <li key={i} className="text-rose-800/90 dark:text-rose-200/90">
                <span className="font-mono">{e.operation}</span>: {e.message}{' '}
                <span className="opacity-60">({e.code}{e.recoverable ? '' : ' · needs reload'})</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
