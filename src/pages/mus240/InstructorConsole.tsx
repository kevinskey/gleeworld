import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, Users, BookOpen, BarChart3, Plus, Eye, Settings, GraduationCap, ClipboardCheck, UserPlus, FileText, Trophy, BarChart, Menu, Home } from 'lucide-react';
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
import ResourcesAdmin from '@/pages/mus240/admin/ResourcesAdmin';
import { PollResultsViewer } from '@/components/mus240/admin/PollResultsViewer';
import { PollParticipationTracker } from '@/components/mus240/admin/PollParticipationTracker';
import { Mus240PollSystem } from '@/components/mus240/Mus240PollSystem';
import { OpenAITestButton } from '@/components/mus240/admin/OpenAITestButton';
import { useMus240InstructorStats } from '@/hooks/useMus240InstructorStats';
import { TestList } from '@/components/test-builder/TestList';
import { useTests } from '@/hooks/useTestBuilder';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { UniversalLayout } from '@/components/layout/UniversalLayout';

export const InstructorConsole = () => {
  const { isAdmin, loading } = useUserRole();
  const { isTA, loading: taLoading } = useCourseTA('MUS240');
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('assignments');
  const [assignmentSubTab, setAssignmentSubTab] = useState('manage');
  const [testSubTab, setTestSubTab] = useState('tests');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { stats, loading: statsLoading, error: statsError } = useMus240InstructorStats();
  const { data: tests, isLoading: testsLoading } = useTests('mus240');
  
  // Fetch original midterm config
  const { data: midtermConfig } = useQuery({
    queryKey: ['mus240-original-midterm'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mus240_midterm_config')
        .select('*')
        .eq('is_active', true)
        .single();
      
      if (error) throw error;
      return data;
    },
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
        allow_retakes: false,
        show_correct_answers: false,
        randomize_questions: false,
        created_by: null,
        created_at: midtermConfig.created_at,
        updated_at: midtermConfig.updated_at,
      });
    }
    
    return combinedTests;
  }, [tests, midtermConfig]);

  if (loading || taLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // Allow both admins and TAs to access
  if (!isAdmin() && !isTA) {
    return <Navigate to="/classes/mus240" replace />;
  }

  const navItems = [
    { value: 'assignments', label: 'Assignments', icon: BookOpen },
    { value: 'tests', label: 'Tests', icon: ClipboardCheck },
    { value: 'polls', label: 'Polls', icon: BarChart3 },
    { value: 'grades', label: 'Grades', icon: Trophy },
    { value: 'communications', label: 'Communications', icon: Users },
    { value: 'students', label: 'Students', icon: UserPlus },
    { value: 'analytics', label: 'Analytics', icon: BarChart },
    { value: 'resources', label: 'Resources', icon: BookOpen },
    { value: 'ai-assistant', label: 'AI Assistant', icon: Brain },
    { value: 'settings', label: 'Settings', icon: Settings },
  ];

  const SidebarNav = ({ isMobile = false }) => (
    <nav className="space-y-1">
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.value}
            onClick={() => {
              setActiveTab(item.value);
              if (isMobile) setSidebarOpen(false);
            }}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              activeTab === item.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );

  return (
    <UniversalLayout containerized={false}>
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
        {/* Compact Stats Bar */}
        <div className="border-b bg-card/50 backdrop-blur-sm sticky top-16 z-40">
          <div className="max-w-[2000px] mx-auto px-4 lg:px-6 py-3">
            <div className="flex items-center gap-6 overflow-x-auto scrollbar-hide">
              <div className="flex items-center gap-2 text-sm whitespace-nowrap">
                <BookOpen className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">Assignments:</span>
                <span className="font-semibold text-foreground">{statsLoading ? '...' : stats.activeAssignments}</span>
              </div>
              <div className="flex items-center gap-2 text-sm whitespace-nowrap">
                <Eye className="h-4 w-4 text-green-600 dark:text-green-500" />
                <span className="text-muted-foreground">Journals:</span>
                <span className="font-semibold text-foreground">{statsLoading ? '...' : stats.totalJournals}</span>
              </div>
              <div className="flex items-center gap-2 text-sm whitespace-nowrap">
                <BarChart3 className="h-4 w-4 text-orange-600 dark:text-orange-500" />
                <span className="text-muted-foreground">Pending:</span>
                <span className="font-semibold text-foreground">{statsLoading ? '...' : stats.pendingGrades}</span>
              </div>
              <div className="flex items-center gap-2 text-sm whitespace-nowrap">
                <GraduationCap className="h-4 w-4 text-purple-600 dark:text-purple-500" />
                <span className="text-muted-foreground">Students:</span>
                <span className="font-semibold text-foreground">{statsLoading ? '...' : stats.totalStudents}</span>
              </div>
              <div className="flex items-center gap-2 text-sm whitespace-nowrap">
                <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-500" />
                <span className="text-muted-foreground">Average:</span>
                <span className="font-semibold text-foreground">{statsLoading ? '...' : stats.averageGrade ? `${stats.averageGrade}%` : 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Layout */}
        <div className="flex max-w-[2000px] mx-auto">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-64 border-r bg-card/30 backdrop-blur-sm min-h-[calc(100vh-8rem)] sticky top-32">
            <div className="p-4">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-foreground">MUS 240</h2>
                <p className="text-sm text-muted-foreground mt-1">Survey of African American Music</p>
                <p className="text-xs text-muted-foreground mt-0.5">Dr. Kevin Phillip Johnson</p>
              </div>
              <SidebarNav />
            </div>
          </aside>

          {/* Mobile Sidebar */}
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild className="lg:hidden fixed bottom-6 right-6 z-50">
              <Button size="lg" className="rounded-full shadow-lg h-14 w-14">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-6">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-foreground">MUS 240 Console</h2>
                <p className="text-sm text-muted-foreground mt-1">Dr. Kevin Phillip Johnson</p>
              </div>
              <SidebarNav isMobile />
            </SheetContent>
          </Sheet>

          {/* Main Content */}
          <main className="flex-1 p-4 lg:p-6 space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4">
              <div>
                <h1 className="text-3xl font-bold text-foreground">
                  {navItems.find(item => item.value === activeTab)?.label || 'Console'}
                </h1>
                <p className="text-muted-foreground mt-1">
                  Manage and monitor your MUS 240 course
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-sm">
                  <Brain className="h-3.5 w-3.5 mr-1.5" />
                  AI-Enhanced
                </Badge>
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/classes/mus240/admin')}
                  className="flex items-center gap-2"
                >
                  <Home className="h-4 w-4" />
                  <span className="hidden sm:inline">Course Home</span>
                </Button>
              </div>
            </div>

            {/* Content based on active tab */}
            {activeTab === 'assignments' && (
              <Card className="border-border/50 shadow-sm">
                <CardHeader className="border-b bg-muted/30">
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    Assignments
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <AssignmentManager />
                </CardContent>
              </Card>
            )}

            {activeTab === 'tests' && (
              <Card className="border-border/50 shadow-sm">
                <CardHeader className="border-b bg-muted/30">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <ClipboardCheck className="h-5 w-5 text-primary" />
                      Tests & Assessments
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-6">
                    <div className="flex gap-2 border-b">
                      <Button
                        variant={testSubTab === 'tests' ? 'default' : 'ghost'}
                        onClick={() => setTestSubTab('tests')}
                        size="sm"
                      >
                        All Tests
                      </Button>
                      <Button
                        variant={testSubTab === 'midterm' ? 'default' : 'ghost'}
                        onClick={() => setTestSubTab('midterm')}
                        size="sm"
                      >
                        Midterm Grading
                      </Button>
                    </div>

                    {testSubTab === 'tests' && (
                      <TestList 
                        tests={allTests}
                        courseId="mus240"
                      />
                    )}

                    {testSubTab === 'midterm' && <MidtermGradingManager />}
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === 'polls' && (
              <Card className="border-border/50 shadow-sm">
                <CardHeader className="border-b bg-muted/30">
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    Polls & Engagement
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <Mus240PollSystem />
                  <div className="grid gap-6 md:grid-cols-2">
                    <PollResultsViewer />
                    <PollParticipationTracker />
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === 'grades' && (
              <Card className="border-border/50 shadow-sm">
                <CardHeader className="border-b bg-muted/30">
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-primary" />
                    Grade Management
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <GradesAdmin />
                  <StudentScoresViewer />
                  <GradeCalculationSystem />
                </CardContent>
              </Card>
            )}

            {activeTab === 'communications' && (
              <Card className="border-border/50 shadow-sm">
                <CardHeader className="border-b bg-muted/30">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Communications
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <ComprehensiveJournalAdmin />
                </CardContent>
              </Card>
            )}

            {activeTab === 'students' && (
              <Card className="border-border/50 shadow-sm">
                <CardHeader className="border-b bg-muted/30">
                  <CardTitle className="flex items-center gap-2">
                    <UserPlus className="h-5 w-5 text-primary" />
                    Student Management
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <EnrollmentManager />
                </CardContent>
              </Card>
            )}

            {activeTab === 'analytics' && (
              <Card className="border-border/50 shadow-sm">
                <CardHeader className="border-b bg-muted/30">
                  <CardTitle className="flex items-center gap-2">
                    <BarChart className="h-5 w-5 text-primary" />
                    Analytics Dashboard
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <StudentAnalyticsDashboard />
                </CardContent>
              </Card>
            )}

            {activeTab === 'resources' && (
              <Card className="border-border/50 shadow-sm">
                <CardHeader className="border-b bg-muted/30">
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    Course Resources
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <ResourcesAdmin />
                </CardContent>
              </Card>
            )}

            {activeTab === 'ai-assistant' && (
              <Card className="border-border/50 shadow-sm">
                <CardHeader className="border-b bg-muted/30">
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-primary" />
                    AI Assistant
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <AIAssistant />
                </CardContent>
              </Card>
            )}

            {activeTab === 'settings' && (
              <Card className="border-border/50 shadow-sm">
                <CardHeader className="border-b bg-muted/30">
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-primary" />
                    Course Settings
                  </CardTitle>
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
              </Card>
            )}
          </main>
        </div>
      </div>
    </UniversalLayout>
  );
};
