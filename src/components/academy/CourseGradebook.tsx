import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Trophy, Lock, TrendingUp, BookOpen, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface CourseGradebookProps {
  courseId: string;
  isEnrolled: boolean;
}

interface GradeData {
  totalPoints: number;
  earnedPoints: number;
  percentage: number;
  letterGrade: string;
  assignments: {
    title: string;
    points: number;
    earned: number | null;
    status: string;
  }[];
}

export const CourseGradebook: React.FC<CourseGradebookProps> = ({ courseId, isEnrolled }) => {
  const { user } = useAuth();
  const [gradeData, setGradeData] = useState<GradeData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isEnrolled && user) {
      fetchGrades();
    } else {
      setLoading(false);
    }
  }, [courseId, isEnrolled, user]);

  const fetchGrades = async () => {
    try {
      // Fetch all published assignments
      const { data: assignments } = await supabase
        .from('gw_course_assignments')
        .select('id, title, points')
        .eq('course_id', courseId)
        .eq('is_published', true);

      if (!assignments || assignments.length === 0) {
        setGradeData(null);
        setLoading(false);
        return;
      }

      // Fetch submissions
      const { data: submissions } = await supabase
        .from('gw_course_submissions')
        .select('assignment_id, grade, status')
        .eq('student_id', user?.id)
        .in('assignment_id', assignments.map(a => a.id));

      const submissionMap = new Map(submissions?.map(s => [s.assignment_id, s]) || []);

      let totalPoints = 0;
      let earnedPoints = 0;

      const gradeItems = assignments.map(assignment => {
        const submission = submissionMap.get(assignment.id);
        totalPoints += assignment.points;
        
        const earned = submission?.grade || null;
        if (earned !== null) {
          earnedPoints += earned;
        }

        return {
          title: assignment.title,
          points: assignment.points,
          earned,
          status: submission?.status || 'not_started'
        };
      });

      const percentage = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;
      const letterGrade = getLetterGrade(percentage);

      setGradeData({
        totalPoints,
        earnedPoints,
        percentage,
        letterGrade,
        assignments: gradeItems
      });
    } catch (error) {
      console.error('Error fetching grades:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLetterGrade = (percentage: number): string => {
    if (percentage >= 93) return 'A';
    if (percentage >= 90) return 'A-';
    if (percentage >= 87) return 'B+';
    if (percentage >= 83) return 'B';
    if (percentage >= 80) return 'B-';
    if (percentage >= 77) return 'C+';
    if (percentage >= 73) return 'C';
    if (percentage >= 70) return 'C-';
    if (percentage >= 67) return 'D+';
    if (percentage >= 63) return 'D';
    if (percentage >= 60) return 'D-';
    return 'F';
  };

  const getGradeColor = (grade: string): string => {
    if (grade.startsWith('A')) return 'text-green-600';
    if (grade.startsWith('B')) return 'text-blue-600';
    if (grade.startsWith('C')) return 'text-yellow-600';
    if (grade.startsWith('D')) return 'text-orange-600';
    return 'text-red-600';
  };

  if (!isEnrolled) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Lock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Gradebook</h3>
          <p className="text-muted-foreground">
            Enroll in this course to view your grades.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Grade Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Current Grade
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : gradeData ? (
              <div>
                <div className={`text-4xl font-bold ${getGradeColor(gradeData.letterGrade)}`}>
                  {gradeData.letterGrade}
                </div>
                <p className="text-lg text-muted-foreground">
                  {gradeData.percentage.toFixed(1)}%
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground">No grades yet</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Points Earned
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : gradeData ? (
              <div>
                <div className="text-4xl font-bold">{gradeData.earnedPoints}</div>
                <p className="text-sm text-muted-foreground">
                  of {gradeData.totalPoints} possible
                </p>
                <Progress 
                  value={gradeData.percentage} 
                  className="mt-2" 
                />
              </div>
            ) : (
              <p className="text-muted-foreground">No assignments graded</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Assignments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : gradeData ? (
              <div>
                <div className="text-4xl font-bold">
                  {gradeData.assignments.filter(a => a.status === 'graded').length}
                </div>
                <p className="text-sm text-muted-foreground">
                  of {gradeData.assignments.length} graded
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground">No assignments</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Grade Details */}
      <Card>
        <CardHeader>
          <CardTitle>Assignment Grades</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-4">Loading grades...</p>
          ) : !gradeData || gradeData.assignments.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No graded assignments yet.
            </p>
          ) : (
            <div className="space-y-3">
              {gradeData.assignments.map((assignment, i) => (
                <div 
                  key={i}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {assignment.earned !== null ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-muted-foreground" />
                    )}
                    <span className="font-medium">{assignment.title}</span>
                  </div>
                  <div className="text-right">
                    {assignment.earned !== null ? (
                      <span className="font-semibold">
                        {assignment.earned}/{assignment.points}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—/{assignment.points}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
