
import React from 'react';
import { EnhancedRubricDisplay } from './rubrics/EnhancedRubricDisplay';

interface RubricScore {
  criterion: string;
  score: number;
  max_score: number;
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
    feedback: string;
    ai_model?: string;
    graded_at: string;
  };
}

export const JournalGradeDisplay: React.FC<JournalGradeDisplayProps> = ({ grade }) => {
  // Transform the grade data to match EnhancedRubricDisplay expectations
  const enhancedGrade = {
    overall_score: grade.overall_score,
    letter_grade: grade.letter_grade,
    rubric_scores: grade.rubric?.scores || [],
    overall_feedback: grade.feedback,
    ai_model: grade.ai_model,
    graded_at: grade.graded_at
  };

  return (
    <EnhancedRubricDisplay 
      grade={enhancedGrade}
      showDetailed={true}
      interactive={true}
    />
  );
};
