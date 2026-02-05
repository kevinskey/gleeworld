/**
 * Universal Course Access Hook
 * 
 * Single source of truth for:
 * - Course enrollment status
 * - Instructor/TA permissions
 * - Admin access
 * - Course metadata
 * 
 * This eliminates scattered course-specific checks throughout the codebase.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { ACADEMY_COURSES, AcademyCourse } from '@/config/academyCourses';
import { useSemesters } from '@/hooks/useSemesters';

export interface CourseAccessState {
  // Course info
  course: AcademyCourse | null;
  dbCourse: DbCourse | null;
  
  // Access levels
  isEnrolled: boolean;
  isInstructor: boolean;
  isTA: boolean;
  hasStaffAccess: boolean; // isInstructor || isTA || isAdmin
  isAdmin: boolean;
  isSuperAdmin: boolean;
  
  // Convenience
  canViewContent: boolean; // isEnrolled || hasStaffAccess
  canManageCourse: boolean; // hasStaffAccess
  canGradeStudents: boolean; // hasStaffAccess
  
  // Semester context
  currentSemester: string;
  semesterLabel: string;
  
  // Loading states
  loading: boolean;
  error: string | null;
}

interface DbCourse {
  id: string;
  course_code: string;
  title: string | null;
  term: string | null;
  calendar_id: string | null;
  is_active: boolean;
}

interface UseCourseAccessOptions {
  /** Course identifier - can be courseId, courseCode, or URL slug */
  courseIdentifier: string;
  /** Skip enrollment check (for public pages) */
  skipEnrollmentCheck?: boolean;
}

// Term code to semester label mapping
const termToSemesterLabel = (term: string | null): string => {
  if (!term) return 'Spring 2026';
  if (/spring|summer|fall|winter/i.test(term)) return term;
  
  if (/^\d{6}$/.test(term)) {
    const year = term.slice(0, 4);
    const t = term.slice(4, 6);
    const seasonMap: Record<string, string> = {
      '01': 'Spring',
      '05': 'Summer',
      '08': 'Fall',
      '12': 'Winter',
    };
    const season = seasonMap[t];
    if (season) return `${season} ${year}`;
  }
  
  return 'Spring 2026';
};

// Normalize course identifier to find matching course
const findCourse = (identifier: string): AcademyCourse | undefined => {
  if (!identifier) return undefined;
  
  const normalized = identifier.toLowerCase().trim();
  const slug = normalized.replace(' ', '-');
  
  return ACADEMY_COURSES.find(c => 
    c.id === identifier ||
    c.courseCode.toLowerCase() === normalized ||
    c.courseCode.toLowerCase().replace(' ', '-') === slug ||
    c.route === `/academy/${slug}`
  );
};

