import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const useFavorites = () => {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const loadFavorites = useCallback(async () => {
    if (!user) {
      setFavorites(new Set());
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('gw_sheet_music_favorites')
        .select('sheet_music_id')
        .eq('user_id', user.id);

      if (error) throw error;

      const favSet = new Set(data?.map(f => f.sheet_music_id) || []);
      setFavorites(favSet);
    } catch (error) {
      console.error('Error loading favorites:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const toggleFavorite = async (sheetMusicId: string) => {
    if (!user) {
      toast.error('Please sign in to favorite music');
      return;
    }

    const isFavorited = favorites.has(sheetMusicId);

    try {
      if (isFavorited) {
        // Remove from favorites
        const { error } = await supabase
          .from('gw_sheet_music_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('sheet_music_id', sheetMusicId);

        if (error) throw error;

        setFavorites(prev => {
          const next = new Set(prev);
          next.delete(sheetMusicId);
          return next;
        });
        toast.success('Removed from favorites');
      } else {
        // Add to favorites
        const { error } = await supabase
          .from('gw_sheet_music_favorites')
          .insert({
            user_id: user.id,
            sheet_music_id: sheetMusicId
          });

        if (error) throw error;

        setFavorites(prev => new Set(prev).add(sheetMusicId));
        toast.success('Added to favorites');
      }
    } catch (error: any) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorite');
    }
  };

  const isFavorite = (sheetMusicId: string) => favorites.has(sheetMusicId);

  return {
    favorites,
    loading,
    toggleFavorite,
    isFavorite,
    refreshFavorites: loadFavorites
  };
};
