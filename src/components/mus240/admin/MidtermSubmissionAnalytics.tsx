import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { FileText, TrendingUp, Users, CheckCircle2, Clock, Award, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { calculateLetterGrade } from '@/utils/grading';

interface MidtermStats {
  totalSubmissions: number;
  totalGraded: number;
  avgScore: number;
  avgPercentage: number;
  submissionsByStudent: { 
    student_id: string; 
    student_name: string; 
    grade: number | null;
    letter_grade: string | null;
    submitted_at: string;
    time_taken: number | null;
  }[];
  gradeDistribution: { grade: string; count: number }[];
  profilesByUserId: Map<string, any>;
}

export const MidtermSubmissionAnalytics: React.FC = () => {
  const [stats, setStats] = useState<MidtermStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMidtermStats();
  }, []);

  const fetchMidtermStats = async () => {
    try {
      setLoading(true);

      // Fetch all midterm submissions
      const { data: submissions, error: submissionsError } = await supabase
        .from('mus240_midterm_submissions')
        .select('*')
        .eq('is_submitted', true);

      if (submissionsError) throw submissionsError;

      // Fetch student profiles
      const studentIds = [...new Set(submissions?.map(s => s.user_id) || [])];
      const { data: profiles, error: profilesError } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name, email')
        .in('user_id', studentIds);

      if (profilesError) throw profilesError;

      // Create lookup map
      const profilesByUserId = new Map(profiles?.map(p => [p.user_id, p]) || []);

      // Calculate stats
      const totalSubmissions = submissions?.length || 0;
      const gradedSubmissions = submissions?.filter(s => s.grade !== null) || [];
      const totalGraded = gradedSubmissions.length;
      
      const avgScore = totalGraded > 0
        ? gradedSubmissions.reduce((sum, s) => sum + (s.grade || 0), 0) / totalGraded
        : 0;
      
      const avgPercentage = avgScore; // Grade is already stored as percentage

      // Build submission list with student info
      const submissionsByStudent = (submissions || []).map(s => {
        const profile = profilesByUserId.get(s.user_id);
        const letterGrade = s.grade !== null ? calculateLetterGrade(s.grade, 100) : null;
        
        return {
          student_id: s.user_id,
          student_name: profile?.full_name || 'Unknown Student',
          grade: s.grade,
          letter_grade: letterGrade,
          submitted_at: s.submitted_at,
          time_taken: s.total_time_minutes
        };
      }).sort((a, b) => {
        if (a.grade === null) return 1;
        if (b.grade === null) return -1;
        return b.grade - a.grade;
      });

      // Calculate grade distribution
      const gradeDistribution = gradedSubmissions.reduce((acc, s) => {
        const letterGrade = calculateLetterGrade(s.grade || 0, 100);
        const existing = acc.find(g => g.grade === letterGrade);
        if (existing) {
          existing.count++;
        } else {
          acc.push({ grade: letterGrade, count: 1 });
        }
        return acc;
      }, [] as { grade: string; count: number }[])
      .sort((a, b) => {
        const order = ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'F'];
        return order.indexOf(a.grade) - order.indexOf(b.grade);
      });

      setStats({
        totalSubmissions,
        totalGraded,
        avgScore,
        avgPercentage,
        submissionsByStudent,
        gradeDistribution,
        profilesByUserId
      });
    } catch (error) {
      console.error('Error fetching midterm stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Clock className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading midterm data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No midterm data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const gradedPercentage = stats.totalSubmissions > 0 
    ? (stats.totalGraded / stats.totalSubmissions) * 100 
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Midterm Exam Analytics</h2>
        <p className="text-muted-foreground">
          Comprehensive overview of midterm submissions and performance
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSubmissions}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Students who submitted
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Graded</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalGraded}</div>
            <Progress value={gradedPercentage} className="mt-2 h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {gradedPercentage.toFixed(1)}% graded
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgScore.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.totalGraded > 0 ? `${calculateLetterGrade(stats.avgScore, 100)} average` : 'No grades yet'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ungraded</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalSubmissions - stats.totalGraded}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Need attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Grade Distribution */}
      {stats.gradeDistribution.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Grade Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              {stats.gradeDistribution.map((dist) => (
                <div key={dist.grade} className="flex items-center gap-2 bg-muted/50 px-3 py-2 rounded-lg">
                  <Badge variant="outline">{dist.grade}</Badge>
                  <span className="text-sm font-medium">{dist.count} student{dist.count !== 1 ? 's' : ''}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Student Submissions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Student Submissions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student Name</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Letter Grade</TableHead>
                <TableHead>Time Taken</TableHead>
                <TableHead>Submitted At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.submissionsByStudent.map((submission) => (
                <TableRow key={submission.student_id}>
                  <TableCell className="font-medium">{submission.student_name}</TableCell>
                  <TableCell>
                    {submission.grade !== null ? (
                      <span className="font-semibold">{submission.grade.toFixed(1)}%</span>
                    ) : (
                      <Badge variant="outline">Not Graded</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {submission.letter_grade ? (
                      <Badge>{submission.letter_grade}</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {submission.time_taken 
                      ? `${Math.floor(submission.time_taken)} min` 
                      : '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(submission.submitted_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
