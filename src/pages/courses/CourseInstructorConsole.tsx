import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, GraduationCap, Menu, Home } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import { useCourseTA } from '@/hooks/useCourseTA';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { ACADEMY_COURSES } from '@/config/academyCourses';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { supabase } from '@/integrations/supabase/client';

// Universal instructor console infrastructure
import { InstructorCourseSwitcher } from '@/components/course/CourseSwitcher';
import { getFilteredNavCategories, InstructorNavCategory } from '@/config/instructorConsoleConfig';

// Import shared components that can work with any course
import { CourseAssignmentManager } from '@/components/course/CourseAssignmentManager';
import { CourseGradesAdmin } from '@/components/course/CourseGradesAdmin';
import { AIAssistant } from '@/components/mus240/instructor/AIAssistant';
import { CourseEnrollmentManager } from '@/components/academy/CourseEnrollmentManager';
import { StudentAnalyticsDashboard } from '@/components/mus240/admin/StudentAnalyticsDashboard';
import ResourcesAdmin from '@/pages/mus240/admin/ResourcesAdmin';
import { RubricManager } from '@/components/mus240/rubrics/RubricManager';
import { CourseAnnouncementsManager } from '@/components/course/CourseAnnouncementsManager';
import { SyllabusTemplateEditor } from '@/components/academy/syllabus/SyllabusTemplateEditor';
import { ModulesSection } from '@/components/course/ModulesSection';
import { CalendarSection } from '@/components/course/CalendarSection';
import { ClassNotesManager } from '@/components/course/ClassNotesManager';
import { CourseVideoLibrary } from '@/components/course/CourseVideoLibrary';
import { CourseClassCalendar } from '@/components/course/CourseClassCalendar';
import { TestBuilder } from '@/components/test-builder/TestBuilder';
import { CoursePollManager } from '@/components/course/CoursePollManager';
import { SemesterManager } from '@/components/admin/SemesterManager';
import { SightReadingAssignmentManager } from '@/components/sight-singing/SightReadingAssignmentManager';
import { AttendanceSecurityControls } from '@/components/attendance/AttendanceSecurityControls';
import { CoursePlaylistManager } from '@/components/modules/CoursePlaylistManager';
import { InstructorAttendanceHub } from '@/components/course/InstructorAttendanceHub';
import { CourseVisibilitySettings } from '@/components/course/CourseVisibilitySettings';
import { DiscussionsSection } from '@/components/course/DiscussionsSection';
import { DiscussionGradingPanel } from '@/components/instructor/DiscussionGradingPanel';

// Wrapper for instructor discussions with grading sub-tab
const InstructorDiscussionsWrapper: React.FC<{ courseId: string }> = ({ courseId }) => {
  return (
    <Tabs defaultValue="forum" className="space-y-4">
      <TabsList>
        <TabsTrigger value="forum">Discussion Forum</TabsTrigger>
        <TabsTrigger value="grading">Grade Participation</TabsTrigger>
      </TabsList>
      <TabsContent value="forum">
        <DiscussionsSection courseId={courseId} />
      </TabsContent>
      <TabsContent value="grading">
        <DiscussionGradingPanel courseId={courseId} />
      </TabsContent>
    </Tabs>
  );
};

// Map DB term codes (e.g., 202601) to human semester labels used in enrollments (e.g., "Spring 2026").
const termToSemesterLabel = (term: string | null | undefined): string => {
  if (!term) return 'Spring 2026';

  // Already a human label
  if (/spring|summer|fall|winter/i.test(term)) return term;

  // Common numeric format: YYYYTT where TT = 01(Spring), 05(Summer), 08(Fall), 12(Winter)
  if (/^\d{6}$/.test(term)) {
    const year = term.slice(0, 4);
    const t = term.slice(4, 6);
    const seasonMap: Record<string, string> = {
      '01': 'Spring',
      '05': 'Summer',
      '08': 'Fall',
      '12': 'Winter',
    };
    const season = seasonMap[t];
    if (season) return `${season} ${year}`;
  }

  // Fallback: don't filter by semester if we can't map it reliably
  return 'Spring 2026';
};

