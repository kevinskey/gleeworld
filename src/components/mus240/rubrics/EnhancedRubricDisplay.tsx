import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  GraduationCap, 
  Bot, 
  TrendingUp, 
  Clock, 
  Target, 
  Award,
  BarChart3,
  Eye,
  ChevronDown,
  ChevronUp,
  Lightbulb
} from 'lucide-react';
import { AIDetectionAlert } from '../AIDetectionAlert';

interface RubricScore {
  criterion: string;
  score: number;
  max_score: number;
  feedback: string;
  weight?: number;
}

interface EnhancedRubricDisplayProps {
  grade: {
    overall_score: number;
    letter_grade: string;
    rubric_scores?: RubricScore[];
    overall_feedback: string;
    ai_model?: string;
    graded_at: string;
    metadata?: {
      word_count?: number;
      word_range_ok?: boolean;
      processing_time?: string;
    };
  };
  showDetailed?: boolean;
  interactive?: boolean;
  aiDetection?: {
    detected: boolean;
    confidence?: number | null;
    reasoning?: string | null;
  };
}

export const EnhancedRubricDisplay: React.FC<EnhancedRubricDisplayProps> = ({ 
  grade, 
  showDetailed = true,
  interactive = true,
  aiDetection
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedCriteria, setExpandedCriteria] = useState<Set<string>>(new Set());

  const toggleCriteria = (criterion: string) => {
    const newExpanded = new Set(expandedCriteria);
    if (newExpanded.has(criterion)) {
      newExpanded.delete(criterion);
    } else {
      newExpanded.add(criterion);
    }
    setExpandedCriteria(newExpanded);
  };

  const getScoreColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 80) return 'text-blue-600';
    if (percentage >= 70) return 'text-yellow-600';
    if (percentage >= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  const getProgressColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 90) return 'bg-green-500';
    if (percentage >= 80) return 'bg-blue-500';
    if (percentage >= 70) return 'bg-yellow-500';
    if (percentage >= 60) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const totalEarned = grade.rubric_scores?.reduce((sum, score) => sum + score.score, 0) || 0;
  const totalPossible = grade.rubric_scores?.reduce((sum, score) => sum + score.max_score, 0) || 0;

  const getPerformanceAnalysis = () => {
    if (!grade.rubric_scores) return { strengths: [], improvements: [] };
    
    const strengths = grade.rubric_scores
      .filter(score => (score.score / score.max_score) >= 0.8)
      .map(score => score.criterion);
    
    const improvements = grade.rubric_scores
      .filter(score => (score.score / score.max_score) < 0.7)
      .map(score => score.criterion);

    return { strengths, improvements };
  };

  const { strengths, improvements } = getPerformanceAnalysis();

  return (
    <div className="space-y-4">
      {/* AI Detection Warning - Show right above grade card */}
      {aiDetection?.detected && (
        <AIDetectionAlert
          detected={aiDetection.detected}
          confidence={aiDetection.confidence}
          reasoning={aiDetection.reasoning}
        />
      )}
      
      <Card className="mt-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              AI Grade Assessment
            </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="default" className="text-lg px-3 py-1">
              {grade.letter_grade}
            </Badge>
            {grade.rubric_scores && (
              <Badge variant="secondary">
                {totalEarned.toFixed(1)}/{totalPossible} points
              </Badge>
            )}
            {!grade.rubric_scores && (
              <Badge variant="secondary">
                {grade.overall_score.toFixed(1)}/20 points
              </Badge>
            )}
            {grade.ai_model && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Bot className="h-3 w-3" />
                AI Graded
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {interactive && showDetailed ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview" className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="detailed" className="flex items-center gap-1">
                <BarChart3 className="h-4 w-4" />
                Detailed
              </TabsTrigger>
              <TabsTrigger value="insights" className="flex items-center gap-1">
                <Lightbulb className="h-4 w-4" />
                Insights
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 mt-4">
              {/* Overall Feedback */}
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Instructor Feedback
                </h4>
                <div className="bg-muted/50 p-3 rounded-lg border">
                  <p className="text-sm">{grade.overall_feedback}</p>
                </div>
              </div>

              {/* Quick Rubric Overview */}
              {grade.rubric_scores && (
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Award className="h-4 w-4" />
                    Score Summary
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {grade.rubric_scores.map((score, index) => (
                      <div key={index} className="text-center p-3 rounded-lg border bg-background">
                        <div className={`font-bold text-lg ${getScoreColor(score.score, score.max_score)}`}>
                          {score.score}/{score.max_score}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {score.criterion}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="detailed" className="space-y-4 mt-4">
              {grade.rubric_scores && (
                <div>
                  <h4 className="font-medium mb-3">Detailed Rubric Breakdown</h4>
                  <div className="space-y-3">
                    {grade.rubric_scores.map((score, index) => (
                      <div key={index} className="border rounded-lg bg-background">
                        <div 
                          className="p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => interactive && toggleCriteria(score.criterion)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Badge variant="outline" className={getScoreColor(score.score, score.max_score)}>
                                {score.score}/{score.max_score}
                              </Badge>
                              <span className="font-medium text-sm">{score.criterion}</span>
                            </div>
                            {interactive && (
                              expandedCriteria.has(score.criterion) ? 
                                <ChevronUp className="h-4 w-4" /> : 
                                <ChevronDown className="h-4 w-4" />
                            )}
                          </div>
                          <div className="mt-2">
                            <Progress 
                              value={(score.score / score.max_score) * 100} 
                              className="h-2"
                            />
                          </div>
                        </div>
                        {(!interactive || expandedCriteria.has(score.criterion)) && (
                          <div className="px-3 pb-3 border-t bg-muted/20">
                            <p className="text-xs text-muted-foreground mt-2">
                              {score.feedback}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="insights" className="space-y-4 mt-4">
              {/* Performance Analysis */}
              <div className="grid md:grid-cols-2 gap-4">
                {strengths.length > 0 && (
                  <Card className="border-green-200 bg-green-50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2 text-green-700">
                        <TrendingUp className="h-4 w-4" />
                        Strengths
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="text-sm text-green-600 space-y-1">
                        {strengths.map((strength, index) => (
                          <li key={index}>• {strength}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {improvements.length > 0 && (
                  <Card className="border-orange-200 bg-orange-50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2 text-orange-700">
                        <Target className="h-4 w-4" />
                        Areas for Growth
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="text-sm text-orange-600 space-y-1">
                        {improvements.map((improvement, index) => (
                          <li key={index}>• {improvement}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Additional Insights */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                  <Lightbulb className="h-4 w-4" />
                  Tips for Next Time
                </h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  {grade.metadata?.word_count && grade.metadata.word_count < 250 && (
                    <li>• Aim for 250-300 words to fully develop your analysis</li>
                  )}
                  {improvements.includes('Musical Analysis') && (
                    <li>• Include specific musical elements like harmony, rhythm, or form</li>
                  )}
                  {improvements.includes('Critical Thinking') && (
                    <li>• Connect the music to broader historical and cultural contexts</li>
                  )}
                  {improvements.includes('Content Understanding') && (
                    <li>• Research the artist's background and the piece's significance</li>
                  )}
                </ul>
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          // Simple view for non-interactive display
          <div className="space-y-4">
            {/* Overall Feedback */}
            <div>
              <h4 className="font-medium mb-2">Instructor Feedback</h4>
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-sm">{grade.overall_feedback}</p>
              </div>
            </div>

            {/* Rubric Breakdown */}
            {grade.rubric_scores && (
              <div>
                <h4 className="font-medium mb-3">Rubric Breakdown</h4>
                <div className="space-y-3">
                  {grade.rubric_scores.map((score, index) => (
                    <div key={index} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">{score.criterion}</span>
                        <Badge variant="outline">
                          {score.score}/{score.max_score}
                        </Badge>
                      </div>
                      <Progress 
                        value={(score.score / score.max_score) * 100} 
                        className="h-2 mb-2"
                      />
                      <p className="text-xs text-muted-foreground">{score.feedback}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Metadata */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-4 border-t mt-4">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Graded {new Date(grade.graded_at).toLocaleDateString()}
          </div>
          {grade.metadata?.word_count && (
            <div>Word Count: {grade.metadata.word_count}</div>
          )}
          {grade.metadata?.processing_time && (
            <div>Processing: {grade.metadata.processing_time}</div>
          )}
        </div>
      </CardContent>
    </Card>
    </div>
  );
};