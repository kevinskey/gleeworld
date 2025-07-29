import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SpiritualReflection {
  id: string;
  title: string;
  content: string;
  scripture_reference?: string;
  reflection_type: string;
  is_featured: boolean;
  is_shared_to_members: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  shared_at?: string;
}

export const useSpiritualReflections = () => {
  const [reflections, setReflections] = useState<SpiritualReflection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchReflections = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('gw_spiritual_reflections')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReflections(data || []);
    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Error",
        description: "Failed to load spiritual reflections",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createReflection = async (reflectionData: Omit<SpiritualReflection, 'id' | 'created_at' | 'updated_at' | 'shared_at'>) => {
    try {
      const { data, error } = await supabase
        .from('gw_spiritual_reflections')
        .insert([reflectionData])
        .select()
        .single();

      if (error) throw error;
      
      setReflections(prev => [data, ...prev]);
      toast({
        title: "Success",
        description: "Spiritual reflection created successfully",
      });
      
      return data;
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
      throw err;
    }
  };

  const updateReflection = async (id: string, updates: Partial<SpiritualReflection>) => {
    try {
      const { data, error } = await supabase
        .from('gw_spiritual_reflections')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setReflections(prev => prev.map(r => r.id === id ? data : r));
      toast({
        title: "Success",
        description: "Spiritual reflection updated successfully",
      });
      
      return data;
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
      throw err;
    }
  };

  const toggleShare = async (id: string, currentShareStatus: boolean) => {
    return updateReflection(id, { is_shared_to_members: !currentShareStatus });
  };

  const deleteReflection = async (id: string) => {
    try {
      const { error } = await supabase
        .from('gw_spiritual_reflections')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setReflections(prev => prev.filter(r => r.id !== id));
      toast({
        title: "Success",
        description: "Spiritual reflection deleted successfully",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
      throw err;
    }
  };

  useEffect(() => {
    fetchReflections();

    // Set up real-time subscription
    const channel = supabase
      .channel('spiritual-reflections-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'gw_spiritual_reflections'
        },
        () => {
          fetchReflections();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    reflections,
    loading,
    error,
    createReflection,
    updateReflection,
    toggleShare,
    deleteReflection,
    refetch: fetchReflections,
  };
};