import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Music, Play, Clock, Target, TrendingUp } from 'lucide-react';
import { useUserScores } from '@/hooks/useUserScores';
import { ScoreHistoryView } from '../sight-singing/ScoreHistoryView';
import { useSheetMusic } from '@/hooks/useSheetMusic';
import { useNavigate } from 'react-router-dom';

interface PracticeStudioProps {
  user?: {
    id: string;
    email?: string;
    full_name?: string;
    role?: string;
  };
}

export const PracticeStudio: React.FC<PracticeStudioProps> = ({ user }) => {
  const [selectedScore, setSelectedScore] = useState<any>(null);
  const navigate = useNavigate();
  const { 
    getAverageScore, 
    getBestScore,
    scores: userScores 
  } = useUserScores();
  const { sheetMusic, loading: sheetMusicLoading } = useSheetMusic();

  const handlePracticeScore = (score: any) => {
    // Navigate to the main sight-reading generator with the selected score
    navigate('/sight-reading-generator', { 
      state: { selectedScore: score } 
    });
  };

  const averageScore = getAverageScore();
  const bestScore = getBestScore();
  const totalAttempts = userScores.length;

  const getGradeColor = (score: number) => {
    if (score >= 90) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (score >= 80) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (score >= 70) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    if (score >= 60) return 'text-orange-600 bg-orange-50 border-orange-200';
    return 'text-red-600 bg-red-50 border-red-200';
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
    if (score >= 63) return 'D';
    if (score >= 60) return 'D-';
    return 'F';
  };

  return (
    <div className="space-y-6">
      {/* Practice Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalAttempts > 0 ? averageScore.toFixed(1) : '--'}%
            </div>
            {totalAttempts > 0 && (
              <div className="flex items-center space-x-2 mt-1">
                <Badge 
                  variant="outline" 
                  className={getGradeColor(averageScore)}
                >
                  {getLetterGrade(averageScore)}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Best Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalAttempts > 0 ? bestScore.toFixed(1) : '--'}%
            </div>
            {totalAttempts > 0 && (
              <div className="flex items-center space-x-2 mt-1">
                <Badge 
                  variant="outline" 
                  className={getGradeColor(bestScore)}
                >
                  {getLetterGrade(bestScore)}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Attempts</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAttempts}</div>
            <p className="text-xs text-muted-foreground">
              Practice sessions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Practice Content */}
      <Tabs defaultValue="practice" className="space-y-4">
        <TabsList>
          <TabsTrigger value="practice">Practice Library</TabsTrigger>
          <TabsTrigger value="history">Score History</TabsTrigger>
        </TabsList>

        <TabsContent value="practice" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Practice Library</CardTitle>
              <CardDescription>
                Select from your assigned sheet music to practice sight reading. 
                You cannot create new exercises but can practice with any score in your library.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {sheetMusicLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-16 bg-muted rounded-lg"></div>
                    </div>
                  ))}
                </div>
              ) : sheetMusic.length === 0 ? (
                <div className="text-center py-8">
                  <Music className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No Sheet Music Available</h3>
                  <p className="text-muted-foreground">
                    Sheet music will appear here when your instructor assigns scores to practice with.
                  </p>
                </div>
              ) : (
                  <div className="grid gap-3">
                   {sheetMusic.map((score) => (
                     <div
                       key={score.id}
                       className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 border rounded-lg hover:bg-muted/50 transition-colors space-y-3 sm:space-y-0"
                     >
                      <div className="flex items-center space-x-3">
                        <Music className="h-5 w-5 text-muted-foreground" />
                     <div className="min-w-0 flex-1">
                           <h4 className="font-medium text-sm sm:text-base truncate">{score.title}</h4>
                           {score.composer && (
                             <p className="text-xs sm:text-sm text-muted-foreground truncate">by {score.composer}</p>
                           )}
                           {score.voice_parts && score.voice_parts.length > 0 && (
                             <Badge variant="outline" className="mt-1 text-xs">
                               {score.voice_parts.join(', ')}
                             </Badge>
                           )}
                         </div>
                       </div>
                       
                       <div className="flex flex-col sm:flex-row items-end sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                         {/* Show user's best score for this piece */}
                         {getBestScore(score.id) > 0 && (
                           <div className="text-right">
                             <div className="text-xs sm:text-sm font-medium">
                               Best: {getBestScore(score.id).toFixed(1)}%
                             </div>
                             <Badge 
                               variant="outline" 
                               className={`text-xs ${getGradeColor(getBestScore(score.id))}`}
                             >
                               {getLetterGrade(getBestScore(score.id))}
                             </Badge>
                           </div>
                         )}
                         
                         <Button
                           onClick={() => handlePracticeScore(score)}
                           size="sm"
                           className="w-full sm:w-auto"
                         >
                           <Play className="h-4 w-4 mr-2" />
                           <span className="hidden xs:inline">Practice</span>
                           <span className="xs:hidden">Play</span>
                         </Button>
                       </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Practice History</CardTitle>
              <CardDescription>
                View your sight reading practice history and track your progress over time.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScoreHistoryView />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};