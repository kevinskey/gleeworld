import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Calendar, Music, Star } from 'lucide-react';
import { useUserScores } from '@/hooks/useUserScores';
import { format } from 'date-fns';

interface CompletedExercisesListProps {
  user: any;
}

export const CompletedExercisesList: React.FC<CompletedExercisesListProps> = ({ user }) => {
  const { scores, loading } = useUserScores();

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 80) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (score >= 70) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getPerformanceLevel = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Very Good';
    if (score >= 70) return 'Good';
    return 'Needs Practice';
  };

  const averageScore = scores.length > 0 
    ? Math.round(scores.reduce((sum, score) => sum + score.score_value, 0) / scores.length)
    : 0;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Completed Exercises
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Completed Exercises ({scores.length})
          </CardTitle>
          {scores.length > 0 && (
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-medium">
                Average: {averageScore}/100
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {scores.length === 0 ? (
          <div className="text-center py-8">
            <Music className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              No completed exercises yet. Start practicing to see your progress!
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {scores.map((score) => (
              <div 
                key={score.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(score.performance_date), 'MMM dd, yyyy')}
                    </span>
                  </div>
                  {score.notes && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {score.notes}
                    </p>
                  )}
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-lg font-bold">
                      {score.score_value}/100
                    </div>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${getScoreColor(score.score_value)}`}
                    >
                      {getPerformanceLevel(score.score_value)}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {scores.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-lg font-bold text-primary">
                  {scores.length}
                </div>
                <div className="text-xs text-muted-foreground">
                  Total Exercises
                </div>
              </div>
              <div>
                <div className="text-lg font-bold text-green-600">
                  {scores.filter(s => s.score_value >= 80).length}
                </div>
                <div className="text-xs text-muted-foreground">
                  Good+ Scores
                </div>
              </div>
              <div>
                <div className="text-lg font-bold text-yellow-600">
                  {averageScore}
                </div>
                <div className="text-xs text-muted-foreground">
                  Average Score
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};