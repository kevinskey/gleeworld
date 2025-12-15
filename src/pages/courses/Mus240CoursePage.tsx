import React from 'react';
import { UnifiedCoursePage } from '@/components/academy/UnifiedCoursePage';
import { getCourseByCode } from '@/config/academyCourses';

const Mus240CoursePage = () => {
  const course = getCourseByCode('MUS 240');
  
  if (!course) {
    return <div>Course not found</div>;
  }

  return <UnifiedCoursePage course={course} />;
};

export default Mus240CoursePage;
