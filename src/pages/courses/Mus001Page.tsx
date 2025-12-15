import React from 'react';
import { UnifiedCoursePage } from '@/components/academy/UnifiedCoursePage';
import { getCourseByCode } from '@/config/academyCourses';

const Mus001Page = () => {
  const course = getCourseByCode('MUS 001');
  
  if (!course) {
    return <div>Course not found</div>;
  }

  return <UnifiedCoursePage course={course} />;
};

export default Mus001Page;
