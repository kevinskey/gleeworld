import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save, Music, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface SightReadingScoreWindowProps {
  performerId: string;
  performerName: string;
  onScoreSubmitted: (scoreData: any) => void;
}

interface ScoringCriteria {
  id: string;
  name: string;
  description: string;
  scores: {
    4: string;
    3: string;
    2: string;
    1: string;
  };
}

const SIGHT_READING_CRITERIA: ScoringCriteria[] = [
  {
    id: "pitch_accuracy",
    name: "Pitch Accuracy",
    description: "Accuracy of sung pitches",
    scores: {
      4: "All or nearly all pitches correct",
      3: "Few minor pitch errors",
      2: "Frequent pitch errors",
      1: "Inaccurate pitches throughout"
    }
  },
  {
    id: "rhythmic_accuracy",
    name: "Rhythmic Accuracy",
    description: "Precision of rhythmic patterns",
    scores: {
      4: "All rhythms precise and accurate",
      3: "Minor rhythmic hesitation",
      2: "Significant rhythmic instability",
      1: "Rhythms largely incorrect or inconsistent"
    }
  },
  {
    id: "tonal_awareness",
    name: "Tonal Center Awareness",
    description: "Understanding of key center and tonality",
    scores: {
      4: "Strong sense of key center and tonality",
      3: "Occasional uncertainty",
      2: "Struggles to stay in key",
      1: "No discernible tonal center"
    }
  },
  {
    id: "key_signature",
    name: "Key Signature Navigation",
    description: "Proper handling of accidentals and key signatures",
    scores: {
      4: "Navigates key signature flawlessly",
      3: "One or two missed accidentals",
      2: "Several accidental/key signature errors",
      1: "Ignores key signature"
    }
  },
  {
    id: "tempo_consistency",
    name: "Tempo Consistency",
    description: "Maintaining steady tempo throughout",
    scores: {
      4: "Maintains steady, appropriate tempo",
      3: "Minor fluctuations",
      2: "Noticeable slowdowns or rushing",
      1: "Tempo highly inconsistent"
    }
  },
  {
    id: "interval_recognition",
    name: "Interval Recognition",
    description: "Accuracy in singing intervals",
    scores: {
      4: "Accurately sings all intervals",
      3: "Most intervals accurate",
      2: "Frequent interval errors",
      1: "Lacks recognition of intervallic structure"
    }
  },
  {
    id: "text_underlay",
    name: "Text Underlay",
    description: "Musical alignment of text with melody",
    scores: {
      4: "Text is clearly and musically aligned",
      3: "Some awkward text placement",
      2: "Frequent issues with word alignment",
      1: "Poor alignment or unintelligible text"
    }
  },
  {
    id: "technique",
    name: "Sight Singing Technique",
    description: "Use of solfege, numbers, or other sight singing methods",
    scores: {
      4: "Uses solfege/numbers/body signs effectively",
      3: "Generally consistent technique",
      2: "Inconsistent or unclear technique",
      1: "No clear strategy or technique used"
    }
  },
  {
    id: "expressiveness",
    name: "Expressiveness",
    description: "Musical phrasing and dynamic interpretation",
    scores: {
      4: "Uses musical phrasing and marked dynamics fluently",
      3: "Some dynamic and expressive effort",
      2: "Little expressiveness",
      1: "No phrasing or dynamic shaping"
    }
  },
  {
    id: "recovery",
    name: "Recovery from Mistakes",
    description: "Ability to continue after errors",
    scores: {
      4: "Recovers quickly and seamlessly",
      3: "Recovers with minor hesitation",
      2: "Has difficulty recovering",
      1: "Stops, restarts, or visibly gives up"
    }
  }
];

