import { useState, useEffect } from "react";
import { Plus, TrendingUp, Calendar, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useUserScores } from "@/hooks/useUserScores";
import { useToast } from "@/hooks/use-toast";

interface ScoreTrackerProps {
  sheetMusicId: string;
}

export const ScoreTracker = ({ sheetMusicId }: ScoreTrackerProps) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [score, setScore] = useState("");
  const [maxScore, setMaxScore] = useState("");
  const [notes, setNotes] = useState("");
  const [performanceDate, setPerformanceDate] = useState("");

  const { 
    scores, 
    loading, 
    addScore, 
    getAverageScore, 
    getBestScore, 
    getScoreProgress 
  } = useUserScores();
  const { toast } = useToast();

  const sheetMusicScores = scores.filter(s => s.sheet_music_id === sheetMusicId);
  const averageScore = getAverageScore(sheetMusicId);
  const bestScore = getBestScore(sheetMusicId);
  const progressData = getScoreProgress(sheetMusicId, 30);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!score || isNaN(Number(score))) {
      toast({
        title: "Invalid Score",
        description: "Please enter a valid score value.",
        variant: "destructive",
      });
      return;
    }

    try {
      await addScore({
        sheet_music_id: sheetMusicId,
        score_value: Number(score),
        max_score: maxScore ? Number(maxScore) : null,
        notes: notes || null,
        performance_date: performanceDate || null,
      });

      toast({
        title: "Score Added",
        description: "Your practice score has been recorded.",
      });

      // Reset form
      setScore("");
      setMaxScore("");
      setNotes("");
      setPerformanceDate("");
      setShowAddForm(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add score. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getScoreColor = (currentScore: number, max: number | null = 100) => {
    const percentage = (currentScore / (max || 100)) * 100;
    if (percentage >= 90) return "text-green-600";
    if (percentage >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Best Score</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bestScore.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">
              {sheetMusicScores.length} practice{sheetMusicScores.length !== 1 ? 's' : ''} recorded
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageScore.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">
              Across all practice sessions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Progress</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{progressData.length}</div>
            <p className="text-xs text-muted-foreground">
              Practices in last 30 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Add Score Form */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Practice Scores</CardTitle>
            <Button 
              onClick={() => setShowAddForm(!showAddForm)}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Score
            </Button>
          </div>
        </CardHeader>
        
        {showAddForm && (
          <CardContent className="border-t">
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="score">Score*</Label>
                  <Input
                    id="score"
                    type="number"
                    placeholder="85"
                    value={score}
                    onChange={(e) => setScore(e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="maxScore">Max Score (optional)</Label>
                  <Input
                    id="maxScore"
                    type="number"
                    placeholder="100"
                    value={maxScore}
                    onChange={(e) => setMaxScore(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="performanceDate">Performance Date (optional)</Label>
                <Input
                  id="performanceDate"
                  type="date"
                  value={performanceDate}
                  onChange={(e) => setPerformanceDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Practice notes, areas to work on, etc."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={loading}>
                  Add Score
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowAddForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        )}
      </Card>

      {/* Score History */}
      <Card>
        <CardHeader>
          <CardTitle>Score History</CardTitle>
        </CardHeader>
        <CardContent>
          {sheetMusicScores.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No practice scores recorded yet.</p>
              <p className="text-sm">Add your first score to start tracking progress!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sheetMusicScores.map((scoreEntry) => (
                <div key={scoreEntry.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className={`text-2xl font-bold ${getScoreColor(scoreEntry.score_value, scoreEntry.max_score)}`}>
                        {scoreEntry.score_value}
                        {scoreEntry.max_score && `/${scoreEntry.max_score}`}
                      </div>
                      
                      <div>
                        {scoreEntry.performance_date && (
                          <Badge variant="outline" className="mb-1">
                            {new Date(scoreEntry.performance_date).toLocaleDateString()}
                          </Badge>
                        )}
                        {scoreEntry.created_at && (
                          <p className="text-sm text-muted-foreground">
                            Recorded {new Date(scoreEntry.created_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {scoreEntry.notes && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {scoreEntry.notes}
                      </p>
                    )}
                  </div>
                  
                  <div className="text-right">
                    {scoreEntry.max_score && (
                      <div className="text-sm font-medium">
                        {((scoreEntry.score_value / scoreEntry.max_score) * 100).toFixed(1)}%
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};