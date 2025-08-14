import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, AlertCircle, TrendingUp, Target } from 'lucide-react';
import type { Evaluation } from './SightSingingStudio';

interface EvaluationDisplayProps {
  evaluation: Evaluation;
}

export const EvaluationDisplay: React.FC<EvaluationDisplayProps> = ({
  evaluation
}) => {
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-blue-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 90) return 'default';
    if (score >= 75) return 'secondary';
    if (score >= 60) return 'outline';
    return 'destructive';
  };

  const overallScore = Math.round((evaluation.pitchAccuracy + evaluation.rhythmAccuracy) / 2);

  return (
    <div className="space-y-6">
      {/* Overall Scores */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="h-4 w-4" />
              Overall Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className={`text-2xl font-bold ${getScoreColor(overallScore)}`}>
                {overallScore}%
              </div>
              <Progress value={overallScore} className="flex-1" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Pitch Accuracy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className={`text-2xl font-bold ${getScoreColor(evaluation.pitchAccuracy)}`}>
                {Math.round(evaluation.pitchAccuracy)}%
              </div>
              <Progress value={evaluation.pitchAccuracy} className="flex-1" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="h-4 w-4" />
              Rhythm Accuracy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className={`text-2xl font-bold ${getScoreColor(evaluation.rhythmAccuracy)}`}>
                {Math.round(evaluation.rhythmAccuracy)}%
              </div>
              <Progress value={evaluation.rhythmAccuracy} className="flex-1" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Per-Measure Breakdown */}
      {evaluation.perMeasureData && evaluation.perMeasureData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Per-Measure Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {evaluation.perMeasureData.map((measure, index) => (
                <div key={index} className="p-3 border rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">
                    Measure {measure.measure || index + 1}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs">Pitch:</span>
                      <Badge variant={getScoreBadgeVariant(measure.pitch_score || 0)} className="text-xs">
                        {Math.round(measure.pitch_score || 0)}%
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs">Rhythm:</span>
                      <Badge variant={getScoreBadgeVariant(measure.rhythm_score || 0)} className="text-xs">
                        {Math.round(measure.rhythm_score || 0)}%
                      </Badge>
                    </div>
                  </div>
                  {measure.notes && (
                    <div className="text-xs text-muted-foreground mt-1 truncate">
                      {measure.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Feedback */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Detailed Feedback</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {evaluation.feedback && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm">{evaluation.feedback}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Strengths */}
            {evaluation.strengths && evaluation.strengths.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  Strengths
                </h4>
                <ul className="space-y-1">
                  {evaluation.strengths.map((strength, index) => (
                    <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                      {strength}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Areas for Improvement */}
            {evaluation.areasForImprovement && evaluation.areasForImprovement.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2 text-amber-600">
                  <AlertCircle className="h-4 w-4" />
                  Areas for Improvement
                </h4>
                <ul className="space-y-1">
                  {evaluation.areasForImprovement.map((area, index) => (
                    <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2 flex-shrink-0" />
                      {area}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};