import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface SavedScore {
  id: string;
  title?: string;
  description?: string;
  performer_name?: string;
  event_type?: string;
  song_title?: string;
  total_score?: number;
  max_score?: number;
  percentage?: number;
  overall_score?: number;
  comments?: string;
  created_at: string;
  category_scores?: any;
}

export const SavedScoresViewer = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [savedScores, setSavedScores] = useState<SavedScore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSavedScores();
  }, []);

  const fetchSavedScores = async () => {
    if (!user) return;

    try {
      // Try to fetch from the new gw_performance_scores table first
      const { data: newScores, error: newError } = await supabase
        .from('gw_performance_scores')
        .select('*')
        .eq('evaluator_id', user.id)
        .order('created_at', { ascending: false });

      if (newScores && newScores.length > 0) {
        // Transform new scores to match expected format
        const transformedScores = newScores.map((score: any) => ({
          id: score.id,
          title: `${score.event_type.toUpperCase()}: ${score.performer_name}${score.song_title ? ` - ${score.song_title}` : ''} - Score: ${score.percentage}%`,
          description: `Total Score: ${score.total_score}/${score.max_score} (${score.percentage}%)\n${score.comments || 'No comments'}`,
          created_at: score.created_at,
          performer_name: score.performer_name,
          event_type: score.event_type,
          total_score: score.total_score,
          max_score: score.max_score,
          percentage: score.percentage
        }));
        setSavedScores(transformedScores);
      } else {
        // Fallback to old gw_events table for legacy scores
        const { data: oldScores, error: oldError } = await supabase
          .from('gw_events')
          .select('*')
          .eq('event_type', 'scoring')
          .eq('created_by', user.id)
          .order('created_at', { ascending: false });

        if (oldScores) {
          setSavedScores(oldScores);
        }
      }
    } catch (error) {
      console.error('Error fetching saved scores:', error);
      toast({
        title: "Error",
        description: "Failed to load saved scores",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteScore = async (scoreId: string) => {
    try {
      // Try deleting from new table first
      const { error: newError } = await supabase
        .from('gw_performance_scores')
        .delete()
        .eq('id', scoreId);

      if (newError) {
        // If not found, try old table
        const { error: oldError } = await supabase
          .from('gw_events')
          .delete()
          .eq('id', scoreId);

        if (oldError) throw oldError;
      }

      setSavedScores(prev => prev.filter(score => score.id !== scoreId));
      toast({
        title: "Score Deleted",
        description: "Score has been removed successfully"
      });
    } catch (error) {
      console.error('Error deleting score:', error);
      toast({
        title: "Error",
        description: "Failed to delete score",
        variant: "destructive"
      });
    }
  };

  const extractScorePercentage = (title: string) => {
    const match = title.match(/Score: (\d+(?:\.\d+)?)%/);
    return match ? match[1] + '%' : 'N/A';
  };

  const extractEventType = (title: string) => {
    const match = title.match(/^([A-Z]+):/);
    return match ? match[1] : 'SCORE';
  };

  const extractPerformerName = (title: string) => {
    const match = title.match(/: (.+) - Score:/);
    return match ? match[1] : 'Unknown Performer';
  };

  if (loading) {
    return (
      <div className="p-4">
        <p>Loading saved scores...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Saved Scores</CardTitle>
          </CardHeader>
        </Card>

        {savedScores.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground">No saved scores yet</p>
            </CardContent>
          </Card>
        ) : (
          savedScores.map((score) => (
            <Card key={score.id}>
              <CardContent className="pt-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary">
                      {score.title ? extractEventType(score.title) : score.event_type?.toUpperCase() || 'SCORE'}
                    </Badge>
                    <Badge variant="outline">
                      {score.title ? extractScorePercentage(score.title) : `${score.percentage || 0}%`}
                    </Badge>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold">
                      {score.title ? extractPerformerName(score.title) : score.performer_name || 'Unknown Performer'}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {new Date(score.created_at).toLocaleDateString()} at{' '}
                      {new Date(score.created_at).toLocaleTimeString()}
                    </p>
                  </div>

                  <div className="bg-muted/50 p-3 rounded-md">
                    <pre className="text-xs whitespace-pre-wrap font-mono">
                      {score.description}
                    </pre>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => deleteScore(score.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};