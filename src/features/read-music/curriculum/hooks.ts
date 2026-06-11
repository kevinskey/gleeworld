import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type TheoryLesson = {
  id: string;
  unit_id: string;
  sort_order: number;
  title: string;
  description: string | null;
  content: Array<{ type: string; text?: string }>;
  legacy_level_slug: string | null;
  legacy_exercise_slug: string | null;
};

export type TheoryUnit = {
  id: string;
  level_id: number;
  sort_order: number;
  title: string;
  description: string | null;
  gw_theory_lessons: TheoryLesson[];
};

export type TheoryLevel = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  gw_theory_units: TheoryUnit[];
};

export type TheoryProgressRow = {
  lesson_id: string;
  status: 'not_started' | 'in_progress' | 'complete' | 'mastered';
  best_score: number | null;
  attempts: number;
};

export function useTheoryCurriculum() {
  return useQuery({
    queryKey: ['theory-curriculum'],
    queryFn: async (): Promise<TheoryLevel[]> => {
      const { data, error } = await supabase
        .from('gw_theory_levels')
        .select('*, gw_theory_units(*, gw_theory_lessons(*))')
        .order('id');
      if (error) throw error;
      const levels = (data ?? []) as TheoryLevel[];
      for (const level of levels) {
        level.gw_theory_units.sort((a, b) => a.sort_order - b.sort_order);
        for (const unit of level.gw_theory_units) {
          unit.gw_theory_lessons.sort((a, b) => a.sort_order - b.sort_order);
        }
      }
      return levels;
    },
    staleTime: 5 * 60_000,
  });
}

export function useTheoryProgress() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['theory-progress', user?.id],
    queryFn: async (): Promise<Map<string, TheoryProgressRow>> => {
      const { data, error } = await supabase
        .from('gw_theory_progress')
        .select('lesson_id, status, best_score, attempts')
        .eq('user_id', user!.id);
      if (error) throw error;
      return new Map((data ?? []).map((r) => [r.lesson_id, r as TheoryProgressRow]));
    },
    enabled: !!user,
  });
}

export function useUpdateLessonProgress() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ lessonId, status }: { lessonId: string; status: TheoryProgressRow['status'] }) => {
      if (!user) throw new Error('Sign in to track progress');
      const { error } = await supabase.from('gw_theory_progress').upsert(
        {
          user_id: user.id,
          lesson_id: lessonId,
          status,
          last_attempt_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,lesson_id' }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['theory-progress', user?.id] });
    },
  });
}
