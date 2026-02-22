import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { BookOpen, Calendar, Mail, ClipboardList, FileCheck, BarChart, MessageSquare, Video, Headphones, FileText, BookMarked, UserCheck, Ruler, Settings, Music, ArrowLeft, Users, GraduationCap, Home, Bell, Trophy, Clock, PenLine, Brain, Library, MessagesSquare, Book, Plus, Vote, Layers, Archive, Images, User } from 'lucide-react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AcademyCourse } from '@/config/academyCourses';
import { getCourseTemplateConfig, CourseNavItem } from '@/config/courseTemplateConfig';
import { CourseAssignments } from './CourseAssignments';
import { CourseGradebook } from './CourseGradebook';
import { CourseAttendanceGrid } from '@/components/course/CourseAttendanceGrid';
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
import { TeachingFirstHome } from './TeachingFirstHome';
import { CoursePracticeBar } from './CoursePracticeBar';
import { ElectionsModule } from './elections/ElectionsModule';
import { CourseModules } from './CourseModules';
import { ClassSessionJournals } from './journals/ClassSessionJournals';
import { JournalArchives } from './journals/JournalArchives';
import { Mus240ResourcesTab } from './Mus240ResourcesTab';
import { DiscussionsSection } from '@/components/course/DiscussionsSection';
import { CoursePlaylistPlayer } from '@/components/course/CoursePlaylistPlayer';
import { ClassNotesManager } from '@/components/course/ClassNotesManager';
import { CourseHeroPlayer } from '@/components/course/CourseHeroPlayer';
import { CourseGradeStat } from '@/components/course/CourseGradeStat';
import { useCourseTeachingAssistants } from '@/hooks/useCourseTeachingAssistants';
import { useUserRole } from '@/hooks/useUserRole';
import { MobileCourseLanding } from '@/components/course/MobileCourseLanding';
import { useIsMobile } from '@/hooks/use-mobile';
import { useCourseVisibilitySettings, getHiddenTabs } from '@/hooks/useCourseVisibilitySettings';

