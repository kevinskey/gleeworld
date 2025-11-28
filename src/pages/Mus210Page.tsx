import React from 'react';
import { CoursePageLayout } from '@/components/academy/CoursePageLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useCourseEnrollment } from '@/hooks/useCourseEnrollment';

const Mus210Page = () => {
  const { user } = useAuth();
  const { isEnrolled, enroll } = useCourseEnrollment('mus-210-conducting');

  return (
    <CoursePageLayout
      courseSemester="FALL 2025"
      courseCode="MUS 210-01"
      courseTitle="FALL 2025 SURVEY OF AFRICAN-AMERICAN MUSIC (MUS 210-01)"
      welcomeMessage="Welcome!"
      welcomeDetails="Welcome to MUS 210: Conducting for the Complete Musician. This comprehensive course develops the complete modern conductor through intensive study of baton technique, score analysis, rehearsal pedagogy, and stylistic fluency."
      courseOverview="This course develops the complete modern conductor. Students gain baton technique, expressive gesture, score analysis methods, rehearsal pedagogy, and stylistic fluency across classical, spirituals, gospel, and contemporary choral traditions."
      instructor={{
        name: 'Dr. Kevin Johnson',
        email: 'kjohns10@spelman.edu',
        office: 'Fine Arts 105',
        hours: 'MWF 3–5 PM or appointment',
      }}
      isEnrolled={isEnrolled}
      onEnroll={enroll}
    />
  );
};

export default Mus210Page;
