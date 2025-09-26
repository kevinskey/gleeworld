import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface MidtermSubmission {
  id: string;
  user_id: string;
  selected_terms: string[];
  ring_shout_answer?: string;
  field_holler_answer?: string;
  negro_spiritual_answer?: string;
  blues_answer?: string;
  ragtime_answer?: string;
  swing_answer?: string;
  excerpt_1_genre?: string;
  excerpt_1_features?: string;
  excerpt_1_context?: string;
  excerpt_2_genre?: string;
  excerpt_2_features?: string;
  excerpt_2_context?: string;
  selected_essay_question?: number;
  essay_answer?: string;
  submitted_at: string;
  time_started: string;
  is_submitted: boolean;
  total_time_minutes?: number;
  created_at: string;
  updated_at: string;
}

export const useMus240MidtermSubmissions = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: submission, isLoading } = useQuery({
    queryKey: ['mus240-midterm-submission', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('mus240_midterm_submissions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      return data as MidtermSubmission | null;
    },
    enabled: !!user?.id,
  });

  const createSubmissionMutation = useMutation({
    mutationFn: async (submissionData: Partial<MidtermSubmission>) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('mus240_midterm_submissions')
        .insert({
          user_id: user.id,
          ...submissionData,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mus240-midterm-submission', user?.id] });
      toast({
        title: 'Progress Saved',
        description: 'Your exam progress has been saved.',
      });
    },
    onError: (error) => {
      console.error('Error saving submission:', error);
      toast({
        title: 'Error Saving',
        description: 'Failed to save your progress. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const updateSubmissionMutation = useMutation({
    mutationFn: async (submissionData: Partial<MidtermSubmission>) => {
      if (!user?.id || !submission?.id) throw new Error('No submission to update');

      const { data, error } = await supabase
        .from('mus240_midterm_submissions')
        .update(submissionData)
        .eq('id', submission.id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mus240-midterm-submission', user?.id] });
    },
    onError: (error) => {
      console.error('Error updating submission:', error);
      toast({
        title: 'Error Saving',
        description: 'Failed to save your progress. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const submitExamMutation = useMutation({
    mutationFn: async (submissionData: Partial<MidtermSubmission>) => {
      if (!user?.id || !submission?.id) throw new Error('No submission to submit');

      const timeStarted = new Date(submission.time_started);
      const timeSubmitted = new Date();
      const totalMinutes = Math.round((timeSubmitted.getTime() - timeStarted.getTime()) / (1000 * 60));

      const { data, error } = await supabase
        .from('mus240_midterm_submissions')
        .update({
          ...submissionData,
          is_submitted: true,
          submitted_at: timeSubmitted.toISOString(),
          total_time_minutes: totalMinutes,
        })
        .eq('id', submission.id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mus240-midterm-submission', user?.id] });
      toast({
        title: 'Exam Submitted',
        description: 'Your midterm exam has been submitted successfully.',
      });
    },
    onError: (error) => {
      console.error('Error submitting exam:', error);
      toast({
        title: 'Submission Failed',
        description: 'Failed to submit your exam. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const saveProgress = (data: Partial<MidtermSubmission>) => {
    if (submission) {
      updateSubmissionMutation.mutate(data);
    } else {
      createSubmissionMutation.mutate(data);
    }
  };

  const submitExam = (data: Partial<MidtermSubmission>) => {
    submitExamMutation.mutate(data);
  };

  return {
    submission,
    isLoading,
    saveProgress,
    submitExam,
    isSaving: createSubmissionMutation.isPending || updateSubmissionMutation.isPending,
    isSubmitting: submitExamMutation.isPending,
  };
};