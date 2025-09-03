import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TrendingUp, Users, Award, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface StudentProgress {
  user_id: string;
  full_name: string;
  voice_part: string;
  total_assignments: number;
  completed_assignments: number;
  average_score: number;
  latest_submission: string;
  progress_trend: number[];
}

interface ProgressStats {
  totalStudents: number;
  averageCompletion: number;
  averageScore: number;
  assignmentsDue: number;
}

export const StudentProgressTracker = () => {
  const [students, setStudents] = useState<StudentProgress[]>([]);
  const [stats, setStats] = useState<ProgressStats>({
    totalStudents: 0,
    averageCompletion: 0,
    averageScore: 0,
    assignmentsDue: 0
  });
  const [selectedVoicePart, setSelectedVoicePart] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  // Mock data for now - in real implementation, this would come from the database
  const mockProgressData = [
    { date: '2024-01', average: 78 },
    { date: '2024-02', average: 82 },
    { date: '2024-03', average: 85 },
    { date: '2024-04', average: 88 },
    { date: '2024-05', average: 91 },
  ];

  const mockVoicePartData = [
    { voicePart: 'Soprano 1', average: 88, students: 12 },
    { voicePart: 'Soprano 2', average: 85, students: 15 },
    { voicePart: 'Alto 1', average: 90, students: 14 },
    { voicePart: 'Alto 2', average: 87, students: 13 },
  ];

  useEffect(() => {
    fetchStudentProgress();
  }, [selectedVoicePart]);

  const fetchStudentProgress = async () => {
    try {
      // Mock data for demonstration
      const mockStudents: StudentProgress[] = [
        {
          user_id: '1',
          full_name: 'Sarah Johnson',
          voice_part: 'Soprano 1',
          total_assignments: 8,
          completed_assignments: 7,
          average_score: 92,
          latest_submission: '2024-12-01',
          progress_trend: [85, 88, 90, 92]
        },
        {
          user_id: '2',
          full_name: 'Maria Garcia',
          voice_part: 'Alto 2',
          total_assignments: 8,
          completed_assignments: 6,
          average_score: 88,
          latest_submission: '2024-11-28',
          progress_trend: [80, 85, 87, 88]
        },
        {
          user_id: '3',
          full_name: 'Ashley Williams',
          voice_part: 'Soprano 2',
          total_assignments: 8,
          completed_assignments: 8,
          average_score: 95,
          latest_submission: '2024-12-02',
          progress_trend: [90, 92, 94, 95]
        },
        {
          user_id: '4',
          full_name: 'Jasmine Brown',
          voice_part: 'Alto 1',
          total_assignments: 8,
          completed_assignments: 5,
          average_score: 84,
          latest_submission: '2024-11-25',
          progress_trend: [78, 80, 82, 84]
        }
      ];

      const filteredStudents = selectedVoicePart === 'all' 
        ? mockStudents 
        : mockStudents.filter(s => s.voice_part === selectedVoicePart);

      setStudents(filteredStudents);
      
      // Calculate stats
      const totalStudents = filteredStudents.length;
      const averageCompletion = filteredStudents.reduce((sum, s) => 
        sum + (s.completed_assignments / s.total_assignments * 100), 0) / totalStudents || 0;
      const averageScore = filteredStudents.reduce((sum, s) => sum + s.average_score, 0) / totalStudents || 0;
      
      setStats({
        totalStudents,
        averageCompletion: Math.round(averageCompletion),
        averageScore: Math.round(averageScore),
        assignmentsDue: 3 // Mock value
      });

    } catch (error) {
      console.error('Error fetching student progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getCompletionColor = (completion: number) => {
    if (completion >= 90) return 'bg-green-500';
    if (completion >= 70) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (loading) {
    return <div className="text-center py-8">Loading student progress...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Student Progress Tracking</h3>
          <p className="text-sm text-muted-foreground">
            Monitor sight reading progress across all students
          </p>
        </div>
        
        <Select value={selectedVoicePart} onValueChange={setSelectedVoicePart}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by voice part" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Voice Parts</SelectItem>
            <SelectItem value="Soprano 1">Soprano 1</SelectItem>
            <SelectItem value="Soprano 2">Soprano 2</SelectItem>
            <SelectItem value="Alto 1">Alto 1</SelectItem>
            <SelectItem value="Alto 2">Alto 2</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center">
              <Users className="h-4 w-4 text-blue-500 mr-2" />
              <div className="text-2xl font-bold">{stats.totalStudents}</div>
            </div>
            <div className="text-sm text-muted-foreground">Active Students</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center">
              <TrendingUp className="h-4 w-4 text-green-500 mr-2" />
              <div className="text-2xl font-bold">{stats.averageCompletion}%</div>
            </div>
            <div className="text-sm text-muted-foreground">Avg Completion</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center">
              <Award className="h-4 w-4 text-purple-500 mr-2" />
              <div className="text-2xl font-bold">{stats.averageScore}%</div>
            </div>
            <div className="text-sm text-muted-foreground">Avg Score</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center">
              <Clock className="h-4 w-4 text-orange-500 mr-2" />
              <div className="text-2xl font-bold">{stats.assignmentsDue}</div>
            </div>
            <div className="text-sm text-muted-foreground">Due This Week</div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Average Progress Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={mockProgressData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="average" 
                  stroke="#8884d8" 
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance by Voice Part</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={mockVoicePartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="voicePart" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="average" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Student List */}
      <Card>
        <CardHeader>
          <CardTitle>Individual Student Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {students.map((student) => {
              const completionRate = (student.completed_assignments / student.total_assignments) * 100;
              return (
                <div key={student.user_id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-medium">{student.full_name}</h4>
                      <Badge variant="outline" className="mt-1">
                        {student.voice_part}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-bold ${getScoreColor(student.average_score)}`}>
                        {student.average_score}%
                      </div>
                      <div className="text-sm text-muted-foreground">Avg Score</div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Assignment Completion</span>
                      <span>{student.completed_assignments}/{student.total_assignments}</span>
                    </div>
                    <Progress 
                      value={completionRate} 
                      className="h-2"
                    />
                  </div>
                  
                  <div className="flex justify-between items-center mt-3 text-sm text-muted-foreground">
                    <span>
                      Last submission: {new Date(student.latest_submission).toLocaleDateString()}
                    </span>
                    <span>
                      {Math.round(completionRate)}% complete
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};