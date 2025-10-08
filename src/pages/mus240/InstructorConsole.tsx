import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, Users, BookOpen, BarChart3, Plus, Eye, Settings, ArrowLeft, Home, ChevronRight, GraduationCap, ClipboardCheck, UserPlus, FileText, Trophy, BarChart } from 'lucide-react';
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

export const InstructorConsole = () => {
  const { isAdmin, loading } = useUserRole();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('assignments');
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="page-container max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center justify-between mb-1 md:mb-2">
          <div className="flex items-center space-x-1 md:space-x-2 text-xs md:text-sm text-gray-600">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/classes/mus240')}
              className="touch-target p-1 md:p-2 hover:bg-gray-100"
            >
              <Home className="h-3 w-3 md:h-4 md:w-4" />
            </Button>
            <ChevronRight className="h-3 w-3 md:h-4 md:w-4" />
            <span className="text-gray-400">MUS 240</span>
            <ChevronRight className="h-3 w-3 md:h-4 md:w-4" />
            <span className="font-medium text-gray-900 text-xs md:text-sm">Instructor Console</span>
          </div>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/classes/mus240')}
            className="touch-target flex items-center gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-3"
          >
            <ArrowLeft className="h-3 w-3 md:h-4 md:w-4" />
            <span className="hidden sm:inline">Back to</span> Course
          </Button>
        </div>

        {/* Header */}
        <div className="mb-2 md:mb-4">
          <h1 className="page-title-large text-gray-900">
            MUS 240 Instructor Console
          </h1>
          <p className="text-xs md:text-sm text-gray-600 mb-1">
            Survey of African American Music - Dr. Kevin Phillip Johnson
          </p>
          <Badge variant="secondary" className="text-xs">
            <Brain className="h-2.5 w-2.5 md:h-3 md:w-3 mr-1" />
            AI-Enhanced Teaching Platform
          </Badge>
        </div>

        {/* Quick Stats */}
        <div className="responsive-grid-4 mb-2 md:mb-4">
          <Card className="card-compact">
            <CardContent className="p-2 md:p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Active Assignments</p>
                  <p className="text-lg md:text-xl font-bold">
                    {statsLoading ? '...' : stats.activeAssignments}
                  </p>
                </div>
                <BookOpen className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="card-compact">
            <CardContent className="p-2 md:p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Total Journals</p>
                  <p className="text-lg md:text-xl font-bold">
                    {statsLoading ? '...' : stats.totalJournals}
                  </p>
                </div>
                <Eye className="h-5 w-5 md:h-6 md:w-6 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="card-compact">
            <CardContent className="p-2 md:p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Pending Grades</p>
                  <p className="text-lg md:text-xl font-bold">
                    {statsLoading ? '...' : stats.pendingGrades}
                  </p>
                </div>
                <BarChart3 className="h-5 w-5 md:h-6 md:w-6 text-orange-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="card-compact">
            <CardContent className="p-2 md:p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Enrolled Students</p>
                  <p className="text-lg md:text-xl font-bold">
                    {statsLoading ? '...' : stats.totalStudents}
                  </p>
                </div>
                <GraduationCap className="h-5 w-5 md:h-6 md:w-6 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="card-compact">
            <CardContent className="p-2 md:p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Class Average</p>
                  <p className="text-lg md:text-xl font-bold">
                    {statsLoading ? '...' : stats.averageGrade ? `${stats.averageGrade}%` : 'N/A'}
                  </p>
                </div>
                <Users className="h-5 w-5 md:h-6 md:w-6 text-indigo-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Console */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-5 md:grid-cols-11 h-auto gap-0.5 p-0.5 md:p-1 bg-white/90">
            <TabsTrigger 
              value="assignments" 
              className="touch-target flex flex-col items-center gap-1 text-xs p-2 min-h-[50px] md:min-h-[60px]"
            >
              <BookOpen className="h-3 w-3 md:h-4 md:w-4" />
              <span className="text-[10px] md:text-xs">Assign</span>
            </TabsTrigger>
            <TabsTrigger 
              value="scores" 
              className="touch-target flex flex-col items-center gap-1 text-xs p-2 min-h-[50px] md:min-h-[60px]"
            >
              <Trophy className="h-3 w-3 md:h-4 md:w-4" />
              <span className="text-[10px] md:text-xs">Scores</span>
            </TabsTrigger>
            <TabsTrigger 
              value="journals" 
              className="touch-target flex flex-col items-center gap-1 text-xs p-2 min-h-[50px] md:min-h-[60px]"
            >
              <BookOpen className="h-3 w-3 md:h-4 md:w-4" />
              <span className="text-[10px] md:text-xs">Journals</span>
            </TabsTrigger>
            <TabsTrigger 
              value="midterms" 
              className="touch-target flex flex-col items-center gap-1 text-xs p-2 min-h-[50px] md:min-h-[60px]"
            >
              <ClipboardCheck className="h-3 w-3 md:h-4 md:w-4" />
              <span className="text-[10px] md:text-xs">Midterm</span>
            </TabsTrigger>
            <TabsTrigger 
              value="students" 
              className="touch-target flex flex-col items-center gap-1 text-xs p-2 min-h-[50px] md:min-h-[60px]"
            >
              <UserPlus className="h-3 w-3 md:h-4 md:w-4" />
              <span className="text-[10px] md:text-xs">Students</span>
            </TabsTrigger>
            <TabsTrigger 
              value="tests" 
              className="touch-target flex flex-col items-center gap-1 text-xs p-2 min-h-[50px] md:min-h-[60px]"
            >
              <FileText className="h-3 w-3 md:h-4 md:w-4" />
              <span className="text-[10px] md:text-xs">Tests</span>
            </TabsTrigger>
            <TabsTrigger 
              value="analytics" 
              className="touch-target flex flex-col items-center gap-1 text-xs p-2 min-h-[50px] md:min-h-[60px]"
            >
              <Brain className="h-3 w-3 md:h-4 md:w-4" />
              <span className="text-[10px] md:text-xs">Analytics</span>
            </TabsTrigger>
            <TabsTrigger 
              value="resources" 
              className="touch-target flex flex-col items-center gap-1 text-xs p-2 min-h-[50px] md:min-h-[60px]"
            >
              <FileText className="h-3 w-3 md:h-4 md:w-4" />
              <span className="text-[10px] md:text-xs">Resources</span>
            </TabsTrigger>
            <TabsTrigger 
              value="polls" 
              className="touch-target flex flex-col items-center gap-1 text-xs p-2 min-h-[50px] md:min-h-[60px]"
            >
              <BarChart className="h-3 w-3 md:h-4 md:w-4" />
              <span className="text-[10px] md:text-xs">Polls</span>
            </TabsTrigger>
            <TabsTrigger 
              value="ai-assistant" 
              className="touch-target flex flex-col items-center gap-1 text-xs p-2 min-h-[50px] md:min-h-[60px]"
            >
              <Brain className="h-3 w-3 md:h-4 md:w-4" />
              <span className="text-[10px] md:text-xs">AI</span>
            </TabsTrigger>
            <TabsTrigger 
              value="settings" 
              className="touch-target flex flex-col items-center gap-1 text-xs p-2 min-h-[50px] md:min-h-[60px]"
            >
              <Settings className="h-3 w-3 md:h-4 md:w-4" />
              <span className="text-[10px] md:text-xs">Settings</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assignments" className="mt-1 md:mt-3">
            <AssignmentManager />
          </TabsContent>

          <TabsContent value="scores" className="mt-1 md:mt-3">
            <StudentScoresViewer />
          </TabsContent>

          <TabsContent value="journals" className="mt-1 md:mt-3">
            <ComprehensiveJournalAdmin />
          </TabsContent>

          <TabsContent value="midterms" className="mt-1 md:mt-3">
            <MidtermGradingManager />
          </TabsContent>

          <TabsContent value="students" className="mt-1 md:mt-3">
            <EnrollmentManager />
          </TabsContent>

          <TabsContent value="tests" className="mt-1 md:mt-3">
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
          </TabsContent>

          <TabsContent value="analytics" className="mt-1 md:mt-3">
            <StudentAnalyticsDashboard />
          </TabsContent>

          <TabsContent value="resources" className="mt-1 md:mt-3">
            <ResourcesAdmin />
          </TabsContent>

          <TabsContent value="polls" className="mt-1 md:mt-3">
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
          </TabsContent>

          <TabsContent value="ai-assistant" className="mt-1 md:mt-3">
            <AIAssistant />
          </TabsContent>

          <TabsContent value="settings" className="mt-1 md:mt-3">
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
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};