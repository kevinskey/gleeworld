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
  title: string;
  description: string;
  location: string;
  venue_name: string;
  created_at: string;
  external_id: string;
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
      const { data, error } = await supabase
        .from('gw_events')
        .select('*')
        .eq('event_type', 'scoring')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSavedScores(data || []);
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
      const { error } = await supabase
        .from('gw_events')
        .delete()
        .eq('id', scoreId);

      if (error) throw error;

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
                      {extractEventType(score.title)}
                    </Badge>
                    <Badge variant="outline">
                      {extractScorePercentage(score.title)}
                    </Badge>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold">
                      {extractPerformerName(score.title)}
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