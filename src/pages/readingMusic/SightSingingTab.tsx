import { useState } from 'react';
import { Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SingFlow } from '@/pages/sightReading/SingFlow';
import { generateExercise, type Voice } from '@/lib/sightReading/generate';
import type { ExerciseIR } from '@/lib/sightReading/ir';

const ACTIVITY_KEY = 'gw_sight_reading_activity';

interface Props {
  voice: Voice;
  onVoiceChange: (v: Voice) => void;
}

export function SightSingingTab({ voice, onVoiceChange }: Props) {
  const [exercise, setExercise] = useState<ExerciseIR | null>(null);
  const [level, setLevel] = useState(1);
  const [musicKey, setMusicKey] = useState('C');
  const [measures, setMeasures] = useState(8);
  const [priming, setPriming] = useState(false);

  const start = () =>
    setExercise(
      generateExercise({ level, key: musicKey, seed: Math.floor(Math.random() * 1e9), bars: measures, voice }),
    );

  const soundPitchPipe = async () => {
    if (priming) return;
    setPriming(true);
    try {
      const AC = window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      if (ctx.state !== 'running') await ctx.resume();
      const ir = generateExercise({ level, key: musicKey, seed: 1, voice });
      const hz = 440 * Math.pow(2, (ir.tonicMidi - 69) / 12);
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = hz;
      const t = ctx.currentTime;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.2, t + 0.02);
      g.gain.setValueAtTime(0.2, t + 1.1);
      g.gain.linearRampToValueAtTime(0, t + 1.3);
      osc.connect(g); g.connect(ctx.destination);
      osc.start(t); osc.stop(t + 1.35);
      await new Promise((r) => setTimeout(r, 1400));
      await ctx.close();
    } catch {
      /* audio blocked */
    } finally {
      setPriming(false);
    }
  };

  if (exercise) {
    return <SingFlow exercise={exercise} onExit={() => setExercise(null)} activityKey={ACTIVITY_KEY} />;
  }

  return (
    <div className="space-y-4">
      <Button size="lg" className="w-full rounded-full" onClick={start}>
        Start practice
      </Button>

      <Card>
        <CardContent className="p-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <div className="inline-flex items-center gap-2">
            <label className="text-slate-600" htmlFor="ss-voice">Voice</label>
            <select
              id="ss-voice"
              className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
              value={voice}
              onChange={(e) => onVoiceChange(e.target.value as Voice)}
            >
              <option value="soprano">Soprano</option>
              <option value="alto">Alto</option>
              <option value="tenor">Tenor</option>
              <option value="bass">Bass</option>
            </select>
          </div>
          <div className="inline-flex items-center gap-2">
            <label className="text-slate-600" htmlFor="ss-key">Key</label>
            <select
              id="ss-key"
              className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
              value={musicKey}
              onChange={(e) => setMusicKey(e.target.value)}
            >
              {['C', 'D', 'Eb', 'E', 'F', 'G', 'A', 'Bb'].map((k) => (<option key={k}>{k}</option>))}
            </select>
          </div>
          <div className="inline-flex items-center gap-1.5">
            <span className="text-slate-600 mr-1">Level</span>
            {[1, 2, 3, 4, 5, 6].map((l) => (
              <button
                key={l}
                type="button"
                aria-label={`Level ${l}`}
                aria-pressed={level === l}
                onClick={() => setLevel(l)}
                className={`h-8 w-8 rounded-full text-sm font-semibold ${
                  level === l ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
          <div className="inline-flex items-center gap-1.5">
            <span className="text-slate-600 mr-1">Measures</span>
            {[4, 8, 16].map((m) => (
              <button
                key={m}
                type="button"
                aria-label={`${m} measures`}
                aria-pressed={measures === m}
                onClick={() => setMeasures(m)}
                className={`h-8 min-w-[2rem] rounded-full px-2 text-sm font-semibold ${
                  measures === m ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" className="sm:ml-auto rounded-full" onClick={soundPitchPipe} disabled={priming}>
            <Music className="mr-1.5 h-4 w-4" /> Pitch pipe
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
