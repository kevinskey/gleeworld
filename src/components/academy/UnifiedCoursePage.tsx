import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { BookOpen, Calendar, Mail, ClipboardList, FileCheck, BarChart, MessageSquare, Video, Headphones, FileText, BookMarked, UserCheck, Ruler, Settings, Music, ArrowLeft, Users, GraduationCap, Home, Bell, Trophy, Clock, PenLine, Brain, Library, MessagesSquare, Book, Plus, Vote, Layers, Archive, Images, User } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AcademyCourse } from '@/config/academyCourses';
import { getCourseTemplateConfig, CourseNavItem } from '@/config/courseTemplateConfig';
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
import { CoursePlaylistPlayer } from '@/components/course/CoursePlaylistPlayer';
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
const PhotoGallery = React.lazy(() => import('@/components/gallery/PhotoGallery').then(m => ({
  default: m.PhotoGallery
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
  const {
    data: teachingAssistants = []
  } = useCourseTeachingAssistants(course.courseCode);
  const {
    isSecretary
  } = useUserRole();

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

  // Get course template configuration (Course Template v1)
  const templateConfig = useMemo(() => getCourseTemplateConfig(course.id), [course.id]);

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

  // Allow all users to access course content directly (no onboarding redirect)

  const checkEnrollmentAndRole = async () => {
    if (!user) {
      // Not logged in - will be redirected to onboarding
      setEnrollmentLoading(false);
      return;
    }
    try {
      // Check admin status and role
      const {
        data: profile
      } = await supabase.from('gw_profiles').select('id, is_admin, is_super_admin, role').eq('user_id', user.id).maybeSingle();

      // Treat course instructors/TAs as "admin" for the purpose of bypassing onboarding redirects
      // (this does NOT grant global admin privileges; it only affects this page's client-side navigation)
      let hasCourseStaffAccess = false;
      if (course.courseCode === 'MUS 240' || course.courseCode === 'MUS240') {
        const normalizedCode = course.courseCode.replace(' ', '');
        const {
          data: taRow
        } = await supabase.from('course_teaching_assistants').select('id').eq('course_code', normalizedCode).eq('user_id', user.id).eq('is_active', true).maybeSingle();
        hasCourseStaffAccess = !!taRow || profile?.role === 'instructor';
      }
      const adminLikeAccess = !!(profile?.is_admin || profile?.is_super_admin || hasCourseStaffAccess);
      setIsAdmin(adminLikeAccess);
      setIsExecutiveBoard(profile?.role === 'executive-board' || profile?.is_admin || profile?.is_super_admin || false);

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
        const {
          data: mus240Enrollment
        } = await supabase.from('mus240_enrollments').select('id').eq('student_id', user.id).eq('semester', currentSemester).eq('enrollment_status', 'enrolled').maybeSingle();

        // 2) gw_course_enrollments
        const {
          data: gwCourseData
        } = await supabase.from('gw_courses').select('id').or('course_code.ilike.%MUS 240%,course_code.ilike.%MUS-240%,course_code.ilike.%MUS240%,course_code.eq.MUS 240,course_code.eq.MUS240').limit(1).maybeSingle();
        let gwEnrolled = false;
        if (gwCourseData?.id) {
          const {
            data: gwEnrollmentByUserId
          } = await supabase.from('gw_course_enrollments').select('id').eq('course_id', gwCourseData.id).eq('user_id', user.id).eq('enrollment_status', 'enrolled').maybeSingle();
          if (gwEnrollmentByUserId) {
            gwEnrolled = true;
          } else if (profile?.id) {
            const {
              data: gwEnrollmentByProfileId
            } = await supabase.from('gw_course_enrollments').select('id').eq('course_id', gwCourseData.id).eq('student_profile_id', profile.id).eq('enrollment_status', 'enrolled').maybeSingle();
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
          enrolledValue
        });
        setIsEnrolled(enrolledValue);
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
        <div className="w-[180px] md:w-[200px] lg:w-[220px] min-w-[180px] md:min-w-[200px] lg:min-w-[220px] bg-card border-r border-border flex-shrink-0 hidden md:flex md:flex-col h-[calc(100vh-var(--gw-header-h,4rem))]">
          {/* Sidebar Header with menu icon */}
          <div className="px-3 py-2 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2">
              <button className="p-1 hover:bg-muted rounded">
                <div className="space-y-1">
                  <div className="w-4 h-0.5 bg-foreground/60"></div>
                  <div className="w-4 h-0.5 bg-foreground/60"></div>
                  <div className="w-4 h-0.5 bg-foreground/60"></div>
                </div>
              </button>
            </div>
          </div>
          
          {/* Primary Navigation - Course Template v1 */}
          <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-1 flex flex-col items-center pt-[120px]">
            <div className="w-full space-y-1">
              {templateConfig.primaryNav.map(item => <button key={item.tab} onClick={() => setActiveTab(item.tab)} className={`w-full flex items-center gap-3 px-3 py-3 rounded-md text-lg transition-colors ${activeTab === item.tab ? 'bg-primary text-primary-foreground font-medium' : 'text-foreground hover:bg-muted'}`}>
                  <item.icon className="h-6 w-6 flex-shrink-0" />
                  <span>{item.label}</span>
                </button>)}
            </div>
            
            {/* Course Core Section - Course Template v1 */}
            <div className="pt-6 w-full">
              <h3 className="font-semibold text-foreground text-base px-3 mb-2">Course Core</h3>
              {templateConfig.courseCore.map(item => <button key={item.tab} onClick={() => setActiveTab(item.tab)} className={`w-full flex items-center gap-3 px-3 py-3 rounded-md text-lg transition-colors ${activeTab === item.tab ? 'bg-primary text-primary-foreground font-medium' : 'text-foreground hover:bg-muted'}`}>
                  <item.icon className="h-6 w-6 flex-shrink-0" />
                  <span>{item.label}</span>
                </button>)}
            </div>
            
            {/* Extension Modules - Course-specific features */}
            {templateConfig.extensions && templateConfig.extensions.length > 0 && <div className="pt-6 w-full">
                <h3 className="font-semibold text-foreground text-base px-3 mb-2">Extensions</h3>
                {templateConfig.extensions.map(item => <button key={item.tab} onClick={() => setActiveTab(item.tab)} className={`w-full flex items-center gap-3 px-3 py-3 rounded-md text-lg transition-colors ${activeTab === item.tab ? 'bg-primary text-primary-foreground font-medium' : 'text-foreground hover:bg-muted'}`}>
                    <item.icon className="h-6 w-6 flex-shrink-0" />
                    <span>{item.label}</span>
                  </button>)}
              </div>}
          </nav>
          
          {/* User Profile Section at bottom */}
          <div className="border-t border-border px-2 py-3 space-y-0.5">
            <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm text-foreground">
              <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center">
                <User className="h-4 w-4 text-primary" />
              </div>
              <span className="truncate text-sm">{user?.email?.split('@')[0] || 'Student'}</span>
            </div>
            
            {[{
              icon: Users,
              label: 'Access & DC',
              tab: 'access'
            }, {
              icon: Settings,
              label: 'Settings',
              tab: 'settings'
            }, {
              icon: ArrowLeft,
              label: 'Navigate',
              tab: 'navigate'
            }].map(item => <button key={item.tab} onClick={() => {
              if (item.tab === 'navigate') {
                navigate('/glee-academy');
              } else {
                setActiveTab(item.tab);
              }
            }} className="w-full flex items-center gap-3 px-2.5 py-2 rounded-md text-base transition-colors text-muted-foreground hover:bg-muted hover:text-foreground">
                <item.icon className="h-5 w-5 flex-shrink-0" />
                <span>{item.label}</span>
              </button>)}
            
            {/* Secretary Attendance Button */}
            {isSecretary() && <Button onClick={() => setActiveTab('secretary')} variant={activeTab === 'secretary' ? 'default' : 'outline'} className="w-full text-xs h-8 mt-2" size="sm">
                <UserCheck className="h-3.5 w-3.5 mr-1.5" />
                Secretary
              </Button>}
            
            {/* Instructor Control Center Button */}
            {isAdmin && <Button onClick={() => navigate(`/${course.courseCode.toLowerCase().replace(' ', '-')}/instructor/console`)} variant="default" className="w-full text-xs h-8 mt-2" size="sm">
                <Settings className="h-3.5 w-3.5 mr-1.5" />
                Instructor
              </Button>}
          </div>
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
                      const instructors = teachingAssistants.filter(ta => ta.notes?.toLowerCase().includes('instructor'));
                      const secretaries = teachingAssistants.filter(ta => ta.notes?.toLowerCase().includes('secretary'));
                      const tas = teachingAssistants.filter(ta => !ta.notes?.toLowerCase().includes('instructor') && !ta.notes?.toLowerCase().includes('secretary'));
                      return <>
                          {instructors.length > 0 && <>
                              <span className="text-white/50">|</span>
                              <span className="flex items-center gap-1">
                                <span className="font-medium text-white/90">Instructor:</span>
                                {instructors.map((inst, idx) => <span key={inst.id}>
                                    {inst.profile?.full_name}
                                    {idx < instructors.length - 1 ? ', ' : ''}
                                  </span>)}
                              </span>
                            </>}
                          {secretaries.length > 0 && <>
                              <span className="text-white/50">|</span>
                              <span className="flex items-center gap-1">
                                <span className="font-medium text-white/90">Secretary:</span>
                                {secretaries.map((sec, idx) => <span key={sec.id}>
                                    {sec.profile?.full_name}
                                    {idx < secretaries.length - 1 ? ', ' : ''}
                                  </span>)}
                              </span>
                            </>}
                          {tas.length > 0 && <>
                              <span className="text-white/50">|</span>
                              <span className="flex items-center gap-1">
                                <GraduationCap className="h-3 w-3" />
                                <span className="font-medium text-white/90">
                                  TA{tas.length > 1 ? 's' : ''}:
                                </span>
                                {tas.map((ta, idx) => <span key={ta.id}>
                                    {ta.profile?.full_name || 'TA'}
                                    {idx < tas.length - 1 ? ', ' : ''}
                                  </span>)}
                              </span>
                            </>}
                        </>;
                    })()}
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate('/glee-academy')} className="hidden md:flex text-white hover:bg-white/10 hover:text-white text-xs">
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
                <ScrollArea className="w-full whitespace-nowrap pb-2">
                  <TabsList className="inline-flex w-max gap-1 h-auto bg-muted/50 p-1">
                    {course.courseCode === 'LH 100' ? <>
                        <TabsTrigger value="home" className="text-xs px-3 py-2"><Home className="h-3 w-3 mr-1" />Home</TabsTrigger>
                        <TabsTrigger value="syllabus" className="text-xs px-3 py-2"><FileText className="h-3 w-3 mr-1" />Syllabus</TabsTrigger>
                        <TabsTrigger value="planner" className="text-xs px-3 py-2"><BookMarked className="h-3 w-3 mr-1" />Planner</TabsTrigger>
                        <TabsTrigger value="photo-gallery" className="text-xs px-3 py-2"><Images className="h-3 w-3 mr-1" />Photos</TabsTrigger>
                        <TabsTrigger value="calendar" className="text-xs px-3 py-2"><Calendar className="h-3 w-3 mr-1" />Calendar</TabsTrigger>
                        <TabsTrigger value="video-library" className="text-xs px-3 py-2"><Video className="h-3 w-3 mr-1" />Videos</TabsTrigger>
                        <TabsTrigger value="playlist" className="text-xs px-3 py-2"><Headphones className="h-3 w-3 mr-1" />Playlist</TabsTrigger>
                        <TabsTrigger value="announcements" className="text-xs px-3 py-2"><Bell className="h-3 w-3 mr-1" />Announce</TabsTrigger>
                        <TabsTrigger value="messages" className="text-xs px-3 py-2"><MessagesSquare className="h-3 w-3 mr-1" />Messages</TabsTrigger>
                        <TabsTrigger value="assignments" className="text-xs px-3 py-2"><ClipboardList className="h-3 w-3 mr-1" />Assign</TabsTrigger>
                        <TabsTrigger value="journals" className="text-xs px-3 py-2"><PenLine className="h-3 w-3 mr-1" />Journals</TabsTrigger>
                        <TabsTrigger value="tests" className="text-xs px-3 py-2"><FileCheck className="h-3 w-3 mr-1" />Tests</TabsTrigger>
                        <TabsTrigger value="polls" className="text-xs px-3 py-2"><BarChart className="h-3 w-3 mr-1" />Polls</TabsTrigger>
                        <TabsTrigger value="resources" className="text-xs px-3 py-2"><Library className="h-3 w-3 mr-1" />Resources</TabsTrigger>
                        <TabsTrigger value="grades" className="text-xs px-3 py-2"><Trophy className="h-3 w-3 mr-1" />Grades</TabsTrigger>
                        <TabsTrigger value="attendance" className="text-xs px-3 py-2"><UserCheck className="h-3 w-3 mr-1" />Attend</TabsTrigger>
                        <TabsTrigger value="archives" className="text-xs px-3 py-2"><Archive className="h-3 w-3 mr-1" />Archives</TabsTrigger>
                        {isAdmin && <TabsTrigger value="instructor" className="text-xs px-3 py-2" onClick={e => {
                        e.preventDefault();
                        navigate(`/${course.courseCode.toLowerCase().replace(' ', '-')}/instructor/console`);
                      }}>
                          <Settings className="h-3 w-3 mr-1" />Instructor
                        </TabsTrigger>}
                      </> : <>
                        <TabsTrigger value="home" className="text-xs px-3 py-2">Home</TabsTrigger>
                        <TabsTrigger value="messages" className="text-xs px-3 py-2">Messages</TabsTrigger>
                        <TabsTrigger value="assignments" className="text-xs px-3 py-2">Assignments</TabsTrigger>
                        <TabsTrigger value="tests" className="text-xs px-3 py-2">Tests</TabsTrigger>
                        <TabsTrigger value="lounge" className="text-xs px-3 py-2">Lounge</TabsTrigger>
                        <TabsTrigger value="grades" className="text-xs px-3 py-2">Grades</TabsTrigger>
                        <TabsTrigger value="syllabus" className="text-xs px-3 py-2">Syllabus</TabsTrigger>
                        <TabsTrigger value="resources" className="text-xs px-3 py-2">Resources</TabsTrigger>
                        {isAdmin && <TabsTrigger value="instructor" className="text-xs px-3 py-2" onClick={e => {
                        e.preventDefault();
                        navigate(`/${course.courseCode.toLowerCase().replace(' ', '-')}/instructor/console`);
                      }}>
                          <Settings className="h-3 w-3 mr-1" />Instructor
                        </TabsTrigger>}
                      </>}
                  </TabsList>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </Tabs>
            </div>

            {/* Content Sections */}
            {activeTab === 'home' && (course.courseCode === 'MUS 070' || course.courseCode === 'MUS 210' || course.courseCode === 'MUS 240' || course.courseCode === 'LH 100' ? <StudentDossierHome courseId={course.id} /> : <div className="space-y-4">
                  {/* Enrollment Card */}
                  {!isEnrolled && !enrollmentLoading && <Card className="border-primary/50 bg-primary/5">
                      
                    </Card>}

                  {/* Action Buttons */}
                  <div className="flex justify-end gap-3">
                    {isExecutiveBoard && <Button variant="outline" className="gap-2 rounded-full px-6" onClick={() => navigate('/admin/calendar')}>
                        <Plus className="h-4 w-4" />
                        Add Event
                      </Button>}
                    <Button variant="default" className="gap-2 rounded-full px-6" onClick={() => navigate('/booking')}>
                      <Calendar className="h-4 w-4" />
                      Book Appointment
                    </Button>
                  </div>

                  {/* Full Calendar */}
                  <CourseCalendarView courseId={course.id} />
                </div>)}

            {activeTab === 'syllabus' && <StudentSyllabusView course={course} />}

            {activeTab === 'announcements' && <CourseAnnouncements courseId={course.id} />}

            {activeTab === 'messages' && <Card className="overflow-hidden">
                <div className="h-[600px]">
                  <Messenger embedded={true} courseIdProp={course.id} courseNameProp={course.title} />
                </div>
              </Card>}

            {activeTab === 'assignments' && <CourseAssignments courseId={course.id} isEnrolled={isEnrolled || isAdmin} />}


            {activeTab === 'journals' && <ClassSessionJournals courseId={course.id} isAdmin={isAdmin} />}

            {activeTab === 'modules' && <CourseModules courseId={course.id} isEnrolled={isEnrolled || isAdmin} isAdmin={isAdmin} />}

            {activeTab === 'planner' && course.courseCode === 'LH 100' && <React.Suspense fallback={<Card><CardContent className="py-8 text-center">Loading Planner...</CardContent></Card>}>
                <LiturgicalPlanner isAdmin={isAdmin} />
              </React.Suspense>}

            {activeTab === 'photo-gallery' && course.courseCode === 'LH 100' && <React.Suspense fallback={<Card><CardContent className="py-8 text-center">Loading Photo Gallery...</CardContent></Card>}>
                <PhotoGallery />
              </React.Suspense>}

            {activeTab === 'tests' && <CourseTestsSection courseId={course.id} legacyCourseId={course.courseCode.toLowerCase().replace(' ', '')} />}

            {activeTab === 'polls' && <React.Suspense fallback={<Card><CardContent className="py-8 text-center">Loading polls...</CardContent></Card>}>
                <AcademyPollSystem courseId={course.id} />
              </React.Suspense>}

            {/* Discussions Tab */}
            {activeTab === 'discussions' && <DiscussionsSection courseId={course.id} />}

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
            {activeTab === 'resources' && (course.courseCode === 'MUS 240' ? <React.Suspense fallback={<Card><CardContent className="py-8 text-center">Loading resources...</CardContent></Card>}>
                  <Mus240ResourcesTab isAdmin={isAdmin} />
                </React.Suspense> : course.courseCode === 'MUS 210' ? <Card>
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
                        <iframe src="https://conducting.gleeworld.org" style={{
                      width: '100%',
                      height: '600px'
                    }} allow="fullscreen" title="Course Textbook" className="bg-background" />
                      </div>
                    </div>
                  </CardContent>
                </Card> : <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Library className="h-5 w-5 text-primary" />
                      Course Resources
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">No resources uploaded yet.</p>
                  </CardContent>
                </Card>)}

            {/* Archives Tab */}
            {activeTab === 'archives' && <React.Suspense fallback={<Card><CardContent className="py-8 text-center">Loading archives...</CardContent></Card>}>
                <JournalArchives courseId={course.id} isAdmin={isAdmin} />
              </React.Suspense>}

            

            {activeTab === 'grades' && (isAdmin ? <React.Suspense fallback={<Card><CardContent className="py-8 text-center">Loading grades...</CardContent></Card>}>
                  <GradesAdmin />
                </React.Suspense> : <CourseGradebook courseId={course.id} isEnrolled={isEnrolled} />)}

            {activeTab === 'attendance' && <CourseAttendance courseId={course.id} isEnrolled={isEnrolled} isAdmin={isAdmin} />}

            {/* Secretary Attendance Manager Tab */}
            {activeTab === 'secretary' && <React.Suspense fallback={<Card><CardContent className="py-8 text-center">Loading...</CardContent></Card>}>
                <SecretaryAttendanceManager courseId={course.id} courseName={course.title} />
              </React.Suspense>}

            {activeTab === 'rubrics' && <Card>
                <CardHeader>
                  <CardTitle>Grading Rubrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Rubrics for assignments will be displayed here.</p>
                </CardContent>
              </Card>}

            {activeTab === 'calendar' && (course.courseCode === 'MUS 070' || course.courseCode === 'MUS 210' || course.courseCode === 'MUS 240' || course.courseCode === 'LH 100' ? <CalendarWithAttendance courseId={course.id} isEnrolled={isEnrolled} isAdmin={isAdmin} /> : <CourseCalendarView courseId={course.id} />)}

            {/* Music Library Tab - Only for MUS 070 */}
            {activeTab === 'music-library' && course.courseCode === 'MUS 070' && <Card>
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
              </Card>}

            {/* Video Library Tab - Course-specific videos managed by instructor */}
            {activeTab === 'video-library' && <CourseVideoLibrary courseId={course.id} isInstructor={false} />}

            {activeTab === 'handbook' && course.courseCode === 'MUS 070' && <CourseHandbook courseCode={course.courseCode} />}

            {/* Elections Tab - Only for MUS 070 */}
            {activeTab === 'elections' && course.courseCode === 'MUS 070' && <ElectionsModule courseId={course.id} />}

            {/* Playlist Tab - Course curated playlists */}
            {activeTab === 'playlist' && <CoursePlaylistPlayer courseId={course.id} />}

          </div>
        </div>
      </div>
    </UniversalLayout>
  </div>;
};