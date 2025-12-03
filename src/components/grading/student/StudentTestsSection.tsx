import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileCheck, Clock, CheckCircle, RotateCcw, Play } from 'lucide-react';
import { format } from 'date-fns';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

interface TestSubmission {
  id: string;
  test_id: string;
  student_id: string;
  score: number | null;
  total_points: number | null;
  percentage: number | null;
  status: string;
  attempt_number: number | null;
  started_at: string | null;
  submitted_at: string | null;
}

interface TestWithSubmission {
  id: string;
  title: string;
  description: string | null;
  total_points: number;
  passing_score: number;
  is_published: boolean;
  allow_retakes: boolean;
  duration_minutes: number | null;
  course_id: string;
  course_code?: string;
  course_name?: string;
  submission?: TestSubmission;
}

export const StudentTestsSection: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: testsWithSubmissions, isLoading } = useQuery({
    queryKey: ['student-tests-with-submissions', user?.id],
    queryFn: async () => {
      // First get enrolled courses
      const { data: enrollments, error: enrollError } = await supabase
        .from('gw_enrollments' as any)
        .select('course_id, gw_courses(id, course_code, course_name)')
        .eq('student_id', user?.id);

      if (enrollError) throw enrollError;
      if (!enrollments || enrollments.length === 0) return [];

      const courseIds = enrollments.map((e: any) => e.course_id);
      const courseMap = new Map(enrollments.map((e: any) => [e.course_id, e.gw_courses]));

      // Get published tests for enrolled courses
      const { data: tests, error: testsError } = await supabase
        .from('glee_academy_tests')
        .select('*')
        .in('course_id', courseIds)
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (testsError) throw testsError;
      if (!tests || tests.length === 0) return [];

      // Get student's submissions for these tests
      const testIds = tests.map(t => t.id);
      const { data: submissions, error: subError } = await supabase
        .from('test_submissions')
        .select('*')
        .eq('student_id', user?.id)
        .in('test_id', testIds);

      if (subError) throw subError;

      // Create a map of test_id to latest submission
      const submissionMap = new Map<string, TestSubmission>();
      submissions?.forEach((sub: any) => {
        const existing = submissionMap.get(sub.test_id);
        if (!existing || (sub.attempt_number || 1) > (existing.attempt_number || 1)) {
          submissionMap.set(sub.test_id, sub);
        }
      });

      // Combine tests with their submissions
      return tests.map((test: any) => {
        const course = courseMap.get(test.course_id) as any;
        return {
          ...test,
          course_code: course?.course_code,
          course_name: course?.course_name,
          submission: submissionMap.get(test.id),
        } as TestWithSubmission;
      });
    },
    enabled: !!user,
  });

  if (isLoading) {
    return <LoadingSpinner size="md" text="Loading tests..." />;
  }

  if (!testsWithSubmissions || testsWithSubmissions.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <FileCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No tests available yet.</p>
        </CardContent>
      </Card>
    );
  }

  const getScoreBadge = (submission: TestSubmission | undefined, passingScore: number) => {
    if (!submission || submission.status === 'in_progress') {
      return (
        <Badge variant="secondary">
          <Clock className="h-3 w-3 mr-1" />
          Not Completed
        </Badge>
      );
    }

    const percentage = submission.percentage || 0;
    const passed = percentage >= passingScore;

    return (
      <Badge variant={passed ? 'default' : 'destructive'}>
        <CheckCircle className="h-3 w-3 mr-1" />
        {percentage.toFixed(0)}%
      </Badge>
    );
  };

  const getActionButton = (test: TestWithSubmission) => {
    const submission = test.submission;

    if (!submission) {
      return (
        <Button onClick={() => navigate(`/test/${test.id}`)} className="w-full">
          <Play className="h-4 w-4 mr-2" />
          Take Test
        </Button>
      );
    }

    if (submission.status === 'in_progress') {
      return (
        <Button onClick={() => navigate(`/test/${test.id}`)} className="w-full">
          <Play className="h-4 w-4 mr-2" />
          Continue Test
        </Button>
      );
    }

    if (test.allow_retakes) {
      return (
        <Button onClick={() => navigate(`/test/${test.id}`)} variant="outline" className="w-full">
          <RotateCcw className="h-4 w-4 mr-2" />
          Retake Test
        </Button>
      );
    }

    return (
      <Button variant="outline" disabled className="w-full">
        Completed
      </Button>
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {testsWithSubmissions.map((test) => (
          <Card key={test.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base sm:text-lg truncate flex items-center gap-2">
                    <FileCheck className="h-4 w-4 flex-shrink-0 text-primary" />
                    {test.title}
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm mt-1">
                    {test.course_code} - {test.course_name}
                  </CardDescription>
                </div>
                {getScoreBadge(test.submission, test.passing_score)}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {test.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">{test.description}</p>
              )}
              
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span>{test.total_points} points</span>
                {test.duration_minutes && (
                  <>
                    <span>•</span>
                    <span>{test.duration_minutes} min</span>
                  </>
                )}
                {test.allow_retakes && (
                  <>
                    <span>•</span>
                    <span>Retakes allowed</span>
                  </>
                )}
              </div>

              {test.submission?.submitted_at && (
                <p className="text-xs text-muted-foreground">
                  Last attempt: {format(new Date(test.submission.submitted_at), 'MMM d, yyyy h:mm a')}
                </p>
              )}

              {test.submission?.score !== undefined && test.submission?.score !== null && (
                <div className="flex justify-between text-sm">
                  <span>Score:</span>
                  <span className="font-semibold">
                    {test.submission.score}/{test.submission.total_points}
                  </span>
                </div>
              )}

              {getActionButton(test)}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
