import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, Users, BookOpen, BarChart3, Plus, Eye, Settings, ArrowLeft, Home, ChevronRight, GraduationCap, ClipboardCheck, UserPlus, FileText, Trophy, BarChart, Menu } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import { Navigate, useNavigate } from 'react-router-dom';
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

export const InstructorConsole = () => {
  const { isAdmin, loading } = useUserRole();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('assignments');
  const [assignmentSubTab, setAssignmentSubTab] = useState('journals');
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!isAdmin()) {
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b">
        <div className="flex items-center justify-between px-4 py-3 max-w-[2000px] mx-auto">
          <div className="flex items-center gap-3">
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-4">
                <div className="mb-6">
                  <h2 className="text-lg font-bold">MUS 240 Console</h2>
                  <p className="text-xs text-muted-foreground mt-1">Dr. Kevin Phillip Johnson</p>
                </div>
                <SidebarNav isMobile />
              </SheetContent>
            </Sheet>

            <div>
              <h1 className="text-lg md:text-xl font-bold">MUS 240 Instructor Console</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">Survey of African American Music</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs hidden md:flex">
              <Brain className="h-3 w-3 mr-1" />
              AI-Enhanced
            </Badge>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/classes/mus240')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Course</span>
            </Button>
          </div>
        </div>

        {/* Compact Stats Bar */}
        <div className="border-t bg-muted/30">
          <div className="max-w-[2000px] mx-auto px-4 py-2">
            <div className="flex items-center gap-4 overflow-x-auto">
              <div className="flex items-center gap-2 text-xs whitespace-nowrap">
                <BookOpen className="h-3.5 w-3.5 text-blue-600" />
                <span className="text-muted-foreground">Assignments:</span>
                <span className="font-bold">{statsLoading ? '...' : stats.activeAssignments}</span>
              </div>
              <div className="flex items-center gap-2 text-xs whitespace-nowrap">
                <Eye className="h-3.5 w-3.5 text-green-600" />
                <span className="text-muted-foreground">Journals:</span>
                <span className="font-bold">{statsLoading ? '...' : stats.totalJournals}</span>
              </div>
              <div className="flex items-center gap-2 text-xs whitespace-nowrap">
                <BarChart3 className="h-3.5 w-3.5 text-orange-600" />
                <span className="text-muted-foreground">Pending:</span>
                <span className="font-bold">{statsLoading ? '...' : stats.pendingGrades}</span>
              </div>
              <div className="flex items-center gap-2 text-xs whitespace-nowrap">
                <GraduationCap className="h-3.5 w-3.5 text-purple-600" />
                <span className="text-muted-foreground">Students:</span>
                <span className="font-bold">{statsLoading ? '...' : stats.totalStudents}</span>
              </div>
              <div className="flex items-center gap-2 text-xs whitespace-nowrap">
                <Users className="h-3.5 w-3.5 text-indigo-600" />
                <span className="text-muted-foreground">Average:</span>
                <span className="font-bold">{statsLoading ? '...' : stats.averageGrade ? `${stats.averageGrade}%` : 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex max-w-[2000px] mx-auto">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-64 border-r bg-white/50 backdrop-blur min-h-[calc(100vh-120px)] sticky top-[120px]">
          <div className="p-4">
            <SidebarNav />
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 p-4 md:p-6">
          {/* Assignments Tab with Sub-tabs */}
          {activeTab === 'assignments' && (
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Assignments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2 border-b mb-4">
                    <Button
                      variant={assignmentSubTab === 'journals' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setAssignmentSubTab('journals')}
                    >
                      Journals
                    </Button>
                    <Button
                      variant={assignmentSubTab === 'papers' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setAssignmentSubTab('papers')}
                    >
                      Papers
                    </Button>
                    <Button
                      variant={assignmentSubTab === 'group-projects' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setAssignmentSubTab('group-projects')}
                    >
                      Group Projects
                    </Button>
                  </div>

                  {assignmentSubTab === 'journals' && <ComprehensiveJournalAdmin />}
                  {assignmentSubTab === 'papers' && (
                    <div className="text-center py-12">
                      <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">Papers</h3>
                      <p className="text-muted-foreground">Paper assignments will be managed here</p>
                    </div>
                  )}
                  {assignmentSubTab === 'group-projects' && (
                    <div className="text-center py-12">
                      <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">Group Projects</h3>
                      <p className="text-muted-foreground">Group project assignments will be managed here</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Tests Tab with Sub-tabs */}
          {activeTab === 'tests' && (
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardCheck className="h-5 w-5" />
                    Tests & Exams
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2 border-b mb-4">
                    <Button
                      variant={testSubTab === 'tests' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setTestSubTab('tests')}
                    >
                      Tests
                    </Button>
                    <Button
                      variant={testSubTab === 'midterm' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setTestSubTab('midterm')}
                    >
                      Midterm
                    </Button>
                    <Button
                      variant={testSubTab === 'final' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setTestSubTab('final')}
                    >
                      Final
                    </Button>
                  </div>

                  {testSubTab === 'tests' && (
                    testsLoading ? (
                      <p className="text-muted-foreground">Loading tests...</p>
                    ) : allTests && allTests.length > 0 ? (
                      <TestList tests={allTests} courseId="mus240" />
                    ) : (
                      <div className="text-center py-12">
                        <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">No tests created</h3>
                        <p className="text-muted-foreground mb-4">
                          Create tests in the Test Builder and assign them to MUS 240
                        </p>
                        <Button onClick={() => navigate('/dashboard?module=test-builder')}>
                          <Plus className="h-4 w-4 mr-2" />
                          Go to Test Builder
                        </Button>
                      </div>
                    )
                  )}

                  {testSubTab === 'midterm' && <MidtermGradingManager />}

                  {testSubTab === 'final' && (
                    <div className="text-center py-12">
                      <ClipboardCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">Final Exam</h3>
                      <p className="text-muted-foreground">Final exam management will be available here</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Polls Tab */}
          {activeTab === 'polls' && (
            <div className="space-y-6">
              <PollParticipationTracker />
              <PollResultsViewer />
              <Card>
                <CardHeader>
                  <CardTitle>Poll Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <Mus240PollSystem />
                </CardContent>
              </Card>
            </div>
          )}

          {/* Grades Tab */}
          {activeTab === 'grades' && (
            <div className="space-y-4">
              <StudentScoresViewer />
              <GradeCalculationSystem />
            </div>
          )}

          {/* Communications Tab */}
          {activeTab === 'communications' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Communications
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Student Communications</h3>
                  <p className="text-muted-foreground mb-4">
                    Email and text messaging system for communicating with students
                  </p>
                  <p className="text-sm text-muted-foreground">Coming soon</p>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'students' && <EnrollmentManager />}
          {activeTab === 'analytics' && <StudentAnalyticsDashboard />}
          {activeTab === 'resources' && <ResourcesAdmin />}
          {activeTab === 'ai-assistant' && <AIAssistant />}
          {activeTab === 'settings' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Course Settings
                </CardTitle>
              </CardHeader>
              <CardContent>
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
  );
};
