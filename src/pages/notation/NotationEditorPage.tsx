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
