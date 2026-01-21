import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

/**
 * UNIVERSAL AI-ASSISTED GRADING HOOK
 * 
 * Design Principle:
 * AI assists evaluation.
 * Faculty performs assessment.
 * Students experience grading—not automation.
 */

export interface RubricCriterion {
  id: string;
  name: string;
  description: string;
  max_points: number;
  display_order: number;
}

export interface CriterionScore {
  criterion_name: string;
  points_earned: number;
  max_points: number;
  evidence: string;
  feedback: string;
}

export interface AIDetection {
  is_flagged: boolean;
  confidence: 'low' | 'medium' | 'high';
  indicators: string[];
  reasoning: string;
}

export interface DraftGrade {
  id: string;
  submissionId: string;
  totalScore: number;
  maxPoints: number;
  percentage: number;
  letterGrade: string;
  criteriaScores: CriterionScore[];
  overallStrengths: string;
  areasForImprovement: string;
  overallFeedback: string;
  aiDetection: AIDetection;
  status: 'pending_review' | 'approved' | 'rejected' | 'modified';
}

export interface FinalGrade {
  id: string;
  totalScore: number;
  maxScore: number;
  percentage: number;
  letterGrade: string;
  criteriaScores: CriterionScore[];
  overallFeedback: string;
  instructorComment: string;
  isPublished: boolean;
}

