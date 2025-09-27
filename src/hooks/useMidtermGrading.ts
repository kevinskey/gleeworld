import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UserProfile {
  user_id: string;
  full_name: string;
  email: string;
}

interface MidtermSubmissionWithProfile {
  [key: string]: any;
  profile: UserProfile | null;
}

export interface MidtermGrade {
  id: string;
  submission_id: string;
  question_type: string;
  question_id: string;
  student_answer: string;
  ai_score: number | null;
  ai_feedback: string | null;
  instructor_score: number | null;
  instructor_feedback: string | null;
  rubric_breakdown: any;
  needs_review: boolean;
  graded_at: string | null;
  graded_by: string | null;
  ai_graded_at: string;
  created_at: string;
  updated_at: string;
}

export const useMidtermGrading = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: submissions, isLoading: isLoadingSubmissions } = useQuery({
    queryKey: ['midterm-submissions-for-grading'],
    queryFn: async (): Promise<MidtermSubmissionWithProfile[]> => {
      // Check authentication status
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('No authenticated user found for midterm grading');
        throw new Error('Authentication required to view midterm submissions');
      }

      const { data, error } = await supabase
        .from('mus240_midterm_submissions')
        .select('*')
        .eq('is_submitted', true)
        .order('submitted_at', { ascending: false });

      if (error) {
        console.error('Error fetching midterm submissions:', error);
        throw error;
      }
      
      // Get user profiles separately
      const userIds = data?.map(s => s.user_id) || [];
      if (userIds.length === 0) {
        return (data || []).map(submission => ({ ...submission, profile: null }));
      }

      const { data: profiles, error: profilesError } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name, email')
        .in('user_id', userIds);

      if (profilesError) {
        console.error('Error fetching profiles for submissions:', profilesError);
        return (data || []).map(submission => ({ ...submission, profile: null }));
      }

      // Create a map for efficient lookup
      const profileMap = new Map<string, UserProfile>();
      (profiles || []).forEach(p => profileMap.set(p.user_id, p));

      // Combine the data
      return (data || []).map(submission => ({
        ...submission,
        profile: profileMap.get(submission.user_id) || null
      }));
    },
  });

  const { data: grades, isLoading: isLoadingGrades } = useQuery({
    queryKey: ['midterm-grades'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mus240_submission_grades')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as MidtermGrade[];
    },
  });

  const gradeWithAI = useMutation({
    mutationFn: async (submission_id: string) => {
      const { data, error } = await supabase.functions.invoke('grade-midterm-ai', {
        body: { submission_id }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['midterm-grades'] });
      toast({
        title: 'AI Grading Complete',
        description: 'The submission has been graded by AI.',
      });
    },
    onError: (error) => {
      console.error('Error with AI grading:', error);
      toast({
        title: 'AI Grading Failed',
        description: 'Failed to grade the submission with AI. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const updateGrade = useMutation({
    mutationFn: async ({ 
      gradeId, 
      instructor_score, 
      instructor_feedback 
    }: { 
      gradeId: string; 
      instructor_score: number; 
      instructor_feedback: string 
    }) => {
      const { data, error } = await supabase
        .from('mus240_submission_grades')
        .update({
          instructor_score,
          instructor_feedback,
          needs_review: false,
          graded_at: new Date().toISOString(),
          graded_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .eq('id', gradeId)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['midterm-grades'] });
      toast({
        title: 'Grade Updated',
        description: 'The grade has been updated successfully.',
      });
    },
    onError: (error) => {
      console.error('Error updating grade:', error);
      toast({
        title: 'Update Failed',
        description: 'Failed to update the grade. Please try again.',
        variant: 'destructive',
      });
    },
  });

  return {
    submissions,
    grades,
    isLoadingSubmissions,
    isLoadingGrades,
    gradeWithAI,
    updateGrade,
    isGradingWithAI: gradeWithAI.isPending,
    isUpdatingGrade: updateGrade.isPending,
  };
};