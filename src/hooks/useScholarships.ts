import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Scholarship {
  id: string;
  title: string;
  description?: string;
  deadline?: string;
  amount?: string;
  eligibility?: string;
  tags?: string[];
  link?: string;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export const useScholarships = () => {
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [featuredScholarships, setFeaturedScholarships] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchScholarships = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('scholarships')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setScholarships(data || []);
      setFeaturedScholarships(data?.filter(scholarship => scholarship.is_featured) || []);
    } catch (err) {
      console.error('Error fetching scholarships:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch scholarships');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScholarships();
  }, []);

  return {
    scholarships,
    featuredScholarships,
    loading,
    error,
    refetch: fetchScholarships
  };
};