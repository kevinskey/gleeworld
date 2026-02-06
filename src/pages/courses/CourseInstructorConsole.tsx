import React, { useState, useEffect } from 'react';
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
    <nav className="space-y-4">
      {/* Student View Button - Prominent at top */}
      <Button
        variant="outline"
        className="w-full flex items-center justify-center gap-2 bg-accent/50 hover:bg-accent border-primary/20"
        onClick={() => {
          navigate(`/academy/${courseSlug}`);
          if (isMobile) setSidebarOpen(false);
        }}
      >
        <Eye className="h-4 w-4" />
        <span>View as Student</span>
      </Button>
      
      {navCategories.map(category => (
        <div key={category.label}>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-3">
            {category.label}
          </h3>
          <div className="space-y-1">
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
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                    isActive 
                      ? "bg-primary text-primary-foreground shadow-md ring-2 ring-primary/20" 
                      : "text-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Icon className={cn("h-4 w-4 flex-shrink-0", isActive ? "text-primary-foreground" : "text-muted-foreground")} />
                  <span>{item.label}</span>
                  {isActive && <div className="ml-auto h-2 w-2 rounded-full bg-primary-foreground/80" />}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
  return <UniversalLayout containerized={false}>
      <div className="min-h-screen bg-background">
        {/* Stats Bar */}
        <div className="border-b bg-card">
          <div className="max-w-[1800px] mx-auto px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 sm:gap-3 md:gap-4">
              <div className="flex items-center gap-2 sm:gap-4 md:gap-6">
                <Badge variant="secondary" className="text-xs sm:text-sm">
                  <GraduationCap className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  Instructor Console
                </Badge>
              </div>
              
              <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 w-full md:w-auto justify-between md:justify-end">
                <Button variant="outline" size="sm" onClick={() => setSidebarOpen(true)} className="lg:hidden flex items-center gap-1 sm:gap-2 h-7 sm:h-8 text-xs sm:text-sm">
                  <Menu className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>Menu</span>
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate(`/academy/${courseSlug}`)} className="hidden sm:flex items-center gap-1 sm:gap-2 whitespace-nowrap h-7 sm:h-8 text-xs sm:text-sm">
                  <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>Student View</span>
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate(`/academy/${courseSlug}`)} className="hidden sm:flex items-center gap-1 sm:gap-2 whitespace-nowrap h-7 sm:h-8 text-xs sm:text-sm">
                  <Home className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>Course Page</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Layout */}
        <div className="flex max-w-[1800px] mx-auto min-h-0">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-56 xl:w-64 border-r bg-card sticky top-[132px] self-start max-h-[calc(100vh-132px)] overflow-y-auto">
            <div className="p-4 xl:p-6">
              <div className="mb-6 xl:mb-8 pb-4 xl:pb-6 border-b">
                <InstructorCourseSwitcher currentCourse={course} />
              </div>
              <SidebarNav />
            </div>
          </aside>

          {/* Mobile Sidebar */}
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetContent side="left" className="w-64 sm:w-72 p-4 sm:p-6">
              <div className="mb-6 sm:mb-8 pb-4 sm:pb-6 border-b">
                <InstructorCourseSwitcher 
                  currentCourse={course} 
                  onClose={() => setSidebarOpen(false)}
                />
              </div>
              <SidebarNav isMobile />
            </SheetContent>
          </Sheet>


          {/* Main Content */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24">
            {activeTab === 'syllabus' && dbCourse && <SyllabusTemplateEditor courseId={dbCourse.id} courseCode={course.courseCode} courseTitle={course.title} instructorName={course.instructor?.name} instructorEmail={course.instructor?.email} />}
            {activeTab === 'modules' && dbCourse && <ModulesSection courseId={dbCourse.id} />}
            {activeTab === 'class-notes' && dbCourse && <ClassNotesManager courseId={dbCourse.id} isInstructor={true} />}
            {activeTab === 'calendar' && dbCourse?.id && <CourseClassCalendar courseId={dbCourse.id} courseCode={course.courseCode} isInstructor={true} />}
            {activeTab === 'assignments' && dbCourse?.id && <CourseAssignmentManager courseId={dbCourse.id} courseName={course.title} />}
            {activeTab === 'sight-reading' && <SightReadingAssignmentManager />}
            {activeTab === 'tests' && dbCourse && <TestBuilder courseId={dbCourse.id} courseName={course.title} />}
            {activeTab === 'polls' && dbCourse && <CoursePollManager courseId={dbCourse.id} courseName={course.title} />}
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
            {activeTab === 'audio' && <Card>
                <CardHeader>
                  <CardTitle>Audio Examples</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Audio library coming soon.</p>
                </CardContent>
              </Card>}
            {activeTab === 'attendance-security' && dbCourse && (
              <AttendanceSecurityControls 
                eventId={dbCourse.id} 
                eventTitle={`${course.title} Class Session`}
              />
            )}
            {activeTab === 'semesters' && <SemesterManager />}
            {activeTab === 'ai-assistant' && <AIAssistant />}
            {activeTab === 'settings' && dbCourse && (
              <div className="space-y-6">
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