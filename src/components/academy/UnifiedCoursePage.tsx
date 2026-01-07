import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { BookOpen, Calendar, Mail, ClipboardList, FileCheck, BarChart, MessageSquare, Video, Headphones, FileText, BookMarked, UserCheck, Ruler, Settings, Music, ArrowLeft, Users, GraduationCap, Home, Bell, Trophy, Clock, PenLine, Brain, Library, MessagesSquare } from 'lucide-react';
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
import { CourseTestsSection } from './CourseTestsSection';
import { useMus240SemesterSafe } from '@/contexts/Mus240SemesterContext';
import { CourseMessagingInterface } from './CourseMessagingInterface';
import { Mus240SemesterSelector } from '@/components/mus240/admin/Mus240SemesterSelector';
import { StudentSyllabusView } from './syllabus/StudentSyllabusView';

// Lazy loaded components for performance
const AcademyPollSystem = React.lazy(() => import('@/components/academy/polls/AcademyPollSystem').then(m => ({
  default: m.AcademyPollSystem
})));
const GradesAdmin = React.lazy(() => import('@/components/mus240/instructor/GradesAdmin').then(m => ({
  default: m.GradesAdmin
})));
interface UnifiedCoursePageProps {
  course: AcademyCourse;
}
export const UnifiedCoursePage: React.FC<UnifiedCoursePageProps> = ({
  course
}) => {
  const navigate = useNavigate();
  const {
    user
  } = useAuth();
  const {
    currentSemester
  } = useMus240SemesterSafe();
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
  }, [user, course.id, currentSemester]);
  const checkEnrollmentAndRole = async () => {
    if (!user) {
      setEnrollmentLoading(false);
      return;
    }
    try {
      // Check admin status and role
      const {
        data: profile
      } = await supabase.from('gw_profiles').select('is_admin, is_super_admin, role').eq('user_id', user.id).single();
      setIsAdmin(profile?.is_admin || profile?.is_super_admin || false);

      // For MUS 070 (Glee Club), members and admins are auto-enrolled
      if (course.id === 'a0000000-0000-0000-0000-000000000070') {
        if (profile?.role === 'member' || profile?.is_admin || profile?.is_super_admin) {
          setIsEnrolled(true);
          setEnrollmentLoading(false);
          return;
        }
      }

      // For MUS 240, check the mus240_enrollments table with current semester
      if (course.id === 'a0000000-0000-0000-0000-000000000240') {
        const {
          data: mus240Enrollment
        } = await supabase.from('mus240_enrollments').select('*').eq('student_id', user.id).eq('semester', currentSemester).eq('enrollment_status', 'enrolled').maybeSingle();
        setIsEnrolled(!!mus240Enrollment || profile?.is_admin || profile?.is_super_admin);
        setEnrollmentLoading(false);
        return;
      }

      // Check enrollment for other courses
      const {
        data: enrollment
      } = await supabase.from('gw_course_enrollments').select('*').eq('user_id', user.id).eq('course_id', course.id).maybeSingle();
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
      const {
        data: courseData,
        error: courseError
      } = await supabase.from('gw_courses').select('id').eq('course_code', course.courseCode.replace(' ', '-')).single();
      if (courseError || !courseData) {
        // Try alternative format
        const {
          data: altCourseData
        } = await supabase.from('gw_courses').select('id').ilike('course_code', `%${course.courseCode.replace(' ', '%')}%`).single();
        if (!altCourseData) {
          toast.error('Course not found');
          return;
        }
      }
      const courseId = courseData?.id;
      const {
        error
      } = await supabase.from('gw_course_enrollments').insert({
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
  return <div className="academy-neutral">
      <UniversalLayout showHeader={true} showFooter={true} containerized={false}>
        <div className="flex min-h-screen bg-background">
        {/* Left Sidebar - Navigation */}
        <div className="w-[260px] min-w-[260px] bg-muted border-r border-border flex-shrink-0 hidden lg:block pr-[10px]">
          <div className="p-4 border-b border-border pb-[30px] pt-[20px]">
            <Mus240SemesterSelector showLabel={false} className="mb-2" />
            <div className="text-lg font-bold text-foreground pt-[10px]">{course.courseCode}</div>
            <div className="text-sm text-muted-foreground">{course.title}</div>
          </div>
          
          <nav className="p-2 space-y-1">
            {[{
              icon: Home,
              label: 'Home',
              tab: 'home'
            }, {
              icon: FileText,
              label: 'Syllabus',
              tab: 'syllabus'
            }, {
              icon: Bell,
              label: 'Announcements',
              tab: 'announcements'
            }, {
              icon: MessagesSquare,
              label: 'Messages',
              tab: 'messages',
              isExternal: true
            }, {
              icon: ClipboardList,
              label: 'Assignments',
              tab: 'assignments'
            }, {
              icon: PenLine,
              label: 'Journals',
              tab: 'journals'
            }, {
              icon: FileCheck,
              label: 'Tests',
              tab: 'tests'
            }, {
              icon: BarChart,
              label: 'Polls',
              tab: 'polls'
            }, {
              icon: Brain,
              label: 'AI Groups',
              tab: 'ai-groups'
            }, {
              icon: Users,
              label: 'Groups',
              tab: 'groups'
            }, {
              icon: MessageSquare,
              label: 'Lounge',
              tab: 'lounge'
            }, {
              icon: Library,
              label: 'Resources',
              tab: 'resources'
            }, {
              icon: Trophy,
              label: 'Grades',
              tab: 'grades'
            }, {
              icon: UserCheck,
              label: 'Attendance',
              tab: 'attendance'
            }, {
              icon: Ruler,
              label: 'Rubrics',
              tab: 'rubrics'
            }, {
              icon: Calendar,
              label: 'Calendar',
              tab: 'calendar'
            }].map(item => <button key={item.tab} onClick={() => {
              if (item.isExternal && item.tab === 'messages') {
                // Navigate to messenger with course context
                navigate(`/messenger?courseId=${course.id}&courseName=${encodeURIComponent(course.courseCode + ' - ' + course.title)}`);
              } else {
                setActiveTab(item.tab);
              }
            }} className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${activeTab === item.tab ? 'bg-primary text-primary-foreground font-medium' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}`}>
                
                <span className="text-xl pl-[20px]">{item.label}</span>
              </button>)}
          </nav>
          
          {/* Course Resources Section */}
          <div className="p-4 border-t border-border space-y-2">
            <h3 className="font-bold text-foreground text-sm mb-3">Resources</h3>
            {[{
              icon: Video,
              label: 'Video Library',
              desc: 'Lecture recordings'
            }, {
              icon: Headphones,
              label: 'Audio Examples',
              desc: 'Listening materials'
            }, {
              icon: Music,
              label: 'Sheet Music',
              desc: 'Scores and materials'
            }, {
              icon: FileText,
              label: 'Documents',
              desc: 'Handouts and readings'
            }].map((item, i) => <button key={i} className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors text-muted-foreground hover:bg-muted/50 hover:text-foreground">
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </button>)}
          </div>
          
          {/* Instructor Control Center Button */}
          {isAdmin && <div className="p-4 border-t border-border">
              <Button onClick={() => navigate(`/${course.courseCode.toLowerCase().replace(' ', '-')}/instructor/console`)} variant="default" className="w-full" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Instructor Console
              </Button>
            </div>}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto">
          {/* Course Header - Full width on mobile, seamless with header */}
          <div className="bg-gradient-to-r from-primary to-primary/80 lg:hidden">
            <div className="px-4 sm:px-6 pb-6 pt-4">
              <div className="flex items-center gap-3 mb-2">
                <Badge variant="secondary" className="font-mono">{course.courseCode}</Badge>
                <Badge variant="outline" className="border-white/30 text-white">
                  {course.level}
                </Badge>
              </div>
              <h1 className="text-2xl font-bold text-white">{course.title}</h1>
              <p className="text-white/80 mt-2">{course.description}</p>
            </div>
          </div>

          <div className="px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 space-y-6 max-w-6xl mx-auto py-6">
            {/* Back Button - Desktop only */}
            <Button variant="ghost" onClick={() => navigate('/glee-academy')} className="hidden lg:flex -mb-2">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Academy
            </Button>

            {/* Course Header - Card on Desktop */}
            <Card className="bg-gradient-to-r from-primary to-primary/80 border-0 hidden lg:block">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3 mb-2">
                  <Badge variant="secondary" className="font-mono">{course.courseCode}</Badge>
                  <Badge variant="outline" className="border-white/30 text-white px-0 pt-[10px]">
                    {course.level}
                  </Badge>
                </div>
                <CardTitle className="text-2xl lg:text-3xl font-bold text-white pb-[10px]">{course.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-white/80 pt-[10px]">{course.description}</p>
              </CardContent>
            </Card>

            {/* Mobile Tab Navigation - Below Welcome Card */}
            <div className="lg:hidden relative z-10 -mx-4 px-4">
              <Tabs value={activeTab} onValueChange={val => {
                console.log('Tab changed to:', val);
                if (val === 'messages') {
                  // Navigate to messenger with course context
                  navigate(`/messenger?courseId=${course.id}&courseName=${encodeURIComponent(course.courseCode + ' - ' + course.title)}`);
                } else {
                  setActiveTab(val);
                }
              }}>
                <TabsList className="w-full grid grid-cols-4 h-auto">
                  <TabsTrigger value="home" className="text-xs px-2">Home</TabsTrigger>
                  <TabsTrigger value="messages" className="text-xs px-2">Messages</TabsTrigger>
                  <TabsTrigger value="assignments" className="text-xs px-2">Assignments</TabsTrigger>
                  <TabsTrigger value="tests" className="text-xs px-2">Tests</TabsTrigger>
                </TabsList>
                <TabsList className={`w-full grid h-auto mt-1 ${isAdmin ? 'grid-cols-5' : 'grid-cols-4'}`}>
                  <TabsTrigger value="lounge" className="text-xs px-2">Lounge</TabsTrigger>
                  <TabsTrigger value="grades" className="text-xs px-2">Grades</TabsTrigger>
                  <TabsTrigger value="syllabus" className="text-xs px-2">Syllabus</TabsTrigger>
                  <TabsTrigger value="resources" className="text-xs px-2">Resources</TabsTrigger>
                  {isAdmin && <TabsTrigger value="instructor" className="text-xs px-2" onClick={e => {
                    e.preventDefault();
                    navigate(`/${course.courseCode.toLowerCase().replace(' ', '-')}/instructor/console`);
                  }}>
                      <Settings className="h-3 w-3 mr-1" />
                      Instructor
                    </TabsTrigger>}
                </TabsList>
              </Tabs>
            </div>

            {/* Content Sections */}
            {activeTab === 'home' && <div className="space-y-6">
                {/* Enrollment Card */}
                {!isEnrolled && !enrollmentLoading && <Card className="border-primary/50 bg-primary/5">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold">Enroll in this Course</h3>
                          <p className="text-muted-foreground text-lg">Get access to all course materials, assignments, and the course lounge.</p>
                        </div>
                        <Button onClick={handleEnroll} size="lg">
                          <GraduationCap className="h-5 w-5 mr-2" />
                          Enroll Now
                        </Button>
                      </div>
                    </CardContent>
                  </Card>}

                {/* Welcome Card */}
                <Card className="bg-primary border-0">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-white py-[5px] text-2xl text-left">
                      <BookOpen className="h-5 w-5 text-white" />
                      Welcome to {course.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-white/80 mb-4 text-xl">{course.description}</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {course.highlights.map((highlight, i) => <div key={i} className="bg-white/10 rounded-lg p-3 text-center">
                          <span className="text-sm font-medium text-white">{highlight}</span>
                        </div>)}
                    </div>
                  </CardContent>
                </Card>

                {/* Instructor Card */}
                <Card className="bg-primary border-0">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-white">
                      <Users className="h-5 w-5 text-white" />
                      Instructor
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="font-semibold text-lg text-white">{course.instructor.name}</p>
                      <p className="text-white/80">
                        <Mail className="h-4 w-4 inline mr-2" />
                        {course.instructor.email}
                      </p>
                      <p className="text-white/80">
                        <BookMarked className="h-4 w-4 inline mr-2" />
                        Office: {course.instructor.office}
                      </p>
                      <p className="text-white/80">
                        <Clock className="h-4 w-4 inline mr-2" />
                        Office Hours: {course.instructor.hours}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Links */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[{
                  icon: ClipboardList,
                  label: 'Assignments',
                  tab: 'assignments'
                }, {
                  icon: FileCheck,
                  label: 'Tests',
                  tab: 'tests'
                }, {
                  icon: MessageSquare,
                  label: 'Lounge',
                  tab: 'lounge'
                }, {
                  icon: Trophy,
                  label: 'Grades',
                  tab: 'grades'
                }].map(item => <Card key={item.tab} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setActiveTab(item.tab)}>
                      <CardContent className="p-4 text-center border border-muted-foreground">
                        <item.icon className="h-8 w-8 mx-auto text-primary mb-2" />
                        <span className="font-medium">{item.label}</span>
                      </CardContent>
                    </Card>)}
                </div>
              </div>}

            {activeTab === 'syllabus' && <StudentSyllabusView course={course} />}

            {activeTab === 'announcements' && <CourseAnnouncements courseId={course.id} />}

            {activeTab === 'messages' && <CourseMessagingInterface courseId={course.id} courseName={course.title} isEnrolled={isEnrolled} />}

            {activeTab === 'assignments' && <CourseAssignments courseId={course.id} isEnrolled={isEnrolled} />}

            {/* Journals Tab - Available for all courses */}
            {activeTab === 'journals' && <Card>
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
                  <p className="text-muted-foreground">No journals assigned yet.</p>
                </CardContent>
              </Card>}

            {activeTab === 'tests' && <CourseTestsSection courseId={course.id} legacyCourseId={course.courseCode.toLowerCase().replace(' ', '')} />}

            {activeTab === 'polls' && <React.Suspense fallback={<Card><CardContent className="py-8 text-center">Loading polls...</CardContent></Card>}>
                <AcademyPollSystem courseId={course.id} />
              </React.Suspense>}

            {/* AI Groups Tab - Available for all courses */}
            {activeTab === 'ai-groups' && <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-primary" />
                    AI Project Groups
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Collaborate with your group on AI-powered projects. Work together on research, presentations, and creative endeavors.
                  </p>
                  <p className="text-muted-foreground">No AI project groups assigned yet.</p>
                </CardContent>
              </Card>}

            {/* Groups Tab */}
            {activeTab === 'groups' && <CourseGroupsPanel courseId={course.id} />}

            {/* Resources Tab - Available for all courses */}
            {activeTab === 'resources' && <Card>
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
                  <p className="text-muted-foreground">No resources uploaded yet.</p>
                </CardContent>
              </Card>}

            {activeTab === 'lounge' && <CourseLounge courseId={course.id} courseName={course.title} isEnrolled={isEnrolled} instructorEmail={course.instructor.email} isAdmin={isAdmin} />}

            {activeTab === 'grades' && (isAdmin ? <React.Suspense fallback={<Card><CardContent className="py-8 text-center">Loading grades...</CardContent></Card>}>
                  <GradesAdmin />
                </React.Suspense> : <CourseGradebook courseId={course.id} isEnrolled={isEnrolled} />)}

            {activeTab === 'attendance' && <CourseAttendance courseId={course.id} isEnrolled={isEnrolled} isAdmin={isAdmin} />}

            {activeTab === 'rubrics' && <Card>
                <CardHeader>
                  <CardTitle>Grading Rubrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Rubrics for assignments will be displayed here.</p>
                </CardContent>
              </Card>}

            {activeTab === 'calendar' && <CourseCalendarView courseId={course.id} />}

          </div>
        </div>
      </div>
    </UniversalLayout>
  </div>;
};