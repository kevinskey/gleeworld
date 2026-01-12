import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { Music, TrendingUp, Clock, User } from 'lucide-react';

interface Submission {
  id: string;
  student_email: string;
  pitch_score: number | null;
  rhythm_score: number | null;
  overall_score: number | null;
  completed_at: string | null;
  created_at: string;
  student_name?: string;
}

interface SightReadingSubmissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignmentId: string;
  assignmentTitle: string;
}

export const SightReadingSubmissionsDialog: React.FC<SightReadingSubmissionsDialogProps> = ({
  open,
  onOpenChange,
  assignmentId,
  assignmentTitle,
}) => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      fetchSubmissions();
    }
  }, [open, assignmentId]);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      // Fetch grades from external_grades table
      // Match by exercise_title (case-insensitive partial match)
      const { data: grades, error } = await supabase
        .from('external_grades' as any)
        .select('*')
        .ilike('exercise_title', `%${assignmentTitle}%`)
        .order('completed_at', { ascending: false });

      if (error) throw error;

      // Try to enrich with student names from gw_profiles
      const enrichedSubmissions = await Promise.all(
        (grades || []).map(async (grade: any) => {
          const { data: profile } = await supabase
            .from('gw_profiles')
            .select('full_name')
            .eq('email', grade.student_email)
            .maybeSingle();

          return {
            ...grade,
            student_name: profile?.full_name || null,
          };
        })
      );

      setSubmissions(enrichedSubmissions);
    } catch (error) {
      console.error('Error fetching submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number | null) => {
    if (score === null) return 'text-muted-foreground';
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getLetterGrade = (score: number | null) => {
    if (score === null) return '-';
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  };

  const averageScore = submissions.length > 0
    ? submissions.reduce((acc, s) => acc + (s.overall_score || ((s.pitch_score || 0) + (s.rhythm_score || 0)) / 2), 0) / submissions.length
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            Submissions: {assignmentTitle}
          </DialogTitle>
        </DialogHeader>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="bg-muted rounded-lg p-4 text-center">
            <div className="text-2xl font-bold">{submissions.length}</div>
            <div className="text-sm text-muted-foreground">Total Submissions</div>
          </div>
          <div className="bg-muted rounded-lg p-4 text-center">
            <div className="text-2xl font-bold">{averageScore.toFixed(1)}%</div>
            <div className="text-sm text-muted-foreground">Average Score</div>
          </div>
          <div className="bg-muted rounded-lg p-4 text-center">
            <div className="text-2xl font-bold">{getLetterGrade(averageScore)}</div>
            <div className="text-sm text-muted-foreground">Average Grade</div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading submissions...
          </div>
        ) : submissions.length === 0 ? (
          <div className="text-center py-12">
            <Music className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Submissions Yet</h3>
            <p className="text-muted-foreground">
              No grades have been received for this assignment from readmusic.gleeworld.org
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead className="text-center">Pitch Score</TableHead>
                <TableHead className="text-center">Rhythm Score</TableHead>
                <TableHead className="text-center">Overall</TableHead>
                <TableHead className="text-center">Grade</TableHead>
                <TableHead>Completed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {submissions.map((submission) => {
                const overallScore = submission.overall_score || 
                  ((submission.pitch_score || 0) + (submission.rhythm_score || 0)) / 2;
                
                return (
                  <TableRow key={submission.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">
                            {submission.student_name || 'Unknown Student'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {submission.student_email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="space-y-1">
                        <span className={getScoreColor(submission.pitch_score)}>
                          {submission.pitch_score !== null ? `${submission.pitch_score.toFixed(1)}%` : '-'}
                        </span>
                        {submission.pitch_score !== null && (
                          <Progress value={submission.pitch_score} className="h-1" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="space-y-1">
                        <span className={getScoreColor(submission.rhythm_score)}>
                          {submission.rhythm_score !== null ? `${submission.rhythm_score.toFixed(1)}%` : '-'}
                        </span>
                        {submission.rhythm_score !== null && (
                          <Progress value={submission.rhythm_score} className="h-1" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`font-bold ${getScoreColor(overallScore)}`}>
                        {overallScore.toFixed(1)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge 
                        variant={overallScore >= 70 ? 'default' : 'destructive'}
                        className={overallScore >= 90 ? 'bg-green-600' : overallScore >= 80 ? 'bg-blue-600' : ''}
                      >
                        {getLetterGrade(overallScore)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {submission.completed_at 
                          ? new Date(submission.completed_at).toLocaleDateString()
                          : 'N/A'}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
};
