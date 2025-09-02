import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, FileText, Brain, CheckCircle } from 'lucide-react';
import { useAIWritingGrader, type GradingRequest } from '@/hooks/useAIWritingGrader';

export const AIWritingGrader: React.FC = () => {
  const { gradeWriting, clearEvaluation, isGrading, evaluation } = useAIWritingGrader();
  
  const [formData, setFormData] = useState<GradingRequest>({
    text: '',
    prompt: '',
    rubric: '',
    maxPoints: 100
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await gradeWriting(formData);
  };

  const handleClear = () => {
    setFormData({
      text: '',
      prompt: '',
      rubric: '',
      maxPoints: 100
    });
    clearEvaluation();
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'bg-green-500';
      case 'B': return 'bg-blue-500';
      case 'C': return 'bg-yellow-500';
      case 'D': return 'bg-orange-500';
      case 'F': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-6 w-6" />
            AI Writing Grader
          </CardTitle>
          <CardDescription>
            Submit writing samples for AI-powered evaluation and feedback
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Input Section */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="text">Writing Sample *</Label>
                  <Textarea
                    id="text"
                    placeholder="Paste the writing sample to be evaluated..."
                    value={formData.text}
                    onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                    className="min-h-[200px]"
                    required
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    {formData.text.length} characters
                  </p>
                </div>

                <div>
                  <Label htmlFor="prompt">Assignment Prompt (Optional)</Label>
                  <Textarea
                    id="prompt"
                    placeholder="Describe the writing assignment or topic..."
                    value={formData.prompt}
                    onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                    className="min-h-[80px]"
                  />
                </div>

                <div>
                  <Label htmlFor="rubric">Custom Rubric (Optional)</Label>
                  <Textarea
                    id="rubric"
                    placeholder="Provide specific grading criteria..."
                    value={formData.rubric}
                    onChange={(e) => setFormData({ ...formData, rubric: e.target.value })}
                    className="min-h-[80px]"
                  />
                </div>

                <div>
                  <Label htmlFor="maxPoints">Maximum Points</Label>
                  <Input
                    id="maxPoints"
                    type="number"
                    min="1"
                    max="1000"
                    value={formData.maxPoints}
                    onChange={(e) => setFormData({ ...formData, maxPoints: parseInt(e.target.value) || 100 })}
                  />
                </div>

                <div className="flex gap-2">
                  <Button 
                    type="submit" 
                    disabled={isGrading || !formData.text.trim()}
                    className="flex-1"
                  >
                    {isGrading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Evaluating...
                      </>
                    ) : (
                      <>
                        <FileText className="mr-2 h-4 w-4" />
                        Grade Writing
                      </>
                    )}
                  </Button>
                  <Button type="button" variant="outline" onClick={handleClear}>
                    Clear
                  </Button>
                </div>
              </div>

              {/* Results Section */}
              <div>
                {evaluation ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <CheckCircle className="h-5 w-5 text-green-500" />
                          Evaluation Results
                        </span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-lg px-3 py-1">
                            {evaluation.score}/{formData.maxPoints} ({Math.round((evaluation.score / formData.maxPoints) * 100)}%)
                          </Badge>
                          <Badge className={`text-white ${getGradeColor(evaluation.letterGrade)}`}>
                            {evaluation.letterGrade}
                          </Badge>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Overall Progress */}
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span>Overall Score</span>
                          <span>{evaluation.score}/{formData.maxPoints}</span>
                        </div>
                        <Progress value={(evaluation.score / formData.maxPoints) * 100} className="h-2" />
                      </div>

                      <Separator />

                      {/* Breakdown */}
                      <div>
                        <h4 className="font-medium mb-3">Score Breakdown</h4>
                        <div className="space-y-3">
                          {Object.entries(evaluation.breakdown).map(([category, score]) => {
                            const maxCategoryScore = formData.maxPoints / 4;
                            const percentage = (score / maxCategoryScore) * 100;
                            const categoryName = category.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                            
                            return (
                              <div key={category}>
                                <div className="flex justify-between text-sm mb-1">
                                  <span>{categoryName}</span>
                                  <span>{score}/{maxCategoryScore}</span>
                                </div>
                                <Progress value={percentage} className="h-1" />
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <Separator />

                      {/* Feedback */}
                      <div>
                        <h4 className="font-medium mb-2">Detailed Feedback</h4>
                        <div className="bg-muted/50 p-3 rounded-lg">
                          <p className="text-sm whitespace-pre-wrap">{evaluation.feedback}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                      <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">No Evaluation Yet</h3>
                      <p className="text-muted-foreground">
                        Submit a writing sample to see AI-powered evaluation and feedback
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};