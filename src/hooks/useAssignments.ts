import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getSignedUrl } from '@/utils/storage';
import type { Database } from '@/integrations/supabase/types';

// Sight-reading / practice-studio assignments.
//
// Table pairing (see the comment in
// src/components/grading/student/StudentAssignmentView.tsx):
//   gw_sight_reading_assignments  ->  gw_assignment_submissions
// gw_assignment_submissions.assignment_id has an FK to
// gw_sight_reading_assignments(id) and UNIQUE(assignment_id, user_id).
// Instructor review UIs (grading/instructor/SubmissionGradingView.tsx,
// AssignmentSubmissionsView.tsx) read gw_assignment_submissions and play
// `recording_url` directly in an <audio>/<video> element, so we must store a
// URL that resolves for the grader — a long-lived signed URL against the
// private 'sight-singing-recordings' bucket (students may only write to
// their own `${userId}/...` folder; admins/graders can read everything).

type Assignment =
  Database['public']['Tables']['gw_sight_reading_assignments']['Row'];
type Submission =
  Database['public']['Tables']['gw_assignment_submissions']['Row'];

const RECORDINGS_BUCKET = 'sight-singing-recordings';
// Signed URL lifetime. The bucket is private, and graders open recordings via
// the stored URL, so keep it long-lived (1 year).
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 365;

export interface SubmitAssignmentData {
  notes?: string;
  /** Recorded performance to upload (audio or video). */
  audioFile?: File | Blob;
  /** Pre-uploaded recording URL. `blob:` object URLs are ignored. */
  recording_url?: string;
}

export const useAssignments = (courseId?: string) => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user?.id) {
      setAssignments([]);
      setSubmissions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      let assignmentQuery = supabase
        .from('gw_sight_reading_assignments')
        .select('*')
        .eq('is_active', true)
        .or(`target_type.eq.all,target_value.eq.${user.id}`)
        .order('due_date', { ascending: true });
      if (courseId) assignmentQuery = assignmentQuery.eq('course_id', courseId);

      const [assignmentRes, submissionRes] = await Promise.all([
        assignmentQuery,
        supabase
          .from('gw_assignment_submissions')
          .select('*')
          .eq('user_id', user.id),
      ]);

      if (assignmentRes.error) throw assignmentRes.error;
      if (submissionRes.error) throw submissionRes.error;

      setAssignments(assignmentRes.data ?? []);
      setSubmissions(submissionRes.data ?? []);
    } catch (error) {
      console.error('useAssignments: failed to load assignments', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, courseId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  /**
   * Upload the recording (if any) and upsert the student's submission row.
   * Throws on any failure — callers must surface the error to the student
   * and keep the local recording so they can retry.
   */
  const submitAssignment = async (
    assignmentId: string,
    data: SubmitAssignmentData = {},
  ) => {
    if (!user?.id) throw new Error('You must be signed in to submit.');

    let recordingUrl: string | null = null;

    if (data.audioFile) {
      const contentType =
        (data.audioFile instanceof File && data.audioFile.type) ||
        data.audioFile.type ||
        'audio/webm';
      const ext = contentType.includes('webm')
        ? 'webm'
        : contentType.split('/')[1]?.split(';')[0] || 'webm';
      // Storage RLS on this bucket requires the first folder = auth.uid().
      const path = `${user.id}/${assignmentId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(RECORDINGS_BUCKET)
        .upload(path, data.audioFile, { contentType, upsert: true });
      if (uploadError) {
        throw new Error(`Recording upload failed: ${uploadError.message}`);
      }

      // Private bucket → graders need a signed URL. waitForReady rides out
      // the self-hosted stub→flat window (see src/utils/storage.ts).
      recordingUrl = await getSignedUrl(
        RECORDINGS_BUCKET,
        path,
        SIGNED_URL_TTL_SECONDS,
        true,
      );
      if (!recordingUrl) {
        throw new Error(
          'Recording uploaded but could not be verified. Please try again.',
        );
      }
    } else if (data.recording_url && !data.recording_url.startsWith('blob:')) {
      // Already-uploaded recording (e.g. video flows that upload separately).
      recordingUrl = data.recording_url;
    }

    const nowIso = new Date().toISOString();
    const row: Database['public']['Tables']['gw_assignment_submissions']['Insert'] =
      {
        assignment_id: assignmentId,
        user_id: user.id,
        status: 'submitted',
        submitted_at: nowIso,
        updated_at: nowIso,
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
        ...(recordingUrl ? { recording_url: recordingUrl } : {}),
      };

    const { error: upsertError } = await supabase
      .from('gw_assignment_submissions')
      .upsert(row, { onConflict: 'assignment_id,user_id' });
    if (upsertError) {
      throw new Error(`Submission failed: ${upsertError.message}`);
    }

    await fetchAll();
  };

  const getSubmissionForAssignment = (assignmentId: string) =>
    submissions.find((s) => s.assignment_id === assignmentId) ?? null;

  const getOverdueAssignments = (days = 30) => {
    const now = Date.now();
    const cutoff = now - days * 24 * 60 * 60 * 1000;
    return assignments.filter((a) => {
      if (!a.due_date) return false;
      const due = new Date(a.due_date).getTime();
      const submission = getSubmissionForAssignment(a.id);
      const done =
        submission &&
        ['submitted', 'graded', 'ai_graded', 'revision_submitted'].includes(
          submission.status,
        );
      return due < now && due >= cutoff && !done;
    });
  };

  const getUpcomingAssignments = (days = 7) => {
    const now = Date.now();
    const cutoff = now + days * 24 * 60 * 60 * 1000;
    return assignments.filter((a) => {
      if (!a.due_date) return false;
      const due = new Date(a.due_date).getTime();
      return due >= now && due <= cutoff;
    });
  };

  const createAssignment = async (
    data: Omit<
      Database['public']['Tables']['gw_sight_reading_assignments']['Insert'],
      'assigned_by'
    >,
  ) => {
    if (!user?.id) throw new Error('You must be signed in to create assignments.');
    const { error } = await supabase
      .from('gw_sight_reading_assignments')
      .insert({ ...data, assigned_by: user.id });
    if (error) throw new Error(`Failed to create assignment: ${error.message}`);
    await fetchAll();
  };

  return {
    assignments,
    submissions,
    loading,
    refetch: fetchAll,
    submitAssignment,
    getSubmissionForAssignment,
    getOverdueAssignments,
    getUpcomingAssignments,
    createAssignment,
  };
};
