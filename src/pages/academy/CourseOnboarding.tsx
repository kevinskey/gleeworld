import React from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { ACADEMY_COURSES } from '@/config/academyCourses';
import { useAuth } from '@/contexts/AuthContext';
import { 
  BookOpen, 
  Clock, 
  User, 
  Mail, 
  MapPin, 
  Calendar,
  CheckCircle2,
  ArrowRight,
  GraduationCap,
  LogIn
} from 'lucide-react';

// Helper to convert URL slug to course code
const slugToCourseCode = (slug: string): string => {
  const parts = slug.split('-');
  const prefix = parts[0].toUpperCase();
  const number = parts.slice(1).join('-');
  return `${prefix} ${number}`;
};

const CourseOnboarding = () => {
  const { courseCode } = useParams<{ courseCode: string }>();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  
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

  const CourseIcon = course.icon;

  const handleEnrollClick = () => {
    if (!user) {
      // Redirect to login with return URL
      navigate(`/auth?returnTo=/academy/${courseCode}/onboarding`);
    } else {
      // Navigate to registration page with course info
      navigate(`/academy-student-registration?course=${course.courseCode}`);
    }
  };

  const handleLoginClick = () => {
    navigate(`/auth?returnTo=/academy/${courseCode}`);
  };

  if (loading) {
    return (
      <UniversalLayout showHeader={true} showFooter={true} containerized={false}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#003666]" />
        </div>
      </UniversalLayout>
    );
  }

  return (
    <UniversalLayout showHeader={true} showFooter={true} containerized={false}>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        {/* Hero Section - Compact on mobile */}
        <div 
          className="w-full py-6 sm:py-10 md:py-16"
          style={{ backgroundColor: '#003666' }}
        >
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full bg-white/10 mb-3 sm:mb-4 md:mb-6">
                <CourseIcon className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-white" />
              </div>
              <Badge variant="outline" className="mb-2 sm:mb-3 md:mb-4 border-white/50 text-white font-mono text-xs">
                {course.courseCode}
              </Badge>
              <h1 className="text-xl sm:text-2xl md:text-4xl lg:text-5xl font-bold text-white mb-2 sm:mb-3 md:mb-4 px-2">
                {course.title}
              </h1>
              <p className="text-white/80 text-sm sm:text-base md:text-lg max-w-2xl mx-auto px-2 line-clamp-2 sm:line-clamp-none">
                {course.description}
              </p>
            </div>
          </div>
        </div>

        {/* Main Content - Tighter spacing on mobile */}
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 md:py-12">
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-3 gap-3 sm:gap-4 md:gap-8">
              {/* Course Details */}
              <div className="md:col-span-2 space-y-3 sm:space-y-4 md:space-y-6">
                {/* Course Overview Card - Compact */}
                <Card className="shadow-sm">
                  <CardHeader className="py-3 sm:py-4 md:py-6 px-3 sm:px-4 md:px-6">
                    <CardTitle className="flex items-center gap-2 text-[#003666] text-sm sm:text-base md:text-lg">
                      <BookOpen className="h-4 w-4 sm:h-5 sm:w-5" />
                      Course Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-4 md:px-6 pb-3 sm:pb-4 md:pb-6 pt-0">
                    <p className="text-foreground/80 text-sm sm:text-base leading-relaxed">
                      {course.description}
                    </p>
                    
                    <div className="flex flex-row gap-2 sm:gap-3 md:gap-4">
                      <div className="flex-1 flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-gray-50 rounded-lg">
                        <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-[#003666] flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">Duration</p>
                          <p className="font-medium text-xs sm:text-sm truncate">{course.duration}</p>
                        </div>
                      </div>
                      <div className="flex-1 flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-gray-50 rounded-lg">
                        <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5 text-[#003666] flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">Level</p>
                          <p className="font-medium text-xs sm:text-sm truncate">{course.level}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* What You'll Learn - Compact */}
                <Card className="shadow-sm">
                  <CardHeader className="py-3 sm:py-4 md:py-6 px-3 sm:px-4 md:px-6">
                    <CardTitle className="flex items-center gap-2 text-[#003666] text-sm sm:text-base md:text-lg">
                      <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" />
                      What You'll Learn
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 sm:px-4 md:px-6 pb-3 sm:pb-4 md:pb-6 pt-0">
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2 md:gap-3">
                      {course.highlights.map((highlight, index) => (
                        <li key={index} className="flex items-start gap-1.5 sm:gap-2 text-sm">
                          <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600 flex-shrink-0 mt-0.5" />
                          <span className="text-xs sm:text-sm">{highlight}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                {/* Instructor - Compact */}
                <Card className="shadow-sm">
                  <CardHeader className="py-3 sm:py-4 md:py-6 px-3 sm:px-4 md:px-6">
                    <CardTitle className="flex items-center gap-2 text-[#003666] text-sm sm:text-base md:text-lg">
                      <User className="h-4 w-4 sm:h-5 sm:w-5" />
                      Instructor
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 sm:px-4 md:px-6 pb-3 sm:pb-4 md:pb-6 pt-0">
                    <div className="space-y-2 sm:space-y-3">
                      <p className="font-semibold text-sm sm:text-base md:text-lg">{course.instructor.name}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 sm:gap-y-2 text-xs sm:text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          <span className="truncate">{course.instructor.email}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          <span>{course.instructor.office}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          <span>{course.instructor.hours}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Enrollment Card - Compact */}
              <div className="md:col-span-1 order-first md:order-last">
                <Card className="sticky top-4 border-2 border-[#003666]/20 shadow-sm">
                  <CardHeader className="bg-[#003666] text-white rounded-t-lg py-3 sm:py-4">
                    <CardTitle className="text-center text-sm sm:text-base">Get Started</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4">
                    {user ? (
                      <>
                        <p className="text-xs sm:text-sm text-center text-muted-foreground">
                          You're signed in. Enroll now to access all course materials.
                        </p>
                        <Button 
                          className="w-full bg-[#003666] hover:bg-[#002244] text-sm h-9 sm:h-10 md:h-11"
                          onClick={handleEnrollClick}
                        >
                          Enroll in Course
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <p className="text-xs sm:text-sm text-center text-muted-foreground">
                          Sign in to enroll in this course and access all materials.
                        </p>
                        <Button 
                          className="w-full bg-[#003666] hover:bg-[#002244] text-sm h-9 sm:h-10 md:h-11"
                          onClick={handleLoginClick}
                        >
                          <LogIn className="h-4 w-4 mr-2" />
                          Sign In to Enroll
                        </Button>
                        <Button 
                          variant="outline"
                          className="w-full text-sm h-9 sm:h-10"
                          onClick={() => navigate('/auth?mode=signup')}
                        >
                          Create Account
                        </Button>
                      </>
                    )}
                    
                    <div className="pt-2 sm:pt-3 md:pt-4 border-t">
                      <Button 
                        variant="ghost"
                        className="w-full text-muted-foreground text-xs sm:text-sm h-8 sm:h-9"
                        onClick={() => navigate('/glee-academy')}
                      >
                        ← Back to All Courses
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </UniversalLayout>
  );
};

export default CourseOnboarding;
