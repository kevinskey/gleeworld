import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface CourseGradeResult {
  percentage: number;
  letterGrade: string;
  deductions: {
    assignments: number;
    attendance: number;
    total: number;
  };
  stats: {
    assignmentCount: number;
    gradedCount: number;
    absenceCount: number;
  };
  loading: boolean;
}

// MUS240 Grading Scale from Syllabus
const getLetterGrade = (percentage: number): string => {
  if (percentage >= 95) return 'A';
  if (percentage >= 90) return 'A-';
  if (percentage >= 87) return 'B+';
  if (percentage >= 83) return 'B';
  if (percentage >= 80) return 'B-';
  if (percentage >= 77) return 'C+';
  if (percentage >= 73) return 'C';
  if (percentage >= 70) return 'C-';
  if (percentage >= 65) return 'D+';
  if (percentage >= 60) return 'D';
  return 'F';
};

// Points deducted per unexcused absence
const ABSENCE_DEDUCTION = 2;

export const useCourseGrade = (courseId: string): CourseGradeResult => {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['course-grade', courseId, user?.id],
    queryFn: async () => {
      if (!user?.id || !courseId) {
        return { 
          assignmentDeduction: 0, 
          attendanceDeduction: 0, 
          assignmentCount: 0, 
          gradedCount: 0,
          absenceCount: 0 
        };
      }

      // Fetch published assignments for this course
      const { data: assignments, error: assignmentsError } = await supabase
        .from('gw_course_assignments')
        .select('id, points')
        .eq('course_id', courseId)
        .eq('is_published', true);

      if (assignmentsError) {
        console.error('Error fetching assignments:', assignmentsError);
      }

      // Fetch graded submissions for this student
      const assignmentIds = assignments?.map(a => a.id) || [];
      const { data: submissions, error: submissionsError } = await supabase
        .from('assignment_submissions')
        .select('assignment_id, grade, status')
        .eq('student_id', user.id)
        .in('assignment_id', assignmentIds.length > 0 ? assignmentIds : ['none'])
        .eq('status', 'graded');

      if (submissionsError) {
        console.error('Error fetching submissions:', submissionsError);
      }

      // Fetch attendance records (unexcused absences)
      const { data: attendance, error: attendanceError } = await supabase
        .from('attendance')
        .select('status')
        .eq('user_id', user.id);

      if (attendanceError) {
        console.error('Error fetching attendance:', attendanceError);
      }

      // Calculate assignment deductions
      // For each graded assignment: deduct (maxPoints - earnedPoints) / totalPossiblePoints * 100
      let assignmentDeduction = 0;
      let gradedCount = 0;
      let totalPossiblePoints = 0;

      // Calculate total possible points from all assignments
      assignments?.forEach(a => {
        totalPossiblePoints += a.points || 0;
      });

      // Calculate deductions from graded assignments
      submissions?.forEach(sub => {
        const assignment = assignments?.find(a => a.id === sub.assignment_id);
        if (assignment && sub.grade !== null) {
          const maxPoints = assignment.points || 0;
          const lostPoints = maxPoints - sub.grade;
          // Convert lost points to percentage of overall grade
          if (totalPossiblePoints > 0) {
            assignmentDeduction += (lostPoints / totalPossiblePoints) * 100;
          }
          gradedCount++;
        }
      });

      // Calculate attendance deductions (unexcused absences only)
      const absenceCount = attendance?.filter(a => a.status === 'absent').length || 0;
      const attendanceDeduction = absenceCount * ABSENCE_DEDUCTION;

      return {
        assignmentDeduction: Math.round(assignmentDeduction * 10) / 10,
        attendanceDeduction,
        assignmentCount: assignments?.length || 0,
        gradedCount,
        absenceCount,
      };
    },
    enabled: !!user?.id && !!courseId,
    staleTime: 30000,
  });

  const totalDeduction = (data?.assignmentDeduction || 0) + (data?.attendanceDeduction || 0);
  const percentage = Math.max(0, Math.round(100 - totalDeduction));
  const letterGrade = getLetterGrade(percentage);

  return {
    percentage,
    letterGrade,
    deductions: {
      assignments: data?.assignmentDeduction || 0,
      attendance: data?.attendanceDeduction || 0,
      total: totalDeduction,
    },
    stats: {
      assignmentCount: data?.assignmentCount || 0,
      gradedCount: data?.gradedCount || 0,
      absenceCount: data?.absenceCount || 0,
    },
    loading: isLoading,
  };
};
