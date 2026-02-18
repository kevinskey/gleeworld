import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getCourseGradingConfig } from '@/config/courseGradingConfig';

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
    allowedAbsences?: number;
    excessAbsences?: number;
  };
  loading: boolean;
  isAttendanceOnly: boolean;
}

const LETTER_GRADES = ['A', 'B', 'C', 'D', 'F'] as const;

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

/**
 * For attendance-only courses (MUS 070):
 * Start at A. Each absence beyond the allowed count drops one letter grade.
 * 2 allowed → 3 absences = B, 4 = C, 5 = D, 6+ = F
 */
const getAttendanceOnlyGrade = (
  absenceCount: number,
  allowedAbsences: number,
  absencesPerDrop: number,
): { letterGrade: string; percentage: number } => {
  const excessAbsences = Math.max(0, absenceCount - allowedAbsences);
  const letterDrops = Math.floor(excessAbsences / absencesPerDrop);
  const gradeIndex = Math.min(letterDrops, LETTER_GRADES.length - 1);
  const letterGrade = LETTER_GRADES[gradeIndex];

  // Map to percentage midpoint: A=95, B=85, C=75, D=65, F=50
  const percentages = [95, 85, 75, 65, 50];
  return { letterGrade, percentage: percentages[gradeIndex] };
};

const ABSENCE_DEDUCTION = 2;

export const useCourseGrade = (courseId: string): CourseGradeResult => {
  const { user } = useAuth();
  const config = getCourseGradingConfig(courseId);
  const isAttendanceOnly = !!config.attendanceOnlyModel;

  const { data, isLoading } = useQuery({
    queryKey: ['course-grade', courseId, user?.id],
    queryFn: async () => {
      if (!user?.id || !courseId) {
        return {
          assignmentDeduction: 0,
          attendanceDeduction: 0,
          assignmentCount: 0,
          gradedCount: 0,
          absenceCount: 0,
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

      // ── Attendance: use gw_events + gw_event_attendance (unified source) ──
      // First get the course's calendar_id
      const { data: courseData } = await supabase
        .from('gw_courses')
        .select('calendar_id')
        .eq('id', courseId)
        .single();

      let absenceCount = 0;

      if (courseData?.calendar_id) {
        // Get all past events for this course
        const now = new Date().toISOString();
        const { data: events } = await supabase
          .from('gw_events')
          .select('id')
          .eq('calendar_id', courseData.calendar_id)
          .lte('start_date', now);

        if (events && events.length > 0) {
          const eventIds = events.map(e => e.id);

          // Get student's check-ins for these events
          const { data: checkins } = await supabase
            .from('gw_event_attendance')
            .select('event_id, attendance_status')
            .eq('user_id', user.id)
            .in('event_id', eventIds);

          const checkinMap = new Map(
            (checkins || []).map(c => [c.event_id, c.attendance_status])
          );

          // Count absences: any past event without a 'present' status
          absenceCount = events.filter(e => {
            const status = checkinMap.get(e.id);
            return !status || status === 'absent';
          }).length;
        }
      }

      // Calculate assignment deductions
      let assignmentDeduction = 0;
      let gradedCount = 0;
      let totalPossiblePoints = 0;

      assignments?.forEach(a => {
        totalPossiblePoints += a.points || 0;
      });

      submissions?.forEach(sub => {
        const assignment = assignments?.find(a => a.id === sub.assignment_id);
        if (assignment && sub.grade !== null) {
          const maxPoints = assignment.points || 0;
          const lostPoints = maxPoints - sub.grade;
          if (totalPossiblePoints > 0) {
            assignmentDeduction += (lostPoints / totalPossiblePoints) * 100;
          }
          gradedCount++;
        }
      });

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

  const absenceCount = data?.absenceCount || 0;

  if (isAttendanceOnly && config.attendanceOnlyModel) {
    const { allowedAbsences, absencesPerLetterDrop } = config.attendanceOnlyModel;
    const { letterGrade, percentage } = getAttendanceOnlyGrade(
      absenceCount,
      allowedAbsences,
      absencesPerLetterDrop,
    );
    const excessAbsences = Math.max(0, absenceCount - allowedAbsences);

    return {
      percentage,
      letterGrade,
      deductions: {
        assignments: 0,
        attendance: excessAbsences,
        total: excessAbsences,
      },
      stats: {
        assignmentCount: 0,
        gradedCount: 0,
        absenceCount,
        allowedAbsences,
        excessAbsences,
      },
      loading: isLoading,
      isAttendanceOnly: true,
    };
  }

  // Standard deductive model
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
      absenceCount,
    },
    loading: isLoading,
    isAttendanceOnly: false,
  };
};
