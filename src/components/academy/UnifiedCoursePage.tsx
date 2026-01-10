import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { BookOpen, Calendar, Mail, ClipboardList, FileCheck, BarChart, MessageSquare, Video, Headphones, FileText, BookMarked, UserCheck, Ruler, Settings, Music, ArrowLeft, Users, GraduationCap, Home, Bell, Trophy, Clock, PenLine, Brain, Library, MessagesSquare, Book } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AcademyCourse } from '@/config/academyCourses';
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
import { CourseHandbook } from './handbook/CourseHandbook';

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
  const location = useLocation();
  const {
    user
  } = useAuth();
  const {
    currentSemester
  } = useMus240SemesterSafe();

  // Detect if URL contains /handbook to auto-switch tab
  const getInitialTab = () => {
    if (location.pathname.includes('/handbook')) return 'handbook';
    return 'home';
  };
  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [enrollmentLoading, setEnrollmentLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Sync tab with URL changes
  useEffect(() => {
    if (location.pathname.includes('/handbook')) {
      setActiveTab('handbook');
    }
  }, [location.pathname]);

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
        {/* Left Sidebar - Navigation - Visible on tablet (md) and up */}
        <div className="w-[200px] md:w-[220px] lg:w-[260px] min-w-[200px] md:min-w-[220px] lg:min-w-[260px] bg-muted border-r border-border flex-shrink-0 hidden md:block">
          <div className="p-3 md:p-4 border-b border-border pb-4 md:pb-6 lg:pb-[30px] pt-3 md:pt-4 lg:pt-[20px]">
            <Mus240SemesterSelector showLabel={false} className="mb-2" />
            <div className="text-base md:text-lg font-bold text-foreground pt-2 md:pt-[10px] pl-2 md:pl-4 lg:pl-[20px]">{course.courseCode}</div>
            <div className="text-lg md:text-xl text-black border-2 md:border-4 border-solid border-primary py-1 md:py-[5px] pr-2 md:pr-[5px] pl-2 md:pl-3 lg:pl-[15px]">{course.title}</div>
          </div>
          
          <nav className="p-1.5 md:p-2 space-y-0.5 md:space-y-1">
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
              tab: 'messages'
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
            },
            // Handbook - only for MUS 070
            ...(course.courseCode === 'MUS 070' ? [{
              icon: Book,
              label: 'Handbook',
              tab: 'handbook'
            }] : [])].map(item => <button key={item.tab} onClick={() => setActiveTab(item.tab)} className={`w-full flex items-center gap-2 md:gap-3 px-2 md:px-3 py-1.5 md:py-2 rounded-md text-xs md:text-sm transition-colors ${activeTab === item.tab ? 'bg-primary text-primary-foreground font-medium' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}`}>
                
                <span className="text-sm md:text-base lg:text-lg pl-2 md:pl-3 lg:pl-[20px]">{item.label}</span>
              </button>)}
          </nav>
          
          {/* Course Resources Section */}
          <div className="p-2 md:p-3 lg:p-4 border-t border-border space-y-1 md:space-y-2">
            <h3 className="font-bold text-foreground text-xs md:text-sm mb-2 md:mb-3">Resources</h3>
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
            }].map((item, i) => <button key={i} className="w-full flex items-center gap-2 md:gap-3 px-2 md:px-3 py-1.5 md:py-2 rounded-md text-xs md:text-sm transition-colors text-muted-foreground hover:bg-muted/50 hover:text-foreground">
                <item.icon className="h-3 w-3 md:h-4 md:w-4" />
                <span>{item.label}</span>
              </button>)}
          </div>
          
          {/* Instructor Control Center Button */}
          {isAdmin && <div className="p-2 md:p-3 lg:p-4 border-t border-border">
              <Button onClick={() => navigate(`/${course.courseCode.toLowerCase().replace(' ', '-')}/instructor/console`)} variant="default" className="w-full text-xs md:text-sm" size="sm">
                <Settings className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                Instructor Console
              </Button>
            </div>}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto">
          {/* Course Header - Full width dark blue on all screen sizes */}
          <div className="bg-[#003666] w-full">
            <div className="px-4 sm:px-6 md:px-6 lg:px-12 xl:px-16 py-4 md:py-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 md:gap-3 mb-2">
                    <Badge variant="secondary" className="font-mono text-xs md:text-sm">{course.courseCode}</Badge>
                    <Badge variant="outline" className="border-white/30 text-white text-xs md:hidden">
                      {course.level}
                    </Badge>
                  </div>
                  <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-white">{course.title}</h1>
                  <p className="text-white/80 mt-2 text-sm md:hidden">{course.description}</p>
                  <div className="hidden md:flex flex-wrap items-center gap-3 md:gap-4 lg:gap-6 mt-2 md:mt-3 text-xs md:text-sm text-white/80">
                    <span className="font-medium text-white">Dr. Kevin Johnson</span>
                    <span>kjohns10@spelman.edu</span>
                    <span className="hidden lg:inline">Office: Fine Arts 105</span>
                    <span className="hidden lg:inline">Office Hours: MWF 3-5 PM</span>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  onClick={() => navigate('/glee-academy')} 
                  className="hidden md:flex text-white hover:bg-white/10 hover:text-white"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Academy
                </Button>
              </div>
            </div>
          </div>

          <div className="px-4 sm:px-6 md:px-6 lg:px-12 xl:px-16 space-y-4 md:space-y-6 w-full py-4 md:py-6">

            {/* Mobile Tab Navigation - Mobile only (hidden on tablet with sidebar) */}
            <div className="md:hidden relative z-10 -mx-4 px-4">
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
                    
                  </Card>}

                {/* Two Column Layout for Home */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                  {/* Left Column - Music Library (2/3 width) */}
                  <div className="md:col-span-2 space-y-4">
                    <Card className="border border-border">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <Music className="h-5 w-5 text-primary" />
                          Music Library
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {[
                            { icon: Video, label: 'Video Library', desc: 'Lecture recordings & performances' },
                            { icon: Headphones, label: 'Audio Examples', desc: 'Listening materials & rehearsals' },
                            { icon: Music, label: 'Sheet Music', desc: 'Scores and part materials' },
                            { icon: FileText, label: 'Documents', desc: 'Handouts and readings' },
                          ].map((item, i) => (
                            <button 
                              key={i} 
                              onClick={() => setActiveTab('resources')}
                              className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 hover:border-primary/50 transition-colors text-left"
                            >
                              <div className="p-2 rounded-md bg-primary/10">
                                <item.icon className="h-4 w-4 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium text-sm">{item.label}</p>
                                <p className="text-xs text-muted-foreground">{item.desc}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Right Column - Instructor (1/3 width) */}
                  <div className="md:col-span-1">
                    <Card className="bg-primary border-0">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Users className="h-4 w-4 text-white" />
                          <span className="font-semibold text-white text-sm">Instructor</span>
                        </div>
                        <p className="font-semibold text-white text-sm">{course.instructor.name}</p>
                        <p className="text-white/80 text-xs mt-1">
                          <Mail className="h-3 w-3 inline mr-1" />
                          {course.instructor.email}
                        </p>
                        <p className="text-white/80 text-xs mt-1">
                          <Clock className="h-3 w-3 inline mr-1" />
                          {course.instructor.hours}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>}

            {activeTab === 'syllabus' && <StudentSyllabusView course={course} />}

            {activeTab === 'announcements' && <CourseAnnouncements courseId={course.id} />}

            {activeTab === 'messages' && <CourseMessagingInterface courseId={course.id} courseName={course.title} isEnrolled={isEnrolled} instructorEmail={course.instructor?.email} instructorName={course.instructor?.name} />}

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


            {/* Resources Tab - Available for all courses */}
            {activeTab === 'resources' && <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Library className="h-5 w-5 text-primary" />
                    Course Resources
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Course Textbook */}
                  {course.courseCode === 'MUS 210' && <div>
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        Course Textbook
                      </h3>
                      <div className="rounded-lg border overflow-hidden">
                        <iframe src="https://conducting.gleeworld.org" style={{
                      width: '100%',
                      height: '600px'
                    }} allow="fullscreen" title="Course Textbook" className="bg-background" />
                      </div>
                    </div>}
                  
                  {course.courseCode !== 'MUS 210' && <p className="text-muted-foreground">No resources uploaded yet.</p>}
                </CardContent>
              </Card>}

            

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

            {/* Handbook Tab - Only for MUS 070 */}
            {activeTab === 'handbook' && course.courseCode === 'MUS 070' && <CourseHandbook courseCode={course.courseCode} />}

          </div>
        </div>
      </div>
    </UniversalLayout>
  </div>;
};