import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Star, Save, RotateCcw, Music, Mic, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface ScoreCategory {
  id: string;
  name: string;
  maxScore: number;
  currentScore: number;
  icon: React.ReactNode;
}

interface MobileScoreWindowProps {
  performerId?: string;
  performerName?: string;
  eventType?: 'audition' | 'performance' | 'competition';
  onScoreSubmitted?: (score: any) => void;
}

export const MobileScoreWindow = ({ 
  performerId, 
  performerName = "Performer", 
  eventType = 'audition',
  onScoreSubmitted 
}: MobileScoreWindowProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [categories, setCategories] = useState<ScoreCategory[]>([
    {
      id: 'vocal',
      name: 'Vocal Quality',
      maxScore: 10,
      currentScore: 0,
      icon: <Mic className="h-4 w-4" />
    },
    {
      id: 'pitch',
      name: 'Pitch Accuracy',
      maxScore: 10,
      currentScore: 0,
      icon: <Music className="h-4 w-4" />
    },
    {
      id: 'rhythm',
      name: 'Rhythm & Timing',
      maxScore: 10,
      currentScore: 0,
      icon: <Music className="h-4 w-4" />
    },
    {
      id: 'expression',
      name: 'Musical Expression',
      maxScore: 10,
      currentScore: 0,
      icon: <Star className="h-4 w-4" />
    },
    {
      id: 'stage',
      name: 'Stage Presence',
      maxScore: 10,
      currentScore: 0,
      icon: <Users className="h-4 w-4" />
    }
  ]);

  const [comments, setComments] = useState("");
  const [overallScore, setOverallScore] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  const updateCategoryScore = (categoryId: string, score: number) => {
    setCategories(prev => 
      prev.map(cat => 
        cat.id === categoryId 
          ? { ...cat, currentScore: Math.max(0, Math.min(score, cat.maxScore)) }
          : cat
      )
    );
  };

  const calculateTotalScore = () => {
    const totalPossible = categories.reduce((sum, cat) => sum + cat.maxScore, 0);
    const totalEarned = categories.reduce((sum, cat) => sum + cat.currentScore, 0);
    return { totalEarned, totalPossible, percentage: (totalEarned / totalPossible * 100).toFixed(1) };
  };

  const resetScores = () => {
    setCategories(prev => prev.map(cat => ({ ...cat, currentScore: 0 })));
    setComments("");
    setOverallScore(0);
  };

  const saveScore = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to save scores.",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      const { totalEarned, totalPossible, percentage } = calculateTotalScore();
      
      const scoreData = {
        performer_id: performerId,
        performer_name: performerName,
        evaluator_id: user.id,
        event_type: eventType,
        categories: categories.reduce((acc, cat) => ({
          ...acc,
          [cat.id]: cat.currentScore
        }), {}),
        total_score: totalEarned,
        max_score: totalPossible,
        percentage: parseFloat(percentage),
        overall_score: overallScore,
        comments: comments,
        created_at: new Date().toISOString()
      };

      // Save to database (you'll need to create this table)
      const { error } = await supabase
        .from('gw_performance_scores')
        .insert(scoreData);

      if (error) throw error;

      toast({
        title: "Score Saved!",
        description: `${performerName}'s score has been saved successfully.`
      });

      onScoreSubmitted?.(scoreData);
      resetScores();
      
    } catch (error) {
      console.error('Error saving score:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save the score. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const { totalEarned, totalPossible, percentage } = calculateTotalScore();

  return (
    <div className="min-h-screen bg-background p-4 pb-safe">
      <div className="max-w-md mx-auto space-y-4">
        {/* Header */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-center text-lg">
              {eventType.charAt(0).toUpperCase() + eventType.slice(1)} Scoring
            </CardTitle>
            <div className="text-center">
              <h3 className="font-semibold text-xl">{performerName}</h3>
              <Badge variant="secondary" className="mt-1">
                {totalEarned}/{totalPossible} ({percentage}%)
              </Badge>
            </div>
          </CardHeader>
        </Card>

        {/* Scoring Categories */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Score Categories</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {categories.map((category) => (
              <div key={category.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {category.icon}
                    <span className="text-sm font-medium">{category.name}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    /{category.maxScore}
                  </span>
                </div>
                
                {/* Score buttons */}
                <div className="grid grid-cols-5 gap-1">
                  {Array.from({ length: category.maxScore + 1 }, (_, i) => i).map(score => (
                    <Button
                      key={score}
                      variant={category.currentScore === score ? "default" : "outline"}
                      size="sm"
                      className="h-10 text-xs"
                      onClick={() => updateCategoryScore(category.id, score)}
                    >
                      {score}
                    </Button>
                  ))}
                </div>
                
                {/* Star rating visual */}
                <div className="flex justify-center gap-1">
                  {Array.from({ length: category.maxScore }, (_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        i < category.currentScore 
                          ? 'fill-yellow-400 text-yellow-400' 
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Overall Score */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Overall Impression</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="overall">Overall Score (0-100)</Label>
              <Input
                id="overall"
                type="number"
                min="0"
                max="100"
                value={overallScore}
                onChange={(e) => setOverallScore(parseInt(e.target.value) || 0)}
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* Comments */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Comments & Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Add your comments, feedback, or notes here..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={resetScores}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button 
            className="flex-1"
            onClick={saveScore}
            disabled={isSaving}
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Score'}
          </Button>
        </div>

        {/* Summary Card */}
        <Card className="border-primary/20">
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <div className="text-2xl font-bold text-primary">
                {percentage}%
              </div>
              <div className="text-sm text-muted-foreground">
                Total Score: {totalEarned}/{totalPossible}
              </div>
              {overallScore > 0 && (
                <div className="text-sm">
                  Overall: {overallScore}/100
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};