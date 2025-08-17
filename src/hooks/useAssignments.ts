import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Database } from '@/integrations/supabase/types';

type Assignment = Database['public']['Tables']['gw_sight_reading_assignments']['Row'];
type AssignmentInsert = Database['public']['Tables']['gw_sight_reading_assignments']['Insert'];
type Submission = Database['public']['Tables']['gw_assignment_submissions']['Row'];
type SubmissionInsert = Database['public']['Tables']['gw_assignment_submissions']['Insert'];

interface CreateAssignmentData {
  title: string;
  description?: string;
  assignment_type: 'sight_reading' | 'practice_exercise' | 'section_notes' | 'pdf_resource' | 'audio_resource';
  due_date: string;
  grading_period: 'week_1' | 'week_2' | 'week_3' | 'week_4' | 'week_5' | 'week_6' | 'week_7' | 'week_8' | 'week_9' | 'week_10' | 'week_11' | 'week_12' | 'week_13';
  points_possible?: number;
  sheet_music_id?: string;
  pdf_url?: string;
  audio_url?: string;
  notes?: string;
  target_type: 'individual' | 'section' | 'class' | 'all';
  target_value?: string;
}

export const useAssignments = () => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { userProfile } = useUserProfile(user);

  const fetchAssignments = useCallback(async () => {
    if (!userProfile?.user_id) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('gw_sight_reading_assignments')
        .select(`
          *,
          sheet_music:gw_sheet_music(id, title, composer)
        `)
        .eq('is_active', true)
        .order('due_date', { ascending: true });

      if (fetchError) throw fetchError;

      setAssignments(data || []);
    } catch (err) {
      console.error('Error fetching assignments:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch assignments');
    } finally {
      setLoading(false);
    }
  }, [userProfile?.user_id]);

  const fetchSubmissions = useCallback(async () => {
    if (!userProfile?.user_id) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('gw_assignment_submissions')
        .select('*')
        .eq('user_id', userProfile.user_id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setSubmissions(data || []);
    } catch (err) {
      console.error('Error fetching submissions:', err);
    }
  }, [userProfile?.user_id]);

  const createAssignment = async (assignmentData: CreateAssignmentData) => {
    if (!userProfile?.user_id) return;

    try {
      setLoading(true);
      const { data, error: insertError } = await supabase
        .from('gw_sight_reading_assignments')
        .insert({
          ...assignmentData,
          assigned_by: userProfile.user_id,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      await fetchAssignments();
      return data;
    } catch (err) {
      console.error('Error creating assignment:', err);
      setError(err instanceof Error ? err.message : 'Failed to create assignment');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const submitAssignment = async (assignmentId: string, submissionData: {
    recording_url?: string;
    recording_id?: string;
    notes?: string;
  }) => {
    if (!userProfile?.user_id) return;

    try {
      setLoading(true);
      
      const { data, error: submitError } = await supabase
        .from('gw_assignment_submissions')
        .insert({
          assignment_id: assignmentId,
          user_id: userProfile.user_id,
          status: 'submitted',
          submitted_at: new Date().toISOString(),
          ...submissionData,
        })
        .select()
        .single();

      if (submitError) throw submitError;

      await fetchSubmissions();
      return data;
    } catch (err) {
      console.error('Error submitting assignment:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit assignment');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateSubmission = async (submissionId: string, updates: {
    recording_url?: string;
    recording_id?: string;
    notes?: string;
    status?: 'assigned' | 'in_progress' | 'submitted' | 'graded' | 'overdue';
  }) => {
    try {
      setLoading(true);
      
      const { data, error: updateError } = await supabase
        .from('gw_assignment_submissions')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', submissionId)
        .eq('user_id', userProfile?.user_id)
        .select()
        .single();

      if (updateError) throw updateError;

      await fetchSubmissions();
      return data;
    } catch (err) {
      console.error('Error updating submission:', err);
      setError(err instanceof Error ? err.message : 'Failed to update submission');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getSubmissionForAssignment = (assignmentId: string) => {
    return submissions.find(sub => sub.assignment_id === assignmentId);
  };

  const getOverdueAssignments = () => {
    const now = new Date();
    return assignments.filter(assignment => {
      const dueDate = new Date(assignment.due_date);
      const submission = getSubmissionForAssignment(assignment.id);
      return dueDate < now && (!submission || submission.status === 'assigned' || submission.status === 'in_progress');
    });
  };

  const getUpcomingAssignments = (days: number = 7) => {
    const now = new Date();
    const futureDate = new Date(now.getTime() + (days * 24 * 60 * 60 * 1000));
    
    return assignments.filter(assignment => {
      const dueDate = new Date(assignment.due_date);
      const submission = getSubmissionForAssignment(assignment.id);
      return dueDate >= now && dueDate <= futureDate && (!submission || submission.status !== 'submitted');
    });
  };

  useEffect(() => {
    if (userProfile?.user_id) {
      fetchAssignments();
      fetchSubmissions();
    }
  }, [userProfile?.user_id, fetchAssignments, fetchSubmissions]);

  return {
    assignments,
    submissions,
    loading,
    error,
    fetchAssignments,
    fetchSubmissions,
    createAssignment,
    submitAssignment,
    updateSubmission,
    getSubmissionForAssignment,
    getOverdueAssignments,
    getUpcomingAssignments,
  };
};