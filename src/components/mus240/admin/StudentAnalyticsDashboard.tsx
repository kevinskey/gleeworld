import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Scatter
} from 'recharts';
import {
  Brain,
  Clock,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  User,
  BarChart3,
  PieChart as PieChartIcon,
  Activity
} from 'lucide-react';

export const StudentAnalyticsDashboard: React.FC = () => {
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);

  // Fetch session analytics
  const { data: sessionAnalytics, isLoading: loadingSession } = useQuery({
    queryKey: ['session-analytics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mus240_session_analytics')
        .select(`
          *,
          mus240_midterm_submissions(
            gw_profiles(full_name, email)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Fetch test analytics
  const { data: testAnalytics, isLoading: loadingTest } = useQuery({
    queryKey: ['test-analytics', selectedStudent],
    queryFn: async () => {
      if (!selectedStudent) return [];
      
      const { data, error } = await supabase
        .from('mus240_test_analytics')
        .select('*')
        .eq('student_id', selectedStudent)
        .order('timestamp_recorded', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!selectedStudent,
  });

  // Fetch course-wide analytics
  const { data: courseAnalytics, isLoading: loadingCourse } = useQuery({
    queryKey: ['course-analytics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mus240_course_analytics')
        .select('*')
        .order('generated_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
  });

  const getAIRiskLevel = (score: number) => {
    if (score >= 70) return { level: 'High', color: 'destructive' };
    if (score >= 40) return { level: 'Medium', color: 'warning' };
    return { level: 'Low', color: 'default' };
  };

  const getSpeedCategory = (minutes: number) => {
    if (minutes < 30) return { category: 'Very Fast', color: 'destructive' };
    if (minutes < 45) return { category: 'Fast', color: 'warning' };
    if (minutes < 60) return { category: 'Normal', color: 'default' };
    return { category: 'Slow', color: 'secondary' };
  };

  if (loadingSession || loadingCourse) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center">Loading analytics...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Total Students</span>
            </div>
            <div className="text-2xl font-bold mt-2">
              {sessionAnalytics?.length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Avg Completion</span>
            </div>
            <div className="text-2xl font-bold mt-2">
              {courseAnalytics?.average_completion_time_minutes?.toFixed(1) || '0'} min
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium">AI Usage</span>
            </div>
            <div className="text-2xl font-bold mt-2">
              {courseAnalytics?.ai_usage_percentage?.toFixed(1) || '0'}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-medium">Common Struggles</span>
            </div>
            <div className="text-sm font-medium mt-2">
              {courseAnalytics?.common_struggle_areas?.[0] || 'None identified'}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="individual" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Individual
          </TabsTrigger>
          <TabsTrigger value="patterns" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Patterns
          </TabsTrigger>
          <TabsTrigger value="ai-detection" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            AI Detection
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Class Performance Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Completion Time Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={sessionAnalytics?.map((s: any) => ({
                    name: s.mus240_midterm_submissions?.gw_profiles?.full_name?.split(' ')[0] || 'Unknown',
                    time: Math.round(s.total_active_time_seconds / 60),
                    ai_score: s.ai_likelihood_score
                  })) || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="time" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>AI Likelihood Scores</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Low Risk (0-39)', value: sessionAnalytics?.filter(s => s.ai_likelihood_score < 40).length || 0, fill: '#22c55e' },
                        { name: 'Medium Risk (40-69)', value: sessionAnalytics?.filter(s => s.ai_likelihood_score >= 40 && s.ai_likelihood_score < 70).length || 0, fill: '#f59e0b' },
                        { name: 'High Risk (70+)', value: sessionAnalytics?.filter(s => s.ai_likelihood_score >= 70).length || 0, fill: '#ef4444' }
                      ]}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label
                    />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Student List */}
          <Card>
            <CardHeader>
              <CardTitle>Student Performance Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {sessionAnalytics?.map((student: any) => {
                    const completionMinutes = Math.round(student.total_active_time_seconds / 60);
                    const aiRisk = getAIRiskLevel(student.ai_likelihood_score);
                    const speedCategory = getSpeedCategory(completionMinutes);
                    
                    return (
                      <Card 
                        key={student.id} 
                        className={`cursor-pointer transition-colors hover:bg-gray-50 ${
                          selectedStudent === student.student_id ? 'ring-2 ring-blue-500' : ''
                        }`}
                        onClick={() => setSelectedStudent(student.student_id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-semibold">
                                {student.mus240_midterm_submissions?.gw_profiles?.full_name || 'Unknown Student'}
                              </h3>
                              <p className="text-sm text-gray-600">
                                {student.mus240_midterm_submissions?.gw_profiles?.email || 'No email'}
                              </p>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              <div className="text-center">
                                <div className="text-sm font-medium">{completionMinutes} min</div>
                                <Badge variant={speedCategory.color as any} className="text-xs">
                                  {speedCategory.category}
                                </Badge>
                              </div>
                              
                              <div className="text-center">
                                <div className="text-sm font-medium">{student.ai_likelihood_score}%</div>
                                <Badge variant={aiRisk.color as any} className="text-xs">
                                  AI {aiRisk.level}
                                </Badge>
                              </div>
                              
                              <div className="text-center">
                                <div className="flex items-center gap-1">
                                  {student.struggle_areas?.length > 0 ? (
                                    <AlertTriangle className="h-4 w-4 text-red-500" />
                                  ) : (
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                  )}
                                  <span className="text-xs">
                                    {student.struggle_areas?.length || 0} struggles
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Progress bars for key metrics */}
                          <div className="mt-3 grid grid-cols-3 gap-3">
                            <div>
                              <div className="text-xs text-gray-500 mb-1">Typing Speed</div>
                              <Progress 
                                value={Math.min((student.average_typing_speed / 60) * 100, 100)} 
                                className="h-2"
                              />
                            </div>
                            <div>
                              <div className="text-xs text-gray-500 mb-1">Consistency</div>
                              <Progress 
                                value={student.consistency_score || 0} 
                                className="h-2"
                              />
                            </div>
                            <div>
                              <div className="text-xs text-gray-500 mb-1">Revision Rate</div>
                              <Progress 
                                value={Math.min((student.revision_frequency / 5) * 100, 100)} 
                                className="h-2"
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="individual" className="space-y-6">
          {selectedStudent ? (
            <div className="space-y-6">
              {/* Individual student detailed analytics */}
              <Card>
                <CardHeader>
                  <CardTitle>Individual Student Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  {testAnalytics && testAnalytics.length > 0 ? (
                    <div className="space-y-4">
                      {/* Time spent per section chart */}
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={testAnalytics.map(event => ({
                          time: new Date(event.timestamp_recorded).getTime(),
                          section: event.section_name,
                          duration: event.time_spent_seconds || 0
                        }))}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="time" type="number" scale="time" domain={['dataMin', 'dataMax']} />
                          <YAxis />
                          <Tooltip labelFormatter={(value) => new Date(value).toLocaleTimeString()} />
                          <Line dataKey="duration" stroke="#8884d8" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      Select a student to view detailed analytics
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="p-8">
                <div className="text-center text-gray-500">
                  Select a student from the Overview tab to view individual analytics
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="patterns" className="space-y-6">
          {/* Behavioral patterns analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Common Struggle Areas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {courseAnalytics?.common_struggle_areas?.map((area, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm">{area}</span>
                      <Badge variant="destructive">
                        {sessionAnalytics?.filter(s => s.struggle_areas?.includes(area)).length || 0} students
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Common Strength Areas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {courseAnalytics?.common_strength_areas?.map((area, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm">{area}</span>
                      <Badge variant="default">
                        {sessionAnalytics?.filter(s => s.strength_areas?.includes(area)).length || 0} students
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="ai-detection" className="space-y-6">
          {/* AI detection analysis */}
          <Card>
            <CardHeader>
              <CardTitle>AI Detection Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {sessionAnalytics?.filter(s => s.ai_likelihood_score > 50).map((student: any) => (
                  <Card key={student.id} className="border-red-200">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-sm">
                          {student.mus240_midterm_submissions?.gw_profiles?.full_name || 'Unknown Student'}
                        </h4>
                        <Badge variant="destructive">
                          {student.ai_likelihood_score}%
                        </Badge>
                      </div>
                      
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span>Completion Time:</span>
                          <span>{Math.round(student.total_active_time_seconds / 60)} min</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Edit Count:</span>
                          <span>{student.revision_frequency?.toFixed(1) || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Typing Speed:</span>
                          <span>{student.average_typing_speed?.toFixed(1) || 0} WPM</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};