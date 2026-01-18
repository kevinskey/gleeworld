/**
 * Unified Assignment Hook
 * Provides consistent access to assignments using gw_course_assignments
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { resolveAssignmentId, getCourseAssignments, type ResolvedAssignment } from '@/utils/assignmentResolver';

export interface UnifiedAssignment extends ResolvedAssignment {
  submission_count?: number;
  graded_count?: number;
}

/**
 * Fetch all assignments for a course with submission stats
 */
export const useUnifiedAssignments = (courseId: string) => {
  return useQuery({
    queryKey: ['unified-assignments', courseId],
    queryFn: async (): Promise<UnifiedAssignment[]> => {
      if (!courseId) return [];
      
      // Fetch from gw_course_assignments
      const assignments = await getCourseAssignments(courseId);
      
      // Get submission stats
      const assignmentIds = assignments.map(a => a.id);
      
      const { data: submissions } = await supabase
        .from('assignment_submissions')
        .select('assignment_id, status')
        .in('assignment_id', assignmentIds);
      
      // Calculate stats per assignment
      return assignments.map(assignment => {
        const assignmentSubmissions = submissions?.filter(s => s.assignment_id === assignment.id) || [];
        
        return {
          ...assignment,
          submission_count: assignmentSubmissions.length,
          graded_count: assignmentSubmissions.filter(s => s.status === 'graded').length
        };
      });
    },
    enabled: !!courseId
  });
};

/**
 * Fetch a single assignment by ID (handles both UUIDs and legacy codes)
 */
export const useUnifiedAssignment = (identifier: string) => {
  return useQuery({
    queryKey: ['unified-assignment', identifier],
    queryFn: () => resolveAssignmentId(identifier),
    enabled: !!identifier
  });
};

/**
 * Get submissions for an assignment (handles both systems)
 */
export const useAssignmentSubmissions = (assignmentId: string) => {
  return useQuery({
    queryKey: ['assignment-submissions', assignmentId],
    queryFn: async () => {
      // First resolve the assignment
      const assignment = await resolveAssignmentId(assignmentId);
      if (!assignment) return [];
      
      if (assignment.is_mus240) {
        // Fetch from legacy system
        const queryId = assignment.legacy_id || assignment.id;
        const { data: entries, error } = await supabase
          .from('mus240_journal_entries')
          .select(`
            *,
            mus240_journal_grades(*)
          `)
          .eq('assignment_id', queryId)
          .order('submitted_at', { ascending: false });
        
        if (error) throw error;
        
        // Get student names
        const studentIds = entries?.map(e => e.student_id) || [];
        const { data: profiles } = await supabase
          .from('gw_profiles')
          .select('user_id, full_name, email')
          .in('user_id', studentIds);
        
        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
        
        return entries?.map(entry => ({
          id: entry.id,
          assignment_id: assignment.id,
          student_id: entry.student_id,
          student_name: profileMap.get(entry.student_id)?.full_name || 'Unknown',
          student_email: profileMap.get(entry.student_id)?.email,
          content: entry.content,
          audio_url: null,
          submitted_at: entry.submitted_at,
          status: entry.submitted_at ? 'submitted' : 'draft',
          grade: (entry as any).mus240_journal_grades?.[0] || null,
          word_count: entry.word_count
        })) || [];
      }
      
      // For new system (future implementation)
      return [];
    },
    enabled: !!assignmentId
  });
};
