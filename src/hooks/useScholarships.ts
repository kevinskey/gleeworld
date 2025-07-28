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
      console.log('🔍 Fetching scholarships...');
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('scholarships')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      console.log('📋 Scholarships query result:', { 
        data: data?.length, 
        error: fetchError,
        firstFew: data?.slice(0, 3).map(s => ({ id: s.id, title: s.title, is_active: s.is_active }))
      });

      if (fetchError) {
        console.error('❌ Scholarships fetch error:', fetchError);
        throw fetchError;
      }

      console.log(`✅ Setting ${data?.length || 0} scholarships in state`);
      setScholarships(data || []);
      setFeaturedScholarships(data?.filter(scholarship => scholarship.is_featured) || []);
      console.log(`⭐ Featured scholarships: ${data?.filter(scholarship => scholarship.is_featured).length || 0}`);
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