export const useUniversalGrading = (courseId: string) => {
  const [isGrading, setIsGrading] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const { toast } = useToast();

  /**
   * Generate AI draft grade for a submission
   * This creates an INTERNAL draft that requires instructor approval
   */
  const generateDraftGrade = useCallback(async (
    submissionId: string,
    assignmentId: string,
    studentId: string,
    submissionContent: string,
    rubricId?: string
  ): Promise<DraftGrade | null> => {
    setIsGrading(true);
    
    try {
      console.log('[useUniversalGrading] Generating draft grade...');
      
      const { data, error } = await supabase.functions.invoke('universal-ai-grade', {
        body: {
          submissionId,
          assignmentId,
          courseId,
          studentId,
          submissionContent,
          rubricId
        }
      });

      if (error) throw error;

      if (data.error) {
        toast({
          title: 'AI Grading Failed',
          description: data.error,
          variant: 'destructive'
        });
        return null;
      }

      toast({
        title: 'AI Draft Created',
        description: 'Review the draft and approve to release grades.',
      });

      return {
        id: data.draftId,
        submissionId,
        totalScore: data.draft.totalScore,
        maxPoints: data.draft.maxPoints,
        percentage: data.draft.percentage,
        letterGrade: data.draft.letterGrade,
        criteriaScores: data.draft.criteriaScores,
        overallStrengths: data.draft.overallStrengths,
        areasForImprovement: data.draft.areasForImprovement,
        overallFeedback: data.draft.overallFeedback,
        aiDetection: data.draft.aiDetection,
        status: 'pending_review'
      };

    } catch (error) {
      console.error('[useUniversalGrading] Error:', error);
      toast({
        title: 'Grading Error',
        description: 'Failed to generate AI grade. Please try again.',
        variant: 'destructive'
      });
      return null;
    } finally {
      setIsGrading(false);
    }
  }, [courseId, toast]);

  /**
   * Approve an AI draft grade
   * Instructor becomes the author of record - students never see AI
   */
  const approveDraftGrade = useCallback(async (
    draftId: string,
    options?: {
      modifiedScores?: CriterionScore[];
      modifiedFeedback?: string;
      instructorComment?: string;
      publish?: boolean;
    }
  ): Promise<FinalGrade | null> => {
    setIsApproving(true);
    
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user?.id) throw new Error('Not authenticated');

      console.log('[useUniversalGrading] Approving draft grade...');

      const { data, error } = await supabase.functions.invoke('approve-ai-grade', {
        body: {
          draftId,
          instructorId: user.user.id,
          modifiedScores: options?.modifiedScores,
          modifiedFeedback: options?.modifiedFeedback,
          instructorComment: options?.instructorComment,
          publish: options?.publish ?? true
        }
      });

      if (error) throw error;

      if (data.error) {
        toast({
          title: 'Approval Failed',
          description: data.error,
          variant: 'destructive'
        });
        return null;
      }

      toast({
        title: data.isPublished ? 'Grade Published' : 'Grade Approved',
        description: data.isPublished 
          ? 'Grade is now visible to the student.'
          : 'Grade saved. Publish when ready.',
      });

      return {
        id: data.finalGradeId,
        ...data.grade,
        isPublished: data.isPublished
      };

    } catch (error) {
      console.error('[useUniversalGrading] Approval error:', error);
      toast({
        title: 'Approval Error',
        description: 'Failed to approve grade. Please try again.',
        variant: 'destructive'
      });
      return null;
    } finally {
      setIsApproving(false);
    }
  }, [toast]);

  /**
   * Fetch pending draft grades for instructor review
   */
  const fetchPendingDrafts = useCallback(async (assignmentId?: string) => {
    const query = supabase
      .from('gw_ai_draft_grades')
      .select('*')
      .eq('course_id', courseId)
      .eq('status', 'pending_review')
      .order('created_at', { ascending: false });

    if (assignmentId) {
      query.eq('assignment_id', assignmentId);
    }

    const { data, error } = await query;
    
    if (error) {
      console.error('[useUniversalGrading] Error fetching drafts:', error);
      return [];
    }

    return data.map(draft => ({
      id: draft.id,
      submissionId: draft.submission_id,
      totalScore: draft.ai_total_score,
      maxPoints: draft.ai_max_score,
      percentage: draft.ai_percentage,
      letterGrade: draft.ai_letter_grade,
      criteriaScores: (draft.ai_criteria_scores || []) as unknown as CriterionScore[],
      overallStrengths: draft.ai_strengths,
      areasForImprovement: draft.ai_improvements,
      overallFeedback: draft.ai_overall_feedback,
      aiDetection: {
        is_flagged: draft.ai_detection_flagged,
        confidence: draft.ai_detection_confidence as 'low' | 'medium' | 'high',
        indicators: (draft.ai_detection_indicators || []) as unknown as string[],
        reasoning: draft.ai_detection_reasoning
      },
      status: draft.status as DraftGrade['status']
    }));
  }, [courseId]);

  /**
   * Fetch a student's published grades (what students see - NO AI info)
   */
  const fetchStudentGrades = useCallback(async (studentId: string) => {
    const { data, error } = await supabase
      .from('gw_final_grades')
      .select('*')
      .eq('course_id', courseId)
      .eq('student_id', studentId)
      .eq('is_published', true)
      .order('graded_at', { ascending: false });

    if (error) {
      console.error('[useUniversalGrading] Error fetching student grades:', error);
      return [];
    }

    // Return ONLY student-safe data - NO AI references
    return data.map(grade => ({
      id: grade.id,
      assignmentId: grade.assignment_id,
      totalScore: grade.total_score,
      maxScore: grade.max_score,
      percentage: grade.percentage,
      letterGrade: grade.letter_grade,
      criteriaScores: grade.criteria_scores,
      overallFeedback: grade.overall_feedback,
      instructorComment: grade.instructor_comment,
      gradedAt: grade.graded_at
    }));
  }, [courseId]);

  /**
   * Fetch rubric for an assignment (visible to students)
   */
  const fetchRubric = useCallback(async (assignmentId: string) => {
    const { data, error } = await supabase
      .from('gw_universal_rubrics')
      .select('*')
      .eq('assignment_id', assignmentId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('[useUniversalGrading] Error fetching rubric:', error);
    }

    return data;
  }, []);

  /**
   * Bulk grade multiple submissions with AI
   */
  const bulkGenerateDrafts = useCallback(async (
    submissions: Array<{
      submissionId: string;
      assignmentId: string;
      studentId: string;
      content: string;
    }>,
    rubricId?: string
  ) => {
    const results = [];
    
    for (const sub of submissions) {
      const result = await generateDraftGrade(
        sub.submissionId,
        sub.assignmentId,
        sub.studentId,
        sub.content,
        rubricId
      );
      results.push({ submissionId: sub.submissionId, draft: result });
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    toast({
      title: 'Bulk Grading Complete',
      description: `Generated ${results.filter(r => r.draft).length}/${submissions.length} drafts.`
    });

    return results;
  }, [generateDraftGrade, toast]);

  return {
    // State
    isGrading,
    isApproving,
    
    // AI Draft Operations
    generateDraftGrade,
    bulkGenerateDrafts,
    fetchPendingDrafts,
    
    // Instructor Approval
    approveDraftGrade,
    
    // Student-Safe Operations
    fetchStudentGrades,
    fetchRubric
  };
};
