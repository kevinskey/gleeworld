import { supabase } from '@/integrations/supabase/client';

export async function assignExercise(input: {
  exerciseId: string; courseId: string; studentId?: string; dueAt?: string; title: string;
}): Promise<{ assignmentId: string }> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth?.user?.id;
  if (!userId) throw new Error('notation: must be signed in to assign an exercise');

  const { data: asg, error: e1 } = await supabase.from('gw_assignments').insert({
    title: input.title,
    assignment_type: 'sight_reading',
    course_id: input.courseId,
    student_id: input.studentId ?? null,
    due_at: input.dueAt ?? null,
    is_active: true,
    created_by: userId,
  }).select('id').single();
  if (e1) throw e1;
  const assignmentId = asg!.id as string;

  const { error: e2 } = await supabase.from('gw_sight_reading_assignment_items').insert({
    assignment_id: assignmentId, exercise_id: input.exerciseId, position: 0,
  });
  if (e2) {
    await supabase.from('gw_assignments').delete().eq('id', assignmentId);
    throw e2;
  }
  return { assignmentId };
}
