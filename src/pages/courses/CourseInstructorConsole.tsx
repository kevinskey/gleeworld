import React, { useState, useEffect } from 'react';
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, Users, BookOpen, BarChart3, Plus, Eye, Settings, GraduationCap, ClipboardCheck, UserPlus, FileText, Trophy, BarChart, Menu, Home, ListChecks, Calendar, Video, Headphones, FolderOpen, Mail } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import { useCourseTA } from '@/hooks/useCourseTA';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { ACADEMY_COURSES } from '@/config/academyCourses';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { supabase } from '@/integrations/supabase/client';

// Import shared components that can work with any course
import { AssignmentManager } from '@/components/mus240/instructor/AssignmentManager';
import { GradesAdmin } from '@/components/mus240/instructor/GradesAdmin';
import { AIAssistant } from '@/components/mus240/instructor/AIAssistant';
import { CourseEnrollmentManager } from '@/components/academy/CourseEnrollmentManager';
import { StudentAnalyticsDashboard } from '@/components/mus240/admin/StudentAnalyticsDashboard';
import ResourcesAdmin from '@/pages/mus240/admin/ResourcesAdmin';
import { RubricManager } from '@/components/mus240/rubrics/RubricManager';
import { StudentCommunications } from '@/components/mus240/instructor/StudentCommunications';
import { SyllabusTemplateEditor } from '@/components/academy/syllabus/SyllabusTemplateEditor';
import { ModulesSection } from '@/components/course/ModulesSection';

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
  const navCategories = [{
    label: 'Content',
    items: [{
      value: 'syllabus',
      label: 'Syllabus',
      icon: FileText
    }, {
      value: 'modules',
      label: 'Modules',
      icon: FolderOpen
    }, {
      value: 'class-notes',
      label: 'Class Notes',
      icon: BookOpen
    }, {
      value: 'calendar',
      label: 'Calendar',
      icon: Calendar
    }]
  }, {
    label: 'Assessment',
    items: [{
      value: 'assignments',
      label: 'Assignments',
      icon: BookOpen
    }, {
      value: 'tests',
      label: 'Tests',
      icon: ClipboardCheck
    }, {
      value: 'polls',
      label: 'Polls',
      icon: BarChart3
    }, {
      value: 'rubrics',
      label: 'Rubrics',
      icon: ListChecks
    }, {
      value: 'grades',
      label: 'Grades',
      icon: Trophy
    }]
  }, {
    label: 'Students',
    items: [{
      value: 'students',
      label: 'Enrollment',
      icon: UserPlus
    }, {
      value: 'analytics',
      label: 'Analytics',
      icon: BarChart
    }, {
      value: 'communications',
      label: 'Communications',
      icon: Mail
    }]
  }, {
    label: 'Resources',
    items: [{
      value: 'resources',
      label: 'Course Materials',
      icon: BookOpen
    }, {
      value: 'videos',
      label: 'Video Library',
      icon: Video
    }, {
      value: 'audio',
      label: 'Audio Examples',
      icon: Headphones
    }]
  }, {
    label: 'Tools',
    items: [{
      value: 'ai-assistant',
      label: 'AI Assistant',
      icon: Brain
    }, {
      value: 'settings',
      label: 'Settings',
      icon: Settings
    }]
  }];
  const navItems = navCategories.flatMap(cat => cat.items);
  const SidebarNav = ({
    isMobile = false
  }) => <nav className="space-y-4">
      {navCategories.map(category => <div key={category.label}>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-3">
            {category.label}
          </h3>
          <div className="space-y-0.5">
            {category.items.map(item => {
          const Icon = item.icon;
          return <button key={item.value} onClick={() => {
            setActiveTab(item.value);
            if (isMobile) setSidebarOpen(false);
          }} className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors", activeTab === item.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground")}>
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span>{item.label}</span>
                </button>;
        })}
          </div>
        </div>)}
    </nav>;
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
        <div className="flex max-w-[1800px] mx-auto">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-56 xl:w-64 border-r bg-card min-h-[calc(100vh-10rem)] sticky top-[132px]">
            <div className="p-4 xl:p-6">
              <div className="mb-6 xl:mb-8 pb-4 xl:pb-6 border-b text-primary-foreground px-[10px] py-[10px] bg-orange-200">
                <h2 className="text-lg xl:text-xl font-bold text-foreground">{course.courseCode}</h2>
                <p className="text-xs xl:text-sm text-muted-foreground mt-1 xl:mt-1.5">{course.title}</p>
                <p className="text-[10px] xl:text-xs text-muted-foreground mt-0.5 xl:mt-1">{course.instructor?.name}</p>
              </div>
              <SidebarNav />
            </div>
          </aside>

          {/* Mobile Sidebar */}
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetContent side="left" className="w-64 sm:w-72 p-4 sm:p-6">
              <div className="mb-6 sm:mb-8 pb-4 sm:pb-6 border-b">
                <h2 className="text-lg sm:text-xl font-bold text-foreground">{course.courseCode}</h2>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-1.5">{course.title}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">{course.instructor?.name}</p>
              </div>
              <SidebarNav isMobile />
            </SheetContent>
          </Sheet>

          {/* Main Content */}
          <main className="flex-1 p-2 sm:p-3 md:p-4 lg:p-6 xl:p-8 pt-0">
            {/* Page Header */}
            <div className="mb-4 sm:mb-6 md:mb-8">
              
              
            </div>

            {/* Content Panels */}
            {activeTab === 'assignments' && <Card>
                <CardHeader className="border-b p-3 sm:p-4 md:p-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg md:text-xl">
                    <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                    <span className="truncate">Assignment Manager</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-2 sm:p-4 md:p-6">
                  <AssignmentManager />
                </CardContent>
              </Card>}

            {activeTab === 'grades'}

            {activeTab === 'students' && dbCourse && <Card>
                <CardHeader className="border-b p-3 sm:p-4 md:p-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg md:text-xl">
                    <UserPlus className="h-4 w-4 sm:h-5 sm:w-5" />
                    Enrollment Manager
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-2 sm:p-4 md:p-6">
                  <CourseEnrollmentManager courseId={dbCourse.id} courseCode={course.courseCode} courseTitle={course.title} term={dbCourse.term || undefined} />
                </CardContent>
              </Card>}

            {activeTab === 'analytics' && <StudentAnalyticsDashboard />}

            {activeTab === 'resources' && <ResourcesAdmin />}

            {activeTab === 'rubrics' && <Card>
                <CardHeader className="border-b p-3 sm:p-4 md:p-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg md:text-xl">
                    <ListChecks className="h-4 w-4 sm:h-5 sm:w-5" />
                    Rubric Manager
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-2 sm:p-4 md:p-6">
                  <RubricManager />
                </CardContent>
              </Card>}

            {activeTab === 'communications' && <Card>
                <CardHeader className="border-b p-3 sm:p-4 md:p-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg md:text-xl">
                    <Mail className="h-4 w-4 sm:h-5 sm:w-5" />
                    Student Communications
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-2 sm:p-4 md:p-6">
                  <StudentCommunications />
                </CardContent>
              </Card>}

            {activeTab === 'ai-assistant' && <AIAssistant />}

            {activeTab === 'syllabus' && <SyllabusTemplateEditor courseId={dbCourse?.id || course.id} courseCode={course.courseCode} courseTitle={course.title} />}

            {activeTab === 'modules' && <ModulesSection courseId={dbCourse?.id || course.id} />}

            {/* Placeholder panels for other tabs */}
            {['class-notes', 'calendar', 'tests', 'polls', 'videos', 'audio', 'settings'].includes(activeTab) && <Card>
                <CardHeader className="border-b p-3 sm:p-4 md:p-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg md:text-xl">
                    {navItems.find(item => item.value === activeTab)?.label}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 text-center text-muted-foreground">
                  <p>This feature is coming soon for {course.courseCode}.</p>
                </CardContent>
              </Card>}
          </main>
        </div>
      </div>
    </UniversalLayout>;
};
export default CourseInstructorConsole;