import { useEffect, useState } from 'react';
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { emptyScore, EditorScore } from '@/lib/notation/model';
import { NoteEditor } from '@/pages/notation/NoteEditor';
import { saveExercise, loadExercise } from '@/lib/notation/exercisesApi';
import { editorScoreToParsed } from '@/lib/notation/toParsedScore';
import { layoutMeasures } from '@/lib/notation/measures';
import { useTonePlayback } from '@/components/sight-singing/hooks/useTonePlayback';
import { AssignExerciseDialog } from './AssignExerciseDialog';
import { useUserRole } from '@/hooks/useUserRole';
import { toast } from 'sonner';

const SELECT = 'rounded border border-slate-300 bg-white px-1.5 py-1 text-sm text-slate-900';
const FIELD = 'flex items-center gap-1.5 text-xs font-medium text-slate-600';

// The Key control picks a TONIC; the key signature (keyFifths) is derived from tonic + mode,
// so switching Mode re-signs the same tonic (C major = 0, C minor = 3 flats).
const TONICS: { name: string; major: number; minor: number }[] = [
  { name: 'C', major: 0, minor: -3 },
  { name: 'G', major: 1, minor: -2 },
  { name: 'D', major: 2, minor: -1 },
  { name: 'A', major: 3, minor: 0 },
  { name: 'E', major: 4, minor: 1 },
  { name: 'B', major: 5, minor: 2 },
  { name: 'F#', major: 6, minor: 3 },
  { name: 'F', major: -1, minor: -4 },
  { name: 'Bb', major: -2, minor: -5 },
  { name: 'Eb', major: -3, minor: -6 },
  { name: 'Ab', major: -4, minor: -7 },
];
const fifthsFor = (tonic: string, mode: 'major' | 'minor') =>
  (TONICS.find((t) => t.name === tonic) ?? TONICS[0])[mode];
const tonicFor = (fifths: number, mode: 'major' | 'minor') =>
  (TONICS.find((t) => t[mode] === fifths) ?? TONICS[0]).name;

export default function NotationEditorPage() {
  const { exerciseId } = useParams();
  const navigate = useNavigate();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [score, setScore] = useState<EditorScore>(emptyScore());
  const [savedId, setSavedId] = useState<string | undefined>(exerciseId);
  const [saving, setSaving] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [tempoText, setTempoText] = useState(String(score.tempo));
  const { isPlaying, startPlayback, stopPlayback } = useTonePlayback();

  useEffect(() => {
    if (!exerciseId) return;
    loadExercise(exerciseId)
      .then(setScore)
      .catch((err) => {
        console.error('notation: failed to load exercise', err);
        toast.error('Could not load that exercise.');
      });
  }, [exerciseId]);

  // Keep the raw text in sync when tempo changes from elsewhere (e.g. loading an exercise).
  useEffect(() => {
    setTempoText(String(score.tempo));
  }, [score.tempo]);

  const overfull = layoutMeasures(score).some((m) => m.overfull);

  const handlePlay = () => {
    // Faithful path: build the playback score straight from the in-memory EditorScore
    // (ties preserved) instead of serializing to MusicXML and re-parsing with the lossy parser.
    void startPlayback(editorScoreToParsed(score), score.tempo, 'click-and-score');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { id } = await saveExercise(score, savedId ?? exerciseId);
      setSavedId(id);
      toast.success('Exercise saved.');
    } catch (err) {
      console.error('notation: failed to save exercise', err);
      toast.error('Could not save this exercise.');
    } finally {
      setSaving(false);
    }
  };

  const assignTargetId = savedId ?? exerciseId;

  if (roleLoading) return null;
  if (!isAdmin()) return <Navigate to="/dashboard/sight-reading" replace />;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-2 px-4 py-3">
      {/* Row 1: back-to-library + title + primary actions */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-1 px-2"
          onClick={() => navigate('/dashboard/sight-reading?tab=library')}
        >
          <ArrowLeft className="h-4 w-4" />
          Library
        </Button>
        <Input
          aria-label="Title"
          value={score.title}
          onChange={(e) => setScore((s) => ({ ...s, title: e.target.value }))}
          placeholder="Exercise title"
          className="h-9 w-full max-w-xs sm:flex-1"
        />
        <div className="flex items-center gap-2">
          {isPlaying ? (
            <Button type="button" size="sm" variant="outline" onClick={() => stopPlayback()}>
              Stop
            </Button>
          ) : (
            <Button type="button" size="sm" variant="outline" onClick={handlePlay}>
              Play
            </Button>
          )}
          <Button type="button" size="sm" onClick={handleSave} disabled={overfull || saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setAssignOpen(true)}
            disabled={!assignTargetId}
          >
            Assign
          </Button>
        </div>
        {overfull && (
          <span className="text-xs text-amber-600">A measure is overfull — fix it before saving.</span>
        )}
      </div>

      {/* Row 2: score settings — inline label + control pairs on one compact line */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <label className={FIELD}>
          Key
          <select
            className={SELECT}
            value={tonicFor(score.keyFifths, score.mode)}
            onChange={(e) => setScore((s) => ({ ...s, keyFifths: fifthsFor(e.target.value, s.mode) }))}
          >
            {TONICS.map((t) => (
              <option key={t.name} value={t.name}>{t.name}</option>
            ))}
          </select>
        </label>

        <label className={FIELD}>
          Mode
          <select
            className={SELECT}
            value={score.mode}
            onChange={(e) => {
              const mode = e.target.value as EditorScore['mode'];
              // Keep the same tonic; re-derive the signature for the new mode.
              setScore((s) => ({ ...s, mode, keyFifths: fifthsFor(tonicFor(s.keyFifths, s.mode), mode) }));
            }}
          >
            <option value="major">major</option>
            <option value="minor">minor</option>
          </select>
        </label>

        <label className={FIELD}>
          Time
          <select
            className={SELECT}
            value={`${score.timeSig.beats}/${score.timeSig.beatType}`}
            onChange={(e) => {
              const [b, bt] = e.target.value.split('/').map(Number);
              setScore((s) => ({ ...s, timeSig: { beats: b, beatType: bt } }));
            }}
          >
            <option value="4/4">4/4</option>
            <option value="3/4">3/4</option>
            <option value="2/4">2/4</option>
            <option value="6/8">6/8</option>
            <option value="3/8">3/8</option>
            <option value="2/2">2/2</option>
            <option value="5/4">5/4</option>
          </select>
        </label>

        <label className={FIELD}>
          Clef
          <select
            className={SELECT}
            value={score.clef}
            onChange={(e) => setScore((s) => ({ ...s, clef: e.target.value as EditorScore['clef'] }))}
          >
            <option value="treble">treble</option>
            <option value="bass">bass</option>
            <option value="alto">alto</option>
          </select>
        </label>

        <label className={FIELD}>
          Tempo
          <input
            type="number"
            min="20"
            max="400"
            className={`${SELECT} w-16`}
            value={tempoText}
            onChange={(e) => setTempoText(e.target.value)}
            onBlur={() => {
              const n = Math.max(20, Math.min(400, Number(tempoText) || score.tempo));
              setScore((s) => ({ ...s, tempo: n }));
              setTempoText(String(n));
            }}
          />
        </label>
      </div>

      <NoteEditor score={score} onChange={setScore} />

      {assignTargetId && (
        <AssignExerciseDialog
          exerciseId={assignTargetId}
          title={score.title}
          open={assignOpen}
          onOpenChange={setAssignOpen}
        />
      )}
    </div>
  );
}
