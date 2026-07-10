import { Badge } from '@/components/ui/badge';
import { parseExercise } from './parseExercise';
import { NotatedCard } from './NotatedCard';
import { EarTrainingCard } from './EarTrainingCard';
import { DictationCard } from './DictationCard';
import { EnsembleCard } from './EnsembleCard';
import { AssignmentCard } from './AssignmentCard';

const TITLES: Record<string, string> = {
  solfege_drill: 'Solfège drill', melody: 'Sight-singing melody', rhythm: 'Rhythm exercise',
  ear_training: 'Ear training', dictation: 'Dictation', ensemble: 'Ensemble', assignment: 'Module assignment',
};

export function ExercisePlayer({ exercise }: {
  exercise: { id: string; type: string; data: unknown };
}) {
  const parsed = parseExercise(exercise.type, exercise.data);
  const title = TITLES[exercise.type] ?? exercise.type.replace(/_/g, ' ');
  // Unknown types and malformed data keep the legacy badge — a bad row never crashes a lesson.
  if (!parsed) {
    return <Badge variant="outline" className="text-xs">{exercise.type.replace(/_/g, ' ')}</Badge>;
  }
  switch (parsed.kind) {
    case 'notated': return <NotatedCard ex={parsed} exerciseId={exercise.id} title={title} />;
    case 'ear_training': return <EarTrainingCard ex={parsed} title={title} />;
    case 'dictation': return <DictationCard ex={parsed} title={title} />;
    case 'ensemble': return <EnsembleCard ex={parsed} title={title} />;
    case 'assignment': return <AssignmentCard ex={parsed} title={title} />;
  }
}
