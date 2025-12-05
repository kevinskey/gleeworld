import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, Users, BookOpen, BarChart3, Plus, Eye, Settings, GraduationCap, ClipboardCheck, UserPlus, FileText, Trophy, BarChart, Menu, Home, ListChecks, Edit } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import { Navigate, useNavigate } from 'react-router-dom';
import { useCourseTA } from '@/hooks/useCourseTA';
import { AssignmentManager } from '@/components/mus240/instructor/AssignmentManager';
import { GradesAdmin } from '@/components/mus240/instructor/GradesAdmin';
import { AIAssistant } from '@/components/mus240/instructor/AIAssistant';
import { GradeCalculationSystem } from '@/components/mus240/admin/GradeCalculationSystem';
import { EnrollmentManager } from '@/components/mus240/admin/EnrollmentManager';
import { ComprehensiveJournalAdmin } from '@/components/mus240/admin/ComprehensiveJournalAdmin';
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
  const navItems = [{
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
    value: 'ai-groups',
    label: 'AI Group Project',
    icon: Brain
  }, {
    value: 'grades',
    label: 'Grades',
    icon: Trophy
  }, {
    value: 'rubrics',
    label: 'Rubrics',
    icon: ListChecks
  }, {
    value: 'communications',
    label: 'Communications',
    icon: Users
  }, {
    value: 'students',
    label: 'Students',
    icon: UserPlus
  }, {
    value: 'analytics',
    label: 'Analytics',
    icon: BarChart
  }, {
    value: 'resources',
    label: 'Resources',
    icon: BookOpen
  }, {
    value: 'ai-assistant',
    label: 'AI Assistant',
    icon: Brain
  }, {
    value: 'settings',
    label: 'Settings',
    icon: Settings
  }];
  const SidebarNav = ({
    isMobile = false
  }) => <nav className="space-y-1">
      {navItems.map(item => {
      const Icon = item.icon;
      return <button key={item.value} onClick={() => {
        setActiveTab(item.value);
        if (isMobile) setSidebarOpen(false);
      }} className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors", activeTab === item.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground")}>
            <Icon className="h-4 w-4 flex-shrink-0" />
            <span>{item.label}</span>
          </button>;
    })}
    </nav>;
  return <UniversalLayout containerized={false}>
      <div className="min-h-screen bg-background">
        {/* Compact Stats Bar */}
        <div className="border-b bg-card">
          <div className="max-w-[1800px] mx-auto px-3 sm:px-6 py-3 sm:py-4">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 sm:gap-4">
              <div className="flex items-center gap-3 sm:gap-6 overflow-x-auto scrollbar-hide w-full lg:w-auto pb-2 lg:pb-0">
                <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm whitespace-nowrap">
                  <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
                  <span className="text-muted-foreground">Assignments:</span>
                  <span className="font-semibold text-foreground">{statsLoading ? '...' : stats.activeAssignments}</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm whitespace-nowrap">
                  <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-600 flex-shrink-0" />
                  <span className="text-muted-foreground">Journals:</span>
                  <span className="font-semibold text-foreground">{statsLoading ? '...' : stats.totalJournals}</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm whitespace-nowrap">
                  <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-orange-600 flex-shrink-0" />
                  <span className="text-muted-foreground">Pending:</span>
                  <span className="font-semibold text-foreground">{statsLoading ? '...' : stats.pendingGrades}</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm whitespace-nowrap">
                  <GraduationCap className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-600 flex-shrink-0" />
                  <span className="text-muted-foreground">Students:</span>
                  <span className="font-semibold text-foreground">{statsLoading ? '...' : stats.totalStudents}</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm whitespace-nowrap">
                  <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-indigo-600 flex-shrink-0" />
                  <span className="text-muted-foreground">Avg:</span>
                  <span className="font-semibold text-foreground">{statsLoading ? '...' : stats.averageGrade ? `${stats.averageGrade}%` : 'N/A'}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2 sm:gap-3 w-full lg:w-auto justify-between lg:justify-end">
                <Button variant="outline" size="sm" onClick={() => setSidebarOpen(true)} className="lg:hidden flex items-center gap-2">
                  <Menu className="h-4 w-4" />
                  <span>Menu</span>
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate('/classes/mus240/student/dashboard')} className="hidden sm:flex items-center gap-2 whitespace-nowrap">
                  <Eye className="h-4 w-4" />
                  <span>Student View</span>
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate('/classes/mus240/admin')} className="hidden sm:flex items-center gap-2 whitespace-nowrap">
                  <Home className="h-4 w-4" />
                  <span>Home</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Layout */}
        <div className="flex max-w-[1800px] mx-auto">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-64 border-r bg-card min-h-[calc(100vh-10rem)] sticky top-[132px]">
            <div className="p-6">
              <div className="mb-8 pb-6 border-b">
                <h2 className="text-xl font-bold text-foreground">MUS 240</h2>
                <p className="text-sm text-muted-foreground mt-1.5">Survey of African American Music</p>
                <p className="text-xs text-muted-foreground mt-1">Dr. Kevin Phillip Johnson</p>
              </div>
              <SidebarNav />
            </div>
          </aside>

          {/* Mobile Sidebar */}
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetContent side="left" className="w-72 p-6">
              <div className="mb-8 pb-6 border-b">
                <h2 className="text-xl font-bold text-foreground">MUS 240</h2>
                <p className="text-sm text-muted-foreground mt-1.5">Survey of African American Music</p>
                <p className="text-xs text-muted-foreground mt-1">Dr. Kevin Phillip Johnson</p>
              </div>
              <SidebarNav isMobile />
            </SheetContent>
          </Sheet>

          {/* Main Content */}
          <main className="flex-1 p-2 sm:p-4 md:p-6 lg:p-8">
            {/* Page Header */}
            <div className="mb-4 sm:mb-6 md:mb-8">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-1 sm:mb-2">
                {navItems.find(item => item.value === activeTab)?.label || 'Console'}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Manage your course content, track student progress, and analyze performance
              </p>
            </div>

            {/* Content */}
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

            {activeTab === 'tests' && <>
              <Card>
                <CardHeader className="border-b">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <ClipboardCheck className="h-5 w-5" />
                    Tests & Assessments
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Create and manage tests, quizzes, and midterm grading</p>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between border-b pb-3">
                      <div className="flex gap-2">
                        <Button variant={testSubTab === 'tests' ? 'default' : 'ghost'} onClick={() => setTestSubTab('tests')}>
                          All Tests
                        </Button>
                        <Button variant={testSubTab === 'midterm' ? 'default' : 'ghost'} onClick={() => setTestSubTab('midterm')}>
                          Midterm Grading
                        </Button>
                      </div>
                      
                      {testSubTab === 'tests' && (
                        <div className="flex gap-2">
                          <Button 
                            variant="outline"
                            size="sm"
                            onClick={() => setShowAICreateTestDialog(true)}
                            className="border-primary/30 hover:border-primary/50 hover:bg-primary/5"
                          >
                            <Brain className="h-4 w-4 mr-2 text-primary" />
                            AI Create Test
                          </Button>
                          <Button 
                            size="sm"
                            onClick={() => setShowCreateTestDialog(true)}
                          >
                            <Plus className="h-4 w-4 mr-2" />
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

            {activeTab === 'polls' && <Card>
                <CardHeader className="border-b">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <BarChart3 className="h-5 w-5" />
                    Polls & Engagement
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Create polls and track student participation</p>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <Mus240PollSystem />
                  <div className="grid gap-6 md:grid-cols-2">
                    <PollResultsViewer />
                    <PollParticipationTracker />
                  </div>
                </CardContent>
              </Card>}

            {activeTab === 'ai-groups' && <Card>
                <CardHeader className="border-b">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Brain className="h-5 w-5" />
                    AI Group Project
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Monitor group projects and role assignments</p>
                </CardHeader>
                <CardContent className="p-6">
                  <AIGroupProjectManager />
                </CardContent>
              </Card>}

            {activeTab === 'grades' && <Card>
                <CardHeader className="border-b">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Trophy className="h-5 w-5" />
                    Grade Management
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">View grades, calculate scores, and manage student performance</p>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <GradesAdmin />
                  <StudentScoresViewer />
                  <GradeCalculationSystem />
                </CardContent>
              </Card>}

            {activeTab === 'communications' && <Card>
                <CardHeader className="border-b">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Users className="h-5 w-5" />
                    Student Communications
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Email and text messaging system for communicating with students</p>
                </CardHeader>
                <CardContent className="p-6">
                  <StudentCommunications />
                </CardContent>
              </Card>}

            {activeTab === 'students' && <Card>
                <CardHeader className="border-b">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <UserPlus className="h-5 w-5" />
                    Student Management
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Manage course enrollments and student records</p>
                </CardHeader>
                <CardContent className="p-6">
                  <EnrollmentManager />
                </CardContent>
              </Card>}

            {activeTab === 'rubrics' && <Card>
                <CardHeader className="border-b">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <ListChecks className="h-5 w-5" />
                    Grading Rubrics
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Manage grading criteria for consistent evaluation</p>
                </CardHeader>
                <CardContent className="p-6">
                  <RubricManager />
                </CardContent>
              </Card>}

            {activeTab === 'analytics' && <Card>
                <CardHeader className="border-b">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <BarChart className="h-5 w-5" />
                    Analytics Dashboard
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Track performance metrics and student engagement</p>
                </CardHeader>
                <CardContent className="p-6 space-y-8">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Journal Submissions</h3>
                    <JournalSubmissionAnalytics />
                  </div>
                  <div className="pt-6 border-t">
                    <h3 className="text-lg font-semibold mb-4">Student Analytics</h3>
                    <StudentAnalyticsDashboard />
                  </div>
                </CardContent>
              </Card>}

            {activeTab === 'resources' && <Card>
                <CardHeader className="border-b">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <BookOpen className="h-5 w-5" />
                    Course Resources
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Manage course materials and learning resources</p>
                </CardHeader>
                <CardContent className="p-6">
                  <ResourcesAdmin />
                </CardContent>
              </Card>}

            {activeTab === 'ai-assistant' && <Card>
                <CardHeader className="border-b">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Brain className="h-5 w-5" />
                    AI Assistant
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Get AI-powered help with course management</p>
                </CardHeader>
                <CardContent className="p-6">
                  <AIAssistant />
                </CardContent>
              </Card>}

            {activeTab === 'settings' && <Card>
                <CardHeader className="border-b">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Settings className="h-5 w-5" />
                    Course Settings
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Configure course settings and preferences</p>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <p className="text-muted-foreground">
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