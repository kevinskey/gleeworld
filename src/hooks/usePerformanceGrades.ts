import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type PerformanceStatus = 'pending' | 'participated' | 'excused' | 'absent';

export interface PerformanceGrade {
  id: string;
  student_profile_id: string;
  course_id: string;
  performance_name: string;
  performance_date: string | null;
  status: PerformanceStatus;
  notes: string | null;
  graded_by: string | null;
  graded_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudentWithPerformanceGrades {
  profile_id: string;
  user_id: string;
  full_name: string;
  voice_part: string | null;
  grades: Record<string, PerformanceGrade | null>;
}

interface UsePerformanceGradesOptions {
  courseId: string;
  performanceNames: string[];
}

interface EnrollmentRow {
  student_profile_id: string;
}

interface ProfileRow {
  id: string;
  user_id: string;
  full_name: string | null;
  voice_part: string | null;
}

interface GradeRow {
  id: string;
  student_profile_id: string;
  course_id: string;
  performance_name: string;
  performance_date: string | null;
  status: string;
  notes: string | null;
  graded_by: string | null;
  graded_at: string | null;
  created_at: string;
  updated_at: string;
}

async function fetchEnrolledStudentsWithGrades(
  courseId: string,
  performanceNames: string[]
): Promise<StudentWithPerformanceGrades[]> {
  // Step 1: Get enrolled student profile IDs
  // @ts-ignore - Supabase deep type instantiation
  const enrollResult = await supabase
    .from('gw_course_enrollments')
    .select('student_profile_id')
    .eq('course_id', courseId)
    .eq('status', 'enrolled');
  
  const { data: enrollData, error: enrollError } = enrollResult;
  if (enrollError) throw enrollError;
  const enrollments = (enrollData || []) as EnrollmentRow[];
  if (enrollments.length === 0) return [];

  const profileIds = enrollments.map(e => e.student_profile_id);

  // Step 2: Get profile details
  const { data: profileData, error: profileError } = await supabase
    .from('gw_profiles')
    .select('id, user_id, full_name, voice_part')
    .in('id', profileIds);

  if (profileError) throw profileError;
  const profiles = (profileData || []) as ProfileRow[];

  // Step 3: Get performance grades
  const { data: gradeData, error: gradeError } = await supabase
    .from('gw_performance_grades')
    .select('*')
    .eq('course_id', courseId);

  if (gradeError) throw gradeError;
  const grades = (gradeData || []) as GradeRow[];

  // Step 4: Map students with their grades
  const studentsMap: StudentWithPerformanceGrades[] = profiles.map(profile => {
    const studentGrades: Record<string, PerformanceGrade | null> = {};

    performanceNames.forEach(name => {
      const grade = grades.find(
        g => g.student_profile_id === profile.id && g.performance_name === name
      );
      if (grade) {
        studentGrades[name] = {
          ...grade,
          status: grade.status as PerformanceStatus,
        };
      } else {
        studentGrades[name] = null;
      }
    });

    return {
      profile_id: profile.id,
      user_id: profile.user_id,
      full_name: profile.full_name || 'Unknown',
      voice_part: profile.voice_part,
      grades: studentGrades,
    };
  });

  // Sort by voice part, then name
  const voiceOrder = ['Soprano 1', 'Soprano 2', 'Alto 1', 'Alto 2'];
  return studentsMap.sort((a, b) => {
    const aIdx = voiceOrder.indexOf(a.voice_part || '');
    const bIdx = voiceOrder.indexOf(b.voice_part || '');
    if (aIdx !== bIdx) return aIdx - bIdx;
    return a.full_name.localeCompare(b.full_name);
  });
}

export const usePerformanceGrades = ({ courseId, performanceNames }: UsePerformanceGradesOptions) => {
  const queryClient = useQueryClient();

  const { data: studentsWithGrades, isLoading, error } = useQuery<StudentWithPerformanceGrades[], Error>({
    queryKey: ['performance-grades', courseId],
    queryFn: () => fetchEnrolledStudentsWithGrades(courseId, performanceNames),
    enabled: !!courseId && performanceNames.length > 0,
  });

  // Upsert a performance grade
  const upsertGrade = useMutation({
    mutationFn: async ({
      studentProfileId,
      performanceName,
      status,
      notes,
    }: {
      studentProfileId: string;
      performanceName: string;
      status: PerformanceStatus;
      notes?: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      
      const { data, error } = await supabase
        .from('gw_performance_grades')
        .upsert({
          student_profile_id: studentProfileId,
          course_id: courseId,
          performance_name: performanceName,
          status,
          notes: notes || null,
          graded_by: userId,
          graded_at: new Date().toISOString(),
        }, {
          onConflict: 'student_profile_id,course_id,performance_name',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance-grades', courseId] });
    },
    onError: (error) => {
      console.error('Failed to save performance grade:', error);
      toast.error('Failed to save grade');
    },
  });

  // Batch update all students for a specific performance
  const batchUpdatePerformance = useMutation({
    mutationFn: async ({
      performanceName,
      status,
      studentProfileIds,
    }: {
      performanceName: string;
      status: PerformanceStatus;
      studentProfileIds: string[];
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      
      const records = studentProfileIds.map(profileId => ({
        student_profile_id: profileId,
        course_id: courseId,
        performance_name: performanceName,
        status,
        graded_by: userId,
        graded_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('gw_performance_grades')
        .upsert(records, {
          onConflict: 'student_profile_id,course_id,performance_name',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance-grades', courseId] });
      toast.success('All grades updated');
    },
    onError: (error) => {
      console.error('Failed to batch update:', error);
      toast.error('Failed to update grades');
    },
  });

  return {
    studentsWithGrades,
    isLoading,
    error,
    upsertGrade,
    batchUpdatePerformance,
  };
};

// Hook to fetch a single student's performance grades (for student view)
export const useStudentPerformanceGrades = (courseId: string, studentProfileId: string | null) => {
  return useQuery({
    queryKey: ['student-performance-grades', courseId, studentProfileId],
    queryFn: async () => {
      if (!studentProfileId) return [];
      
      const { data, error } = await supabase
        .from('gw_performance_grades')
        .select('*')
        .eq('course_id', courseId)
        .eq('student_profile_id', studentProfileId);

      if (error) throw error;
      
      return (data || []).map(g => ({
        ...g,
        status: g.status as PerformanceStatus,
      })) as PerformanceGrade[];
    },
    enabled: !!courseId && !!studentProfileId,
  });
};
