import React, { useEffect, useState } from 'react';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, TrendingUp, Users, CheckCircle, Clock } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { StudentAssignmentSubmission } from '@/hooks/useStudentAssignmentSubmissions';

interface SubmissionStats {
  totalSubmissions: number;
  gradedSubmissions: number;
  averageGrade: number;
  submissionsByAssignment: { name: string; count: number }[];
  gradeDistribution: { range: string; count: number }[];
  submissionStatus: { name: string; value: number }[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export const CourseStatistics: React.FC = () => {
  const [stats, setStats] = useState<SubmissionStats | null>(null);
  const [allSubmissions, setAllSubmissions] = useState<StudentAssignmentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { isAdmin, loading: roleLoading } = useUserRole();

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      setLoading(true);

      // Fetch all submissions with full details
      const { data: submissions, error } = await supabase
        .from('assignment_submissions')
        .select('*')
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      
      // Set all submissions for the table
      setAllSubmissions(submissions || []);

      if (!submissions) {
        setStats({
          totalSubmissions: 0,
          gradedSubmissions: 0,
          averageGrade: 0,
          submissionsByAssignment: [],
          gradeDistribution: [],
          submissionStatus: []
        });
        return;
      }

      // Calculate statistics
      const totalSubmissions = submissions.length;
      const gradedSubmissions = submissions.filter(s => s.status === 'graded').length;
      const grades = submissions.filter(s => s.grade !== null).map(s => Number(s.grade));
      const averageGrade = grades.length > 0 
        ? grades.reduce((a, b) => a + b, 0) / grades.length 
        : 0;

      // Group by assignment
      const assignmentCounts = submissions.reduce((acc, sub) => {
        acc[sub.assignment_id] = (acc[sub.assignment_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const submissionsByAssignment = Object.entries(assignmentCounts)
        .map(([name, count]) => ({ 
          name: name.toUpperCase(), 
          count 
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Grade distribution
      const gradeRanges = [
        { range: 'A (18-20)', min: 18, max: 20 },
        { range: 'B (15-17)', min: 15, max: 17 },
        { range: 'C (12-14)', min: 12, max: 14 },
        { range: 'D (9-11)', min: 9, max: 11 },
        { range: 'F (0-8)', min: 0, max: 8 }
      ];

      const gradeDistribution = gradeRanges.map(range => ({
        range: range.range,
        count: grades.filter(g => g >= range.min && g <= range.max).length
      }));

      // Submission status
      const statusCounts = submissions.reduce((acc, sub) => {
        acc[sub.status] = (acc[sub.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const submissionStatus = Object.entries(statusCounts).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value
      }));

      setStats({
        totalSubmissions,
        gradedSubmissions,
        averageGrade: Math.round(averageGrade * 100) / 100,
        submissionsByAssignment,
        gradeDistribution,
        submissionStatus
      });

    } catch (error) {
      console.error('Error fetching statistics:', error);
      toast({
        title: "Error",
        description: "Failed to load course statistics",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (roleLoading) {
    return (
      <UniversalLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </UniversalLayout>
    );
  }

  if (!isAdmin()) {
    return <Navigate to="/classes/mus240" replace />;
  }

  if (loading || !stats) {
    return (
      <UniversalLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </UniversalLayout>
    );
  }

  return (
    <UniversalLayout>
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            MUS 240 Course Statistics
          </h1>
          <p className="text-muted-foreground text-lg">
            Analytics and insights on student assignment submissions and performance
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSubmissions}</div>
              <p className="text-xs text-muted-foreground">All time submissions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Graded</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.gradedSubmissions}</div>
              <p className="text-xs text-muted-foreground">
                {stats.totalSubmissions > 0 
                  ? `${Math.round((stats.gradedSubmissions / stats.totalSubmissions) * 100)}% graded`
                  : 'No submissions yet'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Grade</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.averageGrade.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground">Out of 20 points</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.totalSubmissions - stats.gradedSubmissions}
              </div>
              <p className="text-xs text-muted-foreground">Awaiting grading</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Submissions by Assignment */}
          <Card>
            <CardHeader>
              <CardTitle>Submissions by Assignment</CardTitle>
              <CardDescription>Top 10 assignments by submission count</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.submissionsByAssignment}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#8884d8" name="Submissions" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Submission Status */}
          <Card>
            <CardHeader>
              <CardTitle>Submission Status</CardTitle>
              <CardDescription>Distribution of submission states</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={stats.submissionStatus}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {stats.submissionStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Grade Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Grade Distribution</CardTitle>
            <CardDescription>How students are performing across all assignments</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.gradeDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#00C49F" name="Number of Students" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* All Submissions Table */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>All Submissions</CardTitle>
            <CardDescription>Complete list of student assignment submissions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student ID</TableHead>
                    <TableHead>Assignment</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>File</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allSubmissions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No submissions found
                      </TableCell>
                    </TableRow>
                  ) : (
                    allSubmissions.map((submission) => (
                      <TableRow key={submission.id}>
                        <TableCell className="font-mono text-sm">
                          {submission.student_id.slice(0, 8)}...
                        </TableCell>
                        <TableCell className="font-medium">{submission.assignment_id}</TableCell>
                        <TableCell>{format(new Date(submission.submitted_at), 'MMM d, yyyy HH:mm')}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                            submission.status === 'graded' 
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                          }`}>
                            {submission.status}
                          </span>
                        </TableCell>
                        <TableCell>
                          {submission.grade !== null ? (
                            <span className="font-semibold">{submission.grade}/20</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {submission.file_url ? (
                            <a 
                              href={submission.file_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-primary hover:underline text-sm"
                            >
                              {submission.file_name || 'View file'}
                            </a>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </UniversalLayout>
  );
};

export default CourseStatistics;
