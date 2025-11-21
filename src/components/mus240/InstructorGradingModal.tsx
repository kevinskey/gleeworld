
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Bot, Loader2 } from 'lucide-react';
import { gradeJournalWithAI, type GradeResponse } from '@/hooks/useJournalGrading';
import { useJournalGrading } from '@/hooks/useJournalGrading';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface InstructorGradingModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignment: {
    id: string;
    title: string;
  };
  journal: {
    id: string;
    student_id: string;
    assignment_id: string;
    content: string;
    author_name: string;
  };
  existingGrade?: any;
  onGradeComplete: (grade: any) => void;
}

export const InstructorGradingModal: React.FC<InstructorGradingModalProps> = ({
  isOpen,
  onClose,
  assignment,
  journal,
  existingGrade,
  onGradeComplete
}) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<GradeResponse | null>(null);
  const [recheckingPeer, setRecheckingPeer] = useState(false);
  
  const { recheckPeerComments } = useJournalGrading();

  const handleGradeWithAI = async () => {
    setErrorMsg(null);
    setResult(null);
    setLoading(true);
    
    try {
      console.log('Grading journal with data:');
      console.log('- assignmentId:', journal.assignment_id);
      console.log('- journal.student_id:', journal.student_id);
      console.log('- journal.id:', journal.id);
      
      const res = await gradeJournalWithAI(supabase, {
        id: journal.id,
        assignment_id: journal.assignment_id,
        student_id: journal.student_id,
        content: journal.content
      });
      
      setResult(res);
      if (res.success && res.grade) {
        onGradeComplete(res.grade);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('Failed to grade journal:', errorMessage);
      setErrorMsg(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRecheckPeerComments = async () => {
    if (!result?.grade?.id) return;
    
    setRecheckingPeer(true);
    try {
      const updatedInfo = await recheckPeerComments(
        journal.assignment_id, 
        journal.student_id, 
        result.grade.id
      );
      
      // Update the displayed result
      setResult(prev => {
        if (!prev?.grade) return prev;
        
        const updatedScores = [...prev.grade.rubric_scores];
        const peerIndex = updatedScores.findIndex(score => score.criterion === 'Peer Comments');
        
        if (peerIndex !== -1) {
          updatedScores[peerIndex] = {
            ...updatedScores[peerIndex],
            score: updatedInfo.points_awarded,
            feedback: `Updated: ${updatedInfo.valid_count} qualifying comment${updatedInfo.valid_count !== 1 ? 's' : ''} for ${updatedInfo.points_awarded} points.`
          };
        }
        
        return {
          ...prev,
          grade: {
            ...prev.grade,
            overall_score: updatedInfo.final_score,
            rubric_scores: updatedScores
          }
        };
      });
      
      // Notify parent component
      if (result.grade) {
        onGradeComplete({
          ...result.grade,
          overall_score: updatedInfo.final_score
        });
      }
      
    } catch (error) {
      console.error('Failed to recheck peer comments:', error);
    } finally {
      setRecheckingPeer(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" aria-describedby="grading-desc">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Grade Journal: {assignment.title}
            {journal?.author_name && <Badge variant="outline">{journal.author_name}</Badge>}
          </DialogTitle>
          <DialogDescription id="grading-desc">
            Runs rubric grading and saves a grade for this journal submission.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Journal Content */}
          <div>
            <h3 className="font-medium mb-2">Student Journal Entry</h3>
            <div className="bg-muted/50 p-4 rounded-lg max-h-60 overflow-y-auto">
              <p className="text-sm whitespace-pre-wrap">{journal.content}</p>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Student ID: <span className="font-medium">{journal.student_id}</span>
            </p>

            {/* Error Display */}
            {errorMsg && (
              <div className="bg-destructive/10 border border-destructive/20 p-3 rounded-lg">
                <p className="text-sm text-destructive">{errorMsg}</p>
              </div>
            )}

            {/* Success Result */}
            {result?.success && result.grade && (
              <div className="space-y-4">
                  <div className="rounded border p-4 bg-green-50 border-green-200">
                    <div className="flex items-center gap-4 mb-3">
                      <Badge variant="default" className="text-lg px-3 py-1">
                        {Math.round(result.grade.overall_score)}% ({result.grade.letter_grade})
                      </Badge>
                      {result.grade.metadata && (
                        <Badge variant="outline" className="text-sm">
                          {result.grade.rubric_scores?.reduce((sum, score) => sum + score.score, 0) || result.grade.overall_points_without_peer}/20 points
                        </Badge>
                      )}
                    </div>
                  
                  {result.grade.overall_feedback && (
                    <div className="mb-3">
                      <h4 className="font-medium text-sm mb-1">Overall Feedback</h4>
                      <p className="text-sm">{result.grade.overall_feedback}</p>
                    </div>
                  )}

                    {/* Word Count Display */}
                    {result.grade.metadata && (
                      <div className="mb-3">
                        <p className="text-sm">
                          <strong>Word Count:</strong> {result.grade.metadata.word_count} words
                          {result.grade.metadata.word_range_ok ? ' ✓' : ' (outside 250-300 requirement)'}
                        </p>
                      </div>
                    )}

                    {result.grade.rubric_scores && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-sm">Rubric Breakdown (20 Points Total)</h4>
                          <Button
                            onClick={handleRecheckPeerComments}
                            disabled={recheckingPeer}
                            size="sm"
                            variant="outline"
                            className="text-xs"
                          >
                            {recheckingPeer ? (
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            ) : (
                              "Recheck Peer Comments"
                            )}
                          </Button>
                        </div>
                        <div className="grid gap-2">
                          {result.grade.rubric_scores.map((score, index) => (
                            <div key={index} className="border rounded p-3 bg-white">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-medium text-sm">{score.criterion}</span>
                                <Badge variant="outline">
                                  {score.score}/{score.max_score} pts
                                </Badge>
                              </div>
                              <Progress 
                                value={(score.score / score.max_score) * 100} 
                                className="h-2 mb-1"
                              />
                              <p className="text-xs text-muted-foreground">{score.feedback}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  {result.trace && (
                    <p className="mt-2 text-xs text-muted-foreground">trace: {result.trace}</p>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={handleGradeWithAI} disabled={loading} className="flex items-center gap-2">
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Bot className="h-4 w-4" />
                )}
                {loading ? "Grading…" : "Grade with AI"}
              </Button>
              <Button variant="outline" onClick={onClose} disabled={loading}>
                Close
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
