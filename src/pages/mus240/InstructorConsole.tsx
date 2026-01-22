import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, Users, BookOpen, BarChart3, Plus, Eye, Settings, GraduationCap, ClipboardCheck, UserPlus, FileText, Trophy, BarChart, Menu, Home, ListChecks, Edit, Calendar, Video, Headphones, FolderOpen, Mail, MessageSquare, CalendarDays, ChevronDown, MessagesSquare, UserCheck, Megaphone } from 'lucide-react';
import { CourseVideoLibrary } from '@/components/course/CourseVideoLibrary';
import { CourseAssignmentManager } from '@/components/course/CourseAssignmentManager';
import { useUserRole } from '@/hooks/useUserRole';
import { Navigate, useNavigate } from 'react-router-dom';
import { useCourseTA } from '@/hooks/useCourseTA';
import { GradesAdmin } from '@/components/mus240/instructor/GradesAdmin';
import { AIAssistant } from '@/components/mus240/instructor/AIAssistant';
import { GradeCalculationSystem } from '@/components/mus240/admin/GradeCalculationSystem';
import { EnrollmentManager } from '@/components/mus240/admin/EnrollmentManager';
import { StudentScoresViewer } from '@/components/mus240/admin/StudentScoresViewer';
import { MidtermGradingManager } from '@/components/mus240/admin/MidtermGradingManager';
import { StudentAnalyticsDashboard } from '@/components/mus240/admin/StudentAnalyticsDashboard';
import { JournalSubmissionAnalytics } from '@/components/mus240/admin/JournalSubmissionAnalytics';
import ResourcesAdmin from '@/pages/mus240/admin/ResourcesAdmin';
import { PollResultsViewer } from '@/components/mus240/admin/PollResultsViewer';
import { PollParticipationTracker } from '@/components/mus240/admin/PollParticipationTracker';
import { Mus240PollSystem } from '@/components/mus240/Mus240PollSystem';
import { OpenAITestButton } from '@/components/mus240/admin/OpenAITestButton';
import { useMus240InstructorStats } from '@/hooks/useMus240InstructorStats';
import { TestList } from '@/components/test-builder/TestList';
import { CreateTestDialog } from '@/components/test-builder/CreateTestDialog';
import { AICreateTestDialog } from '@/components/test-builder/AICreateTestDialog';
import { useTests } from '@/hooks/useTestBuilder';
import { useQuery } from '@tanstack/react-query';
import { RubricEditor } from '@/components/mus240/rubrics/RubricEditor';
import { RubricManager } from '@/components/mus240/rubrics/RubricManager';
import { StudentCommunications } from '@/components/mus240/instructor/StudentCommunications';
import { AIGroupProjectManager } from '@/components/mus240/instructor/AIGroupProjectManager';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { Mus240SemesterSelector } from '@/components/mus240/admin/Mus240SemesterSelector';
import { SemesterManager } from '@/components/admin/SemesterManager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ModuleToggleManager } from '@/components/mus240/instructor/ModuleToggleManager';
import { Mus240ModuleEditor } from '@/components/mus240/instructor/Mus240ModuleEditor';
import { Mus240CalendarManager } from '@/components/mus240/instructor/Mus240CalendarManager';
import { BulkPasswordReset } from '@/components/mus240/admin/BulkPasswordReset';
import { DiscussionsSection } from '@/components/course/DiscussionsSection';
import { CourseAnnouncementsManager } from '@/components/course/CourseAnnouncementsManager';
import { Mus240ResourcesTab } from '@/components/academy/Mus240ResourcesTab';

