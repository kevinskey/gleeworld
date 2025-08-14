import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { GradingResults as GradingResultsType } from './hooks/useGrading';

interface GradingResultsProps {
  results: GradingResultsType;
}

export const GradingResults: React.FC<GradingResultsProps> = ({ results }) => {
  const getLetterGradeColor = (letter: string) => {
    switch (letter) {
      case 'A': return 'bg-green-500';
      case 'B': return 'bg-blue-500';
      case 'C': return 'bg-yellow-500';
      case 'D': return 'bg-orange-500';
      default: return 'bg-red-500';
    }
  };

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Performance Results</h3>
          <Badge className={`${getLetterGradeColor(results.letter)} text-white`}>
            Grade: {results.letter}
          </Badge>
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Overall Score</span>
              <span>{Math.round(results.overall * 100)}%</span>
            </div>
            <Progress value={results.overall * 100} className="h-2" />
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Pitch Accuracy</span>
              <span>{Math.round(results.pitchAcc * 100)}%</span>
            </div>
            <Progress value={results.pitchAcc * 100} className="h-2" />
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Rhythm Accuracy</span>
              <span>{Math.round(results.rhythmAcc * 100)}%</span>
            </div>
            <Progress value={results.rhythmAcc * 100} className="h-2" />
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Rest Accuracy</span>
              <span>{Math.round(results.restAcc * 100)}%</span>
            </div>
            <Progress value={results.restAcc * 100} className="h-2" />
          </div>
        </div>
      </div>
    </Card>
  );
};