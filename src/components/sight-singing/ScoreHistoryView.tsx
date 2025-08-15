import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUserScores } from '@/hooks/useUserScores';
import { useSheetMusicLibrary } from '@/hooks/useSheetMusicLibrary';
import { Trophy, TrendingUp, Calendar, Music, BarChart3, Target } from 'lucide-react';
import { format } from 'date-fns';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface ScoreHistoryViewProps {
  selectedScoreId?: string;
}

export const ScoreHistoryView: React.FC<ScoreHistoryViewProps> = ({ selectedScoreId }) => {
  const { scores, loading, getAverageScore, getBestScore, getScoreProgress } = useUserScores();
  const { scores: sheetMusic } = useSheetMusicLibrary();
  const [timeRange, setTimeRange] = useState('30');

  const filteredScores = selectedScoreId 
    ? scores.filter(score => score.sheet_music_id === selectedScoreId)
    : scores;

  const getSheetMusicTitle = (sheetMusicId: string | null) => {
    if (!sheetMusicId) return 'Generated Exercise';
    const sheet = sheetMusic.find(s => s.id === sheetMusicId);
    return sheet?.title || 'Unknown Score';
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-yellow-600';
    if (score >= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 90) return 'bg-green-500';
    if (score >= 75) return 'bg-yellow-500';
    if (score >= 60) return 'bg-orange-500';
    return 'bg-red-500';
  };

  // Prepare chart data
  const progressData = selectedScoreId 
    ? getScoreProgress(selectedScoreId, parseInt(timeRange))
    : filteredScores.slice(-10); // Last 10 scores for overall progress

  const chartData = progressData.map((score, index) => ({
    attempt: index + 1,
    score: score.score_value,
    date: score.created_at ? format(new Date(score.created_at), 'MMM dd') : `Attempt ${index + 1}`,
  }));

  // Score distribution data
  const scoreRanges = [
    { name: 'Excellent (90-100)', value: 0, color: '#10b981' },
    { name: 'Good (75-89)', value: 0, color: '#f59e0b' },
    { name: 'Fair (60-74)', value: 0, color: '#f97316' },
    { name: 'Needs Work (0-59)', value: 0, color: '#ef4444' },
  ];

  filteredScores.forEach(score => {
    if (score.score_value >= 90) scoreRanges[0].value++;
    else if (score.score_value >= 75) scoreRanges[1].value++;
    else if (score.score_value >= 60) scoreRanges[2].value++;
    else scoreRanges[3].value++;
  });

  const pieData = scoreRanges.filter(range => range.value > 0);

  // Performance metrics
  const totalAttempts = filteredScores.length;
  const averageScore = totalAttempts > 0 ? getAverageScore(selectedScoreId) : 0;
  const bestScore = totalAttempts > 0 ? getBestScore(selectedScoreId) : 0;
  const improvementTrend = chartData.length > 1 
    ? chartData[chartData.length - 1].score - chartData[0].score 
    : 0;

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Loading score history...</div>
        </CardContent>
      </Card>
    );
  }

  if (totalAttempts === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Score History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            <Music className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No practice sessions recorded yet.</p>
            <p className="text-sm">Complete some sight-singing exercises to see your progress!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Score History
          {selectedScoreId && (
            <Badge variant="outline" className="ml-2">
              {getSheetMusicTitle(selectedScoreId)}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="progress">Progress</TabsTrigger>
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Performance Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <Trophy className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
                  <div className="text-2xl font-bold">{bestScore.toFixed(0)}%</div>
                  <div className="text-sm text-muted-foreground">Best Score</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Target className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                  <div className="text-2xl font-bold">{averageScore.toFixed(0)}%</div>
                  <div className="text-sm text-muted-foreground">Average</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Calendar className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <div className="text-2xl font-bold">{totalAttempts}</div>
                  <div className="text-sm text-muted-foreground">Sessions</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <TrendingUp className={`h-8 w-8 mx-auto mb-2 ${improvementTrend >= 0 ? 'text-green-500' : 'text-red-500'}`} />
                  <div className="text-2xl font-bold">
                    {improvementTrend >= 0 ? '+' : ''}{improvementTrend.toFixed(0)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Trend</div>
                </CardContent>
              </Card>
            </div>

            {/* Score Distribution */}
            {pieData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Score Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="progress" className="space-y-4">
            <div className="flex items-center gap-4">
              <label htmlFor="time-range" className="text-sm font-medium">Time Range:</label>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                  <SelectItem value="365">1 year</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {chartData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Progress Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip />
                        <Area
                          type="monotone"
                          dataKey="score"
                          stroke="#3b82f6"
                          fill="#3b82f6"
                          fillOpacity={0.2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="sessions" className="space-y-4">
            <div className="max-h-96 overflow-y-auto space-y-2">
              {filteredScores.map((score, index) => (
                <Card key={score.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge 
                            className={`${getScoreBadgeColor(score.score_value)} text-white`}
                          >
                            {score.score_value.toFixed(0)}%
                          </Badge>
                          <span className="text-sm font-medium">
                            {getSheetMusicTitle(score.sheet_music_id)}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {score.created_at && format(new Date(score.created_at), 'MMM dd, yyyy • HH:mm')}
                        </div>
                        {score.notes && (
                          <p className="text-sm mt-2">{score.notes}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <div className={`text-lg font-bold ${getScoreColor(score.score_value)}`}>
                          {score.score_value.toFixed(1)}%
                        </div>
                        {score.max_score && (
                          <div className="text-sm text-muted-foreground">
                            of {score.max_score}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};