// Convert URL slug to course code (e.g., mus-240 -> MUS 240)
const slugToCourseCode = (slug: string): string => {
  const parts = slug.split('-');
  const prefix = parts[0].toUpperCase();
  const number = parts.slice(1).join('-');
  return `${prefix} ${number}`;
};
export const CourseInstructorConsole = () => {
  const {
    courseCode: courseSlug
  } = useParams<{
    courseCode: string;
  }>();
  const {
    isAdmin,
    loading
  } = useUserRole();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('assignments');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dbCourse, setDbCourse] = useState<{
    id: string;
    term: string | null;
  } | null>(null);
  const [dbLoading, setDbLoading] = useState(true);
  const semesterLabel = termToSemesterLabel(dbCourse?.term);

  // Find the course from config
  const courseCode = courseSlug ? slugToCourseCode(courseSlug) : '';
  const course = ACADEMY_COURSES.find(c => c.courseCode.toLowerCase().replace(' ', '-') === courseSlug?.toLowerCase() || c.courseCode === courseCode);

  // Fetch the actual course from database to get the UUID
  useEffect(() => {
    const fetchCourse = async () => {
      if (!courseCode) {
        setDbLoading(false);
        return;
      }
      try {
        const {
          data,
          error
        } = await supabase.from('gw_courses').select('id, term').eq('course_code', courseCode).maybeSingle();
        if (!error && data) {
          setDbCourse(data);
        }
      } catch (err) {
        console.error('Error fetching course:', err);
      } finally {
        setDbLoading(false);
      }
    };
    fetchCourse();
  }, [courseCode]);

  // Check if user is TA for this course
  const {
    isTA,
    loading: taLoading
  } = useCourseTA(course?.courseCode.replace(' ', '') || '');
  if (loading || taLoading || dbLoading) {
    return <LoadingSpinner size="lg" text="Loading..." />;
  }
  if (!course) {
    return <Navigate to="/glee-academy" replace />;
  }

  // Allow both admins and TAs to access
  if (!isAdmin() && !isTA) {
    return <Navigate to={`/academy/${courseSlug}`} replace />;
  }
  // Use universal instructor nav configuration (filtered by course features)
  const navCategories = getFilteredNavCategories(course.id);
  
  const SidebarNav = ({
    isMobile = false
  }) => (
    <nav className="space-y-7">
      {/* Student View Button */}
      <Button
        variant="outline"
        className="w-full flex items-center justify-center gap-2 border-primary/30 text-primary hover:bg-primary/5 hover:text-primary text-[15px] font-medium py-2.5"
        onClick={() => {
          navigate(`/academy/${courseSlug}`);
          if (isMobile) setSidebarOpen(false);
        }}
      >
        <Eye className="h-[22px] w-[22px]" />
        <span>View as Student</span>
      </Button>
      
      {navCategories.map(category => (
        <div key={category.label}>
          <h3 className="text-xs font-semibold uppercase tracking-widest mb-3 px-3" style={{ color: '#475569', fontSize: '11px' }}>
            {category.label}
          </h3>
          <div className="space-y-0.5">
            {category.items.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.value;
              return (
                <button 
                  key={item.value} 
                  onClick={() => {
                    setActiveTab(item.value);
                    if (isMobile) setSidebarOpen(false);
                  }} 
                  className={cn(
                    "w-full flex items-center gap-2.5 px-2.5 rounded-md transition-all",
                    isActive 
                      ? "border" 
                      : "hover:bg-muted/50"
                  )}
                  style={{ 
                    color: isActive ? '#003666' : '#334155',
                    backgroundColor: isActive ? '#e0f2fe' : undefined,
                    borderColor: isActive ? '#bae6fd' : undefined,
                    fontSize: '15px',
                    fontWeight: isActive ? 600 : 500,
                    height: '36px',
                  }}
                >
                  <Icon 
                    className="flex-shrink-0"
                    style={{ 
                      width: '16px', 
                      height: '16px',
                      color: isActive ? '#003666' : '#475569',
                    }} 
                  />
                  <span>{item.label}</span>
                  {isActive && <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  return <UniversalLayout containerized={false}>
      <div className="min-h-screen academy-neutral" style={{ backgroundColor: '#F7F9FC' }}>
        {/* Top Bar */}
        <div className="border-b bg-white sticky top-0 z-30">
          <div className="max-w-[1800px] mx-auto px-3 sm:px-5 md:px-8 py-2.5 sm:py-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                {/* Hamburger only on mobile */}
                <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(true)} className="lg:hidden h-9 w-9 p-0 hover:bg-muted/60 flex-shrink-0" style={{ color: '#0F172A' }}>
                  <Menu className="h-5 w-5" />
                </Button>
                <Badge className="bg-primary text-white border-0 font-semibold text-[11px] sm:text-xs tracking-wide flex-shrink-0 px-2 py-0.5">
                  <GraduationCap className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" />
                  <span className="hidden sm:inline">Instructor Console</span>
                  <span className="sm:hidden">Instructor</span>
                </Badge>
                <span className="text-xs sm:text-sm font-medium truncate" style={{ color: '#334155' }}>
                  {course.courseCode}{' '}
                  <span className="hidden sm:inline">— {course.title}</span>
                </span>
              </div>
              
              <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                <Button variant="ghost" size="sm" onClick={() => navigate(`/academy/${courseSlug}`)} className="h-8 w-8 p-0 sm:w-auto sm:px-2 sm:flex items-center gap-1.5 text-xs hover:text-primary" style={{ color: '#334155' }}>
                  <Eye className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Student View</span>
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigate(`/academy/${courseSlug}`)} className="hidden sm:flex items-center gap-1.5 h-8 text-xs hover:text-primary" style={{ color: '#334155' }}>
                  <Home className="h-3.5 w-3.5" />
                  <span>Course Page</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Flyout Sidebar */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="w-72 sm:w-80 p-0 bg-white lg:hidden">
            <div className="p-5 pt-6">
              <div className="mb-6 pb-5 border-b border-border/50">
                <InstructorCourseSwitcher 
                  currentCourse={course} 
                  onClose={() => setSidebarOpen(false)}
                />
              </div>
              <SidebarNav isMobile />
            </div>
          </SheetContent>
        </Sheet>

        {/* Desktop: sidebar + content side by side */}
        <div className="max-w-[1800px] mx-auto flex">
          {/* Persistent left sidebar — desktop only */}
          <aside className="hidden lg:block w-56 xl:w-64 flex-shrink-0 border-r bg-white sticky top-[53px] h-[calc(100vh-53px)] overflow-y-auto">
            <div className="p-4 pt-5">
              <div className="mb-5 pb-4 border-b border-border/50">
                <InstructorCourseSwitcher 
                  currentCourse={course} 
                  onClose={() => {}}
                />
              </div>
              <SidebarNav />
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0 p-3 sm:p-5 lg:p-8 xl:p-10 pb-24">
            {activeTab === 'syllabus' && dbCourse && <SyllabusTemplateEditor courseId={dbCourse.id} courseCode={course.courseCode} courseTitle={course.title} instructorName={course.instructor?.name} instructorEmail={course.instructor?.email} />}
            {activeTab === 'modules' && dbCourse && <ModulesSection courseId={dbCourse.id} />}
            {activeTab === 'class-notes' && dbCourse && <ClassNotesManager courseId={dbCourse.id} isInstructor={true} />}
            {activeTab === 'calendar' && dbCourse?.id && <CourseClassCalendar courseId={dbCourse.id} courseCode={course.courseCode} isInstructor={true} />}
            {activeTab === 'assignments' && dbCourse?.id && <CourseAssignmentManager courseId={dbCourse.id} courseName={course.title} />}
            {activeTab === 'sight-reading' && <SightReadingAssignmentManager />}
            {activeTab === 'tests' && dbCourse && <TestBuilder courseId={dbCourse.id} courseName={course.title} />}
            {activeTab === 'polls' && dbCourse && <CoursePollManager courseId={dbCourse.id} courseName={course.title} />}
            {activeTab === 'discussions' && dbCourse && (
              <InstructorDiscussionsWrapper courseId={dbCourse.id} />
            )}
            {activeTab === 'rubrics' && <RubricManager />}
            {activeTab === 'grades' && dbCourse && (
              <CourseGradesAdmin 
                courseId={dbCourse.id} 
                courseCode={course.courseCode}
                courseTitle={course.title}
                semester={semesterLabel}
              />
            )}
            {activeTab === 'students' && dbCourse && <CourseEnrollmentManager courseId={dbCourse.id} courseCode={course.courseCode} courseTitle={course.title} term={dbCourse.term || undefined} />}
            
            {activeTab === 'quick-attendance' && dbCourse && (
              <InstructorAttendanceHub 
                courseId={dbCourse.id} 
                courseCode={course.courseCode} 
                courseTitle={course.title}
                semester={semesterLabel}
              />
            )}
            {activeTab === 'analytics' && <StudentAnalyticsDashboard />}
            {activeTab === 'announcements' && dbCourse && <CourseAnnouncementsManager courseId={dbCourse.id} />}
            {activeTab === 'resources' && <ResourcesAdmin />}
            {activeTab === 'playlists' && dbCourse && <CoursePlaylistManager courseId={dbCourse.id} />}
            {activeTab === 'videos' && dbCourse && <CourseVideoLibrary courseId={dbCourse.id} isInstructor={true} />}
            {activeTab === 'attendance-security' && dbCourse && (
              <AttendanceSecurityControls 
                eventId={dbCourse.id} 
                eventTitle={`${course.title} Class Session`}
              />
            )}
            {activeTab === 'semesters' && <SemesterManager />}
            {activeTab === 'ai-assistant' && <AIAssistant />}
            {activeTab === 'settings' && dbCourse && (
              <div className="space-y-7">
                <CourseVisibilitySettings 
                  courseId={dbCourse.id} 
                  courseCode={course.courseCode}
                />
              </div>
            )}
          </main>
        </div>
      </div>
    </UniversalLayout>;
};
export default CourseInstructorConsole;