import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface EnrolledStudent {
  user_id: string; // Can be actual user_id or student_profile_id for CSV imports
  profile_id: string; // gw_profiles.id — used as student_profile_id in attendance records
  full_name: string;
  email: string | null;
  voice_part?: string | null;
  enrolled_at?: string;
  is_csv_import?: boolean; // True if from gw_student_profiles (CSV import)
}

interface UseCourseStudentsOptions {
  courseId: string;
  semester?: string; // e.g., 'Spring 2026' - if provided, filters by semester
  includeInactive?: boolean; // If true, includes non-enrolled students
}

/**
 * Unified hook for fetching students enrolled in a course.
 * Uses gw_course_enrollments as the single source of truth.
 * 
 * For MUS-240: Pass semester to filter by current semester
 * For MUS-070 (Glee Club): No semester filter needed (membership-based)
 * For other courses: Standard enrollment check
 */
export const useCourseStudents = ({ 
  courseId, 
  semester, 
  includeInactive = false 
}: UseCourseStudentsOptions) => {
  const [students, setStudents] = useState<EnrolledStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStudents = useCallback(async () => {
    if (!courseId) {
      setStudents([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Build enrollment query with filters - include both user_id and student_profile_id
      let enrollmentQuery = supabase
        .from('gw_course_enrollments')
        .select('user_id, student_profile_id, enrolled_at')
        .eq('course_id', courseId);

      // Filter by enrollment status unless including inactive
      if (!includeInactive) {
        enrollmentQuery = enrollmentQuery.eq('enrollment_status', 'enrolled');
      }

      // Filter by semester if provided (for semester-based courses like MUS-240)
      if (semester) {
        enrollmentQuery = enrollmentQuery.eq('semester', semester);
      }

      const { data: enrollments, error: enrollError } = await enrollmentQuery;

      if (enrollError) {
        console.error('Error fetching enrollments:', enrollError);
        throw enrollError;
      }

      // Separate enrollments by type
      const userIds = (enrollments || [])
        .map(e => e.user_id)
        .filter((id): id is string => id !== null);
      
      const studentProfileIds = (enrollments || [])
        .filter(e => !e.user_id && e.student_profile_id)
        .map(e => e.student_profile_id)
        .filter((id): id is string => id !== null);

      const allStudents: EnrolledStudent[] = [];

      // Fetch profiles for users with user_id (logged-in users)
      if (userIds.length > 0) {
        const { data: profiles, error: profileError } = await supabase
          .from('gw_profiles')
          .select('id, user_id, full_name, email, voice_part')
          .in('user_id', userIds);

        if (profileError) {
          console.error('Error fetching profiles:', profileError);
          throw profileError;
        }

        // Create enrollment date map for user_ids
        const enrollmentMap = new Map(
          (enrollments || [])
            .filter(e => e.user_id)
            .map(e => [e.user_id, e.enrolled_at])
        );

        // Add logged-in users
        (profiles || []).forEach(p => {
          allStudents.push({
            user_id: p.user_id,
            profile_id: p.id, // gw_profiles.id — needed for attendance records
            full_name: p.full_name || 'Unknown',
            email: p.email,
            voice_part: p.voice_part,
            enrolled_at: enrollmentMap.get(p.user_id) || undefined,
            is_csv_import: false
          });
        });
      }

      // Fetch student profiles for CSV imports (students with student_profile_id but no user_id)
      if (studentProfileIds.length > 0) {
        const { data: studentProfiles, error: studentProfileError } = await supabase
          .from('gw_student_profiles')
          .select('id, full_name, email')
          .in('id', studentProfileIds);

        if (studentProfileError) {
          console.error('Error fetching student profiles:', studentProfileError);
          throw studentProfileError;
        }

        // Create enrollment date map for student_profile_ids
        const enrollmentMapCSV = new Map(
          (enrollments || [])
            .filter(e => !e.user_id && e.student_profile_id)
            .map(e => [e.student_profile_id, e.enrolled_at])
        );

        // Add CSV-imported students
        (studentProfiles || []).forEach(sp => {
          allStudents.push({
            user_id: sp.id, // Use student_profile_id as the identifier
            profile_id: sp.id, // For CSV imports, profile_id IS the student_profile_id
            full_name: sp.full_name || 'Unknown',
            email: sp.email,
            voice_part: null,
            enrolled_at: enrollmentMapCSV.get(sp.id) || undefined,
            is_csv_import: true
          });
        });
      }

      // Sort all students by name
      allStudents.sort((a, b) => a.full_name.localeCompare(b.full_name));

      setStudents(allStudents);
    } catch (err) {
      console.error('Error in useCourseStudents:', err);
      setError('Failed to fetch enrolled students');
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, [courseId, semester, includeInactive]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  return {
    students,
    loading,
    error,
    refetch: fetchStudents,
    studentIds: students.map(s => s.user_id)
  };
};

// Course ID constants for consistency
export const COURSE_IDS = {
  MUS_240: '23c4ee3c-7bbb-4534-8c0a-eecd88298d37',
  MUS_070: 'a0000000-0000-0000-0000-000000000070',
  MUS_210: '2026c613-bda7-487a-a5d9-91e57c26a741',
  LH_100: 'a0000000-0000-0000-0000-000000000100',
} as const;

// Current semester constant
export const CURRENT_SEMESTER = 'Spring 2026';
