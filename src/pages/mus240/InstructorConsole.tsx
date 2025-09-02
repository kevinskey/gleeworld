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
      <div className="max-w-7xl mx-auto p-6">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/classes/mus240')}
              className="p-2 hover:bg-gray-100"
            >
              <Home className="h-4 w-4" />
            </Button>
            <ChevronRight className="h-4 w-4" />
            <span className="text-gray-400">MUS 240</span>
            <ChevronRight className="h-4 w-4" />
            <span className="font-medium text-gray-900">Instructor Console</span>
          </div>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/classes/mus240')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Course
          </Button>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            MUS 240 Instructor Console
          </h1>
          <p className="text-gray-600">
            Survey of African American Music - Dr. Kevin Phillip Johnson
          </p>
          <Badge variant="secondary" className="mt-2">
            <Brain className="h-3 w-3 mr-1" />
            AI-Enhanced Teaching Platform
          </Badge>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Assignments</p>
                  <p className="text-2xl font-bold">
                    {statsLoading ? '...' : stats.activeAssignments}
                  </p>
                </div>
                <BookOpen className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Journals</p>
                  <p className="text-2xl font-bold">
                    {statsLoading ? '...' : stats.totalJournals}
                  </p>
                </div>
                <Eye className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending Grades</p>
                  <p className="text-2xl font-bold">
                    {statsLoading ? '...' : stats.pendingGrades}
                  </p>
                </div>
                <BarChart3 className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Enrolled Students</p>
                  <p className="text-2xl font-bold">
                    {statsLoading ? '...' : stats.totalStudents}
                  </p>
                </div>
                <GraduationCap className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Class Average</p>
                  <p className="text-2xl font-bold">
                    {statsLoading ? '...' : stats.averageGrade ? `${stats.averageGrade}%` : 'N/A'}
                  </p>
                </div>
                <Users className="h-8 w-8 text-indigo-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Console */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="assignments" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Assignments
            </TabsTrigger>
            <TabsTrigger value="journals" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Journals
            </TabsTrigger>
            <TabsTrigger value="grades" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Grades
            </TabsTrigger>
            <TabsTrigger value="ai-assistant" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              AI Assistant
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assignments" className="mt-6">
            <AssignmentManager />
          </TabsContent>

          <TabsContent value="journals" className="mt-6">
            <JournalsAdmin />
          </TabsContent>

          <TabsContent value="grades" className="mt-6">
            <GradesAdmin />
          </TabsContent>

          <TabsContent value="ai-assistant" className="mt-6">
            <AIAssistant />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};