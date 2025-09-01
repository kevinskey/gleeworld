
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { GraduationCap, Bot } from 'lucide-react';

interface RubricScore {
  criterion: string;
  score: number;
  max_score: number;
  feedback: string;
}

interface JournalGradeDisplayProps {
  grade: {
    overall_score: number;
    letter_grade: string;
    rubric: {
      criteria: any[];
      scores: RubricScore[];
    };
    feedback: string;
    ai_model?: string;
    graded_at: string;
  };
}

export const JournalGradeDisplay: React.FC<JournalGradeDisplayProps> = ({ grade }) => {
  return (
    <Card className="mt-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Your Grade
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="default" className="text-lg px-3 py-1">
              {grade.overall_score}% ({grade.letter_grade})
            </Badge>
            {grade.ai_model && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Bot className="h-3 w-3" />
                AI Graded
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Overall Feedback */}
        <div>
          <h4 className="font-medium mb-2">Instructor Feedback</h4>
          <div className="bg-muted/50 p-3 rounded-lg">
            <p className="text-sm">{grade.feedback}</p>
          </div>
        </div>

        {/* Rubric Breakdown */}
        {grade.rubric?.scores && (
          <div>
            <h4 className="font-medium mb-3">Rubric Breakdown</h4>
            <div className="space-y-3">
              {grade.rubric.scores.map((score, index) => (
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

        <div className="text-xs text-muted-foreground">
          Graded on {new Date(grade.graded_at).toLocaleDateString()}
        </div>
      </CardContent>
    </Card>
  );
};
