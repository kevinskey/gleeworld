import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface EnrolledStudent {
  user_id: string;
  full_name: string;
  email: string | null;
  voice_part?: string | null;
  enrolled_at?: string;
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
      // Build enrollment query with filters
      let enrollmentQuery = supabase
        .from('gw_course_enrollments')
        .select('user_id, enrolled_at')
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

      const userIds = (enrollments || [])
        .map(e => e.user_id)
        .filter(Boolean);

      if (userIds.length === 0) {
        setStudents([]);
        setLoading(false);
        return;
      }

      // Fetch profiles for enrolled students
      const { data: profiles, error: profileError } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name, email, voice_part')
        .in('user_id', userIds)
        .order('full_name');

      if (profileError) {
        console.error('Error fetching profiles:', profileError);
        throw profileError;
      }

      // Create enrollment date map
      const enrollmentMap = new Map(
        (enrollments || []).map(e => [e.user_id, e.enrolled_at])
      );

      // Map to EnrolledStudent format
      const enrolledStudents: EnrolledStudent[] = (profiles || []).map(p => ({
        user_id: p.user_id,
        full_name: p.full_name || 'Unknown',
        email: p.email,
        voice_part: p.voice_part,
        enrolled_at: enrollmentMap.get(p.user_id) || undefined
      }));

      setStudents(enrolledStudents);
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
