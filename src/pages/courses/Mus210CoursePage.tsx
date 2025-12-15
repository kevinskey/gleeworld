import React from 'react';
import { UnifiedCoursePage } from '@/components/academy/UnifiedCoursePage';
import { getCourseByCode } from '@/config/academyCourses';

const Mus210CoursePage = () => {
  const course = getCourseByCode('MUS 210');
  
  if (!course) {
    return <div>Course not found</div>;
  }

  return <UnifiedCoursePage course={course} />;
};

export default Mus210CoursePage;
