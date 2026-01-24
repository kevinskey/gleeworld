import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface CourseGradeResult {
  earnedPoints: number;
  totalPoints: number;
  percentage: number;
  letterGrade: string;
  assignmentCount: number;
  gradedCount: number;
  loading: boolean;
}

const getLetterGrade = (percentage: number): string => {
  if (percentage >= 93) return 'A';
  if (percentage >= 90) return 'A-';
  if (percentage >= 87) return 'B+';
  if (percentage >= 83) return 'B';
  if (percentage >= 80) return 'B-';
  if (percentage >= 77) return 'C+';
  if (percentage >= 73) return 'C';
  if (percentage >= 70) return 'C-';
  if (percentage >= 67) return 'D+';
  if (percentage >= 63) return 'D';
  if (percentage >= 60) return 'D-';
  return 'F';
};

export const useCourseGrade = (courseId: string): CourseGradeResult => {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['course-grade', courseId, user?.id],
    queryFn: async () => {
      if (!user?.id || !courseId) {
        return { earnedPoints: 0, totalPoints: 0, assignmentCount: 0, gradedCount: 0 };
      }

      // Fetch published assignments for this course
      const { data: assignments, error: assignmentsError } = await supabase
        .from('gw_course_assignments')
        .select('id, points')
        .eq('course_id', courseId)
        .eq('is_published', true);

      if (assignmentsError) {
        console.error('Error fetching assignments:', assignmentsError);
        return { earnedPoints: 0, totalPoints: 0, assignmentCount: 0, gradedCount: 0 };
      }

      if (!assignments?.length) {
        return { earnedPoints: 0, totalPoints: 0, assignmentCount: 0, gradedCount: 0 };
      }

      const assignmentIds = assignments.map(a => a.id);

      // Fetch graded submissions for this student
      const { data: submissions, error: submissionsError } = await supabase
        .from('assignment_submissions')
        .select('assignment_id, grade, status')
        .eq('student_id', user.id)
        .in('assignment_id', assignmentIds)
        .eq('status', 'graded');

      if (submissionsError) {
        console.error('Error fetching submissions:', submissionsError);
        return { earnedPoints: 0, totalPoints: 0, assignmentCount: assignments.length, gradedCount: 0 };
      }

      // Calculate totals from graded assignments only
      let earnedPoints = 0;
      let totalPoints = 0;
      let gradedCount = 0;

      submissions?.forEach(sub => {
        const assignment = assignments.find(a => a.id === sub.assignment_id);
        if (assignment && sub.grade !== null) {
          earnedPoints += sub.grade;
          totalPoints += assignment.points || 0;
          gradedCount++;
        }
      });

      return {
        earnedPoints,
        totalPoints,
        assignmentCount: assignments.length,
        gradedCount,
      };
    },
    enabled: !!user?.id && !!courseId,
    staleTime: 30000, // Cache for 30 seconds
  });

  const percentage = data?.totalPoints ? Math.round((data.earnedPoints / data.totalPoints) * 100) : 0;
  const letterGrade = data?.totalPoints ? getLetterGrade(percentage) : '--';

  return {
    earnedPoints: data?.earnedPoints || 0,
    totalPoints: data?.totalPoints || 0,
    percentage,
    letterGrade,
    assignmentCount: data?.assignmentCount || 0,
    gradedCount: data?.gradedCount || 0,
    loading: isLoading,
  };
};
