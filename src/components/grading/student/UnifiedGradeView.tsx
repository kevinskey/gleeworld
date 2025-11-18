/**
 * Unified Grade View - Student Dashboard
 * Shows all grades across MUS240 and other courses in one place
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { BookOpen, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface UnifiedGrade {
  assignment_id: string;
  assignment_title: string;
  course_code: string;
  score: number | null;
  points_possible: number;
  letter_grade: string | null;
  feedback: string | null;
  graded_at: string | null;
  status: 'graded' | 'pending' | 'submitted' | 'draft';
  is_ai_graded: boolean;
  submitted_at: string | null;
}

export const UnifiedGradeView: React.FC = () => {
  const { user } = useAuth();

  const { data: grades, isLoading } = useQuery({
    queryKey: ['unified-student-grades', user?.id],
    queryFn: async (): Promise<UnifiedGrade[]> => {
      if (!user) return [];

      const allGrades: UnifiedGrade[] = [];

      // Fetch MUS240 grades
      const { data: mus240Entries } = await supabase
        .from('mus240_journal_entries')
        .select(`
          id,
          assignment_id,
          submitted_at,
          mus240_journal_grades(
            overall_score,
            instructor_score,
            letter_grade,
            instructor_letter_grade,
            ai_feedback,
            instructor_feedback,
            graded_at,
            instructor_graded_at,
            ai_model
          )
        `)
        .eq('student_id', user.id);

      // Get assignment details
      const assignmentIds = [...new Set(mus240Entries?.map(e => e.assignment_id) || [])];
      const { data: mus240Assignments } = await supabase
        .from('mus240_assignments')
        .select('id, title, points')
        .in('id', assignmentIds);

      const assignmentMap = new Map(
        mus240Assignments?.map(a => [a.id, { title: a.title, points: a.points }]) || []
      );

      // Process MUS240 entries
      mus240Entries?.forEach(entry => {
        const grade = (entry as any).mus240_journal_grades?.[0];
        const assignment = assignmentMap.get(entry.assignment_id);

        allGrades.push({
          assignment_id: entry.id,
          assignment_title: assignment?.title || 'Journal Entry',
          course_code: 'MUS240',
          score: grade?.instructor_score ?? grade?.overall_score ?? null,
          points_possible: assignment?.points || 10,
          letter_grade: grade?.instructor_letter_grade ?? grade?.letter_grade ?? null,
          feedback: grade?.instructor_feedback ?? grade?.ai_feedback ?? null,
          graded_at: grade?.instructor_graded_at ?? grade?.graded_at ?? null,
          status: grade ? 'graded' : (entry.submitted_at ? 'submitted' : 'draft'),
          is_ai_graded: !!grade?.ai_model && !grade?.instructor_score,
          submitted_at: entry.submitted_at
        });
      });


      // Future: Fetch grades from gw_grades when implemented
      // For now, only showing MUS240 grades

      // Sort by graded_at descending (most recent first)
      return allGrades.sort((a, b) => {
        if (!a.graded_at && !b.graded_at) return 0;
        if (!a.graded_at) return 1;
        if (!b.graded_at) return -1;
        return new Date(b.graded_at).getTime() - new Date(a.graded_at).getTime();
      });
    },
    enabled: !!user
  });

  if (isLoading) {
    return <LoadingSpinner size="lg" text="Loading your grades..." />;
  }

  const gradedCount = grades?.filter(g => g.status === 'graded').length || 0;
  const totalCount = grades?.length || 0;
  const averageScore = grades && grades.length > 0
    ? grades
        .filter(g => g.score !== null && g.status === 'graded')
        .reduce((sum, g) => sum + ((g.score! / g.points_possible) * 100), 0) / gradedCount || 0
    : 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Assignments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Graded</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{gradedCount}</div>
            <p className="text-sm text-muted-foreground">
              {totalCount > 0 ? `${Math.round((gradedCount / totalCount) * 100)}%` : '0%'} complete
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Average Grade</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{averageScore.toFixed(1)}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Grades List */}
      <Card>
        <CardHeader>
          <CardTitle>All Grades</CardTitle>
          <CardDescription>View all your assignment grades across all courses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {grades && grades.length > 0 ? (
              grades.map((grade, index) => (
                <div
                  key={`${grade.course_code}-${grade.assignment_id}-${index}`}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">
                        {grade.course_code}
                      </Badge>
                      <h4 className="font-semibold">{grade.assignment_title}</h4>
                      {grade.is_ai_graded && (
                        <Badge variant="secondary" className="text-xs">AI Graded</Badge>
                      )}
                    </div>
                    {grade.feedback && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {grade.feedback}
                      </p>
                    )}
                    {grade.graded_at && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Graded: {format(new Date(grade.graded_at), 'MMM d, yyyy')}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    {grade.status === 'graded' && grade.score !== null ? (
                      <div className="text-right">
                        <div className="text-2xl font-bold">
                          {grade.score}/{grade.points_possible}
                        </div>
                        {grade.letter_grade && (
                          <div className="text-sm text-muted-foreground">
                            {grade.letter_grade}
                          </div>
                        )}
                      </div>
                    ) : (
                      <Badge variant={grade.status === 'submitted' ? 'default' : 'secondary'}>
                        {grade.status === 'submitted' ? (
                          <>
                            <Clock className="h-3 w-3 mr-1" />
                            Pending
                          </>
                        ) : grade.status === 'draft' ? (
                          <>
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Draft
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            {grade.status}
                          </>
                        )}
                      </Badge>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No assignments yet</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
