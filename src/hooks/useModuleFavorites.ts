import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useModuleFavorites = (userId: string) => {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const loadFavorites = useCallback(async () => {
    if (!userId) {
      setFavorites(new Set());
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('gw_module_favorites')
        .select('module_id')
        .eq('user_id', userId);

      if (error) throw error;

      const favSet = new Set(data?.map(f => f.module_id) || []);
      setFavorites(favSet);
    } catch (error) {
      console.error('Error loading module favorites:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const toggleFavorite = async (moduleId: string) => {
    if (!userId) {
      toast.error('Please sign in to favorite modules');
      return;
    }

    const isFavorited = favorites.has(moduleId);

    try {
      if (isFavorited) {
        const { error } = await supabase
          .from('gw_module_favorites')
          .delete()
          .eq('user_id', userId)
          .eq('module_id', moduleId);

        if (error) throw error;

        setFavorites(prev => {
          const next = new Set(prev);
          next.delete(moduleId);
          return next;
        });
        toast.success('Removed from favorites');
      } else {
        const { error } = await supabase
          .from('gw_module_favorites')
          .insert({
            user_id: userId,
            module_id: moduleId
          });

        if (error) throw error;

        setFavorites(prev => new Set(prev).add(moduleId));
        toast.success('Added to favorites');
      }
    } catch (error: any) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorite');
    }
  };

  const isFavorite = (moduleId: string) => favorites.has(moduleId);

  return {
    favorites,
    loading,
    toggleFavorite,
    isFavorite,
    refreshFavorites: loadFavorites
  };
};
