import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface LiturgicalWeek {
  id: string;
  week_of: string;
  sunday_date: string | null;
  title: string | null;
  sunday_title: string | null;
  season: string | null;
  lectionary_cycle: string | null;
  psalm: string | null;
  psalm_verses: string | null;
  psalm_refrain: string | null;
  gospel: string | null;
  theme: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface LiturgicalMusicPlan {
  id: string;
  week_id: string;
  service_order: number | null;
  moment: string | null;
  title: string | null;
  composer: string | null;
  voicing: string | null;
  key: string | null;
  tempo: string | null;
  status: string;
  rehearsal_notes: string | null;
  performance_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface LiturgicalMedia {
  id: string;
  week_id: string;
  file_type: string | null;
  label: string | null;
  url: string | null;
  created_at: string;
  updated_at: string;
}

export const useLiturgicalWeeks = () => {
  const [weeks, setWeeks] = useState<LiturgicalWeek[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchWeeks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('liturgical_weeks')
        .select('*')
        .order('week_of', { ascending: true });

      if (error) throw error;
      setWeeks(data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching liturgical weeks:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch weeks');
      toast({
        title: "Error",
        description: "Failed to load liturgical weeks",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateWeek = async (id: string, updates: Partial<LiturgicalWeek>) => {
    try {
      const { data, error } = await supabase
        .from('liturgical_weeks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setWeeks(prev => prev.map(w => w.id === id ? { ...w, ...data } : w));
      toast({ title: "Success", description: "Week updated successfully" });
      return { success: true, data };
    } catch (err) {
      console.error('Error updating week:', err);
      toast({ title: "Error", description: "Failed to update week", variant: "destructive" });
      return { success: false, error: err };
    }
  };

  useEffect(() => {
    fetchWeeks();
  }, []);

  return { weeks, loading, error, updateWeek, refetch: fetchWeeks };
};

export const useLiturgicalMusicPlan = (weekId: string | null) => {
  const [musicPlan, setMusicPlan] = useState<LiturgicalMusicPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchMusicPlan = async () => {
    if (!weekId) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('liturgical_music_plan')
        .select('*')
        .eq('week_id', weekId)
        .order('service_order', { ascending: true });

      if (error) throw error;
      setMusicPlan(data || []);
    } catch (err) {
      console.error('Error fetching music plan:', err);
      toast({ title: "Error", description: "Failed to load music plan", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const addMusicItem = async (item: Partial<LiturgicalMusicPlan>) => {
    if (!weekId) return { success: false };
    try {
      const { data, error } = await supabase
        .from('liturgical_music_plan')
        .insert([{ ...item, week_id: weekId }])
        .select()
        .single();

      if (error) throw error;
      setMusicPlan(prev => [...prev, data].sort((a, b) => (a.service_order || 0) - (b.service_order || 0)));
      toast({ title: "Success", description: "Music item added" });
      return { success: true, data };
    } catch (err) {
      console.error('Error adding music item:', err);
      toast({ title: "Error", description: "Failed to add music item", variant: "destructive" });
      return { success: false, error: err };
    }
  };

  const updateMusicItem = async (id: string, updates: Partial<LiturgicalMusicPlan>) => {
    try {
      const { data, error } = await supabase
        .from('liturgical_music_plan')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setMusicPlan(prev => prev.map(m => m.id === id ? { ...m, ...data } : m));
      toast({ title: "Success", description: "Music item updated" });
      return { success: true, data };
    } catch (err) {
      console.error('Error updating music item:', err);
      toast({ title: "Error", description: "Failed to update music item", variant: "destructive" });
      return { success: false, error: err };
    }
  };

  const deleteMusicItem = async (id: string) => {
    try {
      const { error } = await supabase
        .from('liturgical_music_plan')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setMusicPlan(prev => prev.filter(m => m.id !== id));
      toast({ title: "Success", description: "Music item deleted" });
      return { success: true };
    } catch (err) {
      console.error('Error deleting music item:', err);
      toast({ title: "Error", description: "Failed to delete music item", variant: "destructive" });
      return { success: false, error: err };
    }
  };

  useEffect(() => {
    fetchMusicPlan();
  }, [weekId]);

  return { musicPlan, loading, addMusicItem, updateMusicItem, deleteMusicItem, refetch: fetchMusicPlan };
};

export const useLiturgicalMedia = (weekId: string | null) => {
  const [media, setMedia] = useState<LiturgicalMedia[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchMedia = async () => {
    if (!weekId) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('liturgical_media')
        .select('*')
        .eq('week_id', weekId);

      if (error) throw error;
      setMedia(data || []);
    } catch (err) {
      console.error('Error fetching media:', err);
      toast({ title: "Error", description: "Failed to load media", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const addMedia = async (item: Partial<LiturgicalMedia>) => {
    if (!weekId) return { success: false };
    try {
      const { data, error } = await supabase
        .from('liturgical_media')
        .insert([{ ...item, week_id: weekId }])
        .select()
        .single();

      if (error) throw error;
      setMedia(prev => [...prev, data]);
      toast({ title: "Success", description: "Media added" });
      return { success: true, data };
    } catch (err) {
      console.error('Error adding media:', err);
      toast({ title: "Error", description: "Failed to add media", variant: "destructive" });
      return { success: false, error: err };
    }
  };

  const deleteMedia = async (id: string) => {
    try {
      const { error } = await supabase
        .from('liturgical_media')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setMedia(prev => prev.filter(m => m.id !== id));
      toast({ title: "Success", description: "Media deleted" });
      return { success: true };
    } catch (err) {
      console.error('Error deleting media:', err);
      toast({ title: "Error", description: "Failed to delete media", variant: "destructive" });
      return { success: false, error: err };
    }
  };

  useEffect(() => {
    fetchMedia();
  }, [weekId]);

  return { media, loading, addMedia, deleteMedia, refetch: fetchMedia };
};
