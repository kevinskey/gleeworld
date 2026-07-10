import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Music } from 'lucide-react';
import { SingFlow } from './SingFlow';
import { generateExercise } from '@/lib/sightReading/generate';
import type { ExerciseIR } from '@/lib/sightReading/ir';

const ACTIVITY_KEY = 'gw_sight_reading_activity'; // existing key, unchanged

// The empty state IS the primary state. Every scoring table in production has
// zero rows, so there are no Average / Best / Attempts cards anywhere here.
// Theory left this page entirely — it belongs to Glee Academy — so there is no
// Theory tab, card, or footer link.
export default function SightReadingStudio() {
  const [exercise, setExercise] = useState<ExerciseIR | null>(null);
  const [level, setLevel] = useState(1);
  const [musicKey, setMusicKey] = useState('C');
  const [priming, setPriming] = useState(false);

  const start = () =>
    setExercise(generateExercise({ level, key: musicKey, seed: Math.floor(Math.random() * 1e9) }));

  // The pitch pipe is a chip, not a tab: it sounds the current key's tonic so a
  // student can find their footing before starting.
  const soundPitchPipe = async () => {
    if (priming) return;
    setPriming(true);
    try {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      if (ctx.state !== 'running') await ctx.resume();
      const ir = generateExercise({ level, key: musicKey, seed: 1 });
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
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 1.35);
      await new Promise((r) => setTimeout(r, 1400));
      await ctx.close();
    } catch {
      /* audio blocked — the button just does nothing */
    } finally {
      setPriming(false);
    }
  };

  if (exercise) {
    return <SingFlow exercise={exercise} onExit={() => setExercise(null)} activityKey={ACTIVITY_KEY} />;
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Sight Reading</h1>
        <p className="text-sm text-slate-600">
          Sing a line, get instant feedback. No grades — just practice.
        </p>
      </header>

      <Button size="lg" className="w-full rounded-full" onClick={start}>
        Start practice
      </Button>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <label className="text-slate-600" htmlFor="sr-key">
          Key
        </label>
        <select
          id="sr-key"
          className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
          value={musicKey}
          onChange={(e) => setMusicKey(e.target.value)}
        >
          {['C', 'D', 'Eb', 'E', 'F', 'G', 'A', 'Bb'].map((k) => (
            <option key={k}>{k}</option>
          ))}
        </select>
        <span className="ml-2 text-slate-600">Level</span>
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
        <Button
          variant="outline"
          size="sm"
          className="ml-auto rounded-full"
          onClick={soundPitchPipe}
          disabled={priming}
        >
          <Music className="mr-1.5 h-4 w-4" /> Pitch pipe
        </Button>
      </div>

      <Tabs defaultValue="practice">
        <TabsList className="w-full">
          <TabsTrigger value="practice" className="flex-1">
            Practice
          </TabsTrigger>
          <TabsTrigger value="library" className="flex-1">
            Library
          </TabsTrigger>
          <TabsTrigger value="progress" className="flex-1">
            Progress
          </TabsTrigger>
        </TabsList>

        <TabsContent value="practice" className="pt-4">
          <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
            <p className="text-sm text-slate-600">Nothing yet. Generate a line above and sing it.</p>
          </div>
        </TabsContent>

        <TabsContent value="library" className="pt-4">
          <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
            <p className="text-sm text-slate-600">Your teacher hasn’t added any scores yet.</p>
          </div>
        </TabsContent>

        <TabsContent value="progress" className="pt-4">
          <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
            <p className="text-sm text-slate-600">
              No takes yet. Sing your first line and your progress shows up here.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
