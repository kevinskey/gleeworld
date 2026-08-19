/**
 * Assignment ID Resolver Utility
 * 
 * Handles the complexity of resolving assignment identifiers across:
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
