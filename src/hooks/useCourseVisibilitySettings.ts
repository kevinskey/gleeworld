import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CourseVisibilitySettings {
  show_assignments: boolean;
  show_discussions: boolean;
  show_journals: boolean;
  show_polls: boolean;
  show_tests: boolean;
  show_grades: boolean;
}

const DEFAULT_VISIBILITY: CourseVisibilitySettings = {
  show_assignments: true,
  show_discussions: true,
  show_journals: true,
  show_polls: true,
  show_tests: true,
  show_grades: true,
};

export const useCourseVisibilitySettings = (courseId: string) => {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['course-visibility', courseId],
    queryFn: async (): Promise<CourseVisibilitySettings> => {
      if (!courseId) return DEFAULT_VISIBILITY;

      const { data, error } = await supabase
        .from('gw_courses')
        .select('show_assignments, show_discussions, show_journals, show_polls, show_tests, show_grades')
        .eq('id', courseId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching course visibility:', error);
        return DEFAULT_VISIBILITY;
      }

      return {
        show_assignments: data?.show_assignments ?? true,
        show_discussions: data?.show_discussions ?? true,
        show_journals: data?.show_journals ?? true,
        show_polls: data?.show_polls ?? true,
        show_tests: data?.show_tests ?? true,
        show_grades: data?.show_grades ?? true,
      };
    },
    enabled: !!courseId,
  });

  const updateVisibility = useMutation({
    mutationFn: async (updates: Partial<CourseVisibilitySettings>) => {
      const { error } = await supabase
        .from('gw_courses')
        .update(updates)
        .eq('id', courseId);

      if (error) throw error;
      return updates;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-visibility', courseId] });
      toast.success('Visibility settings updated');
    },
    onError: (error) => {
      console.error('Error updating visibility:', error);
      toast.error('Failed to update visibility settings');
    },
  });

  return {
    settings: settings ?? DEFAULT_VISIBILITY,
    isLoading,
    updateVisibility: updateVisibility.mutate,
    isUpdating: updateVisibility.isPending,
  };
};

// Map visibility settings to tab names for filtering
export const VISIBILITY_TAB_MAP: Record<keyof CourseVisibilitySettings, string> = {
  show_assignments: 'assignments',
  show_discussions: 'discussions',
  show_journals: 'journals',
  show_polls: 'polls',
  show_tests: 'tests',
  show_grades: 'grades',
};

// Get hidden tabs based on visibility settings
export const getHiddenTabs = (settings: CourseVisibilitySettings): string[] => {
  const hidden: string[] = [];
  
  if (!settings.show_assignments) hidden.push('assignments');
  if (!settings.show_discussions) hidden.push('discussions');
  if (!settings.show_journals) hidden.push('journals');
  if (!settings.show_polls) hidden.push('polls');
  if (!settings.show_tests) hidden.push('tests');
  if (!settings.show_grades) hidden.push('grades');
  
  return hidden;
};
