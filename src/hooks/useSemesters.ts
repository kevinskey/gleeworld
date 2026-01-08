import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Semester {
  id: string;
  name: string;
  term: string;
  year: number;
  start_date: string;
  end_date: string;
  classes_end_date: string | null;
  finals_start: string | null;
  finals_end: string | null;
  is_active: boolean;
  exception_dates: string[];
  created_at: string;
}

export const useSemesters = () => {
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [activeSemester, setActiveSemester] = useState<Semester | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSemesters = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('gw_semesters')
        .select('*')
        .order('year', { ascending: false })
        .order('term', { ascending: true });

      if (fetchError) throw fetchError;

      const formattedSemesters = (data || []).map(s => ({
        ...s,
        exception_dates: Array.isArray(s.exception_dates) ? s.exception_dates as string[] : []
      }));

      setSemesters(formattedSemesters);
      setActiveSemester(formattedSemesters.find(s => s.is_active) || null);
    } catch (err) {
      console.error('Error fetching semesters:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch semesters');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSemesters();
  }, []);

  const createSemester = async (semester: Omit<Semester, 'id' | 'created_at' | 'exception_dates'> & { exception_dates?: string[] }) => {
    try {
      const { data, error } = await supabase
        .from('gw_semesters')
        .insert({
          name: semester.name,
          term: semester.term,
          year: semester.year,
          start_date: semester.start_date,
          end_date: semester.end_date,
          classes_end_date: semester.classes_end_date,
          finals_start: semester.finals_start,
          finals_end: semester.finals_end,
          is_active: semester.is_active,
          exception_dates: semester.exception_dates || []
        })
        .select()
        .single();

      if (error) throw error;
      await fetchSemesters();
      return data;
    } catch (err) {
      console.error('Error creating semester:', err);
      throw err;
    }
  };

  const updateSemester = async (id: string, updates: Partial<Semester>) => {
    try {
      const { error } = await supabase
        .from('gw_semesters')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      await fetchSemesters();
    } catch (err) {
      console.error('Error updating semester:', err);
      throw err;
    }
  };

  const setActiveSemesterById = async (id: string) => {
    try {
      // First, deactivate all semesters
      await supabase
        .from('gw_semesters')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .neq('id', 'placeholder');

      // Then activate the selected one
      const { error } = await supabase
        .from('gw_semesters')
        .update({ is_active: true, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      await fetchSemesters();
    } catch (err) {
      console.error('Error setting active semester:', err);
      throw err;
    }
  };

  const archiveSemester = async (id: string) => {
    try {
      const { error } = await supabase
        .from('gw_semesters')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      await fetchSemesters();
    } catch (err) {
      console.error('Error archiving semester:', err);
      throw err;
    }
  };

  const deleteSemester = async (id: string) => {
    try {
      const { error } = await supabase
        .from('gw_semesters')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchSemesters();
    } catch (err) {
      console.error('Error deleting semester:', err);
      throw err;
    }
  };

  return {
    semesters,
    activeSemester,
    loading,
    error,
    refetch: fetchSemesters,
    createSemester,
    updateSemester,
    setActiveSemesterById,
    archiveSemester,
    deleteSemester
  };
};

// Helper to format semester for display
export const formatSemesterLabel = (semester: Semester): string => {
  return `${semester.term} ${semester.year}`;
};

// Helper to get semester ID in the format used by MUS-240 tables
export const getSemesterKey = (semester: Semester): string => {
  return `${semester.term} ${semester.year}`;
};
