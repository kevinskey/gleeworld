import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface EvaluationDisplayProps {
  evaluation: {
    id: string;
    recordingId: string;
    pitchAccuracy: number;
    rhythmAccuracy: number;
    perMeasureData: any[];
    feedback: string;
    strengths?: string[];
    areasForImprovement?: string[];
  };
}

export const EvaluationDisplay: React.FC<EvaluationDisplayProps> = ({ evaluation }) => {
  return (
    <Card className="p-4">
      <h3 className="text-lg font-semibold mb-2">Performance Evaluation</h3>
      <div className="space-y-2">
        <div className="flex justify-between">
          <span>Pitch Accuracy:</span>
          <Badge variant="outline">{evaluation.pitchAccuracy}%</Badge>
        </div>
        <div className="flex justify-between">
          <span>Rhythm Accuracy:</span>
          <Badge variant="outline">{evaluation.rhythmAccuracy}%</Badge>
        </div>
        {evaluation.feedback && (
          <div className="mt-4">
            <h4 className="font-medium">Feedback:</h4>
            <p className="text-sm text-muted-foreground">{evaluation.feedback}</p>
          </div>
        )}
      </div>
    </Card>
  );
};