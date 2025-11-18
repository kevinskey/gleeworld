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
    // Try direct UUID lookup first
    const { data: directMatch, error: directError } = await supabase
      .from('gw_assignments')
      .select('*')
      .eq('id', identifier)
      .maybeSingle();

    if (directMatch && !directError) {
      return formatAssignment(directMatch);
    }

    // Try legacy_id lookup (handles "lj1", "lj2", etc.)
    const { data: legacyMatch, error: legacyError } = await supabase
      .from('gw_assignments')
      .select('*')
      .eq('legacy_id', identifier)
      .maybeSingle();

    if (legacyMatch && !legacyError) {
      return formatAssignment(legacyMatch);
    }

    // Try case-insensitive legacy code match
    const normalizedId = identifier.toLowerCase();
    const { data: caseInsensitiveMatch, error: caseError } = await supabase
      .from('gw_assignments')
      .select('*')
      .ilike('legacy_id', normalizedId)
      .maybeSingle();

    if (caseInsensitiveMatch && !caseError) {
      return formatAssignment(caseInsensitiveMatch);
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
    .from('gw_assignments')
    .select('*')
    .or(`id.in.(${identifiers.join(',')}),legacy_id.in.(${identifiers.join(',')})`);

  assignments?.forEach(assignment => {
    const resolved = formatAssignment(assignment);
    // Map both UUID and legacy_id to the same resolved assignment
    results.set(assignment.id, resolved);
    if (assignment.legacy_id) {
      results.set(assignment.legacy_id, resolved);
    }
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
    legacy_id: data.legacy_id,
    legacy_source: data.legacy_source,
    title: data.title,
    description: data.description,
    assignment_type: data.assignment_type,
    points: data.points,
    due_at: data.due_at,
    course_id: data.course_id,
    is_mus240: data.legacy_source?.includes('mus240') || false,
  };
}

/**
 * Get all MUS240 assignments sorted by legacy code
 */
export const getMus240Assignments = async (): Promise<ResolvedAssignment[]> => {
  const { data, error } = await supabase
    .from('gw_assignments')
    .select('*')
    .or('legacy_source.eq.mus240,legacy_source.eq.mus240_assignments')
    .order('legacy_id', { ascending: true });

  if (error) {
    console.error('Error fetching MUS240 assignments:', error);
    return [];
  }

  return (data || []).map(formatAssignment);
};