export const InstructorConsole = () => {
  const {
    isAdmin,
    loading
  } = useUserRole();
  const {
    isTA,
    loading: taLoading
  } = useCourseTA('MUS240');
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('assignments');
  const [assignmentSubTab, setAssignmentSubTab] = useState('manage');
  const [testSubTab, setTestSubTab] = useState('tests');
  const [showCreateTestDialog, setShowCreateTestDialog] = useState(false);
  const [showAICreateTestDialog, setShowAICreateTestDialog] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const {
    stats,
    loading: statsLoading,
    error: statsError
  } = useMus240InstructorStats();
  const {
    data: tests,
    isLoading: testsLoading
  } = useTests('mus240');

  // Fetch available courses for admin navigation
  const { data: courses } = useQuery({
    queryKey: ['admin-courses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_courses')
        .select('id, course_code, title, instructor_name')
        .eq('is_active', true)
        .order('course_code');
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch original midterm config
  const {
    data: midtermConfig
  } = useQuery({
    queryKey: ['mus240-original-midterm'],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from('mus240_midterm_config').select('*').eq('is_active', true).maybeSingle();
      if (error) throw error;
      return data;
    }
  });

  // Combine Test Builder tests with original midterm
  const allTests = React.useMemo(() => {
    const combinedTests = [...(tests || [])];
    if (midtermConfig) {
      combinedTests.unshift({
        id: 'original-midterm',
        course_id: 'mus240',
        title: 'MUS 240 Midterm (Original)',
        description: 'Audio excerpt identification midterm with 3 musical examples',
        instructions: null,
        duration_minutes: 60,
        total_points: 100,
        passing_score: 70,
        is_published: midtermConfig.is_active,
        is_practice: false,
        allow_retakes: false,
        show_correct_answers: false,
        randomize_questions: false,
        created_by: null,
        created_at: midtermConfig.created_at,
        updated_at: midtermConfig.updated_at
      });
    }
    return combinedTests;
  }, [tests, midtermConfig]);

  console.log('InstructorConsole: Debug state', { 
    loading, 
    taLoading, 
    isAdminResult: typeof isAdmin === 'function' ? isAdmin() : 'not a function',
    isTA,
    statsLoading
  });

  if (loading || taLoading) {
    console.log('InstructorConsole: Still loading...', { loading, taLoading });
    return <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>;
  }

  // Allow both admins and TAs to access
  if (!isAdmin() && !isTA) {
    console.log('InstructorConsole: Not authorized, redirecting', { isAdmin: isAdmin(), isTA });
    return <Navigate to="/classes/mus240" replace />;
  }

  console.log('InstructorConsole: Rendering main content');
  // Navigation items organized by category
  const navCategories = [
    {
      label: 'Content',
      items: [
        { value: 'syllabus', label: 'Syllabus', icon: FileText },
        { value: 'modules', label: 'Modules', icon: FolderOpen },
        { value: 'announcements', label: 'Announcements', icon: Megaphone },
        { value: 'class-notes', label: 'Class Notes', icon: BookOpen },
        { value: 'calendar', label: 'Calendar', icon: Calendar },
      ]
    },
    {
      label: 'Assessment',
      items: [
        { value: 'assignments', label: 'Assignments', icon: BookOpen },
        { value: 'discussions', label: 'Discussions', icon: MessagesSquare },
        { value: 'tests', label: 'Tests', icon: ClipboardCheck },
        { value: 'polls', label: 'Polls', icon: BarChart3 },
        { value: 'rubrics', label: 'Rubrics', icon: ListChecks },
        { value: 'grades', label: 'Grades', icon: Trophy },
      ]
    },
    {
      label: 'Students',
      items: [
        { value: 'students', label: 'Enrollment', icon: UserPlus },
        { value: 'attendance', label: 'Attendance', icon: UserCheck },
        { value: 'analytics', label: 'Analytics', icon: BarChart },
        { value: 'communications', label: 'Communications', icon: Mail },
      ]
    },
    {
      label: 'Resources',
      items: [
        { value: 'resources', label: 'Course Materials', icon: BookOpen },
        { value: 'student-resources', label: 'Resources (Student View)', icon: FolderOpen },
        { value: 'videos', label: 'Video Library', icon: Video },
        { value: 'audio', label: 'Audio Examples', icon: Headphones },
      ]
    },
    {
      label: 'Tools',
      items: [
        { value: 'semesters', label: 'Semesters', icon: CalendarDays },
        { value: 'ai-groups', label: 'AI Group Project', icon: Brain },
        { value: 'ai-assistant', label: 'AI Assistant', icon: Brain },
        { value: 'settings', label: 'Settings', icon: Settings },
      ]
    }
  ];

  // Flatten for easy lookup
  const navItems = navCategories.flatMap(cat => cat.items);
  const SidebarNav = ({
    isMobile = false
  }) => (
    <nav className="space-y-8">
      {navCategories.map(category => (
        <div key={category.label}>
          <h3 className="text-base md:text-lg font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-3">
            {category.label}
          </h3>
          <div className="space-y-1.5">
            {category.items.map(item => {
              const Icon = item.icon;
              return (
                <button 
                  key={item.value} 
                  onClick={() => {
                    setActiveTab(item.value);
                    if (isMobile) setSidebarOpen(false);
                  }} 
                  className={cn(
                    "w-full flex items-center gap-4 px-4 py-3 rounded-lg text-lg md:text-xl font-medium transition-colors",
                    activeTab === item.value 
                      ? "bg-primary text-primary-foreground" 
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Icon className="h-6 w-6 md:h-7 md:w-7 flex-shrink-0" />
                  <span>{item.label}</span>
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
        {/* Compact Stats Bar */}
        <div className="border-b bg-card">
          <div className="max-w-[1800px] mx-auto px-3 sm:px-4 md:px-6 py-3 md:py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-5 md:gap-8 overflow-x-auto scrollbar-hide">
                <div className="flex items-center gap-2 text-base md:text-lg lg:text-xl whitespace-nowrap">
                  <BookOpen className="h-5 w-5 md:h-6 md:w-6 lg:h-7 lg:w-7 text-primary flex-shrink-0" />
                  <span className="text-muted-foreground">Assignments:</span>
                  <span className="font-semibold">{statsLoading ? '...' : stats.activeAssignments}</span>
                </div>
                <div className="flex items-center gap-2 text-base md:text-lg lg:text-xl whitespace-nowrap">
                  <Eye className="h-5 w-5 md:h-6 md:w-6 lg:h-7 lg:w-7 text-emerald-600 flex-shrink-0" />
                  <span className="text-muted-foreground">Journals:</span>
                  <span className="font-semibold">{statsLoading ? '...' : stats.totalJournals}</span>
                </div>
                <div className="flex items-center gap-2 text-base md:text-lg lg:text-xl whitespace-nowrap">
                  <BarChart3 className="h-5 w-5 md:h-6 md:w-6 lg:h-7 lg:w-7 text-orange-600 flex-shrink-0" />
                  <span className="text-muted-foreground">Pending:</span>
                  <span className="font-semibold">{statsLoading ? '...' : stats.pendingGrades}</span>
                </div>
                <div className="flex items-center gap-2 text-base md:text-lg lg:text-xl whitespace-nowrap">
                  <GraduationCap className="h-5 w-5 md:h-6 md:w-6 lg:h-7 lg:w-7 text-purple-600 flex-shrink-0" />
                  <span className="text-muted-foreground">Students:</span>
                  <span className="font-semibold">{statsLoading ? '...' : stats.totalStudents}</span>
                </div>
                <div className="hidden sm:flex items-center gap-2 text-base md:text-lg lg:text-xl whitespace-nowrap">
                  <Users className="h-5 w-5 md:h-6 md:w-6 lg:h-7 lg:w-7 text-indigo-600 flex-shrink-0" />
                  <span className="text-muted-foreground">Avg:</span>
                  <span className="font-semibold">{statsLoading ? '...' : stats.averageGrade ? `${stats.averageGrade}%` : 'N/A'}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-3 md:gap-4">
                <Mus240SemesterSelector className="hidden sm:flex" />
                <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(true)} className="lg:hidden h-10 w-10 p-0">
                  <Menu className="h-6 w-6" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigate('/academy/mus-240')} className="hidden sm:flex h-10 px-4 text-base md:text-lg">
                  <Eye className="h-5 w-5 mr-2" />
                  Student
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Layout */}
        <div className="flex max-w-[1800px] mx-auto">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-64 xl:w-80 border-r bg-card min-h-[calc(100vh-8rem)] sticky top-[100px]">
            <div className="p-4 xl:p-6">
              <div className="mb-6 pb-4 border-b">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="w-full text-left group hover:bg-accent/50 rounded-md p-3 -m-3 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-xl lg:text-2xl font-bold text-foreground">MUS 240</h2>
                          <p className="text-base lg:text-lg text-muted-foreground mt-1.5 line-clamp-1">Survey of African American Music</p>
                        </div>
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-72">
                    {courses?.map((course) => (
                      <DropdownMenuItem 
                        key={course.id}
                        onClick={() => navigate(`/courses/${course.id}/instructor`)}
                        className="flex flex-col items-start py-3"
                      >
                        <span className="font-semibold text-lg">{course.course_code}</span>
                        <span className="text-base text-muted-foreground">{course.title}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <SidebarNav />
            </div>
          </aside>

          {/* Mobile Sidebar */}
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetContent side="left" className="w-64 sm:w-72 p-4 sm:p-6">
              <div className="mb-6 sm:mb-8 pb-4 sm:pb-6 border-b">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="w-full text-left group hover:bg-accent/50 rounded-lg p-2 -m-2 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-lg sm:text-xl font-bold text-foreground">MUS 240</h2>
                          <p className="text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-1.5">Survey of African American Music</p>
                          <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">Dr. Kevin Phillip Johnson</p>
                        </div>
                        <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                      </div>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-64">
                    {courses?.map((course) => (
                      <DropdownMenuItem 
                        key={course.id}
                        onClick={() => {
                          navigate(`/courses/${course.id}/instructor`);
                          setSidebarOpen(false);
                        }}
                        className="flex flex-col items-start py-2"
                      >
                        <span className="font-semibold">{course.course_code}</span>
                        <span className="text-xs text-muted-foreground">{course.title}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <SidebarNav isMobile />
            </SheetContent>
          </Sheet>

          {/* Main Content */}
          <main className="flex-1 p-4 md:p-6 lg:p-8 bg-background">
            {/* Compact inline header */}
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <h1 className="text-xl md:text-2xl lg:text-3xl font-semibold text-foreground">
                {navItems.find(item => item.value === activeTab)?.label || 'Console'}
              </h1>
            </div>

            {/* Content */}
            {activeTab === 'assignments' && (
              <Card>
                <CardHeader className="border-b p-4 md:p-6">
                  <CardTitle className="flex items-center gap-2 text-lg md:text-xl lg:text-2xl">
                    <BookOpen className="h-5 w-5 md:h-6 md:w-6" />
                    Assignments
                  </CardTitle>
                  <p className="text-sm md:text-base text-muted-foreground mt-1">Create, edit, and manage course assignments</p>
                </CardHeader>
                <CardContent className="p-3 md:p-4 lg:p-6">
                  <CourseAssignmentManager courseId="23c4ee3c-7bbb-4534-8c0a-eecd88298d37" courseName="MUS 240" />
                </CardContent>
              </Card>
            )}

            {activeTab === 'tests' && <>
              <Card>
                <CardHeader className="border-b p-4 md:p-6">
                  <CardTitle className="flex items-center gap-2 text-lg md:text-xl lg:text-2xl">
                    <ClipboardCheck className="h-5 w-5 md:h-6 md:w-6" />
                    Tests & Assessments
                  </CardTitle>
                  <p className="text-sm md:text-base text-muted-foreground mt-1">Create and manage tests, quizzes, and midterm grading</p>
                </CardHeader>
                <CardContent className="p-3 md:p-4 lg:p-6">
                  <div className="space-y-4 md:space-y-6">
                    <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between border-b pb-3">
                      <div className="flex gap-2 overflow-x-auto">
                        <Button size="sm" variant={testSubTab === 'tests' ? 'default' : 'ghost'} onClick={() => setTestSubTab('tests')} className="text-sm md:text-base whitespace-nowrap">
                          All Tests
                        </Button>
                        <Button size="sm" variant={testSubTab === 'midterm' ? 'default' : 'ghost'} onClick={() => setTestSubTab('midterm')} className="text-sm md:text-base whitespace-nowrap">
                          Midterm Grading
                        </Button>
                      </div>
                      
                      {testSubTab === 'tests' && (
                        <div className="flex gap-2">
                          <Button 
                            variant="outline"
                            size="sm"
                            onClick={() => setShowAICreateTestDialog(true)}
                            className="border-primary/30 hover:border-primary/50 hover:bg-primary/5 text-sm md:text-base"
                          >
                            <Brain className="h-4 w-4 md:h-5 md:w-5 mr-2 text-primary" />
                            <span className="hidden xs:inline">AI </span>Create Test
                          </Button>
                          <Button 
                            size="sm"
                            onClick={() => setShowCreateTestDialog(true)}
                            className="text-sm md:text-base"
                          >
                            <Plus className="h-4 w-4 md:h-5 md:w-5 mr-2" />
                            Create Test
                          </Button>
                        </div>
                      )}
                    </div>

                    {testSubTab === 'tests' && <TestList tests={allTests} courseId="mus240" />}

                    {testSubTab === 'midterm' && <MidtermGradingManager />}
                  </div>
                </CardContent>
              </Card>
              
              <CreateTestDialog 
                open={showCreateTestDialog}
                onOpenChange={setShowCreateTestDialog}
                courseId="mus240"
              />
              
              <AICreateTestDialog
                open={showAICreateTestDialog}
                onOpenChange={setShowAICreateTestDialog}
                courseId="mus240"
              />
            </>}

            {activeTab === 'discussions' && (
              <Card>
                <CardHeader className="border-b p-3 sm:p-4 md:p-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg md:text-xl">
                    <MessagesSquare className="h-4 w-4 sm:h-5 sm:w-5" />
                    Discussion Forum
                  </CardTitle>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    Post once, respond once — graded discussions with due dates
                  </p>
                </CardHeader>
                <CardContent className="p-2 sm:p-4 md:p-6">
                  <DiscussionsSection courseId="23c4ee3c-7bbb-4534-8c0a-eecd88298d37" />
                </CardContent>
              </Card>
            )}

            {activeTab === 'polls' && <Card>
                <CardHeader className="border-b p-3 sm:p-4 md:p-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg md:text-xl">
                    <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" />
                    Polls & Engagement
                  </CardTitle>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">Create polls and track student participation</p>
                </CardHeader>
                <CardContent className="p-2 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
                  <Mus240PollSystem />
                  <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
                    <PollResultsViewer />
                    <PollParticipationTracker />
                  </div>
                </CardContent>
              </Card>}

            {activeTab === 'semesters' && (
              <Card>
                <CardHeader className="border-b p-3 sm:p-4 md:p-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg md:text-xl">
                    <CalendarDays className="h-4 w-4 sm:h-5 sm:w-5" />
                    Semester Management
                  </CardTitle>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">Set the active semester and archive past semesters</p>
                </CardHeader>
                <CardContent className="p-2 sm:p-4 md:p-6">
                  <SemesterManager />
                </CardContent>
              </Card>
            )}

            {activeTab === 'ai-groups' && <Card>
                <CardHeader className="border-b p-3 sm:p-4 md:p-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg md:text-xl">
                    <Brain className="h-4 w-4 sm:h-5 sm:w-5" />
                    AI Group Project
                  </CardTitle>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">Monitor group projects and role assignments</p>
                </CardHeader>
                <CardContent className="p-2 sm:p-4 md:p-6">
                  <AIGroupProjectManager />
                </CardContent>
              </Card>}

            {activeTab === 'grades' && <Card>
                <CardHeader className="border-b p-3 sm:p-4 md:p-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg md:text-xl">
                    <Trophy className="h-4 w-4 sm:h-5 sm:w-5" />
                    Grade Management
                  </CardTitle>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">View grades, calculate scores, and manage student performance</p>
                </CardHeader>
                <CardContent className="p-2 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
                  <GradesAdmin />
                  <StudentScoresViewer />
                  <GradeCalculationSystem />
                </CardContent>
              </Card>}

            {activeTab === 'communications' && <Card>
                <CardHeader className="border-b p-3 sm:p-4 md:p-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg md:text-xl">
                    <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                    Student Communications
                  </CardTitle>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">Email and text messaging system for communicating with students</p>
                </CardHeader>
                <CardContent className="p-2 sm:p-4 md:p-6">
                  <StudentCommunications />
                </CardContent>
              </Card>}

            {activeTab === 'students' && <Card>
                <CardHeader className="border-b p-3 sm:p-4 md:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-base sm:text-lg md:text-xl">
                        <UserPlus className="h-4 w-4 sm:h-5 sm:w-5" />
                        Student Management
                      </CardTitle>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1">Manage course enrollments and student records</p>
                    </div>
                    <BulkPasswordReset />
                  </div>
                </CardHeader>
                <CardContent className="p-2 sm:p-4 md:p-6">
                  <EnrollmentManager />
                </CardContent>
              </Card>}

            {activeTab === 'rubrics' && <Card>
                <CardHeader className="border-b p-3 sm:p-4 md:p-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg md:text-xl">
                    <ListChecks className="h-4 w-4 sm:h-5 sm:w-5" />
                    Grading Rubrics
                  </CardTitle>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">Manage grading criteria for consistent evaluation</p>
                </CardHeader>
                <CardContent className="p-2 sm:p-4 md:p-6">
                  <RubricManager />
                </CardContent>
              </Card>}

            {activeTab === 'analytics' && <Card>
                <CardHeader className="border-b p-3 sm:p-4 md:p-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg md:text-xl">
                    <BarChart className="h-4 w-4 sm:h-5 sm:w-5" />
                    Analytics Dashboard
                  </CardTitle>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">Track performance metrics and student engagement</p>
                </CardHeader>
                <CardContent className="p-2 sm:p-4 md:p-6 space-y-6 sm:space-y-8">
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Journal Submissions</h3>
                    <JournalSubmissionAnalytics />
                  </div>
                  <div className="pt-4 sm:pt-6 border-t">
                    <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Student Analytics</h3>
                    <StudentAnalyticsDashboard />
                  </div>
                </CardContent>
              </Card>}

            {activeTab === 'resources' && <Card>
                <CardHeader className="border-b p-3 sm:p-4 md:p-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg md:text-xl">
                    <BookOpen className="h-4 w-4 sm:h-5 sm:w-5" />
                    Course Resources
                  </CardTitle>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">Manage course materials and learning resources</p>
                </CardHeader>
                <CardContent className="p-2 sm:p-4 md:p-6">
                  <ResourcesAdmin />
                </CardContent>
              </Card>}

            {activeTab === 'student-resources' && (
              <Card>
                <CardHeader className="border-b p-3 sm:p-4 md:p-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg md:text-xl">
                    <FolderOpen className="h-4 w-4 sm:h-5 sm:w-5" />
                    Resources (Student View)
                  </CardTitle>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">Preview resources as students see them</p>
                </CardHeader>
                <CardContent className="p-2 sm:p-4 md:p-6">
                  <Mus240ResourcesTab isAdmin={true} />
                </CardContent>
              </Card>
            )}

            {activeTab === 'syllabus' && <Card>
                <CardHeader className="border-b p-3 sm:p-4 md:p-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg md:text-xl">
                    <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
                    Syllabus
                  </CardTitle>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">Create and edit course syllabus</p>
                </CardHeader>
                <CardContent className="p-2 sm:p-4 md:p-6">
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground mb-4">Syllabus editor coming soon</p>
                    <Button variant="outline" onClick={() => navigate('/classes/mus240?section=syllabus')}>
                      View Current Syllabus
                    </Button>
                  </div>
                </CardContent>
              </Card>}

            {activeTab === 'modules' && <Card>
                <CardHeader className="border-b p-3 sm:p-4 md:p-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg md:text-xl">
                    <FolderOpen className="h-4 w-4 sm:h-5 sm:w-5" />
                    Course Modules
                  </CardTitle>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">Create, edit, and manage weekly course modules and resources</p>
                </CardHeader>
                <CardContent className="p-2 sm:p-4 md:p-6">
                  <Mus240ModuleEditor />
                </CardContent>
              </Card>}

            {activeTab === 'class-notes' && <Card>
                <CardHeader className="border-b p-3 sm:p-4 md:p-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg md:text-xl">
                    <BookOpen className="h-4 w-4 sm:h-5 sm:w-5" />
                    Class Notes
                  </CardTitle>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">Upload and manage lecture notes</p>
                </CardHeader>
                <CardContent className="p-2 sm:p-4 md:p-6">
                  <div className="text-center py-8">
                    <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground mb-4">Class notes manager coming soon</p>
                    <Button variant="outline" onClick={() => navigate('/classes/mus240?section=class-notes')}>
                      View Current Notes
                    </Button>
                  </div>
                </CardContent>
              </Card>}

            {activeTab === 'calendar' && (
              <Card>
                <CardHeader className="border-b p-3 sm:p-4 md:p-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg md:text-xl">
                    <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
                    Course Calendar
                  </CardTitle>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">Schedule course events and deadlines</p>
                </CardHeader>
                <CardContent className="p-2 sm:p-4 md:p-6">
                  <Mus240CalendarManager />
                </CardContent>
              </Card>
            )}

            {activeTab === 'announcements' && (
              <Card>
                <CardHeader className="border-b p-3 sm:p-4 md:p-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg md:text-xl">
                    <Megaphone className="h-4 w-4 sm:h-5 sm:w-5" />
                    Course Announcements
                  </CardTitle>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">Create and manage announcements for students</p>
                </CardHeader>
                <CardContent className="p-2 sm:p-4 md:p-6">
                  <CourseAnnouncementsManager courseId="23c4ee3c-7bbb-4534-8c0a-eecd88298d37" />
                </CardContent>
              </Card>
            )}

            {activeTab === 'videos' && (
              <CourseVideoLibrary courseId="23c4ee3c-7bbb-4534-8c0a-eecd88298d37" isInstructor={true} />
            )}

            {activeTab === 'audio' && <Card>
                <CardHeader className="border-b p-3 sm:p-4 md:p-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg md:text-xl">
                    <Headphones className="h-4 w-4 sm:h-5 sm:w-5" />
                    Audio Examples
                  </CardTitle>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">Upload and manage audio files</p>
                </CardHeader>
                <CardContent className="p-2 sm:p-4 md:p-6">
                  <div className="text-center py-8">
                    <Headphones className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground mb-4">Audio examples manager coming soon</p>
                    <Button variant="outline" onClick={() => navigate('/classes/mus240?section=audio')}>
                      View Audio Library
                    </Button>
                  </div>
                </CardContent>
              </Card>}

            {activeTab === 'ai-assistant' && <Card>
                <CardHeader className="border-b p-3 sm:p-4 md:p-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg md:text-xl">
                    <Brain className="h-4 w-4 sm:h-5 sm:w-5" />
                    AI Assistant
                  </CardTitle>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">Get AI-powered help with course management</p>
                </CardHeader>
                <CardContent className="p-2 sm:p-4 md:p-6">
                  <AIAssistant />
                </CardContent>
              </Card>}

            {activeTab === 'settings' && <Card>
                <CardHeader className="border-b p-3 sm:p-4 md:p-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg md:text-xl">
                    <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
                    Course Settings
                  </CardTitle>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">Configure course settings and preferences</p>
                </CardHeader>
                <CardContent className="p-2 sm:p-4 md:p-6">
                  <div className="space-y-4">
                    <p className="text-muted-foreground text-xs sm:text-sm">
                      Course settings and configuration options
                    </p>
                    <div className="flex gap-2">
                      <OpenAITestButton />
                    </div>
                  </div>
                </CardContent>
              </Card>}
          </main>
        </div>
      </div>
    </UniversalLayout>;
};