import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { BookOpen, TrendingUp, Users, CheckCircle2, Clock, Award, FileText } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface JournalStats {
  totalSubmissions: number;
  totalGraded: number;
  avgScore: number;
  aiGraded: number;
  instructorGraded: number;
  submissionsByAssignment: { assignment_id: string; count: number; avgScore: number }[];
  studentSubmissionCounts: { student_id: string; student_name: string; count: number; avgScore: number }[];
  recentSubmissions: any[];
}

export const JournalSubmissionAnalytics: React.FC = () => {
  const [stats, setStats] = useState<JournalStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJournalStats();
  }, []);

  const fetchJournalStats = async () => {
    try {
      setLoading(true);

      // Fetch all published journal entries with grades
      const { data: journals, error: journalsError } = await supabase
        .from('mus240_journal_entries')
        .select('*, mus240_journal_grades(*), gw_profiles(full_name)')
        .eq('is_published', true);

      if (journalsError) throw journalsError;

      // Fetch all grades separately for better analysis
      const { data: grades, error: gradesError } = await supabase
        .from('mus240_journal_grades')
        .select('*');

      if (gradesError) throw gradesError;

      // Calculate stats
      const totalSubmissions = journals?.length || 0;
      const totalGraded = grades?.length || 0;
      
      const aiGraded = grades?.filter(g => 
        g.instructor_score === null || g.instructor_score === undefined
      ).length || 0;
      
      const instructorGraded = grades?.filter(g => 
        g.instructor_score !== null && g.instructor_score !== undefined
      ).length || 0;

      const avgScore = grades?.length 
        ? grades.reduce((sum, g) => {
            const score = g.instructor_score ?? g.overall_score ?? 0;
            return sum + score;
          }, 0) / grades.length
        : 0;

      // Group by assignment
      const assignmentMap = new Map();
      journals?.forEach(j => {
        const grade = (j as any).mus240_journal_grades?.[0];
        const score = grade?.instructor_score ?? grade?.overall_score ?? 0;
        
        if (!assignmentMap.has(j.assignment_id)) {
          assignmentMap.set(j.assignment_id, { count: 0, totalScore: 0 });
        }
        const current = assignmentMap.get(j.assignment_id);
        assignmentMap.set(j.assignment_id, {
          count: current.count + 1,
          totalScore: current.totalScore + score
        });
      });

      const submissionsByAssignment = Array.from(assignmentMap.entries()).map(([id, data]) => ({
        assignment_id: id,
        count: data.count,
        avgScore: data.count > 0 ? data.totalScore / data.count : 0
      })).sort((a, b) => a.assignment_id.localeCompare(b.assignment_id));

      // Group by student
      const studentMap = new Map();
      journals?.forEach(j => {
        const profile = (j as any).gw_profiles;
        const grade = (j as any).mus240_journal_grades?.[0];
        const score = grade?.instructor_score ?? grade?.overall_score ?? 0;
        
        if (!studentMap.has(j.student_id)) {
          studentMap.set(j.student_id, {
            student_name: profile?.full_name || 'Unknown',
            count: 0,
            totalScore: 0
          });
        }
        const current = studentMap.get(j.student_id);
        studentMap.set(j.student_id, {
          ...current,
          count: current.count + 1,
          totalScore: current.totalScore + score
        });
      });

      const studentSubmissionCounts = Array.from(studentMap.entries())
        .map(([id, data]) => ({
          student_id: id,
          student_name: data.student_name,
          count: data.count,
          avgScore: data.count > 0 ? data.totalScore / data.count : 0
        }))
        .sort((a, b) => b.count - a.count);

      // Get 10 most recent submissions
      const recentSubmissions = journals
        ?.sort((a, b) => new Date(b.published_at || b.created_at).getTime() - 
                         new Date(a.published_at || a.created_at).getTime())
        .slice(0, 10) || [];

      setStats({
        totalSubmissions,
        totalGraded,
        avgScore,
        aiGraded,
        instructorGraded,
        submissionsByAssignment,
        studentSubmissionCounts,
        recentSubmissions
      });
    } catch (error) {
      console.error('Error fetching journal stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="text-center text-muted-foreground py-8">Loading analytics...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="space-y-4">
        <div className="text-center text-muted-foreground py-8">No data available</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSubmissions}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalGraded} graded ({Math.round((stats.totalGraded / stats.totalSubmissions) * 100)}%)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgScore.toFixed(1)}/20</div>
            <p className="text-xs text-muted-foreground">
              {((stats.avgScore / 20) * 100).toFixed(0)}% average
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Graded</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.aiGraded}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round((stats.aiGraded / stats.totalGraded) * 100)}% of graded
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Instructor Graded</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.instructorGraded}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round((stats.instructorGraded / stats.totalGraded) * 100)}% of graded
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Submissions by Assignment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Submissions by Assignment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.submissionsByAssignment.map((assignment) => (
              <div key={assignment.assignment_id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{assignment.assignment_id.toUpperCase()}</span>
                    <Badge variant="outline">{assignment.count} submissions</Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    Avg: {assignment.avgScore.toFixed(1)}/20
                  </span>
                </div>
                <Progress value={(assignment.avgScore / 20) * 100} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Student Submission Counts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Student Submission Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {stats.studentSubmissionCounts.map((student) => (
              <div key={student.student_id} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex-1">
                  <p className="font-medium">{student.student_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {student.count} journals • Avg: {student.avgScore.toFixed(1)}/20
                  </p>
                </div>
                <Badge variant={student.count >= 10 ? "default" : "secondary"}>
                  {student.count}/10
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Submissions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Submissions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.recentSubmissions.map((submission: any) => {
              const grade = submission.mus240_journal_grades?.[0];
              const profile = submission.gw_profiles;
              return (
                <div key={submission.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">{submission.assignment_id.toUpperCase()}</p>
                    <p className="text-sm text-muted-foreground">
                      {profile?.full_name || 'Unknown'} • {new Date(submission.published_at || submission.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {grade && (
                    <Badge variant={grade.instructor_score !== null ? "default" : "secondary"}>
                      {(grade.instructor_score ?? grade.overall_score ?? 0).toFixed(1)}/20
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
