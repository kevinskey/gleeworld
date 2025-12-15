import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { CoursePageLayout } from '@/components/academy/CoursePageLayout';
import { useCourseEnrollment } from '@/hooks/useCourseEnrollment';

const GleeClubCoursePage = () => {
  const { user } = useAuth();
  const { isEnrolled, enroll } = useCourseEnrollment('glee-club');

  return (
    <CoursePageLayout
      courseId="glee-club"
      courseSemester="SPRING 2026"
      courseCode="GLEE 101"
      courseTitle="GLEE CLUB"
      welcomeMessage="Welcome to the Spelman College Glee Club!"
      welcomeDetails="Welcome to the Spelman College Glee Club, a premier choral ensemble with over 100 years of musical excellence. This course encompasses all aspects of participation in the Glee Club including rehearsals, performances, and community engagement."
      courseOverview="The Spelman College Glee Club is a highly selective, auditioned choral ensemble dedicated to the study and performance of choral music from diverse traditions. Members develop vocal technique, musicianship, and performance skills while representing Spelman College at campus events, community performances, and national tours."
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

export default GleeClubCoursePage;
