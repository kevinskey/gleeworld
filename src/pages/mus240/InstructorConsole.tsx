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
      // Add the original midterm as a special test entry
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
    { value: 'scores', label: 'Scores', icon: Trophy },
    { value: 'journals', label: 'Journals', icon: FileText },
    { value: 'midterms', label: 'Midterm', icon: ClipboardCheck },
    { value: 'students', label: 'Students', icon: UserPlus },
    { value: 'tests', label: 'Tests', icon: FileText },
    { value: 'analytics', label: 'Analytics', icon: BarChart },
    { value: 'resources', label: 'Resources', icon: BookOpen },
    { value: 'polls', label: 'Polls', icon: BarChart3 },
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
          {activeTab === 'assignments' && <AssignmentManager />}
          {activeTab === 'scores' && <StudentScoresViewer />}
          {activeTab === 'journals' && <ComprehensiveJournalAdmin />}
          {activeTab === 'midterms' && <MidtermGradingManager />}
          {activeTab === 'students' && <EnrollmentManager />}
          {activeTab === 'tests' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  MUS 240 Tests
                </CardTitle>
              </CardHeader>
              <CardContent>
                {testsLoading ? (
                  <p className="text-muted-foreground">Loading tests...</p>
                ) : allTests && allTests.length > 0 ? (
                  <TestList tests={allTests} courseId="mus240" />
                ) : (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No tests assigned to MUS 240</h3>
                    <p className="text-muted-foreground mb-4">
                      Create tests in the Test Builder and assign them to MUS 240
                    </p>
                    <Button onClick={() => navigate('/dashboard?module=test-builder')}>
                      <Plus className="h-4 w-4 mr-2" />
                      Go to Test Builder
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          {activeTab === 'analytics' && <StudentAnalyticsDashboard />}
          {activeTab === 'resources' && <ResourcesAdmin />}
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