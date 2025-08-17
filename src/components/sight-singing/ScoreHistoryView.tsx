import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Trash2, TrendingUp, Calendar, Music } from 'lucide-react';
import { useUserScores } from '@/hooks/useUserScores';
import { format } from 'date-fns';

export const ScoreHistoryView: React.FC = () => {
  const { scores, loading, deleteScore, getAverageScore, getBestScore } = useUserScores();
  const [filterPeriod, setFilterPeriod] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const getGradeColor = (score: number) => {
    if (score >= 90) return 'bg-emerald-500/20 text-emerald-700 border-emerald-200';
    if (score >= 80) return 'bg-blue-500/20 text-blue-700 border-blue-200';
    if (score >= 70) return 'bg-yellow-500/20 text-yellow-700 border-yellow-200';
    return 'bg-red-500/20 text-red-700 border-red-200';
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
    if (score >= 65) return 'D';
    return 'F';
  };

  const filteredScores = scores.filter(score => {
    const matchesSearch = !searchTerm || 
      (score.notes && score.notes.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (!matchesSearch) return false;

    if (filterPeriod === 'all') return true;
    
    const scoreDate = new Date(score.created_at!);
    const now = new Date();
    
    switch (filterPeriod) {
      case 'week':
        return scoreDate >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'month':
        return scoreDate >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case 'year':
        return scoreDate >= new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      default:
        return true;
    }
  });

  const avgScore = getAverageScore();
  const bestScore = getBestScore();

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Loading score history...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Average Score</p>
                <p className="text-2xl font-bold">{avgScore > 0 ? Math.round(avgScore) : '--'}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Best Score</p>
                <p className="text-2xl font-bold">{bestScore > 0 ? Math.round(bestScore) : '--'}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Music className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Attempts</p>
                <p className="text-2xl font-bold">{scores.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Score History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <Input
              placeholder="Search by piece title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <Select value={filterPeriod} onValueChange={setFilterPeriod}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="week">Past Week</SelectItem>
                <SelectItem value="month">Past Month</SelectItem>
                <SelectItem value="year">Past Year</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredScores.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {scores.length === 0 ? (
                <>
                  <Music className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No practice sessions recorded yet.</p>
                  <p className="text-sm">Start practicing to see your progress here!</p>
                </>
              ) : (
                <p>No scores match your current filters.</p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredScores.map((score) => (
                <div
                  key={score.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-medium">
                        Sight-Reading Exercise
                      </h4>
                      <Badge className={getGradeColor(score.score_value)}>
                        {getLetterGrade(score.score_value)} ({Math.round(score.score_value)}%)
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{format(new Date(score.created_at!), 'MMM d, yyyy')}</span>
                      {score.performance_date && (
                        <span>• Performed: {format(new Date(score.performance_date), 'MMM d, yyyy')}</span>
                      )}
                    </div>
                    {score.notes && (
                      <p className="text-sm text-muted-foreground mt-1">{score.notes}</p>
                    )}
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteScore(score.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};