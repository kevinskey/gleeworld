import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { 
  BookOpen, Calendar, Mail, ClipboardList, FileCheck, BarChart, 
  MessageSquare, Video, Headphones, FileText, BookMarked, UserCheck, 
  Ruler, Settings, Music, ArrowLeft, Users, GraduationCap, Home,
  Bell, Trophy, Clock, PenLine, Brain, Library
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AcademyCourse } from '@/config/academyCourses';
import { CourseLounge } from './CourseLounge';
import { CourseGroupsPanel } from './course-lounge/CourseGroupsPanel';
import { CourseAssignments } from './CourseAssignments';
import { CourseGradebook } from './CourseGradebook';
import { CourseAttendance } from './CourseAttendance';
import { CourseCalendarView } from './CourseCalendarView';
import { CourseAnnouncements } from './CourseAnnouncements';
import { Mus070GradeSpreadsheet } from '@/components/mus070/instructor/Mus070GradeSpreadsheet';
import { Mus070AttendanceView } from '@/components/mus070/instructor/Mus070AttendanceView';

// MUS 240 Specific Components (lazy loaded for performance)
const Mus240StudentDashboard = React.lazy(() => import('@/pages/mus240/StudentDashboard').then(m => ({ default: m.StudentDashboard })));
const Mus240JournalEditor = React.lazy(() => import('@/components/mus240/JournalEditor').then(m => ({ default: m.JournalEditor })));
const Mus240Groups = React.lazy(() => import('@/pages/mus240/Groups'));
const Mus240Resources = React.lazy(() => import('@/pages/mus240/Resources'));
const Mus240PollSystem = React.lazy(() => import('@/components/mus240/Mus240PollSystem').then(m => ({ default: m.Mus240PollSystem })));
const GradesAdmin = React.lazy(() => import('@/components/mus240/instructor/GradesAdmin').then(m => ({ default: m.GradesAdmin })));

interface UnifiedCoursePageProps {
  course: AcademyCourse;
}

