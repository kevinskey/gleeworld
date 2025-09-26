import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, Users, BookOpen, BarChart3, Plus, Eye, Edit, ArrowLeft, Home, ChevronRight, GraduationCap } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import { Navigate, useNavigate } from 'react-router-dom';
import { AssignmentManager } from '@/components/mus240/instructor/AssignmentManager';
import { JournalsAdmin } from '@/components/mus240/instructor/JournalsAdmin';
import { GradesAdmin } from '@/components/mus240/instructor/GradesAdmin';
import { AIAssistant } from '@/components/mus240/instructor/AIAssistant';
import { useMus240InstructorStats } from '@/hooks/useMus240InstructorStats';
import { toast } from 'sonner';

export const InstructorConsole = () => {
  const { isAdmin, loading } = useUserRole();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('assignments');
  const { stats, loading: statsLoading, error: statsError } = useMus240InstructorStats();

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
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 h-auto gap-0.5 md:gap-1 p-0.5 md:p-1">
            <TabsTrigger 
              value="assignments" 
              className="touch-target flex flex-col md:flex-row items-center gap-1 text-xs md:text-sm p-2 md:p-3 min-h-[50px] md:min-h-0"
            >
              <BookOpen className="h-3 w-3 md:h-4 md:w-4" />
              <span>Assignments</span>
            </TabsTrigger>
            <TabsTrigger 
              value="journals" 
              className="touch-target flex flex-col md:flex-row items-center gap-1 text-xs md:text-sm p-2 md:p-3 min-h-[50px] md:min-h-0"
            >
              <Eye className="h-3 w-3 md:h-4 md:w-4" />
              <span>Journals</span>
            </TabsTrigger>
            <TabsTrigger 
              value="grades" 
              className="touch-target flex flex-col md:flex-row items-center gap-1 text-xs md:text-sm p-2 md:p-3 min-h-[50px] md:min-h-0"
            >
              <BarChart3 className="h-3 w-3 md:h-4 md:w-4" />
              <span>Grades</span>
            </TabsTrigger>
            <TabsTrigger 
              value="midterm-grading" 
              className="touch-target flex flex-col md:flex-row items-center gap-1 text-xs md:text-sm p-2 md:p-3 min-h-[50px] md:min-h-0"
            >
              <ClipboardCheck className="h-3 w-3 md:h-4 md:w-4" />
              <span>Grading</span>
            </TabsTrigger>
            <TabsTrigger 
              value="ai-assistant" 
              className="touch-target flex flex-col md:flex-row items-center gap-1 text-xs md:text-sm p-2 md:p-3 min-h-[50px] md:min-h-0"
            >
              <Brain className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">AI </span>Assistant
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assignments" className="mt-1 md:mt-3">
            <AssignmentManager />
          </TabsContent>

          <TabsContent value="journals" className="mt-1 md:mt-3">
            <JournalsAdmin />
          </TabsContent>

          <TabsContent value="grades" className="mt-1 md:mt-3">
            <GradesAdmin />
          </TabsContent>

          <TabsContent value="midterm-grading" className="mt-1 md:mt-3">
            <MidtermGradingDashboard />
          </TabsContent>

          <TabsContent value="ai-assistant" className="mt-1 md:mt-3">
            <AIAssistant />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};