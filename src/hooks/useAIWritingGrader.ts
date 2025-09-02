import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface WritingEvaluation {
  score: number;
  feedback: string;
  letterGrade: string;
  breakdown: {
    contentQuality: number;
    organizationStructure: number;
    grammarMechanics: number;
    criticalThinking: number;
  };
}

export interface GradingRequest {
  text: string;
  prompt?: string;
  rubric?: string;
  maxPoints?: number;
}

export const useAIWritingGrader = () => {
  const [isGrading, setIsGrading] = useState(false);
  const [evaluation, setEvaluation] = useState<WritingEvaluation | null>(null);

  const gradeWriting = async (request: GradingRequest): Promise<WritingEvaluation | null> => {
    if (!request.text?.trim()) {
      toast.error('Please provide text content to evaluate');
      return null;
    }

    setIsGrading(true);
    setEvaluation(null);

    try {
      console.log('Sending grading request:', { 
        textLength: request.text.length,
        hasPrompt: !!request.prompt,
        hasRubric: !!request.rubric,
        maxPoints: request.maxPoints
      });

      const { data, error } = await supabase.functions.invoke('evaluate-writing', {
        body: request
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(error.message || 'Failed to evaluate writing');
      }

      if (!data.success) {
        throw new Error(data.error || 'Evaluation failed');
      }

      const evaluationResult = data.evaluation as WritingEvaluation;
      setEvaluation(evaluationResult);
      
      toast.success('Writing evaluated successfully!');
      return evaluationResult;

    } catch (error) {
      console.error('Error grading writing:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to evaluate writing';
      toast.error(errorMessage);
      return null;
    } finally {
      setIsGrading(false);
    }
  };

  const clearEvaluation = () => {
    setEvaluation(null);
  };

  return {
    gradeWriting,
    clearEvaluation,
    isGrading,
    evaluation
  };
};