export const SightReadingScoreWindow = ({ 
  performerId, 
  performerName, 
  onScoreSubmitted 
}: SightReadingScoreWindowProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [scores, setScores] = useState<{ [key: string]: number }>({});
  const [comments, setComments] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleScoreChange = (criteriaId: string, score: number) => {
    setScores(prev => ({
      ...prev,
      [criteriaId]: score
    }));
  };

  const calculateTotalScore = () => {
    return Object.values(scores).reduce((sum, score) => sum + score, 0);
  };

  const handleSubmit = async () => {
    if (Object.keys(scores).length !== SIGHT_READING_CRITERIA.length) {
      toast({
        title: "Incomplete Scoring",
        description: "Please score all criteria before submitting.",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to submit scores.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const totalScore = calculateTotalScore();
      const maxScore = SIGHT_READING_CRITERIA.length * 4; // 40 points max
      const percentage = (totalScore / maxScore) * 100;

      // Prepare categories data
      const categoriesData = SIGHT_READING_CRITERIA.map(criteria => ({
        name: criteria.name,
        score: scores[criteria.id] || 0,
        maxScore: 4,
        description: criteria.description
      }));

      const { error } = await supabase
        .from('gw_performance_scores')
        .insert({
          performer_id: performerId,
          performer_name: performerName,
          evaluator_id: user.id,
          event_type: 'sight_reading_test',
          categories: categoriesData,
          total_score: totalScore,
          max_score: maxScore,
          percentage: percentage,
          comments: comments || null
        });

      if (error) {
        console.error('Error saving sight reading score:', error);
        toast({
          title: "Error",
          description: "Failed to save the sight reading score. Please try again.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Score Saved",
        description: `Sight reading evaluation for ${performerName} has been saved successfully.`,
      });

      onScoreSubmitted({
        totalScore,
        maxScore,
        percentage,
        categories: categoriesData,
        comments
      });

    } catch (error) {
      console.error('Error submitting sight reading score:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalScore = calculateTotalScore();
  const maxScore = SIGHT_READING_CRITERIA.length * 4;
  const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Header */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onScoreSubmitted(null)}
                className="p-1"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex-1">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Music className="h-5 w-5" />
                  Sight Reading Evaluation
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">{performerName}</p>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Scoring Grid */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Evaluation Criteria</CardTitle>
            <p className="text-sm text-muted-foreground">
              Score each criterion on a 4-point scale (4 = Excellent, 1 = Poor)
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {SIGHT_READING_CRITERIA.map((criteria) => (
              <div key={criteria.id} className="space-y-3">
                <div>
                  <h3 className="font-medium">{criteria.name}</h3>
                  <p className="text-sm text-muted-foreground">{criteria.description}</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {[4, 3, 2, 1].map((score) => (
                    <button
                      key={score}
                      onClick={() => handleScoreChange(criteria.id, score)}
                      className={`p-3 text-left border rounded-lg transition-colors ${
                        scores[criteria.id] === score
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-card hover:bg-muted border-border'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{score} - {
                          score === 4 ? 'Excellent' :
                          score === 3 ? 'Good' :
                          score === 2 ? 'Needs Improvement' : 'Poor'
                        }</span>
                        {scores[criteria.id] === score && (
                          <Star className="h-4 w-4 fill-current" />
                        )}
                      </div>
                      <p className="text-sm opacity-90">
                        {criteria.scores[score as keyof typeof criteria.scores]}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Score Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Score Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold">{totalScore}</div>
                <div className="text-sm text-muted-foreground">Total Score</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{maxScore}</div>
                <div className="text-sm text-muted-foreground">Max Score</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{percentage.toFixed(1)}%</div>
                <div className="text-sm text-muted-foreground">Percentage</div>
              </div>
            </div>
            
            {totalScore >= 28 && (
              <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-sm text-green-800 dark:text-green-200 text-center">
                  ✓ Recommended passing range (28-32+ points)
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Comments */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Evaluator Comments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="comments">
                Notes on voice quality, confidence, or section placement recommendations
              </Label>
              <Textarea
                id="comments"
                placeholder="Enter any additional observations, recommendations for section placement, or notes about the performer's voice quality and confidence..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <Card>
          <CardContent className="pt-6">
            <Button
              onClick={handleSubmit}
              disabled={Object.keys(scores).length !== SIGHT_READING_CRITERIA.length || isSubmitting}
              className="w-full"
              size="lg"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSubmitting ? "Saving..." : "Save Sight Reading Evaluation"}
            </Button>
            
            {Object.keys(scores).length !== SIGHT_READING_CRITERIA.length && (
              <p className="text-sm text-muted-foreground text-center mt-2">
                Please score all {SIGHT_READING_CRITERIA.length} criteria to submit
                ({Object.keys(scores).length}/{SIGHT_READING_CRITERIA.length} completed)
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};