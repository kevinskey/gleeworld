import { supabase } from '@/integrations/supabase/client';

export async function assignExercise(input: {
  exerciseId: string; courseId: string; studentId?: string; dueAt?: string; title: string;
}): Promise<{ assignmentId: string }> {
  const { data: asg, error: e1 } = await supabase.from('gw_assignments').insert({
    title: input.title,
    assignment_type: 'sight_reading',
    course_id: input.courseId,
    student_id: input.studentId ?? null,
    due_at: input.dueAt ?? null,
    is_active: true,
  }).select('id').single();
  if (e1) throw e1;
  const assignmentId = asg!.id as string;

  const { error: e2 } = await supabase.from('gw_sight_reading_assignment_items').insert({
    assignment_id: assignmentId, exercise_id: input.exerciseId, position: 0,
  });
  if (e2) throw e2;
  return { assignmentId };
}
