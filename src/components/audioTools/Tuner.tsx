import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Mic, MicOff } from 'lucide-react';
import { startTuner, stopTuner, type TunerReading } from '@/lib/audioTools/tuner';

interface TunerProps {
  className?: string;
}

// Mic-input tuner. Permission is requested on Start; we keep the mic
// stream alive while running, release on stop. The needle is purely
// CSS — no canvas needed for a ±50¢ readout.
export function Tuner({ className }: TunerProps) {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState<TunerReading | null>(null);

  useEffect(() => {
    if (!running) return;
    setError(null);
    startTuner(setReading).catch((err) => {
      console.warn('[Tuner] start failed', err);
      setError(err?.message ?? 'Mic access denied.');
      setRunning(false);
    });
    return () => { stopTuner(); setReading(null); };
  }, [running]);

  // Clamp needle to ±50¢ — the meaningful range for in-tune-ness.
  const needlePct = reading
    ? Math.max(-1, Math.min(1, reading.cents / 50))
    : 0;
  const inTune = reading && Math.abs(reading.cents) <= 5;

  return (
    <div className={cn('p-3 space-y-3 bg-card border rounded-lg', className)}>
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">Guitar Tuner</div>
        <Button
          size="sm"
          variant={running ? 'default' : 'outline'}
          onClick={() => setRunning((v) => !v)}
          className="h-8 px-2"
        >
          {running ? <MicOff className="w-3.5 h-3.5 mr-1" /> : <Mic className="w-3.5 h-3.5 mr-1" />}
          {running ? 'Stop' : 'Start'}
        </Button>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="text-center py-2">
        <div className={cn(
          'text-5xl font-bold tabular-nums',
          inTune ? 'text-green-600' : 'text-foreground',
        )}>
          {reading ? `${reading.noteName}${reading.octave}` : '—'}
        </div>
        <div className="text-xs text-muted-foreground tabular-nums mt-1">
          {reading ? `${reading.frequency.toFixed(1)} Hz · ${reading.cents > 0 ? '+' : ''}${reading.cents}¢` : 'Sing or play a note'}
        </div>
      </div>

      <div className="relative h-8 bg-muted rounded-full">
        {/* Tick marks at -50, -25, 0, +25, +50 cents. */}
        <div className="absolute inset-y-2 left-1/2 w-[2px] bg-foreground/50" />
        <div className="absolute inset-y-3 left-[25%] w-px bg-foreground/30" />
        <div className="absolute inset-y-3 left-[75%] w-px bg-foreground/30" />
        <div className="absolute inset-y-3 left-[5%] w-px bg-foreground/20" />
        <div className="absolute inset-y-3 left-[95%] w-px bg-foreground/20" />
        {reading && (
          <div
            className={cn(
              'absolute top-0 bottom-0 w-1.5 rounded-full shadow-md',
              inTune ? 'bg-green-500' : 'bg-primary',
            )}
            style={{
              left: `calc(${50 + needlePct * 45}% - 3px)`,
              transition: 'left 80ms linear',
            }}
          />
        )}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground -mt-1 px-1">
        <span>-50¢</span>
        <span>flat</span>
        <span>0</span>
        <span>sharp</span>
        <span>+50¢</span>
      </div>

      <p className="text-[11px] text-muted-foreground italic text-center">
        Quietest room you can find. Choir conductors: A440 reference.
      </p>
    </div>
  );
}
