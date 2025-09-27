import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { 
  Calculator, 
  RefreshCw, 
  TrendingUp, 
  BookOpen, 
  FileText, 
  Music, 
  Award,
  AlertTriangle,
  CheckCircle,
  UserCheck
} from 'lucide-react';
import { GroupParticipationAnalyzer } from './GroupParticipationAnalyzer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface StudentGradeData {
  student_id: string;
  student_name: string;
  student_email: string;
  midterm_score: number | null;
  assignment_scores: Array<{
    assignment_id: string;
    assignment_name: string;
    score: number;
    max_points: number;
  }>;
  journal_scores: Array<{
    journal_id: string;
    score: number;
    max_points: number;
  }>;
  participation_score: number;
  total_points: number;
  total_possible: number;
  percentage: number;
  letter_grade: string;
  semester: string;
}

interface GradeWeights {
  midterm: number;
  assignments: number;
  journals: number;
  participation: number;
}

const DEFAULT_WEIGHTS: GradeWeights = {
  midterm: 25,
  assignments: 40,
  journals: 25,
  participation: 10
};

export const GradeCalculationSystem: React.FC = () => {
  const [semester, setSemester] = useState('Fall 2025');
  const [weights, setWeights] = useState<GradeWeights>(DEFAULT_WEIGHTS);
  const queryClient = useQueryClient();

  const { data: studentGrades, isLoading, refetch } = useQuery({
    queryKey: ['student-grades', semester],
    queryFn: async (): Promise<StudentGradeData[]> => {
      // Get enrolled students for the semester
      const { data: enrollments, error: enrollmentError } = await supabase
        .from('mus240_enrollments')
        .select(`
          student_id,
          semester
        `)
        .eq('semester', semester)
        .eq('enrollment_status', 'enrolled');

      if (enrollmentError) throw enrollmentError;

      const studentIds = enrollments?.map(e => e.student_id) || [];
      if (studentIds.length === 0) return [];

      // Get student profiles
      const { data: profiles, error: profileError } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name, email')
        .in('user_id', studentIds);

      if (profileError) throw profileError;

      // Get midterm scores (manual or finalized)
      const { data: midtermScores, error: midtermError } = await supabase
        .from('mus240_midterm_submissions')
        .select('id, user_id, grade, is_submitted')
        .in('user_id', studentIds)
        .eq('is_submitted', true);

      if (midtermError) throw midtermError;

      // Get assignment submissions and scores
      const { data: assignments, error: assignmentError } = await supabase
        .from('assignment_submissions')
        .select('student_id, assignment_id, grade')
        .in('student_id', studentIds)
        .not('grade', 'is', null);

      if (assignmentError) throw assignmentError;

      // Get journal grades
      const { data: journalGrades, error: journalError } = await supabase
        .from('mus240_journal_grades')
        .select(`
          journal_id,
          overall_score,
          mus240_journal_entries!inner(student_id)
        `)
        .in('mus240_journal_entries.student_id', studentIds);

      if (journalError) throw journalError;

      // Get participation grades
      const { data: participation, error: participationError } = await supabase
        .from('mus240_participation_grades')
        .select('student_id, points_earned')
        .in('student_id', studentIds)
        .eq('semester', semester);

      if (participationError) throw participationError;

      // Get AI/instructor midterm per-question grades (to compute overall when submission.grade is null)
      const submissionIdByUser = new Map<string, string>();
      const userBySubmissionId = new Map<string, string>();
      (midtermScores || []).forEach((m: any) => {
        if (m?.id && m?.user_id) {
          submissionIdByUser.set(m.user_id, m.id);
          userBySubmissionId.set(m.id, m.user_id);
        }
      });
      const submissionIds = Array.from(userBySubmissionId.keys());

      let submissionGrades: any[] = [];
      if (submissionIds.length > 0) {
        const { data: rows, error: submissionGradesError } = await supabase
          .from('mus240_submission_grades')
          .select('submission_id, question_type, question_id, ai_score, instructor_score, rubric_breakdown')
          .in('submission_id', submissionIds);
        if (submissionGradesError) throw submissionGradesError;
        submissionGrades = rows || [];
      }

      // Get rubrics to know max points per question
      const { data: rubrics, error: rubricsError } = await supabase
        .from('mus240_grading_rubrics')
        .select('question_type, question_id, total_points');

      if (rubricsError) throw rubricsError;

      // Build maps for quick lookup
      const rubricMap = new Map<string, number>();
      (rubrics || []).forEach((r: any) => {
        rubricMap.set(`${r.question_type}:${r.question_id}`, Number(r.total_points) || 10);
      });

      // De-duplicate grades by (submission_id, question_id)
      const uniqueByQuestion = new Map<string, any>();
      for (const g of submissionGrades) {
        const key = `${g.submission_id}|${g.question_type}:${g.question_id}`;
        if (!uniqueByQuestion.has(key)) uniqueByQuestion.set(key, g);
      }

      const midtermAggregateByUser = new Map<string, { score: number; possible: number }>();
      Array.from(uniqueByQuestion.values()).forEach((g: any) => {
        const uid = userBySubmissionId.get(g.submission_id);
        if (!uid) return;
        const received = Number(g.instructor_score ?? g.ai_score ?? 0);
        if (!isFinite(received)) return;
        const max = rubricMap.get(`${g.question_type}:${g.question_id}`) ?? 10;
        const agg = midtermAggregateByUser.get(uid) || { score: 0, possible: 0 };
        agg.score += received;
        agg.possible += max;
        midtermAggregateByUser.set(uid, agg);
      });

      const studentGradeData: StudentGradeData[] = [];

      for (const enrollment of enrollments || []) {
        const profile = profiles?.find(p => p.user_id === enrollment.student_id);
        if (!profile) continue;

        // Get midterm score
        const midtermRecord = midtermScores?.find(m => m.user_id === enrollment.student_id);
        const agg = midtermAggregateByUser.get(enrollment.student_id);
        const midtermFromAgg = agg && agg.possible > 0 ? (agg.score / agg.possible) * 100 : null;
        const midtermScore = (midtermRecord?.grade as number | null) ?? midtermFromAgg ?? null;

        // Get assignment scores
        const studentAssignments = assignments?.filter(a => a.student_id === enrollment.student_id) || [];
        const assignmentScores = studentAssignments.map(a => ({
          assignment_id: a.assignment_id,
          assignment_name: a.assignment_id, // You might want to join with assignments table for actual names
          score: a.grade || 0,
          max_points: 100 // Default, you might want to get actual max points from assignments table
        }));

        // Get journal scores
        const studentJournals = journalGrades?.filter(j => 
          (j.mus240_journal_entries as any)?.student_id === enrollment.student_id
        ) || [];
        const journalScores = studentJournals.map(j => ({
          journal_id: j.journal_id,
          score: j.overall_score || 0,
          max_points: 100
        }));

        // Get participation score
        const participationRecord = participation?.find(p => p.student_id === enrollment.student_id);
        const participationScore = participationRecord?.points_earned || 0;

        // Calculate weighted totals
        const midtermPoints = midtermScore ? (midtermScore * weights.midterm / 100) : 0;
        const assignmentPoints = assignmentScores.length > 0 
          ? (assignmentScores.reduce((sum, a) => sum + a.score, 0) / assignmentScores.length) * weights.assignments / 100
          : 0;
        const journalPoints = journalScores.length > 0 
          ? (journalScores.reduce((sum, j) => sum + j.score, 0) / journalScores.length) * weights.journals / 100
          : 0;
        const participationPoints = participationScore * weights.participation / 100;

        const totalPoints = midtermPoints + assignmentPoints + journalPoints + participationPoints;
        const totalPossible = 100;
        const percentage = totalPoints;

        // Calculate letter grade
        const letterGrade = getLetterGrade(percentage);

        studentGradeData.push({
          student_id: enrollment.student_id,
          student_name: profile.full_name || 'Unknown',
          student_email: profile.email || '',
          midterm_score: midtermScore,
          assignment_scores: assignmentScores,
          journal_scores: journalScores,
          participation_score: participationScore,
          total_points: Math.round(totalPoints * 100) / 100,
          total_possible: totalPossible,
          percentage: Math.round(percentage * 100) / 100,
          letter_grade: letterGrade,
          semester: enrollment.semester
        });
      }

      return studentGradeData.sort((a, b) => b.percentage - a.percentage);
    },
  });

  const updateGradeSummaries = useMutation({
    mutationFn: async () => {
      if (!studentGrades) return;

      const updates = studentGrades.map(student => ({
        student_id: student.student_id,
        semester: student.semester,
        assignment_points: student.assignment_scores.reduce((sum, a) => sum + a.score, 0),
        assignment_possible: student.assignment_scores.length * 100,
        participation_points: student.participation_score,
        participation_possible: 100,
        overall_points: student.total_points,
        overall_possible: student.total_possible,
        overall_percentage: student.percentage,
        letter_grade: student.letter_grade,
        calculated_at: new Date().toISOString()
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('mus240_grade_summaries')
          .upsert(update, {
            onConflict: 'student_id,semester'
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Grade summaries updated successfully');
      queryClient.invalidateQueries({ queryKey: ['student-grades'] });
    },
    onError: (error) => {
      console.error('Error updating grade summaries:', error);
      toast.error('Failed to update grade summaries');
    }
  });

  const getLetterGrade = (percentage: number): string => {
    if (percentage >= 97) return 'A+';
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

  const getGradeColor = (letterGrade: string): string => {
    if (letterGrade.startsWith('A')) return 'bg-green-100 text-green-800';
    if (letterGrade.startsWith('B')) return 'bg-blue-100 text-blue-800';
    if (letterGrade.startsWith('C')) return 'bg-yellow-100 text-yellow-800';
    if (letterGrade.startsWith('D')) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  const classStats = studentGrades ? {
    totalStudents: studentGrades.length,
    averageGrade: studentGrades.reduce((sum, s) => sum + s.percentage, 0) / studentGrades.length,
    passingRate: (studentGrades.filter(s => s.percentage >= 70).length / studentGrades.length) * 100,
    gradeDistribution: {
      'A': studentGrades.filter(s => s.letter_grade.startsWith('A')).length,
      'B': studentGrades.filter(s => s.letter_grade.startsWith('B')).length,
      'C': studentGrades.filter(s => s.letter_grade.startsWith('C')).length,
      'D': studentGrades.filter(s => s.letter_grade.startsWith('D')).length,
      'F': studentGrades.filter(s => s.letter_grade === 'F').length,
    }
  } : null;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            MUS240 Grade Calculation System
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading grade data...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="calculate" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="calculate">Calculate Grades</TabsTrigger>
          <TabsTrigger value="analytics">Class Analytics</TabsTrigger>
          <TabsTrigger value="participation">Group Participation</TabsTrigger>
        </TabsList>

        <TabsContent value="calculate" className="space-y-6">
          {/* Header with Controls */}
          <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              MUS240 Grade Calculation System
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh Data
              </Button>
              <Button
                onClick={() => updateGradeSummaries.mutate()}
                disabled={updateGradeSummaries.isPending}
                className="flex items-center gap-2"
              >
                <Award className="h-4 w-4" />
                {updateGradeSummaries.isPending ? 'Updating...' : 'Update Grade Summaries'}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{classStats?.totalStudents || 0}</div>
              <div className="text-sm text-gray-600">Total Students</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{classStats?.averageGrade?.toFixed(1) || 0}%</div>
              <div className="text-sm text-gray-600">Class Average</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{classStats?.passingRate?.toFixed(1) || 0}%</div>
              <div className="text-sm text-gray-600">Passing Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{semester}</div>
              <div className="text-sm text-gray-600">Current Semester</div>
            </div>
          </div>
        </CardContent>
      </Card>

          {/* Individual Student Grades */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Individual Student Grades
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <div className="space-y-4">
                  {studentGrades?.map((student) => (
                    <Card key={student.student_id} className="border-l-4 border-l-blue-500">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h3 className="font-semibold">{student.student_name}</h3>
                            <p className="text-sm text-gray-600">{student.student_email}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold">{student.percentage}%</div>
                            <Badge className={getGradeColor(student.letter_grade)}>
                              {student.letter_grade}
                            </Badge>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              <span className="text-sm font-medium">Midterm</span>
                            </div>
                            <div className="text-lg font-semibold">
                              {student.midterm_score !== null ? `${student.midterm_score}%` : 'Not taken'}
                            </div>
                            <Progress 
                              value={student.midterm_score || 0} 
                              className="h-2" 
                            />
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <BookOpen className="h-4 w-4" />
                              <span className="text-sm font-medium">Assignments</span>
                            </div>
                            <div className="text-lg font-semibold">
                              {student.assignment_scores.length > 0 
                                ? `${(student.assignment_scores.reduce((sum, a) => sum + a.score, 0) / student.assignment_scores.length).toFixed(1)}%`
                                : 'No assignments'
                              }
                            </div>
                            <div className="text-xs text-gray-600">
                              {student.assignment_scores.length} submitted
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Music className="h-4 w-4" />
                              <span className="text-sm font-medium">Journals</span>
                            </div>
                            <div className="text-lg font-semibold">
                              {student.journal_scores.length > 0 
                                ? `${(student.journal_scores.reduce((sum, j) => sum + j.score, 0) / student.journal_scores.length).toFixed(1)}%`
                                : 'No journals'
                              }
                            </div>
                            <div className="text-xs text-gray-600">
                              {student.journal_scores.length} graded
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4" />
                              <span className="text-sm font-medium">Participation</span>
                            </div>
                            <div className="text-lg font-semibold">
                              {student.participation_score}%
                            </div>
                            <Progress 
                              value={student.participation_score} 
                              className="h-2" 
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <span>Total Points: {student.total_points} / {student.total_possible}</span>
                          <div className="flex items-center gap-2">
                            {student.percentage < 70 && (
                              <AlertTriangle className="h-4 w-4 text-orange-500" />
                            )}
                            <span className="font-medium">Final Grade: {student.letter_grade}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {/* Grade Distribution */}
          {classStats && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Grade Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 gap-4">
                  {Object.entries(classStats.gradeDistribution).map(([grade, count]) => (
                    <div key={grade} className="text-center">
                      <div className="text-3xl font-bold">{count}</div>
                      <Badge variant="outline" className={getGradeColor(`${grade}+`)}>
                        {grade} Students
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="participation" className="space-y-6">
          <GroupParticipationAnalyzer onCreditAwarded={() => refetch()} />
        </TabsContent>
      </Tabs>

      {/* Individual Student Grades */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Individual Student Grades
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <div className="space-y-4">
              {studentGrades?.map((student) => (
                <Card key={student.student_id} className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-semibold">{student.student_name}</h3>
                        <p className="text-sm text-gray-600">{student.student_email}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">{student.percentage}%</div>
                        <Badge className={getGradeColor(student.letter_grade)}>
                          {student.letter_grade}
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <span className="text-sm font-medium">Midterm</span>
                        </div>
                        <div className="text-lg font-semibold">
                          {student.midterm_score !== null ? `${student.midterm_score}%` : 'Not taken'}
                        </div>
                        <Progress 
                          value={student.midterm_score || 0} 
                          className="h-2" 
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4" />
                          <span className="text-sm font-medium">Assignments</span>
                        </div>
                        <div className="text-lg font-semibold">
                          {student.assignment_scores.length > 0 
                            ? `${(student.assignment_scores.reduce((sum, a) => sum + a.score, 0) / student.assignment_scores.length).toFixed(1)}%`
                            : 'No assignments'
                          }
                        </div>
                        <div className="text-xs text-gray-600">
                          {student.assignment_scores.length} submitted
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Music className="h-4 w-4" />
                          <span className="text-sm font-medium">Journals</span>
                        </div>
                        <div className="text-lg font-semibold">
                          {student.journal_scores.length > 0 
                            ? `${(student.journal_scores.reduce((sum, j) => sum + j.score, 0) / student.journal_scores.length).toFixed(1)}%`
                            : 'No journals'
                          }
                        </div>
                        <div className="text-xs text-gray-600">
                          {student.journal_scores.length} graded
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4" />
                          <span className="text-sm font-medium">Participation</span>
                        </div>
                        <div className="text-lg font-semibold">
                          {student.participation_score}%
                        </div>
                        <Progress 
                          value={student.participation_score} 
                          className="h-2" 
                        />
                      </div>
                    </div>

                    <Separator className="my-3" />

                    <div className="flex items-center justify-between text-sm">
                      <span>Total Points: {student.total_points} / {student.total_possible}</span>
                      <div className="flex items-center gap-2">
                        {student.percentage < 70 && (
                          <AlertTriangle className="h-4 w-4 text-orange-500" />
                        )}
                        <span className="font-medium">Final Grade: {student.letter_grade}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};