export const useCourseAccess = (options: UseCourseAccessOptions): CourseAccessState => {
  const { courseIdentifier, skipEnrollmentCheck = false } = options;
  const { user, loading: authLoading } = useAuth();
  const { profile, isAdmin: checkIsAdmin, loading: roleLoading } = useUserRole();
  const { activeSemester } = useSemesters();
  
  const [dbCourse, setDbCourse] = useState<DbCourse | null>(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isTA, setIsTA] = useState(false);
  const [dbLoading, setDbLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Find course from config
  const course = useMemo(() => findCourse(courseIdentifier), [courseIdentifier]);
  
  // Derive admin status
  const isAdmin = checkIsAdmin();
  const isSuperAdmin = profile?.is_super_admin || false;
  const isInstructor = profile?.role === 'instructor';
  
  // Semester context
  const semesterLabel = termToSemesterLabel(dbCourse?.term || null);
  const currentSemester = activeSemester?.name || semesterLabel;
  
  // Fetch database course and check access
  const checkAccess = useCallback(async () => {
    if (!course?.courseCode || authLoading || roleLoading) return;
    
    setDbLoading(true);
    setError(null);
    
    try {
      // 1. Fetch course from database
      const { data: courseData, error: courseError } = await supabase
        .from('gw_courses')
        .select('id, course_code, title, term, calendar_id, is_active')
        .or(`course_code.eq.${course.courseCode},course_code.ilike.%${course.courseCode.replace(' ', '%')}%`)
        .maybeSingle();
      
      if (courseError) throw courseError;
      
      if (courseData) {
        setDbCourse(courseData);
      }
      
      if (!user) {
        setIsEnrolled(false);
        setIsTA(false);
        setDbLoading(false);
        return;
      }
      
      // 2. Check TA status (all courses use the same pattern)
      const normalizedCode = course.courseCode.replace(' ', '');
      const { data: taRow } = await supabase
        .from('course_teaching_assistants')
        .select('id')
        .eq('course_code', normalizedCode)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();
      
      setIsTA(!!taRow);
      
      // 3. Check enrollment (skip if admin/instructor/TA)
      if (skipEnrollmentCheck || isAdmin || isSuperAdmin || isInstructor || !!taRow) {
        setIsEnrolled(true);
        setDbLoading(false);
        return;
      }
      
      // Special case: MUS 070 (Glee Club) - members are auto-enrolled
      if (course.id === 'a0000000-0000-0000-0000-000000000070') {
        if (profile?.role === 'member') {
          setIsEnrolled(true);
          setDbLoading(false);
          return;
        }
      }
      
      // Standard enrollment check via gw_course_enrollments
      const courseIdToCheck = courseData?.id || course.id;
      
      // Check by user_id
      const { data: enrollmentByUser } = await supabase
        .from('gw_course_enrollments')
        .select('id')
        .eq('course_id', courseIdToCheck)
        .eq('user_id', user.id)
        .eq('enrollment_status', 'enrolled')
        .maybeSingle();
      
      if (enrollmentByUser) {
        setIsEnrolled(true);
        setDbLoading(false);
        return;
      }
      
      // Check by student_profile_id (for CSV imports)
      if (profile?.id) {
        const { data: enrollmentByProfile } = await supabase
          .from('gw_course_enrollments')
          .select('id')
          .eq('course_id', courseIdToCheck)
          .eq('student_profile_id', profile.id)
          .eq('enrollment_status', 'enrolled')
          .maybeSingle();
        
        if (enrollmentByProfile) {
          setIsEnrolled(true);
          setDbLoading(false);
          return;
        }
      }
      
      // Legacy MUS-240 enrollment check (temporary)
      if (course.courseCode === 'MUS 240') {
        const { data: legacyEnrollment } = await supabase
          .from('mus240_enrollments')
          .select('id')
          .eq('student_id', user.id)
          .eq('semester', currentSemester)
          .eq('enrollment_status', 'enrolled')
          .maybeSingle();
        
        if (legacyEnrollment) {
          setIsEnrolled(true);
          setDbLoading(false);
          return;
        }
      }
      
      setIsEnrolled(false);
    } catch (err) {
      console.error('[useCourseAccess] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to check access');
    } finally {
      setDbLoading(false);
    }
  }, [
    course,
    user,
    profile,
    authLoading,
    roleLoading,
    isAdmin,
    isSuperAdmin,
    isInstructor,
    skipEnrollmentCheck,
    currentSemester
  ]);
  
  useEffect(() => {
    checkAccess();
  }, [checkAccess]);
  
  // Derive convenience flags
  const hasStaffAccess = isAdmin || isSuperAdmin || isInstructor || isTA;
  const canViewContent = isEnrolled || hasStaffAccess;
  const canManageCourse = hasStaffAccess;
  const canGradeStudents = hasStaffAccess;
  
  return {
    course,
    dbCourse,
    isEnrolled,
    isInstructor,
    isTA,
    hasStaffAccess,
    isAdmin,
    isSuperAdmin,
    canViewContent,
    canManageCourse,
    canGradeStudents,
    currentSemester,
    semesterLabel,
    loading: authLoading || roleLoading || dbLoading,
    error,
  };
};

// Convenience hook for getting just the course ID
export const useCourseId = (courseIdentifier: string): string | null => {
  const { dbCourse, course } = useCourseAccess({ courseIdentifier });
  return dbCourse?.id || course?.id || null;
};

// Course IDs for direct reference (same as useCourseStudents)
export { COURSE_IDS, CURRENT_SEMESTER } from './useCourseStudents';
