import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Trash2, ChevronDown, ChevronRight, User, Music } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface SavedScore {
  id: string;
  performer_id?: string;
  performer_name: string;
  event_type: string;
  total_score: number;
  max_score: number;
  percentage: number;
  overall_score?: number;
  comments?: string;
  created_at: string;
  categories?: any;
}

interface GroupedScore {
  performer_name: string;
  performer_id?: string;
  scores: SavedScore[];
}

export const SavedScoresViewer = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [savedScores, setSavedScores] = useState<SavedScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPerformers, setExpandedPerformers] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchSavedScores();
  }, []);

  const fetchSavedScores = async () => {
    if (!user) return;

    try {
      const { data: scores, error } = await supabase
        .from('gw_performance_scores')
        .select('*')
        .eq('evaluator_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (scores) {
        setSavedScores(scores);
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

  // Group scores by performer
  const groupedScores: GroupedScore[] = savedScores.reduce((acc, score) => {
    const existing = acc.find(group => group.performer_name === score.performer_name);
    if (existing) {
      existing.scores.push(score);
    } else {
      acc.push({
        performer_name: score.performer_name,
        performer_id: score.performer_id,
        scores: [score]
      });
    }
    return acc;
  }, [] as GroupedScore[]);

  const togglePerformer = (performerName: string) => {
    const newExpanded = new Set(expandedPerformers);
    if (newExpanded.has(performerName)) {
      newExpanded.delete(performerName);
    } else {
      newExpanded.add(performerName);
    }
    setExpandedPerformers(newExpanded);
  };

  const deleteScore = async (scoreId: string) => {
    try {
      const { error } = await supabase
        .from('gw_performance_scores')
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

  const getEventTypeColor = (eventType: string) => {
    switch (eventType) {
      case 'audition': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'performance': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'competition': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'sight_reading_test': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    if (percentage >= 80) return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    if (percentage >= 70) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
  };

  if (loading) {
    return (
      <div className="p-4">
        <p>Loading saved scores...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-center flex items-center justify-center gap-2">
            <Music className="h-5 w-5" />
            Saved Scores ({savedScores.length})
          </CardTitle>
          {groupedScores.length > 0 && (
            <p className="text-sm text-muted-foreground text-center">
              {groupedScores.length} performer{groupedScores.length !== 1 ? 's' : ''} with multiple evaluation types
            </p>
          )}
        </CardHeader>
      </Card>

      {groupedScores.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <Music className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">No saved scores yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Performers can have multiple scores (audition, sight reading, performance, etc.)
            </p>
          </CardContent>
        </Card>
      ) : (
        groupedScores.map((group) => (
          <Card key={group.performer_name}>
            <Collapsible>
              <CollapsibleTrigger
                onClick={() => togglePerformer(group.performer_name)}
                className="w-full"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {expandedPerformers.has(group.performer_name) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <User className="h-4 w-4" />
                      <CardTitle className="text-left">{group.performer_name}</CardTitle>
                    </div>
                    <Badge variant="outline">
                      {group.scores.length} score{group.scores.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                  
                  {/* Preview badges for all score types */}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {group.scores.map((score) => (
                      <Badge 
                        key={score.id} 
                        className={`text-xs ${getEventTypeColor(score.event_type)}`}
                        variant="secondary"
                      >
                        {score.event_type.replace('_', ' ').toUpperCase()} - {score.percentage.toFixed(1)}%
                      </Badge>
                    ))}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <CardContent className="pt-0 space-y-4">
                  {group.scores.map((score, index) => (
                    <div key={score.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <Badge className={getEventTypeColor(score.event_type)}>
                          {score.event_type.replace('_', ' ').toUpperCase()}
                        </Badge>
                        <Badge className={getScoreColor(score.percentage)}>
                          {score.total_score}/{score.max_score} ({score.percentage.toFixed(1)}%)
                        </Badge>
                      </div>
                      
                      <div className="text-sm text-muted-foreground">
                        {new Date(score.created_at).toLocaleDateString()} at{' '}
                        {new Date(score.created_at).toLocaleTimeString()}
                      </div>

                      {score.comments && (
                        <div className="bg-muted/50 p-3 rounded-md">
                          <p className="text-sm font-medium mb-1">Evaluator Comments:</p>
                          <p className="text-sm">{score.comments}</p>
                        </div>
                      )}

                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteScore(score.id)}
                        className="w-full"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete This Score
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        ))
      )}
    </div>
  );
};