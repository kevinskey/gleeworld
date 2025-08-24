import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Setlist {
  id: string;
  title: string;
  description: string | null;
  concert_name: string | null;
  event_date: string | null;
  venue: string | null;
  is_published: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  rehearsal_notes: string | null;
}

export interface SetlistItem {
  id: string;
  setlist_id: string;
  music_id: string;
  order_index: number;
  voice_part_notes: string | null;
  tempo_notes: string | null;
  staging_notes: string | null;
  created_at: string;
  sheet_music?: {
    id: string;
    title: string;
    composer: string | null;
    pdf_url: string | null;
  };
}

export const useSetlists = () => {
  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchSetlists = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('gw_setlists')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setSetlists(data || []);
    } catch (err) {
      console.error('Error fetching setlists:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch setlists');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchSetlistItems = useCallback(async (setlistId: string): Promise<SetlistItem[]> => {
    try {
      const { data, error } = await supabase
        .from('gw_setlist_items')
        .select(`
          *,
          sheet_music:music_id (
            id,
            title,
            composer,
            pdf_url
          )
        `)
        .eq('setlist_id', setlistId)
        .order('order_index');

      if (error) throw error;

      return data || [];
    } catch (err) {
      console.error('Error fetching setlist items:', err);
      return [];
    }
  }, []);

  const addToSetlist = useCallback(async (setlistId: string, musicId: string) => {
    try {
      // Get the current highest order_index for this setlist
      const { data: existingItems } = await supabase
        .from('gw_setlist_items')
        .select('order_index')
        .eq('setlist_id', setlistId)
        .order('order_index', { ascending: false })
        .limit(1);

      const nextOrderIndex = (existingItems?.[0]?.order_index || 0) + 1;

      const { error } = await supabase
        .from('gw_setlist_items')
        .insert({
          setlist_id: setlistId,
          music_id: musicId,
          order_index: nextOrderIndex
        });

      if (error) throw error;

      toast({
        title: "Added to Setlist",
        description: "The piece has been added to the setlist successfully.",
      });

      return true;
    } catch (err) {
      console.error('Error adding to setlist:', err);
      toast({
        title: "Error",
        description: "Failed to add piece to setlist.",
        variant: "destructive",
      });
      return false;
    }
  }, [toast]);

  const removeFromSetlist = useCallback(async (setlistItemId: string) => {
    try {
      const { error } = await supabase
        .from('gw_setlist_items')
        .delete()
        .eq('id', setlistItemId);

      if (error) throw error;

      toast({
        title: "Removed from Setlist",
        description: "The piece has been removed from the setlist.",
      });

      return true;
    } catch (err) {
      console.error('Error removing from setlist:', err);
      toast({
        title: "Error",
        description: "Failed to remove piece from setlist.",
        variant: "destructive",
      });
      return false;
    }
  }, [toast]);

  const getSetlistsContainingPiece = useCallback(async (musicId: string): Promise<Setlist[]> => {
    try {
      const { data, error } = await supabase
        .from('gw_setlist_items')
        .select(`
          setlist_id,
          gw_setlists!inner (
            id,
            title,
            concert_name,
            event_date,
            is_published
          )
        `)
        .eq('music_id', musicId);

      if (error) throw error;

      // Extract unique setlists with full data
      const uniqueSetlists = (data || [])
        .map(item => item.gw_setlists)
        .filter((setlist, index, self) => 
          index === self.findIndex(s => s.id === setlist.id)
        )
        .map(setlist => ({
          id: setlist.id,
          title: setlist.title,
          concert_name: setlist.concert_name,
          event_date: setlist.event_date,
          is_published: setlist.is_published,
          description: null,
          venue: null,
          created_by: '',
          created_at: '',
          updated_at: '',
          rehearsal_notes: null
        }));

      return uniqueSetlists;
    } catch (err) {
      console.error('Error fetching setlists containing piece:', err);
      return [];
    }
  }, []);

  const createSetlist = useCallback(async (setlistData: {
    title: string;
    description?: string;
    concert_name?: string;
    event_date?: string;
  }) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('gw_setlists')
        .insert({
          title: setlistData.title,
          description: setlistData.description || null,
          concert_name: setlistData.concert_name || null,
          event_date: setlistData.event_date || null,
          created_by: user.id,
          is_published: false
        });

      if (error) throw error;

      await fetchSetlists(); // Refresh the list
      toast({
        title: "Setlist Created",
        description: "Your setlist has been created successfully.",
      });

      return true;
    } catch (err) {
      console.error('Error creating setlist:', err);
      toast({
        title: "Error",
        description: "Failed to create setlist.",
        variant: "destructive",
      });
      return false;
    }
  }, [user, fetchSetlists, toast]);

  const updateSetlist = useCallback(async (setlistId: string, setlistData: {
    title: string;
    description?: string;
    concert_name?: string;
    event_date?: string;
  }) => {
    try {
      const { error } = await supabase
        .from('gw_setlists')
        .update({
          title: setlistData.title,
          description: setlistData.description || null,
          concert_name: setlistData.concert_name || null,
          event_date: setlistData.event_date || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', setlistId);

      if (error) throw error;

      await fetchSetlists(); // Refresh the list
      toast({
        title: "Setlist Updated",
        description: "Your setlist has been updated successfully.",
      });

      return true;
    } catch (err) {
      console.error('Error updating setlist:', err);
      toast({
        title: "Error",
        description: "Failed to update setlist.",
        variant: "destructive",
      });
      return false;
    }
  }, [fetchSetlists, toast]);

  const deleteSetlist = useCallback(async (setlistId: string) => {
    try {
      // First delete all setlist items
      const { error: itemsError } = await supabase
        .from('gw_setlist_items')
        .delete()
        .eq('setlist_id', setlistId);

      if (itemsError) throw itemsError;

      // Then delete the setlist itself
      const { error } = await supabase
        .from('gw_setlists')
        .delete()
        .eq('id', setlistId);

      if (error) throw error;

      await fetchSetlists(); // Refresh the list
      toast({
        title: "Setlist Deleted",
        description: "Your setlist has been deleted successfully.",
      });

      return true;
    } catch (err) {
      console.error('Error deleting setlist:', err);
      toast({
        title: "Error",
        description: "Failed to delete setlist.",
        variant: "destructive",
      });
      return false;
    }
  }, [fetchSetlists, toast]);

  useEffect(() => {
    if (user) {
      fetchSetlists();
    }
  }, [user, fetchSetlists]);

  return {
    setlists,
    loading,
    error,
    fetchSetlists,
    fetchSetlistItems,
    addToSetlist,
    removeFromSetlist,
    getSetlistsContainingPiece,
    createSetlist,
    updateSetlist,
    deleteSetlist
  };
};