const SecretaryAttendanceManager = React.lazy(() => import('./SecretaryAttendanceManager'));
const AcademyPollSystem = React.lazy(() => import('@/components/academy/polls/AcademyPollSystem').then(m => ({
  default: m.AcademyPollSystem
})));
const CourseGradesAdmin = React.lazy(() => import('@/components/course/CourseGradesAdmin').then(m => ({
  default: m.CourseGradesAdmin
})));
const EmbeddedStudentGradeView = React.lazy(() => import('@/components/grading/student/EmbeddedStudentGradeView').then(m => ({
  default: m.EmbeddedStudentGradeView
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
const ConductingTextbook = React.lazy(() => import('./mus210/ConductingTextbook').then(m => ({
  default: m.ConductingTextbook
})));
const ReadMusicTrainer = React.lazy(() => import('./mus210/ReadMusicTrainer').then(m => ({
  default: m.ReadMusicTrainer
})));
const StudentTourView = React.lazy(() => import('@/components/mus070/student/StudentTourView').then(m => ({
  default: m.StudentTourView
})));

interface UnifiedCoursePageProps {
  course: AcademyCourse;
}
export const UnifiedCoursePage: React.FC<UnifiedCoursePageProps> = ({
  course
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
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
    const tabParam = searchParams.get('tab');
    if (tabParam) return tabParam;
    if (location.pathname.includes('/handbook')) return 'handbook';
    return 'home';
  };
  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [enrollmentLoading, setEnrollmentLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isExecutiveBoard, setIsExecutiveBoard] = useState(false);
  
  // Mobile detection for new mobile-first landing
  const isMobile = useIsMobile();

  // Fetch visibility settings from database
  const { settings: visibilitySettings, isLoading: visibilityLoading } = useCourseVisibilitySettings(course.id);
  const hiddenTabs = useMemo(() => getHiddenTabs(visibilitySettings), [visibilitySettings]);

  // Get course template configuration (Course Template v1) and filter by visibility
  const templateConfig = useMemo(() => {
    const config = getCourseTemplateConfig(course.id);
    
    // If user is admin, show all tabs regardless of visibility settings
    // For students, filter out hidden tabs
    return config;
  }, [course.id]);

  // Map tab names to feature flags for filtering
  const TAB_FEATURE_MAP: Record<string, string> = {
    journals: 'hasJournals',
    polls: 'hasPolls',
    tests: 'hasTests',
    discussions: 'hasDiscussions',
    readmusic: 'hasSightReading',
  };

  // Filter navigation items based on feature flags AND visibility settings
  const filteredPrimaryNav = useMemo(() => {
    // First filter by feature flags (applies to everyone including admins)
    const featureFiltered = templateConfig.primaryNav.filter(item => {
      const featureKey = TAB_FEATURE_MAP[item.tab];
      if (featureKey && templateConfig.features[featureKey] === false) return false;
      return true;
    });
    if (isAdmin) return featureFiltered; // Admins see all feature-enabled tabs
    return featureFiltered.filter(item => !hiddenTabs.includes(item.tab));
  }, [templateConfig.primaryNav, templateConfig.features, hiddenTabs, isAdmin]);

  // Sync tab with URL changes
  useEffect(() => {
    if (location.pathname.includes('/handbook')) {
      setActiveTab('handbook');
    }
  }, [location.pathname]);

  // Sync tab with query param (?tab=discussions)
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

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
  // Guard: block non-enrolled students from accessing the course
  if (!enrollmentLoading && !isEnrolled && !isAdmin && !isExecutiveBoard && user) {
    return (
      <UniversalLayout showHeader={true} showFooter={true} containerized={false}>
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
          <BookOpen className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Access Restricted</h2>
          <p className="text-muted-foreground mb-6 max-w-md">
            You are not enrolled in <strong>{course.title}</strong>. Please contact your instructor or administrator for access.
          </p>
          <Button onClick={() => navigate('/course-selection')} variant="outline">
            Back to My Courses
          </Button>
        </div>
      </UniversalLayout>
    );
  }

  // Mobile-first landing page (new simplified layout)
  if (isMobile && activeTab === 'home') {
    return (
      <UniversalLayout showHeader={true} showFooter={false} containerized={false}>
        <MobileCourseLanding course={course} />
      </UniversalLayout>
    );
  }

  return <div className="academy-neutral">
      <UniversalLayout showHeader={true} showFooter={true} containerized={false}>
        <div className="flex bg-background">
        {/* Left Sidebar - Navigation - Visible on tablet (md) and up */}
        <div className="w-[216px] md:w-[240px] lg:w-[264px] min-w-[216px] md:min-w-[240px] lg:min-w-[264px] bg-card border-r border-border flex-shrink-0 hidden md:flex md:flex-col h-[calc(100vh-var(--gw-header-h,4rem))]">
          {/* Course Grade Stat - Above Navigation */}
          <CourseGradeStat courseId={course.id} onNavigateToGrades={() => setActiveTab('grades')} />
          
          {/* Primary Navigation - Course Template v1 (filtered by visibility) */}
          <nav className="flex-1 overflow-y-auto px-3 space-y-1 flex flex-col items-center pt-4 pb-0">
            <div className="w-full space-y-1">
              {filteredPrimaryNav.map(item => <button key={item.tab} onClick={() => setActiveTab(item.tab)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-md text-base lg:text-lg transition-colors ${activeTab === item.tab ? 'bg-primary text-primary-foreground font-medium' : 'text-foreground hover:bg-muted'}`}>
                  <item.icon className="h-5 w-5 lg:h-6 lg:w-6 flex-shrink-0" />
                  <span>{item.label}</span>
                </button>)}
            </div>
            
            {/* Course Core Section - Course Template v1 */}
            <div className="pt-6 w-full">
              <h3 className="font-semibold text-foreground text-sm lg:text-base px-4 mb-3">Course Core</h3>
              {templateConfig.courseCore.map(item => <button key={item.tab} onClick={() => setActiveTab(item.tab)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-md text-base lg:text-lg transition-colors ${activeTab === item.tab ? 'bg-primary text-primary-foreground font-medium' : 'text-foreground hover:bg-muted'}`}>
                  <item.icon className="h-5 w-5 lg:h-6 lg:w-6 flex-shrink-0" />
                  <span>{item.label}</span>
                </button>)}
            </div>
            
            {/* Extension Modules - Course-specific features */}
            {templateConfig.extensions && templateConfig.extensions.length > 0 && <div className="pt-6 w-full">
                <h3 className="font-semibold text-foreground text-sm lg:text-base px-4 mb-3">Extensions</h3>
                {templateConfig.extensions.map(item => <button key={item.tab} onClick={() => setActiveTab(item.tab)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-md text-base lg:text-lg transition-colors ${activeTab === item.tab ? 'bg-primary text-primary-foreground font-medium' : 'text-foreground hover:bg-muted'}`}>
                    <item.icon className="h-5 w-5 lg:h-6 lg:w-6 flex-shrink-0" />
                    <span>{item.label}</span>
                  </button>)}
              </div>}
          </nav>
          
          {/* Admin Controls at bottom */}
          <div className="border-t border-border px-3 py-4 space-y-2">
            {/* Secretary Attendance Button */}
            {isSecretary() && <Button onClick={() => setActiveTab('secretary')} variant={activeTab === 'secretary' ? 'default' : 'outline'} className="w-full text-sm h-10" size="sm">
                <UserCheck className="h-4 w-4 mr-2" />
                Secretary
              </Button>}
            
            {/* Instructor Control Center Button */}
            {isAdmin && <Button onClick={() => navigate(`/${course.courseCode.toLowerCase().replace(' ', '-')}/instructor/console`)} variant="default" className="w-full text-sm h-10" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Instructor
              </Button>}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto">
          {/* Course Practice Bar - Integrated Listening & Practice Engine */}
          <CoursePracticeBar
            courseId={course.id}
            courseCode={course.courseCode}
            courseTitle={course.title}
            instructorName={course.instructor.name}
          />

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
                        <TabsTrigger value="modules" className="text-xs px-3 py-2"><FileText className="h-3 w-3 mr-1" />Modules</TabsTrigger>
                        <TabsTrigger value="planner" className="text-xs px-3 py-2"><BookMarked className="h-3 w-3 mr-1" />Planner</TabsTrigger>
                        <TabsTrigger value="photo-gallery" className="text-xs px-3 py-2"><Images className="h-3 w-3 mr-1" />Photos</TabsTrigger>
                        <TabsTrigger value="calendar" className="text-xs px-3 py-2"><Calendar className="h-3 w-3 mr-1" />Calendar</TabsTrigger>
                        <TabsTrigger value="video-library" className="text-xs px-3 py-2"><Video className="h-3 w-3 mr-1" />Videos</TabsTrigger>
                        <TabsTrigger value="playlist" className="text-xs px-3 py-2"><Headphones className="h-3 w-3 mr-1" />Playlist</TabsTrigger>
                        <TabsTrigger value="announcements" className="text-xs px-3 py-2"><Bell className="h-3 w-3 mr-1" />Announce</TabsTrigger>
                        <TabsTrigger value="messages" className="text-xs px-3 py-2"><MessagesSquare className="h-3 w-3 mr-1" />Messages</TabsTrigger>
                        {(isAdmin || !hiddenTabs.includes('assignments')) && (
                          <TabsTrigger value="assignments" className="text-xs px-3 py-2"><ClipboardList className="h-3 w-3 mr-1" />Assign</TabsTrigger>
                        )}
                        {(isAdmin || !hiddenTabs.includes('journals')) && (
                          <TabsTrigger value="journals" className="text-xs px-3 py-2"><PenLine className="h-3 w-3 mr-1" />Journals</TabsTrigger>
                        )}
                        {(isAdmin || !hiddenTabs.includes('tests')) && (
                          <TabsTrigger value="tests" className="text-xs px-3 py-2"><FileCheck className="h-3 w-3 mr-1" />Tests</TabsTrigger>
                        )}
                        {(isAdmin || !hiddenTabs.includes('polls')) && (
                          <TabsTrigger value="polls" className="text-xs px-3 py-2"><BarChart className="h-3 w-3 mr-1" />Polls</TabsTrigger>
                        )}
                        {(isAdmin || !hiddenTabs.includes('discussions')) && (
                          <TabsTrigger value="discussions" className="text-xs px-3 py-2"><MessageSquare className="h-3 w-3 mr-1" />Discuss</TabsTrigger>
                        )}
                        <TabsTrigger value="resources" className="text-xs px-3 py-2"><Library className="h-3 w-3 mr-1" />Resources</TabsTrigger>
                        {(isAdmin || !hiddenTabs.includes('grades')) && (
                          <TabsTrigger value="grades" className="text-xs px-3 py-2"><Trophy className="h-3 w-3 mr-1" />Grades</TabsTrigger>
                        )}
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
                        <TabsTrigger value="modules" className="text-xs px-3 py-2">Modules</TabsTrigger>
                        <TabsTrigger value="class-notes" className="text-xs px-3 py-2">Notes</TabsTrigger>
                        <TabsTrigger value="messages" className="text-xs px-3 py-2">Messages</TabsTrigger>
                        {(isAdmin || !hiddenTabs.includes('assignments')) && (
                          <TabsTrigger value="assignments" className="text-xs px-3 py-2">Assignments</TabsTrigger>
                        )}
                        {(isAdmin || !hiddenTabs.includes('discussions')) && (
                          <TabsTrigger value="discussions" className="text-xs px-3 py-2">Discussions</TabsTrigger>
                        )}
                        {(isAdmin || !hiddenTabs.includes('tests')) && (
                          <TabsTrigger value="tests" className="text-xs px-3 py-2">Tests</TabsTrigger>
                        )}
                        <TabsTrigger value="lounge" className="text-xs px-3 py-2">Lounge</TabsTrigger>
                        {(isAdmin || !hiddenTabs.includes('grades')) && (
                          <TabsTrigger value="grades" className="text-xs px-3 py-2">Grades</TabsTrigger>
                        )}
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
            {activeTab === 'home' && (course.courseCode === 'MUS 240' ? <TeachingFirstHome courseId={course.id} isAdmin={isAdmin} /> : course.courseCode === 'MUS 070' || course.courseCode === 'MUS 210' || course.courseCode === 'LH 100' ? <div className="space-y-6">{course.courseCode === 'LH 100' && <React.Suspense fallback={<Card><CardContent className="py-8 text-center">Loading Planner...</CardContent></Card>}><LiturgicalPlanner isAdmin={isAdmin} /></React.Suspense>}<StudentDossierHome courseId={course.id} isAdmin={isAdmin} /></div> : <div className="space-y-4">
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

            {activeTab === 'assignments' && <CourseAssignments courseId={course.id} isEnrolled={isEnrolled || isAdmin} isAdmin={isAdmin} />}


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
            {activeTab === 'discussions' && <DiscussionsSection courseId={course.id} discussionId={searchParams.get('discussionId')} />}

            {/* Class Notes Tab - Students have full CRUD on their own notes */}
            {activeTab === 'class-notes' && <ClassNotesManager courseId={course.id} isInstructor={isAdmin} />}



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
                  <CourseGradesAdmin 
                    courseId={course.id} 
                    courseCode={course.courseCode}
                    courseTitle={course.title}
                  />
                </React.Suspense> : (course.courseCode === 'MUS 240' || course.courseCode === 'MUS240') ? <React.Suspense fallback={<Card><CardContent className="py-8 text-center">Loading grades...</CardContent></Card>}>
                  <EmbeddedStudentGradeView courseId={course.id} />
                </React.Suspense> : <CourseGradebook courseId={course.id} isEnrolled={isEnrolled} />)}

            {activeTab === 'attendance' && (
              <CourseAttendanceGrid 
                courseId={course.id} 
                courseCode={course.courseCode}
                isInstructor={isAdmin} 
              />
            )}

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

            {/* Tour Tab - Only for MUS 070 */}
            {activeTab === 'tour' && course.courseCode === 'MUS 070' && (
              <React.Suspense fallback={<Card><CardContent className="py-8 text-center">Loading tour info...</CardContent></Card>}>
                <StudentTourView />
              </React.Suspense>
            )}

            {/* Elections Tab - Only for MUS 070 */}
            {activeTab === 'elections' && course.courseCode === 'MUS 070' && <ElectionsModule courseId={course.id} />}

            {/* Textbook Tab - MUS 210 Conducting Reference */}
            {activeTab === 'textbook' && course.courseCode === 'MUS 210' && (
              <React.Suspense fallback={<Card><CardContent className="py-8 text-center">Loading textbook...</CardContent></Card>}>
                <ConductingTextbook />
              </React.Suspense>
            )}

            {/* ReadMusic Tab - MUS 210 Sight Reading Trainer */}
            {activeTab === 'readmusic' && course.courseCode === 'MUS 210' && (
              <React.Suspense fallback={<Card><CardContent className="py-8 text-center">Loading ReadMusic...</CardContent></Card>}>
                <ReadMusicTrainer />
              </React.Suspense>
            )}

            {/* Playlist Tab - Course curated playlists */}
            {activeTab === 'playlist' && <CoursePlaylistPlayer courseId={course.id} />}

          </div>
        </div>
      </div>
    </UniversalLayout>
  </div>;
};