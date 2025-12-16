import React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { UnifiedCoursePage } from '@/components/academy/UnifiedCoursePage';
import { ACADEMY_COURSES } from '@/config/academyCourses';

// Helper to convert URL slug to course code
const slugToCourseCode = (slug: string): string => {
  // Convert mus-070 to MUS 070, glee-101 to GLEE 101
  const parts = slug.split('-');
  const prefix = parts[0].toUpperCase();
  const number = parts.slice(1).join('-');
  return `${prefix} ${number}`;
};

const AcademyCoursePage = () => {
  const { courseCode } = useParams<{ courseCode: string }>();
  
  if (!courseCode) {
    return <Navigate to="/glee-academy" replace />;
  }
  
  // Find course by slug (e.g., mus-070) or course code (MUS 070)
  const course = ACADEMY_COURSES.find(c => {
    const slug = c.courseCode.toLowerCase().replace(' ', '-');
    return slug === courseCode.toLowerCase() || c.courseCode === slugToCourseCode(courseCode);
  });
  
  if (!course) {
    return <Navigate to="/glee-academy" replace />;
  }
  
  return <UnifiedCoursePage course={course} />;
};

export default AcademyCoursePage;
