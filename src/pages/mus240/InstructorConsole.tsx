import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, Users, BookOpen, BarChart3, Plus, Eye, Edit } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import { Navigate } from 'react-router-dom';
import { AssignmentManager } from '@/components/mus240/instructor/AssignmentManager';
import { JournalsAdmin } from '@/components/mus240/instructor/JournalsAdmin';
import { GradesAdmin } from '@/components/mus240/instructor/GradesAdmin';
import { AIAssistant } from '@/components/mus240/instructor/AIAssistant';
import { toast } from 'sonner';

export const InstructorConsole = () => {
  const { isAdmin, loading } = useUserRole();
  const [activeTab, setActiveTab] = useState('assignments');

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Assignments</p>
                  <p className="text-2xl font-bold">12</p>
                </div>
                <BookOpen className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Student Journals</p>
                  <p className="text-2xl font-bold">248</p>
                </div>
                <Users className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending Grades</p>
                  <p className="text-2xl font-bold">34</p>
                </div>
                <BarChart3 className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">AI Assists Today</p>
                  <p className="text-2xl font-bold">7</p>
                </div>
                <Brain className="h-8 w-8 text-purple-600" />
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