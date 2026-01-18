/**
 * Assignment ID Resolver Utility
 * 
 * Handles the complexity of resolving assignment identifiers across:
 * - Legacy mus240_assignments (using text codes like "lj1", "lj2")
 * - New gw_assignments (using UUIDs with legacy_id tracking)
 * - Mixed identifier formats
 */

import { supabase } from '@/integrations/supabase/client';

export interface ResolvedAssignment {
  id: string; // gw_assignments UUID
  legacy_id: string | null;
  legacy_source: string | null;
  title: string;
  description: string | null;
  assignment_type: string | null;
  points: number | null;
  due_at: string | null;
  course_id: string;
  is_mus240: boolean;
  is_active?: boolean;
}

/**
 * Resolve any assignment identifier to a standardized gw_assignments record
 * @param identifier - Can be UUID, legacy code (e.g. "lj1"), or legacy UUID
 * @returns Resolved assignment or null if not found
 */
export const resolveAssignmentId = async (
  identifier: string
): Promise<ResolvedAssignment | null> => {
  if (!identifier) return null;

  try {
    // Try direct UUID lookup in gw_course_assignments
    const { data: directMatch, error: directError } = await supabase
      .from('gw_course_assignments')
      .select('*')
      .eq('id', identifier)
      .maybeSingle();

    if (directMatch && !directError) {
      return formatAssignment(directMatch);
    }

    console.warn(`Assignment not found for identifier: ${identifier}`);
    return null;
  } catch (error) {
    console.error('Error resolving assignment:', error);
    return null;
  }
};

/**
 * Batch resolve multiple assignment identifiers
 */
export const resolveAssignmentIds = async (
  identifiers: string[]
): Promise<Map<string, ResolvedAssignment>> => {
  const results = new Map<string, ResolvedAssignment>();
  
  // Batch query for efficiency
  const { data: assignments } = await supabase
    .from('gw_course_assignments')
    .select('*')
    .in('id', identifiers);

  assignments?.forEach(assignment => {
    const resolved = formatAssignment(assignment);
    results.set(assignment.id, resolved);
  });

  return results;
};

/**
 * Get the correct assignment_id to use for querying journal entries
 * Returns legacy_id for mus240 assignments, UUID for others
 */
export const getJournalQueryId = (assignment: ResolvedAssignment): string => {
  if (assignment.is_mus240 && assignment.legacy_id) {
    return assignment.legacy_id;
  }
  return assignment.id;
};

/**
 * Check if an identifier looks like a MUS240 legacy code
 */
export const isMus240LegacyCode = (identifier: string): boolean => {
  return /^lj\d+$/i.test(identifier);
};

/**
 * Format raw assignment data into ResolvedAssignment
 */
function formatAssignment(data: any): ResolvedAssignment {
  return {
    id: data.id,
    legacy_id: null,
    legacy_source: null,
    title: data.title,
    description: data.description,
    assignment_type: data.assignment_type,
    points: data.points,
    due_at: data.due_date,
    course_id: data.course_id,
    is_mus240: false,
    is_active: data.is_published !== undefined ? data.is_published : true
  };
}

/**
 * Get all course assignments for a specific course
 */
export const getCourseAssignments = async (courseId: string): Promise<ResolvedAssignment[]> => {
  const { data, error } = await supabase
    .from('gw_course_assignments')
    .select('*')
    .eq('course_id', courseId)
    .eq('is_published', true)
    .order('due_date', { ascending: true });

  if (error) {
    console.error('Error fetching course assignments:', error);
    return [];
  }

  return (data || []).map(formatAssignment);
};
