import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Music, Plus, Pencil, Trash2, Play, Loader2 } from 'lucide-react';
import { SingFlow } from './SingFlow';
import { ProgressTab } from './ProgressTab';
import { ClassProgressTab } from './ClassProgressTab';
import { generateExercise, type Voice } from '@/lib/sightReading/generate';
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
function LibraryTabAdmin({ onOpenExercise }: { onOpenExercise: (ir: ExerciseIR) => void }) {
  const navigate = useNavigate();
  const [rows, setRows] = useState<LibraryRow[]>([]);
  const [loading, setLoading] = useState(true);
  // Row currently being fetched (Open button spinner). Only one at a time —
  // clicking Open on a second row while the first is still loading just
  // reassigns; the earlier fetch's result is ignored on arrival because
  // the ref no longer matches.
  const [openingId, setOpeningId] = useState<string | null>(null);

  const openExercise = async (row: LibraryRow) => {
    setOpeningId(row.id);
    // params.ir is the same shape SingFlow expects — pre-baked at save
    // time by scoreToRow → editorScoreToIR. No conversion needed on open.
    const { data, error } = await supabase
      .from('gw_sight_reading_exercises')
      .select('params')
      .eq('id', row.id)
      .maybeSingle();
    setOpeningId((cur) => (cur === row.id ? null : cur));
    if (error || !data) {
      toast.error('Could not open exercise', { description: error?.message ?? 'not found' });
      return;
    }
    const ir = (data as any)?.params?.ir;
    if (!isValidIr(ir)) {
      toast.error('This exercise is missing playable notes.', {
        description: 'Edit it to add or fix the notation, then try again.',
      });
      return;
    }
    onOpenExercise(ir as ExerciseIR);
  };

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
                  size="sm"
                  className="rounded-full"
                  disabled={openingId === row.id}
                  onClick={() => openExercise(row)}
                  aria-label={`Open ${row.title} for practice`}
                >
                  {openingId === row.id ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Play className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Open
                </Button>
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
                    // Optimistic remove — pop from state first, roll back on
                    // error OR on RLS silent no-op. .select() returns the
                    // actually-deleted rows so we can distinguish "you don't
                    // have permission" (empty array, no error) from a real
                    // failure (error object).
                    const prev = rows;
                    setRows((r) => r.filter((x) => x.id !== row.id));
                    const { data, error } = await supabase
                      .from('gw_sight_reading_exercises')
                      .delete()
                      .eq('id', row.id)
                      .select('id');
                    if (error) {
                      setRows(prev);
                      toast.error('Could not delete', { description: error.message });
                    } else if (!data || data.length === 0) {
                      setRows(prev);
                      toast.error('Could not delete', {
                        description: "You aren't the owner of this exercise. Only its author or an admin can remove it.",
                      });
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
  // Voice choice constrains the generator's ambitus (and by extension
  // whether NotationView auto-picks bass clef) so an exercise sits on
  // the singer's actual tessitura. Persisted so a bass user doesn't
  // have to re-pick every session. Default soprano — matches the
  // legacy behavior most closely (treble clef, C4-A5 range).
  const [voice, setVoice] = useState<Voice>(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('gw_sr_voice') : null;
    return stored === 'alto' || stored === 'tenor' || stored === 'bass' ? stored : 'soprano';
  });
  useEffect(() => {
    try { localStorage.setItem('gw_sr_voice', voice); } catch { /* private mode */ }
  }, [voice]);
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
    setExercise(generateExercise({ level, key: musicKey, seed: Math.floor(Math.random() * 1e9), bars: measures, voice }));

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
        {/* Voice — anchors the exercise to a singer's actual tessitura:
            Soprano C4–A5, Alto G3–E5, Tenor C3–G4, Bass E2–C4. The
            generator shifts the tonic octave into that range and caps
            the ambitus, and NotationView auto-picks bass clef when the
            median pitch drops below A3. Placed first because it's the
            hardest to change mid-session (memorization is voice-anchored)
            while Key/Level/Measures are all one-tap. */}
        <label className="text-slate-600" htmlFor="sr-voice">
          Voice
        </label>
        <select
          id="sr-voice"
          className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
          value={voice}
          onChange={(e) => setVoice(e.target.value as Voice)}
        >
          <option value="soprano">Soprano</option>
          <option value="alto">Alto</option>
          <option value="tenor">Tenor</option>
          <option value="bass">Bass</option>
        </select>
        <label className="ml-2 text-slate-600" htmlFor="sr-key">
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
            <LibraryTabAdmin onOpenExercise={setExercise} />
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
