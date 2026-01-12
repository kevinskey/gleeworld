import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface GleeWorldAssignment {
  id: string;
  title: string;
  description: string | null;
  due_date: string;
  points_possible: number | null;
  assignment_type: string;
  target_type: string;
  target_value: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  external_id?: string;
  sheet_music_id?: string | null;
}

export interface StudentGrade {
  id: string;
  student_email: string;
  exercise_title: string;
  pitch_score: number | null;
  rhythm_score: number | null;
  completed_at: string;
  source: string;
}

export interface UseGleeWorldAssignmentsReturn {
  assignments: GleeWorldAssignment[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  syncToGleeWorld: (assignmentId: string, includeStudents?: boolean) => Promise<boolean>;
  getStudentGrades: (assignmentExternalId: string) => Promise<StudentGrade[]>;
  createAssignment: (data: CreateAssignmentData) => Promise<GleeWorldAssignment | null>;
}

export interface CreateAssignmentData {
  title: string;
  description?: string;
  due_date: string;
  points_possible?: number;
  target_type?: 'all' | 'section' | 'individual';
  target_value?: string;
}

export const useGleeWorldAssignments = (courseId?: string): UseGleeWorldAssignmentsReturn => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<GleeWorldAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAssignments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('gw_sight_reading_assignments')
        .select('*')
        .eq('is_active', true)
        .order('due_date', { ascending: true });

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      // Parse external_id from notes field
      const enrichedAssignments = (data || []).map(assignment => {
        const externalIdMatch = assignment.notes?.match(/external_id:([^\s|]+)/);
        return {
          ...assignment,
          external_id: externalIdMatch ? externalIdMatch[1] : undefined
        };
      });

      setAssignments(enrichedAssignments);
    } catch (err: any) {
      console.error('Error fetching assignments:', err);
      setError(err.message);
      toast.error('Failed to load assignments');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  const syncToGleeWorld = useCallback(async (assignmentId: string, includeStudents = true): Promise<boolean> => {
    try {
      const { data, error: syncError } = await supabase.functions.invoke('sync-assignment-to-gleeworld', {
        body: { assignmentId, includeStudents }
      });

      if (syncError) {
        throw syncError;
      }

      if (data?.success) {
        toast.success(`Assignment synced to GleeWorld (${data.studentsNotified} students notified)`);
        await fetchAssignments();
        return true;
      } else {
        throw new Error(data?.error || 'Sync failed');
      }
    } catch (err: any) {
      console.error('Error syncing to GleeWorld:', err);
      toast.error(`Sync failed: ${err.message}`);
      return false;
    }
  }, [fetchAssignments]);

  const getStudentGrades = useCallback(async (_assignmentExternalId: string): Promise<StudentGrade[]> => {
    // Placeholder - external_grades table needs to be created via migration
    // This will be populated by the receive-assignment-webhook when grades come in
    console.log('getStudentGrades called - table may not exist yet');
    return [];
  }, []);

  const createAssignment = useCallback(async (data: CreateAssignmentData): Promise<GleeWorldAssignment | null> => {
    if (!user) {
      toast.error('You must be logged in to create assignments');
      return null;
    }

    try {
      const { data: result, error: createError } = await supabase.functions.invoke('create-sight-reading-assignment', {
        body: {
          title: data.title,
          description: data.description,
          due_date: data.due_date,
          points_possible: data.points_possible || 100,
          target_type: data.target_type || 'all_members',
          target_value: data.target_value
        }
      });

      if (createError) {
        throw createError;
      }

      if (result?.success && result?.assignment) {
        toast.success('Assignment created successfully');
        await fetchAssignments();
        return result.assignment;
      } else {
        throw new Error(result?.error || 'Failed to create assignment');
      }
    } catch (err: any) {
      console.error('Error creating assignment:', err);
      toast.error(`Failed to create assignment: ${err.message}`);
      return null;
    }
  }, [user, fetchAssignments]);

  return {
    assignments,
    loading,
    error,
    refetch: fetchAssignments,
    syncToGleeWorld,
    getStudentGrades,
    createAssignment
  };
};
