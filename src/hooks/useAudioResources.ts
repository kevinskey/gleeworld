import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AudioResource {
  id: string;
  title: string;
  description: string | null;
  file_path: string;
  file_size: number | null;
  category: string;
  duration: number | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

export const useAudioResources = (category?: string) => {
  const [resources, setResources] = useState<AudioResource[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchResources = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('mus240_audio_resources')
        .select('*')
        .order('created_at', { ascending: false });

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;

      if (error) throw error;

      setResources(data || []);
    } catch (error) {
      console.error('Error fetching audio resources:', error);
      toast({
        title: 'Error',
        description: 'Failed to load audio resources',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getFileUrl = (filePath: string): string => {
    const { data } = supabase.storage
      .from('mus240-audio')
      .getPublicUrl(filePath);
    
    return data.publicUrl;
  };

  const deleteResource = async (id: string, filePath: string) => {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('mus240-audio')
        .remove([filePath]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('mus240_audio_resources')
        .delete()
        .eq('id', id);

      if (dbError) throw dbError;

      setResources(prev => prev.filter(r => r.id !== id));
      
      toast({
        title: 'Success',
        description: 'Audio resource deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting resource:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete audio resource',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchResources();
  }, [category]);

  return {
    resources,
    loading,
    refetch: fetchResources,
    getFileUrl,
    deleteResource,
  };
};