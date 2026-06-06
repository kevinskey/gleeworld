import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { CoursePageLayout } from '@/components/academy/CoursePageLayout';
import { useCourseEnrollment } from '@/hooks/useCourseEnrollment';
import { useCourseTA } from '@/hooks/useCourseTA';
import { useUserRole } from '@/hooks/useUserRole';
import { Badge } from '@/components/ui/badge';
import { GraduationCap } from 'lucide-react';

const GleeClubCoursePage = () => {
  const { user } = useAuth();
  const { isEnrolled, enroll } = useCourseEnrollment('glee-club');
  const { isTA, loading: taLoading } = useCourseTA('GLEE-CLUB');
  const { isAdmin, isSuperAdmin } = useUserRole();

  const hasInstructorAccess = isTA || isAdmin() || isSuperAdmin();

  return (
    <div className="relative">
      {/* TA Badge */}
      {!taLoading && isTA && (
        <div className="fixed top-20 right-4 z-50">
          <Badge variant="secondary" className="bg-purple-600 text-white px-3 py-1.5 flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            Teaching Assistant
          </Badge>
        </div>
      )}
      
      <CoursePageLayout
        courseId="glee-club"
        courseSemester="SPRING 2026"
        courseCode="GLEE 101"
        courseTitle="GLEE CLUB"
        welcomeMessage="Welcome to the Your favorite band or choir!"
        welcomeDetails="Welcome to the Your favorite band or choir, a premier choral ensemble with over 100 years of musical excellence. This course encompasses all aspects of participation in the Glee Club including rehearsals, performances, and community engagement."
        courseOverview="The Your favorite band or choir is a highly selective, auditioned choral ensemble dedicated to the study and performance of choral music from diverse traditions. Members develop vocal technique, musicianship, and performance skills while representing Riverside Music Institute at campus events, community performances, and national tours."
        instructor={{
          name: 'Dr. Kevin Johnson',
          email: 'kjohns10@riversidechoir.example',
          office: 'Fine Arts 105',
          hours: 'MWF 3–5 PM or appointment',
        }}
        isEnrolled={isEnrolled}
        onEnroll={enroll}
        isTA={hasInstructorAccess}
      />
    </div>
  );
};

export default GleeClubCoursePage;
