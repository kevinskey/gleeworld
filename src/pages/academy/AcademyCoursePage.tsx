import React from 'react';
import { useParams, Navigate, useLocation } from 'react-router-dom';
import { UnifiedCoursePage } from '@/components/academy/UnifiedCoursePage';
import { ACADEMY_COURSES } from '@/config/academyCourses';

// Helper to convert URL slug to course code
const slugToCourseCode = (slug: string): string => {
  // Convert mus-070 to MUS 070, glee-101 to GLEE 101, lh-100 to LH 100
  const parts = slug.split('-');
  const prefix = parts[0].toUpperCase();
  const number = parts.slice(1).join('-');
  return `${prefix} ${number}`;
};

const AcademyCoursePage = () => {
  const { courseCode } = useParams<{ courseCode: string }>();
  const location = useLocation();
  
  // Extract course slug from URL path if not provided via params
  // e.g., /academy/lh-100 -> lh-100
  const pathParts = location.pathname.split('/');
  const academyIndex = pathParts.findIndex(p => p === 'academy');
  const slugFromPath = academyIndex >= 0 ? pathParts[academyIndex + 1] : null;
  
  const effectiveSlug = courseCode || slugFromPath;
  
  if (!effectiveSlug) {
    return <Navigate to="/glee-academy" replace />;
  }
  
  // Find course by slug (e.g., mus-070, lh-100) or course code (MUS 070, LH 100)
  const course = ACADEMY_COURSES.find(c => {
    const slug = c.courseCode.toLowerCase().replace(' ', '-');
    return slug === effectiveSlug.toLowerCase() || c.courseCode === slugToCourseCode(effectiveSlug);
  });
  
  if (!course) {
    return <Navigate to="/glee-academy" replace />;
  }
  
  return <UnifiedCoursePage course={course} />;
};

export default AcademyCoursePage;
