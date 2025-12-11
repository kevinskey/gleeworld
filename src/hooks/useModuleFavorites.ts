import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface FavoriteEntry {
  module_id: string;
  sort_order: number;
}

export const useModuleFavorites = (userId: string) => {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [orderedFavorites, setOrderedFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFavorites = useCallback(async () => {
    if (!userId) {
      setFavorites(new Set());
      setOrderedFavorites([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('gw_module_favorites')
        .select('module_id, sort_order')
        .eq('user_id', userId)
        .order('sort_order', { ascending: true });

      if (error) throw error;

      const favSet = new Set(data?.map(f => f.module_id) || []);
      const ordered = data?.map(f => f.module_id) || [];
      setFavorites(favSet);
      setOrderedFavorites(ordered);
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
        setOrderedFavorites(prev => prev.filter(id => id !== moduleId));
        toast.success('Removed from favorites');
      } else {
        // Add with highest sort order
        const maxOrder = orderedFavorites.length;
        const { error } = await supabase
          .from('gw_module_favorites')
          .insert({
            user_id: userId,
            module_id: moduleId,
            sort_order: maxOrder
          });

        if (error) throw error;

        setFavorites(prev => new Set(prev).add(moduleId));
        setOrderedFavorites(prev => [...prev, moduleId]);
        toast.success('Added to favorites');
      }
    } catch (error: any) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorite');
    }
  };

  const reorderFavorites = async (newOrder: string[]) => {
    if (!userId) return;

    // Optimistically update local state
    setOrderedFavorites(newOrder);

    try {
      // Update sort_order for each favorite
      const updates = newOrder.map((moduleId, index) => 
        supabase
          .from('gw_module_favorites')
          .update({ sort_order: index })
          .eq('user_id', userId)
          .eq('module_id', moduleId)
      );

      await Promise.all(updates);
    } catch (error) {
      console.error('Error reordering favorites:', error);
      toast.error('Failed to save order');
      // Reload on error to restore correct state
      loadFavorites();
    }
  };

  const isFavorite = (moduleId: string) => favorites.has(moduleId);

  return {
    favorites,
    orderedFavorites,
    loading,
    toggleFavorite,
    isFavorite,
    reorderFavorites,
    refreshFavorites: loadFavorites
  };
};
