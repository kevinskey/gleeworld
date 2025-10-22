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
  feedback: string;
  rubric_scores: any[];
  type: 'journal' | 'midterm';
  midterm_details?: any[];
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
      // Fetch journal grades
      const { data: journalGrades, error: journalError } = await supabase
        .from('mus240_journal_grades')
        .select('*')
        .order('graded_at', { ascending: false });

      if (journalError) throw journalError;

      // Fetch midterm grades
      const { data: midtermGrades, error: midtermError } = await supabase
        .from('mus240_midterm_submissions')
        .select('*')
        .eq('is_submitted', true)
        .order('submitted_at', { ascending: false });

      if (midtermError) throw midtermError;

      // Fetch related data for journal grades
      const formattedJournalGrades = await Promise.all(
        (journalGrades || []).map(async (grade) => {
          // Get user profile
          const { data: profileData } = await supabase
            .from('gw_profiles')
            .select('full_name, email')
            .eq('user_id', grade.student_id)
            .single();

          return {
            student_name: profileData?.full_name || 'Unknown',
            student_email: profileData?.email || '',
            assignment_title: `Journal ${grade.journal_id}`,
            overall_score: grade.overall_score || 0,
            letter_grade: grade.letter_grade || 'N/A',
            graded_at: grade.graded_at,
            feedback: grade.ai_feedback || grade.instructor_feedback || '',
            rubric_scores: [],
            type: 'journal' as const
          };
        })
      );

      // Compute midterm raw scores from per-question grades if submission.grade is null
      const submissionIds = (midtermGrades || []).map((s: any) => s.id);
      const midtermScoreBySubmission = new Map<string, number>();
      const midtermDetailsBySubmission = new Map<string, any[]>();

      if (submissionIds.length > 0) {
        // Latest per-question grades
        const { data: submissionGradeRows, error: submissionGradesError } = await supabase
          .from('mus240_submission_grades')
          .select('submission_id, question_type, question_id, ai_score, instructor_score, ai_feedback, rubric_breakdown, created_at')
          .in('submission_id', submissionIds)
          .order('created_at', { ascending: false });
        if (submissionGradesError) throw submissionGradesError;

        // Build latest grade per question for each submission
        const bySubmission = new Map<string, Map<string, any>>();
        (submissionGradeRows || []).forEach((g: any) => {
          if (!bySubmission.has(g.submission_id)) bySubmission.set(g.submission_id, new Map());
          const m = bySubmission.get(g.submission_id)!;
          const key = `${g.question_type}:${g.question_id}`;
          if (!m.has(key)) m.set(key, g); // keep latest due to order desc
        });

        // Compute raw score (out of 90) for each submission and collect details
        bySubmission.forEach((qMap, submissionId) => {
          let score = 0;
          const details: any[] = [];
          qMap.forEach((g) => {
            const received = Number(g.instructor_score ?? g.ai_score ?? 0);
            if (!isFinite(received)) return;
            score += received;
            
            // Parse rubric breakdown
            let breakdown = {};
            try {
              breakdown = typeof g.rubric_breakdown === 'string' 
                ? JSON.parse(g.rubric_breakdown) 
                : g.rubric_breakdown || {};
            } catch (e) {
              console.error('Error parsing rubric breakdown:', e);
            }
            
            details.push({
              question_id: g.question_id,
              question_type: g.question_type,
              score: received,
              feedback: g.ai_feedback,
              breakdown
            });
          });
          midtermScoreBySubmission.set(submissionId, Math.round(score));
          midtermDetailsBySubmission.set(submissionId, details);
        });
      }

      // Fetch related data for midterm grades
      const formattedMidtermGrades = await Promise.all(
        (midtermGrades || []).map(async (submission) => {
          // Get user profile
          const { data: profileData } = await supabase
            .from('gw_profiles')
            .select('full_name, email')
            .eq('user_id', submission.user_id)
            .single();

          const computed = midtermScoreBySubmission.get(submission.id) ?? 0;
          const overall = submission.grade ?? computed;
          const details = midtermDetailsBySubmission.get(submission.id) || [];

          return {
            student_name: profileData?.full_name || 'Unknown',
            student_email: profileData?.email || '',
            assignment_title: 'Midterm Exam',
            overall_score: overall || 0,
            letter_grade: getLetterGradeFromScore(overall || 0),
            graded_at: submission.graded_at || submission.submitted_at,
            feedback: submission.feedback || '',
            rubric_scores: details,
            type: 'midterm' as const,
            midterm_details: details
          };
        })
      );

      // Combine and sort all grades
      const allGrades = [...formattedJournalGrades, ...formattedMidtermGrades]
        .sort((a, b) => new Date(b.graded_at).getTime() - new Date(a.graded_at).getTime());

      setGrades(allGrades);
    } catch (error) {
      console.error('Error fetching grades:', error);
      toast.error('Failed to load grades');
    } finally {
      setLoading(false);
    }
  };

  const getLetterGradeFromScore = (score: number): string => {
    // Convert raw score (out of 90 for midterms, out of 100 for journals) to percentage
    // For now, assume midterms are out of 90, journals out of 100
    // This is a simplified approach - ideally we'd pass type info
    const percentage = score > 90 ? score : (score / 90) * 100;
    
    if (percentage >= 97) return 'A+';
    if (percentage >= 93) return 'A';
    if (percentage >= 90) return 'A-';
    if (percentage >= 87) return 'B+';
    if (percentage >= 83) return 'B';
    if (percentage >= 80) return 'B-';
    if (percentage >= 77) return 'C+';
    if (percentage >= 73) return 'C';
    if (percentage >= 70) return 'C-';
    if (score >= 67) return 'D+';
    if (score >= 63) return 'D';
    if (score >= 60) return 'D-';
    return 'F';
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

  const getScoreColor = (score: number, isMidterm: boolean = false) => {
    const percentage = isMidterm ? (score / 90) * 100 : score;
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 80) return 'text-blue-600';
    if (percentage >= 70) return 'text-yellow-600';
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
                <p className={`text-2xl font-bold ${getScoreColor(stats.averageScore, false)}`}>
                  {stats.averageScore.toFixed(1)}
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
              <div key={index} className="border rounded-lg overflow-hidden">
                <div className="flex items-center justify-between p-3 bg-gray-50">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{grade.student_name}</p>
                      <Badge variant={grade.type === 'midterm' ? 'default' : 'secondary'} className="text-xs">
                        {grade.type === 'midterm' ? 'Midterm' : 'Journal'}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">{grade.assignment_title}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className={`font-bold ${getScoreColor(grade.overall_score, grade.type === 'midterm')}`}>
                        {grade.type === 'midterm' ? `${grade.overall_score}/90` : `${grade.overall_score}%`}
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
                
                {/* Midterm Rubric Breakdown */}
                {grade.type === 'midterm' && grade.midterm_details && grade.midterm_details.length > 0 && (
                  <details className="border-t">
                    <summary className="px-3 py-2 text-sm font-medium text-blue-600 cursor-pointer hover:bg-blue-50">
                      View Detailed Rubric Breakdown ({grade.midterm_details.length} questions)
                    </summary>
                    <div className="p-3 space-y-3 bg-white">
                      {grade.midterm_details.map((detail: any, idx: number) => (
                        <div key={idx} className="border rounded-lg p-3 bg-gray-50">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-medium text-sm capitalize">
                                {detail.question_id.replace(/_/g, ' ')}
                              </p>
                              <p className="text-xs text-gray-500 capitalize">
                                {detail.question_type.replace(/_/g, ' ')}
                              </p>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {detail.score}/10
                            </Badge>
                          </div>
                          
                          {/* Rubric Breakdown */}
                          {detail.breakdown && Object.keys(detail.breakdown).length > 0 && (
                            <div className="grid grid-cols-2 gap-2 mb-2">
                              {Object.entries(detail.breakdown).map(([criterion, data]: [string, any]) => (
                                <div key={criterion} className="bg-white rounded p-2 text-xs">
                                  <div className="flex justify-between items-center">
                                    <span className="text-gray-600 capitalize">
                                      {criterion.replace(/_/g, ' ')}
                                    </span>
                                    <span className="font-medium">
                                      {data.score}/{data.max_points}
                                    </span>
                                  </div>
                                  <div className="mt-1 bg-gray-200 rounded-full h-1.5">
                                    <div 
                                      className="bg-blue-600 h-1.5 rounded-full"
                                      style={{ width: `${(data.score / data.max_points) * 100}%` }}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {/* AI Feedback Snippet */}
                          {detail.feedback && (
                            <details className="mt-2">
                              <summary className="text-xs text-blue-600 cursor-pointer hover:text-blue-800">
                                View AI Feedback
                              </summary>
                              <div className="mt-2 p-2 bg-white rounded text-xs whitespace-pre-wrap">
                                {detail.feedback.length > 300 
                                  ? detail.feedback.substring(0, 300) + '...' 
                                  : detail.feedback}
                              </div>
                            </details>
                          )}
                        </div>
                      ))}
                    </div>
                  </details>
                )}
                
                {/* General Feedback */}
                {grade.feedback && grade.type !== 'midterm' && (
                  <details className="border-t">
                    <summary className="px-3 py-2 text-sm text-blue-600 cursor-pointer hover:bg-blue-50">
                      View AI Feedback
                    </summary>
                    <div className="p-3 bg-white text-sm">
                      {grade.feedback}
                    </div>
                  </details>
                )}
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