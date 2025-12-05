import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Clock, CheckCircle, XCircle, TrendingUp, Edit, Eye, Trash2 } from 'lucide-react';
import { ManualGradingDialog } from './ManualGradingDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface TestScoresViewProps {
  testId: string;
}

export const TestScoresView = ({ testId }: TestScoresViewProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [test, setTest] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [gradingDialogOpen, setGradingDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadScores();
  }, [testId]);

  const loadScores = async () => {
    try {
      setLoading(true);

      // Get test details
      const { data: testData, error: testError } = await supabase
        .from('glee_academy_tests')
        .select('*')
        .eq('id', testId)
        .single();

      if (testError) throw testError;
      setTest(testData);

      // Get all submissions for this test
      const { data: submissionsData, error: submissionsError } = await supabase
        .from('test_submissions')
        .select('*')
        .eq('test_id', testId)
        .order('created_at', { ascending: false });

      if (submissionsError) throw submissionsError;

      // Fetch student profiles separately
      const studentIds = [...new Set((submissionsData || []).map(s => s.student_id))];
      let profilesMap: Record<string, { full_name: string; email: string }> = {};
      
      if (studentIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('gw_profiles')
          .select('user_id, full_name, email')
          .in('user_id', studentIds);
        
        profilesMap = (profilesData || []).reduce((acc, p) => {
          acc[p.user_id] = { full_name: p.full_name, email: p.email };
          return acc;
        }, {} as Record<string, { full_name: string; email: string }>);
      }

      // Combine submissions with profile data
      const enrichedSubmissions = (submissionsData || []).map(s => ({
        ...s,
        gw_profiles: profilesMap[s.student_id] || { full_name: 'Unknown', email: '' }
      }));

      setSubmissions(enrichedSubmissions);
    } catch (error) {
      console.error('Error loading scores:', error);
      toast({
        title: 'Error',
        description: 'Failed to load test scores',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    if (!submissions.length) return null;

    const scores = submissions.map(s => s.total_score || 0);
    const passCount = submissions.filter(s => s.passed).length;
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);

    return {
      totalSubmissions: submissions.length,
      passCount,
      passRate: (passCount / submissions.length) * 100,
      avgScore,
      maxScore,
      minScore
    };
  };

  const handleGradeSubmission = (submission: any) => {
    setSelectedSubmission(submission);
    setGradingDialogOpen(true);
  };

  const handleDeleteTest = async () => {
    try {
      setDeleting(true);
      
      // Delete answers first
      const { error: answersError } = await supabase
        .from('test_answers')
        .delete()
        .in('submission_id', submissions.map(s => s.id));
      
      if (answersError) console.error('Error deleting answers:', answersError);

      // Delete submissions
      const { error: submissionsError } = await supabase
        .from('test_submissions')
        .delete()
        .eq('test_id', testId);

      if (submissionsError) console.error('Error deleting submissions:', submissionsError);

      // Delete question options
      const { data: questions } = await supabase
        .from('test_questions')
        .select('id')
        .eq('test_id', testId);

      if (questions?.length) {
        const { error: optionsError } = await supabase
          .from('test_answer_options')
          .delete()
          .in('question_id', questions.map(q => q.id));
        
        if (optionsError) console.error('Error deleting options:', optionsError);
      }

      // Delete questions
      const { error: questionsError } = await supabase
        .from('test_questions')
        .delete()
        .eq('test_id', testId);

      if (questionsError) console.error('Error deleting questions:', questionsError);

      // Delete test
      const { error: testError } = await supabase
        .from('glee_academy_tests')
        .delete()
        .eq('id', testId);

      if (testError) throw testError;

      toast({
        title: 'Test Deleted',
        description: 'The test and all submissions have been deleted.'
      });

      navigate(-1);
    } catch (error) {
      console.error('Error deleting test:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete test',
        variant: 'destructive'
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const stats = calculateStats();

  if (loading) {
    return <div>Loading scores...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">{test?.title}</h2>
          <p className="text-muted-foreground">Test Scores and Analytics</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(`/test/${testId}/preview`)}
          >
            <Eye className="h-4 w-4 mr-2" />
            View Test
          </Button>
          <Button
            variant="destructive"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Test
          </Button>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Submissions</span>
            </div>
            <p className="text-2xl font-bold">{stats.totalSubmissions}</p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Pass Rate</span>
            </div>
            <p className="text-2xl font-bold">{stats.passRate.toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.passCount} of {stats.totalSubmissions} passed
            </p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Average Score</span>
            </div>
            <p className="text-2xl font-bold">
              {stats.avgScore.toFixed(1)}/{test?.total_points}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {((stats.avgScore / (test?.total_points || 100)) * 100).toFixed(1)}%
            </p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Score Range</span>
            </div>
            <p className="text-2xl font-bold">
              {stats.minScore} - {stats.maxScore}
            </p>
          </Card>
        </div>
      )}

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Percentage</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {submissions.map((submission) => {
              const percentage = ((submission.total_score / (test?.total_points || 100)) * 100).toFixed(1);

              return (
                <TableRow key={submission.id}>
                  <TableCell className="font-medium">
                    {submission.gw_profiles?.full_name || 'Unknown'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {submission.gw_profiles?.email || 'N/A'}
                  </TableCell>
                  <TableCell className="font-semibold">
                    {submission.total_score}/{test?.total_points}
                  </TableCell>
                  <TableCell>{percentage}%</TableCell>
                  <TableCell>
                    {submission.passed ? (
                      <Badge className="bg-green-500">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Passed
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <XCircle className="h-3 w-3 mr-1" />
                        Failed
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(submission.created_at!).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleGradeSubmission(submission)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Grade
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {submissions.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No submissions yet
          </div>
        )}
      </Card>

      <ManualGradingDialog
        open={gradingDialogOpen}
        onOpenChange={setGradingDialogOpen}
        submission={selectedSubmission}
        test={test}
        onGraded={loadScores}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Test?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{test?.title}" and all {submissions.length} submission(s). This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTest}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting...' : 'Delete Test'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
