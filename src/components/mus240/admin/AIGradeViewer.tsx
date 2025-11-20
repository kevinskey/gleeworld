import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Bot, Star, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AIDetectionAlert } from '../AIDetectionAlert';

interface AIGradeViewerProps {
  journalId?: string;
  studentId?: string;
  assignmentId?: string;
}

interface RubricScore {
  criterion: string;
  score: number;
  maxScore: number;
  feedback: string;
}

interface AIGrade {
  id: string;
  overall_score: number;
  letter_grade: string;
  rubric: any; // JSON field containing rubric_scores
  ai_feedback: string; // AI generated feedback
  ai_model: string;
  graded_at: string;
  assignment_id: string;
  ai_writing_detected?: boolean;
  ai_detection_confidence?: number | null;
  ai_detection_notes?: string | null;
}

export const AIGradeViewer: React.FC<AIGradeViewerProps> = ({ journalId, studentId, assignmentId }) => {
  const [grade, setGrade] = useState<AIGrade | null>(null);
  const [loading, setLoading] = useState(true);
  const [maxPoints, setMaxPoints] = useState(100);

  useEffect(() => {
    loadGrade();
  }, [journalId, studentId, assignmentId]);

  const loadGrade = async () => {
    try {
      setLoading(true);
      setGrade(null);

      let data: AIGrade[] | null = null;
      let error: any = null;

      if (journalId) {
        const result = await supabase
          .from('mus240_journal_grades')
          .select('*')
          .eq('journal_id', journalId)
          .order('graded_at', { ascending: false })
          .limit(1);

        data = result.data as AIGrade[] | null;
        error = result.error;
      }

      // Fallback: look up by student + assignment when no journal_id-linked grade
      if ((!data || data.length === 0) && studentId && assignmentId) {
        const fallback = await supabase
          .from('mus240_journal_grades')
          .select('*')
          .eq('student_id', studentId)
          .eq('assignment_id', assignmentId)
          .order('graded_at', { ascending: false })
          .limit(1);

        data = fallback.data as AIGrade[] | null;
        error = fallback.error;
      }

      if (error) throw error;

      if (data && data.length > 0) {
        setGrade(data[0]);
        
        // Fetch assignment to get points (max_points)
        const { data: assignmentData } = await supabase
          .from('gw_assignments')
          .select('points')
          .eq('id', data[0].assignment_id)
          .maybeSingle();
        
        if (assignmentData?.points) {
          setMaxPoints(assignmentData.points);
        }
      }
    } catch (error) {
      console.error('Error loading grade:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLetterGradeColor = (letterGrade: string) => {
    if (letterGrade.startsWith('A')) return 'bg-green-100 text-green-800 border-green-200';
    if (letterGrade.startsWith('B')) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (letterGrade.startsWith('C')) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    if (letterGrade.startsWith('D')) return 'bg-orange-100 text-orange-800 border-orange-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const getScoreColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 80) return 'text-blue-600';
    if (percentage >= 70) return 'text-yellow-600';
    if (percentage >= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 animate-pulse" />
            <span className="text-sm text-muted-foreground">Loading AI grade...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!grade) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">No AI grade available</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 relative z-10">
      {/* AI Detection Warning */}
      {grade.ai_writing_detected && (
        <AIDetectionAlert
          detected={grade.ai_writing_detected}
          confidence={grade.ai_detection_confidence}
          reasoning={grade.ai_detection_notes}
        />
      )}
      
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              AI Grade Assessment
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge className={getLetterGradeColor(grade.letter_grade)}>
                {grade.letter_grade}
              </Badge>
              <Badge variant="outline">
                {grade.overall_score}/{maxPoints}
              </Badge>
            </div>
          </div>
        </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Score */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Overall Score</span>
            <span className={`text-sm font-bold ${getScoreColor(grade.overall_score, maxPoints)}`}>
              {grade.overall_score}/{maxPoints}
            </span>
          </div>
          <Progress 
            value={(grade.overall_score / maxPoints) * 100} 
            className="h-2"
          />
        </div>

        {/* Rubric Breakdown */}
        {grade.rubric && Array.isArray(grade.rubric) && (
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <Star className="h-4 w-4" />
              Rubric Breakdown
            </h4>
            {grade.rubric.map((rubricScore: RubricScore, index: number) => (
              <div key={index} className="space-y-2 p-3 bg-muted rounded-md">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{rubricScore.criterion}</span>
                  <span className={`text-sm font-bold ${getScoreColor(rubricScore.score, rubricScore.maxScore)}`}>
                    {rubricScore.score}/{rubricScore.maxScore}
                  </span>
                </div>
                <Progress 
                  value={(rubricScore.score / rubricScore.maxScore) * 100} 
                  className="h-1"
                />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {rubricScore.feedback}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Overall Feedback */}
        {grade.ai_feedback && (
          <div className="space-y-2">
            <h4 className="font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              AI Feedback
            </h4>
            <div className="p-3 bg-card border rounded-md max-h-96 overflow-y-auto">
              <pre className="text-sm leading-relaxed whitespace-pre-wrap font-sans">{grade.ai_feedback}</pre>
            </div>
          </div>
        )}

        {/* AI Model Info */}
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Graded by AI: {grade.ai_model}</span>
            <span>Graded on: {new Date(grade.graded_at).toLocaleString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
    </div>
  );
};