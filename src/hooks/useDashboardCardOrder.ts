import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Default card order
export const DEFAULT_CARD_ORDER: string[] = [
  'communications',
  'favorites',
  'hero-carousel',
  'ai-assistant',
  'search-filters',
  'modules'
];

export type DashboardCard = 'hero-carousel' | 'announcements' | 'favorites' | 'communications' | 'ai-assistant' | 'search-filters' | 'modules';

export const useDashboardCardOrder = () => {
  const { user } = useAuth();
  const [cardOrder, setCardOrder] = useState<string[]>(DEFAULT_CARD_ORDER);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!user) {
      setCardOrder(DEFAULT_CARD_ORDER);
      setLoading(false);
      return;
    }

    fetchCardOrder();
  }, [user]);

  const fetchCardOrder = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_dashboard_card_order')
        .select('card_order')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (error) throw error;

      if (data?.card_order && Array.isArray(data.card_order)) {
        // Merge any new default cards that don't exist in user's saved order
        let savedOrder = [...data.card_order];
        
        // Ensure 'communications' exists and is before 'favorites'
        if (!savedOrder.includes('communications')) {
          const favoritesIndex = savedOrder.indexOf('favorites');
          if (favoritesIndex !== -1) {
            savedOrder.splice(favoritesIndex, 0, 'communications');
          } else {
            savedOrder.unshift('communications');
          }
        } else {
          // If communications exists but is after favorites, move it before
          const commIndex = savedOrder.indexOf('communications');
          const favIndex = savedOrder.indexOf('favorites');
          if (commIndex > favIndex && favIndex !== -1) {
            savedOrder.splice(commIndex, 1);
            savedOrder.splice(favIndex, 0, 'communications');
          }
        }
        
        setCardOrder(savedOrder);
      } else {
        setCardOrder(DEFAULT_CARD_ORDER);
      }
    } catch (error) {
      console.error('Error fetching card order:', error);
      setCardOrder(DEFAULT_CARD_ORDER);
    } finally {
      setLoading(false);
    }
  };

  const saveCardOrder = async (newOrder: string[]) => {
    if (!user) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('gw_dashboard_card_order')
        .upsert({
          user_id: user.id,
          card_order: newOrder,
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      setCardOrder(newOrder);
      toast.success('Dashboard layout saved');
    } catch (error) {
      console.error('Error saving card order:', error);
      toast.error('Failed to save dashboard layout');
    } finally {
      setIsSaving(false);
    }
  };

  const resetCardOrder = async () => {
    await saveCardOrder([...DEFAULT_CARD_ORDER]);
  };

  return {
    cardOrder,
    loading,
    isSaving,
    saveCardOrder,
    resetCardOrder
  };
};
