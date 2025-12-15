import React from 'react';
import { UnifiedCoursePage } from '@/components/academy/UnifiedCoursePage';
import { getCourseByCode } from '@/config/academyCourses';

const Mus101Page = () => {
  const course = getCourseByCode('MUS 101');
  
  if (!course) {
    return <div>Course not found</div>;
  }

  return <UnifiedCoursePage course={course} />;
};

export default Mus101Page;
