import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { BookOpen, Calendar, Mail, ClipboardList, FileCheck, BarChart, MessageSquare, Video, Headphones, FileText, BookMarked, UserCheck, Ruler, Settings, Music, ArrowLeft, Users, GraduationCap, Home, Bell, Trophy, Clock, PenLine, Brain, Library, MessagesSquare, Book, Plus, Vote, Layers, Archive } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AcademyCourse } from '@/config/academyCourses';
import { CourseAssignments } from './CourseAssignments';
import { CourseGradebook } from './CourseGradebook';
import { CourseAttendance } from './CourseAttendance';
import { CourseCalendarView } from './CourseCalendarView';
import { CalendarWithAttendance } from './CalendarWithAttendance';
import { CourseVideoLibrary } from '@/components/course/CourseVideoLibrary';
import { CourseAnnouncements } from './CourseAnnouncements';
import { CourseTestsSection } from './CourseTestsSection';
import { useMus240SemesterSafe } from '@/contexts/Mus240SemesterContext';
import Messenger from '@/pages/Messenger';
import { Mus240SemesterSelector } from '@/components/mus240/admin/Mus240SemesterSelector';
import { StudentSyllabusView } from './syllabus/StudentSyllabusView';
import { CourseHandbook } from './handbook/CourseHandbook';
import { StudentDossierHome } from './StudentDossierHome';
import { ElectionsModule } from './elections/ElectionsModule';
import { CourseModules } from './CourseModules';
import { ClassSessionJournals } from './journals/ClassSessionJournals';
import { JournalArchives } from './journals/JournalArchives';
import { Mus240ResourcesTab } from './Mus240ResourcesTab';
import { DiscussionsSection } from '@/components/course/DiscussionsSection';
import { useCourseTeachingAssistants } from '@/hooks/useCourseTeachingAssistants';
import { useUserRole } from '@/hooks/useUserRole';
const SecretaryAttendanceManager = React.lazy(() => import('./SecretaryAttendanceManager').then(m => ({
  default: m.SecretaryAttendanceManager
})));
const AcademyPollSystem = React.lazy(() => import('@/components/academy/polls/AcademyPollSystem').then(m => ({
  default: m.AcademyPollSystem
})));
const GradesAdmin = React.lazy(() => import('@/components/mus240/instructor/GradesAdmin').then(m => ({
  default: m.GradesAdmin
})));
const AllVideosGrid = React.lazy(() => import('@/components/youtube/AllVideosGrid').then(m => ({
  default: m.AllVideosGrid
})));
const LiturgicalPlanner = React.lazy(() => import('./planner/LiturgicalPlanner').then(m => ({
  default: m.LiturgicalPlanner
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
  
  // Fetch teaching assistants for this course
  const { data: teachingAssistants = [] } = useCourseTeachingAssistants(course.courseCode);
  const { isSecretary } = useUserRole();

  // Detect if URL contains /handbook to auto-switch tab
  const getInitialTab = () => {
    if (location.pathname.includes('/handbook')) return 'handbook';
    return 'home';
  };
  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [enrollmentLoading, setEnrollmentLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isExecutiveBoard, setIsExecutiveBoard] = useState(false);

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

  // Redirect non-enrolled users to onboarding
  useEffect(() => {
    if (!enrollmentLoading && !isEnrolled && !isAdmin) {
      const courseSlug = course.courseCode.toLowerCase().replace(' ', '-');
      const target = `/academy/${courseSlug}/onboarding`;
      console.log('[UnifiedCoursePage] Redirecting to onboarding', {
        from: location.pathname,
        courseCode: course.courseCode,
        enrollmentLoading,
        isEnrolled,
        isAdmin,
        target,
      });
      navigate(target, { replace: true });
    } else {
      console.log('[UnifiedCoursePage] No onboarding redirect', {
        path: location.pathname,
        courseCode: course.courseCode,
        enrollmentLoading,
        isEnrolled,
        isAdmin,
      });
    }
  }, [enrollmentLoading, isEnrolled, isAdmin, course.courseCode, navigate, location.pathname]);

  const checkEnrollmentAndRole = async () => {
    if (!user) {
      // Not logged in - will be redirected to onboarding
      setEnrollmentLoading(false);
      return;
    }

    try {
      // Check admin status and role
      const { data: profile } = await supabase
        .from('gw_profiles')
        .select('id, is_admin, is_super_admin, role')
        .eq('user_id', user.id)
        .maybeSingle();

      // Treat course instructors/TAs as "admin" for the purpose of bypassing onboarding redirects
      // (this does NOT grant global admin privileges; it only affects this page's client-side navigation)
      let hasCourseStaffAccess = false;
      if (course.courseCode === 'MUS 240' || course.courseCode === 'MUS240') {
        const normalizedCode = course.courseCode.replace(' ', '');
        const { data: taRow } = await supabase
          .from('course_teaching_assistants')
          .select('id')
          .eq('course_code', normalizedCode)
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle();

        hasCourseStaffAccess = !!taRow || profile?.role === 'instructor';
      }

      const adminLikeAccess = !!(profile?.is_admin || profile?.is_super_admin || hasCourseStaffAccess);
      setIsAdmin(adminLikeAccess);
      setIsExecutiveBoard(
        profile?.role === 'executive-board' || profile?.is_admin || profile?.is_super_admin || false,
      );

      // For MUS 070 (Glee Club), members and admins are auto-enrolled
      if (course.id === 'a0000000-0000-0000-0000-000000000070') {
        if (profile?.role === 'member' || profile?.is_admin || profile?.is_super_admin) {
          setIsEnrolled(true);
          setEnrollmentLoading(false);
          return;
        }
      }

      // For MUS 240, accept enrollment from either mus240_enrollments (semester-based)
      // OR gw_course_enrollments (user_id OR student_profile_id), OR course staff.
      if (course.id === '23c4ee3c-7bbb-4534-8c0a-eecd88298d37' || course.courseCode === 'MUS 240') {
        // 1) legacy mus240_enrollments
        const { data: mus240Enrollment } = await supabase
          .from('mus240_enrollments')
          .select('id')
          .eq('student_id', user.id)
          .eq('semester', currentSemester)
          .eq('enrollment_status', 'enrolled')
          .maybeSingle();

        // 2) gw_course_enrollments
        const { data: gwCourseData } = await supabase
          .from('gw_courses')
          .select('id')
          .or(
            'course_code.ilike.%MUS 240%,course_code.ilike.%MUS-240%,course_code.ilike.%MUS240%,course_code.eq.MUS 240,course_code.eq.MUS240',
          )
          .limit(1)
          .maybeSingle();

        let gwEnrolled = false;
        if (gwCourseData?.id) {
          const { data: gwEnrollmentByUserId } = await supabase
            .from('gw_course_enrollments')
            .select('id')
            .eq('course_id', gwCourseData.id)
            .eq('user_id', user.id)
            .eq('enrollment_status', 'enrolled')
            .maybeSingle();

          if (gwEnrollmentByUserId) {
            gwEnrolled = true;
          } else if (profile?.id) {
            const { data: gwEnrollmentByProfileId } = await supabase
              .from('gw_course_enrollments')
              .select('id')
              .eq('course_id', gwCourseData.id)
              .eq('student_profile_id', profile.id)
              .eq('enrollment_status', 'enrolled')
              .maybeSingle();

            gwEnrolled = !!gwEnrollmentByProfileId;
          }
        }

        const enrolledValue = !!mus240Enrollment || gwEnrolled || adminLikeAccess;
        console.log('[UnifiedCoursePage] MUS240 enrollment check', {
          userId: user.id,
          currentSemester,
          courseId: course.id,
          courseCode: course.courseCode,
          profileRole: profile?.role,
          profileId: profile?.id,
          isAdminFlag: profile?.is_admin,
          isSuperAdminFlag: profile?.is_super_admin,
          hasCourseStaffAccess,
          adminLikeAccess,
          hasLegacyEnrollment: !!mus240Enrollment,
          hasGwCourse: !!gwCourseData?.id,
          gwEnrolled,
          enrolledValue,
        });

        setIsEnrolled(enrolledValue);
        setEnrollmentLoading(false);
        return;
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
        <div className="w-[160px] md:w-[180px] lg:w-[200px] min-w-[160px] md:min-w-[180px] lg:min-w-[200px] bg-muted border-r border-border flex-shrink-0 hidden md:block">
          <div className="px-2 py-1.5 border-b border-border">
            <Mus240SemesterSelector showLabel={false} className="mb-0.5" />
            <div className="text-xs font-bold text-foreground pl-1">{course.courseCode}</div>
            <div className="text-xs text-black border border-solid border-primary py-0.5 px-1.5 leading-tight">{course.title}</div>
          </div>
          
          <nav className="px-1 py-0.5 space-y-px">
            {(course.courseCode === 'MUS 070' ? [
              { icon: Home, label: 'Home', tab: 'home' },
              { icon: FileText, label: 'Syllabus', tab: 'syllabus' },
              { icon: Book, label: 'Handbook', tab: 'handbook' },
              { icon: Vote, label: 'Elections', tab: 'elections' },
              { icon: Calendar, label: 'Calendar', tab: 'calendar' },
              { icon: Video, label: 'Video Library', tab: 'video-library' },
              { icon: Bell, label: 'Announcements', tab: 'announcements' },
              { icon: MessagesSquare, label: 'Messages', tab: 'messages' },
              { icon: Music, label: 'Music Library', tab: 'music-library' },
              { icon: ClipboardList, label: 'Assignments', tab: 'assignments' },
              { icon: FileCheck, label: 'Tests', tab: 'tests' },
              { icon: BarChart, label: 'Polls', tab: 'polls' },
              { icon: Library, label: 'Resources', tab: 'resources' },
              { icon: Trophy, label: 'Grades', tab: 'grades' },
              { icon: UserCheck, label: 'Attendance', tab: 'attendance' },
              { icon: Ruler, label: 'Rubrics', tab: 'rubrics' },
            ] : course.courseCode === 'LH 100' ? [
              { icon: Home, label: 'Home', tab: 'home' },
              { icon: FileText, label: 'Syllabus', tab: 'syllabus' },
              { icon: Layers, label: 'Modules', tab: 'modules' },
              { icon: BookMarked, label: 'Planner', tab: 'planner' },
              { icon: Calendar, label: 'Calendar', tab: 'calendar' },
              { icon: Video, label: 'Video Library', tab: 'video-library' },
              { icon: Bell, label: 'Announcements', tab: 'announcements' },
              { icon: MessagesSquare, label: 'Messages', tab: 'messages' },
              { icon: ClipboardList, label: 'Assignments', tab: 'assignments' },
              { icon: PenLine, label: 'Journals', tab: 'journals' },
              { icon: FileCheck, label: 'Tests', tab: 'tests' },
              { icon: BarChart, label: 'Polls', tab: 'polls' },
              { icon: Library, label: 'Resources', tab: 'resources' },
              { icon: Trophy, label: 'Grades', tab: 'grades' },
              { icon: UserCheck, label: 'Attendance', tab: 'attendance' },
              { icon: Archive, label: 'Archives', tab: 'archives' },
            ] : [
              { icon: Home, label: 'Home', tab: 'home' },
              { icon: FileText, label: 'Syllabus', tab: 'syllabus' },
              { icon: Layers, label: 'Modules', tab: 'modules' },
              { icon: Calendar, label: 'Calendar', tab: 'calendar' },
              { icon: Video, label: 'Video Library', tab: 'video-library' },
              { icon: Bell, label: 'Announcements', tab: 'announcements' },
              { icon: MessagesSquare, label: 'Messages', tab: 'messages' },
              { icon: MessageSquare, label: 'Discussions', tab: 'discussions' },
              { icon: ClipboardList, label: 'Assignments', tab: 'assignments' },
              { icon: PenLine, label: 'Journals', tab: 'journals' },
              { icon: FileCheck, label: 'Tests', tab: 'tests' },
              { icon: BarChart, label: 'Polls', tab: 'polls' },
              { icon: Library, label: 'Resources', tab: 'resources' },
              { icon: Trophy, label: 'Grades', tab: 'grades' },
              { icon: UserCheck, label: 'Attendance', tab: 'attendance' },
              { icon: Archive, label: 'Archives', tab: 'archives' },
            ]).map(item => <button key={item.tab} onClick={() => setActiveTab(item.tab)} className={`w-full flex items-center gap-1.5 px-1.5 py-0.5 rounded text-xs transition-colors ${activeTab === item.tab ? 'bg-primary text-primary-foreground font-medium' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}`}>
                <item.icon className="h-3 w-3 flex-shrink-0" />
                <span className="text-xs leading-tight">{item.label}</span>
              </button>)}
          </nav>
          
          {/* Course Resources Section */}
          <div className="px-1.5 py-1 border-t border-border space-y-px">
            <h3 className="font-semibold text-foreground text-[10px] uppercase tracking-wide px-1">Resources</h3>
            {[{
              icon: Video,
              label: 'Video Library'
            }, {
              icon: Headphones,
              label: 'Audio'
            }, {
              icon: Music,
              label: 'Sheet Music'
            }, {
              icon: FileText,
              label: 'Documents'
            }].map((item, i) => <button key={i} className="w-full flex items-center gap-1.5 px-1.5 py-0.5 rounded text-xs transition-colors text-muted-foreground hover:bg-muted/50 hover:text-foreground">
                <item.icon className="h-3 w-3" />
                <span>{item.label}</span>
              </button>)}
          </div>
          
          {/* Secretary Attendance Button - For Librarian/Secretary */}
          {isSecretary() && <div className="px-1.5 py-1 border-t border-border">
              <Button onClick={() => setActiveTab('secretary')} variant={activeTab === 'secretary' ? 'default' : 'outline'} className="w-full text-xs h-7" size="sm">
                <UserCheck className="h-3 w-3 mr-1" />
                Secretary
              </Button>
            </div>}
          
          {/* Instructor Control Center Button */}
          {isAdmin && <div className="px-1.5 py-1 border-t border-border">
              <Button onClick={() => navigate(`/${course.courseCode.toLowerCase().replace(' ', '-')}/instructor/console`)} variant="default" className="w-full text-xs h-7" size="sm">
                <Settings className="h-3 w-3 mr-1" />
                Instructor
              </Button>
            </div>}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto">
          {/* Course Header - Full width dark blue on all screen sizes */}
          <div className="bg-[#003666] w-full">
            <div className="px-3 sm:px-4 md:px-6 py-2 md:py-3">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="secondary" className="font-mono text-xs">{course.courseCode}</Badge>
                    <Badge variant="outline" className="border-white/30 text-white text-xs md:hidden">
                      {course.level}
                    </Badge>
                  </div>
                  <h1 className="text-base md:text-lg font-bold text-white">{course.title}</h1>
                  <p className="text-white/80 mt-1 text-xs md:hidden">{course.description}</p>
                  <div className="hidden md:flex flex-wrap items-center gap-3 mt-1 text-xs text-white/80">
                    <span className="font-medium text-white">Dr. Kevin Johnson</span>
                    <span>kjohns10@spelman.edu</span>
                    <span className="hidden lg:inline">Office: Fine Arts 105</span>
                    <span className="hidden lg:inline">Office Hours: MWF 3-5 PM</span>
                    {/* Display staff by role */}
                    {(() => {
                      const instructors = teachingAssistants.filter(ta => 
                        ta.notes?.toLowerCase().includes('instructor')
                      );
                      const secretaries = teachingAssistants.filter(ta => 
                        ta.notes?.toLowerCase().includes('secretary')
                      );
                      const tas = teachingAssistants.filter(ta => 
                        !ta.notes?.toLowerCase().includes('instructor') && 
                        !ta.notes?.toLowerCase().includes('secretary')
                      );
                      
                      return (
                        <>
                          {instructors.length > 0 && (
                            <>
                              <span className="text-white/50">|</span>
                              <span className="flex items-center gap-1">
                                <span className="font-medium text-white/90">Instructor:</span>
                                {instructors.map((inst, idx) => (
                                  <span key={inst.id}>
                                    {inst.profile?.full_name}
                                    {idx < instructors.length - 1 ? ', ' : ''}
                                  </span>
                                ))}
                              </span>
                            </>
                          )}
                          {secretaries.length > 0 && (
                            <>
                              <span className="text-white/50">|</span>
                              <span className="flex items-center gap-1">
                                <span className="font-medium text-white/90">Secretary:</span>
                                {secretaries.map((sec, idx) => (
                                  <span key={sec.id}>
                                    {sec.profile?.full_name}
                                    {idx < secretaries.length - 1 ? ', ' : ''}
                                  </span>
                                ))}
                              </span>
                            </>
                          )}
                          {tas.length > 0 && (
                            <>
                              <span className="text-white/50">|</span>
                              <span className="flex items-center gap-1">
                                <GraduationCap className="h-3 w-3" />
                                <span className="font-medium text-white/90">
                                  TA{tas.length > 1 ? 's' : ''}:
                                </span>
                                {tas.map((ta, idx) => (
                                  <span key={ta.id}>
                                    {ta.profile?.full_name || 'TA'}
                                    {idx < tas.length - 1 ? ', ' : ''}
                                  </span>
                                ))}
                              </span>
                            </>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => navigate('/glee-academy')} 
                  className="hidden md:flex text-white hover:bg-white/10 hover:text-white text-xs"
                >
                  <ArrowLeft className="h-3 w-3 mr-1" />
                  Back
                </Button>
              </div>
            </div>
          </div>

          <div className="px-3 sm:px-4 md:px-6 space-y-3 md:space-y-4 w-full py-3 md:py-4">

            {/* Mobile Tab Navigation - Mobile only (hidden on tablet with sidebar) */}
            <div className="md:hidden relative z-10 -mx-4 px-4">
              <Tabs value={activeTab} onValueChange={val => {
                console.log('Tab changed to:', val);
                setActiveTab(val);
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
            {activeTab === 'home' && (
              (course.courseCode === 'MUS 070' || course.courseCode === 'MUS 210' || course.courseCode === 'MUS 240' || course.courseCode === 'LH 100') ? (
                <StudentDossierHome courseId={course.id} />
              ) : (
                <div className="space-y-4">
                  {/* Enrollment Card */}
                  {!isEnrolled && !enrollmentLoading && <Card className="border-primary/50 bg-primary/5">
                      
                    </Card>}

                  {/* Action Buttons */}
                  <div className="flex justify-end gap-3">
                    {isExecutiveBoard && (
                      <Button 
                        variant="outline" 
                        className="gap-2 rounded-full px-6"
                        onClick={() => navigate('/admin/calendar')}
                      >
                        <Plus className="h-4 w-4" />
                        Add Event
                      </Button>
                    )}
                    <Button 
                      variant="default" 
                      className="gap-2 rounded-full px-6"
                      onClick={() => navigate('/booking')}
                    >
                      <Calendar className="h-4 w-4" />
                      Book Appointment
                    </Button>
                  </div>

                  {/* Full Calendar */}
                  <CourseCalendarView courseId={course.id} />
                </div>
              )
            )}

            {activeTab === 'syllabus' && <StudentSyllabusView course={course} />}

            {activeTab === 'announcements' && <CourseAnnouncements courseId={course.id} />}

            {activeTab === 'messages' && (
              <Card className="overflow-hidden">
                <div className="h-[600px]">
                  <Messenger embedded={true} courseIdProp={course.id} courseNameProp={course.title} />
                </div>
              </Card>
            )}

            {activeTab === 'assignments' && (
              <CourseAssignments courseId={course.id} isEnrolled={isEnrolled || isAdmin} />
            )}


            {activeTab === 'journals' && (
              <ClassSessionJournals courseId={course.id} isAdmin={isAdmin} />
            )}

            {activeTab === 'modules' && (
              <CourseModules courseId={course.id} isEnrolled={isEnrolled || isAdmin} isAdmin={isAdmin} />
            )}

            {activeTab === 'planner' && course.courseCode === 'LH 100' && (
              <React.Suspense fallback={<Card><CardContent className="py-8 text-center">Loading Planner...</CardContent></Card>}>
                <LiturgicalPlanner isAdmin={isAdmin} />
              </React.Suspense>
            )}

            {activeTab === 'tests' && <CourseTestsSection courseId={course.id} legacyCourseId={course.courseCode.toLowerCase().replace(' ', '')} />}

            {activeTab === 'polls' && <React.Suspense fallback={<Card><CardContent className="py-8 text-center">Loading polls...</CardContent></Card>}>
                <AcademyPollSystem courseId={course.id} />
              </React.Suspense>}

            {/* Discussions Tab */}
            {activeTab === 'discussions' && (
              <DiscussionsSection courseId={course.id} />
            )}

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
            {activeTab === 'resources' && (
              course.courseCode === 'MUS 240' ? (
                <React.Suspense fallback={<Card><CardContent className="py-8 text-center">Loading resources...</CardContent></Card>}>
                  <Mus240ResourcesTab isAdmin={isAdmin} />
                </React.Suspense>
              ) : course.courseCode === 'MUS 210' ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Library className="h-5 w-5 text-primary" />
                      Course Resources
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        Course Textbook
                      </h3>
                      <div className="rounded-lg border overflow-hidden">
                        <iframe src="https://conducting.gleeworld.org" style={{ width: '100%', height: '600px' }} allow="fullscreen" title="Course Textbook" className="bg-background" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Library className="h-5 w-5 text-primary" />
                      Course Resources
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">No resources uploaded yet.</p>
                  </CardContent>
                </Card>
              )
            )}

            {/* Archives Tab */}
            {activeTab === 'archives' && (
              <React.Suspense fallback={<Card><CardContent className="py-8 text-center">Loading archives...</CardContent></Card>}>
                <JournalArchives courseId={course.id} isAdmin={isAdmin} />
              </React.Suspense>
            )}

            

            {activeTab === 'grades' && (isAdmin ? <React.Suspense fallback={<Card><CardContent className="py-8 text-center">Loading grades...</CardContent></Card>}>
                  <GradesAdmin />
                </React.Suspense> : <CourseGradebook courseId={course.id} isEnrolled={isEnrolled} />)}

            {activeTab === 'attendance' && <CourseAttendance courseId={course.id} isEnrolled={isEnrolled} isAdmin={isAdmin} />}

            {/* Secretary Attendance Manager Tab */}
            {activeTab === 'secretary' && (
              <React.Suspense fallback={<Card><CardContent className="py-8 text-center">Loading...</CardContent></Card>}>
                <SecretaryAttendanceManager courseId={course.id} courseName={course.title} />
              </React.Suspense>
            )}

            {activeTab === 'rubrics' && <Card>
                <CardHeader>
                  <CardTitle>Grading Rubrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Rubrics for assignments will be displayed here.</p>
                </CardContent>
              </Card>}

            {activeTab === 'calendar' && (
              (course.courseCode === 'MUS 070' || course.courseCode === 'MUS 210' || course.courseCode === 'MUS 240' || course.courseCode === 'LH 100')
                ? <CalendarWithAttendance courseId={course.id} isEnrolled={isEnrolled} isAdmin={isAdmin} />
                : <CourseCalendarView courseId={course.id} />
            )}

            {/* Music Library Tab - Only for MUS 070 */}
            {activeTab === 'music-library' && course.courseCode === 'MUS 070' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Music className="h-5 w-5 text-primary" />
                    Music Library
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Access sheet music, practice tracks, and recordings for the Glee Club repertoire.
                  </p>
                  <Button onClick={() => navigate('/music-library')} className="gap-2">
                    <Music className="h-4 w-4" />
                    Open Music Library
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Video Library Tab - Course-specific videos managed by instructor */}
            {activeTab === 'video-library' && (
              <CourseVideoLibrary courseId={course.id} isInstructor={false} />
            )}

            {activeTab === 'handbook' && course.courseCode === 'MUS 070' && <CourseHandbook courseCode={course.courseCode} />}

            {/* Elections Tab - Only for MUS 070 */}
            {activeTab === 'elections' && course.courseCode === 'MUS 070' && <ElectionsModule courseId={course.id} />}

          </div>
        </div>
      </div>
    </UniversalLayout>
  </div>;
};