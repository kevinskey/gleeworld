import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import type { Voice } from '@/lib/sightReading/generate';
import { useUserRole } from '@/hooks/useUserRole';
import { DOMAINS } from '@/lib/readingMusic/domains';
import { ContinueTab } from '@/pages/readingMusic/ContinueTab';
import { PitchIntervalsTab } from '@/pages/readingMusic/PitchIntervalsTab';
import { SightSingingTab } from '@/pages/readingMusic/SightSingingTab';
import { PlaceholderTab } from '@/pages/readingMusic/PlaceholderTab';
import { DomainProgressTab } from '@/pages/readingMusic/DomainProgressTab';
import { SingFlow } from '@/pages/sightReading/SingFlow';
import { isValidIr } from '@/lib/sightReading/irValidate';
import type { ExerciseIR } from '@/lib/sightReading/ir';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Legacy ?tab= values from old SightReadingStudio that need remapping.
const RAW_TO_TAB: Record<string, string> = {
  library: 'continue',
  practice: 'sight_singing',
  'pitch-match': 'pitch_intervals',
};
const VALID_TABS = new Set(['continue', 'progress', 'class', ...DOMAINS.map((d) => d.id)]);

const ACTIVITY_KEY = 'gw_sight_reading_activity';

export default function ReadingMusicPage() {
  const { isAdmin } = useUserRole();
  const [searchParams] = useSearchParams();

  // C3/I7: whitelist known tab values; map legacy values into new taxonomy.
  const raw = searchParams.get('tab');
  const initialTab = raw && VALID_TABS.has(raw) ? raw : (raw && RAW_TO_TAB[raw]) || 'continue';
  const [tab, setTab] = useState<string>(initialTab);

  // C2: ?academyExercise=<id> deep-link — load exercise from academy and launch SingFlow.
  const academyExerciseId = searchParams.get('academyExercise');
  const [academyExercise, setAcademyExercise] = useState<ExerciseIR | null>(null);

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
          toast.error('Could not load that exercise — opening Reading Music instead.');
          return;
        }
        setAcademyExercise(ir as ExerciseIR);
      });
    return () => {
      cancelled = true;
    };
  }, [academyExerciseId]);

  // Shared voice control — persisted so bass students don't re-pick each
  // session. Matches the key the old SightReadingStudio wrote to.
  const [voice, setVoice] = useState<Voice>(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('gw_sr_voice') : null;
    return stored === 'alto' || stored === 'tenor' || stored === 'bass' ? stored : 'soprano';
  });
  useEffect(() => {
    try { localStorage.setItem('gw_sr_voice', voice); } catch { /* private mode */ }
  }, [voice]);

  // C2: Early-return into SingFlow when academy exercise deep-link resolved successfully.
  if (academyExercise) {
    return (
      <SingFlow
        exercise={academyExercise}
        onExit={() => setAcademyExercise(null)}
        activityKey={ACTIVITY_KEY}
      />
    );
  }

  return (
    <DashboardPageShell
      title="Reading Music"
      subtitle="Musicianship training from elementary to college level."
      maxWidth="6xl"
    >
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex flex-wrap w-full h-auto">
          <TabsTrigger value="continue">Continue</TabsTrigger>
          {DOMAINS.map((d) => (
            <TabsTrigger key={d.id} value={d.id}>{d.label}</TabsTrigger>
          ))}
          <TabsTrigger value="progress">Progress</TabsTrigger>
          {isAdmin() && <TabsTrigger value="class">Class</TabsTrigger>}
        </TabsList>

        <TabsContent value="continue" className="mt-4">
          <ContinueTab onGoTo={setTab} />
        </TabsContent>

        <TabsContent value="pitch_intervals" className="mt-4">
          <PitchIntervalsTab voice={voice} onVoiceChange={setVoice} />
        </TabsContent>

        <TabsContent value="rhythm" className="mt-4">
          <PlaceholderTab
            title="Rhythm Machine"
            shipsIn="Phase 2"
            blurb="Clap-back exercises, read-and-clap with Takadimi/Kodály/counting toggle, meter and syncopation drills."
          />
        </TabsContent>

        <TabsContent value="sight_singing" className="mt-4">
          <SightSingingTab voice={voice} onVoiceChange={setVoice} />
        </TabsContent>

        <TabsContent value="dictation" className="mt-4">
          <PlaceholderTab
            title="Melodic & Harmonic Dictation"
            shipsIn="Phase 2"
            blurb="Hear a phrase, notate it. Two-bar diatonic to full modulating dictation."
          />
        </TabsContent>

        <TabsContent value="harmony" className="mt-4">
          <PlaceholderTab
            title="Harmony & Chords"
            shipsIn="Phase 2"
            blurb="Chord quality ID, cadence ID, Roman numeral analysis."
          />
        </TabsContent>

        <TabsContent value="scales_theory" className="mt-4">
          <PlaceholderTab
            title="Scales & Theory"
            shipsIn="Phase 3"
            blurb="Key signatures, scale ID, modes, silent notation drills."
          />
        </TabsContent>

        <TabsContent value="progress" className="mt-4">
          <DomainProgressTab />
        </TabsContent>

        {isAdmin() && (
          <TabsContent value="class" className="mt-4">
            <PlaceholderTab
              title="Class Dashboard"
              shipsIn="Phase 3"
              blurb="Roster heatmap, assign flow, per-student progress, struggling-students weekly digest."
            />
          </TabsContent>
        )}
      </Tabs>
    </DashboardPageShell>
  );
}
