import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, Download, TrendingUp, Users, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface GradeData {
  student_name: string;
  student_email: string;
  assignment_title: string;
  overall_score: number;
  letter_grade: string;
  graded_at: string;
  rubric_scores: any[];
}

export const GradesAdmin = () => {
  const [grades, setGrades] = useState<GradeData[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAssignment, setFilterAssignment] = useState('all');
  const [stats, setStats] = useState({
    totalGrades: 0,
    averageScore: 0,
    gradeDistribution: {} as Record<string, number>
  });

  useEffect(() => {
    fetchGrades();
    fetchAssignments();
  }, []);

  useEffect(() => {
    calculateStats();
  }, [grades, filterAssignment]);

  const fetchGrades = async () => {
    try {
      const { data, error } = await supabase
        .from('mus240_journal_grades')
        .select('*')
        .order('graded_at', { ascending: false });

      if (error) throw error;

      // Fetch related data for each grade
      const formattedGrades = await Promise.all(
        (data || []).map(async (grade) => {
          // Get journal entry
          const { data: journalData } = await supabase
            .from('mus240_journal_entries')
            .select('assignment_id, student_id')
            .eq('id', grade.journal_id)
            .single();

          // Get user profile
          const { data: profileData } = await supabase
            .from('gw_profiles')
            .select('full_name, email')
            .eq('user_id', journalData?.student_id)
            .single();

          // Get assignment
          const { data: assignmentData } = await supabase
            .from('mus240_assignments')
            .select('title')
            .eq('id', journalData?.assignment_id)
            .single();

          return {
            student_name: profileData?.full_name || 'Unknown',
            student_email: profileData?.email || '',
            assignment_title: assignmentData?.title || 'Unknown Assignment',
            overall_score: grade.overall_score,
            letter_grade: grade.letter_grade,
            graded_at: grade.graded_at,
            rubric_scores: []
          };
        })
      );

      setGrades(formattedGrades);
    } catch (error) {
      console.error('Error fetching grades:', error);
      toast.error('Failed to load grades');
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from('mus240_assignments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAssignments(data || []);
    } catch (error) {
      console.error('Error fetching assignments:', error);
    }
  };

  const calculateStats = () => {
    let filteredGrades = grades;
    
    if (filterAssignment !== 'all') {
      const assignment = assignments.find(a => a.id === filterAssignment);
      if (assignment) {
        filteredGrades = grades.filter(g => g.assignment_title === assignment.title);
      }
    }

    const totalGrades = filteredGrades.length;
    const averageScore = totalGrades > 0 
      ? filteredGrades.reduce((sum, grade) => sum + grade.overall_score, 0) / totalGrades
      : 0;

    const gradeDistribution = filteredGrades.reduce((dist, grade) => {
      dist[grade.letter_grade] = (dist[grade.letter_grade] || 0) + 1;
      return dist;
    }, {} as Record<string, number>);

    setStats({ totalGrades, averageScore, gradeDistribution });
  };

  const exportGrades = () => {
    // Simple CSV export
    const csv = [
      ['Student Name', 'Email', 'Assignment', 'Score', 'Letter Grade', 'Graded Date'].join(','),
      ...grades.map(grade => [
        grade.student_name,
        grade.student_email,
        grade.assignment_title,
        grade.overall_score,
        grade.letter_grade,
        new Date(grade.graded_at).toLocaleDateString()
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mus240_grades.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success('Grades exported successfully');
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getLetterGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'bg-green-100 text-green-800';
      case 'B': return 'bg-blue-100 text-blue-800';
      case 'C': return 'bg-yellow-100 text-yellow-800';
      case 'D': return 'bg-orange-100 text-orange-800';
      case 'F': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div>Loading grades...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Grades Overview</h2>
          <p className="text-gray-600">View and analyze student performance</p>
        </div>
        <div className="flex gap-2">
          <Select value={filterAssignment} onValueChange={setFilterAssignment}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by assignment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Assignments</SelectItem>
              {assignments.map((assignment) => (
                <SelectItem key={assignment.id} value={assignment.id}>
                  {assignment.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={exportGrades} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Grades</p>
                <p className="text-2xl font-bold">{stats.totalGrades}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Average Score</p>
                <p className={`text-2xl font-bold ${getScoreColor(stats.averageScore)}`}>
                  {stats.averageScore.toFixed(1)}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">A Grades</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.gradeDistribution['A'] || 0}
                </p>
              </div>
              <Trophy className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Unique Students</p>
                <p className="text-2xl font-bold">
                  {new Set(grades.map(g => g.student_email)).size}
                </p>
              </div>
              <Users className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grade Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Grade Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            {Object.entries(stats.gradeDistribution).map(([grade, count]) => (
              <Badge key={grade} className={getLetterGradeColor(grade)}>
                {grade}: {count}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Grades */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Grades</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {grades.slice(0, 10).map((grade, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <p className="font-medium">{grade.student_name}</p>
                  <p className="text-sm text-gray-600">{grade.assignment_title}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className={`font-bold ${getScoreColor(grade.overall_score)}`}>
                      {grade.overall_score}%
                    </p>
                    <p className="text-sm text-gray-600">
                      {new Date(grade.graded_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge className={getLetterGradeColor(grade.letter_grade)}>
                    {grade.letter_grade}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {grades.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No grades yet</h3>
            <p className="text-gray-600">Grades will appear here once you start grading journal entries.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};