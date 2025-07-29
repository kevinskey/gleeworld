import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SharedSpiritualReflection {
  id: string;
  title: string;
  content: string;
  scripture_reference?: string;
  reflection_type?: string;
  is_featured?: boolean;
  shared_at?: string;
}

export const useSharedSpiritualReflections = () => {
  const [sharedReflections, setSharedReflections] = useState<SharedSpiritualReflection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchSharedReflections = async () => {
    try {
      console.log('useSharedSpiritualReflections: Starting fetch...');
      setLoading(true);
      const { data, error } = await supabase
        .from('gw_spiritual_reflections')
        .select('id, title, content, scripture_reference, reflection_type, is_featured, shared_at')
        .eq('is_shared_to_members', true)
        .order('shared_at', { ascending: false });

      console.log('useSharedSpiritualReflections: Query result:', { data, error });
      if (error) throw error;
      console.log('useSharedSpiritualReflections: Raw data from database:', data);
      setSharedReflections(data?.map(item => ({
        id: item.id,
        title: item.title,
        content: item.content,
        scripture_reference: item.scripture_reference,
        reflection_type: item.reflection_type,
        is_featured: item.is_featured,
        shared_at: item.shared_at
      })) || []);
      console.log('useSharedSpiritualReflections: Final mapped data with content:', data?.map(item => ({ 
        id: item.id, 
        title: item.title, 
        content: item.content,
        scripture_reference: item.scripture_reference 
      })));
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

  useEffect(() => {
    fetchSharedReflections();

    // Set up real-time subscription for shared reflections
    const channel = supabase
      .channel('shared-spiritual-reflections-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'gw_spiritual_reflections',
          filter: 'is_shared_to_members=eq.true'
        },
        () => {
          fetchSharedReflections();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    sharedReflections,
    loading,
    error,
    refetch: fetchSharedReflections,
  };
};