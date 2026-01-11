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
        {/* Hero Section */}
        <div 
          className="w-full py-12 md:py-16"
          style={{ backgroundColor: '#003666' }}
        >
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/10 mb-6">
                <CourseIcon className="h-8 w-8 text-white" />
              </div>
              <Badge variant="outline" className="mb-4 border-white/50 text-white font-mono">
                {course.courseCode}
              </Badge>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
                {course.title}
              </h1>
              <p className="text-white/80 text-lg max-w-2xl mx-auto">
                {course.description}
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8">
              {/* Course Details */}
              <div className="md:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-[#003666]">
                      <BookOpen className="h-5 w-5" />
                      Course Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-foreground/80">
                      {course.description}
                    </p>
                    
                    <div className="grid sm:grid-cols-2 gap-4 pt-4">
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <Clock className="h-5 w-5 text-[#003666]" />
                        <div>
                          <p className="text-sm text-muted-foreground">Duration</p>
                          <p className="font-medium">{course.duration}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <GraduationCap className="h-5 w-5 text-[#003666]" />
                        <div>
                          <p className="text-sm text-muted-foreground">Level</p>
                          <p className="font-medium">{course.level}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-[#003666]">
                      <CheckCircle2 className="h-5 w-5" />
                      What You'll Learn
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="grid sm:grid-cols-2 gap-3">
                      {course.highlights.map((highlight, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                          <span>{highlight}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-[#003666]">
                      <User className="h-5 w-5" />
                      Instructor
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <p className="font-semibold text-lg">{course.instructor.name}</p>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          <span>{course.instructor.email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <span>{course.instructor.office}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>Office Hours: {course.instructor.hours}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Enrollment Card */}
              <div className="md:col-span-1">
                <Card className="sticky top-4 border-2 border-[#003666]/20">
                  <CardHeader className="bg-[#003666] text-white rounded-t-lg">
                    <CardTitle className="text-center">Get Started</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    {user ? (
                      <>
                        <p className="text-sm text-center text-muted-foreground">
                          You're signed in. Enroll now to access all course materials.
                        </p>
                        <Button 
                          className="w-full bg-[#003666] hover:bg-[#002244]"
                          size="lg"
                          onClick={handleEnrollClick}
                        >
                          Enroll in Course
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-center text-muted-foreground">
                          Sign in to enroll in this course and access all materials.
                        </p>
                        <Button 
                          className="w-full bg-[#003666] hover:bg-[#002244]"
                          size="lg"
                          onClick={handleLoginClick}
                        >
                          <LogIn className="h-4 w-4 mr-2" />
                          Sign In to Enroll
                        </Button>
                        <Button 
                          variant="outline"
                          className="w-full"
                          onClick={() => navigate('/auth?mode=signup')}
                        >
                          Create Account
                        </Button>
                      </>
                    )}
                    
                    <div className="pt-4 border-t">
                      <Button 
                        variant="ghost"
                        className="w-full text-muted-foreground"
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
