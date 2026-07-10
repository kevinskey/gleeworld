import { useEffect, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { emptyScore, EditorScore } from '@/lib/notation/model';
import { NoteEditor } from '@/pages/notation/NoteEditor';
import { saveExercise, loadExercise } from '@/lib/notation/exercisesApi';
import { editorScoreToMusicXML } from '@/lib/notation/musicxmlWrite';
import { layoutMeasures } from '@/lib/notation/measures';
import { useTonePlayback } from '@/components/sight-singing/hooks/useTonePlayback';
import { AssignExerciseDialog } from './AssignExerciseDialog';
import { useUserRole } from '@/hooks/useUserRole';
import { toast } from 'sonner';

export default function NotationEditorPage() {
  const { exerciseId } = useParams();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [score, setScore] = useState<EditorScore>(emptyScore());
  const [savedId, setSavedId] = useState<string | undefined>(exerciseId);
  const [saving, setSaving] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
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

  const overfull = layoutMeasures(score).some((m) => m.overfull);

  const handlePlay = () => {
    void startPlayback(editorScoreToMusicXML(score), score.tempo, 'click-and-score');
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
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-6">
      <header className="space-y-3">
        <label className="block text-sm font-medium text-slate-700" htmlFor="notation-title">
          Title
        </label>
        <Input
          id="notation-title"
          value={score.title}
          onChange={(e) => setScore((s) => ({ ...s, title: e.target.value }))}
          placeholder="Untitled exercise"
        />

        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-700" htmlFor="notation-key">
              Key
            </label>
            <select
              id="notation-key"
              className="rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900"
              value={score.keyFifths}
              onChange={(e) => setScore((s) => ({ ...s, keyFifths: Number(e.target.value) }))}
            >
              <option value={0}>C</option>
              <option value={1}>G</option>
              <option value={2}>D</option>
              <option value={3}>A</option>
              <option value={4}>E</option>
              <option value={5}>B</option>
              <option value={-1}>F</option>
              <option value={-2}>Bb</option>
              <option value={-3}>Eb</option>
              <option value={-4}>Ab</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-700" htmlFor="notation-mode">
              Mode
            </label>
            <select
              id="notation-mode"
              className="rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900"
              value={score.mode}
              onChange={(e) =>
                setScore((s) => ({ ...s, mode: e.target.value as EditorScore['mode'] }))
              }
            >
              <option value="major">major</option>
              <option value="minor">minor</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-700" htmlFor="notation-time">
              Time
            </label>
            <select
              id="notation-time"
              className="rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900"
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
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-700" htmlFor="notation-clef">
              Clef
            </label>
            <select
              id="notation-clef"
              className="rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900"
              value={score.clef}
              onChange={(e) =>
                setScore((s) => ({ ...s, clef: e.target.value as EditorScore['clef'] }))
              }
            >
              <option value="treble">treble</option>
              <option value="bass">bass</option>
              <option value="alto">alto</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-700" htmlFor="notation-tempo">
              Tempo
            </label>
            <input
              id="notation-tempo"
              type="number"
              min="20"
              max="400"
              className="w-20 rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900"
              value={score.tempo}
              onChange={(e) =>
                setScore((s) => ({
                  ...s,
                  tempo: Math.max(20, Math.min(400, Number(e.target.value) || s.tempo)),
                }))
              }
            />
          </div>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        {isPlaying ? (
          <Button type="button" variant="outline" onClick={() => stopPlayback()}>
            Stop
          </Button>
        ) : (
          <Button type="button" variant="outline" onClick={handlePlay}>
            Play
          </Button>
        )}
        <Button type="button" onClick={handleSave} disabled={overfull || saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setAssignOpen(true)}
          disabled={!assignTargetId}
        >
          Assign
        </Button>
        {overfull && (
          <span className="text-sm text-amber-600">
            A measure is overfull — fix it before saving.
          </span>
        )}
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