export const UnifiedCoursePage: React.FC<UnifiedCoursePageProps> = ({ course }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('home');
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [enrollmentLoading, setEnrollmentLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    checkEnrollmentAndRole();
  }, [user, course.id]);

  const checkEnrollmentAndRole = async () => {
    if (!user) {
      setEnrollmentLoading(false);
      return;
    }

    try {
      // Check admin status and role
      const { data: profile } = await supabase
        .from('gw_profiles')
        .select('is_admin, is_super_admin, role')
        .eq('user_id', user.id)
        .single();

      setIsAdmin(profile?.is_admin || profile?.is_super_admin || false);

      // For MUS 070 (Glee Club), members and admins are auto-enrolled
      if (course.id === 'a0000000-0000-0000-0000-000000000070') {
        if (profile?.role === 'member' || profile?.is_admin || profile?.is_super_admin) {
          setIsEnrolled(true);
          setEnrollmentLoading(false);
          return;
        }
      }

      // Check enrollment for other courses
      const { data: enrollment } = await supabase
        .from('gw_course_enrollments')
        .select('*')
        .eq('user_id', user.id)
        .eq('course_id', course.id)
        .maybeSingle();

      setIsEnrolled(!!enrollment);
    } catch (error) {
      console.error('Error checking enrollment:', error);
    } finally {
      setEnrollmentLoading(false);
    }
  };

  const handleEnroll = async () => {
    if (!user) {
      toast.error('Please log in to enroll');
      navigate('/auth');
      return;
    }

    try {
      // First get the course UUID from the database
      const { data: courseData, error: courseError } = await supabase
        .from('gw_courses')
        .select('id')
        .eq('course_code', course.courseCode.replace(' ', '-'))
        .single();

      if (courseError || !courseData) {
        // Try alternative format
        const { data: altCourseData } = await supabase
          .from('gw_courses')
          .select('id')
          .ilike('course_code', `%${course.courseCode.replace(' ', '%')}%`)
          .single();

        if (!altCourseData) {
          toast.error('Course not found');
          return;
        }
      }

      const courseId = courseData?.id;

      const { error } = await supabase
        .from('gw_course_enrollments')
        .insert({
          course_id: courseId,
          user_id: user.id,
          role: 'student',
          enrollment_status: 'enrolled'
        });

      if (error) throw error;

      setIsEnrolled(true);
      toast.success(`Successfully enrolled in ${course.title}!`);
    } catch (error: any) {
      console.error('Enrollment error:', error);
      if (error.code === '23505') {
        toast.error('You are already enrolled in this course');
      } else {
        toast.error('Failed to enroll. Please try again.');
      }
    }
  };

  return (
    <UniversalLayout showHeader={true} showFooter={true} containerized={false}>
      <div className="flex min-h-screen bg-muted/20">
        {/* Left Sidebar - Navigation */}
        <div className="w-[15%] min-w-[180px] bg-card border-r border-border flex-shrink-0 hidden lg:block">
          <div className="p-4 border-b border-border">
            <div className="text-xs font-bold text-muted-foreground mb-1">SPRING 2026</div>
            <div className="text-lg font-bold text-foreground">{course.courseCode}</div>
            <div className="text-sm text-muted-foreground">{course.title}</div>
          </div>
          
          <nav className="p-2 space-y-1">
            {[
              { icon: Home, label: 'Home', tab: 'home' },
              { icon: FileText, label: 'Syllabus', tab: 'syllabus' },
              { icon: Bell, label: 'Announcements', tab: 'announcements' },
              { icon: ClipboardList, label: 'Assignments', tab: 'assignments' },
              // MUS 240 specific: Journals
              ...(course.id === 'mus-240' ? [{ icon: PenLine, label: 'Journals', tab: 'journals' }] : []),
              { icon: FileCheck, label: 'Tests', tab: 'tests' },
              { icon: BarChart, label: 'Polls', tab: 'polls' },
              // MUS 240 specific: AI Group Project
              ...(course.id === 'mus-240' ? [{ icon: Brain, label: 'AI Groups', tab: 'ai-groups' }] : []),
              { icon: Users, label: 'Groups', tab: 'groups' },
              { icon: MessageSquare, label: 'Lounge', tab: 'lounge' },
              // MUS 240 specific: Resources
              ...(course.id === 'mus-240' ? [{ icon: Library, label: 'Resources', tab: 'resources' }] : []),
              { icon: Mail, label: 'Mail Center', tab: 'mail' },
              { icon: Trophy, label: 'Grades', tab: 'grades' },
              { icon: UserCheck, label: 'Attendance', tab: 'attendance' },
              { icon: Ruler, label: 'Rubrics', tab: 'rubrics' },
              { icon: Calendar, label: 'Calendar', tab: 'calendar' },
            ].map(item => (
              <button
                key={item.tab}
                onClick={() => setActiveTab(item.tab)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  activeTab === item.tab 
                    ? 'bg-primary text-primary-foreground font-medium' 
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                }`}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 lg:p-6 space-y-6 max-w-5xl mx-auto">
            {/* Back Button */}
            <Button
              variant="ghost"
              onClick={() => navigate('/glee-academy')}
              className="mb-2"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Academy
            </Button>

            {/* Course Header */}
            <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-6 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <Badge variant="secondary" className="font-mono">{course.courseCode}</Badge>
                <Badge variant="outline" className="border-primary-foreground/30 text-primary-foreground">
                  {course.level}
                </Badge>
              </div>
              <h1 className="text-2xl lg:text-3xl font-bold">{course.title}</h1>
              <p className="text-primary-foreground/80 mt-2">{course.description}</p>
            </div>

            {/* Mobile Tab Navigation */}
            <div className="lg:hidden">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full flex-wrap h-auto gap-1">
                  <TabsTrigger value="home">Home</TabsTrigger>
                  <TabsTrigger value="assignments">Assignments</TabsTrigger>
                  <TabsTrigger value="tests">Tests</TabsTrigger>
                  <TabsTrigger value="lounge">Lounge</TabsTrigger>
                  <TabsTrigger value="grades">Grades</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Content Sections */}
            {activeTab === 'home' && (
              <div className="space-y-6">
                {/* Enrollment Card */}
                {!isEnrolled && !enrollmentLoading && (
                  <Card className="border-primary/50 bg-primary/5">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold">Enroll in this Course</h3>
                          <p className="text-muted-foreground">Get access to all course materials, assignments, and the course lounge.</p>
                        </div>
                        <Button onClick={handleEnroll} size="lg">
                          <GraduationCap className="h-5 w-5 mr-2" />
                          Enroll Now
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Welcome Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-primary" />
                      Welcome to {course.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">{course.description}</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {course.highlights.map((highlight, i) => (
                        <div key={i} className="bg-muted/50 rounded-lg p-3 text-center">
                          <span className="text-sm font-medium">{highlight}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Instructor Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      Instructor
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="font-semibold text-lg">{course.instructor.name}</p>
                      <p className="text-muted-foreground">
                        <Mail className="h-4 w-4 inline mr-2" />
                        {course.instructor.email}
                      </p>
                      <p className="text-muted-foreground">
                        <BookMarked className="h-4 w-4 inline mr-2" />
                        Office: {course.instructor.office}
                      </p>
                      <p className="text-muted-foreground">
                        <Clock className="h-4 w-4 inline mr-2" />
                        Office Hours: {course.instructor.hours}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Links */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { icon: ClipboardList, label: 'Assignments', tab: 'assignments' },
                    { icon: FileCheck, label: 'Tests', tab: 'tests' },
                    { icon: MessageSquare, label: 'Lounge', tab: 'lounge' },
                    { icon: Trophy, label: 'Grades', tab: 'grades' },
                  ].map(item => (
                    <Card 
                      key={item.tab}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setActiveTab(item.tab)}
                    >
                      <CardContent className="p-4 text-center">
                        <item.icon className="h-8 w-8 mx-auto text-primary mb-2" />
                        <span className="font-medium">{item.label}</span>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'syllabus' && (
              <Card>
                <CardHeader>
                  <CardTitle>Course Syllabus</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Syllabus content will be available here.</p>
                </CardContent>
              </Card>
            )}

            {activeTab === 'announcements' && (
              <CourseAnnouncements courseId={course.id} />
            )}

            {activeTab === 'assignments' && (
              <CourseAssignments courseId={course.id} isEnrolled={isEnrolled} />
            )}

            {/* MUS 240 Journals Tab */}
            {activeTab === 'journals' && course.id === 'mus-240' && (
              <React.Suspense fallback={<Card><CardContent className="py-8 text-center">Loading journals...</CardContent></Card>}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PenLine className="h-5 w-5 text-primary" />
                      Listening Journals
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">
                      Submit your listening journals for each week's assigned music. Each journal requires a minimum of 250 words.
                    </p>
                    <Button onClick={() => navigate('/mus-240/student/dashboard')}>
                      <PenLine className="h-4 w-4 mr-2" />
                      Open Student Dashboard
                    </Button>
                  </CardContent>
                </Card>
              </React.Suspense>
            )}

            {activeTab === 'tests' && (
              <Card>
                <CardHeader>
                  <CardTitle>Tests & Quizzes</CardTitle>
                </CardHeader>
                <CardContent>
                  {course.id === 'mus-240' ? (
                    <div className="space-y-4">
                      <p className="text-muted-foreground">Access all MUS 240 tests and exams from your student dashboard.</p>
                      <Button onClick={() => navigate('/mus-240/student/dashboard')}>
                        <FileCheck className="h-4 w-4 mr-2" />
                        Go to Student Dashboard
                      </Button>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Tests will be available here when published.</p>
                  )}
                </CardContent>
              </Card>
            )}

            {activeTab === 'polls' && (
              course.id === 'mus-240' ? (
                <React.Suspense fallback={<Card><CardContent className="py-8 text-center">Loading polls...</CardContent></Card>}>
                  <Mus240PollSystem />
                </React.Suspense>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>Class Polls</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">Polls will appear here during class.</p>
                  </CardContent>
                </Card>
              )
            )}

            {/* MUS 240 AI Groups Tab */}
            {activeTab === 'ai-groups' && course.id === 'mus-240' && (
              <React.Suspense fallback={<Card><CardContent className="py-8 text-center">Loading groups...</CardContent></Card>}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="h-5 w-5 text-primary" />
                      AI Music Project Groups
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">
                      Collaborate with your group on the AI Music Project. Topics include Commodification & Technology, Artist Careers, Genres & AI, Cultural Identity, Business & Economics, and Ethics & Futures.
                    </p>
                    <Button onClick={() => navigate('/mus-240/groups')}>
                      <Users className="h-4 w-4 mr-2" />
                      Manage AI Project Groups
                    </Button>
                  </CardContent>
                </Card>
              </React.Suspense>
            )}

            {/* Groups Tab */}
            {activeTab === 'groups' && (
              <CourseGroupsPanel courseId={course.id} />
            )}

            {/* MUS 240 Resources Tab */}
            {activeTab === 'resources' && course.id === 'mus-240' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Library className="h-5 w-5 text-primary" />
                    Course Resources
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Access readings, audio examples, videos, and research materials for the course.
                  </p>
                  <Button onClick={() => navigate('/mus-240/resources')}>
                    <Library className="h-4 w-4 mr-2" />
                    Open Resources Library
                  </Button>
                </CardContent>
              </Card>
            )}

            {activeTab === 'lounge' && (
              <CourseLounge courseId={course.id} courseName={course.title} isEnrolled={isEnrolled} />
            )}

            {activeTab === 'mail' && (
              <Card>
                <CardHeader>
                  <CardTitle>Mail Center</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button onClick={() => navigate('/compose')}>
                    <Mail className="h-4 w-4 mr-2" />
                    Compose Message to Instructor
                  </Button>
                </CardContent>
              </Card>
            )}

            {activeTab === 'grades' && (
              course.id === 'a0000000-0000-0000-0000-000000000070' && isAdmin ? (
                <Mus070GradeSpreadsheet />
              ) : course.id === 'mus-240' && isAdmin ? (
                <React.Suspense fallback={<Card><CardContent className="py-8 text-center">Loading grades...</CardContent></Card>}>
                  <GradesAdmin />
                </React.Suspense>
              ) : (
                <CourseGradebook courseId={course.id} isEnrolled={isEnrolled} />
              )
            )}

            {activeTab === 'attendance' && (
              course.id === 'a0000000-0000-0000-0000-000000000070' ? (
                <Mus070AttendanceView />
              ) : (
                <CourseAttendance courseId={course.id} isEnrolled={isEnrolled} />
              )
            )}

            {activeTab === 'rubrics' && (
              <Card>
                <CardHeader>
                  <CardTitle>Grading Rubrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Rubrics for assignments will be displayed here.</p>
                </CardContent>
              </Card>
            )}

            {activeTab === 'calendar' && (
              <CourseCalendarView courseId={course.id} />
            )}

            {/* Instructor Control Center Button */}
            {isAdmin && (
              <div className="fixed bottom-6 right-6">
                <Button 
                  onClick={() => navigate(`/instructor/admin/${course.id}`)} 
                  variant="default" 
                  className="shadow-lg" 
                  size="lg"
                >
                  <Settings className="h-5 w-5 mr-2" />
                  Instructor Control Center
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar - Resources */}
        <div className="w-[20%] min-w-[200px] bg-card border-l border-border flex-shrink-0 overflow-y-auto hidden xl:block">
          <div className="p-4 space-y-4">
            <h3 className="font-bold text-foreground">Course Resources</h3>
            
            {[
              { icon: Video, label: 'Video Library', desc: 'Lecture recordings' },
              { icon: Headphones, label: 'Audio Examples', desc: 'Listening materials' },
              { icon: Music, label: 'Sheet Music', desc: 'Scores and materials' },
              { icon: FileText, label: 'Documents', desc: 'Handouts and readings' },
            ].map((item, i) => (
              <Card key={i} className="cursor-pointer hover:bg-muted/50 transition-colors">
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <item.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm">{item.label}</h4>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </UniversalLayout>
  );
};
