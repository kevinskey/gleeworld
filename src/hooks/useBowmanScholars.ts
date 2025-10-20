import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface BowmanScholar {
  user_id: string;
  full_name?: string;
  major?: string;
  grad_year?: number;
  hometown?: string;
  bio?: string;
  headshot_url?: string;
  resume_url?: string;
  ministry_statement?: string;
  created_at: string;
}

export const useBowmanScholars = () => {
  const [scholars, setScholars] = useState<BowmanScholar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchScholars = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('bowman_scholars')
        .select('*')
        .order('grad_year', { ascending: false });

      if (error) {
        throw error;
      }

      setScholars(data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching Bowman Scholars:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch scholars');
      toast({
        title: "Error",
        description: "Failed to load Bowman Scholars",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateScholar = async (scholarData: Partial<BowmanScholar>) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to update your profile",
        variant: "destructive",
      });
      return { success: false };
    }

    try {
      const payload: any = { user_id: user.id, ...scholarData };
      // Normalize types
      if (typeof payload.grad_year === 'string') {
        const gy = parseInt(payload.grad_year, 10);
        payload.grad_year = Number.isFinite(gy) ? gy : null;
      }
      if (typeof payload.grad_year === 'number' && !Number.isFinite(payload.grad_year)) {
        payload.grad_year = null;
      }

      console.log('Attempting to upsert scholar data:', { user_id: user.id, payload });
      const { data, error } = await supabase
        .from('bowman_scholars')
        .upsert(payload, { onConflict: 'user_id' })
        .select();

      console.log('Upsert response:', { data, error });

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: "Scholar profile updated successfully",
      });

      await fetchScholars(); // Refresh the list
      return { success: true };
    } catch (err) {
      console.error('Error updating scholar:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update scholar';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return { success: false, error: errorMessage };
    }
  };

  const getCurrentScholar = () => {
    if (!user) return null;
    return scholars.find(scholar => scholar.user_id === user.id);
  };

  useEffect(() => {
    fetchScholars();
  }, []);

  return {
    scholars,
    loading,
    error,
    fetchScholars,
    updateScholar,
    getCurrentScholar,
  };
};