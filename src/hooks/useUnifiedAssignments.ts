/**
 * Unified Assignment Hook
 * Provides consistent access to assignments across legacy mus240_assignments 
 * and new gw_assignments tables using the resolver utility
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { resolveAssignmentId, getMus240Assignments, type ResolvedAssignment } from '@/utils/assignmentResolver';

export interface UnifiedAssignment extends ResolvedAssignment {
  submission_count?: number;
  graded_count?: number;
}

/**
 * Fetch all MUS240 assignments with submission stats
 */
export const useUnifiedAssignments = (courseCode: string = 'MUS240') => {
  return useQuery({
    queryKey: ['unified-assignments', courseCode],
    queryFn: async (): Promise<UnifiedAssignment[]> => {
      if (courseCode === 'MUS240') {
        // Get all MUS240 assignments from resolver
        const assignments = await getMus240Assignments();
        
        // Enrich with submission stats from legacy tables
        const assignmentIds = assignments.map(a => a.legacy_id || a.id);
        
        const { data: entries } = await supabase
          .from('mus240_journal_entries')
          .select('assignment_id, submitted_at')
          .in('assignment_id', assignmentIds)
          .not('submitted_at', 'is', null);
        
        const { data: grades } = await supabase
          .from('mus240_journal_grades')
          .select('assignment_id, instructor_score, overall_score')
          .in('assignment_id', assignmentIds);
        
        // Calculate stats
        const stats = assignments.map(assignment => {
          const assignmentId = assignment.legacy_id || assignment.id;
          const assignmentEntries = entries?.filter(e => e.assignment_id === assignmentId) || [];
          const assignmentGrades = grades?.filter(g => g.assignment_id === assignmentId) || [];
          
          return {
            ...assignment,
            submission_count: assignmentEntries.length,
            graded_count: assignmentGrades.filter(g => g.instructor_score || g.overall_score).length
          };
        });
        
        return stats;
      }
      
      // For other courses, fetch from gw_assignments
      const { data: course } = await supabase
        .from('gw_courses')
        .select('id')
        .eq('code', courseCode)
        .maybeSingle();
      
      if (!course) return [];
      
      const { data: assignments } = await supabase
        .from('gw_assignments')
        .select('*')
        .eq('course_id', course.id)
        .order('due_at', { ascending: true });
      
      return (assignments || []).map(a => ({
        id: a.id,
        legacy_id: a.legacy_id,
        legacy_source: a.legacy_source,
        title: a.title,
        description: a.description,
        assignment_type: a.assignment_type,
        points: a.points,
        due_at: a.due_at,
        course_id: a.course_id,
        is_mus240: false
      }));
    }
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
