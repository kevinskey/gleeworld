import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Music, Plus, Pencil, Trash2 } from 'lucide-react';
import { SingFlow } from './SingFlow';
import { ProgressTab } from './ProgressTab';
import { ClassProgressTab } from './ClassProgressTab';
import { generateExercise } from '@/lib/sightReading/generate';
import type { ExerciseIR } from '@/lib/sightReading/ir';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { isValidIr } from '@/lib/sightReading/irValidate';
import { toast } from 'sonner';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';

interface LibraryRow {
  id: string;
  title: string;
}

// Admin-only: create/edit entry points for teacher-authored notation exercises.
// Non-admins keep the plain empty state — they can't author exercises.
function LibraryTabAdmin() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<LibraryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from('gw_sight_reading_exercises')
      .select('id, title')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error('notation: failed to load exercise library', error);
        } else {
          setRows((data ?? []) as LibraryRow[]);
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-3">
      <Button
        type="button"
        className="w-full rounded-full"
        onClick={() => navigate('/dashboard/sight-reading/editor')}
      >
        <Plus className="mr-1.5 h-4 w-4" /> Create exercise
      </Button>

      {loading ? (
        <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
          <p className="text-sm text-slate-600">Loading…</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
          <p className="text-sm text-slate-600">No exercises yet. Create your first one above.</p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-2xl bg-white shadow-sm">
          {rows.map((row) => (
            <li key={row.id} className="flex items-center justify-between gap-2 px-4 py-3">
              <span className="text-sm text-slate-900">{row.title}</span>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/dashboard/sight-reading/editor/' + row.id)}
                >
                  <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                  onClick={async () => {
                    if (!confirm(`Delete "${row.title}"? This cannot be undone.`)) return;
                    // Optimistic remove — pop from state first, roll back on error.
                    const prev = rows;
                    setRows((r) => r.filter((x) => x.id !== row.id));
                    const { error } = await supabase
                      .from('gw_sight_reading_exercises')
                      .delete()
                      .eq('id', row.id);
                    if (error) {
                      setRows(prev);
                      toast.error('Could not delete', { description: error.message });
                    } else {
                      toast.success('Deleted');
                    }
                  }}
                  aria-label={`Delete ${row.title}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const ACTIVITY_KEY = 'gw_sight_reading_activity'; // existing key, unchanged

// The empty state IS the primary state. Every scoring table in production has
// zero rows, so there are no Average / Best / Attempts cards anywhere here.
// Theory left this page entirely — it belongs to Glee Academy — so there is no
// Theory tab, card, or footer link.
export default function SightReadingStudio() {
  const [exercise, setExercise] = useState<ExerciseIR | null>(null);
  const [level, setLevel] = useState(1);
  const [musicKey, setMusicKey] = useState('C');
  const [measures, setMeasures] = useState(8);
  const [priming, setPriming] = useState(false);
  const { isAdmin } = useUserRole();
  const [searchParams] = useSearchParams();
  // Open on the Library tab when arrived from the notation editor's "← Library" button.
  const initialTab = searchParams.get('tab') === 'library' ? 'library' : 'practice';

  // Deep link from a Glee Academy template course: load that exercise's IR into
  // the practice flow instead of a generated line. Invalid/missing → toast and
  // fall back to the normal studio.
  const academyExerciseId = searchParams.get('academyExercise');
  useEffect(() => {
    if (!academyExerciseId) return;
    let cancelled = false;
    supabase
      .from('gw_academy_exercises')
      .select('id, data')
      .eq('id', academyExerciseId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        const ir = (data?.data as { ir?: unknown } | null)?.ir;
        if (error || !isValidIr(ir)) {
          toast.error('Could not load that exercise — generating a practice line instead.');
          return;
        }
        setExercise(ir);
      });
    return () => {
      cancelled = true;
    };
  }, [academyExerciseId]);

  const start = () =>
    setExercise(generateExercise({ level, key: musicKey, seed: Math.floor(Math.random() * 1e9), bars: measures }));

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
    <DashboardPageShell
      title="Sight Reading"
      subtitle="Sing a line, get instant feedback. No grades — just practice."
      maxWidth="4xl"
    >
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
        <span className="ml-2 text-slate-600">Measures</span>
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

      <Tabs defaultValue={initialTab}>
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
          {isAdmin() && (
            <TabsTrigger value="class" className="flex-1">
              Class
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="practice" className="pt-4">
          <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
            <p className="text-sm text-slate-600">Nothing yet. Generate a line above and sing it.</p>
          </div>
        </TabsContent>

        <TabsContent value="library" className="pt-4">
          {isAdmin() ? (
            <LibraryTabAdmin />
          ) : (
            <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
              <p className="text-sm text-slate-600">Your teacher hasn’t added any scores yet.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="progress" className="pt-4">
          <ProgressTab activityKey={ACTIVITY_KEY} />
        </TabsContent>

        {isAdmin() && (
          <TabsContent value="class" className="pt-4">
            <ClassProgressTab />
          </TabsContent>
        )}
      </Tabs>
    </DashboardPageShell>
  );
}
