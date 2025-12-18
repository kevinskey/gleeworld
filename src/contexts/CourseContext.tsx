import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ACADEMY_COURSES } from '@/config/academyCourses';

// MUS 070 is the default "Glee Club" course
const DEFAULT_COURSE_ID = 'a0000000-0000-0000-0000-000000000070';

interface CourseContextType {
  selectedCourseId: string | null;
  selectedCourseCode: string | null;
  selectedCourseName: string | null;
  isDefaultCourse: boolean;
  selectCourse: (courseId: string) => void;
  clearCourseSelection: () => void;
}

const CourseContext = createContext<CourseContextType | undefined>(undefined);

const STORAGE_KEY = 'gw_selected_course';

export const CourseProvider = ({ children }: { children: ReactNode }) => {
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      // Validate stored course still exists
      const course = ACADEMY_COURSES.find(c => c.id === stored);
      if (course) {
        setSelectedCourseId(stored);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  const selectCourse = (courseId: string) => {
    const course = ACADEMY_COURSES.find(c => c.id === courseId);
    if (course) {
      setSelectedCourseId(courseId);
      localStorage.setItem(STORAGE_KEY, courseId);
    }
  };

  const clearCourseSelection = () => {
    setSelectedCourseId(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  // Derive course info from selected ID
  const selectedCourse = selectedCourseId 
    ? ACADEMY_COURSES.find(c => c.id === selectedCourseId) 
    : null;

  const value: CourseContextType = {
    selectedCourseId,
    selectedCourseCode: selectedCourse?.courseCode || null,
    selectedCourseName: selectedCourse?.title || null,
    isDefaultCourse: selectedCourseId === DEFAULT_COURSE_ID || selectedCourseId === null,
    selectCourse,
    clearCourseSelection,
  };

  return (
    <CourseContext.Provider value={value}>
      {children}
    </CourseContext.Provider>
  );
};

export const useCourseContext = () => {
  const context = useContext(CourseContext);
  if (context === undefined) {
    throw new Error('useCourseContext must be used within a CourseProvider');
  }
  return context;
};

// Convenience hook to get display names
export const useCourseDisplayInfo = () => {
  const { selectedCourseId, selectedCourseCode, selectedCourseName, isDefaultCourse } = useCourseContext();
  
  return {
    loungeTitle: isDefaultCourse ? 'Glee Lounge' : `${selectedCourseCode} Lounge`,
    camTitle: isDefaultCourse ? 'Glee Cam' : `${selectedCourseCode} Cam`,
    courseLabel: selectedCourseName || 'Glee Club',
    isInCourseView: !isDefaultCourse && selectedCourseId !== null,
  };
};
