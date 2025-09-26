import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { 
  GraduationCap, 
  Clock, 
  CheckCircle, 
  FileText, 
  Star,
  User,
  Calendar
} from 'lucide-react';

interface GradingRubric {
  terms: number;           // 10 points (2 pts each x 5 terms)
  shortAnswers: number;    // 20 points (5 pts each x 4 questions)
  excerpts: number;        // 30 points (15 pts each x 2 excerpts)
  essay: number;          // 40 points
  total: number;          // 100 points
}

const RUBRIC_DEFAULTS: GradingRubric = {
  terms: 0,
  shortAnswers: 0,
  excerpts: 0,
  essay: 0,
  total: 0
};

export const MidtermGradingManager: React.FC = () => {
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [rubricScores, setRubricScores] = useState<GradingRubric>(RUBRIC_DEFAULTS);
  const [feedback, setFeedback] = useState('');
  const queryClient = useQueryClient();

  const { data: submissions, isLoading } = useQuery({
    queryKey: ['midterm-submissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mus240_midterm_submissions')
        .select(`
          *,
          gw_profiles!inner(full_name, email)
        `)
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const gradeMutation = useMutation({
    mutationFn: async ({ submissionId, grade, feedback }: { submissionId: string; grade: number; feedback: string }) => {
      const { error } = await supabase
        .from('mus240_midterm_submissions')
        .update({
          grade,
          feedback,
          graded_at: new Date().toISOString(),
          graded_by: (await supabase.auth.getUser()).data.user?.id
        } as any)
        .eq('id', submissionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['midterm-submissions'] });
      toast.success('Grade saved successfully');
      setSelectedSubmission(null);
      setRubricScores(RUBRIC_DEFAULTS);
      setFeedback('');
    },
    onError: (error) => {
      toast.error('Failed to save grade');
      console.error('Error saving grade:', error);
    },
  });

  const handleRubricChange = (section: keyof GradingRubric, value: number) => {
    const newScores = { ...rubricScores, [section]: value };
    newScores.total = newScores.terms + newScores.shortAnswers + newScores.excerpts + newScores.essay;
    setRubricScores(newScores);
  };

  const handleGradeSubmission = () => {
    if (!selectedSubmission) return;
    
    gradeMutation.mutate({
      submissionId: selectedSubmission.id,
      grade: rubricScores.total,
      feedback
    });
  };

  const getLetterGrade = (score: number) => {
    if (score >= 97) return 'A+';
    if (score >= 93) return 'A';
    if (score >= 90) return 'A-';
    if (score >= 87) return 'B+';
    if (score >= 83) return 'B';
    if (score >= 80) return 'B-';
    if (score >= 77) return 'C+';
    if (score >= 73) return 'C';
    if (score >= 70) return 'C-';
    if (score >= 67) return 'D+';
    if (score >= 63) return 'D';
    if (score >= 60) return 'D-';
    return 'F';
  };

  const getStatusBadge = (submission: any) => {
    if (submission.grade !== null) {
      return <Badge variant="default" className="bg-green-100 text-green-800">Graded</Badge>;
    }
    if (submission.is_submitted) {
      return <Badge variant="secondary">Submitted</Badge>;
    }
    return <Badge variant="destructive">In Progress</Badge>;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Midterm Exam Grading
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading submissions...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Submissions List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Midterm Submissions ({submissions?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <div className="space-y-3">
              {submissions?.map((submission: any) => (
                <Card 
                  key={submission.id} 
                  className={`cursor-pointer transition-colors hover:bg-gray-50 ${
                    selectedSubmission?.id === submission.id ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => {
                    setSelectedSubmission(submission);
                    if (submission.grade !== null) {
                      // Pre-fill rubric if already graded
                      const termScore = Math.round((submission.grade / 100) * 10);
                      const shortScore = Math.round((submission.grade / 100) * 20);
                      const excerptScore = Math.round((submission.grade / 100) * 30);
                      const essayScore = submission.grade - termScore - shortScore - excerptScore;
                      
                      setRubricScores({
                        terms: termScore,
                        shortAnswers: shortScore,
                        excerpts: excerptScore,
                        essay: Math.max(0, essayScore),
                        total: submission.grade
                      });
                      setFeedback(submission.feedback || '');
                    } else {
                      setRubricScores(RUBRIC_DEFAULTS);
                      setFeedback('');
                    }
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">{submission.gw_profiles?.full_name}</span>
                      </div>
                      {getStatusBadge(submission)}
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {submission.submitted_at 
                          ? new Date(submission.submitted_at).toLocaleDateString()
                          : 'In Progress'
                        }
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {submission.total_time_minutes 
                          ? `${submission.total_time_minutes} min`
                          : '--'
                        }
                      </div>
                    </div>

                    {submission.grade !== null && (
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-yellow-500" />
                        <span className="font-semibold">{submission.grade}/100</span>
                        <Badge variant="outline">{getLetterGrade(submission.grade)}</Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Grading Interface */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            {selectedSubmission ? 'Grade Submission' : 'Select a Submission'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedSubmission ? (
            <div className="space-y-6">
              {/* Student Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">{selectedSubmission.gw_profiles?.full_name}</h3>
                <p className="text-sm text-gray-600">{selectedSubmission.gw_profiles?.email}</p>
                <p className="text-sm text-gray-600">
                  Submitted: {selectedSubmission.submitted_at 
                    ? new Date(selectedSubmission.submitted_at).toLocaleString()
                    : 'Not submitted'
                  }
                </p>
              </div>

              {/* Grading Rubric */}
              <div className="space-y-4">
                <h3 className="font-semibold">Grading Rubric</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Terms (0-10)</label>
                    <Input
                      type="number"
                      min="0"
                      max="10"
                      value={rubricScores.terms}
                      onChange={(e) => handleRubricChange('terms', Number(e.target.value))}
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">2 pts each × 5 terms</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Short Answers (0-20)</label>
                    <Input
                      type="number"
                      min="0"
                      max="20"
                      value={rubricScores.shortAnswers}
                      onChange={(e) => handleRubricChange('shortAnswers', Number(e.target.value))}
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">5 pts each × 4 questions</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Excerpts (0-30)</label>
                    <Input
                      type="number"
                      min="0"
                      max="30"
                      value={rubricScores.excerpts}
                      onChange={(e) => handleRubricChange('excerpts', Number(e.target.value))}
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">15 pts each × 2 excerpts</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Essay (0-40)</label>
                    <Input
                      type="number"
                      min="0"
                      max="40"
                      value={rubricScores.essay}
                      onChange={(e) => handleRubricChange('essay', Number(e.target.value))}
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">Historical analysis</p>
                  </div>
                </div>

                <Separator />

                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Total Score:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold">{rubricScores.total}/100</span>
                      <Badge variant="outline" className="text-lg px-3 py-1">
                        {getLetterGrade(rubricScores.total)}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Feedback */}
                <div>
                  <label className="text-sm font-medium">Feedback</label>
                  <Textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Provide detailed feedback for the student..."
                    className="mt-1 min-h-[120px]"
                  />
                </div>

                {/* Save Button */}
                <Button 
                  onClick={handleGradeSubmission}
                  disabled={gradeMutation.isPending}
                  className="w-full"
                  size="lg"
                >
                  {gradeMutation.isPending ? 'Saving...' : 'Save Grade'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>Select a submission from the list to begin grading</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};