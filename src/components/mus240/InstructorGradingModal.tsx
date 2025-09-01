
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Bot, Loader2 } from 'lucide-react';
import { useJournalGrading } from '@/hooks/useJournalGrading';

interface InstructorGradingModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignment: {
    id: string;
    title: string;
  };
  journal: {
    id: string;
    user_id: string;
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
  const [gradeResult, setGradeResult] = useState<any>(existingGrade);
  const { loading, gradeJournalWithAI } = useJournalGrading();

  const handleGradeWithAI = async () => {
    try {
      const result = await gradeJournalWithAI(
        assignment.id,
        journal.content,
        journal.user_id,
        journal.id
      );
      
      setGradeResult(result);
      onGradeComplete(result);
    } catch (error) {
      console.error('Failed to grade journal:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Grade Journal: {assignment.title}
            <Badge variant="outline">{journal.author_name}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Journal Content */}
          <div>
            <h3 className="font-medium mb-2">Student Journal Entry</h3>
            <div className="bg-muted/50 p-4 rounded-lg max-h-60 overflow-y-auto">
              <p className="text-sm whitespace-pre-wrap">{journal.content}</p>
            </div>
          </div>

          {/* Grading Actions */}
          <div className="flex items-center gap-4">
            <Button
              onClick={handleGradeWithAI}
              disabled={loading}
              className="flex items-center gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Bot className="h-4 w-4" />
              )}
              {existingGrade ? 'Re-grade with AI' : 'Grade with AI'}
            </Button>
            
            {gradeResult && (
              <Badge variant="default" className="text-lg px-3 py-1">
                {gradeResult.overall_score}% ({gradeResult.letter_grade})
              </Badge>
            )}
          </div>

          {/* Grade Results */}
          {gradeResult && (
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">Overall Feedback</h3>
                <div className="bg-blue-50 p-3 rounded-lg border">
                  <p className="text-sm">{gradeResult.overall_feedback}</p>
                </div>
              </div>

              {gradeResult.rubric_scores && (
                <div>
                  <h3 className="font-medium mb-3">Rubric Breakdown</h3>
                  <div className="grid gap-3">
                    {gradeResult.rubric_scores.map((score: any, index: number) => (
                      <div key={index} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm">{score.criterion}</span>
                          <Badge variant="outline">
                            {score.score}/{score.max_score}
                          </Badge>
                        </div>
                        <Progress 
                          value={(score.score / score.max_score) * 100} 
                          className="h-2 mb-2"
                        />
                        <p className="text-xs text-muted-foreground">{score.feedback}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
