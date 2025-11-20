
import React from 'react';
import { EnhancedRubricDisplay } from './rubrics/EnhancedRubricDisplay';
import { AIDetectionAlert } from './AIDetectionAlert';

interface RubricScore {
  criterion_name: string;
  score: number;
  max_points: number;
  feedback: string;
}

interface JournalGradeDisplayProps {
  grade: {
    overall_score: number;
    letter_grade: string;
    rubric: {
      criteria: any[];
      scores: RubricScore[];
    };
    ai_feedback?: string;
    instructor_feedback?: string;
    instructor_score?: number;
    instructor_letter_grade?: string;
    ai_model?: string;
    graded_at: string;
    instructor_graded_at?: string;
    ai_writing_detected?: boolean;
    ai_detection_confidence?: number | null;
    ai_detection_notes?: string | null;
  };
}

export const JournalGradeDisplay: React.FC<JournalGradeDisplayProps> = ({ grade }) => {
  // Use instructor grade if available, otherwise AI grade
  const finalScore = grade.instructor_score ?? grade.overall_score;
  const finalGrade = grade.instructor_letter_grade ?? grade.letter_grade;
  const finalFeedback = grade.instructor_feedback ?? grade.ai_feedback ?? '';
  
  // Transform the grade data to match EnhancedRubricDisplay expectations
  const enhancedGrade = {
    overall_score: finalScore,
    letter_grade: finalGrade,
    rubric_scores: grade.rubric?.scores?.map((score: RubricScore) => ({
      criterion: score.criterion_name,
      score: score.score,
      max_score: score.max_points,
      feedback: score.feedback
    })) || [],
    overall_feedback: finalFeedback,
    ai_model: grade.ai_model,
    graded_at: grade.instructor_graded_at ?? grade.graded_at,
    is_final: !!grade.instructor_score // Indicates if this is the final instructor grade
  };

  return (
    <EnhancedRubricDisplay 
      grade={enhancedGrade}
      showDetailed={true}
      interactive={true}
      aiDetection={grade.ai_writing_detected ? {
        detected: grade.ai_writing_detected,
        confidence: grade.ai_detection_confidence,
        reasoning: grade.ai_detection_notes
      } : undefined}
    />
  );
};
