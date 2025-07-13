import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { toast } from 'sonner';

type Setlist = Database['public']['Tables']['sheet_music_setlists']['Row'];
type SetlistInsert = Database['public']['Tables']['sheet_music_setlists']['Insert'];
type SetlistItem = Database['public']['Tables']['sheet_music_setlist_items']['Row'];
type SetlistItemInsert = Database['public']['Tables']['sheet_music_setlist_items']['Insert'];

interface SetlistWithItems extends Setlist {
  items?: (SetlistItem & {
    sheet_music: {
      id: string;
      title: string;
      composer: string | null;
      arranger: string | null;
    };
  })[];
}

export const useSetlists = () => {
  const [setlists, setSetlists] = useState<SetlistWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSetlists = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('sheet_music_setlists')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setSetlists(data || []);
    } catch (err) {
      console.error('Error fetching setlists:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch setlists');
      toast.error('Failed to load setlists');
    } finally {
      setLoading(false);
    }
  };

  const createSetlist = async (setlistData: Omit<SetlistInsert, 'created_by'>) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('sheet_music_setlists')
        .insert({
          ...setlistData,
          created_by: user.user.id
        })
        .select()
        .single();

      if (error) throw error;
      
      toast.success('Setlist created successfully');
      await fetchSetlists();
      return data;
    } catch (err) {
      console.error('Error creating setlist:', err);
      toast.error('Failed to create setlist');
      throw err;
    }
  };

  const updateSetlist = async (id: string, updates: Partial<SetlistInsert>) => {
    try {
      const { data, error } = await supabase
        .from('sheet_music_setlists')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      toast.success('Setlist updated successfully');
      await fetchSetlists();
      return data;
    } catch (err) {
      console.error('Error updating setlist:', err);
      toast.error('Failed to update setlist');
      throw err;
    }
  };

  const deleteSetlist = async (id: string) => {
    try {
      const { error } = await supabase
        .from('sheet_music_setlists')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Setlist deleted successfully');
      await fetchSetlists();
    } catch (err) {
      console.error('Error deleting setlist:', err);
      toast.error('Failed to delete setlist');
      throw err;
    }
  };

  const addItemToSetlist = async (setlistId: string, sheetMusicId: string, position: number, notes?: string) => {
    try {
      const { data, error } = await supabase
        .from('sheet_music_setlist_items')
        .insert({
          setlist_id: setlistId,
          sheet_music_id: sheetMusicId,
          order_position: position,
          notes
        })
        .select()
        .single();

      if (error) throw error;
      
      toast.success('Sheet music added to setlist');
      await fetchSetlists();
      return data;
    } catch (err) {
      console.error('Error adding item to setlist:', err);
      toast.error('Failed to add item to setlist');
      throw err;
    }
  };

  const removeItemFromSetlist = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('sheet_music_setlist_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
      
      toast.success('Item removed from setlist');
      await fetchSetlists();
    } catch (err) {
      console.error('Error removing item from setlist:', err);
      toast.error('Failed to remove item from setlist');
      throw err;
    }
  };

  const updateItemPosition = async (itemId: string, newPosition: number) => {
    try {
      const { error } = await supabase
        .from('sheet_music_setlist_items')
        .update({ order_position: newPosition })
        .eq('id', itemId);

      if (error) throw error;
      
      await fetchSetlists();
    } catch (err) {
      console.error('Error updating item position:', err);
      toast.error('Failed to update item position');
      throw err;
    }
  };

  useEffect(() => {
    fetchSetlists();
  }, []);

  return {
    setlists,
    loading,
    error,
    fetchSetlists,
    createSetlist,
    updateSetlist,
    deleteSetlist,
    addItemToSetlist,
    removeItemFromSetlist,
    updateItemPosition
  };
};