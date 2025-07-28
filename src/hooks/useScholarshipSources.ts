import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ScholarshipSource {
  id: string;
  name: string;
  url: string;
  description?: string;
  is_active: boolean;
  last_scraped_at?: string;
  scrape_frequency_hours: number;
  selector_config?: any;
  created_at: string;
  updated_at: string;
}

export const useScholarshipSources = () => {
  const [sources, setSources] = useState<ScholarshipSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSources = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('scholarship_sources')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setSources(data || []);
    } catch (err) {
      console.error('Error fetching scholarship sources:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch sources');
    } finally {
      setLoading(false);
    }
  };

  const createSource = async (sourceData: {
    name: string;
    url: string;
    description?: string;
    scrape_frequency_hours?: number;
  }) => {
    try {
      const { data, error } = await supabase
        .from('scholarship_sources')
        .insert({
          name: sourceData.name,
          url: sourceData.url,
          description: sourceData.description,
          scrape_frequency_hours: sourceData.scrape_frequency_hours || 24,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      setSources(prev => [data, ...prev]);
      toast.success('Scholarship source added successfully');
      return data;
    } catch (err) {
      console.error('Error creating source:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to create source');
      throw err;
    }
  };

  const updateSource = async (id: string, updates: Partial<ScholarshipSource>) => {
    try {
      const { data, error } = await supabase
        .from('scholarship_sources')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      setSources(prev => prev.map(source => 
        source.id === id ? { ...source, ...data } : source
      ));
      toast.success('Source updated successfully');
      return data;
    } catch (err) {
      console.error('Error updating source:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to update source');
      throw err;
    }
  };

  const deleteSource = async (id: string) => {
    try {
      const { error } = await supabase
        .from('scholarship_sources')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      setSources(prev => prev.filter(source => source.id !== id));
      toast.success('Source deleted successfully');
    } catch (err) {
      console.error('Error deleting source:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to delete source');
      throw err;
    }
  };

  const triggerScrape = async () => {
    try {
      console.log('🚀 triggerScrape called - starting scraping process');
      toast.loading('Starting scholarship scraping...');
      
      console.log('📡 Invoking scrape-scholarships function');
      const { data, error } = await supabase.functions.invoke('scrape-scholarships');

      console.log('📊 Function response:', { data, error });

      if (error) {
        console.error('❌ Function error:', error);
        throw error;
      }

      console.log('✅ Scraping completed successfully:', data);
      toast.success(`Scraping completed! Found ${data.scholarships_found} scholarships, inserted ${data.inserted}, updated ${data.updated}`);
      
      // Refresh sources to update last_scraped_at timestamps
      console.log('🔄 Refreshing sources...');
      await fetchSources();
      
      return data;
    } catch (err) {
      console.error('💥 Error triggering scrape:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to start scraping');
      throw err;
    }
  };

  useEffect(() => {
    fetchSources();
  }, []);

  return {
    sources,
    loading,
    error,
    createSource,
    updateSource,
    deleteSource,
    triggerScrape,
    refetch: fetchSources
  };
};