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
        const savedOrder = data.card_order;
        const missingCards = DEFAULT_CARD_ORDER.filter(card => !savedOrder.includes(card));
        if (missingCards.length > 0) {
          // Insert missing cards after 'favorites' or at the beginning
          const favoritesIndex = savedOrder.indexOf('favorites');
          const insertIndex = favoritesIndex !== -1 ? favoritesIndex + 1 : 0;
          const updatedOrder = [
            ...savedOrder.slice(0, insertIndex),
            ...missingCards,
            ...savedOrder.slice(insertIndex)
          ];
          setCardOrder(updatedOrder);
        } else {
          setCardOrder(savedOrder);
        }
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
