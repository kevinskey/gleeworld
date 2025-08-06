import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { 
  Trophy, 
  Calendar, 
  TrendingUp, 
  Music, 
  Star, 
  Search,
  Filter,
  Download,
  Eye
} from 'lucide-react';
import { useUserScores } from '@/hooks/useUserScores';
import { format } from 'date-fns';

interface SightSingingRecordsProps {
  userId?: string;
}

export const SightSingingRecords: React.FC<SightSingingRecordsProps> = ({ userId }) => {
  const { scores, loading, getAverageScore, getBestScore, getScoreProgress } = useUserScores();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTimeRange, setSelectedTimeRange] = useState('30'); // days

  const filteredScores = scores.filter(score => 
    score.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    score.performance_date?.includes(searchTerm)
  );

  const averageScore = getAverageScore();
  const bestScore = getBestScore();
  const recentProgress = getScoreProgress('all', parseInt(selectedTimeRange));

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getGradeLabel = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Very Good';
    if (score >= 70) return 'Good';
    return 'Needs Practice';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading sight singing records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Average Score</p>
                <p className={`text-2xl font-bold ${getScoreColor(averageScore)}`}>
                  {averageScore.toFixed(1)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Best Score</p>
                <p className={`text-2xl font-bold ${getScoreColor(bestScore)}`}>
                  {bestScore}
                </p>
              </div>
              <Trophy className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Attempts</p>
                <p className="text-2xl font-bold">{scores.length}</p>
              </div>
              <Music className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Chart */}
      {recentProgress.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Progress Trend (Last {selectedTimeRange} days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentProgress.slice(-10).map((score, index) => (
                <div key={score.id} className="flex items-center gap-4">
                  <div className="w-16 text-sm text-muted-foreground">
                    {format(new Date(score.created_at!), 'MM/dd')}
                  </div>
                  <div className="flex-1">
                    <Progress value={score.score_value} className="h-2" />
                  </div>
                  <div className="w-12 text-sm font-medium">
                    {score.score_value}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Sight Singing History
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by date or notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </div>

          {/* Records List */}
          <div className="space-y-3">
            {filteredScores.length > 0 ? (
              filteredScores.map((score) => (
                <div key={score.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Star className={`h-8 w-8 ${getScoreColor(score.score_value)}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xl font-bold ${getScoreColor(score.score_value)}`}>
                            {score.score_value}/100
                          </span>
                          <Badge variant="outline">
                            {getGradeLabel(score.score_value)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {score.performance_date && format(new Date(score.performance_date), 'PPP')}
                        </p>
                        {score.notes && (
                          <p className="text-sm mt-1 max-w-md">{score.notes}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ? 'No records match your search.' : 'No sight singing records yet.'}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};