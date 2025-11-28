import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type Assignment = Database['public']['Tables']['gw_assignments']['Row'];
type Submission = Database['public']['Tables']['gw_submissions']['Row'];

/**
 * Unified assignments hook for the new academy system
 * Connects to gw_assignments and gw_submissions tables
 * Supports both new academy courses and legacy MUS240 data
 */
export const useAssignments = (courseId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch assignments for a course
  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ['gw-assignments', courseId],
    queryFn: async () => {
      if (!courseId) return [];

      const { data, error } = await supabase
        .from('gw_assignments')
        .select('*')
        .eq('course_id', courseId)
        .order('due_at', { ascending: true });

      if (error) throw error;
      return data as Assignment[];
    },
    enabled: !!courseId,
  });

  // Fetch submissions for current user
  const { data: submissions = [], isLoading: submissionsLoading } = useQuery({
    queryKey: ['gw-submissions', user?.id, courseId],
    queryFn: async () => {
      if (!user?.id) return [];

      let query = supabase
        .from('gw_submissions')
        .select('*')
        .eq('student_id', user.id);

      // If courseId provided, filter by assignments in that course
      if (courseId && assignments.length > 0) {
        const assignmentIds = assignments.map(a => a.id);
        query = query.in('assignment_id', assignmentIds);
      }

      const { data, error } = await query.order('submitted_at', { ascending: false });

      if (error) throw error;
      return data as Submission[];
    },
    enabled: !!user?.id && (!courseId || assignments.length > 0),
  });

  // Submit assignment mutation
  const submitAssignmentMutation = useMutation({
    mutationFn: async ({ assignmentId, data }: { assignmentId: string; data: any }) => {
      if (!user?.id) throw new Error('User not authenticated');

      const submissionData: Database['public']['Tables']['gw_submissions']['Insert'] = {
        assignment_id: assignmentId,
        student_id: user.id,
        content_text: data.content || null,
        content_url: data.file_url || null,
        submitted_at: new Date().toISOString(),
        status: 'submitted',
      };

      // Check if submission already exists
      const { data: existing } = await supabase
        .from('gw_submissions')
        .select('id')
        .eq('assignment_id', assignmentId)
        .eq('student_id', user.id)
        .maybeSingle();

      if (existing) {
        // Update existing submission
        const { data: updated, error } = await supabase
          .from('gw_submissions')
          .update(submissionData)
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return updated;
      } else {
        // Create new submission
        const { data: created, error } = await supabase
          .from('gw_submissions')
          .insert(submissionData)
          .select()
          .single();

        if (error) throw error;
        return created;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gw-submissions'] });
      toast.success('Assignment submitted successfully');
    },
    onError: (error) => {
      console.error('Error submitting assignment:', error);
      toast.error('Failed to submit assignment');
    },
  });

  // Create assignment mutation (for instructors)
  const createAssignmentMutation = useMutation({
    mutationFn: async (assignmentData: Database['public']['Tables']['gw_assignments']['Insert']) => {
      if (!courseId) throw new Error('Course ID required');

      const { data, error } = await supabase
        .from('gw_assignments')
        .insert({
          ...assignmentData,
          course_id: courseId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gw-assignments'] });
      toast.success('Assignment created successfully');
    },
    onError: (error) => {
      console.error('Error creating assignment:', error);
      toast.error('Failed to create assignment');
    },
  });

  // Helper functions
  const getSubmissionForAssignment = (assignmentId: string): Submission | null => {
    return submissions.find(s => s.assignment_id === assignmentId) || null;
  };

  const getOverdueAssignments = (days: number = 7): Assignment[] => {
    const now = new Date();
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    return assignments.filter(assignment => {
      if (!assignment.due_at) return false;
      const dueDate = new Date(assignment.due_at);
      const submission = getSubmissionForAssignment(assignment.id);
      return dueDate < now && dueDate > cutoff && !submission;
    });
  };

  const getUpcomingAssignments = (days: number = 7): Assignment[] => {
    const now = new Date();
    const cutoff = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    return assignments.filter(assignment => {
      if (!assignment.due_at) return false;
      const dueDate = new Date(assignment.due_at);
      const submission = getSubmissionForAssignment(assignment.id);
      return dueDate > now && dueDate < cutoff && !submission;
    });
  };

  const loading = assignmentsLoading || submissionsLoading;

  return {
    assignments,
    submissions,
    loading,
    submitAssignment: submitAssignmentMutation.mutateAsync,
    getSubmissionForAssignment,
    getOverdueAssignments,
    getUpcomingAssignments,
    createAssignment: createAssignmentMutation.mutateAsync,
  };
};