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
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { 
  GraduationCap, 
  Clock, 
  CheckCircle, 
  FileText, 
  Star,
  User,
  Calendar,
  ChevronDown,
  ChevronUp,
  CheckSquare,
  Square,
  Zap
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
  const [expandedSubmissionId, setExpandedSubmissionId] = useState<string | null>(null);
  const [rubricScores, setRubricScores] = useState<Record<string, GradingRubric>>({});
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [selectedSubmissions, setSelectedSubmissions] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState<{ total: number; started: number; done: number } | null>(null);
  const queryClient = useQueryClient();

  const { data: submissions, isLoading } = useQuery({
    queryKey: ['midterm-submissions'],
    queryFn: async () => {
      // Check authentication status
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No authenticated user found for midterm grading');
        throw new Error('Authentication required to view midterm submissions');
      }

      // 1) Fetch submissions (submitted only)
      const { data, error } = await supabase
        .from('mus240_midterm_submissions')
        .select('*')
        .eq('is_submitted', true)
        .order('submitted_at', { ascending: false });

      if (error) {
        console.error('Error fetching midterm submissions:', error);
        throw error;
      }

      // 2) Fetch profiles separately and merge (avoids FK join issues)
      const userIds = (data || []).map((s: any) => s.user_id).filter(Boolean);
      if (userIds.length === 0) return data;

      const { data: profiles, error: profilesError } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name, email')
        .in('user_id', userIds);

      if (profilesError) {
        console.error('Error fetching profiles for submissions:', profilesError);
        return data; // fallback to raw submissions
      }

      const profileMap = new Map<string, any>();
      (profiles || []).forEach((p: any) => profileMap.set(p.user_id, p));

      return (data || []).map((s: any) => ({
        ...s,
        gw_profiles: profileMap.get(s.user_id) || null,
      }));
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
    },
    onError: (error) => {
      toast.error('Failed to save grade');
      console.error('Error saving grade:', error);
    },
  });

  const bulkGradeWithAI = useMutation({
    mutationFn: async (submissionIds: string[]) => {
      const results: Array<{ submissionId: string; success: boolean; error?: any; data?: any; finalGrade?: number | null }> = [];

      // Small helper to avoid hammering the Edge Function and to retry transient failures
      const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));
      const withTimeout = <T,>(p: Promise<T>, ms: number) =>
        new Promise<T>((resolve, reject) => {
          const t = setTimeout(() => reject(new Error('Request timed out')), ms);
          p.then((v) => {
            clearTimeout(t);
            resolve(v);
          }).catch((e) => {
            clearTimeout(t);
            reject(e);
          });
        });

      // Get current user for graded_by
      const { data: auth } = await supabase.auth.getUser();
      const graderId = auth.user?.id ?? null;

      // Initialize progress UI
      setProgress({ total: submissionIds.length, started: 0, done: 0 });

      for (const submissionId of submissionIds) {
        try {
          // Mark as started so the progress bar moves immediately
          setProgress((p) => (p ? { ...p, started: p.started + 1 } : p));
          // Retry up to 3 times for transient network errors like "Load failed" or timeouts
          let attempt = 0;
          let data: any | null = null;
          let lastErr: any = null;
          while (attempt < 3) {
            try {
              const resp = await withTimeout(
                supabase.functions.invoke('grade-midterm-ai', { body: { submission_id: submissionId } }),
                60000
              );
              if ((resp as any).error) throw (resp as any).error;
              data = (resp as any).data;
              break; // success
            } catch (err: any) {
              lastErr = err;
              const msg = (err?.message || '').toLowerCase();
              const name = (err?.name || '').toLowerCase();
              // Only retry for transient fetch issues
              if (msg.includes('load failed') || msg.includes('timed out') || name.includes('functionsfetcherror')) {
                attempt += 1;
                await delay(600 * attempt); // simple backoff
                continue;
              }
              // Non-retryable
              throw err;
            }
          }
          if (!data) throw lastErr || new Error('No data returned from grade-midterm-ai');

          // Compute overall percentage from returned AI grades
          const grades = (data?.grades ?? []) as Array<{ score: number; total_points: number; feedback?: string }>;
          const totals = grades.reduce(
            (acc, g) => {
              const score = typeof g.score === 'number' ? g.score : 0;
              const max = typeof g.total_points === 'number' ? g.total_points : 0;
              return { achieved: acc.achieved + score, possible: acc.possible + max };
            },
            { achieved: 0, possible: 0 }
          );
          const finalGrade = totals.possible > 0 ? Math.round((totals.achieved / totals.possible) * 100) : null;

          // Persist overall grade back to submissions so UI reflects status
          if (finalGrade !== null) {
            const { error: updateErr } = await supabase
              .from('mus240_midterm_submissions')
              .update({
                grade: finalGrade,
                graded_at: new Date().toISOString(),
                graded_by: graderId,
              } as any)
              .eq('id', submissionId);

            if (updateErr) {
              console.error('Failed to update submission with AI grade:', updateErr);
              results.push({ submissionId, success: false, error: updateErr });
              setProgress((p) => (p ? { ...p, done: p.done + 1 } : p));
              // small spacing between calls to reduce pressure on the function
              await delay(300);
              continue;
            }
          }

          results.push({ submissionId, success: true, data, finalGrade });
          setProgress((p) => (p ? { ...p, done: p.done + 1 } : p));
          await delay(300); // space out calls a bit
        } catch (error) {
          console.error(`Failed to grade submission ${submissionId}:`, error);
          results.push({ submissionId, success: false, error });
          setProgress((p) => (p ? { ...p, done: p.done + 1 } : p));
          await delay(300);
        }
      }
      return results;
    },
    onSuccess: (results) => {
      setProgress(null);
      queryClient.invalidateQueries({ queryKey: ['midterm-submissions'] });
      const successCount = results.filter(r => r.success).length;
      const failCount = results.length - successCount;
      
      if (failCount === 0) {
        toast.success(`Successfully graded ${successCount} submissions with AI`);
      } else {
        toast.success(`Graded ${successCount} submissions. ${failCount} failed.`);
      }
      setSelectedSubmissions(new Set());
    },
    onError: (error) => {
      setProgress(null);
      console.error('Bulk grading error:', error);
      toast.error('Failed to grade submissions with AI');
    },
  });

  const getSubmissionRubric = (submissionId: string): GradingRubric => {
    return rubricScores[submissionId] || RUBRIC_DEFAULTS;
  };

  const getSubmissionFeedback = (submissionId: string): string => {
    return feedback[submissionId] || '';
  };

  const handleRubricChange = (submissionId: string, section: keyof GradingRubric, value: number) => {
    const currentRubric = getSubmissionRubric(submissionId);
    const newRubric = { ...currentRubric, [section]: value };
    newRubric.total = newRubric.terms + newRubric.shortAnswers + newRubric.excerpts + newRubric.essay;
    
    setRubricScores(prev => ({
      ...prev,
      [submissionId]: newRubric
    }));
  };

  const handleFeedbackChange = (submissionId: string, value: string) => {
    setFeedback(prev => ({
      ...prev,
      [submissionId]: value
    }));
  };

  const handleGradeSubmission = (submission: any) => {
    const rubric = getSubmissionRubric(submission.id);
    const feedbackText = getSubmissionFeedback(submission.id);
    
    gradeMutation.mutate({
      submissionId: submission.id,
      grade: rubric.total,
      feedback: feedbackText
    });
  };

  const toggleExpansion = (submission: any) => {
    const isExpanding = expandedSubmissionId !== submission.id;
    setExpandedSubmissionId(isExpanding ? submission.id : null);
    
    if (isExpanding && submission.grade !== null) {
      // Pre-fill rubric if already graded
      const termScore = Math.round((submission.grade / 100) * 10);
      const shortScore = Math.round((submission.grade / 100) * 20);
      const excerptScore = Math.round((submission.grade / 100) * 30);
      const essayScore = submission.grade - termScore - shortScore - excerptScore;
      
      setRubricScores(prev => ({
        ...prev,
        [submission.id]: {
          terms: termScore,
          shortAnswers: shortScore,
          excerpts: excerptScore,
          essay: Math.max(0, essayScore),
          total: submission.grade
        }
      }));
      setFeedback(prev => ({
        ...prev,
        [submission.id]: submission.feedback || ''
      }));
    }
  };

  const toggleSubmissionSelection = (submissionId: string) => {
    setSelectedSubmissions(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(submissionId)) {
        newSelection.delete(submissionId);
      } else {
        newSelection.add(submissionId);
      }
      return newSelection;
    });
  };

  const toggleAllSubmissions = () => {
    const ungradedSubmissions = submissions?.filter((s: any) => s.grade === null) || [];
    const allUngradedIds = ungradedSubmissions.map((s: any) => s.id);
    
    if (selectedSubmissions.size === allUngradedIds.length) {
      setSelectedSubmissions(new Set());
    } else {
      setSelectedSubmissions(new Set(allUngradedIds));
    }
  };

  const handleBulkGradeWithAI = () => {
    if (selectedSubmissions.size === 0) {
      toast.error('Please select submissions to grade');
      return;
    }
    bulkGradeWithAI.mutate(Array.from(selectedSubmissions));
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

  const ungradedCount = submissions?.filter((s: any) => s.grade === null).length || 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Midterm Submissions ({submissions?.length || 0})
          </div>
          {ungradedCount > 0 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleAllSubmissions}
                className="flex items-center gap-2"
              >
                {selectedSubmissions.size === ungradedCount ? (
                  <CheckSquare className="h-4 w-4" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
                {selectedSubmissions.size === ungradedCount ? 'Deselect All' : 'Select All Ungraded'}
              </Button>
              <Button
                onClick={handleBulkGradeWithAI}
                disabled={selectedSubmissions.size === 0 || bulkGradeWithAI.isPending}
                className="flex items-center gap-2"
              >
                <Zap className="h-4 w-4" />
                {bulkGradeWithAI.isPending
                  ? (progress ? `Grading ${progress.done}/${progress.total}...` : `Grading ${selectedSubmissions.size}...`)
                  : `Grade ${selectedSubmissions.size} with AI`
                }
              </Button>
            </div>
          )}
        </CardTitle>
        {bulkGradeWithAI.isPending && progress && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>AI grading progress</span>
              <span>Started {progress.started}/{progress.total} • Done {progress.done}</span>
            </div>
            <Progress value={Math.round((progress.started / Math.max(progress.total, 1)) * 100)} />
          </div>
        )}
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[800px]">
          <div className="space-y-4">
            {submissions?.map((submission: any) => {
              const isExpanded = expandedSubmissionId === submission.id;
              const currentRubric = getSubmissionRubric(submission.id);
              const currentFeedback = getSubmissionFeedback(submission.id);

              return (
                <div key={submission.id} className="border rounded-lg">
                   {/* Submission Card Header */}
                   <Card className="cursor-pointer transition-colors hover:bg-gray-50">
                     <CardContent className="p-4">
                       <div className="flex items-center justify-between mb-2">
                         <div className="flex items-center gap-2">
                           {submission.grade === null && (
                             <Button
                               variant="ghost"
                               size="sm"
                               onClick={(e) => {
                                 e.stopPropagation();
                                 toggleSubmissionSelection(submission.id);
                               }}
                               className="h-6 w-6 p-0"
                             >
                               {selectedSubmissions.has(submission.id) ? (
                                 <CheckSquare className="h-4 w-4 text-blue-600" />
                               ) : (
                                 <Square className="h-4 w-4 text-gray-400" />
                               )}
                             </Button>
                           )}
                           <User className="h-4 w-4 text-gray-500" />
                           <span className="font-medium">{submission.gw_profiles?.full_name}</span>
                         </div>
                         <div className="flex items-center gap-2">
                           {getStatusBadge(submission)}
                           <Button
                             variant="ghost"
                             size="sm"
                             onClick={() => toggleExpansion(submission)}
                             className="h-8 w-8 p-0"
                           >
                             {isExpanded ? (
                               <ChevronUp className="h-4 w-4" />
                             ) : (
                               <ChevronDown className="h-4 w-4" />
                             )}
                           </Button>
                         </div>
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

                      <div className="flex items-center justify-center mt-2 text-sm text-gray-500">
                        {isExpanded ? 'Click to collapse details' : 'Click to review and grade'}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Expanded Grading Interface */}
                  {isExpanded && (
                    <Card className="mt-0 border-t-0 rounded-t-none">
                      <CardContent className="p-6 bg-gray-50">
                        <div className="space-y-6">
                          {/* Student Info */}
                          <div className="bg-white p-4 rounded-lg">
                            <h3 className="font-semibold mb-2">{submission.gw_profiles?.full_name}</h3>
                            <p className="text-sm text-gray-600">{submission.gw_profiles?.email}</p>
                            <p className="text-sm text-gray-600">
                              Submitted: {submission.submitted_at 
                                ? new Date(submission.submitted_at).toLocaleString()
                                : 'Not submitted'
                              }
                            </p>
                          </div>

                          {/* Grading Rubric */}
                          <div className="bg-white p-4 rounded-lg space-y-4">
                            <h3 className="font-semibold">Grading Rubric</h3>
                            
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm font-medium">Terms (0-10)</label>
                                <Input
                                  type="number"
                                  min="0"
                                  max="10"
                                  value={currentRubric.terms}
                                  onChange={(e) => handleRubricChange(submission.id, 'terms', Number(e.target.value))}
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
                                  value={currentRubric.shortAnswers}
                                  onChange={(e) => handleRubricChange(submission.id, 'shortAnswers', Number(e.target.value))}
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
                                  value={currentRubric.excerpts}
                                  onChange={(e) => handleRubricChange(submission.id, 'excerpts', Number(e.target.value))}
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
                                  value={currentRubric.essay}
                                  onChange={(e) => handleRubricChange(submission.id, 'essay', Number(e.target.value))}
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
                                  <span className="text-2xl font-bold">{currentRubric.total}/100</span>
                                  <Badge variant="outline" className="text-lg px-3 py-1">
                                    {getLetterGrade(currentRubric.total)}
                                  </Badge>
                                </div>
                              </div>
                            </div>

                            {/* Feedback */}
                            <div>
                              <label className="text-sm font-medium">Feedback</label>
                              <Textarea
                                value={currentFeedback}
                                onChange={(e) => handleFeedbackChange(submission.id, e.target.value)}
                                placeholder="Provide detailed feedback for the student..."
                                className="mt-1 min-h-[120px]"
                              />
                            </div>

                            {/* Save Button */}
                            <Button 
                              onClick={() => handleGradeSubmission(submission)}
                              disabled={gradeMutation.isPending}
                              className="w-full"
                              size="lg"
                            >
                              {gradeMutation.isPending ? 'Saving...' : 'Save Grade'}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};