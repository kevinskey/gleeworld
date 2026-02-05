/**
 * Academy Course Context Provider
 * 
 * Provides universal course context for any Glee Academy course page.
 * This eliminates course-specific logic scattered throughout components.
 * 
 * Features:
 * - Automatic course detection from URL
 * - Unified access control
 * - Semester-aware data
 * - Instructor course switching
 */

import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { useCourseAccess, CourseAccessState } from '@/hooks/useCourseAccess';
import { useCourseModules, CourseModule } from '@/hooks/useCourseModules';
import { useCourseStudents, EnrolledStudent } from '@/hooks/useCourseStudents';
import { ACADEMY_COURSES, AcademyCourse } from '@/config/academyCourses';
import { getCourseTemplateConfig, CourseTemplateConfig } from '@/config/courseTemplateConfig';
import { useSemesters, Semester } from '@/hooks/useSemesters';

interface AcademyCourseContextValue extends CourseAccessState {
  // Template configuration
  templateConfig: CourseTemplateConfig;
  
  // Module data
  modules: CourseModule[];
  currentModule: CourseModule | null;
  currentWeekNumber: number;
  modulesLoading: boolean;
  
  // Student data (for instructors)
  students: EnrolledStudent[];
  studentsLoading: boolean;
  
  // Semester data
  activeSemester: Semester | null;
  
  // Navigation helpers
  courseSlug: string;
  instructorConsoleUrl: string;
  studentViewUrl: string;
  
  // All available courses (for instructor course switcher)
  allCourses: AcademyCourse[];
  activeCourses: AcademyCourse[];
}

const AcademyCourseContext = createContext<AcademyCourseContextValue | undefined>(undefined);

interface AcademyCourseProviderProps {
  children: ReactNode;
  /** Override automatic course detection */
  courseOverride?: string;
}

// Extract course identifier from URL
const extractCourseFromUrl = (pathname: string, params: Record<string, string | undefined>): string => {
  // Check for courseCode param (e.g., /academy/:courseCode)
  if (params.courseCode) {
    return params.courseCode;
  }
  
  // Check for instructor console pattern (/:courseCode/instructor/console)
  const instructorMatch = pathname.match(/^\/([a-z]+-\d+)\/instructor/i);
  if (instructorMatch) {
    return instructorMatch[1];
  }
  
  // Check for academy route pattern (/academy/:slug)
  const academyMatch = pathname.match(/^\/academy\/([a-z]+-\d+)/i);
  if (academyMatch) {
    return academyMatch[1];
  }
  
  return '';
};

export const AcademyCourseProvider: React.FC<AcademyCourseProviderProps> = ({ 
  children, 
  courseOverride 
}) => {
  const params = useParams();
  const location = useLocation();
  
  // Determine course identifier
  const courseIdentifier = courseOverride || extractCourseFromUrl(location.pathname, params);
  
  // Get course access data
  const accessState = useCourseAccess({ courseIdentifier });
  
  // Get template config
  const templateConfig = useMemo(() => 
    getCourseTemplateConfig(accessState.course?.id || courseIdentifier),
    [accessState.course?.id, courseIdentifier]
  );
  
  // Get semester data
  const { activeSemester } = useSemesters();
  
  // Get module data
  const { 
    modules, 
    currentModule, 
    currentWeekNumber,
    isLoading: modulesLoading 
  } = useCourseModules({ 
    courseId: accessState.dbCourse?.id || accessState.course?.id || '',
    publishedOnly: !accessState.hasStaffAccess,
  });
  
  // Get student data (only for instructors)
  const { 
    students, 
    loading: studentsLoading 
  } = useCourseStudents({
    courseId: accessState.dbCourse?.id || accessState.course?.id || '',
    semester: accessState.currentSemester,
  });
  
  // Navigation helpers
  const courseSlug = useMemo(() => 
    accessState.course?.courseCode.toLowerCase().replace(' ', '-') || '',
    [accessState.course?.courseCode]
  );
  
  const instructorConsoleUrl = `/${courseSlug}/instructor/console`;
  const studentViewUrl = `/academy/${courseSlug}`;
  
  // All courses for instructor switching
  const allCourses = ACADEMY_COURSES;
  const activeCourses = useMemo(() => 
    ACADEMY_COURSES.filter(c => c.isActive),
    []
  );
  
  const value: AcademyCourseContextValue = {
    ...accessState,
    templateConfig,
    modules,
    currentModule,
    currentWeekNumber,
    modulesLoading,
    students: accessState.hasStaffAccess ? students : [],
    studentsLoading,
    activeSemester,
    courseSlug,
    instructorConsoleUrl,
    studentViewUrl,
    allCourses,
    activeCourses,
  };
  
  return (
    <AcademyCourseContext.Provider value={value}>
      {children}
    </AcademyCourseContext.Provider>
  );
};

// Main hook for accessing course context
export const useAcademyCourse = (): AcademyCourseContextValue => {
  const context = useContext(AcademyCourseContext);
  if (!context) {
    throw new Error('useAcademyCourse must be used within an AcademyCourseProvider');
  }
  return context;
};

// Convenience hooks for specific data slices
export const useCourseInfo = () => {
  const { course, dbCourse, courseSlug, templateConfig } = useAcademyCourse();
  return { course, dbCourse, courseSlug, templateConfig };
};

export const useCoursePermissions = () => {
  const { 
    isEnrolled, 
    hasStaffAccess, 
    isInstructor, 
    isTA, 
    isAdmin, 
    canViewContent, 
    canManageCourse,
    canGradeStudents,
  } = useAcademyCourse();
  return { 
    isEnrolled, 
    hasStaffAccess, 
    isInstructor, 
    isTA, 
    isAdmin, 
    canViewContent, 
    canManageCourse,
    canGradeStudents,
  };
};

export const useCourseNavigation = () => {
  const { 
    courseSlug, 
    instructorConsoleUrl, 
    studentViewUrl,
    activeCourses,
    course,
  } = useAcademyCourse();
  return { 
    courseSlug, 
    instructorConsoleUrl, 
    studentViewUrl,
    activeCourses,
    currentCourse: course,
  };
};

export const useCourseModulesContext = () => {
  const { modules, currentModule, currentWeekNumber, modulesLoading } = useAcademyCourse();
  return { modules, currentModule, currentWeekNumber, loading: modulesLoading };
};
